// Deterministic (non-AI) text filters for the AI Lead Generator's
// free-text "Vad letar du efter?" field. This is plain pattern matching,
// not something left to the model to "understand" - the model never
// even sees a candidate this filters out (see lib/crm/leadSearch.ts).

const NO_WEBSITE_PATTERNS: RegExp[] = [
  /utan\s+(befintlig\s+|egen\s+)?hemsida/i,
  /saknar\s+(befintlig\s+|egen\s+)?hemsida/i,
  /ingen\s+hemsida/i,
  /utan\s+(befintlig\s+|egen\s+)?webbplats/i,
  /saknar\s+(befintlig\s+|egen\s+)?webbplats/i,
  /ingen\s+webbplats/i,
  /utan\s+(befintlig\s+|egen\s+)?webbsida/i,
  /saknar\s+(befintlig\s+|egen\s+)?webbsida/i
];

// True if the user's free-text description explicitly asks for
// companies that don't have a website (e.g. "restauranger utan
// befintlig hemsida", "saknar webbplats"). Pure regex matching.
export function requiresNoWebsite(description: string | undefined): boolean {
  if (!description) return false;
  return NO_WEBSITE_PATTERNS.some((pattern) => pattern.test(description));
}
