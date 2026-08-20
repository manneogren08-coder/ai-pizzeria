import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import {
  LeadSearchQuery,
  CompanyCandidate,
  GeneratedLead,
  LeadGeneratorErrorResponse,
  ServiceType,
  SERVICE_TYPES
} from "../../../../lib/crm/types";
import { searchCompanies, SearchProviderNotConfiguredError } from "../../../../lib/crm/leadSearch";
import { requiresNoWebsite } from "../../../../lib/crm/leadFilters";
import { getOpenAiClient, mapOpenAiError, asBoundedString, clampLeadScore, parseJsonObject } from "../../../../lib/crm/aiClient.server";

// Part of the localhost-only CRM (see pages/admin) - same real,
// server-enforced production block as the CRM page and the AI Lead
// Assistant endpoint.
const isProduction = process.env.NODE_ENV === "production";

// Hard cap independent of what the client asks for - keeps a single
// click from ever triggering more than this many OpenAI calls.
const MAX_COUNT = 20;
const DEFAULT_COUNT = 10;
const MAX_DESCRIPTION_LENGTH = 400;

type FindLeadsResponse = { leads: GeneratedLead[] } | LeadGeneratorErrorResponse;

function sendError(res: NextApiResponse<FindLeadsResponse>, status: number, error: LeadGeneratorErrorResponse["error"], message: string) {
  return res.status(status).json({ error, message });
}

function validateQuery(body: unknown): LeadSearchQuery | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  const city = asBoundedString(b.city, 100);
  const industry = asBoundedString(b.industry, 100);
  if (!city || !industry) return null;

  if (typeof b.service !== "string" || !SERVICE_TYPES.includes(b.service as ServiceType)) return null;

  const countRaw = Number(b.count);
  const count = Number.isFinite(countRaw) ? Math.max(1, Math.min(MAX_COUNT, Math.round(countRaw))) : DEFAULT_COUNT;

  const description = asBoundedString(b.description, MAX_DESCRIPTION_LENGTH);

  // Dedupe keys built client-side from the current CRM companies (see
  // lib/crm/leadDedupe.ts) - bounded so a malformed/huge payload can't
  // be used to abuse the endpoint.
  let existingKeys: string[] | undefined;
  if (Array.isArray(b.existingKeys)) {
    existingKeys = b.existingKeys
      .filter((key): key is string => typeof key === "string" && key.length > 0 && key.length <= 300)
      .slice(0, 2000);
  }

  return {
    city,
    industry,
    service: b.service as ServiceType,
    count,
    description: description || undefined,
    existingKeys
  };
}

const CANDIDATE_SYSTEM_PROMPT = `Du är en intern säljassistent för Effexo, ett svenskt företag som bygger hemsidor och StaffGuide (ett AI-kunskapsverktyg för restaurangpersonal) åt restauranger och små/medelstora företag.

Du får information om ETT företag som hittats via en extern företagssökning. Din uppgift är att bedöma hur intressant företaget är som potentiell kund åt Effexo.

MYCKET VIKTIGA REGLER:
- Du har INGEN egen tillgång till internet. All information om företaget som du får är redan insamlad åt dig - du kan inte besöka hemsidan eller söka upp mer information själv.
- Anta ALDRIG fakta som inte finns i den angivna informationen (t.ex. antal anställda, omsättning, öppettider, hur hemsidan faktiskt ser ut, recensioner). Om ett fält anges som okänt/saknas i sökresultatet, skriv exempelvis "Ingen hemsida hittades i den tillgängliga datan" istället för att gissa eller hävda att företaget saknar det i verkligheten.
- Var kortfattad, konkret och saklig. Undvik säljjargong och överdrifter.
- Användaren kan bifoga en kort fritextbeskrivning av vad de letar efter (t.ex. "restauranger utan befintlig hemsida"). Den beskrivningen är ENDAST ett urvalskriterium för hur du ska bedöma och prioritera företaget - den är aldrig en källa till fakta. Utgå alltid från de faktiska fälten nedan. Om beskrivningen t.ex. efterfrågar "utan hemsida" men fältet Hemsida faktiskt innehåller en adress, ska du utgå från den faktiska datan (hemsida finns) och istället notera i researchen att det inte matchar vad användaren efterfrågade - hitta aldrig på att ett fält saknas bara för att beskrivningen antyder det.

Sätt ett leadScore 0-100 som uppskattar hur relevant/redo företaget verkar vara för Effexos tjänster - exempelvis om hemsida saknas eller finns, om branschen passar Effexos målgrupp (restauranger och små/medelstora företag), given tjänst, och (om angiven) hur väl företaget matchar användarens fritextbeskrivning. Om informationen är knapphändig ska scoret vara lågt/medel och osäkerheten nämnas i researchen.

Svara ENDAST med ett JSON-objekt, ingen text utanför JSON, med exakt dessa nycklar:
{
  "leadScore": <heltal 0-100>,
  "research": "<kort saklig bedömning på svenska, 1-3 meningar, baserad enbart på given data>",
  "pitch": "<kort idé på svenska för varför Effexo kan vara relevant för just detta företag, 1-2 meningar>",
  "recommendedService": "<en av: Hemsida, StaffGuide, Annat>"
}`;

