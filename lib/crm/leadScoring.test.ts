import { describe, it, expect } from "vitest";
import { computeBaseLeadScore, applyAiFitAdjustment, clampAiFitAdjustment, isClosedBusinessStatus, type LeadScoringInput } from "./leadScoring";

// A full, "everything present" candidate - individual tests override
// just the fields they care about, so each test's intent stays obvious.
const FULL_INPUT: LeadScoringInput = {
  website: null,
  rating: 4.8,
  userRatingCount: 320,
  businessStatus: "OPERATIONAL",
  primaryType: "restaurant",
  types: ["restaurant", "food", "point_of_interest"],
  phone: "+46701234567",
  address: "Storgatan 1, Skellefteå"
};

describe("computeBaseLeadScore - Opportunity", () => {
  it("A: no website + high rating + many reviews => high opportunity and high buying signal", () => {
    const result = computeBaseLeadScore(FULL_INPUT);
    expect(result.opportunityScore).toBe(40);
    // ratingSignal(4.8)=20 (capped) + volumeSignal(320)=13 + operational 10 = 43
    expect(result.buyingSignalScore).toBe(43);
    expect(result.reasonCodes).toContain("NO_WEBSITE");
    expect(result.reasonCodes).toContain("HIGH_RATING_HIGH_REVIEWS");
    expect(result.reasonCodes).toContain("BUSINESS_OPERATIONAL");
  });

  it("B: no website + few reviews => opportunity stays high, buying signal is lower than scenario A", () => {
    const result = computeBaseLeadScore({ ...FULL_INPUT, rating: 4.2, userRatingCount: 3 });
    expect(result.opportunityScore).toBe(40);
    // ratingSignal(4.2)=round(14)=14 + volumeSignal(3)=round(5*log10(4))=3 + operational 10 = 27
    expect(result.buyingSignalScore).toBe(27);
    expect(result.buyingSignalScore).toBeLessThan(43);
    expect(result.reasonCodes).toContain("LOW_REVIEW_COUNT_POSSIBLE_NEW");
    expect(result.reasonCodes).not.toContain("HIGH_RATING_HIGH_REVIEWS");
    expect(result.reasonCodes).not.toContain("MODERATE_RATING_REVIEWS");
  });

  it("C: good website + high rating => opportunity is low, buying signal can still be high", () => {
    const result = computeBaseLeadScore({ ...FULL_INPUT, website: "https://exempelrestaurang.se" });
    expect(result.opportunityScore).toBe(0);
    expect(result.buyingSignalScore).toBe(43);
    expect(result.reasonCodes).not.toContain("NO_WEBSITE");
    expect(result.reasonCodes).not.toContain("NO_REAL_WEBSITE");
  });

  it("never stacks opportunity signals - only ever produces 40 or 0 in v1.1 (no Tier B fetch)", () => {
    const withWebsite = computeBaseLeadScore({ ...FULL_INPUT, website: "https://x.se" });
    const withoutWebsite = computeBaseLeadScore({ ...FULL_INPUT, website: null });
    expect(withWebsite.opportunityScore).toBe(0);
    expect(withoutWebsite.opportunityScore).toBe(40);
  });

  // v1.1: NO_REAL_WEBSITE - a websiteUri that isn't the business's own site.
  const fakeWebsiteDomains: Array<[string, string]> = [
    ["mymenuweb.com (third-party menu)", "https://mymenuweb.com/swe/restaurants/2108024"],
    ["restrate.se (directory)", "https://www.restrate.se/restaurant/x"],
    ["facebook.com (social)", "https://www.facebook.com/somerestaurant"],
    ["instagram.com (social)", "https://www.instagram.com/somerestaurant"],
    ["linktr.ee (link page)", "https://linktr.ee/somerestaurant"]
  ];

  it.each(fakeWebsiteDomains)("scores NO_REAL_WEBSITE (opportunity 40) for %s", (_label, url) => {
    const result = computeBaseLeadScore({ ...FULL_INPUT, website: url });
    expect(result.opportunityScore).toBe(40);
    expect(result.reasonCodes).toContain("NO_REAL_WEBSITE");
    expect(result.reasonCodes).not.toContain("NO_WEBSITE");
  });

  it("a real, ordinary company domain scores opportunity 0 (not flagged as NO_REAL_WEBSITE)", () => {
    const result = computeBaseLeadScore({ ...FULL_INPUT, website: "https://www.exempelrestaurang.se/" });
    expect(result.opportunityScore).toBe(0);
    expect(result.reasonCodes).not.toContain("NO_REAL_WEBSITE");
  });

  it("an unparseable website URL is treated conservatively as a real website (opportunity 0), not flagged", () => {
    const result = computeBaseLeadScore({ ...FULL_INPUT, website: "not a url" });
    expect(result.opportunityScore).toBe(0);
    expect(result.reasonCodes).not.toContain("NO_REAL_WEBSITE");
    expect(result.reasonCodes).not.toContain("NO_WEBSITE");
  });
});

