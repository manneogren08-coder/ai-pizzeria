import jwt from 'jsonwebtoken';
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

    // Get company (need current active state to toggle it)
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, active")
      .eq("id", companyId)
      .single();

    if (companyError || !company) {
      return res.status(404).json({ error: "Företag hittades inte" });
    }

    // Resolve the acting user's own role rather than trusting companies.is_admin,
    // which is a company-wide flag and not a per-user permission. Only an
    // owner should be able to deactivate/reactivate the whole company.
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
      return res.status(403).json({ error: "Endast owners kan aktivera/deaktivera företaget" });
    }

    // Toggle active status
    const { error: updateError } = await supabase
      .from("companies")
      .update({ active: !company.active })
      .eq("id", companyId);

    if (updateError) {
      console.error("Update error:", updateError);
      return res.status(500).json({ error: "Kunde inte uppdatera status" });
    }

    return res.status(200).json({ 
      success: true,
      active: !company.active,
      message: `Företaget är nu ${!company.active ? 'aktiverat' : 'deaktiverat'}` 
    });

  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Din session har gått ut. Logga in igen." });
    }
    console.error("Error:", err);
    return res.status(500).json({ error: "Serverfel" });
  }
}
