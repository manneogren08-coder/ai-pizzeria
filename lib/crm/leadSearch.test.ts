import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { searchCompanies } from "./leadSearch";
import { buildDedupeKeys } from "./leadDedupe";

// searchCompanies talks to the real Places API via a plain fetch() call -
// mocked here so this test verifies the actual filtering/mapping logic
// end-to-end without making a network request or needing a real API key.
describe("searchCompanies - closed business filtering (Lead Scoring 2.0)", () => {
  const originalApiKey = process.env.GOOGLE_PLACES_API_KEY;

  beforeEach(() => {
    process.env.GOOGLE_PLACES_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env.GOOGLE_PLACES_API_KEY = originalApiKey;
    vi.unstubAllGlobals();
  });

  it("never returns a candidate whose businessStatus is CLOSED_PERMANENTLY or CLOSED_TEMPORARILY, but keeps unknown/operational ones", async () => {
    const mockPlaces = [
      { id: "1", displayName: { text: "Öppen Krog" }, businessStatus: "OPERATIONAL" },
      { id: "2", displayName: { text: "Nedlagd Krog" }, businessStatus: "CLOSED_PERMANENTLY" },
      { id: "3", displayName: { text: "Pausad Krog" }, businessStatus: "CLOSED_TEMPORARILY" },
      { id: "4", displayName: { text: "Okänd Status Krog" } } // Places omitted businessStatus entirely
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ places: mockPlaces })
      }))
    );

    // count: 1 so the search's own target is already met after the
    // first (and only) page - keeps the test fast and deterministic,
    // independent of how many phrases searchExpansion.ts generates.
    const results = await searchCompanies({ city: "Skellefteå", industry: "restauranger", service: "Hemsida", count: 1 });

    const names = results.map((r) => r.companyName);
    expect(names).toContain("Öppen Krog");
    expect(names).toContain("Okänd Status Krog");
    expect(names).not.toContain("Nedlagd Krog");
    expect(names).not.toContain("Pausad Krog");

    const okänd = results.find((r) => r.companyName === "Okänd Status Krog");
    expect(okänd?.businessStatus).toBeNull();
  });

  it("maps rating/userRatingCount/primaryType/types/priceLevel through to the candidate, normalizing unspecified/missing values to null", async () => {
    const mockPlaces = [
      {
        id: "10",
        displayName: { text: "Bra Restaurang" },
        businessStatus: "OPERATIONAL",
        rating: 4.7,
        userRatingCount: 210,
        primaryType: "restaurant",
        types: ["restaurant", "food"],
        priceLevel: "PRICE_LEVEL_MODERATE",
        googleMapsUri: "https://maps.google.com/?cid=123"
      },
      {
        id: "11",
        displayName: { text: "Okänd Data Restaurang" },
        businessStatus: "BUSINESS_STATUS_UNSPECIFIED",
        priceLevel: "PRICE_LEVEL_UNSPECIFIED"
      }
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ places: mockPlaces })
      }))
    );

    const results = await searchCompanies({ city: "Skellefteå", industry: "restauranger", service: "Hemsida", count: 1 });

    const bra = results.find((r) => r.companyName === "Bra Restaurang");
    expect(bra?.rating).toBe(4.7);
    expect(bra?.userRatingCount).toBe(210);
    expect(bra?.primaryType).toBe("restaurant");
    expect(bra?.types).toEqual(["restaurant", "food"]);
    expect(bra?.priceLevel).toBe("PRICE_LEVEL_MODERATE");

    const okänd = results.find((r) => r.companyName === "Okänd Data Restaurang");
    expect(okänd?.businessStatus).toBeNull();
    expect(okänd?.priceLevel).toBeNull();
    expect(okänd?.rating).toBeNull();
  });
});

// H: cross-city dedupe (Lead Scoring 2.0 v1.1) - the reality check found
// the same real business ("Kazoku Skellefteå") returned as a top lead in
// BOTH a Skellefteå search and a separate Umeå search, since each
// searchCompanies() call is its own independent request with its own
// empty seenKeys unless told otherwise. There is deliberately no
// server-side cross-request memory here (this is a stateless Next.js API
// route) - the existing existingKeys mechanism already supports this
// exact case, it just has to actually be given the earlier search's
// discovered placesId. These tests document/guard that contract; see
// components/crm/LeadGeneratorModal.tsx for the client-side change that
// makes this automatic within one open modal session.
describe("searchCompanies - cross-city Places ID dedupe (Lead Scoring 2.0 v1.1)", () => {
  const originalApiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeX = { id: "kazoku-1", displayName: { text: "Kazoku Skellefteå" }, businessStatus: "OPERATIONAL" };

  beforeEach(() => {
    process.env.GOOGLE_PLACES_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ places: [placeX] })
      }))
    );
  });

  afterEach(() => {
    process.env.GOOGLE_PLACES_API_KEY = originalApiKey;
    vi.unstubAllGlobals();
  });

  it("without passing the first search's keys forward, the same place IS returned again by a second city search (documents the failure mode)", async () => {
    const cityA = await searchCompanies({ city: "Skellefteå", industry: "restauranger", service: "Hemsida", count: 1 });
    const cityB = await searchCompanies({ city: "Umeå", industry: "restauranger", service: "Hemsida", count: 1 });

    expect(cityA).toHaveLength(1);
    expect(cityB).toHaveLength(1);
    expect(cityA[0].placesId).toBe(cityB[0].placesId);
  });

  it(
    "H: the same Places ID is never returned twice when the second search is given the first search's dedupe keys",
    async () => {
      const cityAResults = await searchCompanies({ city: "Skellefteå", industry: "restauranger", service: "Hemsida", count: 1 });
      expect(cityAResults).toHaveLength(1);
      expect(cityAResults[0].placesId).toBe("kazoku-1");

      const keysFromCityA = cityAResults.flatMap((c) =>
        buildDedupeKeys({ placesId: c.placesId, phone: c.phone, name: c.companyName, address: c.address })
      );

      // Every candidate cityB's search can find is the same already-seen
      // place, so it correctly exhausts its full search-expansion budget
      // (MAX_PLACES_REQUESTS requests, PAGE_TOKEN_DELAY_MS apart) trying
      // and failing to find a NEW one - genuinely slower than the other
      // tests here, hence the longer timeout rather than a smaller one.
      const cityBResults = await searchCompanies({
        city: "Umeå",
        industry: "restauranger",
        service: "Hemsida",
        count: 1,
        existingKeys: keysFromCityA
      });

      expect(cityBResults).toHaveLength(0);
    },
    15000
  );
});