describe("computeBaseLeadScore - closed businesses", () => {
  it("D: a closed business is scored defensively as BUSINESS_CLOSED with buyingSignalScore 0 (real filtering happens upstream in leadSearch.ts)", () => {
    const result = computeBaseLeadScore({ ...FULL_INPUT, businessStatus: "CLOSED_PERMANENTLY" });
    expect(result.buyingSignalScore).toBe(0);
    expect(result.reasonCodes).toContain("BUSINESS_CLOSED");
    expect(result.reasonCodes).not.toContain("BUSINESS_OPERATIONAL");
    expect(result.reasonCodes).not.toContain("HIGH_RATING_HIGH_REVIEWS");
  });

  it("isClosedBusinessStatus is true only for CLOSED_PERMANENTLY / CLOSED_TEMPORARILY", () => {
    expect(isClosedBusinessStatus("CLOSED_PERMANENTLY")).toBe(true);
    expect(isClosedBusinessStatus("CLOSED_TEMPORARILY")).toBe(true);
    expect(isClosedBusinessStatus("OPERATIONAL")).toBe(false);
    expect(isClosedBusinessStatus("FUTURE_OPENING")).toBe(false);
    expect(isClosedBusinessStatus(null)).toBe(false);
  });
});

describe("computeBaseLeadScore - missing data handling", () => {
  it("E: missing rating/review count => review signal is absent (REVIEW_DATA_MISSING), not scored as 0", () => {
    const result = computeBaseLeadScore({ ...FULL_INPUT, rating: null, userRatingCount: null });
    expect(result.reasonCodes).toContain("REVIEW_DATA_MISSING");
    // Only the +10 BUSINESS_OPERATIONAL contributes - the rating/volume signals never fired.
    expect(result.buyingSignalScore).toBe(10);
  });

  it("buyingSignalScore is null (not 0) when neither review data nor business status is known at all", () => {
    const result = computeBaseLeadScore({ ...FULL_INPUT, rating: null, userRatingCount: null, businessStatus: null });
    expect(result.buyingSignalScore).toBeNull();
    expect(result.reasonCodes).toContain("REVIEW_DATA_MISSING");
    expect(result.reasonCodes).toContain("BUSINESS_STATUS_UNKNOWN");
  });

  it("F: missing businessStatus => treated as UNKNOWN, never assumed OPERATIONAL", () => {
    const result = computeBaseLeadScore({ ...FULL_INPUT, businessStatus: null });
    expect(result.reasonCodes).toContain("BUSINESS_STATUS_UNKNOWN");
    expect(result.reasonCodes).not.toContain("BUSINESS_OPERATIONAL");
    // Rating/volume signal (20 + 13 = 33) still applies since rating/reviews
    // are present, but no +10 operational bonus and no
    // LOW_REVIEW_COUNT_POSSIBLE_NEW (which explicitly requires a confirmed
    // OPERATIONAL status).
    expect(result.buyingSignalScore).toBe(33);
  });

  it("G: missing phone => no phone contribution to Effexo Fit", () => {
    const withPhone = computeBaseLeadScore({ ...FULL_INPUT, primaryType: null, types: null, address: null, phone: "0701234567" });
    const withoutPhone = computeBaseLeadScore({ ...FULL_INPUT, primaryType: null, types: null, address: null, phone: null });
    expect(withPhone.effexoFitScore).toBe(10);
    expect(withoutPhone.effexoFitScore).toBe(0);
    expect(withoutPhone.reasonCodes).toContain("CONTACT_INFO_MISSING");
    expect(withPhone.reasonCodes).toContain("CONTACT_INFO_AVAILABLE");
  });
});

