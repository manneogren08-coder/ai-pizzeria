import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { getSupabaseAdminClient } from "../../../lib/supabase.js";
import { extractAuthToken } from "../../../lib/auth.js";

const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS_PER_IP = process.env.NODE_ENV === "production" ? 20 : 50;
const MAX_ATTEMPTS_PER_ACCOUNT = process.env.NODE_ENV === "production" ? 10 : 20;

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
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

    const clientIP = getClientIP(req);
    if (
      consumeRateLimit(`admin-verify-ip:${clientIP}`, MAX_ATTEMPTS_PER_IP) ||
      consumeRateLimit(`admin-verify-company:${companyId}`, MAX_ATTEMPTS_PER_ACCOUNT)
    ) {
      return res.status(429).json({ error: "För många försök. Vänta några minuter och försök igen." });
    }

    // Get admin password from request
    const { adminPassword } = req.body;

    if (!adminPassword) {
      return res.status(400).json({ error: "Missing admin password" });
    }

    // Get company. Every authenticated staff member of the company may
    // attempt this - the admin_password_hash comparison below is the real
    // gate, and each admin-panel tab/endpoint enforces its own per-role
    // permission on top of this (see lib/roles.js canAccessAdminTab).
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, admin_password_hash")
      .eq("id", companyId)
      .single();

    if (companyError || !company) {
      return res.status(404).json({ error: "Företag hittades inte" });
    }

    if (!company.admin_password_hash) {
      return res.status(500).json({ error: "Admin-lösenord inte konfigurerat" });
    }

    // Verify admin password with bcrypt
    const match = await bcrypt.compare(adminPassword, company.admin_password_hash);
    
    if (!match) {
      return res.status(401).json({ error: "Fel admin-lösenord" });
    }

    return res.status(200).json({ 
      success: true,
      message: "Admin-åtkomst beviljad" 
    });

  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Din session har gått ut. Logga in igen." });
    }
    console.error("Error:", err);
    return res.status(500).json({ error: "Serverfel" });
  }
}
