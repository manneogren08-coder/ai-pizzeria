import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function getCompanyByPassword(password) {
  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name, password_hash, active")
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const password = String(req.body?.password || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const name = String(req.body?.name || "").trim();

    if (!password) {
      return res.status(400).json({ error: "Saknar restaurangens lösenord" });
    }

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Ange en giltig e-post" });
    }

    const company = await getCompanyByPassword(password);
    if (!company) {
      return res.status(401).json({ error: "Fel restauranglösenord" });
    }

    const loginCode = generateOtpCode();
    const loginCodeHash = await bcrypt.hash(loginCode, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: upsertError } = await supabase
      .from("employee_accounts")
      .upsert(
        {
          company_id: String(company.id),
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
      companyName: company.name
    });

    if (!emailResult.sent && process.env.NODE_ENV === "production") {
      console.error("OTP email send failed:", emailResult);
      return res.status(502).json({ error: "Kunde inte skicka e-postkod just nu" });
    }

    // In development, we expose fallback code if email integration is not fully configured yet.
    if (!emailResult.sent) {
      console.log(`[Employee OTP Fallback] ${email} (${company.name}): ${loginCode}`);
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
    console.error("Employee request-code error:", err);
    return res.status(500).json({ error: "Serverfel" });
  }
}
