import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getSupabaseAdminClient } from "../../../lib/supabase.js";
import { extractAuthToken } from "../../../lib/auth.js";
import { requirePermission } from "../../../lib/auth/permissions.js";

function generateAdminPassword() {
  return crypto.randomBytes(9).toString("base64url");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Servern saknar SUPABASE_SERVICE_ROLE_KEY" });
    }

    const token = extractAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if super-admin mode is enabled
    const { data: superAdminCompany } = await supabaseAdmin
      .from("companies")
      .select("id, super_admin_enabled")
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    // Resolve the acting user's real role. Company-login tokens carry a
    // companyId but no employeeEmail and are always the owner. Employee
    // tokens carry both companyId and employeeEmail - their role must be
    // looked up from restaurant_staff, never assumed from the token.
    let userRole = decoded.role;
    if (!userRole) {
      if (decoded.companyId && !decoded.employeeEmail) {
        userRole = 'owner';
      } else {
        const { data: staff } = await supabaseAdmin
          .from("restaurant_staff")
          .select("role")
          .eq("email", decoded.employeeEmail)
          .eq("company_id", decoded.companyId)
          .maybeSingle();

        userRole = staff?.role || 'member';
      }
    }

    // If super-admin mode is enabled, only the super-admin (owner of the
    // first-created company) may create new companies.
    if (superAdminCompany?.super_admin_enabled) {
      if (userRole !== 'owner' || String(decoded.companyId) !== String(superAdminCompany.id)) {
        return res.status(403).json({ error: "Endast super-admin kan skapa företag när super-admin är aktiverat." });
      }
    }

    // Check if user has permission to set up companies
    try {
      requirePermission(userRole, 'manage_security');
    } catch (permError) {
      return res.status(403).json({ error: permError.message });
    }

    const {
      companyName,
      companyEmail,
      ownerName,
      ownerEmail,
      ownerPassword
    } = req.body;

    if (!companyName || !companyEmail || !ownerName || !ownerEmail || !ownerPassword) {
      return res.status(400).json({ error: "Alla fält är obligatoriska" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(companyEmail) || !emailRegex.test(ownerEmail)) {
      return res.status(400).json({ error: "Ogiltig e-postadress" });
    }

    // Create company
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({
        name: companyName,
        email: companyEmail,
        active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (companyError) {
      console.error("Company creation error:", companyError);
      return res.status(500).json({ error: "Kunde inte skapa företag" });
    }

    // Create owner account in employee_accounts
    const { error: employeeAccountError } = await supabaseAdmin
      .from("employee_accounts")
      .insert({
        email: ownerEmail,
        company_id: company.id,
        verified_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (employeeAccountError) {
      console.error("Employee account creation error:", employeeAccountError);
      return res.status(500).json({ error: "Kunde inte skapa konto" });
    }

    // Create owner in restaurant_staff with owner role
    const { data: staff, error: staffError } = await supabaseAdmin
      .from("restaurant_staff")
      .insert({
        name: ownerName,
        email: ownerEmail,
        company_id: company.id,
        role: 'owner',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (staffError) {
      console.error("Staff creation error:", staffError);
      return res.status(500).json({ error: "Kunde inte skapa personal" });
    }

    // The login password and the admin-panel password are kept separate:
    // a leaked login password no longer also grants admin-panel access.
    const adminPassword = generateAdminPassword();
    const [hashedPassword, hashedAdminPassword] = await Promise.all([
      bcrypt.hash(ownerPassword, 10),
      bcrypt.hash(adminPassword, 10)
    ]);

    const { error: passwordError } = await supabaseAdmin
      .from("companies")
      .update({
        password_hash: hashedPassword,
        admin_password_hash: hashedAdminPassword
      })
      .eq("id", company.id);

    if (passwordError) {
      console.error("Password setting error:", passwordError);
      return res.status(500).json({ error: "Kunde inte spara lösenord" });
    }

    return res.status(201).json({
      success: true,
      message: "Företag och owner-konto skapade",
      company: {
        id: company.id,
        name: companyName,
        email: companyEmail,
        active: true
      },
      owner: {
        id: staff.id,
        name: ownerName,
        email: ownerEmail,
        role: 'owner'
      },
      adminPassword
    });

  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Ogiltig eller utgången session. Logga in igen." });
    }

    console.error("Setup company error:", error);
    return res.status(500).json({ error: "Serverfel" });
  }
}
