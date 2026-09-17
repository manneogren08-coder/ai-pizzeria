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
import { getOpenAiClient, mapOpenAiError, asBoundedString, parseJsonObject } from "../../../../lib/crm/aiClient.server";
import { computeBaseLeadScore, applyAiFitAdjustment, clampAiFitAdjustment, type BaseLeadScore } from "../../../../lib/crm/leadScoring";

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

// --- AI's role: Lead Scoring 2.0 -----------------------------------------
// The three sub-scores, reasonCodes and reasonTexts are ALREADY final by
// the time the AI sees a candidate - they come from the deterministic
// lib/crm/leadScoring.ts, computed before this prompt is even built. The
// AI's only two jobs are a short sales-angle sentence and a tightly
// bounded (-15..+15) nudge to the Effexo Fit score - it can never touch
// opportunity/buying signal, invent a reason, or state anything as fact
// that isn't already in the prompt below.

const CANDIDATE_SYSTEM_PROMPT = `Du är en intern säljassistent för Effexo, ett svenskt företag som bygger hemsidor och StaffGuide (ett AI-kunskapsverktyg för restaurangpersonal) åt restauranger och små/medelstora företag.

Effexo har redan beräknat tre deterministiska delpoäng (opportunity, buying signal, effexo fit) och en lista med konkreta, redan verifierade anledningar (reason texts) för det här företaget INNAN du får se det. Du ska INTE räkna om eller ifrågasätta dessa poäng. Din enda uppgift är:

1. Skriv en kort, konkret säljvinkel ("suggestedPitchAngle") på svenska, baserad ENDAST på de faktiska anledningarna som redan listas nedan.
2. Föreslå en liten justering av Effexo Fit-poängen ("aiFitAdjustment"), ett heltal mellan -15 och 15, ENDAST om du kan motivera den utifrån samma givna information. Om du inte kan motivera någon justering: returnera 0.

MYCKET VIKTIGA REGLER:
- Du har INGEN egen tillgång till internet och ingen information utöver det som anges nedan.
- Du får ALDRIG påstå fakta som inte finns i den angivna informationen - gissa aldrig om antal anställda, omsättning, hur hemsidan faktiskt ser ut, sociala medier, eller om verksamheten är ny/nyligen förändrad.
- Du får ALDRIG hitta på nya anledningar/reason codes - använd bara de som redan listas nedan.
- Du får ALDRIG ändra eller ifrågasätta opportunity- eller buying signal-poängen - de är redan slutgiltiga och utanför din kontroll.
- Du får ALDRIG påstå att ägaren "vill köpa" eller är redo att köpa - bara att företaget verkar relevant utifrån de givna signalerna.
- Var kortfattad, konkret och saklig. Undvik säljjargong och överdrifter.

Svara ENDAST med ett JSON-objekt, ingen text utanför JSON, med exakt dessa nycklar:
{
  "suggestedPitchAngle": "<kort, konkret säljvinkel på svenska, 1-2 meningar, baserad enbart på de givna signalerna>",
  "aiFitAdjustment": <heltal mellan -15 och 15, 0 om ingen motiverad justering>
}`;

