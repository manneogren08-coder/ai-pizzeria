import { createClient } from "@supabase/supabase-js";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

async function getEmployeeAccount(email, companyId) {
  const { data: account, error } = await supabase
    .from("employee_accounts")
    .select("*")
    .eq("email", email.toLowerCase())
    .eq("company_id", companyId)
    .single();

  if (error) {
    console.error("Employee account lookup error:", error);
    return null;
  }

  return account;
}

async function getCompanyById(companyId) {
  const { data: company, error } = await supabase
    .from("companies")
    .select("id, name, active")
    .eq("id", companyId)
    .eq("active", true)
    .single();

  if (error) {
    console.error("Company lookup error:", error);
    return null;
  }

  return company;
}

function generateToken(company) {
  return jwt.sign(
    { 
      companyId: company.id,
      companyName: company.name,
      type: "employee"
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function generateEmployeeToken(staff) {
  return jwt.sign(
    { 
      companyId: staff.company_id,
      companyName: staff.companies?.name || "Ditt företag",
      email: staff.email,
      type: "employee"
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const code = String(req.body?.code || "").trim();

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Ange en giltig e-post" });
    }

    if (!code) {
      return res.status(400).json({ error: "Ange engångskoden" });
    }

    // Get staff member from restaurant_staff table (no company_id filter - we'll find the first match)
    const staff = await getStaffByEmail(email);
    
    if (!staff) {
      return res.status(401).json({ error: "Din e-post är inte registrerad. Kontakta din chef." });
    }

    // Get company details
    const company = await getCompanyById(staff.company_id);
    if (!company || !company.active) {
      return res.status(401).json({ error: "Företaget är inte aktivt" });
    }

    // Get employee account with OTP
    const employeeAccount = await getEmployeeAccount(email, company.id);
    if (!employeeAccount) {
      return res.status(401).json({ error: "Ingen engångskod hittad. Begär en ny kod." });
    }

    // Check if OTP has expired
    if (new Date() > new Date(employeeAccount.one_time_code_expires_at)) {
      return res.status(401).json({ error: "Engångskoden har löpt ut. Begär en ny kod." });
    }

    // Verify OTP
    const isValidCode = await bcrypt.compare(code, employeeAccount.one_time_code_hash);
    if (!isValidCode) {
      return res.status(401).json({ error: "Felaktig engångskod" });
    }

    // Clear OTP after successful login
    await supabase
      .from("employee_accounts")
      .update({
        one_time_code_hash: null,
        one_time_code_expires_at: null,
        updated_at: new Date().toISOString()
      })
      .eq("email", email)
      .eq("company_id", company.id);

    // Generate JWT token
    const token = generateEmployeeToken(staff);

    return res.status(200).json({
      success: true,
      token,
      company: {
        id: staff.company_id,
        name: staff.companies?.name || "Ditt företag"
      }
    });

  } catch (err) {
    return res.status(500).json({ error: "Serverfel" });
  }
}
