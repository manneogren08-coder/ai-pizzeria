import bcrypt from "bcrypt";
import { getSupabaseAdminClient } from "../../../lib/supabase.js";

// Local-development-only company creation for the "Skapa företag" dev tool.
// Mirrors pages/api/admin/setup-company.js's creation logic exactly (same
// tables, same bcrypt hashing, same fields) but lets you choose the
// admin-panel password yourself instead of it being randomly generated, and
// doesn't require an existing authenticated session - the point of this
// tool is to bootstrap new test companies without already being logged in
// as one. The public/shared setup-company.js is untouched.
//
// The NODE_ENV check below is the real security boundary, same as the other
// dev-only endpoints - it hard-blocks this route in any production
// build/deploy, independent of what the UI does.
export default async function handler(req, res) {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Servern saknar SUPABASE_SERVICE_ROLE_KEY" });
    }

    const {
      companyName,
      companyEmail,
      ownerName,
      ownerEmail,
      ownerPassword,
      adminPassword
    } = req.body;

    if (!companyName || !companyEmail || !ownerName || !ownerEmail || !ownerPassword || !adminPassword) {
      return res.status(400).json({ error: "Alla fält är obligatoriska, inklusive adminlösenord" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(companyEmail) || !emailRegex.test(ownerEmail)) {
      return res.status(400).json({ error: "Ogiltig e-postadress" });
    }

    // Create company
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({
        name: companyName,
        email: companyEmail,
        active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (companyError) {
      console.error("[DEV] Company creation error:", companyError);
      return res.status(500).json({ error: "Kunde inte skapa företag" });
    }

    // Create owner account in employee_accounts
    const { error: employeeAccountError } = await supabaseAdmin
      .from("employee_accounts")
      .insert({
        email: ownerEmail,
        company_id: company.id,
        verified_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (employeeAccountError) {
      console.error("[DEV] Employee account creation error:", employeeAccountError);
      return res.status(500).json({ error: "Kunde inte skapa konto" });
    }

    // Create owner in restaurant_staff with owner role
    const { data: staff, error: staffError } = await supabaseAdmin
      .from("restaurant_staff")
      .insert({
        name: ownerName,
        email: ownerEmail,
        company_id: company.id,
        role: "owner",
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (staffError) {
      console.error("[DEV] Staff creation error:", staffError);
      return res.status(500).json({ error: "Kunde inte skapa personal" });
    }

    // Same hashing as the public flow (bcrypt, 10 rounds) - just sourced
    // from user input instead of a randomly generated admin password.
    const [hashedPassword, hashedAdminPassword] = await Promise.all([
      bcrypt.hash(ownerPassword, 10),
      bcrypt.hash(adminPassword, 10)
    ]);

    const { error: passwordError } = await supabaseAdmin
      .from("companies")
      .update({
        password_hash: hashedPassword,
        admin_password_hash: hashedAdminPassword
      })
      .eq("id", company.id);

    if (passwordError) {
      console.error("[DEV] Password setting error:", passwordError);
      return res.status(500).json({ error: "Kunde inte spara lösenord" });
    }

    console.log(`[DEV] Company created: #${company.id} (${companyName})`);

    return res.status(201).json({
      success: true,
      message: "Företag och owner-konto skapade",
      company: {
        id: company.id,
        name: companyName,
        email: companyEmail,
        active: true
      },
      owner: {
        id: staff.id,
        name: ownerName,
        email: ownerEmail,
        role: "owner"
      }
    });
  } catch (error) {
    console.error("[DEV] Create company error:", error);
    return res.status(500).json({ error: "Serverfel" });
  }
}
