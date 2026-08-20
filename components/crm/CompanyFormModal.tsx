import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import {
  Company,
  CompanyFormValues,
  EMPTY_COMPANY_FORM_VALUES,
  LEAD_STATUSES,
  SERVICE_TYPES,
  LEAD_SOURCES,
  COMMISSION_STATUSES,
  LeadAnalysisResult,
  companyFormValuesToDraft
} from "../../lib/crm/types";
import { createCompany, deleteCompany, updateCompany } from "../../lib/crm/storage";
import { analyzeLead } from "../../lib/crm/ai";

type AiStatus = "idle" | "loading" | "success" | "error" | "missing_key";

function companyToAiResult(company: Company): LeadAnalysisResult | null {
  if (company.leadScore === undefined) return null;
  return {
    leadScore: company.leadScore,
    research: company.aiResearch ?? "",
    pitch: company.aiPitch ?? "",
    emailSubject: "",
    emailBody: "",
    notes: company.leadNotes ?? ""
  };
}

function potentialLabel(score: number): { label: string; color: string } {
  if (score >= 70) return { label: "Hög", color: "var(--success-text)" };
  if (score >= 40) return { label: "Medel", color: "var(--warning-text)" };
  return { label: "Låg", color: "var(--danger-text)" };
}

interface CompanyFormModalProps {
  company: Company | null; // null = create mode, otherwise edit mode
  onClose: () => void;
  onSaved: (company: Company) => void;
  onDeleted: (id: string) => void;
}

function toFormValues(company: Company | null): CompanyFormValues {
  if (!company) return EMPTY_COMPANY_FORM_VALUES;

  const { name, contactPerson, email, phone, city, website, socialMedia, service, status, nextFollowUp, notes, leadSource, commissionAmount, commissionStatus, commissionPaidAt } = company;
  return {
    name, contactPerson, email, phone, city, website, socialMedia, service, status, nextFollowUp, notes,
    leadSource: leadSource ?? "",
    commissionAmount: commissionAmount ?? "",
    commissionStatus: commissionStatus ?? "Ingen provision",
    commissionPaidAt: commissionPaidAt ?? ""
  };
}