describe("computeBaseLeadScore - reason code determinism", () => {
  it("H: different combinations of inputs produce deterministic, traceable reason code sets", () => {
    const result = computeBaseLeadScore(FULL_INPUT);
    expect(result.reasonCodes).toEqual(["NO_WEBSITE", "HIGH_RATING_HIGH_REVIEWS", "BUSINESS_OPERATIONAL", "CATEGORY_MATCH_RESTAURANT", "CONTACT_INFO_AVAILABLE"]);
    expect(result.reasonTexts).toHaveLength(result.reasonCodes.length);
    result.reasonTexts.forEach((text) => expect(typeof text).toBe("string"));
  });

  it("M: identical input produces exactly the same output on repeated calls", () => {
    const first = computeBaseLeadScore(FULL_INPUT);
    const second = computeBaseLeadScore(FULL_INPUT);
    expect(second).toEqual(first);
  });
});

describe("computeBaseLeadScore - v1.1 review signal gradient (F)", () => {
  // Rating held constant at 4.6 (ratingSignal = 20, capped) so only the
  // review-volume gradient varies. Values verified against the exact
  // formula (5 * log10(count + 1), capped at 15) in the module.
  const cases: Array<[number, number]> = [
    [0, 30],
    [7, 35],
    [14, 36],
    [30, 37],
    [100, 40],
    [254, 42],
    [500, 43],
    [931, 45],
    [1275, 45],
    [2800, 45]
  ];

  it.each(cases)("count=%i -> buyingSignalScore=%i", (count, expected) => {
    const result = computeBaseLeadScore({ ...FULL_INPUT, rating: 4.6, userRatingCount: count });
    expect(result.buyingSignalScore).toBe(expected);
  });

  it("increases monotonically and gradually with review count - no cliff-sized jumps", () => {
    const scores = cases.map(([count]) => computeBaseLeadScore({ ...FULL_INPUT, rating: 4.6, userRatingCount: count }).buyingSignalScore as number);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
      expect(scores[i] - scores[i - 1]).toBeLessThanOrEqual(6);
    }
  });

  it("30 reviews and 2800 reviews are not scored identically", () => {
    const at30 = computeBaseLeadScore({ ...FULL_INPUT, rating: 4.6, userRatingCount: 30 }).buyingSignalScore;
    const at2800 = computeBaseLeadScore({ ...FULL_INPUT, rating: 4.6, userRatingCount: 2800 }).buyingSignalScore;
    expect(at2800).toBeGreaterThan(at30 as number);
  });

  it("4.6/14 is not scored identically to 4.6/0", () => {
    const at0 = computeBaseLeadScore({ ...FULL_INPUT, rating: 4.6, userRatingCount: 0 }).buyingSignalScore;
    const at14 = computeBaseLeadScore({ ...FULL_INPUT, rating: 4.6, userRatingCount: 14 }).buyingSignalScore;
    expect(at14).toBeGreaterThan(at0 as number);
  });

  it("an extreme review count (2800) does not dominate the score beyond the same cap the old model had (45)", () => {
    const result = computeBaseLeadScore({ ...FULL_INPUT, rating: 5, userRatingCount: 100000 });
    expect(result.buyingSignalScore).toBe(45);
  });
});

describe("computeBaseLeadScore - v1.1 chain/central domain (G)", () => {
  it("suppresses the category-match bonus for a known chain/central domain (ICANDERs-like case)", () => {
    const chainCase = computeBaseLeadScore({
      website: "https://www.ica.se/butiker/kvantum/skelleftea/icanders/",
      rating: 4.5,
      userRatingCount: 78,
      businessStatus: "OPERATIONAL",
      primaryType: "restaurant",
      types: ["restaurant"],
      phone: "0701234567",
      address: "Storgatan 1"
    });
    expect(chainCase.reasonCodes).toContain("CHAIN_OR_CENTRAL_DOMAIN");
    expect(chainCase.reasonCodes).not.toContain("CATEGORY_MATCH_RESTAURANT");
    // Only contact info (10 + 5) contributes to fit - no category bonus.
    expect(chainCase.effexoFitScore).toBe(15);
  });

  it("a normal local restaurant on its own domain still gets the full category-match bonus (control)", () => {
    const normalCase = computeBaseLeadScore({
      website: "https://www.exempelrestaurang.se/",
      rating: 4.5,
      userRatingCount: 78,
      businessStatus: "OPERATIONAL",
      primaryType: "restaurant",
      types: ["restaurant"],
      phone: "0701234567",
      address: "Storgatan 1"
    });
    expect(normalCase.reasonCodes).toContain("CATEGORY_MATCH_RESTAURANT");
    expect(normalCase.reasonCodes).not.toContain("CHAIN_OR_CENTRAL_DOMAIN");
    expect(normalCase.effexoFitScore).toBe(55);
  });

  it("chain domain detection never affects Opportunity, only Effexo Fit", () => {
    const chainCase = computeBaseLeadScore({
      ...FULL_INPUT,
      website: "https://elite.se/sv/hotell/skelleftea/restaurang-mandel/"
    });
    // Has a real (chain) website -> opportunity 0, same as any other real site.
    expect(chainCase.opportunityScore).toBe(0);
    expect(chainCase.reasonCodes).not.toContain("NO_WEBSITE");
    expect(chainCase.reasonCodes).not.toContain("NO_REAL_WEBSITE");
  });

  it("a chain domain with no category match doesn't award the bonus either (nothing to suppress, but no false grant)", () => {
    const result = computeBaseLeadScore({
      ...FULL_INPUT,
      website: "https://www.coop.se/butiker/coop/nagot/",
      primaryType: "supermarket",
      types: ["supermarket"]
    });
    expect(result.reasonCodes).toContain("CHAIN_OR_CENTRAL_DOMAIN");
    expect(result.reasonCodes).not.toContain("CATEGORY_MATCH_RESTAURANT");
  });
});