function buildCandidatePrompt(candidate: CompanyCandidate, query: LeadSearchQuery, base: BaseLeadScore): string {
  const field = (label: string, value: string | null, unknownText = "(okänt/saknas i sökresultatet)") =>
    `${label}: ${value || unknownText}`;

  const lines = [
    "Bedöm följande företag utifrån redan beräknade signaler:",
    field("Företagsnamn", candidate.companyName),
    field("Stad", candidate.city),
    field("Adress", candidate.address),
    field("Hemsida", candidate.website, "Ingen webbplats registrerad i Google Places"),
    field("Telefon", candidate.phone),
    field("Google-betyg", candidate.rating !== null ? String(candidate.rating) : null, "(ingen betygsdata)"),
    field("Antal Google-recensioner", candidate.userRatingCount !== null ? String(candidate.userRatingCount) : null, "(ingen recensionsdata)"),
    field("Typ av verksamhet", candidate.primaryType, "(okänd typ)"),
    `Bransch som söktes: ${query.industry}`,
    `Tjänst av primärt intresse: ${query.service}`,
    "",
    `Opportunity score (redan beräknad, 0-100, EJ att ändra): ${base.opportunityScore}`,
    `Buying signal score (redan beräknad, 0-100, EJ att ändra, "okänd" betyder att ingen sådan data fanns): ${base.buyingSignalScore ?? "okänd"}`,
    `Effexo fit score (redan beräknad grund, 0-100, du får bara föreslå en liten justering av DENNA): ${base.effexoFitScore}`,
    "Redan verifierade anledningar till poängen (reason texts):",
    ...(base.reasonTexts.length > 0 ? base.reasonTexts.map((t) => `- ${t}`) : ["(inga specifika anledningar identifierade)"])
  ];

  if (query.description) {
    lines.push(
      "",
      "Användarens fritextbeskrivning av vad de letar efter (kontext för din pitch, inte fakta om företaget):",
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
  const base = computeBaseLeadScore(candidate);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.4,
    max_tokens: 300,
    messages: [
      { role: "system", content: CANDIDATE_SYSTEM_PROMPT },
      { role: "user", content: buildCandidatePrompt(candidate, query, base) }
    ]
  });

  const p = parseJsonObject(completion.choices?.[0]?.message?.content);
  if (!p) return null;

  const suggestedPitchAngle = asBoundedString(p.suggestedPitchAngle, 500);
  if (!suggestedPitchAngle) return null;

  const rawAdjustment = typeof p.aiFitAdjustment === "number" ? p.aiFitAdjustment : Number(p.aiFitAdjustment);
  const aiFitAdjustment = Number.isFinite(rawAdjustment) ? clampAiFitAdjustment(rawAdjustment) : 0;

  const final = applyAiFitAdjustment(base, aiFitAdjustment);

  return {
    companyName: candidate.companyName,
    city: candidate.city,
    website: candidate.website,
    phone: candidate.phone,
    address: candidate.address,
    placesId: candidate.placesId,
    // The v1 search form already scopes the whole query to one service
    // ("Tjänst av primärt intresse"), so the recommendation is exactly
    // what was searched for - deterministic, not an AI guess.
    recommendedService: query.service,

    opportunityScore: final.opportunityScore,
    buyingSignalScore: final.buyingSignalScore,
    effexoFitScore: final.effexoFitScore,
    aiFitAdjustment: final.aiFitAdjustment,
    adjustedEffexoFitScore: final.adjustedEffexoFitScore,
    totalScore: final.totalScore,
    reasonCodes: final.reasonCodes,
    reasonTexts: final.reasonTexts,
    suggestedPitchAngle,

    // Compatibility mirror for generatedLeadToCompanyDraft / already-saved
    // CRM companies from before Lead Scoring 2.0 (see lib/crm/types.ts).
    leadScore: final.totalScore,
    research: final.reasonTexts.join(" "),
    pitch: suggestedPitchAngle
  };
}

// Sort order per Lead Scoring 2.0: totalScore desc, then buyingSignalScore
// desc (a lead with unknown buying signal - null - ranks behind one with
// a known, even zero, buying signal in a tie), then opportunityScore desc.
function compareLeads(a: GeneratedLead, b: GeneratedLead): number {
  if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
  const bBuying = b.buyingSignalScore ?? -1;
  const aBuying = a.buyingSignalScore ?? -1;
  if (bBuying !== aBuying) return bBuying - aBuying;
  return b.opportunityScore - a.opportunityScore;
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
    const sortedLeads = [...scoredLeads].sort(compareLeads);
    // Search expansion can legitimately gather more qualified candidates
    // than requestedCount in one go (see leadSearch.ts) - when it does,
    // only the best-ranked `count` leads are returned, never a
    // truncation that silently drops nothing at random.
    const leads = sortedLeads.length > query.count ? sortedLeads.slice(0, query.count) : sortedLeads;
    res.status(200).json({ leads });
  } catch (err) {
    console.error("AI lead generation error:", err);
    const mapped = mapOpenAiError(err);
    sendError(res, mapped.status, mapped.code, mapped.message);
  }
}
