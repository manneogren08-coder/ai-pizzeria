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
      .select("id, is_admin")
      .eq("id", companyId)
      .single();

    if (companyError || !company || !company.is_admin) {
      return res.status(403).json({ error: "Du är inte admin" });
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
      menu: details.menu ?? "",
      allergens: details.allergens ?? "",
      routines: details.routines ?? "",
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

      const missingColumnMatch =
        error.code === "42703"
          ? (error.message || "").match(/column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i)
          : null;

      if (!missingColumnMatch) {
        break;
      }

      const missingColumn = missingColumnMatch[1];
      if (!Object.prototype.hasOwnProperty.call(payloadToTry, missingColumn)) {
        break;
      }

      removedColumns.push(missingColumn);
      delete payloadToTry[missingColumn];
    }

    if (updateError) {
      console.error("Update error:", updateError);
      return res.status(500).json({
        error: "Kunde inte uppdatera uppgifter",
        details: updateError.message || "Okänt databasfel"
      });
    }

    return res.status(200).json({ 
      success: true,
      message: "Uppgifter uppdaterade",
      skippedColumns: removedColumns
    });

  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Ogiltig token" });
    }
    console.error("Error:", err);
    return res.status(500).json({ error: "Serverfel" });
  }
}
