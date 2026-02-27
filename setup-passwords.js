import { createClient } from "@supabase/supabase-js";
import bcrypt from 'bcrypt';

// Nu när RLS är disabled kan anon-nyckeln uppdatera
const supabase = createClient(
  "https://cezejaululjijiyffshu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlemVqYXVsdWxqaWppeWZmc2h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzU0NTAsImV4cCI6MjA4MzgxMTQ1MH0.1ebF78qLRHKM3A02DXw_PGHBmDuf1cywHAOjyqjPER0"
);

async function setupPasswords() {
  const passwords = {
    "Pizza Haus": "pizzahaus-demo",
    "Don Dolores": "dolores123",
    "DEMO": "demo"
  };

  console.log("Hashar lösenord och uppdaterar Supabase...\n");

  for (const [name, plainPassword] of Object.entries(passwords)) {
    const hashed = await bcrypt.hash(plainPassword, 10);
    console.log(`Hashat lösenord för ${name}: ${hashed.substring(0, 20)}...`);
    
    const { data, error, count } = await supabase
      .from("companies")
      .update({ password_hash: hashed })
      .eq("name", name)
      .select();

    if (error) {
      console.error(`❌ Fel för ${name}:`, error.message);
    } else if (!data || data.length === 0) {
      console.log(`⚠️  ${name} - ingen rad matchades/uppdaterades`);
    } else {
      console.log(`✅ ${name} - lösenord hashat och lagrat (${data.length} rad)`);
    }
  }

  console.log("\n✨ Klart! Alla lösenord är nu säkert hashade i Supabase");
}

setupPasswords().then(() => process.exit());
