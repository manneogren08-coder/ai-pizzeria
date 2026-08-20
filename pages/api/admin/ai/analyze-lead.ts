import type { NextApiRequest, NextApiResponse } from "next";
import {
  LeadAnalysisInput,
  LeadAnalysisResult,
  LeadAnalysisErrorResponse,
  ServiceType,
  LeadStatus,
  SERVICE_TYPES,
  LEAD_STATUSES
} from "../../../../lib/crm/types";
import { getOpenAiClient, mapOpenAiError, asBoundedString, clampLeadScore, parseJsonObject } from "../../../../lib/crm/aiClient.server";

// Part of the localhost-only CRM (see pages/admin) - same real,
// server-enforced production block as the CRM page itself and the
// pages/api/dev/* tools, so this can never run if the project is ever
// deployed.
const isProduction = process.env.NODE_ENV === "production";

const MAX_TEXT_LENGTH = 600;
const MAX_NOTES_LENGTH = 2000;

function sendError(res: NextApiResponse<LeadAnalysisErrorResponse>, status: number, error: LeadAnalysisErrorResponse["error"], message: string) {
  return res.status(status).json({ error, message });
}

function validateInput(body: unknown): LeadAnalysisInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  const name = asBoundedString(b.name, 200);
  if (!name) return null;

  if (typeof b.service !== "string" || !SERVICE_TYPES.includes(b.service as ServiceType)) return null;
  if (typeof b.status !== "string" || !LEAD_STATUSES.includes(b.status as LeadStatus)) return null;

  return {
    name,
    contactPerson: asBoundedString(b.contactPerson, MAX_TEXT_LENGTH),
    city: asBoundedString(b.city, MAX_TEXT_LENGTH),
    website: asBoundedString(b.website, MAX_TEXT_LENGTH),
    socialMedia: asBoundedString(b.socialMedia, MAX_TEXT_LENGTH),
    service: b.service as ServiceType,
    status: b.status as LeadStatus,
    notes: asBoundedString(b.notes, MAX_NOTES_LENGTH)
  };
}

function parseAndValidateResult(raw: string | null | undefined): LeadAnalysisResult | null {
  const p = parseJsonObject(raw);
  if (!p) return null;

  const leadScore = clampLeadScore(p.leadScore);
  const research = asBoundedString(p.research, 1500);
  const pitch = asBoundedString(p.pitch, 800);
  if (leadScore === null || !research || !pitch) return null;

  return {
    leadScore,
    research,
    pitch,
    emailSubject: asBoundedString(p.emailSubject, 200),
    emailBody: asBoundedString(p.emailBody, 2000),
    notes: asBoundedString(p.notes, 1000)
  };
}

function buildUserPrompt(input: LeadAnalysisInput): string {
  const field = (label: string, value: string) => `${label}: ${value || "(ej angivet i CRM:et)"}`;

  return [
    "Bedöm följande lead baserat ENDAST på informationen nedan, hämtad från Effexos interna CRM:",
    field("Företagsnamn", input.name),
    field("Kontaktperson", input.contactPerson),
    field("Stad", input.city),
    field("Hemsida", input.website),
    field("Instagram/Facebook", input.socialMedia),
    `Tjänst av intresse: ${input.service}`,
    `Nuvarande status i CRM: ${input.status}`,
    field("Anteckningar", input.notes)
  ].join("\n");
}

const SYSTEM_PROMPT = `Du är en intern säljassistent för Effexo, ett svenskt företag som bygger hemsidor och StaffGuide (ett AI-kunskapsverktyg för restaurangpersonal) åt restauranger och små/medelstora företag.

Du hjälper Effexos ägare att bedöma leads som redan finns i det interna CRM:et och förbereda kontakt med dem.

MYCKET VIKTIGA REGLER:
- Du har INGEN tillgång till internet. Du kan inte besöka hemsidor, sociala medier eller söka upp företaget. Du får ENDAST den information som anges i användarmeddelandet.
- Anta ALDRIG fakta som inte finns i den angivna informationen (t.ex. antal anställda, omsättning, öppettider, adress, hur hemsidan ser ut). Om ett fält saknas eller är tomt, säg det tydligt ("ingen hemsida har angetts i CRM-datan") istället för att gissa eller anta att företaget saknar det i verkligheten.
- Var kortfattad, konkret och saklig. Undvik säljjargong och överdrifter.

Sätt ett leadScore 0-100 som uppskattar hur relevant/redo leaden verkar vara för Effexos tjänster, baserat enbart på den angivna informationen - exempelvis om hemsida/social media är angiven eller saknas, om vald tjänst matchar vad Effexo erbjuder, vilken status och vilka anteckningar som finns. Om informationen är mycket knapphändig ska scoret vara lågt/medel och du ska säga att bedömningen är osäker på grund av begränsad information - gissa dig aldrig till ett högt score.

Svara ENDAST med ett JSON-objekt, ingen text utanför JSON, med exakt dessa nycklar:
{
  "leadScore": <heltal 0-100>,
  "research": "<kort saklig sammanfattning på svenska, 2-4 meningar, baserad enbart på given data>",
  "pitch": "<kort personlig pitch på svenska anpassad efter företagets faktiska situation, 1-3 meningar>",
  "emailSubject": "<kort ämnesrad på svenska>",
  "emailBody": "<kort, personligt och professionellt mejlutkast på svenska, inte aggressivt, inte som ett massutskick, avslutat med 'Mvh,\\nManne\\nEffexo'>",
  "notes": "<korta interna säljanteckningar/observationer på svenska, kan vara tom sträng>"
}`;

export default async function handler(req: NextApiRequest, res: NextApiResponse<LeadAnalysisResult | LeadAnalysisErrorResponse>) {
  if (isProduction) {
    res.status(404).json({ error: "server_error", message: "Not found" });
    return;
  }

  if (req.method !== "POST") {
    sendError(res, 405, "server_error", "Endast POST är tillåtet.");
    return;
  }

  const input = validateInput(req.body);
  if (!input) {
    sendError(res, 400, "invalid_input", "Ogiltig eller ofullständig företagsdata. Företagsnamn krävs.");
    return;
  }

  const openai = getOpenAiClient();
  if (!openai) {
    sendError(
      res,
      503,
      "missing_api_key",
      "AI-funktionen behöver konfigureras: lägg till OPENAI_API_KEY i .env.local och starta om servern."
    );
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 700,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(input) }
      ]
    });

    const result = parseAndValidateResult(completion.choices?.[0]?.message?.content);
    if (!result) {
      sendError(res, 502, "invalid_ai_response", "AI-svaret hade oväntat format. Försök igen.");
      return;
    }

    res.status(200).json(result);
  } catch (err) {
    console.error("AI lead analysis error:", err);
    const mapped = mapOpenAiError(err);
    sendError(res, mapped.status, mapped.code, mapped.message);
  }
}
