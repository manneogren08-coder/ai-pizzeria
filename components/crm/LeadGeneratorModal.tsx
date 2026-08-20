import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import {
  Company,
  ServiceType,
  SERVICE_TYPES,
  LeadSearchQuery,
  GeneratedLead,
  generatedLeadToCompanyDraft
} from "../../lib/crm/types";
import { createCompany } from "../../lib/crm/storage";
import { findLeads } from "../../lib/crm/ai";
import { buildDedupeKeys } from "../../lib/crm/leadDedupe";

type GeneratorStatus = "form" | "loading" | "success" | "error" | "missing_key" | "missing_search_provider";

interface LeadGeneratorModalProps {
  companies: Company[];
  onClose: () => void;
  onLeadAdded: (company: Company) => void;
}

function scoreEmoji(score: number): string {
  if (score >= 70) return "🔥";
  if (score >= 40) return "🟢";
  return "⚪";
}

const MAX_COUNT = 20;
const MAX_DESCRIPTION_LENGTH = 400;

// Purely cosmetic status line shown while a search is running - the
// actual search (search expansion + pagination, see lib/crm/leadSearch)
// happens in one request with no incremental progress to report, so
// this just cycles a couple of reassuring messages rather than a static
// "Söker...". Not tied to real backend state.
const LOADING_MESSAGES = ["Letar efter relevanta företag...", "Genomsöker flera kategorier..."];
const LOADING_MESSAGE_INTERVAL_MS = 1800;

