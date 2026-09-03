// Client-side fetch wrapper for the "Vilken hemsida passar er?" advisor
// widget - same discriminated-union outcome pattern as lib/crm/ai.ts's
// analyzeLead/findLeads, kept as plain JS since the marketing site
// (unlike the CRM) isn't TypeScript.

export async function askAdvisor(messages) {
  let res;

  try {
    res = await fetch("/api/website-advisor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages })
    });
  } catch {
    return { ok: false, code: "network_error", message: "Kunde inte nå servern just nu. Kontrollera din uppkoppling." };
  }

  let data;
  try {
    data = await res.json();
  } catch {
    return { ok: false, code: "server_error", message: "Oväntat svar från servern." };
  }

  if (!res.ok) {
    return {
      ok: false,
      code: data?.error || "server_error",
      message: data?.message || "Något gick fel. Försök gärna igen."
    };
  }

  return { ok: true, result: data };
}
