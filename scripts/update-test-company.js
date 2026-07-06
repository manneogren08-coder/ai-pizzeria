// Script to update test company email
// Run with: node scripts/update-test-company.js

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function updateCompanyEmail() {
  try {
    console.log('🔄 Updating test company email...\n');

    const { data: company, error } = await supabaseAdmin
      .from('companies')
      .update({ email: 'test@testcompany.com' })
      .eq('name', 'test')
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating company:', error);
      throw error;
    }

    console.log('✅ Company email updated');
    console.log(`   Company ID: ${company.id}`);
    console.log(`   Company Name: ${company.name}`);
    console.log(`   Company Email: ${company.email}`);
    console.log(`   Has Password Hash: ${!!company.password_hash}`);
    console.log(`   Has Admin Password Hash: ${!!company.admin_password_hash}`);

  } catch (error) {
    console.error('\n❌ Failed to update company:', error);
    process.exit(1);
  }
}

updateCompanyEmail();
