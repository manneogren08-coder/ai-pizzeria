import OpenAI from "openai";
import { supabase } from "@/lib/supabase";
import jwt from "jsonwebtoken";

const OPENING_ROUTINE_SECTION_REGEX = /\[OPENING_ROUTINE\]([\s\S]*?)\[\/OPENING_ROUTINE\]/i;
const RECIPES_SECTION_REGEX = /\[RECIPES\]([\s\S]*?)\[\/RECIPES\]/i;
const ANSWER_CACHE_TTL_MS = 2 * 60 * 1000;
const MAX_FIELD_LENGTH = 2200;
const MAX_CONTEXT_LENGTH = 12000;
const MAX_QUESTION_LENGTH = 600;
const EDITABLE_FIELDS = [
  "support_email",
  "opening_hours",
  "closure_info",
  "menu",
  "recipes",
  "allergens",
  "routines",
  "opening_routine",
  "closing_routine",
  "behavior_guidelines",
  "staff_roles",
  "staff_situations"
];
const SWEDISH_LABELS = {
  support_email: "Support-email",
  opening_hours: "Öppettider",
  closure_info: "Stängningsinfo",
  menu: "Meny",
  recipes: "Recept",
  allergens: "Allergener",
  routines: "Rutiner",
  opening_routine: "Öppningsrutin",
  closing_routine: "Stängningsrutin",
  behavior_guidelines: "Beteenderiktlinjer",
  staff_roles: "Personalroller",
  staff_situations: "Personalsituationer"
};

const rateLimitMap = new Map();
const answerCacheMap = new Map();
const MAX_REQUESTS = 30;
const WINDOW_MS = 60 * 1000;

function extractEmbeddedOpeningRoutine(routinesText) {
  if (typeof routinesText !== "string") {
    return { cleanedRoutines: "", openingRoutine: "" };
  }

  const match = routinesText.match(OPENING_ROUTINE_SECTION_REGEX);
  const openingRoutine = match?.[1]?.trim() || "";
  const cleanedRoutines = routinesText.replace(OPENING_ROUTINE_SECTION_REGEX, "").trim();

  return { cleanedRoutines, openingRoutine };
}

function extractEmbeddedRecipes(menuText) {
  if (typeof menuText !== "string") {
    return { cleanedMenu: "", recipes: "" };
  }

  const match = menuText.match(RECIPES_SECTION_REGEX);
  const recipes = match?.[1]?.trim() || "";
  const cleanedMenu = menuText.replace(RECIPES_SECTION_REGEX, "").trim();

  return { cleanedMenu, recipes };
}

