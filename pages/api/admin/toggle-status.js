import { createClient } from "@supabase/supabase-js";
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    
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
      .select("id, is_admin, active")
      .eq("id", companyId)
      .single();

    if (companyError || !company || !company.is_admin) {
      return res.status(403).json({ error: "Du är inte admin" });
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
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Ogiltig token" });
    }
    console.error("Error:", err);
    return res.status(500).json({ error: "Serverfel" });
  }
}
