import { createClient } from "@supabase/supabase-js";
import { extractAuthToken } from "../../../lib/auth.js";
import { hasPermission, requirePermission } from "../../../lib/auth/permissions.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Lösenordet måste vara minst 6 tecken" });
    }

    // Extract and verify token
    const token = extractAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Ingen token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ error: "Ogiltig token" });
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

    console.log("DEBUG: Set admin password - userRole:", userRole);
    console.log("DEBUG: Set admin password - decoded:", decoded);

    // Check if user is owner OR company admin
    if (userRole !== 'owner' && !decoded.isAdmin) {
      return res.status(403).json({ error: "Endast owners kan ändra admin-lösenord" });
    }
    
    // For company login, always allow password change
    if (decoded.companyId && !decoded.employeeEmail) {
      console.log("DEBUG: Company login detected, allowing password change");
    } else {
      // For staff login, require owner role
      if (userRole !== 'owner') {
        return res.status(403).json({ error: "Endast owners kan ändra admin-lösenord" });
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update company admin password
    const { error: updateError } = await supabaseAdmin
      .from("companies")
      .update({
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq("id", decoded.companyId);

    if (updateError) {
      console.error("Error updating admin password:", updateError);
      return res.status(500).json({ error: "Kunde inte uppdatera admin-lösenord" });
    }

    return res.status(200).json({ 
      success: true, 
      message: "Admin-lösenord uppdaterat" 
    });

  } catch (error) {
    console.error("Set admin password error:", error);
    return res.status(500).json({ error: "Serverfel" });
  }
}
