import { createClient } from "@supabase/supabase-js";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_IP = process.env.NODE_ENV === "production" ? 12 : 30;
const MAX_REQUESTS_PER_ACCOUNT = process.env.NODE_ENV === "production" ? 5 : 10;

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

async function getCompanyByIdentifier(companyIdentifier) {
  const normalizedIdentifier = String(companyIdentifier || "").trim();
  if (!normalizedIdentifier) return null;

  const cleanIdentifier = normalizedIdentifier.replace(/[%,]/g, "");
  const isNumericId = /^\d+$/.test(cleanIdentifier);

  let query = supabase
    .from("companies")
    .select("id, name, password_hash, active, support_email")
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
    // We don't need to verify password for employee login
    return company;
  }

  return null;
}

async function getStaffByEmailAndCompany(email, companyId) {
  const { data: staff, error } = await supabase
    .from("restaurant_staff")
    .select("company_id, name, email, companies!inner(id, name)")
    .eq("email", email.toLowerCase())
    .eq("company_id", companyId)
    .single();

  if (error) {
    return null;
  }

  return staff;
}

async function getStaffByEmail(email) {
  const { data, error } = await supabaseAdmin
    .from("restaurant_staff")
    .select("*, companies(id, name)")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data;
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOtpEmail({ to, code, companyName }) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  if (!resendApiKey) {
    return { sent: false, reason: "missing_api_key" };
  }

  const subject = `${companyName}: din engångskod`;
  const text = [
    `Hej!`,
    `Din engångskod till ${companyName} är: ${code}`,
    `Koden är giltig i 10 minuter.`,
    "Om du inte begärde denna kod kan du ignorera mejlet."
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="margin-bottom: 8px;">Inloggningskod</h2>
      <p>Din engångskod till <strong>${companyName}</strong> är:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 14px 0;">${code}</p>
      <p>Koden är giltig i 10 minuter.</p>
      <p style="color: #6b7280; font-size: 13px;">Om du inte begärde denna kod kan du ignorera mejlet.</p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject,
      text,
      html
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    return {
      sent: false,
      reason: "resend_error",
      status: response.status,
      details: errorBody
    };
  }

  return { sent: true };
}

function getOtpSendErrorMessage(emailResult) {
  if (!emailResult || emailResult.sent) {
    return "Kunde inte skicka e-postkod just nu";
  }

  if (emailResult.reason === "missing_api_key") {
    return "Servern saknar RESEND_API_KEY i production";
  }

  if (emailResult.reason === "resend_error") {
    if (emailResult.status === 401) {
      return "Ogiltig Resend API-nyckel i production";
    }
    if (emailResult.status === 403) {
      return "Avsändaradressen är inte verifierad i Resend";
    }
    if (emailResult.status === 422) {
      return "Ogiltig avsändaradress eller mottagare för e-post";
    }
    if (emailResult.status === 429) {
      return "Resend rate limit nådd, försök igen om en minut";
    }
  }

  return "Kunde inte skicka e-postkod just nu";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const clientIP = getClientIP(req);
    const email = String(req.body?.email || "").trim().toLowerCase();
    const name = String(req.body?.name || "").trim();

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Ange en giltig e-post" });
    }

    if (!name) {
      return res.status(400).json({ error: "Ange ditt namn" });
    }

    const accountLimitKey = `employee-request:${email}`;
    if (consumeRateLimit(`employee-request-ip:${clientIP}`, MAX_REQUESTS_PER_IP) || consumeRateLimit(accountLimitKey, MAX_REQUESTS_PER_ACCOUNT)) {
      return res.status(429).json({ error: "För många kodförsök. Vänta några minuter och försök igen." });
    }

    // Check if staff member exists in restaurant_staff table (no company_id filter - we'll find the first match)
    const staff = await getStaffByEmail(email);
    
    if (!staff) {
      return res.status(401).json({ error: "Din e-post är inte registrerad. Kontakta din chef." });
    }

    const loginCode = generateOtpCode();
    const loginCodeHash = await bcrypt.hash(loginCode, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: upsertError } = await supabase
      .from("employee_accounts")
      .upsert(
        {
          company_id: String(staff.company_id),
          email,
          display_name: name,
          one_time_code_hash: loginCodeHash,
          one_time_code_expires_at: expiresAt,
          updated_at: new Date().toISOString()
        },
        { onConflict: "company_id,email" }
      );

    if (upsertError) {
      return res.status(500).json({ error: upsertError.message || "Kunde inte skapa anställd-konto" });
    }

    const emailResult = await sendOtpEmail({
      to: email,
      code: loginCode,
      companyName: staff.name || staff.companies?.name || "Ditt företag"
    });

    if (!emailResult.sent && process.env.NODE_ENV === "production") {
      return res.status(502).json({ error: getOtpSendErrorMessage(emailResult) });
    }

    // In development, we expose fallback code if email integration is not fully configured yet.
    if (!emailResult.sent) {
      console.log(`[Employee OTP Fallback] ${email} (${staff.name || staff.companies?.name || "Ditt företag"}): ${loginCode}`);
    }

    return res.status(200).json({
      success: true,
      message: "Engångskod skickad.",
      ...(process.env.NODE_ENV !== "production" ? { debugCode: loginCode } : {}),
      ...(process.env.NODE_ENV !== "production" && !emailResult.sent
        ? { emailStatus: "fallback_debug_code" }
        : {})
    });
  } catch (err) {
    return res.status(500).json({ error: "Serverfel" });
  }
}
