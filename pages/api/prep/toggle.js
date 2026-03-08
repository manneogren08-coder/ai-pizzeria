import jwt from "jsonwebtoken";
import { getSupabaseAdminClient } from "../../../lib/supabase.js";

function isMissingTableError(error) {
  const message = error?.message || "";
  return /does not exist|relation .* does not exist|schema cache/i.test(message);
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

    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Missing token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded.companyId;

    if (!companyId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const taskId = Number(req.body?.taskId);
    const isDone = Boolean(req.body?.isDone);

    if (!Number.isFinite(taskId)) {
      return res.status(400).json({ error: "Ogiltigt taskId" });
    }

    const { error } = await supabase
      .from("prep_tasks")
      .update({
        is_done: isDone,
        updated_at: new Date().toISOString()
      })
      .eq("id", taskId)
      .eq("company_id", String(companyId));

    if (error) {
      if (isMissingTableError(error)) {
        return res.status(500).json({
          error: "prep_tasks-tabellen saknas. Kör SQL-setup för prep först."
        });
      }

      return res.status(500).json({ error: "Kunde inte uppdatera prep-uppgift" });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Din session har gått ut. Logga in igen." });
    }

    console.error("Prep toggle error:", err);
    return res.status(500).json({ error: "Serverfel" });
  }
}
