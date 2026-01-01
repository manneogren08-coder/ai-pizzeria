import OpenAI from "openai";
import pizzeria from "../../data/pizzeriaSantana";
import pizzeriaSantana from "../../data/pizzeriaSantana";


// Enkel in-memory rate limit
const rateLimitMap = new Map();

// Inställningar för pizzeria
const MAX_REQUESTS = 30;        // max 30 frågor
const WINDOW_MS = 60 * 1000;    // per minut

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ answer: "Endast POST-metod tillåten." });
  }

  const { question, password } = req.body;

  // 🔐 Lösenordskontroll
  if (password !== process.env.ACCESS_PASSWORD) {
    return res.status(401).json({ answer: "Obehörig åtkomst." });
  }

  // 📍 Identifiera användare via IP
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress;

  const now = Date.now();
  const userData = rateLimitMap.get(ip) || { count: 0, start: now };

  // ⏱️ Reset om tidsfönster passerat
  if (now - userData.start > WINDOW_MS) {
    userData.count = 0;
    userData.start = now;
  }

  userData.count += 1;
  rateLimitMap.set(ip, userData);

  // 🚫 Rate-limit nådd
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
Du är en INTERN PERSONAL-AI för ${pizzeria.name}.

VIKTIGT BETEENDE (MÅSTE FÖLJAS):
- Du får ENDAST använda information som finns i datan nedan.
- Du får INTE lägga till, anta eller förbättra information.
- Du får INTE ge generella råd.
- Du får INTE säga "jag vet inte", "jag är osäker" eller hänvisa till ägare om svaret finns i datan.
- Om frågan matchar en sektion i datan, svara EXAKT enligt den sektionen.
- Svara i punktform om listor finns.
- Om informationen INTE finns i datan, svara exakt:
  "Den informationen finns inte dokumenterad ännu."

=== OFFICIELL PERSONALDOKUMENTATION ===

NAMN:
${pizzeria.name}

BESKRIVNING:
${pizzeria.description}

ÖPPETTIDER:
${pizzeria.openingHours}

ROLLER:
${pizzeria.staffRoles}

MENY:
${pizzeria.menu}

ALLERGENER:
${pizzeria.allergens}

RUTINER:
${pizzeria.routines}

STÄNGNING:
${pizzeria.closingRoutine}

BETEENDERIKTLINJER:
${pizzeria.behaviorGuidelines}

=== SLUT PÅ DOKUMENTATION ===
`
},

  {
    role: "user",
    content: question
  }
],


      max_tokens: 200
    });

    res.status(200).json({
      answer: response.choices[0].message.content
    });
  } catch (error) {
    console.error("OpenAI-fel:", error);
    res.status(500).json({
      answer: "Ett fel uppstod vid kontakt med AI:n."
    });
  }
}
