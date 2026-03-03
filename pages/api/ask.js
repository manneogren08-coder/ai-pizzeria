import OpenAI from "openai";
import { supabase } from "@/lib/supabase";
import jwt from 'jsonwebtoken';

const OPENING_ROUTINE_SECTION_REGEX = /\[OPENING_ROUTINE\]([\s\S]*?)\[\/OPENING_ROUTINE\]/i;

function extractEmbeddedOpeningRoutine(routinesText) {
  if (typeof routinesText !== "string") {
    return { cleanedRoutines: "", openingRoutine: "" };
  }

  const match = routinesText.match(OPENING_ROUTINE_SECTION_REGEX);
  const openingRoutine = match?.[1]?.trim() || "";
  const cleanedRoutines = routinesText.replace(OPENING_ROUTINE_SECTION_REGEX, "").trim();

  return { cleanedRoutines, openingRoutine };
}

// ⏱️ Enkel in-memory rate limit (per IP)
const rateLimitMap = new Map();
const MAX_REQUESTS = 30;           // 30 frågor
const WINDOW_MS = 60 * 1000;       // per minut

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ answer: "Endast POST-metod tillåten." });
  }

  const { question } = req.body; // TA BORT: password
  
  try {
    // 🔐 Verifiera token istället för lösenord
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ answer: "Ingen token skickad." })
    }
    
    const { companyId } = jwt.verify(token, process.env.JWT_SECRET)
    
    // Hämta företag från databasen via companyId istället
    const { data: companyData, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single();

    console.log("companyData from supabase:", companyData, "error:", error);
    if (error || !companyData) {
      return res.status(401).json({ answer: "Ogiltig token." });
    }

    const { cleanedRoutines, openingRoutine } = extractEmbeddedOpeningRoutine(companyData.routines || "");
    const normalizedCompanyData = {
      ...companyData,
      routines: cleanedRoutines,
      opening_routine: companyData.opening_routine || openingRoutine
    };

    // 📍 Rate limiting (samma som innan)
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
    const now = Date.now();
    const userData = rateLimitMap.get(ip) || { count: 0, start: now };

    if (now - userData.start > WINDOW_MS) {
      userData.count = 0;
      userData.start = now;
    }

    userData.count += 1;
    rateLimitMap.set(ip, userData);

    if (userData.count > MAX_REQUESTS) {
      return res.status(429).json({
        answer: "För många frågor just nu. Vänta en minut och försök igen."
      });
    }

    // 🤖 OpenAI-klient (samma som innan)
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const editableFields = [
      "support_email",
      "opening_hours",
      "closure_info",
      "menu",
      "allergens",
      "routines",
      "opening_routine",
      "closing_routine",
      "behavior_guidelines",
      "staff_roles",
      "staff_situations"
    ];

    const swedishLabels = {
      support_email: "Support-email",
      opening_hours: "Öppettider",
      closure_info: "Stängningsinfo",
      menu: "Meny",
      allergens: "Allergener",
      routines: "Rutiner",
      opening_routine: "Öppningsrutin",
      closing_routine: "Stängningsrutin",
      behavior_guidelines: "Beteenderiktlinjer",
      staff_roles: "Personalroller",
      staff_situations: "Personalsituationer"
    };

    const companyInfoText = editableFields
      .map((field) => ({ field, value: normalizedCompanyData[field] }))
      .filter(({ value }) => typeof value === "string" && value.trim())
      .map(({ field, value }) => `${swedishLabels[field]}:\n${value.trim()}`)
      .join("\n\n");

    const systemPrompt = `Du är en INTERN AI-assistent för ${companyData.name}.

Följande information gäller för företaget och ska användas i svaren:
${companyInfoText}

Besvara alla frågor som om du sitter på plats i restaurangen. Var kortfattad, ge precisa instruktioner och använd talspråk.
Om information saknas i underlaget ovan, säg tydligt att uppgiften saknas istället för att gissa.
`;

    console.log("systemPrompt used for OpenAI call:\n", systemPrompt);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      max_tokens: 700
    });

    // 📊 Increment query count (non-blocking, utan await)
    supabase
      .from("companies")
      .update({ query_count: (companyData.query_count || 0) + 1 })
      .eq("id", companyId)
      .then(() => console.log("Query count updated"))
      .catch(err => console.error("Failed to update query count:", err.message));

    return res.status(200).json({
      answer: response.choices[0].message.content,
      company: { name: companyData.name }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ answer: "Ogiltig token." });
    }
    console.error("Fel:", error);
    return res.status(500).json({ answer: "Ett fel uppstod." });
  }
}