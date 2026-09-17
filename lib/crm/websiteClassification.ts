// Lead Scoring 2.0 v1.1 - deterministic classification of a Places
// websiteUri, purely from its hostname. No fetch, no network call - the
// URL string itself is the only input. This exists because the v1
// reality check found real candidates where Places' websiteUri field
// was non-null but didn't point at an actual company website:
//
//   - Selams Eritreanska restaurang -> mymenuweb.com/... (a generic
//     third-party digital menu page, not the restaurant's own site)
//   - Restaurang FirstFloor         -> restrate.se/...    (a review/
//     directory listing, not the restaurant's own site)
//
// Both were scored as Opportunity=0 ("has a website") in v1, which was
// wrong - neither business has anything Effexo could point to as "your
// existing site." This module lets lib/crm/leadScoring.ts tell the two
// cases apart without ever fetching the URL.
//
// Domain lists are deliberately small, seeded only from patterns
// actually observed in real search results (or, for LINK_PAGE, direct
// same-service competitors of an observed domain) - never a broad guess
// at "generic-sounding" domains. Extend these sets only from evidence,
// the same way they were built.

export type WebsiteClassification =
  | "REAL_WEBSITE"
  | "THIRD_PARTY_MENU"
  | "DIRECTORY_PROFILE"
  | "SOCIAL_PROFILE"
  | "LINK_PAGE"
  | "UNKNOWN";

// Third-party "digital menu card" services - a page listing the menu,
// not a company website.
const THIRD_PARTY_MENU_DOMAINS = new Set(["mymenuweb.com"]);

// Review/directory aggregators - a listing ABOUT the business, not run
// by it.
const DIRECTORY_PROFILE_DOMAINS = new Set(["restrate.se"]);

// Using a social profile as your only "website".
const SOCIAL_PROFILE_DOMAINS = new Set(["facebook.com", "instagram.com", "tiktok.com"]);

// "Link in bio" pages - linktr.ee plus its direct same-service
// competitors (identical function: a single page of outbound links,
// never the business's own site).
const LINK_PAGE_DOMAINS = new Set(["linktr.ee", "linktree.com", "beacons.ai", "bio.link"]);

// National chain / central-ecosystem domains - see isChainOrCentralDomain
// below. Kept separate from the sets above: these ARE real websites (so
// website classification is unaffected), the problem is only that the
// domain is centrally run by a chain, not the individual local unit.
// Seeded from lib/crm/leadScoring.ts's v1 reality check: "ICANDERs
// Skellefteå" (ica.se/butiker/.../icanders/, a deli counter inside an
// ICA Kvantum store) and "Restaurang Mandel" (elite.se/.../restaurang-
// mandel/, a restaurant page on the Elite Hotels chain's own domain).
const CHAIN_OR_CENTRAL_DOMAINS = new Set(["ica.se", "coop.se", "mcdonalds.se", "mcdonalds.com", "elite.se"]);

function extractHostname(websiteUri: string): string | null {
  try {
    return new URL(websiteUri).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function domainMatches(hostname: string, knownDomain: string): boolean {
  return hostname === knownDomain || hostname.endsWith(`.${knownDomain}`);
}

function matchesAny(hostname: string, domains: ReadonlySet<string>): boolean {
  for (const domain of domains) {
    if (domainMatches(hostname, domain)) return true;
  }
  return false;
}

// Classifies a non-null websiteUri. Callers handle `website === null`
// (no website at all) themselves - that's a different, pre-existing
// signal (NO_WEBSITE), not this module's concern. A URL that fails to
// parse, or whose hostname matches nothing known, is UNKNOWN /
// REAL_WEBSITE respectively - see lib/crm/leadScoring.ts for how each
// is scored (UNKNOWN is deliberately treated the same as REAL_WEBSITE:
// conservative, never assumed to be a problem without evidence).
export function classifyWebsite(websiteUri: string): WebsiteClassification {
  const hostname = extractHostname(websiteUri);
  if (!hostname) return "UNKNOWN";

  if (matchesAny(hostname, THIRD_PARTY_MENU_DOMAINS)) return "THIRD_PARTY_MENU";
  if (matchesAny(hostname, DIRECTORY_PROFILE_DOMAINS)) return "DIRECTORY_PROFILE";
  if (matchesAny(hostname, SOCIAL_PROFILE_DOMAINS)) return "SOCIAL_PROFILE";
  if (matchesAny(hostname, LINK_PAGE_DOMAINS)) return "LINK_PAGE";

  return "REAL_WEBSITE";
}

// True when websiteUri belongs to a national chain / central-ecosystem
// domain (the business's page lives on its parent chain's own site,
// not an independent site the business runs itself). Used only for
// Effexo Fit (see lib/crm/leadScoring.ts) - deliberately NOT part of
// classifyWebsite/Opportunity, since these domains ARE real, working
// websites; the issue is who Effexo would actually be pitching, not
// whether a website exists.
export function isChainOrCentralDomain(websiteUri: string): boolean {
  const hostname = extractHostname(websiteUri);
  if (!hostname) return false;
  return matchesAny(hostname, CHAIN_OR_CENTRAL_DOMAINS);
}
