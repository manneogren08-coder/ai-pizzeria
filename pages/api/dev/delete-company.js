import { getSupabaseAdminClient } from "../../../lib/supabase.js";

// Local-development-only company deletion for cleaning up test companies.
//
// No foreign keys exist between companies and its related tables (see the
// schema analysis this tool was built from), so each table is cleaned up
// explicitly here, in dependency order, using the correct company_id type
// per table: restaurant_staff.company_id is an integer, while
// employee_accounts, prep_tasks and prep_templates all store it as text.
//
// The NODE_ENV check below is the REAL security boundary - it hard-blocks
// this endpoint in any production build/deploy, independent of whatever the
// UI does, same as the other dev-only endpoints.
export default async function handler(req, res) {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return res.status(500).json({ error: "Servern saknar SUPABASE_SERVICE_ROLE_KEY" });
  }

  if (req.method === "GET") {
    return handleLookup(req, res, supabase);
  }

  if (req.method === "DELETE") {
    return handleDelete(req, res, supabase);
  }

  return res.status(405).json({ error: "Only GET and DELETE allowed" });
}

async function findCompany(supabase, identifier) {
  const cleanIdentifier = String(identifier || "").trim().replace(/[%,]/g, "");
  if (!cleanIdentifier) return null;

  const isNumericId = /^\d+$/.test(cleanIdentifier);

  const { data, error } = isNumericId
    ? await supabase.from("companies").select("id, name, email, active").eq("id", Number(cleanIdentifier)).maybeSingle()
    : await supabase.from("companies").select("id, name, email, active").ilike("name", `%${cleanIdentifier}%`).limit(1).maybeSingle();

  if (error) throw error;
  return data;
}

async function countRows(supabase, table, column, value) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, value);

  if (error) throw error;
  return count || 0;
}

// Step 1: "Ladda företag" - look up the company and summarize how much
// related data exists, so nothing is deleted before the user has seen
// exactly what's about to happen.
async function handleLookup(req, res, supabase) {
  try {
    const identifier = req.query.identifier;
    if (!identifier) {
      return res.status(400).json({ error: "Ange företags-id eller namn" });
    }

    const company = await findCompany(supabase, identifier);
    if (!company) {
      return res.status(404).json({ error: "Företag hittades inte" });
    }

    const [staffCount, employeeAccountCount, prepTaskCount, prepTemplateCount] = await Promise.all([
      countRows(supabase, "restaurant_staff", "company_id", company.id),
      countRows(supabase, "employee_accounts", "company_id", String(company.id)),
      countRows(supabase, "prep_tasks", "company_id", String(company.id)),
      countRows(supabase, "prep_templates", "company_id", String(company.id))
    ]);

    return res.status(200).json({
      company: {
        id: company.id,
        name: company.name,
        email: company.email,
        active: company.active
      },
      counts: {
        restaurant_staff: staffCount,
        employee_accounts: employeeAccountCount,
        prep_tasks: prepTaskCount
      },
      hasPrepTemplate: prepTemplateCount > 0
    });
  } catch (err) {
    console.error("[DEV] Delete-company lookup error:", err);
    return res.status(500).json({ error: "Serverfel vid uppslag" });
  }
}

// Step 2: actually delete. Re-verifies the company exists (the frontend's
// earlier lookup is just for display, this is the authoritative check),
// then deletes in order: prep_tasks, prep_templates, employee_accounts,
// restaurant_staff, companies - dependent data first, the companies row
// last, since there's no DB-enforced cascade to rely on.
async function handleDelete(req, res, supabase) {
  try {
    const companyId = req.body?.companyId;
    const numericId = Number(companyId);

    if (!Number.isInteger(numericId) || numericId <= 0) {
      return res.status(400).json({ error: "Ogiltigt företags-id" });
    }

    const { data: company, error: lookupError } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", numericId)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!company) {
      return res.status(404).json({ error: "Företag hittades inte" });
    }

    const textId = String(numericId);
    const deleted = {};

    const { error: prepTasksError, count: prepTasksCount } = await supabase
      .from("prep_tasks")
      .delete({ count: "exact" })
      .eq("company_id", textId);
    if (prepTasksError) throw prepTasksError;
    deleted.prep_tasks = prepTasksCount || 0;

    const { error: prepTemplatesError, count: prepTemplatesCount } = await supabase
      .from("prep_templates")
      .delete({ count: "exact" })
      .eq("company_id", textId);
    if (prepTemplatesError) throw prepTemplatesError;
    deleted.prep_templates = prepTemplatesCount || 0;

    const { error: employeeAccountsError, count: employeeAccountsCount } = await supabase
      .from("employee_accounts")
      .delete({ count: "exact" })
      .eq("company_id", textId);
    if (employeeAccountsError) throw employeeAccountsError;
    deleted.employee_accounts = employeeAccountsCount || 0;

    const { error: staffError, count: staffCount } = await supabase
      .from("restaurant_staff")
      .delete({ count: "exact" })
      .eq("company_id", numericId);
    if (staffError) throw staffError;
    deleted.restaurant_staff = staffCount || 0;

    const { error: companyError, count: companyCount } = await supabase
      .from("companies")
      .delete({ count: "exact" })
      .eq("id", numericId);
    if (companyError) throw companyError;
    deleted.companies = companyCount || 0;

    console.log(`[DEV] Company deleted: #${numericId} (${company.name})`, deleted);

    return res.status(200).json({
      success: true,
      deletedCompany: { id: numericId, name: company.name },
      deleted
    });
  } catch (err) {
    console.error("[DEV] Delete-company error:", err);
    return res.status(500).json({ error: "Serverfel vid radering" });
  }
}
