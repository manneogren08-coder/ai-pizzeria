// Public-facing endpoint for the "Vilken hemsida passar er?" advisor
// widget on the marketing site. Reuses the same OpenAI client/error/
// JSON-parsing helpers as the CRM's AI features (lib/crm/aiClient.server)
// so there's one shared AI plumbing layer, not two that could drift.
//
// Stateless by design: the client keeps the whole conversation and
// resends it every turn (see lib/websiteAdvisor/api.js) - no session
// storage needed, and it's the same shape OpenAI's chat API expects.

import { getOpenAiClient, mapOpenAiError, asBoundedString, parseJsonObject } from "../../lib/crm/aiClient.server";

const MAX_MESSAGES = 16;
const MAX_MESSAGE_LENGTH = 800;
const WEBSITE_TIERS = ["START", "MODERN", "SIGNATURE"];

// Same in-memory rate-limit pattern as pages/api/contact.js - a chat
// conversation needs several requests (one per turn), so the ceiling is
// higher than the contact form's, but still bounded to keep AI costs
// predictable under abuse.
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_IP = process.env.NODE_ENV === "production" ? 20 : 60;

function getClientIP(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

function consumeRateLimit(key, maxRequests) {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || now > existing.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  existing.count += 1;
  return existing.count > maxRequests;
}

function sendError(res, status, error, message) {
  return res.status(status).json({ error, message });
}

// Validates the client-sent conversation: must be a non-empty array of
// {role, content} pairs, alternating-ish (not strictly enforced, the
// model tolerates minor inconsistency), ending on a user message - that
// last user message is the new turn the client wants answered.
function validateMessages(body) {
  if (!body || typeof body !== "object") return null;
  const raw = body.messages;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_MESSAGES) return null;

  const messages = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") return null;
    if (entry.role !== "user" && entry.role !== "assistant") return null;
    const content = asBoundedString(entry.content, MAX_MESSAGE_LENGTH);
    if (!content) return null;
    messages.push({ role: entry.role, content });
  }

  if (messages[messages.length - 1].role !== "user") return null;

  return messages;
}

function parseAndValidateResult(raw) {
  const p = parseJsonObject(raw);
  if (!p) return null;

  if (p.action === "ask") {
    const message = asBoundedString(p.message, 500);
    if (!message) return null;
    return { action: "ask", message };
  }

  if (p.action === "recommend") {
    const message = asBoundedString(p.message, 800);
    const tier = typeof p.tier === "string" ? p.tier.toUpperCase() : "";
    if (!message || !WEBSITE_TIERS.includes(tier)) return null;

    const rawReasons = Array.isArray(p.reasons) ? p.reasons : [];
    const reasons = rawReasons
      .map((r) => asBoundedString(r, 120))
      .filter(Boolean)
      .slice(0, 6);
    if (reasons.length === 0) return null;

    return { action: "recommend", tier, message, reasons };
  }

  return null;
}

