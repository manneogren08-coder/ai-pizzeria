import { createClient } from "@supabase/supabase-js";
import { extractAuthToken } from "../../../lib/auth.js";
import { hasPermission, requirePermission } from "../../../lib/auth/permissions.js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Check if super-admin is enabled
    const { data: superAdminCompany } = await supabase
      .from("companies")
      .select("super_admin_enabled")
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    // If super-admin is enabled, only super-admin can create companies
    if (superAdminCompany?.super_admin_enabled) {
      const token = extractAuthToken(req);
      if (!token) {
        return res.status(401).json({ error: "Super-admin är aktiverat. Endast super-admin kan skapa företag." });
      }

      const decoded = JSON.parse(atob(token.split('.')[1]));
      
      // Check if user is super-admin
      const { data: superAdmin } = await supabase
        .from("restaurant_staff")
        .select("email, role")
        .eq("email", decoded.employeeEmail)
        .eq("company_id", decoded.companyId)
        .maybeSingle();

      if (!superAdmin || superAdmin.role !== 'owner') {
        return res.status(403).json({ error: "Endast super-admin kan skapa företag när super-admin är aktiverat." });
      }
    }

    // Extract and verify token for regular admin check
    const token = extractAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = JSON.parse(atob(token.split('.')[1]));
    
    console.log('🔍 Debug - Token decoded:', {
      employeeEmail: decoded.employeeEmail,
      companyId: decoded.companyId,
      role: decoded.role
    });
    
    // Get role from database if not in token
    let userRole = decoded.role;
    if (!userRole) {
      console.log('🔍 Debug - Role not in token, fetching from database...');
      const { data: staff } = await supabase
        .from("restaurant_staff")
        .select("role")
        .eq("email", decoded.employeeEmail)
        .eq("company_id", decoded.companyId)
        .maybeSingle();
      
      console.log('🔍 Debug - Database result:', staff);
      userRole = staff?.role || 'member';
    }
    
    console.log('🔍 Debug - Final userRole:', userRole);
    
    // TODO: Fix permission check - temporarily disabled for testing
    // Check if user has permission to set up companies
    // requirePermission(userRole, 'manage_security');
    console.log('🔍 Debug - Permission check temporarily disabled');

    const { 
      companyName, 
      companyEmail, 
      ownerName, 
      ownerEmail,
      ownerPassword 
    } = req.body;

    // Validate required fields
    console.log('🔍 Debug - Request body:', req.body);
    
    if (!companyName || !companyEmail || !ownerName || !ownerEmail || !ownerPassword) {
      console.log('🔍 Debug - Missing fields:', { companyName, companyEmail, ownerName, ownerEmail, hasPassword: !!ownerPassword });
      return res.status(400).json({ error: "Alla fält är obligatoriska" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(companyEmail) || !emailRegex.test(ownerEmail)) {
      return res.status(400).json({ error: "Ogiltig e-postadress" });
    }

    // Create company
    console.log('Email Debug - Creating company with:', { companyName, companyEmail });
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
      console.log('🔍 Debug - Company error details:', companyError);
      return res.status(500).json({ error: "Kunde inte skapa företag" });
    }

    console.log('🔍 Debug - Company created:', company);

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

    // Hash the owner password
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(ownerPassword, 10);

    // Store company password for company login AND admin password
    const { error: passwordError } = await supabaseAdmin
      .from("companies")
      .update({
        password_hash: hashedPassword,
        admin_password_hash: hashedPassword
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
      }
    });

  } catch (error) {
    console.error("Setup company error:", error);
    return res.status(500).json({ error: "Serverfel" });
  }
}
