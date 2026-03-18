import jwt from "jsonwebtoken";
import { getSupabaseAdminClient } from "../../../lib/supabase.js";
import { extractAuthToken } from "../../../lib/auth.js";

function isMissingTableError(error) {
  const message = error?.message || "";
  return /does not exist|relation .* does not exist|schema cache/i.test(message);
}

function normalizePrepDate(rawDate) {
  const value = typeof rawDate === "string" ? rawDate : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  return new Date().toISOString().slice(0, 10);
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
        due_time: normalizeDueTime(parts[3]),
        assigned_to: String(parts[4] || "").trim() || null
      };
    })
    .filter((task) => Boolean(task.title))
    .slice(0, 80);
}

async function ensureTasksForDay(supabase, companyId, prepDate) {
  const companyKey = String(companyId);

  const { data: existingTasks, error: existingError } = await supabase
    .from("prep_tasks")
    .select("id, title, priority, station, due_time, is_done, sort_order, assigned_to")
    .eq("company_id", companyKey)
    .eq("prep_date", prepDate)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (existingError) {
    throw existingError;
  }

  if (Array.isArray(existingTasks) && existingTasks.length > 0) {
    return { tasks: existingTasks, generatedFromTemplate: false };
  }

  const { data: templateData, error: templateError } = await supabase
    .from("prep_templates")
    .select("template_text")
    .eq("company_id", companyKey)
    .maybeSingle();

  if (templateError) {
    throw templateError;
  }

  const templateTasks = toTemplateTasks(templateData?.template_text || "");

  if (templateTasks.length === 0) {
    return { tasks: [], generatedFromTemplate: false };
  }

  const rowsToInsert = templateTasks.map((task, index) => ({
    company_id: companyKey,
    prep_date: prepDate,
    title: task.title,
    priority: task.priority,
    station: task.station,
    due_time: task.due_time,
    is_done: false,
    sort_order: index,
    assigned_to: task.assigned_to
  }));

  const { error: insertError } = await supabase
    .from("prep_tasks")
    .insert(rowsToInsert);

  if (insertError) {
    throw insertError;
  }

  const { data: insertedTasks, error: insertedReadError } = await supabase
    .from("prep_tasks")
    .select("id, title, priority, station, due_time, is_done, sort_order")
    .eq("company_id", companyKey)
    .eq("prep_date", prepDate)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (insertedReadError) {
    throw insertedReadError;
  }

  return {
    tasks: insertedTasks || [],
    generatedFromTemplate: true
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Only GET allowed" });
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
    const tokenType = decoded.type;

    if (!companyId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const targetDate = typeof req.query?.date === "string" ? req.query.date : normalizePrepDate(new Date());

    const { tasks, generatedFromTemplate } = await ensureTasksForDay(supabase, companyId, targetDate);

    const response = {
      prepDate: targetDate,
      tasks: Array.isArray(tasks) ? tasks : (tasks.tasks || []),
      generatedFromTemplate
    };

    return res.status(200).json(response);
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Din session har gått ut. Logga in igen." });
    }

    if (isMissingTableError(err)) {
      return res.status(500).json({
        error: "prep_tasks/prep_templates-tabeller saknas. Kör SQL-setup för prep först."
      });
    }

    console.error("Prep day error:", err);
    return res.status(500).json({ error: "Serverfel" });
  }
}
