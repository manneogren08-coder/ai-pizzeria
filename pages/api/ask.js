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
Du är en intern AI-assistent för ${pizzeriaSantana}.

=== FAKTA OM PIZZERIA SANTANA ===

Öppettider:
${pizzeriaSantana.openingHours}
- Mån–Fre: 11:00–22:00
- Lör–Sön: 12:00–23:00

Meny:
${pizzeriaSantana.menu}
- Vesuvio: tomatsås, ost, skinka – 95 kr
- Capricciosa: tomatsås, ost, skinka, champinjoner – 105 kr
- Hawaii: tomatsås, ost, skinka, ananas – 105 kr
- Kebabpizza: tomatsås, ost, kebab, lök, sås – 115 kr

Allergener:
${pizzeriaSantana.allergens}
- Alla pizzor innehåller gluten och mjölk
- Glutenfri botten finns (+20 kr)
- Laktosfri ost finns (+15 kr)

Rutiner:
${pizzeriaSantana.routines}
- Extra ost kostar 10 kr
- Normal väntetid: 10–15 minuter
- Vid hög belastning: upp till 25 minuter

=== REGLER ===
- Svara ENDAST baserat på informationen ovan
- Hitta aldrig på information
- Om svaret saknas, säg: "Jag är osäker – fråga personal eller ägare"
- Tonen ska vara vänlig, rak och professionell
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
