// Data model for the internal Effexo CRM. Kept deliberately flat and
// framework-agnostic so it can later be persisted to a real database
// (e.g. Supabase) without changing the shape consumers rely on.

export type ServiceType = "Hemsida" | "StaffGuide" | "Annat";

export type LeadStatus =
  | "Ny lead"
  | "Kontaktad"
  | "Svarat"
  | "Möte bokat"
  | "Offert skickad"
  | "Vunnen"
  | "Förlorad";

export const SERVICE_TYPES: ServiceType[] = ["Hemsida", "StaffGuide", "Annat"];

export const LEAD_STATUSES: LeadStatus[] = [
  "Ny lead",
  "Kontaktad",
  "Svarat",
  "Möte bokat",
  "Offert skickad",
  "Vunnen",
  "Förlorad"
];

// Statuses that represent a closed deal - excluded from follow-up
// reminders so won/lost companies don't keep nagging for attention.
export const CLOSED_STATUSES: LeadStatus[] = ["Vunnen", "Förlorad"];

// Who/what originated a lead. A closed set rather than free text so
// the commission-per-source overview (dashboard) can group reliably.
export type LeadSource = "Manne" | "Kompis 1" | "Kompis 2" | "AI" | "Inbound" | "Annat";

export const LEAD_SOURCES: LeadSource[] = ["Manne", "Kompis 1", "Kompis 2", "AI", "Inbound", "Annat"];

export type CommissionStatus = "Ingen provision" | "Väntande" | "Utbetald";

export const COMMISSION_STATUSES: CommissionStatus[] = ["Ingen provision", "Väntande", "Utbetald"];

export interface Company {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  website: string;
  socialMedia: string;
  service: ServiceType;
  status: LeadStatus;
  nextFollowUp: string; // ISO date (yyyy-mm-dd), "" if not set
  notes: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp

  // Who brought in the lead, and any commission owed for it. Both
  // optional so existing companies created before this field existed
  // keep working unchanged (undefined just means "not set").
  leadSource?: LeadSource;
  commissionAmount?: number; // SEK
  commissionStatus?: CommissionStatus;
  commissionPaidAt?: string; // ISO date (yyyy-mm-dd)

  // Reserved for future AI-assisted lead generation. Populated by the
  // AI Lead Assistant ("Analysera med AI") and, going forward, by the
  // AI Lead Generator when a generated lead is added to the CRM.
  leadScore?: number;
  aiResearch?: string;
  aiPitch?: string;
  lastContactedAt?: string;
  contactAttempts?: number;
  autoFollowUp?: boolean;
  leadNotes?: string;

  // Set when this company was added from an AI Lead Generator result -
  // the Google Places id (when saveable) and formatted address, used to
  // recognize the same real-world business again in later searches (see
  // lib/crm/leadDedupe.ts). Absent for companies added manually.
  placesId?: string;
  address?: string;
}

// All the fields a new company needs (everything except id/timestamps,
// which the storage layer owns). The truly optional extras (lead
// source, commission, AI fields) stay optional here too.
export type CompanyDraft = Omit<Company, "id" | "createdAt" | "updatedAt">;

// Fields the create/edit form is responsible for. Mirrors CompanyDraft
// but uses "" as the empty/unset value for the optional extras instead
// of undefined, since controlled form inputs need a defined value.
export type CompanyFormValues = Pick<
  Company,
  | "name"
  | "contactPerson"
  | "email"
  | "phone"
  | "city"
  | "website"
  | "socialMedia"
  | "service"
  | "status"
  | "nextFollowUp"
  | "notes"
> & {
  leadSource: LeadSource | "";
  commissionAmount: number | "";
  commissionStatus: CommissionStatus;
  commissionPaidAt: string;
};

export const EMPTY_COMPANY_FORM_VALUES: CompanyFormValues = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  city: "",
  website: "",
  socialMedia: "",
  service: "Hemsida",
  status: "Ny lead",
  nextFollowUp: "",
  notes: "",
  leadSource: "",
  commissionAmount: "",
  commissionStatus: "Ingen provision",
  commissionPaidAt: ""
};

// Converts the form's "" placeholders back into the undefined/typed
// values Company/CompanyDraft expect, ready to hand to createCompany
// or updateCompany.
export function companyFormValuesToDraft(values: CompanyFormValues): CompanyDraft {
  return {
    ...values,
    leadSource: values.leadSource || undefined,
    commissionAmount: values.commissionAmount === "" ? undefined : Number(values.commissionAmount),
    commissionPaidAt: values.commissionPaidAt || undefined
  };
}

