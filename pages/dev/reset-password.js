import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { isLocalDev } from "../../lib/isLocalDev";

// Local-development-only page for resetting a test company's forgotten
// login password. Gated client-side so it never even loads its form outside
// localhost - but the real security boundary is the NODE_ENV check inside
// pages/api/dev/reset-company-password.js, which this form calls.
//
// To remove this tool entirely later: delete this file, delete
// pages/api/dev/reset-company-password.js, and remove the
// ResetCompanyPasswordDevTool import + render line in pages/_app.js.
export default function DevResetPasswordPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    if (isLocalDev()) {
      setAllowed(true);
    } else {
      router.replace("/");
    }
  }, [router]);

  const [companyIdentifier, setCompanyIdentifier] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("Lösenorden matchar inte");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/dev/reset-company-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyIdentifier, newPassword })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Kunde inte återställa lösenordet");
      } else {
        setMessage(`Lösenordet uppdaterat för "${data.company.name}" (id ${data.company.id}). Du kan nu logga in med det nya lösenordet.`);
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setError("Ett fel uppstod. Försök igen.");
    } finally {
      setLoading(false);
    }
  };

  if (!allowed) {
    return null;
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: 20
    }}>
      <div style={{
        maxWidth: 480,
        width: "100%",
        background: "white",
        borderRadius: 12,
        padding: 40,
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
      }}>
        <h2 style={{ textAlign: "center", marginBottom: 8, color: "#1f2937", fontSize: 24, fontWeight: 600 }}>
          🔑 Återställ företagslösenord
        </h2>
        <p style={{ textAlign: "center", color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
          Endast tillgängligt lokalt. Sätter ett nytt lösenord direkt - ingen bekräftelse av det gamla krävs.
        </p>

        {error && (
          <div style={{ background: "#fee2e2", border: "1px solid #fecaca", color: "#dc2626", padding: 12, borderRadius: 6, marginBottom: 20 }}>
            {error}
          </div>
        )}
        {message && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: 12, borderRadius: 6, marginBottom: 20 }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 500, color: "#374151" }}>
              Företags-ID eller namn *
            </label>
            <input
              type="text"
              value={companyIdentifier}
              onChange={(e) => setCompanyIdentifier(e.target.value)}
              required
              style={{ width: "100%", padding: 12, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 16, boxSizing: "border-box" }}
              placeholder="t.ex. 7 eller Restaurant Kungen"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 500, color: "#374151" }}>
              Nytt lösenord *
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={{ width: "100%", padding: 12, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 16, boxSizing: "border-box" }}
              placeholder="Minst 3 tecken"
            />
          </div>

          <div style={{ marginBottom: 30 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 500, color: "#374151" }}>
              Bekräfta nytt lösenord *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{ width: "100%", padding: 12, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 16, boxSizing: "border-box" }}
              placeholder="Samma lösenord igen"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: 14,
              background: loading ? "#9ca3af" : "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Uppdaterar..." : "Sätt nytt lösenord"}
          </button>
        </form>
      </div>
    </div>
  );
}
