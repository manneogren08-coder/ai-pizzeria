// Lead Scoring 2.0 - pure, deterministic scoring engine. No network
// calls, no AI, no randomness - every point awarded here must trace
// back to an actual field returned by Google Places (see
// lib/crm/leadSearch.ts). This is intentional: it's the piece that has
// to stay boring, predictable and unit-testable, since the AI step
// (pages/api/admin/ai/find-leads.ts) is only allowed to nudge the
// Effexo Fit score afterwards, never to touch this module's output.
//
// Missing data is never treated as a negative signal (0) - a dimension
// with no real signal available is excluded from the weighted total
// instead (see combineWeighted), so a lead with less available data
// isn't unfairly punished, and conversely a lead with more datapoints
// doesn't automatically outrank one with fewer but stronger signals.
// This is the concrete mechanism behind the Lead Scoring 2.0 design
// principle: prioritize signal STRENGTH over signal QUANTITY.
//
// TIER B NOT IMPLEMENTED YET: WEBSITE_UNREACHABLE, WEBSITE_SOCIAL_ONLY,
// WEBSITE_NO_MOBILE_VIEWPORT and WEBSITE_NO_BOOKING_CTA exist in the
// ReasonCode union (see ./reasonCodes) for forward-compatibility, but
// this module never produces them - that requires actually fetching the
// candidate's website, which this v1 deliberately does not do. In v1
// the Opportunity score can only ever be 40 (no website registered) or
// 0 (a website is registered, no further signal available about it).

import type { PlacesBusinessStatus } from "./types";
import { REASON_CODE_TEXT, type ReasonCode } from "./reasonCodes";

const CLOSED_BUSINESS_STATUSES: ReadonlySet<PlacesBusinessStatus> = new Set(["CLOSED_PERMANENTLY", "CLOSED_TEMPORARILY"]);

export function isClosedBusinessStatus(status: PlacesBusinessStatus | null): boolean {
  return status !== null && CLOSED_BUSINESS_STATUSES.has(status);
}

// A deliberately curated (not exhaustive) subset of Google Places'
// official place types that indicate a restaurant/café-style local food
// & beverage business - Effexo's actual target market. Narrow on
// purpose: a false CATEGORY_MATCH_RESTAURANT would inflate Effexo Fit
// for a business we can't actually help.
const RESTAURANT_TYPE_MATCH: ReadonlySet<string> = new Set([
  "restaurant",
  "cafe",
  "coffee_shop",
  "bar",
  "bakery",
  "sandwich_shop",
  "pizza_restaurant",
  "fast_food_restaurant",
  "meal_takeaway",
  "meal_delivery",
  "breakfast_restaurant",
  "brunch_restaurant",
  "fine_dining_restaurant",
  "diner",
  "buffet_restaurant",
  "ice_cream_shop",
  "dessert_shop",
  "food_court",
  "catering_service"
]);

export interface LeadScoringInput {
  website: string | null;
  rating: number | null;
  userRatingCount: number | null;
  businessStatus: PlacesBusinessStatus | null;
  primaryType: string | null;
  types: string[] | null;
  phone: string | null;
  address: string | null;
}

export interface BaseLeadScore {
  opportunityScore: number;
  buyingSignalScore: number | null;
  effexoFitScore: number;
  totalScore: number;
  reasonCodes: ReasonCode[];
  reasonTexts: string[];
}

export interface FinalLeadScore extends BaseLeadScore {
  aiFitAdjustment: number;
  adjustedEffexoFitScore: number;
}

const AI_FIT_ADJUSTMENT_MIN = -15;
const AI_FIT_ADJUSTMENT_MAX = 15;

const WEIGHTS = { opportunity: 0.35, buyingSignal: 0.35, effexoFit: 0.3 } as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// --- Opportunity ---------------------------------------------------------
// Strongest verified signal wins, never stacked - a lead with no website
// scores exactly 40, not 40 + additional tiers, even if multiple
// conditions would technically apply. See module comment for why this
// v1 only ever produces NO_WEBSITE or nothing.

function scoreOpportunity(input: LeadScoringInput): { score: number; codes: ReasonCode[] } {
  if (!input.website) {
    return { score: 40, codes: ["NO_WEBSITE"] };
  }
  return { score: 0, codes: [] };
}

// --- Buying signal ---------------------------------------------------------

