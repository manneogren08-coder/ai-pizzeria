import { useEffect, useRef, useState } from "react";

// The login form previously embedded in the marketing homepage
// (id="login-section"), moved here so restaurant staff can reach
// /staffguide/login directly instead of scrolling through the whole
// marketing page first. Behavior is unchanged - same two API routes,
// same JWT + localStorage persistence pattern the rest of the app
// relies on (see lib/staffguide/session.js).
//
// token/company/userRole are intentionally NOT kept as local state
// here (unlike the original inline version) - this component's only
// job is to authenticate and hand off via onLoginSuccess(); the actual
// session is read fresh from localStorage by the dashboard page on its
// own mount, so keeping duplicate state here would just be unused.
//
// toast/loading/error are now this component's own, previously shared
// with the app's chat `loading`/unrelated `toast` state in the
// monolithic page - as a side effect this also fixes a pre-existing
// bug where the "code sent"/"logged in" toast was never visible,
// because its render markup only existed in the app branch while these
// functions fired before `company` was set.

export default function StaffguideLogin({ onLoginSuccess }) {
  const [loginMode, setLoginMode] = useState("company");
  const [companyIdentifier, setCompanyIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [employeeLoginStep, setEmployeeLoginStep] = useState("request");
  const [codeRequestTime, setCodeRequestTime] = useState(null);
  const [showLoginButton, setShowLoginButton] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ text: "", type: "success", visible: false });
  const toastTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Timer for showing login button after 30 seconds
  useEffect(() => {
    if (codeRequestTime && employeeLoginStep === "request") {
      const timer = setTimeout(() => {
        setShowLoginButton(true);
      }, 30000); // 30 seconds

      return () => clearTimeout(timer);
    }
  }, [codeRequestTime, employeeLoginStep]);

  const showToast = (text, type = "success") => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast({ text, type, visible: true });
    toastTimerRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 2600);
  };

  const login = async () => {
    if (!companyIdentifier.trim()) {
      setError("Skriv in restaurangens namn");
      return;
    }

    if (!password.trim()) {
      setError("Skriv in lösenord");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, companyIdentifier })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Fel företagskod eller lösenord");
        setLoading(false);
        return;
      }

      // Set role to 'owner' for company login
      const companyWithOwner = {
        ...data.company,
        role: 'owner'
      };

      localStorage.setItem("token", data.token);
      localStorage.setItem("company", JSON.stringify(companyWithOwner));
      onLoginSuccess();
    } catch {
      setError("Ett fel uppstod. Försök igen.");
    }

    setLoading(false);
  };

  const requestEmployeeCode = async () => {
    if (!employeeEmail.trim()) {
      setError("Ange din e-postadress");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(employeeEmail.trim())) {
      setError("Ange en giltig e-postadress");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/employee/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: employeeEmail.trim().toLowerCase()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Kunde inte skicka kod");
        setLoading(false);
        return;
      }

      if (res.ok) {
        setEmployeeLoginStep("code");
        setCodeRequestTime(Date.now());
        setShowLoginButton(false);
        setEmployeeCode("");
        setError("");
        const debugHint = data?.debugCode ? ` Testkod: ${data.debugCode}` : "";
        showToast(`Kod skickad till ${employeeEmail}.${debugHint}`, "info");
      } else {
        setError("Ett fel uppstod. Försök igen.");
      }

      setLoading(false);
    } catch {
      setError("Ett fel uppstod. Försök igen.");
    }

    setLoading(false);
  };

  const loginWithEmployeeCode = async () => {
    if (!employeeEmail.trim()) {
      setError("Ange din e-postadress");
      return;
    }

    if (!employeeCode.trim()) {
      setError("Ange engångskoden");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/employee/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: employeeEmail.trim().toLowerCase(), code: employeeCode.trim() })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Felaktig kod");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("company", JSON.stringify(data.company));

      showToast(`Inloggad som ${data.company.name}`, "success");
      onLoginSuccess();
    } catch {
      setError("Ett fel uppstod. Försök igen.");
    }

    setLoading(false);
  };

  return (
    <div style={styles.loginRow} className="loginRow">
      <div style={styles.loginCard} className="loginCard">
        <h2 style={{ marginBottom: 6, color: "#0f172a" }}>Intern personalguide</h2>
        <p style={styles.subtitle}>Välj inloggningssätt</p>

        <div style={styles.loginModeRow}>
          <button
            type="button"
            style={{
              ...styles.loginModeButton,
              ...(loginMode === "company" ? styles.loginModeButtonActive : {})
            }}
            onClick={() => {
              setLoginMode("company");
              setError("");
            }}
            disabled={loading}
          >
            Företag
          </button>
          <button
            type="button"
            style={{
              ...styles.loginModeButton,
              ...(loginMode === "employee" ? styles.loginModeButtonActive : {})
            }}
            onClick={() => {
              setLoginMode("employee");
              setError("");
            }}
            disabled={loading}
          >
            Anställd
          </button>
        </div>

        {loginMode === "company" && (
          <input
            style={{ ...styles.input, border: "1.5px solid #cbd5e1", background: "#fafbfc", color: "#0f172a" }}
            className="chatInput"
            type="text"
            placeholder="Restaurangens namn"
            value={companyIdentifier}
            onChange={e => setCompanyIdentifier(e.target.value)}
            disabled={loading}
          />
        )}

        {loginMode === "company" && (
          <input
            style={{ ...styles.input, border: "1.5px solid #cbd5e1", background: "#fafbfc", color: "#0f172a" }}
            className="chatInput"
            type="password"
            placeholder="Restaurangens lösenord"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => {
              if (e.key !== "Enter" || loading) return;
              if (loginMode === "company") {
                login();
              } else {
                loginWithEmployeeCode();
              }
            }}
            disabled={loading}
          />
        )}

        {loginMode === "employee" && (
          <>
            {employeeLoginStep === "request" ? (
              <>
                <input
                  style={{ ...styles.input, border: "1.5px solid #cbd5e1", background: "#fafbfc", color: "#0f172a" }}
                  className="chatInput"
                  type="email"
                  placeholder="Din e-post"
                  value={employeeEmail}
                  onChange={e => setEmployeeEmail(e.target.value)}
                  disabled={loading}
                />

                <button
                  style={{ ...styles.secondaryButton, width: "100%", marginBottom: 10, background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}
                  onClick={requestEmployeeCode}
                  disabled={loading || employeeLoginStep === "code"}
                >
                  {loading ? "Skickar kod..." : "Skicka engångskod"}
                </button>
              </>
            ) : (
              <>
                <input
                  style={{ ...styles.input, border: "1.5px solid #cbd5e1", background: "#fafbfc", color: "#0f172a" }}
                  className="chatInput"
                  type="text"
                  placeholder="Engångskod"
                  value={employeeCode}
                  onChange={e => setEmployeeCode(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !loading && loginWithEmployeeCode()}
                  disabled={loading}
                  autoFocus
                />

                <button
                  style={{ ...styles.secondaryButton, width: "100%", marginBottom: 10, background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}
                  onClick={() => {
                    setEmployeeLoginStep("request");
                    setCodeRequestTime(null);
                    setShowLoginButton(false);
                  }}
                  disabled={loading}
                >
                  Tillbaka
                </button>
              </>
            )}
          </>
        )}

        {error && <p style={styles.error}>{error}</p>}

        {!(loginMode === "employee" && employeeLoginStep === "request") && (
          <button
            style={{ ...styles.primaryButton, background: "#2563eb", color: "#fff" }}
            className="primaryButton"
            onClick={loginMode === "company" ? login : loginWithEmployeeCode}
            disabled={loading}
          >
            {loading ? "Loggar in..." : "Logga in"}
          </button>
        )}

        {showLoginButton && employeeLoginStep === "code" && (
          <p style={styles.helperText}>
            Fick du ingen kod? Kontrollera skräpposten, eller gå tillbaka och försök igen.
          </p>
        )}
      </div>

      {toast.visible && (
        <div style={{ ...styles.toast, ...(toast.type === "error" ? styles.toastError : toast.type === "info" ? styles.toastInfo : {}) }}>
          {toast.text}
        </div>
      )}

      <style jsx>{`
        .primaryButton:hover { background: #1e40af !important; }
        .loginCard:hover { transform: translateY(-3px); }
        input:focus, textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }
        @media (max-width: 700px) {
          .loginCard {
            padding: 25px 18px 18px !important;
            border-radius: 14px !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  loginRow: {
    display: "flex",
    justifyContent: "center",
    padding: "16px"
  },
  loginCard: {
    background: "#ffffff",
    padding: "35px 30px 30px",
    borderRadius: 16,
    width: "100%",
    maxWidth: 430,
    boxShadow: "0 10px 24px rgba(37,99,235,0.08)",
    border: "1px solid #dbeafe",
    textAlign: "center",
    boxSizing: "border-box",
    transition: "transform 0.2s, box-shadow 0.2s"
  },
  subtitle: {
    marginBottom: 24,
    color: "#475569",
    fontSize: 14,
    fontWeight: 600
  },
  loginModeRow: {
    display: "flex",
    gap: 8,
    marginBottom: 14
  },
  loginModeButton: {
    flex: 1,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    padding: "10px 16px",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s ease-in-out"
  },
  loginModeButtonActive: {
    background: "#2563eb",
    color: "#fff",
    borderColor: "#2563eb",
    transition: "all 0.2s ease-in-out"
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 16,
    borderRadius: 10,
    marginBottom: 12,
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease"
  },
  primaryButton: {
    width: "100%",
    padding: 12,
    fontSize: 16,
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
    minHeight: 48,
    transition: "background 0.2s, transform 0.1s, box-shadow 0.2s",
    boxShadow: "0 2px 8px rgba(37,99,235,0.18)"
  },
  secondaryButton: {
    width: "auto",
    padding: 12,
    fontSize: 15,
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
    minHeight: 48,
    transition: "background 0.15s, transform 0.1s"
  },
  error: {
    color: "#dc2626",
    marginBottom: 12,
    fontSize: 14
  },
  helperText: {
    color: "#6b7280",
    fontSize: 13,
    marginTop: 12
  },
  toast: {
    position: "fixed",
    top: 18,
    right: 18,
    zIndex: 2000,
    background: "#059669",
    color: "#fff",
    padding: "11px 14px",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 14,
    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
    maxWidth: 360
  },
  toastError: {
    background: "#dc2626"
  },
  toastInfo: {
    background: "#1d4ed8"
  }
};
