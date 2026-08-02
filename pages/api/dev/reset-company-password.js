import bcrypt from "bcrypt";
import { getSupabaseAdminClient } from "../../../lib/supabase.js";

// Local-development-only password reset for a test company's login password,
// for when it's been forgotten and can't be recovered through the normal
// change-password flow (which requires knowing the current password).
//
// The NODE_ENV check below is the REAL security boundary - it hard-blocks
// this endpoint in any production build/deploy, independent of whatever the
// UI does. Nothing client-side (hostname checks, hidden buttons) can be
// trusted as the actual gate for a route that resets account credentials
// without requiring the current password, since a client-side check can
// simply be bypassed by calling the API directly.
export default async function handler(req, res) {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return res.status(500).json({ error: "Servern saknar SUPABASE_SERVICE_ROLE_KEY" });
    }

    const { companyIdentifier, newPassword } = req.body;
    const identifier = String(companyIdentifier || "").trim();

    if (!identifier) {
      return res.status(400).json({ error: "Ange företags-id eller företagsnamn" });
    }

    if (!newPassword || newPassword.length < 3) {
      return res.status(400).json({ error: "Lösenord måste vara minst 3 tecken" });
    }

    const cleanIdentifier = identifier.replace(/[%,]/g, "");
    const isNumericId = /^\d+$/.test(cleanIdentifier);

    const { data: company, error: lookupError } = isNumericId
      ? await supabase.from("companies").select("id, name").eq("id", Number(cleanIdentifier)).maybeSingle()
      : await supabase.from("companies").select("id, name").ilike("name", `%${cleanIdentifier}%`).limit(1).maybeSingle();

    if (lookupError) {
      console.error("[DEV] Company lookup error:", lookupError);
      return res.status(500).json({ error: "Kunde inte hitta företag" });
    }

    if (!company) {
      return res.status(404).json({ error: "Företag hittades inte" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabase
      .from("companies")
      .update({ password_hash: hashedPassword })
      .eq("id", company.id);

    if (updateError) {
      console.error("[DEV] Password reset error:", updateError);
      return res.status(500).json({ error: "Kunde inte uppdatera lösenord" });
    }

    console.log(`[DEV] Login password reset for company #${company.id} (${company.name})`);

    return res.status(200).json({
      success: true,
      company: { id: company.id, name: company.name }
    });
  } catch (err) {
    console.error("[DEV] Password reset error:", err);
    return res.status(500).json({ error: "Serverfel" });
  }
}
