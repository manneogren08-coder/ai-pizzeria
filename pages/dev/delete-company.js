import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { isLocalDev } from "../../lib/isLocalDev";

// Local-development-only tool for deleting test companies and all their
// related data. Two-step flow: "Ladda företag" looks up a summary via
// GET /api/dev/delete-company, then a separate, clearly-marked delete
// button (plus a native confirm() dialog) triggers the actual deletion via
// DELETE /api/dev/delete-company. Gated client-side so the page never even
// loads its form outside localhost - but the real security boundary is the
// NODE_ENV check inside pages/api/dev/delete-company.js.
//
// To remove this tool entirely later: delete this file, delete
// pages/api/dev/delete-company.js, delete
// components/dev/DeleteCompanyDevTool.js, and remove its import + render
// line in pages/_app.js.
export default function DevDeleteCompanyPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    if (isLocalDev()) {
      setAllowed(true);
    } else {
      router.replace("/");
    }
  }, [router]);

  const [identifier, setIdentifier] = useState("");
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [deleteResult, setDeleteResult] = useState(null);

  const handleLoadCompany = async (e) => {
    e.preventDefault();
    setError("");
    setSummary(null);
    setDeleteResult(null);

    if (!identifier.trim()) {
      setError("Ange företags-id eller namn");
      return;
    }

    setLoadingSummary(true);
    try {
      const res = await fetch(`/api/dev/delete-company?identifier=${encodeURIComponent(identifier.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Kunde inte hitta företag");
      } else {
        setSummary(data);
      }
    } catch {
      setError("Ett fel uppstod. Försök igen.");
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleDelete = async () => {
    if (!summary) return;

    const confirmed = window.confirm(
      `Är du helt säker på att du vill radera "${summary.company.name}" (id ${summary.company.id}) permanent?\n\n` +
      `Detta tar bort ${summary.counts.restaurant_staff} personal, ${summary.counts.employee_accounts} anställd-konton, ` +
      `${summary.counts.prep_tasks} prep-uppgifter${summary.hasPrepTemplate ? " och prep-mallen" : ""}, samt själva företaget.\n\n` +
      `Detta går inte att ångra.`
    );

    if (!confirmed) return;

    setError("");
    setDeleting(true);
    try {
      const res = await fetch("/api/dev/delete-company", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: summary.company.id })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Kunde inte radera företaget");
      } else {
        setDeleteResult(data);
        setSummary(null);
        setIdentifier("");
      }
    } catch {
      setError("Ett fel uppstod. Försök igen.");
    } finally {
      setDeleting(false);
    }
  };

  if (!allowed) {
    return null;
  }

  return (
    <div style={pageWrapStyle}>
      <div style={cardStyle}>
        <h2 style={{ textAlign: "center", marginBottom: 8, color: "#1f2937", fontSize: 24, fontWeight: 600 }}>
          🗑️ Radera testföretag
        </h2>
        <p style={{ textAlign: "center", color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
          Endast tillgängligt lokalt. Raderingen är permanent och går inte att ångra.
        </p>

        {error && <div style={errorBoxStyle}>{error}</div>}

        {deleteResult && (
          <div style={successBoxStyle}>
            <p style={{ margin: "0 0 8px", fontWeight: 600, color: "#166534" }}>
              &quot;{deleteResult.deletedCompany.name}&quot; (id {deleteResult.deletedCompany.id}) har raderats.
            </p>
            <ul style={{ margin: 0, paddingLeft: 20, color: "#166534", fontSize: 13 }}>
              <li>prep_tasks: {deleteResult.deleted.prep_tasks} rader</li>
              <li>prep_templates: {deleteResult.deleted.prep_templates} rader</li>
              <li>employee_accounts: {deleteResult.deleted.employee_accounts} rader</li>
              <li>restaurant_staff: {deleteResult.deleted.restaurant_staff} rader</li>
              <li>companies: {deleteResult.deleted.companies} rad</li>
            </ul>
          </div>
        )}

        <form onSubmit={handleLoadCompany}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 500, color: "#374151" }}>
              Företags-ID eller namn
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                style={{ flex: 1, padding: 12, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 16, boxSizing: "border-box" }}
                placeholder="t.ex. 7 eller Restaurant Kungen"
              />
              <button type="submit" disabled={loadingSummary} style={loadButtonStyle(loadingSummary)}>
                {loadingSummary ? "Söker..." : "Ladda företag"}
              </button>
            </div>
          </div>
        </form>

        {summary && (
          <div style={summaryBoxStyle}>
            <h3 style={{ margin: "0 0 12px", color: "#374151", fontSize: 16 }}>Sammanfattning</h3>
            <p style={summaryRowStyle}>Företagsnamn: <strong>{summary.company.name}</strong></p>
            <p style={summaryRowStyle}>Företags-ID: <strong>{summary.company.id}</strong></p>
            <p style={summaryRowStyle}>E-post: <strong>{summary.company.email}</strong></p>
            <p style={summaryRowStyle}>Status: <strong>{summary.company.active ? "Aktivt" : "Inaktivt"}</strong></p>
            <p style={summaryRowStyle}>Antal personal (restaurant_staff): <strong>{summary.counts.restaurant_staff}</strong></p>
            <p style={summaryRowStyle}>Antal anställd-konton (employee_accounts): <strong>{summary.counts.employee_accounts}</strong></p>
            <p style={summaryRowStyle}>Antal prep-uppgifter (prep_tasks): <strong>{summary.counts.prep_tasks}</strong></p>
            <p style={{ ...summaryRowStyle, marginBottom: 0 }}>Prep-mall (prep_templates): <strong>{summary.hasPrepTemplate ? "Finns" : "Finns inte"}</strong></p>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              style={deleteButtonStyle(deleting)}
            >
              {deleting ? "Raderar..." : "RADERA FÖRETAG PERMANENT"}
            </button>
          </div>
        )}

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Link href="/" style={{ color: "#6b7280", fontSize: 14 }}>Tillbaka</Link>
        </div>
      </div>
    </div>
  );
}

const pageWrapStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  padding: 20
};

const cardStyle = {
  maxWidth: 500,
  width: "100%",
  background: "white",
  borderRadius: 12,
  padding: 40,
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
};

const errorBoxStyle = {
  background: "#fee2e2",
  border: "1px solid #fecaca",
  color: "#dc2626",
  padding: 12,
  borderRadius: 6,
  marginBottom: 20
};

const successBoxStyle = {
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: 8,
  padding: 16,
  marginBottom: 20
};

const summaryBoxStyle = {
  background: "#fff7ed",
  border: "1px solid #fdba74",
  borderRadius: 8,
  padding: 20,
  marginTop: 20
};

const summaryRowStyle = {
  margin: "0 0 8px",
  color: "#374151",
  fontSize: 14
};

function loadButtonStyle(loading) {
  return {
    padding: "12px 20px",
    background: loading ? "#9ca3af" : "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: loading ? "not-allowed" : "pointer",
    whiteSpace: "nowrap"
  };
}

function deleteButtonStyle(deleting) {
  return {
    width: "100%",
    marginTop: 20,
    padding: 14,
    background: deleting ? "#9ca3af" : "#dc2626",
    color: "white",
    border: "none",
    borderRadius: 6,
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: "0.02em",
    cursor: deleting ? "not-allowed" : "pointer"
  };
}
