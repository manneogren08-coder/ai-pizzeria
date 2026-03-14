import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { setAuthCookie } from "../../../lib/auth.js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_VERIFY_PER_IP = process.env.NODE_ENV === "production" ? 20 : 50;
const MAX_VERIFY_PER_ACCOUNT = process.env.NODE_ENV === "production" ? 10 : 20;

function getClientIP(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

function consumeRateLimit(key, maxRequests) {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || now > existing.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  existing.count += 1;
  return existing.count > maxRequests;
}

async function getCompanyByIdentifierAndPassword(companyIdentifier, password) {
  const normalizedIdentifier = String(companyIdentifier || "").trim();
  if (!normalizedIdentifier) return null;

  const cleanIdentifier = normalizedIdentifier.replace(/[%,]/g, "");
  const isNumericId = /^\d+$/.test(cleanIdentifier);

  let query = supabase
    .from("companies")
    .select("id, name, password_hash, active, query_count, support_email")
    .eq("active", true);

  if (isNumericId) {
    query = query.eq("id", Number(cleanIdentifier));
  } else {
    query = query.or(`name.ilike.%${cleanIdentifier}%,support_email.ilike.%${cleanIdentifier}%`);
  }

  const { data: companies, error } = await query.limit(20);

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
    const clientIP = getClientIP(req);
    const password = String(req.body?.password || "").trim();
    const companyIdentifier = String(req.body?.companyIdentifier || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const code = String(req.body?.code || "").trim();

    if (!password) {
      return res.status(400).json({ error: "Saknar restaurangens lösenord" });
    }

    if (!companyIdentifier) {
      return res.status(400).json({ error: "Skriv in företags-id eller företagsnamn" });
    }

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Ange en giltig e-post" });
    }

    if (!code) {
      return res.status(400).json({ error: "Saknar kod" });
    }

    const accountLimitKey = `employee-verify:${companyIdentifier.toLowerCase()}:${email}`;
    if (consumeRateLimit(`employee-verify-ip:${clientIP}`, MAX_VERIFY_PER_IP) || consumeRateLimit(accountLimitKey, MAX_VERIFY_PER_ACCOUNT)) {
      return res.status(429).json({ error: "För många verifieringsförsök. Vänta några minuter och försök igen." });
    }

    const company = await getCompanyByIdentifierAndPassword(companyIdentifier, password);
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

    setAuthCookie(res, token);

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
