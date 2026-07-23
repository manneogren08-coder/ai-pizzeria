import { createClient } from "@supabase/supabase-js";
import { extractAuthToken } from "../../../lib/auth.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS_PER_IP = process.env.NODE_ENV === "production" ? 20 : 50;
const MAX_ATTEMPTS_PER_ACCOUNT = process.env.NODE_ENV === "production" ? 10 : 20;

function getClientIP(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

function consumeRateLimit(key, maxRequests) {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || now > existing.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  existing.count += 1;
  return existing.count > maxRequests;
}

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({ error: "Nuvarande lösenord krävs" });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Lösenordet måste vara minst 6 tecken" });
    }

    const token = extractAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Ingen token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ error: "Ogiltig token" });
    }

    const clientIP = getClientIP(req);
    if (
      consumeRateLimit(`admin-pw-ip:${clientIP}`, MAX_ATTEMPTS_PER_IP) ||
      consumeRateLimit(`admin-pw-company:${decoded.companyId}`, MAX_ATTEMPTS_PER_ACCOUNT)
    ) {
      return res.status(429).json({ error: "För många försök. Vänta några minuter och försök igen." });
    }

    // Get user role
    let userRole = decoded.role;
    
    // Company login tokens don't have role field - treat as owner
    if (!userRole) {
      if (decoded.companyId && !decoded.employeeEmail) {
        // This is a company login - treat as owner
        userRole = 'owner';
      } else {
        // This is a staff login - get role from database
        const { data: staff } = await supabaseAdmin
          .from("restaurant_staff")
          .select("role")
          .eq("email", decoded.employeeEmail)
          .eq("company_id", decoded.companyId)
          .maybeSingle();
        
        userRole = staff?.role || 'member';
      }
    }

    // Check if user is owner OR company admin
    if (userRole !== 'owner' && !decoded.isAdmin) {
      return res.status(403).json({ error: "Endast owners kan ändra admin-lösenord" });
    }

    // For company login, always allow password change
    if (decoded.companyId && !decoded.employeeEmail) {
      // company login - already confirmed owner-equivalent above
    } else {
      // For staff login, require owner role
      if (userRole !== 'owner') {
        return res.status(403).json({ error: "Endast owners kan ändra admin-lösenord" });
      }
    }

    // Verify current admin password before allowing change
    const { data: companyRow, error: fetchError } = await supabaseAdmin
      .from("companies")
      .select("admin_password_hash")
      .eq("id", decoded.companyId)
      .single();

    if (fetchError || !companyRow) {
      return res.status(500).json({ error: "Kunde inte hämta företag" });
    }

    if (!companyRow.admin_password_hash) {
      return res.status(500).json({ error: "Admin-lösenord inte konfigurerat" });
    }

    const currentMatch = await bcrypt.compare(currentPassword, companyRow.admin_password_hash);

    if (!currentMatch) {
      return res.status(401).json({ error: "Fel nuvarande lösenord" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update company admin password
    const { error: updateError } = await supabaseAdmin
      .from("companies")
      .update({
        admin_password_hash: hashedPassword
      })
      .eq("id", decoded.companyId);

    if (updateError) {
      console.error("Error updating admin password:", updateError);
      return res.status(500).json({ error: "Kunde inte uppdatera admin-lösenord", details: updateError.message });
    }

    return res.status(200).json({
      success: true, 
      message: "Admin-lösenord uppdaterat" 
    });

  } catch (error) {
    console.error("Change admin password error:", error);
    return res.status(500).json({ 
      error: "Serverfel", 
      details: error.message 
    });
  }
}
