// Builds stable, normalized keys used to recognize when a Google Places
// candidate is actually the same real-world business as one already in
// the CRM (or one already accepted earlier in the same search) - even
// when the name/address text differs slightly, e.g. "Järnvägsgrillen"
// vs "Järnvägsgrillen AB" should still count as the same business if
// their phone numbers (or name+address) match.
//
// Pure string logic, no DOM/Node-only APIs - safe to import from BOTH
// the client (LeadGeneratorModal builds keys for the user's existing
// CRM companies) and the server (leadSearch.ts checks new candidates
// against them). An entity can produce multiple keys (one per signal it
// has); a match on ANY of them counts as a duplicate, since we don't
// know in advance which signal two records of the same business will
// agree on.

export interface DedupeSubject {
  placesId?: string | null;
  phone?: string | null;
  name: string;
  address?: string | null;
}

function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  // "+46 910 21 16 50" and "0910-211650" should be recognized as the
  // same number - fold the country code form back to the local 0-form.
  if (digits.startsWith("46") && digits.length > 9) {
    digits = `0${digits.slice(2)}`;
  }
  return digits;
}

// Common Swedish company-form suffixes that shouldn't make two records
// of the same business look different.
const LEGAL_SUFFIX_PATTERN = /\b(aktiebolag|ab|handelsbolag|hb|kommanditbolag|kb|enskild firma)\b/g;

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(LEGAL_SUFFIX_PATTERN, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

// Priority order (per the task): Places id, then phone, then
// name+address. All available keys are returned (not just the
// highest-priority one) so a match on any single signal is enough.
export function buildDedupeKeys(subject: DedupeSubject): string[] {
  const keys: string[] = [];

  if (subject.placesId) {
    keys.push(`places:${subject.placesId}`);
  }

  const normalizedPhone = subject.phone ? normalizePhone(subject.phone) : "";
  if (normalizedPhone.length >= 6) {
    keys.push(`phone:${normalizedPhone}`);
  }

  const normalizedName = normalizeName(subject.name);
  const normalizedAddress = subject.address ? normalizeAddress(subject.address) : "";
  if (normalizedName && normalizedAddress) {
    keys.push(`namead:${normalizedName}|${normalizedAddress}`);
  }

  return keys;
}
