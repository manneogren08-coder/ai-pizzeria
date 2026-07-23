import { getSupabaseAdminClient } from "../../../lib/supabase.js";
import { extractAuthToken } from "../../../lib/auth.js";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = extractAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    // Verify JWT token and get user info
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded.companyId;

    if (!companyId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Get user's company to verify it's DEMO
    const supabase = getSupabaseAdminClient();
    const { data: userCompany, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (companyError || !userCompany || userCompany.name !== 'DEMO') {
      return res.status(403).json({ error: "Access denied" });
    }

    // Fetch all companies using admin client to bypass RLS
    const { data: companies, error: fetchError } = await supabase
      .from('companies')
      .select('id, name, email, active, created_at')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error("Failed to fetch companies:", fetchError);
      return res.status(500).json({ error: "Failed to fetch companies" });
    }

    res.status(200).json({
      companies: companies || [],
      total: companies?.length || 0
    });

  } catch (error) {
    console.error("Companies API error:", error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: "Invalid token" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
}
