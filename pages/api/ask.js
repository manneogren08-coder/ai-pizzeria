import OpenAI from "openai";
import pizzeriaSantana from "../../data/pizzeriaSantana";
import donDolores from "../../data/donDolores";

// 🔐 Lösenord → företag
const PASSWORD_MAP = {
  santana123: pizzeriaSantana,
  dolores123: donDolores
};

// ⏱️ Enkel in-memory rate limit (per IP)
const rateLimitMap = new Map();
const MAX_REQUESTS = 30;           // 30 frågor
const WINDOW_MS = 60 * 1000;       // per minut

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ answer: "Endast POST-metod tillåten." });
  }

  const { question, password } = req.body;

  // 🔐 Kontrollera lösenord + företag
  const companyData = PASSWORD_MAP[password];

  if (!companyData) {
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

VIKTIGA REGLER:
- Använd ENDAST informationen nedan
- Hitta ALDRIG på något
- Om information saknas: säg vad personalen ska göra enligt rutiner (fråga ansvarig/chef)
- Svara tydligt, kort och praktiskt
- ALDRIG säga "jag vet inte"

=== FÖRETAGETS INFORMATION ===

ÖPPETTIDER:
${companyData.openingHours}

MENY:
${companyData.menu}

ALLERGENER:
${companyData.allergens}

RUTINER:
${companyData.routines}

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
      answer: response.choices[0].message.content
    });
  } catch (error) {
    console.error("OpenAI-fel:", error);
    return res.status(500).json({
      answer: "Ett fel uppstod vid kontakt med AI:n."
    });
  }
}
