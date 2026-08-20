// Shared server-only helpers for both AI features (Lead Assistant and
// Lead Generator) - same OpenAI client setup, same error mapping, same
// JSON-parsing primitives, so the two flows don't drift into two
// different lead-scoring systems. Never import this from client code:
// it reads process.env.OPENAI_API_KEY directly.

import OpenAI from "openai";

export function getOpenAiClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

export interface OpenAiCallError {
  status: number;
  code: "rate_limited" | "server_error";
  message: string;
}

export function mapOpenAiError(err: unknown): OpenAiCallError {
  const openAiError = err as { code?: string; message?: string; status?: number; statusCode?: number };
  const errorCode = openAiError?.code || "";
  const errorMessage = openAiError?.message || "";
  const statusCode = Number(openAiError?.status || openAiError?.statusCode || 0);

  if (statusCode === 401 || errorCode === "invalid_api_key" || /incorrect api key|invalid api key/i.test(errorMessage)) {
    return { status: 502, code: "server_error", message: "AI-nyckeln verkar ogiltig i servermiljön. Kontrollera OPENAI_API_KEY." };
  }

  if (statusCode === 429 || errorCode === "insufficient_quota" || /quota|rate limit/i.test(errorMessage)) {
    return { status: 429, code: "rate_limited", message: "AI-tjänsten har nått gräns för förfrågningar/krediter. Försök igen om en stund." };
  }

  return { status: 502, code: "server_error", message: "AI-tjänsten svarade inte som väntat. Försök igen om en stund." };
}

export function asBoundedString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

// Clamps to an integer 0-100, or null if the value isn't a usable number.
export function clampLeadScore(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function parseJsonObject(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
