// Script to create a test company directly via Supabase admin
// Run with: node scripts/create-test-company.js

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function createTestCompany() {
  try {
    console.log('🚀 Creating test company...\n');

    const companyData = {
      name: 'test',
      email: 'test@testcompany.com',
      ownerName: 'Test Owner',
      ownerEmail: 'owner@testcompany.com',
      ownerPassword: 'test123456'
    };

    // 1. Create company
    console.log('📝 Creating company record...');
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name: companyData.name,
        email: companyData.email,
        active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (companyError) {
      console.error('❌ Error creating company:', companyError);
      throw companyError;
    }

    console.log(`✅ Company created with ID: ${company.id}`);

    // 2. Hash the password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(companyData.ownerPassword, 10);
    console.log('✅ Password hashed');

    // 3. Update company with hashed password
    console.log('💾 Saving password to company...');
    const { error: passwordError } = await supabaseAdmin
      .from('companies')
      .update({
        password_hash: hashedPassword,
        admin_password_hash: hashedPassword
      })
      .eq('id', company.id);

    if (passwordError) {
      console.error('❌ Error saving password:', passwordError);
      throw passwordError;
    }

    console.log('✅ Password saved');

    // 4. Create owner account in employee_accounts
    console.log('👤 Creating owner account...');
    const { error: employeeAccountError } = await supabaseAdmin
      .from('employee_accounts')
      .insert({
        email: companyData.ownerEmail,
        company_id: company.id,
        verified_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      });

    if (employeeAccountError) {
      console.error('❌ Error creating employee account:', employeeAccountError);
      throw employeeAccountError;
    }

    console.log('✅ Employee account created');

    // 5. Create owner in restaurant_staff
    console.log('👨‍💼 Creating owner staff record...');
    const { data: staff, error: staffError } = await supabaseAdmin
      .from('restaurant_staff')
      .insert({
        name: companyData.ownerName,
        email: companyData.ownerEmail,
        company_id: company.id,
        role: 'owner',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (staffError) {
      console.error('❌ Error creating staff record:', staffError);
      throw staffError;
    }

    console.log('✅ Staff record created');

    console.log('\n✅ Test company created successfully!\n');
    console.log('📋 Company Details:');
    console.log(`   Company ID: ${company.id}`);
    console.log(`   Company Name: ${company.name}`);
    console.log(`   Company Email: ${company.email}`);
    console.log(`   Owner Name: ${staff.name}`);
    console.log(`   Owner Email: ${staff.email}`);
    console.log(`   Owner Role: ${staff.role}`);
    console.log(`   Password: ${companyData.ownerPassword}`);
    console.log('\n🎯 You can now login with:');
    console.log(`   Company ID: ${company.id}`);
    console.log(`   Password: ${companyData.ownerPassword}`);

  } catch (error) {
    console.error('\n❌ Failed to create test company:', error);
    process.exit(1);
  }
}

createTestCompany();