export default function CompanyFormModal({ company, onClose, onSaved, onDeleted }: CompanyFormModalProps) {
  const isEditMode = company !== null;
  const [values, setValues] = useState<CompanyFormValues>(() => toFormValues(company));
  const [nameError, setNameError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [aiStatus, setAiStatus] = useState<AiStatus>(() => (company && companyToAiResult(company) ? "success" : "idle"));
  const [aiResult, setAiResult] = useState<LeadAnalysisResult | null>(() => (company ? companyToAiResult(company) : null));
  const [aiError, setAiError] = useState("");
  const [savingAiResult, setSavingAiResult] = useState(false);
  const [aiResultSaved, setAiResultSaved] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const updateField = <K extends keyof CompanyFormValues>(field: K, value: CompanyFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedName = values.name.trim();
    if (!trimmedName) {
      setNameError("Företagsnamn krävs");
      return;
    }

    setSaving(true);
    const payload = companyFormValuesToDraft({ ...values, name: trimmedName });

    const saved = isEditMode && company
      ? await updateCompany(company.id, payload)
      : await createCompany(payload);

    setSaving(false);
    if (saved) {
      onSaved(saved);
      onClose();
    }
  };

  const handleDelete = async () => {
    if (!company) return;
    const confirmed = window.confirm(`Ta bort "${company.name}" permanent? Det går inte att ångra.`);
    if (!confirmed) return;

    setDeleting(true);
    await deleteCompany(company.id);
    setDeleting(false);
    onDeleted(company.id);
    onClose();
  };

  const handleAnalyze = async () => {
    if (!company) return;

    setAiStatus("loading");
    setAiError("");
    setAiResultSaved(false);

    const outcome = await analyzeLead({
      name: values.name,
      contactPerson: values.contactPerson,
      city: values.city,
      website: values.website,
      socialMedia: values.socialMedia,
      service: values.service,
      status: values.status,
      notes: values.notes
    });

    if (outcome.ok) {
      setAiResult(outcome.result);
      setAiStatus("success");
    } else {
      setAiError(outcome.message);
      setAiStatus(outcome.code === "missing_api_key" ? "missing_key" : "error");
    }
  };

  const handleSaveAiResult = async () => {
    if (!company || !aiResult) return;

    setSavingAiResult(true);
    const updated = await updateCompany(company.id, {
      leadScore: aiResult.leadScore,
      aiResearch: aiResult.research,
      aiPitch: aiResult.pitch,
      leadNotes: aiResult.notes
    });
    setSavingAiResult(false);

    if (updated) {
      onSaved(updated);
      setAiResultSaved(true);
    }
  };

  const handleCopyEmail = async () => {
    if (!aiResult) return;
    const text = `Ämne: ${aiResult.emailSubject}\n\n${aiResult.emailBody}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback("Kopierat!");
    } catch {
      setCopyFeedback("Kunde inte kopiera automatiskt - markera texten manuellt.");
    }
    setTimeout(() => setCopyFeedback(""), 2500);
  };

  const busy = saving || deleting;

  return (
    <div style={styles.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modal} role="dialog" aria-modal="true" aria-label={isEditMode ? "Redigera företag" : "Skapa företag"}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{isEditMode ? "Redigera företag" : "Skapa företag"}</h2>
          <button type="button" style={styles.closeButton} onClick={onClose} aria-label="Stäng">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.formGrid}>
            <label style={styles.fieldFull}>
              <span style={styles.label}>Företagsnamn *</span>
              <input
                style={{ ...styles.input, ...(nameError ? styles.inputError : {}) }}
                value={values.name}
                onChange={(e) => { updateField("name", e.target.value); setNameError(""); }}
                disabled={busy}
                autoFocus
              />
              {nameError && <span style={styles.errorText}>{nameError}</span>}
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Kontaktperson</span>
              <input style={styles.input} value={values.contactPerson} onChange={(e) => updateField("contactPerson", e.target.value)} disabled={busy} />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>E-post</span>
              <input style={styles.input} type="email" value={values.email} onChange={(e) => updateField("email", e.target.value)} disabled={busy} />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Telefon</span>
              <input style={styles.input} value={values.phone} onChange={(e) => updateField("phone", e.target.value)} disabled={busy} />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Stad</span>
              <input style={styles.input} value={values.city} onChange={(e) => updateField("city", e.target.value)} disabled={busy} />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Hemsida</span>
              <input style={styles.input} value={values.website} onChange={(e) => updateField("website", e.target.value)} disabled={busy} placeholder="https://" />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Instagram/Facebook</span>
              <input style={styles.input} value={values.socialMedia} onChange={(e) => updateField("socialMedia", e.target.value)} disabled={busy} />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Tjänst</span>
              <select style={styles.input} value={values.service} onChange={(e) => updateField("service", e.target.value as CompanyFormValues["service"])} disabled={busy}>
                {SERVICE_TYPES.map((service) => (
                  <option key={service} value={service}>{service}</option>
                ))}
              </select>
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Status</span>
              <select style={styles.input} value={values.status} onChange={(e) => updateField("status", e.target.value as CompanyFormValues["status"])} disabled={busy}>
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Nästa uppföljning</span>
              <input style={styles.input} type="date" value={values.nextFollowUp} onChange={(e) => updateField("nextFollowUp", e.target.value)} disabled={busy} />
            </label>

            <label style={styles.fieldFull}>
              <span style={styles.label}>Anteckningar</span>
              <textarea style={styles.textarea} value={values.notes} onChange={(e) => updateField("notes", e.target.value)} disabled={busy} rows={4} />
            </label>

            <div style={styles.fieldFull}>
              <h3 style={styles.sectionDivider}>Leadkälla &amp; provision</h3>
            </div>

            <label style={styles.field}>
              <span style={styles.label}>Leadkälla</span>
              <select style={styles.input} value={values.leadSource} onChange={(e) => updateField("leadSource", e.target.value as CompanyFormValues["leadSource"])} disabled={busy}>
                <option value="">Ej angivet</option>
                {LEAD_SOURCES.map((source) => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Provisionsstatus</span>
              <select style={styles.input} value={values.commissionStatus} onChange={(e) => updateField("commissionStatus", e.target.value as CompanyFormValues["commissionStatus"])} disabled={busy}>
                {COMMISSION_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>

            {values.commissionStatus !== "Ingen provision" && (
              <>
                <label style={styles.field}>
                  <span style={styles.label}>Provision (SEK)</span>
                  <input
                    style={styles.input}
                    type="number"
                    min={0}
                    step={1}
                    value={values.commissionAmount}
                    onChange={(e) => updateField("commissionAmount", e.target.value === "" ? "" : Number(e.target.value))}
                    disabled={busy}
                    placeholder="0"
                  />
                </label>

                <label style={styles.field}>
                  <span style={styles.label}>Utbetalningsdatum</span>
                  <input
                    style={styles.input}
                    type="date"
                    value={values.commissionPaidAt}
                    onChange={(e) => updateField("commissionPaidAt", e.target.value)}
                    disabled={busy}
                  />
                </label>
              </>
            )}
          </div>

          <div style={styles.actionsRow}>
            {isEditMode && (
              <button type="button" style={styles.deleteButton} onClick={handleDelete} disabled={busy}>
                {deleting ? "Tar bort..." : "Ta bort företag"}
              </button>
            )}
            <div style={styles.actionsRight}>
              <button type="button" style={styles.secondaryButton} onClick={onClose} disabled={busy}>
                Avbryt
              </button>
              <button type="submit" style={styles.primaryButton} disabled={busy}>
                {saving ? "Sparar..." : isEditMode ? "Spara ändringar" : "Skapa företag"}
              </button>
            </div>
          </div>
        </form>

        {isEditMode && (
          <div style={styles.aiSection}>
            <div style={styles.aiSectionHeader}>
              <h3 style={styles.aiSectionTitle}>🤖 AI Lead Assistant</h3>
              <button type="button" style={styles.aiAnalyzeButton} onClick={handleAnalyze} disabled={aiStatus === "loading"}>
                {aiStatus === "loading" ? "Analyserar..." : "🤖 Analysera med AI"}
              </button>
            </div>
            <p style={styles.aiHint}>AI-analyser kostar API-användning - klicka bara när du vill analysera.</p>

            {aiStatus === "loading" && <p style={styles.aiStatusText}>Analyserar företaget, ett ögonblick...</p>}
            {aiStatus === "missing_key" && <p style={styles.aiStatusTextWarn}>{aiError || "AI-funktionen är inte konfigurerad ännu (OPENAI_API_KEY saknas)."}</p>}
            {aiStatus === "error" && <p style={styles.aiStatusTextError}>{aiError || "Kunde inte analysera företaget."}</p>}

            {aiStatus === "success" && aiResult && (
              <div style={styles.aiResultBox}>
                <div style={styles.aiScoreRow}>
                  <div>
                    <div style={styles.aiScoreLabel}>Lead score</div>
                    <div style={styles.aiScoreValue}>{aiResult.leadScore} / 100</div>
                  </div>
                  <div>
                    <div style={styles.aiScoreLabel}>Potential</div>
                    <div style={{ ...styles.aiPotentialValue, color: potentialLabel(aiResult.leadScore).color }}>
                      {potentialLabel(aiResult.leadScore).label}
                    </div>
                  </div>
                </div>

                <div style={styles.aiBlock}>
                  <div style={styles.aiBlockLabel}>AI Research</div>
                  <p style={styles.aiBlockText}>{aiResult.research}</p>
                </div>

                <div style={styles.aiBlock}>
                  <div style={styles.aiBlockLabel}>Rekommenderad pitch</div>
                  <p style={styles.aiBlockText}>{aiResult.pitch}</p>
                </div>

                {(aiResult.emailSubject || aiResult.emailBody) && (
                  <div style={styles.aiBlock}>
                    <div style={styles.aiBlockLabel}>Mejlförslag</div>
                    <p style={styles.aiEmailSubject}>Ämne: {aiResult.emailSubject}</p>
                    <p style={styles.aiBlockText}>{aiResult.emailBody}</p>
                  </div>
                )}

                {aiResult.notes && (
                  <div style={styles.aiBlock}>
                    <div style={styles.aiBlockLabel}>AI-anteckningar</div>
                    <p style={styles.aiBlockText}>{aiResult.notes}</p>
                  </div>
                )}

                <div style={styles.aiActionsRow}>
                  {(aiResult.emailSubject || aiResult.emailBody) && (
                    <button type="button" style={styles.secondaryButton} onClick={handleCopyEmail}>
                      {copyFeedback || "Kopiera mejl"}
                    </button>
                  )}
                  <button type="button" style={styles.aiSaveButton} onClick={handleSaveAiResult} disabled={savingAiResult}>
                    {savingAiResult ? "Sparar..." : aiResultSaved ? "Sparat ✓" : "Spara AI-resultat"}
                  </button>
                </div>
              </div>
            )}
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
    padding: "24px 28px 20px",
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
    gap: 14
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
  inputError: {
    borderColor: "var(--danger-text)"
  },
  errorText: {
    fontSize: 12,
    color: "var(--danger-text)"
  },
  sectionDivider: {
    margin: "4px 0 0",
    paddingTop: 14,
    borderTop: "1px solid var(--border)",
    fontSize: 13,
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.02em"
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
  actionsRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
    paddingTop: 16,
    borderTop: "1px solid var(--border)"
  },
  actionsRight: {
    display: "flex",
    gap: 10,
    marginLeft: "auto"
  },
  primaryButton: {
    border: "none",
    background: "var(--accent)",
    color: "var(--accent-contrast)",
    borderRadius: 8,
    padding: "10px 18px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer"
  },
  secondaryButton: {
    border: "1px solid var(--border-input)",
    background: "var(--surface)",
    color: "var(--text-secondary)",
    borderRadius: 8,
    padding: "10px 18px",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer"
  },
  deleteButton: {
    border: "1px solid var(--danger-border)",
    background: "var(--danger-bg)",
    color: "var(--danger-text)",
    borderRadius: 8,
    padding: "10px 18px",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer"
  },
  aiSection: {
    marginTop: 20,
    paddingTop: 18,
    borderTop: "1px solid var(--border)"
  },
  aiSectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap"
  },
  aiSectionTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 700,
    color: "var(--text)"
  },
  aiAnalyzeButton: {
    border: "1px solid var(--accent-soft-border)",
    background: "var(--accent-soft-bg)",
    color: "var(--accent-hover)",
    borderRadius: 8,
    padding: "9px 16px",
    fontWeight: 700,
    fontSize: 13.5,
    cursor: "pointer"
  },
  aiHint: {
    margin: "6px 0 0",
    fontSize: 12,
    color: "var(--text-faint)"
  },
  aiStatusText: {
    margin: "10px 0 0",
    fontSize: 13.5,
    color: "var(--text-muted)"
  },
  aiStatusTextWarn: {
    margin: "10px 0 0",
    fontSize: 13.5,
    color: "var(--warning-text)"
  },
  aiStatusTextError: {
    margin: "10px 0 0",
    fontSize: 13.5,
    color: "var(--danger-text)"
  },
  aiResultBox: {
    marginTop: 14,
    background: "var(--background)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "16px 18px"
  },
  aiScoreRow: {
    display: "flex",
    gap: 32,
    marginBottom: 14
  },
  aiScoreLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-muted)",
    marginBottom: 2
  },
  aiScoreValue: {
    fontSize: "1.4rem",
    fontWeight: 800,
    color: "var(--text)"
  },
  aiPotentialValue: {
    fontSize: "1.4rem",
    fontWeight: 800
  },
  aiBlock: {
    marginBottom: 12
  },
  aiBlockLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.02em",
    marginBottom: 4
  },
  aiBlockText: {
    margin: 0,
    fontSize: 13.5,
    lineHeight: 1.55,
    color: "var(--text-secondary)",
    whiteSpace: "pre-wrap"
  },
  aiEmailSubject: {
    margin: "0 0 4px",
    fontSize: 13.5,
    fontWeight: 700,
    color: "var(--text-secondary)"
  },
  aiActionsRow: {
    display: "flex",
    gap: 10,
    marginTop: 6
  },
  aiSaveButton: {
    border: "none",
    background: "var(--accent)",
    color: "var(--accent-contrast)",
    borderRadius: 8,
    padding: "9px 16px",
    fontWeight: 700,
    fontSize: 13.5,
    cursor: "pointer"
  }
};
