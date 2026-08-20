// Real external company search for the AI Lead Generator. Server-only -
// never import this from client code, it reads a server API key.
//
// This is the ONE place that needs to change to swap search providers
// later. Callers only ever see CompanyCandidate[] - plain facts from a
// real directory, never anything the AI made up (the AI never runs
// until after this returns).
//
// Backed by the Places API (New) "Text Search" endpoint from Google -
// chosen because it's a real, well-documented business directory with
// genuine names/addresses/websites/phone numbers, reachable with a
// plain fetch() call (no new npm dependency), and has a free monthly
// usage tier. Requires GOOGLE_PLACES_API_KEY.
//
// When the query's free-text description asks for companies without a
// website (see requiresNoWebsite in ./leadFilters), filtering happens
// HERE - server-side, before any candidate ever reaches the AI.
// Companies with a websiteUri are dropped and never sent to OpenAI.
//
// SEARCH EXPANSION: a single broad query (e.g. "Restauranger i
// Stockholm") ranks by relevance/popularity, which means it can be
// dominated by well-established, already-online businesses for many
// pages - a real search confirmed this: 60 Stockholm "restauranger"
// results, all 60 already had a website. Instead of paginating one
// broad query deeply, buildSearchQueries (./searchExpansion) splits it
// into several narrower, related queries (see searchCompanies below)
// and this module combines + deduplicates their results, reaching a
// much wider slice of real businesses without ever inventing anything.

import type { LeadSearchQuery, CompanyCandidate } from "./types";
import { requiresNoWebsite } from "./leadFilters";
import { buildDedupeKeys } from "./leadDedupe";
import { buildSearchQueries } from "./searchExpansion";

export class SearchProviderNotConfiguredError extends Error {}

// Hard ceiling on Places API calls per search - covers ALL requests
// combined, whether they're spent on search-expansion breadth (more
// distinct phrases) or pagination depth (more pages of the same
// phrase). Never "N phrases x 10 pages" - every single fetchPlacesPage
// call anywhere in this module increments the same counter, and every
// loop checks it before firing another request. Text Search (New) is
// billed per request regardless of result count, so this bounds
// worst-case cost to 10 calls - modest and predictable.
const MAX_PLACES_REQUESTS = 10;

// Places' pagination tokens can take a moment to become valid after the
// page that returned them - a short pause before reusing one is cheap
// insurance against a spurious failure. Applied uniformly between all
// requests (not just token reuse) to stay gentle on the API generally.
const PAGE_TOKEN_DELAY_MS = 600;

interface PlacesTextSearchResponse {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    websiteUri?: string;
    internationalPhoneNumber?: string;
  }>;
  nextPageToken?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPlacesPage(
  apiKey: string,
  city: string,
  searchPhrase: string,
  maxResultCount: number,
  pageToken: string | undefined
): Promise<{ candidates: CompanyCandidate[]; nextPageToken: string | undefined }> {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      // nextPageToken must be listed explicitly - the new Places API
      // omits anything not named in the field mask, including this.
      // places.id is required to save a stable exclusion key when a
      // result is added to the CRM (see lib/crm/leadDedupe.ts).
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.internationalPhoneNumber,nextPageToken"
    },
    body: JSON.stringify({
      textQuery: `${searchPhrase} i ${city}`,
      languageCode: "sv",
      maxResultCount,
      ...(pageToken ? { pageToken } : {})
    })
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Places API-fel (${response.status}): ${errorBody.slice(0, 300)}`);
  }

  const data = (await response.json()) as PlacesTextSearchResponse;

  const candidates = (data.places || [])
    .map((place) => ({
      companyName: place.displayName?.text?.trim() || "",
      city,
      website: place.websiteUri?.trim() || null,
      phone: place.internationalPhoneNumber?.trim() || null,
      address: place.formattedAddress?.trim() || null,
      placesId: place.id?.trim() || null
    }))
    .filter((candidate) => candidate.companyName.length > 0);

  return { candidates, nextPageToken: data.nextPageToken };
}

interface QueryCursor {
  phrase: string;
  pageToken: string | undefined;
  exhausted: boolean;
}

export async function searchCompanies(query: LeadSearchQuery): Promise<CompanyCandidate[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new SearchProviderNotConfiguredError(
      "Ingen söktjänst är konfigurerad. Lägg till GOOGLE_PLACES_API_KEY i .env.local för att aktivera AI Lead Generator."
    );
  }

  const wantsNoWebsite = requiresNoWebsite(query.description);
  const targetCount = Math.min(Math.max(query.count, 1), 20);
  // Always request a full page (the API max) - never fewer than
  // targetCount, since a smaller page just means more round-trips if
  // some candidates get filtered out (by the website filter, or by
  // already being in the CRM). Text Search (New) is billed per request
  // regardless of result count, so there's no cost reason to ask for less.
  const pageSize = 20;

  // Keys already accounted for - both companies already in the CRM
  // (seeded from query.existingKeys, sent by the client since the
  // server has no direct access to localStorage) and candidates already
  // accepted earlier in THIS search (across every phrase and every
  // page), so the same business found again isn't collected twice.
  const seenKeys = new Set<string>(query.existingKeys || []);

  const collected: CompanyCandidate[] = [];
  let requestsMade = 0;

  const phrases = buildSearchQueries({ industry: query.industry, city: query.city, description: query.description });
  const cursors: QueryCursor[] = phrases.map((phrase) => ({ phrase, pageToken: undefined, exhausted: false }));

  // Breadth-first across phrases: each round takes exactly one page
  // from every not-yet-exhausted phrase before any phrase gets a
  // second page. This spends the request budget reaching more distinct
  // business categories first (the actual fix for the "Stockholm
  // restauranger utan hemsida" problem) - pagination depth on any one
  // phrase only kicks in as a fallback once every phrase has been
  // tried at least once and budget/target still allow more.
  let madeProgressThisRound = true;
  while (collected.length < targetCount && requestsMade < MAX_PLACES_REQUESTS && madeProgressThisRound) {
    madeProgressThisRound = false;

    for (const cursor of cursors) {
      if (collected.length >= targetCount || requestsMade >= MAX_PLACES_REQUESTS) break;
      if (cursor.exhausted) continue;

      if (requestsMade > 0) {
        await sleep(PAGE_TOKEN_DELAY_MS);
      }

      const { candidates, nextPageToken } = await fetchPlacesPage(apiKey, query.city, cursor.phrase, pageSize, cursor.pageToken);
      requestsMade += 1;
      madeProgressThisRound = true;

      // Every candidate on this page is processed (never cut off
      // mid-page) - a page can push collected past targetCount, which
      // is intentional: find-leads.ts lets the AI rank any overflow
      // and returns only the best targetCount leads.
      for (const candidate of candidates) {
        if (wantsNoWebsite && candidate.website !== null) continue;

        const keys = buildDedupeKeys({
          placesId: candidate.placesId,
          phone: candidate.phone,
          name: candidate.companyName,
          address: candidate.address
        });
        if (keys.some((key) => seenKeys.has(key))) continue;

        keys.forEach((key) => seenKeys.add(key));
        collected.push(candidate);
      }

      cursor.pageToken = nextPageToken;
      cursor.exhausted = !nextPageToken;
    }
  }

  return collected;
}
