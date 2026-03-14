import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { getSupabaseAdminClient } from "../../../lib/supabase.js";
import { extractAuthToken } from "../../../lib/auth.js";

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

    // Get admin password from request
    const { adminPassword } = req.body;

    if (!adminPassword) {
      return res.status(400).json({ error: "Missing admin password" });
    }

    // Get company and check admin password
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, is_admin, admin_password_hash")
      .eq("id", companyId)
      .single();

    if (companyError || !company || !company.is_admin) {
      return res.status(403).json({ error: "Du är inte admin" });
    }

    if (!company.admin_password_hash) {
      return res.status(500).json({ error: "Admin-lösenord inte konfigurerat" });
    }

    // Verify admin password with bcrypt
    const match = await bcrypt.compare(adminPassword, company.admin_password_hash);
    
    if (!match) {
      return res.status(401).json({ error: "Fel admin-lösenord" });
    }

    return res.status(200).json({ 
      success: true,
      message: "Admin-åtkomst beviljad" 
    });

  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Din session har gått ut. Logga in igen." });
    }
    console.error("Error:", err);
    return res.status(500).json({ error: "Serverfel" });
  }
}
