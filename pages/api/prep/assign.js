import jwt from "jsonwebtoken";
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded.companyId;

    if (!companyId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { taskId, assignedTo } = req.body;

    if (!Number.isFinite(taskId)) {
      return res.status(400).json({ error: "Ogiltigt taskId" });
    }

    const { error } = await supabase
      .from("prep_tasks")
      .update({
        assigned_to: assignedTo || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", taskId)
      .eq("company_id", String(companyId));

    if (error) {
      return res.status(500).json({ error: "Kunde inte uppdatera tilldelning" });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Din session har gått ut. Logga in igen." });
    }

    return res.status(500).json({ error: "Serverfel" });
  }
}
