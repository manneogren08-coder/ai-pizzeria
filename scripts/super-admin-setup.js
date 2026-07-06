// Super-admin setup - creates a special admin user that can create companies
// This ensures only you (the super-admin) can create new companies

import { createClient } from "@supabase/supabase-js";
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPER_ADMIN_EMAIL = "super.admin@staffguide.internal";
const SUPER_ADMIN_PASSWORD = "SuperAdmin2024!SecureKey";

// Validate environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('❌ Miljövariabler saknas!');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  console.error('');
  console.error('📋 Se till att .env.local filen finns i projektets rot.');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function setupSuperAdmin() {
  try {
    console.log('🔒 Sätter upp super-admin behörigheter...');

    // Check if super-admin already exists
    const { data: existingUser } = await supabase
      .from('restaurant_staff')
      .select('id, email, role')
      .eq('email', SUPER_ADMIN_EMAIL)
      .maybeSingle();

    if (existingUser) {
      console.log('✅ Super-admin finns redan:', existingUser.email);
      return;
    }

    // Find first company to associate super-admin with
    const { data: firstCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!firstCompany) {
      console.log('❌ Inget aktivt företag finns för super-admin');
      return;
    }

    // Create super-admin staff account
    const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

    const { data: staff, error: staffError } = await supabase
      .from('restaurant_staff')
      .insert({
        name: 'Super Admin',
        email: SUPER_ADMIN_EMAIL,
        company_id: firstCompany.id,
        role: 'owner',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (staffError) {
      console.error('❌ Kunde inte skapa super-admin staff:', staffError);
      return;
    }

    // Create employee account for super-admin
    const { error: accountError } = await supabase
      .from('employee_accounts')
      .insert({
        email: SUPER_ADMIN_EMAIL,
        company_id: firstCompany.id,
        verified_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (accountError) {
      console.error('❌ Kunde inte skapa super-admin konto:', accountError);
      return;
    }

    // Update company with super-admin password
    const { error: companyError } = await supabase
      .from('companies')
      .update({
        super_admin_password: hashedPassword,
        super_admin_enabled: true
      })
      .eq('id', firstCompany.id);

    if (companyError) {
      console.error('❌ Kunde inte uppdatera företag:', companyError);
      return;
    }

    console.log('✅ Super-admin setup klart!');
    console.log(`📧 Super-admin e-post: ${SUPER_ADMIN_EMAIL}`);
    console.log(`📧 Super-admin lösenord: ${SUPER_ADMIN_PASSWORD}`);
    console.log(`🏢 Företag: ${firstCompany.name} (ID: ${firstCompany.id})`);
    console.log('');
    console.log('🔒 ANVÄND ENDAST FÖR ADMIN-LOGIN:');
    console.log('   1. Gå till /setup');
    console.log('   2. Logga in med super.admin@staffguide.internal');
    console.log('   3. Skapa nya företag via admin-panelen');
    console.log('');
    console.log('🚀 Endast du som super-admin kan skapa företag!');

  } catch (error) {
    console.error('❌ Super-admin setup fel:', error);
  }
}

// Kör super-admin setup
setupSuperAdmin();