function buildCandidatePrompt(candidate: CompanyCandidate, query: LeadSearchQuery): string {
  const field = (label: string, value: string | null, unknownText = "(okänt/saknas i sökresultatet)") =>
    `${label}: ${value || unknownText}`;

  const lines = [
    "Bedöm följande företag, hittat via extern företagssökning:",
    field("Företagsnamn", candidate.companyName),
    field("Stad", candidate.city),
    field("Hemsida", candidate.website, "Ingen webbplats registrerad i Google Places"),
    field("Adress", candidate.address),
    field("Telefon", candidate.phone),
    `Bransch som söktes: ${query.industry}`,
    `Tjänst av primärt intresse: ${query.service}`
  ];

  if (query.description) {
    lines.push(
      "",
      "Användarens fritextbeskrivning av vad de letar efter (urvalskriterium, inte fakta om företaget):",
      query.description
    );
  }

  if (requiresNoWebsite(query.description)) {
    lines.push(
      "",
      "OBS: Endast företag utan webbplats registrerad i Google Places visas här - detta är redan förfiltrerat i kod baserat på användarens kriterium, inte något du behöver bedöma själv."
    );
  }

  return lines.join("\n");
}

async function analyzeCandidate(
  openai: OpenAI,
  candidate: CompanyCandidate,
  query: LeadSearchQuery
): Promise<GeneratedLead | null> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.4,
    max_tokens: 400,
    messages: [
      { role: "system", content: CANDIDATE_SYSTEM_PROMPT },
      { role: "user", content: buildCandidatePrompt(candidate, query) }
    ]
  });

  const p = parseJsonObject(completion.choices?.[0]?.message?.content);
  if (!p) return null;

  const leadScore = clampLeadScore(p.leadScore);
  const research = asBoundedString(p.research, 800);
  const pitch = asBoundedString(p.pitch, 500);
  if (leadScore === null || !research || !pitch) return null;

  const recommendedServiceRaw = asBoundedString(p.recommendedService, 50);
  const recommendedService: ServiceType = SERVICE_TYPES.includes(recommendedServiceRaw as ServiceType)
    ? (recommendedServiceRaw as ServiceType)
    : query.service;

  return {
    companyName: candidate.companyName,
    city: candidate.city,
    website: candidate.website,
    phone: candidate.phone,
    address: candidate.address,
    placesId: candidate.placesId,
    leadScore,
    research,
    pitch,
    recommendedService
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<FindLeadsResponse>) {
  if (isProduction) {
    res.status(404).json({ error: "server_error", message: "Not found" });
    return;
  }

  if (req.method !== "POST") {
    sendError(res, 405, "server_error", "Endast POST är tillåtet.");
    return;
  }

  const query = validateQuery(req.body);
  if (!query) {
    sendError(res, 400, "invalid_input", "Ange stad, bransch och en giltig tjänst.");
    return;
  }

  let candidates: CompanyCandidate[];
  try {
    candidates = await searchCompanies(query);
  } catch (err) {
    if (err instanceof SearchProviderNotConfiguredError) {
      sendError(res, 503, "missing_search_provider", err.message);
      return;
    }
    console.error("Lead search error:", err);
    sendError(res, 502, "search_failed", "Kunde inte söka efter företag just nu. Försök igen om en stund.");
    return;
  }

  if (candidates.length === 0) {
    res.status(200).json({ leads: [] });
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
    const results = await Promise.all(candidates.map((candidate) => analyzeCandidate(openai, candidate, query)));
    const scoredLeads = results.filter((lead): lead is GeneratedLead => lead !== null);
    // Search expansion can legitimately gather more qualified candidates
    // than requestedCount in one go (see leadSearch.ts) - when it does,
    // the AI's own leadScore picks the best `count`, never a truncation
    // that silently drops nothing at random.
    const leads =
      scoredLeads.length > query.count
        ? [...scoredLeads].sort((a, b) => b.leadScore - a.leadScore).slice(0, query.count)
        : scoredLeads;
    res.status(200).json({ leads });
  } catch (err) {
    console.error("AI lead generation error:", err);
    const mapped = mapOpenAiError(err);
    sendError(res, mapped.status, mapped.code, mapped.message);
  }
}
