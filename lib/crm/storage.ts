// localStorage-backed persistence for the CRM. Every function returns a
// Promise even though localStorage itself is synchronous - that keeps
// call sites written against an async data layer from day one, so
// swapping this module for a real backend (e.g. Supabase) later doesn't
// require touching any UI code.

import type { Company, CompanyDraft } from "./types";

const STORAGE_KEY = "effexo_crm_companies_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readAll(): Company[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Company[]) : [];
  } catch {
    return [];
  }
}

function writeAll(companies: Company[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
}

function generateId(): string {
  if (isBrowser() && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function getAllCompanies(): Promise<Company[]> {
  return [...readAll()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getCompanyById(id: string): Promise<Company | null> {
  return readAll().find((company) => company.id === id) ?? null;
}

export async function createCompany(draft: CompanyDraft): Promise<Company> {
  const now = new Date().toISOString();
  const company: Company = {
    ...draft,
    id: generateId(),
    createdAt: now,
    updatedAt: now
  };

  const all = readAll();
  all.push(company);
  writeAll(all);

  return company;
}

// Accepts a partial patch rather than requiring the full form shape, so
// callers that only touch a slice of the record (e.g. the AI panel
// saving just leadScore/aiResearch/aiPitch/leadNotes) don't need to
// round-trip the rest of the form fields through the type system.
export async function updateCompany(id: string, patch: Partial<CompanyDraft>): Promise<Company | null> {
  const all = readAll();
  const index = all.findIndex((company) => company.id === id);
  if (index === -1) return null;

  const updated: Company = {
    ...all[index],
    ...patch,
    updatedAt: new Date().toISOString()
  };

  all[index] = updated;
  writeAll(all);

  return updated;
}

export async function deleteCompany(id: string): Promise<void> {
  writeAll(readAll().filter((company) => company.id !== id));
}