function limitText(value, maxLength) {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}\n...[trunkerad för längd]`;
}

function simpleHash(input) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

function isRateLimited(req) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
  const now = Date.now();
  const userData = rateLimitMap.get(ip) || { count: 0, start: now };

  if (now - userData.start > WINDOW_MS) {
    userData.count = 0;
    userData.start = now;
  }

  userData.count += 1;
  rateLimitMap.set(ip, userData);

  return userData.count > MAX_REQUESTS;
}

function buildQuickActionAnswer(quickActionKey, companyData) {
  if (!quickActionKey) return "";

  const supportEmail = companyData.support_email ? `\n\nSupport: ${companyData.support_email}` : "";

  if (quickActionKey === "menu") {
    return companyData.menu?.trim()
      ? `Här är hela menyn:\n\n${companyData.menu.trim()}${supportEmail}`
      : "Meny saknas just nu i adminpanelen.";
  }

  if (quickActionKey === "allergens") {
    return companyData.allergens?.trim()
      ? `Här är registrerade allergener:\n\n${companyData.allergens.trim()}`
      : "Allergeninformation saknas just nu i adminpanelen.";
  }

  if (quickActionKey === "opening_hours") {
    return companyData.opening_hours?.trim()
      ? `Öppettider:\n\n${companyData.opening_hours.trim()}${supportEmail}`
      : "Öppettider saknas just nu i adminpanelen.";
  }

  if (quickActionKey === "opening_routine") {
    return companyData.opening_routine?.trim()
      ? `Öppningsrutin:\n\n${companyData.opening_routine.trim()}`
      : "Öppningsrutin saknas just nu i adminpanelen.";
  }

  return "";
}

function extractMenuItems(menuText) {
  if (typeof menuText !== "string") return [];

  const items = menuText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*•]\s*/, ""))
    .map((line) => line.split(/[:–-]/)[0]?.trim() || "")
    .filter((name) => name.length >= 2)
    .filter((name) => !/^(pizza|pizzor|extra|dryck|dricka|förrätt|varmrätt|dessert|meny)$/i.test(name));

  return [...new Set(items)].slice(0, 30);
}

async function incrementQueryCount(companyId, currentCount) {
  try {
    await supabase
      .from("companies")
      .update({ query_count: (currentCount || 0) + 1 })
      .eq("id", companyId);
  } catch {
    // non-blocking statistikuppdatering
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ answer: "Endast POST-metod tillåten." });
  }

  const { question, quickActionKey } = req.body;

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ answer: "Ingen token skickad." });
    }

    const { companyId } = jwt.verify(token, process.env.JWT_SECRET);

    const { data: companyData, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single();

    if (error) {
      console.error("Company fetch error:", error.message);
      return res.status(500).json({ answer: "Kunde inte läsa företagsdata just nu. Försök igen." });
    }

    if (!companyData) {
      return res.status(404).json({ answer: "Företaget hittades inte." });
    }

    if (isRateLimited(req)) {
      return res.status(429).json({
        answer: "För många frågor just nu. Vänta en minut och försök igen."
      });
    }

    const normalizedQuestion = limitText(typeof question === "string" ? question : "", MAX_QUESTION_LENGTH);
    if (!normalizedQuestion) {
      return res.status(400).json({ answer: "Frågan saknas." });
    }

    const { cleanedRoutines, openingRoutine } = extractEmbeddedOpeningRoutine(companyData.routines || "");
    const { cleanedMenu, recipes } = extractEmbeddedRecipes(companyData.menu || "");
    const normalizedCompanyData = {
      ...companyData,
      menu: cleanedMenu,
      recipes: companyData.recipes || recipes,
      routines: cleanedRoutines,
      opening_routine: companyData.opening_routine || openingRoutine
    };

    const quickActionAnswer = buildQuickActionAnswer(quickActionKey, normalizedCompanyData);
    if (quickActionAnswer) {
      void incrementQueryCount(companyId, companyData.query_count);

      const menuItems = quickActionKey === "menu"
        ? extractMenuItems(normalizedCompanyData.menu)
        : [];

      return res.status(200).json({
        answer: quickActionAnswer,
        company: { name: companyData.name },
        direct: true,
        menuItems
      });
    }

    const contextVersion =
      companyData.updated_at ||
      companyData.updatedAt ||
      simpleHash(
        EDITABLE_FIELDS
          .map((field) => String(normalizedCompanyData[field] || ""))
          .join("|")
      );

    const cacheKey = `${companyId}::${contextVersion}::${normalizedQuestion.toLowerCase()}`;
    const now = Date.now();
    const cached = answerCacheMap.get(cacheKey);

    if (cached && now - cached.createdAt < ANSWER_CACHE_TTL_MS) {
      void incrementQueryCount(companyId, companyData.query_count);

      return res.status(200).json({
        answer: cached.answer,
        company: { name: companyData.name },
        cached: true
      });
    }

    const companyInfoText = EDITABLE_FIELDS
      .map((field) => ({ field, value: normalizedCompanyData[field] }))
      .filter(({ value }) => typeof value === "string" && value.trim())
      .map(({ field, value }) => `${SWEDISH_LABELS[field]}:\n${limitText(value, MAX_FIELD_LENGTH)}`)
      .join("\n\n");

    const boundedCompanyInfoText = limitText(companyInfoText, MAX_CONTEXT_LENGTH);

    const systemPrompt = `Du är en INTERN AI-assistent för ${companyData.name}.\n\nFöljande information gäller för företaget och ska användas i svaren:\n${boundedCompanyInfoText}\n\nBesvara alla frågor som om du sitter på plats i restaurangen. Var kortfattad, ge precisa instruktioner och använd talspråk.\nOm information saknas i underlaget ovan, säg tydligt att uppgiften saknas istället för att gissa.\n`;

    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (!openAiApiKey) {
      return res.status(500).json({ answer: "Servern saknar OPENAI_API_KEY i .env.local." });
    }

    const openai = new OpenAI({
      apiKey: openAiApiKey
    });

    let response;
    try {
      response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: normalizedQuestion }
        ],
        max_tokens: 350
      });
    } catch (openAiError) {
      const errorCode = openAiError?.code || "";
      const errorMessage = openAiError?.message || "";
      console.error("OpenAI error:", errorCode, errorMessage);

      if (errorCode === "context_length_exceeded" || /context length|maximum context/i.test(errorMessage)) {
        return res.status(400).json({
          answer: "För mycket text i underlaget efter senaste admin-ändring. Korta ner några fält (t.ex. meny/rutiner) och försök igen."
        });
      }

      return res.status(502).json({ answer: "AI-tjänsten svarade inte som väntat. Försök igen om en stund." });
    }

    const answerText = response.choices?.[0]?.message?.content || "Jag kunde inte generera ett svar just nu.";
    answerCacheMap.set(cacheKey, {
      answer: answerText,
      createdAt: now
    });

    void incrementQueryCount(companyId, companyData.query_count);

    return res.status(200).json({
      answer: answerText,
      company: { name: companyData.name }
    });
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ answer: "Ogiltig token." });
    }

    console.error("Fel:", error?.message || error);
    return res.status(500).json({ answer: "Serverfel vid AI-frågan. Försök igen." });
  }
}
