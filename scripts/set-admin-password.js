import { createClient } from "@supabase/supabase-js";
import bcrypt from 'bcrypt';
import { config } from 'dotenv';

// Ladda miljövariabler
config({ path: '.env.local' });

// Supabase konfiguration
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setAdminPassword() {
  console.log("Sätter admin-lösenord för nya företag...");

  const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  if (!defaultPassword) {
    console.error("❌ DEFAULT_ADMIN_PASSWORD saknas!");
    console.error('   Sätt den som miljövariabel innan du kör detta skript, t.ex.:');
    console.error('   DEFAULT_ADMIN_PASSWORD="ett-unikt-lösenord-per-korning" node scripts/set-admin-password.js');
    console.error('   OBS: samma lösenord sätts för ALLA berörda företag - byt det manuellt per företag efteråt.');
    return;
  }

  try {
    // Hämta alla företag utan admin-lösenord
    const { data: companies, error } = await supabaseAdmin
      .from("companies")
      .select("id, name, password_hash")
      .is("admin_password_hash", null, true);

    if (error) {
      console.error("Fel vid hämtning av företag:", error);
      return;
    }

    console.log(`Hittade ${companies.length} företag utan admin-lösenord`);

    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    for (const company of companies) {
      const { error: updateError } = await supabaseAdmin
        .from("companies")
        .update({
          admin_password_hash: hashedPassword
        })
        .eq("id", company.id);

      if (updateError) {
        console.error(`Fel vid uppdatering av ${company.name}:`, updateError);
      } else {
        console.log(`✅ Admin-lösenord satt för ${company.name} (kontakta ägaren separat med lösenordet)`);
      }
    }

    console.log("Klart! Byt gärna lösenord per företag efteråt via admin-panelen.");

  } catch (error) {
    console.error("Ett oväntat fel uppstod:", error);
  }
}

// Kör funktionen
setAdminPassword();
