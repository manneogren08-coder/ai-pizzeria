import { createClient } from "@supabase/supabase-js";
import bcrypt from 'bcrypt';

const supabase = createClient(
  "https://cezejaululjijiyffshu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlemVqYXVsdWxqaWppeWZmc2h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzU0NTAsImV4cCI6MjA4MzgxMTQ1MH0.1ebF78qLRHKM3A02DXw_PGHBmDuf1cywHAOjyqjPER0"
);

async function setupAdminPasswords() {
  const adminPasswords = {
    "Pizza Haus": "admin-pizzahaus",
    "Don Dolores": "admin-dolores",
    "DEMO": "admin123"
  };

  console.log("Hashar admin-lösenord och uppdaterar Supabase...\n");

  for (const [name, plainPassword] of Object.entries(adminPasswords)) {
    const hashed = await bcrypt.hash(plainPassword, 10);
    console.log(`Hashat admin-lösenord för ${name}: ${hashed.substring(0, 20)}...`);
    
    const { data, error } = await supabase
      .from("companies")
      .update({ admin_password_hash: hashed })
      .eq("name", name)
      .select();

    if (error) {
      console.error(`❌ Fel för ${name}:`, error.message);
    } else if (!data || data.length === 0) {
      console.log(`⚠️  ${name} - ingen rad matchades/uppdaterades`);
    } else {
      console.log(`✅ ${name} - admin-lösenord hashat och lagrat`);
    }
  }

  console.log("\n✨ Klart! Alla admin-lösenord är nu säkert hashade i Supabase");
  console.log("\n📋 Admin-lösenord:");
  console.log("  Pizza Haus: admin-pizzahaus");
  console.log("  Don Dolores: admin-dolores");
  console.log("  DEMO: admin123");
}

setupAdminPasswords().then(() => process.exit());
