// Central vocabulary for Lead Scoring 2.0. Every code here must be
// traceable to a real datapoint (see lib/crm/leadScoring.ts) - nothing
// in this file is written or chosen by AI, and the human-readable text
// is a fixed lookup, never AI-generated, so the "why" behind a score can
// never drift into something that wasn't actually observed.
//
// WEBSITE_UNREACHABLE, WEBSITE_SOCIAL_ONLY, WEBSITE_NO_MOBILE_VIEWPORT
// and WEBSITE_NO_BOOKING_CTA are defined here for forward-compatibility
// with the "Tier B" website analysis described in the Lead Scoring 2.0
// audit, but are NOT produced by leadScoring.ts in this v1 - that would
// require fetching and inspecting the candidate's actual website, which
// this iteration deliberately does not implement (see leadScoring.ts).

export type ReasonCode =
  | "NO_WEBSITE"
  | "WEBSITE_UNREACHABLE"
  | "WEBSITE_SOCIAL_ONLY"
  | "WEBSITE_NO_MOBILE_VIEWPORT"
  | "WEBSITE_NO_BOOKING_CTA"
  | "HIGH_RATING_HIGH_REVIEWS"
  | "MODERATE_RATING_REVIEWS"
  | "LOW_REVIEW_COUNT_POSSIBLE_NEW"
  | "BUSINESS_OPERATIONAL"
  | "BUSINESS_CLOSED"
  | "BUSINESS_STATUS_UNKNOWN"
  | "REVIEW_DATA_MISSING"
  | "CATEGORY_MATCH_RESTAURANT"
  | "CONTACT_INFO_AVAILABLE"
  | "CONTACT_INFO_MISSING";

export const REASON_CODE_TEXT: Record<ReasonCode, string> = {
  NO_WEBSITE: "Ingen hemsida registrerad i Google Places",
  WEBSITE_UNREACHABLE: "Hemsidan gick inte att nå",
  WEBSITE_SOCIAL_ONLY: "Hemsidan är egentligen bara en sida på sociala medier, ingen egen webbplats",
  WEBSITE_NO_MOBILE_VIEWPORT: "Hemsidan verkar inte vara mobilanpassad",
  WEBSITE_NO_BOOKING_CTA: "Hemsidan saknar tydlig bokning eller beställning",
  HIGH_RATING_HIGH_REVIEWS: "Högt betyg och många Google-recensioner",
  MODERATE_RATING_REVIEWS: "Bra betyg och ett rimligt antal Google-recensioner",
  LOW_REVIEW_COUNT_POSSIBLE_NEW: "Få Google-recensioner – kan vara en nyare verksamhet, men detta är inte bekräftat",
  BUSINESS_OPERATIONAL: "Verksamheten är aktiv enligt Google",
  BUSINESS_CLOSED: "Verksamheten är markerad som stängd enligt Google",
  BUSINESS_STATUS_UNKNOWN: "Verksamhetens status kunde inte bekräftas",
  REVIEW_DATA_MISSING: "Ingen recensionsdata tillgänglig i Google Places",
  CATEGORY_MATCH_RESTAURANT: "Bransch matchar restaurang/café – bra målgrupp för Effexo",
  CONTACT_INFO_AVAILABLE: "Kontaktuppgifter (telefon och/eller adress) finns",
  CONTACT_INFO_MISSING: "Inga kontaktuppgifter tillgängliga"
};
