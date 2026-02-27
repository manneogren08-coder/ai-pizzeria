import { createClient } from "@supabase/supabase-js";
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Only GET allowed" });
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

    // Get company details
    const { data: company, error } = await supabase
      .from("companies")
      .select("support_email, opening_hours, closure_info, menu, allergens, routines, closing_routine, behavior_guidelines, staff_roles, staff_situations, query_count, active")
      .eq("id", companyId)
      .single();

    if (error || !company) {
      return res.status(404).json({ error: "Företag hittas inte" });
    }

    return res.status(200).json({ 
      details: company
    });

  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Ogiltig token" });
    }
    console.error("Error:", err);
    return res.status(500).json({ error: "Serverfel" });
  }
}
