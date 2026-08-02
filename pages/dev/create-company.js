import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { isLocalDev } from "../../lib/isLocalDev";

// Local-development-only company creation tool. Calls
// pages/api/dev/create-company.js (a separate endpoint from the
// public/shared pages/api/admin/setup-company.js), so the regular
// company-creation flow (pages/setup.js + components/CompanySetup.js) is
// completely untouched. The only functional difference from that flow: you
// choose the admin-panel password yourself here instead of it being
// randomly generated.
//
// To remove this tool entirely later: delete this file, delete
// pages/api/dev/create-company.js, and point CreateCompanyDevTool back at
// /setup (or delete it too) in components/dev/CreateCompanyDevTool.js.
export default function DevCreateCompanyPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    if (isLocalDev()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAllowed(true);
    } else {
      router.replace("/");
    }
  }, [router]);

  const [formData, setFormData] = useState({
    companyName: "",
    companyEmail: "",
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
    confirmPassword: "",
    adminPassword: "",
    confirmAdminPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.ownerPassword !== formData.confirmPassword) {
      setError("Inloggningslösenorden matchar inte");
      return;
    }

    if (formData.adminPassword !== formData.confirmAdminPassword) {
      setError("Adminlösenorden matchar inte");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/dev/create-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: formData.companyName,
          companyEmail: formData.companyEmail,
          ownerName: formData.ownerName,
          ownerEmail: formData.ownerEmail,
          ownerPassword: formData.ownerPassword,
          adminPassword: formData.adminPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Kunde inte skapa företag");
        setLoading(false);
        return;
      }

      setResult(data);
      setLoading(false);
    } catch {
      setError("Ett fel uppstod. Försök igen.");
      setLoading(false);
    }
  };

  if (!allowed) {
    return null;
  }

  if (result) {
    return (
      <div style={pageWrapStyle}>
        <div style={cardStyle}>
          <h1 style={{ textAlign: "center", marginBottom: 20, color: "#1f2937", fontSize: 28, fontWeight: 700 }}>
            Företag skapat! 🎉
          </h1>
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: 20, marginBottom: 20 }}>
            <h2 style={{ margin: "0 0 10px", color: "#166534", fontSize: 18 }}>{result.company.name}</h2>
            <p style={{ margin: "0 0 5px", color: "#6b7280", fontSize: 14 }}>
              Företags-ID: <strong>{result.company.id}</strong>
            </p>
            <p style={{ margin: "0 0 5px", color: "#6b7280", fontSize: 14 }}>
              E-post: <strong>{result.company.email}</strong>
            </p>
            <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
              Ägare: <strong>{result.owner.name}</strong> ({result.owner.email})
            </p>
          </div>
          <p style={{ textAlign: "center", color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
            Logga in med företags-ID/namn och inloggningslösenordet du valde. Öppna admin-panelen med adminlösenordet du valde.
          </p>
          <div style={{ textAlign: "center" }}>
            <Link href="/" style={linkButtonStyle}>Gå till inloggning</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageWrapStyle}>
      <div style={cardStyle}>
        <h2 style={{ textAlign: "center", marginBottom: 8, color: "#1f2937", fontSize: 24, fontWeight: 600 }}>
          🛠️ Skapa testföretag
        </h2>
        <p style={{ textAlign: "center", color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
          Endast tillgängligt lokalt.
        </p>

        {error && <div style={errorBoxStyle}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <FormField label="Företagsnamn *" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="t.ex. Restaurant Kungen" />
          <FormField label="Företagse-post *" name="companyEmail" type="email" value={formData.companyEmail} onChange={handleChange} placeholder="foretag@exempel.com" />
          <FormField label="Ditt namn (ägare) *" name="ownerName" value={formData.ownerName} onChange={handleChange} placeholder="Anna Andersson" />
          <FormField label="Din e-post (ägare) *" name="ownerEmail" type="email" value={formData.ownerEmail} onChange={handleChange} placeholder="din.epost@exempel.com" />
          <FormField label="Inloggningslösenord *" name="ownerPassword" type="password" value={formData.ownerPassword} onChange={handleChange} placeholder="Minst 8 tecken" />
          <FormField label="Bekräfta inloggningslösenord *" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="Samma lösenord igen" />
          <FormField label="Adminlösenord *" name="adminPassword" type="password" value={formData.adminPassword} onChange={handleChange} placeholder="Lösenord för admin-panelen" />
          <FormField label="Bekräfta adminlösenord *" name="confirmAdminPassword" type="password" value={formData.confirmAdminPassword} onChange={handleChange} placeholder="Samma lösenord igen" last />

          <button type="submit" disabled={loading} style={submitButtonStyle(loading)}>
            {loading ? "Skapar företag..." : "Skapa företag"}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: "center", fontSize: 14, color: "#6b7280" }}>
          <p style={{ margin: 0 }}>* Obligatoriska fält</p>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, name, value, onChange, placeholder, type = "text", last = false }) {
  return (
    <div style={{ marginBottom: last ? 30 : 20 }}>
      <label style={{ display: "block", marginBottom: 8, fontWeight: 500, color: "#374151" }}>{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required
        style={{ width: "100%", padding: 12, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 16, boxSizing: "border-box" }}
        placeholder={placeholder}
      />
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

const linkButtonStyle = {
  display: "inline-block",
  padding: "12px 24px",
  background: "#3b82f6",
  color: "white",
  textDecoration: "none",
  borderRadius: 6,
  fontSize: 16,
  fontWeight: 600
};

function submitButtonStyle(loading) {
  return {
    width: "100%",
    padding: 14,
    background: loading ? "#9ca3af" : "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: 6,
    fontSize: 16,
    fontWeight: 600,
    cursor: loading ? "not-allowed" : "pointer"
  };
}