function scoreBuyingSignal(input: LeadScoringInput): { score: number | null; codes: ReasonCode[] } {
  if (isClosedBusinessStatus(input.businessStatus)) {
    // Defensive only - in production this candidate should never reach
    // here at all (see isClosedBusinessStatus's use as a pre-filter in
    // lib/crm/leadSearch.ts), but a pure function should never silently
    // mis-score input it wasn't expecting.
    return { score: 0, codes: ["BUSINESS_CLOSED"] };
  }

  const codes: ReasonCode[] = [];
  let score = 0;
  let hasAnySignal = false;

  const hasReviewData = input.rating !== null && input.userRatingCount !== null;
  if (hasReviewData) {
    hasAnySignal = true;
    const rating = input.rating as number;
    const count = input.userRatingCount as number;

    if (rating >= 4.5 && count >= 100) {
      score += 35;
      codes.push("HIGH_RATING_HIGH_REVIEWS");
    } else if (rating >= 4.0 && count >= 30) {
      score += 20;
      codes.push("MODERATE_RATING_REVIEWS");
    }

    // "Possible new" is explicitly NOT a claim that the business is new -
    // only that review count is low while Google still lists it as
    // operational. The reason text (see ./reasonCodes) spells this
    // caveat out; this scorer must never upgrade it to a stated fact.
    if (count < 5 && input.businessStatus === "OPERATIONAL") {
      score += 10;
      codes.push("LOW_REVIEW_COUNT_POSSIBLE_NEW");
    }
  } else {
    codes.push("REVIEW_DATA_MISSING");
  }

  if (input.businessStatus === "OPERATIONAL") {
    hasAnySignal = true;
    score += 10;
    codes.push("BUSINESS_OPERATIONAL");
  } else if (input.businessStatus === null) {
    codes.push("BUSINESS_STATUS_UNKNOWN");
  }

  if (!hasAnySignal) return { score: null, codes };
  return { score: clamp(score, 0, 100), codes };
}

// --- Effexo fit ---------------------------------------------------------
// Always computable (never "unknown" as a whole dimension) - a business
// with no category match and no contact info still gets a real,
// meaningful score of 0, not an excluded/unknown dimension.

function scoreEffexoFit(input: LeadScoringInput): { score: number; codes: ReasonCode[] } {
  const codes: ReasonCode[] = [];
  let score = 0;

  const categoryMatches =
    (input.primaryType !== null && RESTAURANT_TYPE_MATCH.has(input.primaryType)) ||
    (input.types !== null && input.types.some((t) => RESTAURANT_TYPE_MATCH.has(t)));

  if (categoryMatches) {
    score += 40;
    codes.push("CATEGORY_MATCH_RESTAURANT");
  }

  const hasPhone = Boolean(input.phone);
  const hasAddress = Boolean(input.address);
  if (hasPhone || hasAddress) {
    score += (hasPhone ? 10 : 0) + (hasAddress ? 5 : 0);
    codes.push("CONTACT_INFO_AVAILABLE");
  } else {
    codes.push("CONTACT_INFO_MISSING");
  }

  // priceLevel is deliberately NOT scored in v1: a single price tier
  // doesn't reliably indicate "small local business" vs. "chain" without
  // data Places doesn't give us (e.g. number of locations) - scoring it
  // would be exactly the kind of speculative signal the Lead Scoring 2.0
  // audit warned against. Revisit only if a genuinely stable use turns up.

  return { score: clamp(score, 0, 100), codes };
}

// --- Combination ---------------------------------------------------------

function weightedTotal(scores: { opportunity: number; buyingSignal: number | null; effexoFit: number }): number {
  const parts: Array<{ value: number; weight: number }> = [{ value: scores.opportunity, weight: WEIGHTS.opportunity }];
  if (scores.buyingSignal !== null) {
    parts.push({ value: scores.buyingSignal, weight: WEIGHTS.buyingSignal });
  }
  parts.push({ value: scores.effexoFit, weight: WEIGHTS.effexoFit });

  const totalWeight = parts.reduce((sum, p) => sum + p.weight, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = parts.reduce((sum, p) => sum + p.value * p.weight, 0);
  return clamp(Math.round(weightedSum / totalWeight), 0, 100);
}

export function computeBaseLeadScore(input: LeadScoringInput): BaseLeadScore {
  const opportunity = scoreOpportunity(input);
  const buyingSignal = scoreBuyingSignal(input);
  const effexoFit = scoreEffexoFit(input);

  const reasonCodes = [...opportunity.codes, ...buyingSignal.codes, ...effexoFit.codes];
  const totalScore = weightedTotal({
    opportunity: opportunity.score,
    buyingSignal: buyingSignal.score,
    effexoFit: effexoFit.score
  });

  return {
    opportunityScore: opportunity.score,
    buyingSignalScore: buyingSignal.score,
    effexoFitScore: effexoFit.score,
    totalScore,
    reasonCodes,
    reasonTexts: reasonCodes.map((code) => REASON_CODE_TEXT[code])
  };
}

export function clampAiFitAdjustment(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return clamp(Math.round(value), AI_FIT_ADJUSTMENT_MIN, AI_FIT_ADJUSTMENT_MAX);
}

// Applies the AI's bounded Effexo Fit nudge and recomputes totalScore
// from scratch with the adjusted figure - deterministic given the AI's
// output, so re-running this with the same base + adjustment always
// yields the same final score.
export function applyAiFitAdjustment(base: BaseLeadScore, rawAiFitAdjustment: number): FinalLeadScore {
  const aiFitAdjustment = clampAiFitAdjustment(rawAiFitAdjustment);
  const adjustedEffexoFitScore = clamp(base.effexoFitScore + aiFitAdjustment, 0, 100);

  const totalScore = weightedTotal({
    opportunity: base.opportunityScore,
    buyingSignal: base.buyingSignalScore,
    effexoFit: adjustedEffexoFitScore
  });

  return {
    ...base,
    totalScore,
    aiFitAdjustment,
    adjustedEffexoFitScore
  };
}
