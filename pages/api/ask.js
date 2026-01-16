import OpenAI from "openai";
import { supabase } from "@/lib/supabase";




// ⏱️ Enkel in-memory rate limit (per IP)
const rateLimitMap = new Map();
const MAX_REQUESTS = 30;           // 30 frågor
const WINDOW_MS = 60 * 1000;       // per minut

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ answer: "Endast POST-metod tillåten." });
  }

  const { question, password } = req.body; 
  console.log("PASSWORD FRÅN REQUEST:", `"${password}"`);

  console.log("📩 Inkommande fråga:", question);
console.log("🔑 Inkommande lösenord:", password);

// 🔐 Hämta företag från databasen via lösenord
const { data: companyData, error } = await supabase
  .from("companies")
  .select("*")
  .eq("password", password)
  .single();

console.log("📦 companyData från DB:", companyData);

if (error || !companyData) {
  return res.status(401).json({ answer: "Fel lösenord." });
}


  // 📍 Identifiera användare via IP
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress;

  const now = Date.now();
  const userData = rateLimitMap.get(ip) || { count: 0, start: now };

  // 🔄 Reset om tidsfönster passerat
  if (now - userData.start > WINDOW_MS) {
    userData.count = 0;
    userData.start = now;
  }

  userData.count += 1;
  rateLimitMap.set(ip, userData);

  // 🚫 Rate limit nådd
  if (userData.count > MAX_REQUESTS) {
    return res.status(429).json({
      answer: "För många frågor just nu. Vänta en minut och försök igen."
    });
  }
  

  // 🤖 OpenAI-klient
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
Du är en INTERN AI-assistent för ${companyData.name}.

VIKTIGA REGLER (MÅSTE FÖLJAS):
- Du ska ALLTID svara utifrån informationen nedan.
- Om en fråga gäller rutiner (t.ex. stängning, öppning, kundhantering),
  ska du ALLTID återge rutinerna ord för ord så tydligt som möjligt.
- Du får INTE svara generellt.
- Du får INTE säga "fråga chef", "fråga kollega" eller liknande
  OM informationen finns nedan.
- Endast om informationen HELT saknas får du säga:
  "Detta finns inte dokumenterat. Kontakta ansvarig."

=== FÖRETAGETS INFORMATION ===

ÖPPETTIDER:
${companyData.openingHours}

MENY:
${companyData.menu}

ALLERGENER:
${companyData.allergens}

RUTINER:
${companyData.routines}

STÄNGNINGSRUTINER:
${companyData.closingRoutine}

Beteenderiktlinjer:
${companyData.behaviorGuidelines}

Roller:
${companyData.staffRoles}

Personalsituationer:
${companyData.staffSituations}



=== SLUT ===
`
        },
        {
          role: "user",
          content: question
        }
      ],
      max_tokens: 200
    });

    return res.status(200).json({
  answer: response.choices[0].message.content,
  company: {
    name: companyData.name
  }
});

  } catch (error) {
    console.error("OpenAI-fel:", error);
    return res.status(500).json({
      answer: "Ett fel uppstod vid kontakt med AI:n."
    });
  }
}
