import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function getCompanyByPassword(password) {
  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name, password_hash, active, query_count")
    .eq("active", true);

  if (error || !Array.isArray(companies)) {
    return null;
  }

  for (const company of companies) {
    if (!company.password_hash) continue;
    const match = await bcrypt.compare(password, company.password_hash);
    if (match) {
      return company;
    }
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const password = String(req.body?.password || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const code = String(req.body?.code || "").trim();

    if (!password) {
      return res.status(400).json({ error: "Saknar restaurangens lösenord" });
    }

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Ange en giltig e-post" });
    }

    if (!code) {
      return res.status(400).json({ error: "Saknar kod" });
    }

    const company = await getCompanyByPassword(password);
    if (!company) {
      return res.status(401).json({ error: "Fel restauranglösenord" });
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employee_accounts")
      .select("id, display_name, one_time_code_hash, one_time_code_expires_at, verified_at")
      .eq("company_id", String(company.id))
      .eq("email", email)
      .maybeSingle();

    if (employeeError || !employee) {
      return res.status(404).json({ error: "Anställd hittades inte. Begär engångskod först." });
    }

    const isDevEnv = process.env.NODE_ENV !== "production";

    if (code.toLowerCase() === "demo") {
      if (!isDevEnv) {
        return res.status(401).json({ error: "Demo-kod är endast tillåten i utvecklingsmiljö." });
      }

      if (!employee.verified_at) {
        return res.status(401).json({ error: "Demo-kod fungerar efter första verifieringen." });
      }
    } else {
      if (!employee.one_time_code_hash) {
        return res.status(401).json({ error: "Ingen aktiv kod. Begär ny engångskod." });
      }

      const isExpired = !employee.one_time_code_expires_at || new Date(employee.one_time_code_expires_at).getTime() < Date.now();
      if (isExpired) {
        return res.status(401).json({ error: "Koden har gått ut. Begär ny kod." });
      }

      const isValidCode = await bcrypt.compare(code, employee.one_time_code_hash);
      if (!isValidCode) {
        return res.status(401).json({ error: "Fel kod" });
      }
    }

    const nowIso = new Date().toISOString();

    await supabase
      .from("employee_accounts")
      .update({
        verified_at: employee.verified_at || nowIso,
        one_time_code_hash: null,
        one_time_code_expires_at: null,
        updated_at: nowIso,
        last_login_at: nowIso
      })
      .eq("id", employee.id)
      .eq("company_id", String(company.id));

    const token = jwt.sign(
      {
        companyId: company.id,
        employeeId: employee.id,
        employeeEmail: email,
        isEmployee: true
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(200).json({
      token,
      company: {
        id: company.id,
        name: company.name,
        is_admin: false,
        active: company.active !== undefined ? company.active : true,
        query_count: company.query_count || 0,
        is_employee: true,
        employee_email: email,
        employee_name: employee.display_name || ""
      }
    });
  } catch (err) {
    console.error("Employee verify-code error:", err);
    return res.status(500).json({ error: "Serverfel" });
  }
}
