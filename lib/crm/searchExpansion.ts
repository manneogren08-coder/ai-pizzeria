// Industry-aware search expansion for the AI Lead Generator.
//
// Google Places Text Search ranks results by relevance/popularity for a
// single broad query - a query like "Restauranger i Stockholm" surfaces
// mostly well-established, already-online businesses, and rarely
// reaches the smaller/newer businesses further down the ranking even
// though many of those would genuinely qualify for an "utan hemsida"
// search (confirmed: a real search for Stockholm restaurants without a
// website returned 60 real results, all 60 with a website already).
//
// Splitting one broad query into several narrower, related queries and
// combining/deduplicating the results reaches a much wider slice of
// real businesses - every phrase here is just fed into the same real
// Places API call, nothing is invented.

export interface SearchExpansionInput {
  industry: string;
  city: string;
  description?: string;
}

// Simple, static mapping from a handful of common Swedish industry
// categories to related search phrases. Deliberately not exhaustive -
// unmapped industries fall back to the user's own text (see
// buildSearchQueries below).
const INDUSTRY_QUERY_EXPANSIONS: Record<string, string[]> = {
  restauranger: [
    "restauranger",
    "pizzerior",
    "café",
    "kafé",
    "lunchrestaurang",
    "kvarterskrog",
    "grill",
    "sushirestaurang",
    "asiatisk restaurang",
    "italiensk restaurang",
    "hamburgerrestaurang",
    "thairestaurang"
  ],
  "frisör": ["frisör", "hårsalong", "barberare", "barbershop", "herrfrisör"],
  bil: ["bilverkstad", "bilservice", "bilrekond", "däckverkstad", "bilvård"],
  hantverk: ["elektriker", "rörmokare", "målare", "snickare", "byggfirma"]
};

function normalizeIndustryKey(industry: string): string {
  return industry.trim().toLowerCase();
}

// Finds the mapping entry that best matches the user's free-text
// industry - exact match first (case-insensitive), then a substring
// match in either direction so close variants ("Restaurang",
// "Restauranger & Café", "frisörer") still resolve to the right set.
function findExpansion(industry: string): string[] | undefined {
  const key = normalizeIndustryKey(industry);
  if (!key) return undefined;

  if (INDUSTRY_QUERY_EXPANSIONS[key]) {
    return INDUSTRY_QUERY_EXPANSIONS[key];
  }

  const matchedKey = Object.keys(INDUSTRY_QUERY_EXPANSIONS).find(
    (mappedKey) => key.includes(mappedKey) || mappedKey.includes(key)
  );
  return matchedKey ? INDUSTRY_QUERY_EXPANSIONS[matchedKey] : undefined;
}

// Returns the list of search phrases to run against Google Places for
// this query, deduplicated (case-insensitively). Falls back to the
// user's original industry text as the only phrase when nothing in the
// static mapping matches - callers combine each phrase with the city
// themselves (see lib/crm/leadSearch.ts), so no location handling here.
export function buildSearchQueries({ industry }: SearchExpansionInput): string[] {
  const trimmedIndustry = industry.trim();
  const expansion = findExpansion(trimmedIndustry);
  const phrases = expansion && expansion.length > 0 ? expansion : [trimmedIndustry];

  const seen = new Set<string>();
  const result: string[] = [];
  for (const phrase of phrases) {
    const trimmed = phrase.trim();
    const normalized = trimmed.toLowerCase();
    if (!trimmed || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(trimmed);
  }
  return result;
}
