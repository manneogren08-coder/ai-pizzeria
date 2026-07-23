import { getSupabaseAdminClient } from "../../lib/supabase.js";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { setAuthCookie } from "../../lib/auth.js";

// Simple rate limiting: track attempts by IP
const loginAttempts = {};
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = process.env.NODE_ENV === "production" ? 10 : 20;

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(ip) {
  const now = Date.now();
  if (!loginAttempts[ip]) {
    loginAttempts[ip] = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
  }

  const attempt = loginAttempts[ip];
  
  if (now > attempt.resetTime) {
    attempt.count = 0;
    attempt.resetTime = now + RATE_LIMIT_WINDOW;
  }

  attempt.count++;
  return attempt.count > MAX_ATTEMPTS;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const clientIP = getClientIP(req);
  
  // Rate limiting check
  if (checkRateLimit(clientIP)) {
    return res.status(429).json({ error: "För många inloggningsförsök. Försök igen senare." });
  }

  try {
    const { password, companyIdentifier } = req.body;
    const normalizedIdentifier = String(companyIdentifier || "").trim();

    if (!password) {
      return res.status(400).json({ error: "Missing password" });
    }

    if (!normalizedIdentifier) {
      return res.status(400).json({ error: "Skriv in företags-id eller företagsnamn" });
    }

    const selectFields = "id, name, support_email, password_hash, is_admin, active, query_count";
    const cleanIdentifier = normalizedIdentifier.replace(/[%,]/g, "");
    const isNumericId = /^\d+$/.test(cleanIdentifier);

    const supabase = getSupabaseAdminClient();

    let companies = [];
    let queryError = null;

    if (isNumericId) {
      const { data, error } = await supabase
        .from("companies")
        .select(selectFields)
        .eq("active", true)
        .eq("id", Number(cleanIdentifier))
        .limit(20);

      companies = data || [];
      queryError = error;
    } else {
      // Two separate parameterized ilike() calls instead of building a raw
      // .or() filter string, so the identifier is never concatenated into
      // PostgREST filter syntax.
      const [byName, byEmail] = await Promise.all([
        supabase.from("companies").select(selectFields).eq("active", true).ilike("name", `%${cleanIdentifier}%`).limit(20),
        supabase.from("companies").select(selectFields).eq("active", true).ilike("support_email", `%${cleanIdentifier}%`).limit(20)
      ]);

      queryError = byName.error || byEmail.error;

      const seen = new Set();
      for (const company of [...(byName.data || []), ...(byEmail.data || [])]) {
        if (!seen.has(company.id)) {
          seen.add(company.id);
          companies.push(company);
        }
      }
    }

    if (queryError || companies.length === 0) {
      return res.status(401).json({ error: "Företaget hittades inte" });
    }

    // Testa lösenordet mot alla aktiva företag
    let matchedCompany = null;
    for (const company of companies) {
      if (!company.password_hash) continue;
      const match = await bcrypt.compare(password, company.password_hash);
      if (match) {
        matchedCompany = company;
        break;
      }
    }

    if (!matchedCompany) {
      return res.status(401).json({ error: "Fel företagskod eller lösenord" });
    }

    const data = matchedCompany;

    // Get the company's owner role from restaurant_staff (dynamic per company,
    // not tied to any specific person's email)
    const { data: ownerStaffRows } = await supabase
      .from("restaurant_staff")
      .select("role")
      .eq("company_id", String(data.id))
      .eq("role", "owner")
      .limit(1);

    const staffData = ownerStaffRows?.[0] || null;

    // Skapa token
    const token = jwt.sign(
      { 
        companyId: data.id,
        type: "company"
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    setAuthCookie(res, token);

    return res.status(200).json({
      token,
      company: {
        id: data.id,
        name: data.name,
        role: staffData?.role || (data.is_admin ? 'owner' : 'member'),
        is_admin: data.is_admin || false,
        active: data.active !== undefined ? data.active : true,
        query_count: data.query_count || 0
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}