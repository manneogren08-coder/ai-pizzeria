import jwt from "jsonwebtoken";
import { getSupabaseAdminClient } from "../../../lib/supabase.js";
import { extractAuthToken } from "../../../lib/auth.js";

const EXPECTED_COMPANY_COLUMNS = [
  "support_email",
  "opening_hours",
  "closure_info",
  "menu",
  "recipes",
  "allergens",
  "routines",
  "opening_routine",
  "closing_routine",
  "behavior_guidelines",
  "staff_roles",
  "staff_situations",
  "query_count",
  "active"
];

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Only GET allowed" });
  }

  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded.companyId;

    if (!companyId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, is_admin")
      .eq("id", companyId)
      .single();

    if (companyError || !company || !company.is_admin) {
      return res.status(403).json({ error: "Du är inte admin" });
    }

    const { data: rows, error: sampleError } = await supabase
      .from("companies")
      .select("*")
      .limit(1);

    if (sampleError) {
      return res.status(500).json({ error: "Kunde inte läsa companies-tabellen", details: sampleError.message });
    }

    const sampleRow = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    const presentColumns = sampleRow ? Object.keys(sampleRow) : [];
    const missingColumns = sampleRow
      ? EXPECTED_COMPANY_COLUMNS.filter((column) => !presentColumns.includes(column))
      : [];

    return res.status(200).json({
      env: {
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        supabaseServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        jwtSecret: !!process.env.JWT_SECRET,
        resendApiKey: !!process.env.RESEND_API_KEY,
        resendFromEmail: !!process.env.RESEND_FROM_EMAIL
      },
      db: {
        hasSampleRow: !!sampleRow,
        presentColumns,
        missingColumns
      }
    });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Din session har gått ut. Logga in igen." });
    }

    return res.status(500).json({
      error: "Serverfel",
      details: err?.message || "Okänt serverfel"
    });
  }
}
