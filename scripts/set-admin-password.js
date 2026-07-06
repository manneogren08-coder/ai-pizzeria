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
    
    // Sätt ett standard admin-lösenord för alla företag
    const defaultPassword = "Manne2008";
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
        console.log(`✅ Admin-lösenord satt för ${company.name}: ${defaultPassword}`);
      }
    }
    
    console.log("Klart! Alla företag har nu admin-lösenord: admin123");
    
  } catch (error) {
    console.error("Ett oväntat fel uppstod:", error);
  }
}

// Kör funktionen
setAdminPassword();