// --- AI Lead Assistant -----------------------------------------------
// The subset of a company's data that's actually useful for the AI to
// reason about. Deliberately excludes email/phone (not relevant to a
// qualitative lead assessment, and no reason to send contact details to
// a third-party API unnecessarily).
export type LeadAnalysisInput = Pick<
  Company,
  "name" | "contactPerson" | "city" | "website" | "socialMedia" | "service" | "status" | "notes"
>;

// The structured shape returned by POST /api/admin/ai/analyze-lead.
// leadScore/research/pitch/notes map directly onto Company's
// leadScore/aiResearch/aiPitch/leadNotes fields when saved; the email
// draft is shown for copying but isn't persisted anywhere (see CRM UI).
export interface LeadAnalysisResult {
  leadScore: number;
  research: string;
  pitch: string;
  emailSubject: string;
  emailBody: string;
  notes: string;
}

export type LeadAnalysisErrorCode =
  | "missing_api_key"
  | "invalid_input"
  | "invalid_ai_response"
  | "rate_limited"
  | "server_error"
  | "network_error";

export interface LeadAnalysisErrorResponse {
  error: LeadAnalysisErrorCode;
  message: string;
}

// --- AI Lead Generator -------------------------------------------------
// Separate flow from the AI Lead Assistant above: instead of analysing a
// company already in the CRM, this searches for NEW companies via a real
// external data source, then runs the same kind of AI assessment on each
// result found. Nothing is saved to the CRM until the user explicitly
// adds a specific result (see POST /api/admin/ai/find-leads).

export interface LeadSearchQuery {
  city: string;
  industry: string;
  service: ServiceType;
  count: number;
  // Optional free-text guidance from the user (e.g. "restauranger utan
  // befintlig hemsida, gärna mindre lokala verksamheter") used only to
  // help the AI judge/rank the companies Google Places actually found -
  // never a source of facts about them.
  description?: string;
  // Dedupe keys (see lib/crm/leadDedupe.ts) built from the companies
  // already in the CRM, sent by the client since the server has no
  // direct access to localStorage. Candidates matching any of these are
  // filtered out before ever reaching the AI.
  existingKeys?: string[];
}

// A raw match from the external search/data provider. Only fields a
// real provider can actually supply - never fabricated. Unknown fields
// are null, not guessed.
export interface CompanyCandidate {
  companyName: string;
  city: string;
  website: string | null;
  phone: string | null;
  address: string | null;
  placesId: string | null;
}

// The AI's assessment of one candidate, built with the same
// no-hallucination rules as LeadAnalysisResult. No email draft here by
// design - that's what "Analysera med AI" is for once a lead is
// actually in the CRM.
export interface GeneratedLead {
  companyName: string;
  city: string;
  website: string | null;
  phone: string | null;
  address: string | null;
  placesId: string | null;
  leadScore: number;
  research: string;
  pitch: string;
  recommendedService: ServiceType;
}

export type LeadGeneratorErrorCode =
  | "missing_api_key"
  | "missing_search_provider"
  | "invalid_input"
  | "search_failed"
  | "invalid_ai_response"
  | "rate_limited"
  | "server_error"
  | "network_error";

export interface LeadGeneratorErrorResponse {
  error: LeadGeneratorErrorCode;
  message: string;
}

// Turns one generated lead into a company draft ready for
// createCompany() - always tagged with leadSource "AI" so the
// commission-per-source overview can later show how many customers
// came from AI-generated leads.
export function generatedLeadToCompanyDraft(lead: GeneratedLead): CompanyDraft {
  return {
    name: lead.companyName,
    contactPerson: "",
    email: "",
    phone: lead.phone || "",
    city: lead.city,
    website: lead.website || "",
    socialMedia: "",
    service: lead.recommendedService,
    status: "Ny lead",
    nextFollowUp: "",
    notes: lead.address ? `Adress (från AI-sökning): ${lead.address}` : "",
    leadSource: "AI",
    leadScore: lead.leadScore,
    aiResearch: lead.research,
    aiPitch: lead.pitch,
    placesId: lead.placesId || undefined,
    address: lead.address || undefined
  };
}
