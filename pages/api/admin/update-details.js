import jwt from 'jsonwebtoken';
import { getSupabaseAdminClient } from "../../../lib/supabase.js";

const OPENING_ROUTINE_START = "[OPENING_ROUTINE]";
const OPENING_ROUTINE_END = "[/OPENING_ROUTINE]";
const RECIPES_START = "[RECIPES]";
const RECIPES_END = "[/RECIPES]";

function stripOpeningRoutineSection(text) {
  if (typeof text !== "string") return "";
  const pattern = new RegExp(`${OPENING_ROUTINE_START}[\\s\\S]*?${OPENING_ROUTINE_END}`, "g");
  return text.replace(pattern, "").trim();
}

function stripRecipesSection(text) {
  if (typeof text !== "string") return "";
  const pattern = new RegExp(`${RECIPES_START}[\\s\\S]*?${RECIPES_END}`, "g");
  return text.replace(pattern, "").trim();
}

function normalizeMenuText(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/\bFÖÄTT\b/gi, "FÖRRÄTT")
    .replace(/\bFÃ–Ã„TT\b/g, "FÖRRÄTT")
    .replace(/\bFÃ–RRÃ„TT\b/g, "FÖRRÄTT");
}

function withEmbeddedRecipes(menuText, recipesText) {
  const baseMenu = stripRecipesSection(menuText);
  const recipes = typeof recipesText === "string" ? recipesText.trim() : "";

  if (!recipes) {
    return baseMenu;
  }

  return [
    baseMenu,
    `${RECIPES_START}\n${recipes}\n${RECIPES_END}`
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function withEmbeddedOpeningRoutine(routinesText, openingRoutineText) {
  const baseRoutines = stripOpeningRoutineSection(routinesText);
  const openingRoutine = typeof openingRoutineText === "string" ? openingRoutineText.trim() : "";

  if (!openingRoutine) {
    return baseRoutines;
  }

  return [
    baseRoutines,
    `${OPENING_ROUTINE_START}\n${openingRoutine}\n${OPENING_ROUTINE_END}`
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();
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
      return res.status(403).json({ error: "Du Ã¤r inte admin" });
    }

    // Get details from request
    const { details } = req.body;

    if (!details) {
      return res.status(400).json({ error: "Saknar uppgifter" });
    }

    const updatePayload = {
      support_email: details.support_email ?? "",
      opening_hours: details.opening_hours ?? "",
      closure_info: details.closure_info ?? "",
      menu: normalizeMenuText(stripRecipesSection(details.menu ?? "")),
      recipes: details.recipes ?? "",
      allergens: details.allergens ?? "",
      routines: stripOpeningRoutineSection(details.routines ?? ""),
      opening_routine: details.opening_routine ?? "",
      closing_routine: details.closing_routine ?? "",
      behavior_guidelines: details.behavior_guidelines ?? "",
      staff_roles: details.staff_roles ?? "",
      staff_situations: details.staff_situations ?? ""
    };

    let payloadToTry = { ...updatePayload };
    const removedColumns = [];
    let updateError = null;

    while (Object.keys(payloadToTry).length > 0) {
      const { error } = await supabase
        .from("companies")
        .update(payloadToTry)
        .eq("id", companyId);

      if (!error) {
        updateError = null;
        break;
      }

      updateError = error;

      const errorMessage = error.message || "";
      const missingColumnMatch =
        errorMessage.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i) ||
        errorMessage.match(/Could not find the '([a-zA-Z0-9_]+)' column of '[^']+' in the schema cache/i);

      if (!missingColumnMatch) {
        break;
      }

      const missingColumn = missingColumnMatch[1];
      if (!Object.prototype.hasOwnProperty.call(payloadToTry, missingColumn)) {
        break;
      }

      if (missingColumn === "opening_routine") {
        payloadToTry.routines = withEmbeddedOpeningRoutine(
          payloadToTry.routines,
          payloadToTry.opening_routine
        );
      }

      if (missingColumn === "recipes") {
        payloadToTry.menu = withEmbeddedRecipes(
          payloadToTry.menu,
          payloadToTry.recipes
        );
      }

      removedColumns.push(missingColumn);
      delete payloadToTry[missingColumn];
    }

    if (updateError) {
      console.error("Update error:", updateError);
      return res.status(500).json({
        error: "Kunde inte uppdatera uppgifter",
        details: updateError.message || "OkÃ¤nt databasfel"
      });
    }

    return res.status(200).json({ 
      success: true,
      message: "Uppgifter uppdaterade",
      skippedColumns: removedColumns
    });

  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Din session har gÃ¥tt ut. Logga in igen." });
    }
    console.error("Error:", err);
    return res.status(500).json({
      error: "Serverfel",
      details: err?.message || "OkÃ¤nt serverfel"
    });
  }
}
