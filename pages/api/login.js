import { createClient } from "@supabase/supabase-js";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { setAuthCookie } from "../../lib/auth.js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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

    let query = supabase
      .from("companies")
      .select(selectFields)
      .eq("active", true);

    if (isNumericId) {
      query = query.eq("id", Number(cleanIdentifier));
    } else {
      query = query.or(`name.ilike.%${cleanIdentifier}%,support_email.ilike.%${cleanIdentifier}%`);
    }

    const { data: companies, error } = await query.limit(20);

    if (error || !companies || companies.length === 0) {
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

    // Skapa token
    const token = jwt.sign(
      { companyId: data.id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    setAuthCookie(res, token);

    return res.status(200).json({
      token,
      company: {
        id: data.id,
        name: data.name,
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