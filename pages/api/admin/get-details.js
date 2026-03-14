import jwt from 'jsonwebtoken';
import { getSupabaseAdminClient } from "../../../lib/supabase.js";
import { extractAuthToken } from "../../../lib/auth.js";

const OPENING_ROUTINE_SECTION_REGEX = /\[OPENING_ROUTINE\]([\s\S]*?)\[\/OPENING_ROUTINE\]/i;
const RECIPES_SECTION_REGEX = /\[RECIPES\]([\s\S]*?)\[\/RECIPES\]/i;

function extractEmbeddedOpeningRoutine(routinesText) {
  if (typeof routinesText !== "string") {
    return { cleanedRoutines: "", openingRoutine: "" };
  }

  const match = routinesText.match(OPENING_ROUTINE_SECTION_REGEX);
  const openingRoutine = match?.[1]?.trim() || "";
  const cleanedRoutines = routinesText.replace(OPENING_ROUTINE_SECTION_REGEX, "").trim();

  return { cleanedRoutines, openingRoutine };
}

function extractEmbeddedRecipes(menuText) {
  if (typeof menuText !== "string") {
    return { cleanedMenu: "", recipes: "" };
  }

  const match = menuText.match(RECIPES_SECTION_REGEX);
  const recipes = match?.[1]?.trim() || "";
  const cleanedMenu = menuText.replace(RECIPES_SECTION_REGEX, "").trim();

  return { cleanedMenu, recipes };
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

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded.companyId;

    if (!companyId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Get company details
    const { data: company, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single();

    if (error || !company) {
      return res.status(404).json({ error: "FÃ¶retag hittas inte" });
    }

    const { cleanedRoutines, openingRoutine } = extractEmbeddedOpeningRoutine(company.routines || "");
    const { cleanedMenu, recipes } = extractEmbeddedRecipes(company.menu || "");

    const details = {
      support_email: company.support_email || "",
      opening_hours: company.opening_hours || "",
      closure_info: company.closure_info || "",
      menu: cleanedMenu,
      recipes: company.recipes || recipes,
      allergens: company.allergens || "",
      routines: cleanedRoutines,
      opening_routine: company.opening_routine || openingRoutine,
      closing_routine: company.closing_routine || "",
      behavior_guidelines: company.behavior_guidelines || "",
      staff_roles: company.staff_roles || "",
      staff_situations: company.staff_situations || "",
      query_count: company.query_count || 0,
      active: !!company.active
    };

    return res.status(200).json({ details });

  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Din session har gÃ¥tt ut. Logga in igen." });
    }
    console.error("Error:", err);
    return res.status(500).json({ error: "Serverfel" });
  }
}
