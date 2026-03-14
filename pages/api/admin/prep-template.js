import jwt from "jsonwebtoken";
import { getSupabaseAdminClient } from "../../../lib/supabase.js";
import { extractAuthToken } from "../../../lib/auth.js";

function isMissingTableError(error) {
  const message = error?.message || "";
  return /does not exist|relation .* does not exist|schema cache/i.test(message);
}

function normalizePriority(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "h" || normalized === "high" || normalized === "hog" || normalized === "hög") {
    return "high";
  }
  if (normalized === "l" || normalized === "low" || normalized === "lag" || normalized === "låg") {
    return "low";
  }
  return "medium";
}

function normalizeDueTime(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";

  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return "";

  const hours = Number(match[1]);
  const minutes = Number(match[2] || "0");
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return "";
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function toTemplateTasks(templateText) {
  if (typeof templateText !== "string") return [];

  return templateText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*•]\s*/, ""))
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      const title = parts[0] || "";

      return {
        title,
        priority: normalizePriority(parts[1]),
        station: String(parts[2] || "").trim().slice(0, 60),
        due_time: normalizeDueTime(parts[3])
      };
    })
    .filter((task) => Boolean(task.title))
    .slice(0, 80);
}

function normalizePrepDate(rawDate) {
  const value = typeof rawDate === "string" ? rawDate : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  return new Date().toISOString().slice(0, 10);
}

async function getAdminCompany(supabase, companyId) {
  const { data: company, error } = await supabase
    .from("companies")
    .select("id, is_admin")
    .eq("id", companyId)
    .single();

  if (error || !company || !company.is_admin) {
    return null;
  }

  return company;
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Only GET and POST allowed" });
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

    const adminCompany = await getAdminCompany(supabase, companyId);
    if (!adminCompany) {
      return res.status(403).json({ error: "Du är inte admin" });
    }

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("prep_templates")
        .select("template_text")
        .eq("company_id", String(companyId))
        .maybeSingle();

      if (error) {
        if (isMissingTableError(error)) {
          return res.status(500).json({
            error: "prep_templates-tabellen saknas. Kör SQL-setup för prep först."
          });
        }

        return res.status(500).json({ error: "Kunde inte läsa prep-mall" });
      }

      return res.status(200).json({ template: data?.template_text || "" });
    }

    const nextTemplate = typeof req.body?.template === "string" ? req.body.template.trim() : "";

    const { error } = await supabase
      .from("prep_templates")
      .upsert(
        {
          company_id: String(companyId),
          template_text: nextTemplate,
          updated_at: new Date().toISOString()
        },
        { onConflict: "company_id" }
      );

    if (error) {
      if (isMissingTableError(error)) {
        return res.status(500).json({
          error: "prep_templates-tabellen saknas. Kör SQL-setup för prep först."
        });
      }

      return res.status(500).json({ error: "Kunde inte spara prep-mall" });
    }

    const publishToday = req.body?.publishToday !== false;
    const prepDate = normalizePrepDate(req.body?.prepDate);

    if (publishToday) {
      const tasks = toTemplateTasks(nextTemplate);

      const { error: deleteError } = await supabase
        .from("prep_tasks")
        .delete()
        .eq("company_id", String(companyId))
        .eq("prep_date", prepDate);

      if (deleteError && !isMissingTableError(deleteError)) {
        return res.status(500).json({ error: "Kunde inte uppdatera dagens prep-lista" });
      }

      if (tasks.length > 0) {
        const rowsToInsert = tasks.map((task, index) => ({
          company_id: String(companyId),
          prep_date: prepDate,
          title: task.title,
          priority: task.priority,
          station: task.station,
          due_time: task.due_time,
          is_done: false,
          sort_order: index
        }));

        const { error: insertError } = await supabase
          .from("prep_tasks")
          .insert(rowsToInsert);

        if (insertError) {
          if (isMissingTableError(insertError)) {
            return res.status(500).json({
              error: "prep_tasks-tabellen saknas. Kör SQL-setup för prep först."
            });
          }
          return res.status(500).json({ error: "Kunde inte uppdatera dagens prep-lista" });
        }
      }
    }

    return res.status(200).json({ success: true, template: nextTemplate, prepDate });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Din session har gått ut. Logga in igen." });
    }

    console.error("Prep template error:", err);
    return res.status(500).json({ error: "Serverfel" });
  }
}