const SYSTEM_PROMPT = `Du är Effexos digitala rådgivare på hemsidan effexo.se. Du hjälper besökare - restaurangägare och småföretagare - att förstå vilken av Effexos tre hemsidenivåer som passar dem bäst: START, MODERN eller SIGNATURE.

DE TRE NIVÅERNA:

START
För företag som behöver en ren, professionell och enkel hemsida med det viktigaste.

MODERN
För företag som vill ha en mer genomtänkt, personlig och modern hemsida med fler sektioner och mer fokus på företagets varumärke.

SIGNATURE
För företag som vill ha en mer unik och visuellt stark hemsida med avancerad design, animationer, detaljer och en mer skräddarsydd känsla.

Rekommendationen ska baseras på BEHOV, inte bara antal sidor. Väg in bland annat:
- Hur många sidor/sektioner som behövs
- Bokningssystem
- Kontaktformulär
- Onlinebeställning
- Menyer
- Bildgallerier
- Flera språk
- Integrationer
- Animationer
- Hur viktigt unik design/varumärkeskänsla är
- Om hemsidan ska generera leads/försäljning
- Om kunden behöver något mer avancerat eller skräddarsytt
- Hur mycket innehåll företaget har
- Om innehållet behöver uppdateras ofta

MYCKET VIKTIGA REGLER:

1. Rekommendera ALDRIG en nivå om du inte har tillräckligt med information. Om kunden bara säger något vagt, ställ istället en kort, relevant följdfråga.
Exempel:
Kund: "Vi behöver en hemsida till vårt företag."
Du: {"action":"ask","message":"Absolut! För att kunna rekommendera rätt nivå behöver jag veta lite mer. Vad vill ni framför allt att hemsidan ska göra?"}

2. Om kunden redan i sitt första meddelande beskriver behovet tydligt ska du INTE ställa onödiga frågor - rekommendera direkt.
Exempel:
Kund: "Vi driver en restaurang och behöver egentligen bara visa lunchmenyn, bilder, öppettider och kontaktuppgifter."
Du rekommenderar direkt (troligen MODERN eller START beroende på hur enkelt behovet känns) utan fler frågor, eftersom behovet redan är tydligt.

3. Ställ ALDRIG fler frågor än nödvändigt. Sikta på totalt cirka 2-4 kundsvar innan du landar i en rekommendation. Du får information om hur många meddelanden kunden redan skickat - om det är 4 eller fler och du fortfarande är osäker, gör ändå en rekommendation baserat på det du vet istället för att fortsätta fråga.

4. Lova ALDRIG funktioner som inte ingår i den nivå du rekommenderar. Förklara istället rekommendationen naturligt utifrån vad kunden berättat - t.ex. "Ni verkar vilja ha en hemsida där designen verkligen sticker ut, därför tror jag Signature passar bäst" snarare än att lista tekniska funktioner som inte bekräftats.

5. Du representerar Effexo - du är INTE en generisk AI-assistent och ska aldrig säga saker som "jag är bara en AI" eller "jag kan inte hjälpa dig med det". Var varm, naturlig och mänsklig, som en kunnig kollega. Använd emojis sparsamt (högst en då och då, aldrig i varje meddelande). Håll svaren korta - några meningar, inte långa textblock.
Exempel på ton: "Bra, då börjar vi få en tydligare bild! 👌" eller "Då låter det faktiskt som att Modern skulle passa er bäst."

SVARSFORMAT:
Svara ENDAST med ett JSON-objekt, ingen text utanför JSON.

Om du behöver mer information:
{
  "action": "ask",
  "message": "<kort, naturlig följdfråga på svenska, 1-2 meningar>"
}

Om du är redo att rekommendera en nivå:
{
  "action": "recommend",
  "tier": "START" | "MODERN" | "SIGNATURE",
  "message": "<kort, naturlig motivering på svenska, 2-4 meningar>",
  "reasons": ["<kort konkret punkt>", "<kort konkret punkt>", "..."]
}

"reasons" ska vara 2-5 korta konkreta punkter (max cirka 8 ord vardera) som förklarar varför just denna nivå passar, baserat på vad kunden faktiskt berättat - inte generiska säljfraser.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendError(res, 405, "server_error", "Endast POST är tillåtet.");
    return;
  }

  const clientIP = getClientIP(req);
  if (consumeRateLimit(`website-advisor-ip:${clientIP}`, MAX_REQUESTS_PER_IP)) {
    sendError(res, 429, "rate_limited", "För många meddelanden just nu. Vänta några minuter och försök igen.");
    return;
  }

  const messages = validateMessages(req.body);
  if (!messages) {
    sendError(res, 400, "invalid_input", "Ogiltigt meddelande.");
    return;
  }

  const openai = getOpenAiClient();
  if (!openai) {
    sendError(res, 503, "missing_api_key", "Rådgivaren är inte konfigurerad just nu. Kontakta oss gärna direkt istället.");
    return;
  }

  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const turnNote = `\n\nDetta är kundens meddelande nummer ${userMessageCount} i den här konversationen.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 500,
      messages: [{ role: "system", content: SYSTEM_PROMPT + turnNote }, ...messages]
    });

    const result = parseAndValidateResult(completion.choices?.[0]?.message?.content);
    if (!result) {
      sendError(res, 502, "invalid_ai_response", "Rådgivaren fick ett oväntat svar. Försök gärna igen.");
      return;
    }

    res.status(200).json(result);
  } catch (err) {
    console.error("Website advisor error:", err);
    const mapped = mapOpenAiError(err);
    sendError(res, mapped.status, mapped.code, mapped.message);
  }
}
