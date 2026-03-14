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

    // Get company and check if admin
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, is_admin")
      .eq("id", companyId)
      .single();

    if (companyError || !company || !company.is_admin) {
      return res.status(403).json({ error: "Du är inte admin" });
    }

    // Get new password from request
    const { newPassword } = req.body;

    if (!newPassword || newPassword.trim().length < 3) {
      return res.status(400).json({ error: "Lösenord måste vara minst 3 tecken" });
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
