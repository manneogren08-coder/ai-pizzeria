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
    expect(result.buyingSignalScore).toBe(45); // 35 (high rating/reviews) + 10 (operational)
    expect(result.reasonCodes).toContain("NO_WEBSITE");
    expect(result.reasonCodes).toContain("HIGH_RATING_HIGH_REVIEWS");
    expect(result.reasonCodes).toContain("BUSINESS_OPERATIONAL");
  });

  it("B: no website + few reviews => opportunity stays high, buying signal is lower than scenario A", () => {
    const result = computeBaseLeadScore({ ...FULL_INPUT, rating: 4.2, userRatingCount: 3 });
    expect(result.opportunityScore).toBe(40);
    // rating 4.2 doesn't clear the 4.5/100 tier, and count=3 fails the
    // 4.0/30 tier too - only LOW_REVIEW_COUNT_POSSIBLE_NEW (10) +
    // BUSINESS_OPERATIONAL (10) apply.
    expect(result.buyingSignalScore).toBe(20);
    expect(result.buyingSignalScore).toBeLessThan(45);
    expect(result.reasonCodes).toContain("LOW_REVIEW_COUNT_POSSIBLE_NEW");
    expect(result.reasonCodes).not.toContain("HIGH_RATING_HIGH_REVIEWS");
    expect(result.reasonCodes).not.toContain("MODERATE_RATING_REVIEWS");
  });

  it("C: good website + high rating => opportunity is low, buying signal can still be high", () => {
    const result = computeBaseLeadScore({ ...FULL_INPUT, website: "https://exempelrestaurang.se" });
    expect(result.opportunityScore).toBe(0);
    expect(result.buyingSignalScore).toBe(45);
    expect(result.reasonCodes).not.toContain("NO_WEBSITE");
  });

  it("never stacks opportunity signals - only ever produces 40 or 0 in v1 (no Tier B data)", () => {
    const withWebsite = computeBaseLeadScore({ ...FULL_INPUT, website: "https://x.se" });
    const withoutWebsite = computeBaseLeadScore({ ...FULL_INPUT, website: null });
    expect(withWebsite.opportunityScore).toBe(0);
    expect(withoutWebsite.opportunityScore).toBe(40);
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
    // Only BUSINESS_OPERATIONAL (10) contributes - the review tiers never fired.
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
    // Review tier (35) still applies since rating/reviews are present,
    // but no +10 operational bonus and no LOW_REVIEW_COUNT_POSSIBLE_NEW
    // (which explicitly requires a confirmed OPERATIONAL status).
    expect(result.buyingSignalScore).toBe(35);
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

describe("applyAiFitAdjustment", () => {
  it("I: a -15 adjustment lowers adjustedEffexoFitScore and recomputes totalScore correctly", () => {
    const base = computeBaseLeadScore(FULL_INPUT); // opportunity 40, buyingSignal 45, effexoFit 55
    expect(base.effexoFitScore).toBe(55); // 40 (category) + 10 (phone) + 5 (address)

    const final = applyAiFitAdjustment(base, -15);
    expect(final.aiFitAdjustment).toBe(-15);
    expect(final.adjustedEffexoFitScore).toBe(40);
    // round(0.35*40 + 0.35*45 + 0.30*40) = round(14 + 15.75 + 12) = round(41.75) = 42
    expect(final.totalScore).toBe(42);
  });

  it("J: a +15 adjustment raises adjustedEffexoFitScore and recomputes totalScore correctly", () => {
    const base = computeBaseLeadScore(FULL_INPUT);
    const final = applyAiFitAdjustment(base, 15);
    expect(final.aiFitAdjustment).toBe(15);
    expect(final.adjustedEffexoFitScore).toBe(70);
    // round(0.35*40 + 0.35*45 + 0.30*70) = round(14 + 15.75 + 21) = round(50.75) = 51
    expect(final.totalScore).toBe(51);
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
