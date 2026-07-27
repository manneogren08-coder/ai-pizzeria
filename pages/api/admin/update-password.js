import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { getSupabaseAdminClient } from "../../../lib/supabase.js";
import { extractAuthToken } from "../../../lib/auth.js";

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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const supabase = getSupabaseAdminClient();

    if (!supabase) {
      return res.status(500).json({ error: "Servern saknar SUPABASE_SERVICE_ROLE_KEY" });
    }

    const token = extractAuthToken(req);

    if (!token) {
      return res.status(401).json({ error: "Missing token" });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded.companyId;

    if (!companyId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const clientIP = getClientIP(req);
    if (
      consumeRateLimit(`update-pw-ip:${clientIP}`, MAX_ATTEMPTS_PER_IP) ||
      consumeRateLimit(`update-pw-company:${companyId}`, MAX_ATTEMPTS_PER_ACCOUNT)
    ) {
      return res.status(429).json({ error: "För många försök. Vänta några minuter och försök igen." });
    }

    // Resolve the acting user's own role rather than trusting companies.is_admin,
    // which is a company-wide flag and not a per-user permission. Only an
    // owner should be able to rotate the shared company login password.
    let userRole = decoded.role;
    if (!userRole) {
      if (decoded.companyId && !decoded.employeeEmail) {
        userRole = 'owner';
      } else {
        const { data: staff } = await supabase
          .from("restaurant_staff")
          .select("role")
          .eq("email", decoded.employeeEmail)
          .eq("company_id", companyId)
          .maybeSingle();

        userRole = staff?.role || 'member';
      }
    }

    if (userRole !== 'owner') {
      return res.status(403).json({ error: "Endast owners kan byta företagets lösenord" });
    }

    // Get company (need current password_hash to verify the current password)
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, password_hash")
      .eq("id", companyId)
      .single();

    if (companyError || !company) {
      return res.status(404).json({ error: "Företag hittades inte" });
    }

    // Get current + new password from request
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({ error: "Nuvarande lösenord krävs" });
    }

    if (!newPassword || newPassword.trim().length < 3) {
      return res.status(400).json({ error: "Lösenord måste vara minst 3 tecken" });
    }

    const currentMatch = await bcrypt.compare(currentPassword, company.password_hash || "");

    if (!currentMatch) {
      return res.status(401).json({ error: "Fel nuvarande lösenord" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in database
    const { error: updateError } = await supabase
      .from("companies")
      .update({ password_hash: hashedPassword })
      .eq("id", companyId);

    if (updateError) {
      console.error("Update error:", updateError);
      return res.status(500).json({ error: "Kunde inte uppdatera lösenord" });
    }

    return res.status(200).json({ 
      success: true,
      message: "Lösenord uppdaterat" 
    });

  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Din session har gått ut. Logga in igen." });
    }
    console.error("Error:", err);
    return res.status(500).json({ error: "Serverfel" });
  }
}