describe("applyAiFitAdjustment", () => {
  it("I: a -15 adjustment lowers adjustedEffexoFitScore and recomputes totalScore correctly", () => {
    const base = computeBaseLeadScore(FULL_INPUT); // opportunity 40, buyingSignal 43, effexoFit 55
    expect(base.effexoFitScore).toBe(55); // 40 (category) + 10 (phone) + 5 (address)

    const final = applyAiFitAdjustment(base, -15);
    expect(final.aiFitAdjustment).toBe(-15);
    expect(final.adjustedEffexoFitScore).toBe(40);
    // round(0.35*40 + 0.35*43 + 0.30*40) = round(14 + 15.05 + 12) = round(41.05) = 41
    expect(final.totalScore).toBe(41);
  });

  it("J: a +15 adjustment raises adjustedEffexoFitScore and recomputes totalScore correctly", () => {
    const base = computeBaseLeadScore(FULL_INPUT);
    const final = applyAiFitAdjustment(base, 15);
    expect(final.aiFitAdjustment).toBe(15);
    expect(final.adjustedEffexoFitScore).toBe(70);
    // round(0.35*40 + 0.35*43 + 0.30*70) = round(14 + 15.05 + 21) = round(50.05) = 50
    expect(final.totalScore).toBe(50);
  });

  it("K: an adjustment of +100 clamps to +15", () => {
    expect(clampAiFitAdjustment(100)).toBe(15);
    const final = applyAiFitAdjustment(computeBaseLeadScore(FULL_INPUT), 100);
    expect(final.aiFitAdjustment).toBe(15);
  });

  it("L: an adjustment of -100 clamps to -15", () => {
    expect(clampAiFitAdjustment(-100)).toBe(-15);
    const final = applyAiFitAdjustment(computeBaseLeadScore(FULL_INPUT), -100);
    expect(final.aiFitAdjustment).toBe(-15);
  });

  it("clamps adjustedEffexoFitScore to [0, 100] even at the extremes", () => {
    const lowFitBase = computeBaseLeadScore({ ...FULL_INPUT, primaryType: null, types: null, phone: null, address: null });
    expect(lowFitBase.effexoFitScore).toBe(0);
    const final = applyAiFitAdjustment(lowFitBase, -15);
    expect(final.adjustedEffexoFitScore).toBe(0);
  });

  it("treats a non-finite or non-numeric adjustment as 0", () => {
    expect(clampAiFitAdjustment(NaN)).toBe(0);
    expect(clampAiFitAdjustment(Infinity)).toBe(0);
  });

  it("total score is always clamped to [0, 100]", () => {
    const final = applyAiFitAdjustment(computeBaseLeadScore(FULL_INPUT), 15);
    expect(final.totalScore).toBeGreaterThanOrEqual(0);
    expect(final.totalScore).toBeLessThanOrEqual(100);
  });
});

describe("weighted total renormalization", () => {
  it("renormalizes weights over available dimensions instead of treating an unknown dimension as 0", () => {
    // No website (opportunity=40), no review/status data at all (buyingSignal=null), no category/contact (effexoFit=0).
    const result = computeBaseLeadScore({ website: null, rating: null, userRatingCount: null, businessStatus: null, primaryType: null, types: null, phone: null, address: null });
    expect(result.buyingSignalScore).toBeNull();
    // Renormalized over opportunity (0.35) and effexoFit (0.30) only:
    // round((40*0.35 + 0*0.30) / 0.65) = round(21.54) = 22
    expect(result.totalScore).toBe(22);
  });
});