export default function LeadGeneratorModal({ companies, onClose, onLeadAdded }: LeadGeneratorModalProps) {
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState("");
  const [service, setService] = useState<ServiceType>("Hemsida");
  const [count, setCount] = useState(10);
  const [description, setDescription] = useState("");

  const [status, setStatus] = useState<GeneratorStatus>("form");
  const [errorMessage, setErrorMessage] = useState("");
  const [leads, setLeads] = useState<GeneratedLead[]>([]);
  const [submittedQuery, setSubmittedQuery] = useState<LeadSearchQuery | null>(null);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [addingIndex, setAddingIndex] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (status !== "loading") return;
    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, LOADING_MESSAGE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [status]);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedCity = city.trim();
    const trimmedIndustry = industry.trim();
    if (!trimmedCity || !trimmedIndustry) return;

    const trimmedDescription = description.trim().slice(0, MAX_DESCRIPTION_LENGTH);
    const existingKeys = companies.flatMap((company) =>
      buildDedupeKeys({
        placesId: company.placesId,
        phone: company.phone,
        name: company.name,
        address: company.address
      })
    );
    const query: LeadSearchQuery = {
      city: trimmedCity,
      industry: trimmedIndustry,
      service,
      count,
      description: trimmedDescription || undefined,
      existingKeys
    };

    setStatus("loading");
    setErrorMessage("");

    const outcome = await findLeads(query);

    if (outcome.ok) {
      setLeads(outcome.leads);
      setSubmittedQuery(query);
      setDismissed(new Set());
      setAdded(new Set());
      setExpanded(new Set());
      setStatus("success");
    } else {
      setErrorMessage(outcome.message);
      setStatus(
        outcome.code === "missing_api_key"
          ? "missing_key"
          : outcome.code === "missing_search_provider"
            ? "missing_search_provider"
            : "error"
      );
    }
  };

  const handleAdd = async (index: number) => {
    const lead = leads[index];
    if (!lead) return;

    setAddingIndex(index);
    const created = await createCompany(generatedLeadToCompanyDraft(lead));
    setAddingIndex(null);
    onLeadAdded(created);
    setAdded((prev) => new Set(prev).add(index));
  };

  const handleDismiss = (index: number) => {
    setDismissed((prev) => new Set(prev).add(index));
  };

  const toggleExpanded = (index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const visibleLeads = leads
    .map((lead, index) => ({ lead, index }))
    .filter(({ index }) => !dismissed.has(index));

  return (
    <div style={styles.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modal} role="dialog" aria-modal="true" aria-label="Hitta nya leads">
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>🔎 Hitta nya leads</h2>
          <button type="button" style={styles.closeButton} onClick={onClose} aria-label="Stäng">✕</button>
        </div>

        <form onSubmit={handleSearch}>
          <div style={styles.formGrid}>
            <label style={styles.field}>
              <span style={styles.label}>Stad</span>
              <input style={styles.input} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Skellefteå" disabled={status === "loading"} autoFocus />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Bransch</span>
              <input style={styles.input} value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Restauranger" disabled={status === "loading"} />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Tjänst</span>
              <select style={styles.input} value={service} onChange={(e) => setService(e.target.value as ServiceType)} disabled={status === "loading"}>
                {SERVICE_TYPES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Antal (max {MAX_COUNT})</span>
              <input
                style={styles.input}
                type="number"
                min={1}
                max={MAX_COUNT}
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(MAX_COUNT, Number(e.target.value) || 1)))}
                disabled={status === "loading"}
              />
            </label>

            <label style={styles.fieldFull}>
              <span style={styles.label}>Vad letar du efter? (valfritt)</span>
              <textarea
                style={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
                placeholder="T.ex. Restauranger utan befintlig hemsida, gärna mindre lokala verksamheter."
                rows={2}
                maxLength={MAX_DESCRIPTION_LENGTH}
                disabled={status === "loading"}
              />
              <span style={styles.charCount}>{description.length} / {MAX_DESCRIPTION_LENGTH}</span>
            </label>
          </div>

          <p style={styles.hint}>AI-analyser använder API-krediter - sök i rimliga batchar istället för att klicka upprepade gånger.</p>

          <button type="submit" style={styles.primaryButton} disabled={status === "loading" || !city.trim() || !industry.trim()}>
            {status === "loading" ? "Söker..." : "🔎 Hitta leads"}
          </button>
          {status === "loading" && <p style={styles.loadingStatus}>{LOADING_MESSAGES[loadingMessageIndex]}</p>}
        </form>

        {status === "missing_key" && <p style={styles.statusTextWarn}>{errorMessage}</p>}
        {status === "missing_search_provider" && <p style={styles.statusTextWarn}>{errorMessage}</p>}
        {status === "error" && <p style={styles.statusTextError}>{errorMessage}</p>}

        {status === "success" && submittedQuery && (
          <div style={styles.results}>
            <h3 style={styles.resultsTitle}>
              {leads.length === 0
                ? "Inga företag hittades"
                : visibleLeads.length === 0
                  ? "Inga fler förslag kvar"
                  : `AI hittade ${leads.length} potentiella leads`}
            </h3>

            {leads.length === 0 && (
              <p style={styles.statusText}>Inga företag hittades för den här sökningen. Prova en annan stad eller bransch.</p>
            )}

            {visibleLeads.map(({ lead, index }) => (
              <div key={index} style={styles.leadCard}>
                <div style={styles.leadCardHeader}>
                  <span style={styles.leadScore}>{scoreEmoji(lead.leadScore)} {lead.leadScore}</span>
                  <span style={styles.leadName}>{lead.companyName}</span>
                  {added.has(index) && <span style={styles.addedBadge}>Tillagd ✓</span>}
                </div>
                <p style={styles.leadMeta}>{submittedQuery.industry} · {lead.city}{lead.website ? ` · ${lead.website}` : ""}</p>
                <p style={styles.leadPitch}>{lead.pitch}</p>

                {expanded.has(index) && (
                  <div style={styles.leadDetails}>
                    <div style={styles.leadDetailLabel}>Research</div>
                    <p style={styles.leadDetailText}>{lead.research}</p>
                    <div style={styles.leadDetailLabel}>Rekommenderad tjänst</div>
                    <p style={styles.leadDetailText}>{lead.recommendedService}</p>
                    {(lead.phone || lead.address) && (
                      <>
                        <div style={styles.leadDetailLabel}>Kontaktinformation</div>
                        <p style={styles.leadDetailText}>{[lead.phone, lead.address].filter(Boolean).join(" · ")}</p>
                      </>
                    )}
                  </div>
                )}

                {!added.has(index) && (
                  <div style={styles.leadActionsRow}>
                    <button type="button" style={styles.secondaryButton} onClick={() => toggleExpanded(index)}>
                      {expanded.has(index) ? "Dölj" : "Visa"}
                    </button>
                    <button type="button" style={styles.secondaryButton} onClick={() => handleDismiss(index)}>
                      Avvisa
                    </button>
                    <button type="button" style={styles.addButton} onClick={() => handleAdd(index)} disabled={addingIndex === index}>
                      {addingIndex === index ? "Lägger till..." : "Lägg till"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "var(--overlay-bg)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "40px 16px",
    overflowY: "auto",
    zIndex: 100
  },
  modal: {
    background: "var(--surface)",
    borderRadius: 16,
    padding: "24px 28px 26px",
    width: "100%",
    maxWidth: 640,
    boxShadow: "var(--shadow-modal)"
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18
  },
  modalTitle: {
    margin: 0,
    fontSize: "1.35rem",
    fontWeight: 700,
    color: "var(--text)"
  },
  closeButton: {
    border: "none",
    background: "var(--surface-secondary)",
    color: "var(--neutral-text)",
    width: 32,
    height: 32,
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    marginBottom: 12
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6
  },
  fieldFull: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    gridColumn: "1 / -1"
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-secondary)"
  },
  input: {
    padding: "10px 12px",
    fontSize: 14,
    borderRadius: 8,
    border: "1.5px solid var(--border-input)",
    outline: "none",
    background: "var(--background)",
    color: "var(--text)",
    boxSizing: "border-box"
  },
  textarea: {
    padding: "10px 12px",
    fontSize: 14,
    borderRadius: 8,
    border: "1.5px solid var(--border-input)",
    outline: "none",
    background: "var(--background)",
    color: "var(--text)",
    resize: "vertical",
    fontFamily: "inherit",
    boxSizing: "border-box"
  },
  charCount: {
    fontSize: 11.5,
    color: "var(--text-faint)",
    textAlign: "right"
  },
  hint: {
    margin: "0 0 14px",
    fontSize: 12,
    color: "var(--text-faint)"
  },
  primaryButton: {
    border: "none",
    background: "var(--accent)",
    color: "var(--accent-contrast)",
    borderRadius: 8,
    padding: "10px 18px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    width: "100%"
  },
  statusText: {
    margin: "14px 0 0",
    fontSize: 13.5,
    color: "var(--text-muted)"
  },
  loadingStatus: {
    margin: "10px 0 0",
    fontSize: 12.5,
    color: "var(--text-muted)",
    textAlign: "center"
  },
  statusTextWarn: {
    margin: "14px 0 0",
    fontSize: 13.5,
    color: "var(--warning-text)"
  },
  statusTextError: {
    margin: "14px 0 0",
    fontSize: 13.5,
    color: "var(--danger-text)"
  },
  results: {
    marginTop: 18,
    paddingTop: 16,
    borderTop: "1px solid var(--border)"
  },
  resultsTitle: {
    margin: "0 0 12px",
    fontSize: 15,
    fontWeight: 700,
    color: "var(--text)"
  },
  leadCard: {
    background: "var(--background)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "14px 16px",
    marginBottom: 10
  },
  leadCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 4
  },
  leadScore: {
    fontSize: 14,
    fontWeight: 800,
    color: "var(--text)"
  },
  leadName: {
    fontSize: 14.5,
    fontWeight: 700,
    color: "var(--text)"
  },
  addedBadge: {
    marginLeft: "auto",
    fontSize: 12,
    fontWeight: 700,
    color: "var(--success-text)"
  },
  leadMeta: {
    margin: "0 0 8px",
    fontSize: 12.5,
    color: "var(--text-muted)"
  },
  leadPitch: {
    margin: 0,
    fontSize: 13.5,
    lineHeight: 1.5,
    color: "var(--text-secondary)"
  },
  leadDetails: {
    marginTop: 10,
    paddingTop: 10,
    borderTop: "1px dashed var(--border)"
  },
  leadDetailLabel: {
    fontSize: 11.5,
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.02em",
    marginBottom: 3
  },
  leadDetailText: {
    margin: "0 0 8px",
    fontSize: 13,
    lineHeight: 1.5,
    color: "var(--text-secondary)"
  },
  leadActionsRow: {
    display: "flex",
    gap: 8,
    marginTop: 10
  },
  secondaryButton: {
    border: "1px solid var(--border-input)",
    background: "var(--surface)",
    color: "var(--text-secondary)",
    borderRadius: 8,
    padding: "7px 14px",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer"
  },
  addButton: {
    border: "none",
    background: "var(--accent)",
    color: "var(--accent-contrast)",
    borderRadius: 8,
    padding: "7px 14px",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    marginLeft: "auto"
  }
};
