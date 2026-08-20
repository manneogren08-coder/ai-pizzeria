// Client-side helpers for both AI features (Lead Assistant and Lead
// Generator). Kept separate from the UI components and from
// lib/crm/storage.ts - this module only knows how to call the two
// endpoints, nothing about React or localStorage.

import type {
  LeadAnalysisInput,
  LeadAnalysisResult,
  LeadAnalysisErrorCode,
  LeadSearchQuery,
  GeneratedLead,
  LeadGeneratorErrorCode
} from "./types";

export type AnalyzeLeadOutcome =
  | { ok: true; result: LeadAnalysisResult }
  | { ok: false; code: LeadAnalysisErrorCode; message: string };

export async function analyzeLead(input: LeadAnalysisInput): Promise<AnalyzeLeadOutcome> {
  let res: Response;

  try {
    res = await fetch("/api/admin/ai/analyze-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
  } catch {
    return { ok: false, code: "network_error", message: "Kunde inte nå servern. Kontrollera att den lokala utvecklingsservern körs." };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { ok: false, code: "server_error", message: "Oväntat svar från servern." };
  }

  if (!res.ok) {
    const errorData = data as { error?: LeadAnalysisErrorCode; message?: string };
    return {
      ok: false,
      code: errorData?.error || "server_error",
      message: errorData?.message || "Något gick fel vid AI-analysen."
    };
  }

  return { ok: true, result: data as LeadAnalysisResult };
}

export type FindLeadsOutcome =
  | { ok: true; leads: GeneratedLead[] }
  | { ok: false; code: LeadGeneratorErrorCode; message: string };

export async function findLeads(query: LeadSearchQuery): Promise<FindLeadsOutcome> {
  let res: Response;

  try {
    res = await fetch("/api/admin/ai/find-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query)
    });
  } catch {
    return { ok: false, code: "network_error", message: "Kunde inte nå servern. Kontrollera att den lokala utvecklingsservern körs." };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { ok: false, code: "server_error", message: "Oväntat svar från servern." };
  }

  if (!res.ok) {
    const errorData = data as { error?: LeadGeneratorErrorCode; message?: string };
    return {
      ok: false,
      code: errorData?.error || "server_error",
      message: errorData?.message || "Något gick fel vid sökningen."
    };
  }

  const successData = data as { leads?: GeneratedLead[] };
  return { ok: true, leads: successData.leads || [] };
}
