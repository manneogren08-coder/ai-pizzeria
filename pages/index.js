import { useState, useRef, useEffect } from "react";

export default function Home() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState(null);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState("info");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordError, setAdminPasswordError] = useState("");
  const [adminPasswordPrompt, setAdminPasswordPrompt] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [companyDetails, setCompanyDetails] = useState({
    support_email: "",
    opening_hours: "",
    closure_info: "",
    menu: "",
    allergens: "",
    routines: "",
    closing_routine: "",
    behavior_guidelines: "",
    staff_roles: "",
    staff_situations: ""
  });
  const chatAreaRef = useRef(null);

  // Restore token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedCompany = localStorage.getItem("company");
    if (savedToken && savedCompany) {
      setToken(savedToken);
      setCompany(JSON.parse(savedCompany));
    }
  }, []);

  // Load company details when admin panel opens
  useEffect(() => {
    if (showAdmin && company && token) {
      fetchCompanyDetails();
    }
  }, [showAdmin, company, token]);

  const fetchCompanyDetails = async () => {
    try {
      const res = await fetch("/api/admin/get-details", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.details) {
        setCompanyDetails(data.details);
      }
    } catch (err) {
      console.error("Failed to fetch details:", err);
    }
  };

  // scroll when chat updates
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [chat, loading]);

  const login = async () => {
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
      body: JSON.stringify({ password })
    });

    const data = await res.json();

    if (!res.ok) {
      setError("Fel lösenord");
      setLoading(false);
      return;
    }

    setToken(data.token);      
    setCompany(data.company);
    localStorage.setItem("token", data.token);
    localStorage.setItem("company", JSON.stringify(data.company));
  } catch (err) {
    setError("Ett fel uppstod. Försök igen.");
  }

  setLoading(false);
};

  const askAI = async () => {
    if (!question.trim() || loading) return;

  const userMessage = question;

  setChat(prev => [...prev, { from: "user", text: userMessage }]);
  setQuestion("");
  setLoading(true);

  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`  // LÄGG TILL DENNA
      },
      body: JSON.stringify({ question: userMessage })  // TA BORT password
    });

    const data = await res.json();

    setChat(prev => [...prev, { from: "ai", text: data.answer }]);
  } catch (error) {
    setChat(prev => [
      ...prev,
      { from: "ai", text: "Ett fel uppstod. Försök igen." }
    ]);
  }

  setLoading(false);
};

const updatePassword = async () => {
  if (!newPassword.trim()) {
    setAdminMessage("Skriv in ett nytt lösenord");
    return;
  }

  setAdminMessage("");
  setAdminLoading(true);

  try {
    const res = await fetch("/api/admin/update-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ newPassword })
    });

    const data = await res.json();

    if (!res.ok) {
      setAdminMessage("❌ " + (data.error || "Fel vid uppdatering"));
      setAdminLoading(false);
      return;
    }

    setAdminMessage("✅ Lösenord uppdaterat!");
    setNewPassword("");
    setTimeout(() => setAdminMessage(""), 3000);
  } catch (err) {
    setAdminMessage("❌ Ett fel uppstod");
  }

  setAdminLoading(false);
};

const updateCompanyDetails = async () => {
  setAdminMessage("");
  setAdminLoading(true);

  try {
    const res = await fetch("/api/admin/update-details", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ details: companyDetails })
    });

    const data = await res.json();

    if (!res.ok) {
      setAdminMessage("❌ " + (data.error || "Fel vid uppdatering"));
      setAdminLoading(false);
      return;
    }

    setAdminMessage("✅ Uppgifter uppdaterade!");
    setTimeout(() => setAdminMessage(""), 3000);
  } catch (err) {
    setAdminMessage("❌ Ett fel uppstod");
  }

  setAdminLoading(false);
};

const toggleCompanyStatus = async () => {
  if (!confirm(`Vill du ${company.active ? 'deaktivera' : 'aktivera'} företaget?`)) {
    return;
  }

  setAdminLoading(true);

  try {
    const res = await fetch("/api/admin/toggle-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!res.ok) {
      setAdminMessage("❌ " + (data.error || "Fel vid statusändring"));
      setAdminLoading(false);
      return;
    }

    // Update local company state
    const updatedCompany = { ...company, active: !company.active };
    setCompany(updatedCompany);
    localStorage.setItem("company", JSON.stringify(updatedCompany));
    
    setAdminMessage(`✅ Företaget är nu ${!company.active ? 'aktiverat' : 'deaktiverat'}`);
    setTimeout(() => setAdminMessage(""), 3000);
  } catch (err) {
    setAdminMessage("❌ Ett fel uppstod");
  }

  setAdminLoading(false);
};

const verifyAdminPassword = async () => {
  if (!adminPassword.trim()) {
    setAdminPasswordError("Ange admin-lösenord");
    return;
  }

  setAdminPasswordError("");
  setAdminLoading(true);

  try {
    const res = await fetch("/api/admin/verify-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ adminPassword })
    });

    const data = await res.json();

    if (!res.ok) {
      setAdminPasswordError("❌ Fel admin-lösenord");
      setAdminLoading(false);
      return;
    }

    // Success! Open admin panel
    setAdminPasswordPrompt(false);
    setShowAdmin(true);
    setAdminPassword("");
  } catch (err) {
    setAdminPasswordError("❌ Ett fel uppstod");
  }

  setAdminLoading(false);
};

const handleAdminClick = () => {
  if (showAdmin) {
    // Close admin panel
    setShowAdmin(false);
  } else {
    // Show password prompt
    setAdminPasswordPrompt(true);
    setAdminPasswordError("");
    setAdminPassword("");
  }
};

  // 🔐 LOGIN PAGE
  if (!company) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginCard} className="loginCard">

          

          <h2 style={{ marginBottom: 6 }}>Intern personalguide</h2>
          <p style={styles.subtitle}>
            Logga in med ert personal-lösenord
          </p>

          <input
            style={styles.input}
            className="chatInput"
            type="password"
            placeholder="Lösenord"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !loading && login()}
            disabled={loading}
          />

          {error && <p style={styles.error}>{error}</p>}

          <button
            style={styles.primaryButton}
            className="primaryButton"
            onClick={login}
            disabled={loading}
          >
            {loading ? "Loggar in..." : "Logga in"}
          </button>

        </div>
      </div>
    );
  }

  // 💬 APP
  return (
    <div style={styles.appContainer}>
      <style jsx>{`
        .loginCard:hover { transform: translateY(-3px); }
        .primaryButton:hover { background: #1e40af; }
        .sendButton:hover { background: #1e40af; }
        .chatInput:focus { border-color: #2563eb; }

        .typing { display: flex; gap: 4px; align-items: center; }
        .typing .dot {
          width: 8px; height: 8px;
          background: #2563eb;
          border-radius: 50%;
          animation: blink 1s infinite alternate;
        }
        .typing .dot:nth-child(2) { animation-delay: 0.2s; }
        .typing .dot:nth-child(3) { animation-delay: 0.4s; }

        @media (max-width: 768px) {
          .typing { display: flex; gap: 4px; }
        }

        @keyframes blink {
          from { opacity: 0.3; }
          to { opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <header style={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>{company.name}</h2>
          <span style={styles.headerSub}>AI Personalguide</span>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {company.is_admin && (
            <button
              style={{
                ...styles.logoutButton,
                background: showAdmin ? "#2563eb" : "#374151"
              }}
              onClick={handleAdminClick}
            >
              {showAdmin ? "Tillbaka" : "⚙️ Admin"}
            </button>
          )}
          <button
            style={styles.logoutButton}
            onClick={() => {
              setCompany(null);
              setToken("");
              setChat([]);
              localStorage.removeItem("token");
              localStorage.removeItem("company");
            }}
          >
            Logga ut
          </button>
        </div>
      </header>

      {adminPasswordPrompt && (
        <div style={styles.modalOverlay} onClick={() => setAdminPasswordPrompt(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Admin-lösenord krävs</h3>
            <p style={{ color: "#6b7280", fontSize: 14 }}>Ange admin-lösenord för att komma åt admin-panelen</p>
            
            <input
              style={styles.input}
              type="password"
              placeholder="Admin-lösenord"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !adminLoading && verifyAdminPassword()}
              disabled={adminLoading}
              autoFocus
            />
            
            {adminPasswordError && (
              <p style={{ color: "#dc2626", fontSize: 14, marginBottom: 12 }}>
                {adminPasswordError}
              </p>
            )}
            
            <div style={{ display: "flex", gap: 12 }}>
              <button
                style={{ ...styles.primaryButton, flex: 1 }}
                onClick={verifyAdminPassword}
                disabled={adminLoading}
              >
                {adminLoading ? "Verifierar..." : "Öppna admin"}
              </button>
              <button
                style={{ ...styles.primaryButton, flex: 1, background: "#6b7280" }}
                onClick={() => setAdminPasswordPrompt(false)}
                disabled={adminLoading}
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdmin ? (
        <>
          <div style={styles.adminPanel}>
            {/* Admin Tabs */}
            <div style={styles.adminTabs}>
              <button
                style={{
                  ...styles.adminTab,
                  ...(adminTab === "info" ? styles.adminTabActive : {})
                }}
                onClick={() => setAdminTab("info")}
              >
                📋 Företagsinfo
              </button>
              <button
                style={{
                  ...styles.adminTab,
                  ...(adminTab === "menu" ? styles.adminTabActive : {})
                }}
                onClick={() => setAdminTab("menu")}
              >
                🍕 Meny & Allergener
              </button>
              <button
                style={{
                  ...styles.adminTab,
                  ...(adminTab === "routines" ? styles.adminTabActive : {})
                }}
                onClick={() => setAdminTab("routines")}
              >
                📝 Rutiner & Regler
              </button>
              <button
                style={{
                  ...styles.adminTab,
                  ...(adminTab === "security" ? styles.adminTabActive : {})
                }}
                onClick={() => setAdminTab("security")}
              >
                🔐 Säkerhet
              </button>
              <button
                style={{
                  ...styles.adminTab,
                  ...(adminTab === "stats" ? styles.adminTabActive : {})
                }}
                onClick={() => setAdminTab("stats")}
              >
                📊 Statistik
              </button>
            </div>

            {/* Admin Content */}
            <div style={styles.adminContent}>
              {adminTab === "info" && (
                <div>
                  <h3 style={{ marginTop: 0 }}>Företagsinformation</h3>
                  
                  <label style={styles.label}>Support E-post</label>
                  <input
                    style={styles.input}
                    type="email"
                    placeholder="support@exempel.se"
                    value={companyDetails.support_email || ""}
                    onChange={e => setCompanyDetails({...companyDetails, support_email: e.target.value})}
                  />

                  <label style={styles.label}>Öppettider</label>
                  <textarea
                    style={{...styles.input, minHeight: 80}}
                    placeholder="Mån-Fre: 10:00-22:00, Lör-Sön: 12:00-23:00"
                    value={companyDetails.opening_hours || ""}
                    onChange={e => setCompanyDetails({...companyDetails, opening_hours: e.target.value})}
                  />

                  <label style={styles.label}>Stängningsinformation</label>
                  <textarea
                    style={{...styles.input, minHeight: 60}}
                    placeholder="Stängt 24-26 dec och 1 jan"
                    value={companyDetails.closure_info || ""}
                    onChange={e => setCompanyDetails({...companyDetails, closure_info: e.target.value})}
                  />

                  {adminMessage && (
                    <p style={{
                      ...styles.adminMessage,
                      color: adminMessage.includes("✅") ? "#059669" : "#dc2626"
                    }}>
                      {adminMessage}
                    </p>
                  )}

                  <button
                    style={styles.primaryButton}
                    onClick={updateCompanyDetails}
                    disabled={adminLoading}
                  >
                    {adminLoading ? "Sparar..." : "Spara ändringar"}
                  </button>
                </div>
              )}

              {adminTab === "menu" && (
                <div>
                  <h3 style={{ marginTop: 0 }}>Meny & Allergener</h3>
                  
                  <label style={styles.label}>Meny</label>
                  <textarea
                    style={{...styles.input, minHeight: 120}}
                    placeholder="Lista alla rätter, ingredienser, etc..."
                    value={companyDetails.menu || ""}
                    onChange={e => setCompanyDetails({...companyDetails, menu: e.target.value})}
                  />

                  <label style={styles.label}>Allergener</label>
                  <textarea
                    style={{...styles.input, minHeight: 100}}
                    placeholder="Information om allergener i era rätter..."
                    value={companyDetails.allergens || ""}
                    onChange={e => setCompanyDetails({...companyDetails, allergens: e.target.value})}
                  />

                  {adminMessage && (
                    <p style={{
                      ...styles.adminMessage,
                      color: adminMessage.includes("✅") ? "#059669" : "#dc2626"
                    }}>
                      {adminMessage}
                    </p>
                  )}

                  <button
                    style={styles.primaryButton}
                    onClick={updateCompanyDetails}
                    disabled={adminLoading}
                  >
                    {adminLoading ? "Sparar..." : "Spara ändringar"}
                  </button>
                </div>
              )}

              {adminTab === "routines" && (
                <div>
                  <h3 style={{ marginTop: 0 }}>Rutiner & Regler</h3>
                  
                  <label style={styles.label}>Arbetsrutiner</label>
                  <textarea
                    style={{...styles.input, minHeight: 100}}
                    placeholder="Dagliga rutiner, arbetsuppgifter..."
                    value={companyDetails.routines || ""}
                    onChange={e => setCompanyDetails({...companyDetails, routines: e.target.value})}
                  />

                  <label style={styles.label}>Stängningsrutiner</label>
                  <textarea
                    style={{...styles.input, minHeight: 100}}
                    placeholder="Checklistor för stängning..."
                    value={companyDetails.closing_routine || ""}
                    onChange={e => setCompanyDetails({...companyDetails, closing_routine: e.target.value})}
                  />

                  <label style={styles.label}>Beteenderegler</label>
                  <textarea
                    style={{...styles.input, minHeight: 100}}
                    placeholder="Regler för personal..."
                    value={companyDetails.behavior_guidelines || ""}
                    onChange={e => setCompanyDetails({...companyDetails, behavior_guidelines: e.target.value})}
                  />

                  <label style={styles.label}>Personalroller</label>
                  <textarea
                    style={{...styles.input, minHeight: 100}}
                    placeholder="Olika roller och ansvar..."
                    value={companyDetails.staff_roles || ""}
                    onChange={e => setCompanyDetails({...companyDetails, staff_roles: e.target.value})}
                  />

                  <label style={styles.label}>Personalsituationer</label>
                  <textarea
                    style={{...styles.input, minHeight: 100}}
                    placeholder="Hantera olika situationer..."
                    value={companyDetails.staff_situations || ""}
                    onChange={e => setCompanyDetails({...companyDetails, staff_situations: e.target.value})}
                  />

                  {adminMessage && (
                    <p style={{
                      ...styles.adminMessage,
                      color: adminMessage.includes("✅") ? "#059669" : "#dc2626"
                    }}>
                      {adminMessage}
                    </p>
                  )}

                  <button
                    style={styles.primaryButton}
                    onClick={updateCompanyDetails}
                    disabled={adminLoading}
                  >
                    {adminLoading ? "Sparar..." : "Spara ändringar"}
                  </button>
                </div>
              )}

              {adminTab === "security" && (
                <div>
                  <h3 style={{ marginTop: 0 }}>Säkerhet & Åtkomst</h3>
                  
                  <div style={{ background: "#f3f4f6", padding: 16, borderRadius: 8, marginBottom: 20 }}>
                    <p style={{ margin: 0, fontSize: 14 }}>
                      <strong>Status:</strong> Företaget är {company.active ? "aktiverat ✅" : "deaktiverat ❌"}
                    </p>
                  </div>

                  <button
                    style={{
                      ...styles.primaryButton,
                      background: company.active ? "#dc2626" : "#059669",
                      marginBottom: 24
                    }}
                    onClick={toggleCompanyStatus}
                    disabled={adminLoading}
                  >
                    {company.active ? "Deaktivera företag" : "Aktivera företag"}
                  </button>

                  <h4>Byt lösenord</h4>
                  <input
                    style={styles.input}
                    type="password"
                    placeholder="Nytt lösenord"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    disabled={adminLoading}
                  />

                  {adminMessage && (
                    <p style={{
                      ...styles.adminMessage,
                      color: adminMessage.includes("✅") ? "#059669" : "#dc2626"
                    }}>
                      {adminMessage}
                    </p>
                  )}

                  <button
                    style={styles.primaryButton}
                    onClick={updatePassword}
                    disabled={adminLoading}
                  >
                    {adminLoading ? "Uppdaterar..." : "Uppdatera lösenord"}
                  </button>
                </div>
              )}

              {adminTab === "stats" && (
                <div>
                  <h3 style={{ marginTop: 0 }}>Statistik</h3>
                  
                  <button
                    style={{ ...styles.primaryButton, marginBottom: 24, fontSize: 13 }}
                    onClick={fetchCompanyDetails}
                    disabled={adminLoading}
                  >
                    🔄 Uppdatera statistik
                  </button>

                  <div style={styles.statCard}>
                    <div style={styles.statNumber}>{companyDetails.query_count || 0}</div>
                    <div style={styles.statLabel}>Totalt antal frågor</div>
                  </div>

                  <div style={styles.statCard}>
                    <div style={styles.statNumber}>{company.is_admin ? "Ja" : "Nej"}</div>
                    <div style={styles.statLabel}>Admin-behörighet</div>
                  </div>

                  <div style={styles.statCard}>
                    <div style={styles.statNumber}>{company.active ? "Aktiv" : "Inaktiv"}</div>
                    <div style={styles.statLabel}>Företagsstatus</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={styles.chatArea}>
            {chat.map((msg, i) => (
              <div
                key={i}
                style={
                  msg.from === "user"
                    ? styles.userBubble
                    : styles.aiBubble
                }
              >
                {msg.text}
              </div>
            ))}

            {loading && (
              <div style={styles.aiBubble} className="typing">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            )}
          </div>

          <div style={styles.inputArea}>
            <input
              style={styles.chatInput}
              className="chatInput"
              placeholder="Ställ en fråga till personalguiden..."
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === "Enter" && askAI()}
              disabled={loading}
              autoComplete="off"
            />

            <button
              style={styles.sendButton}
              className="sendButton"
              onClick={askAI}
              disabled={loading}
            >
              Skicka
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  loginPage: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #eef2ff, #f8fafc)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },

  loginCard: {
    background: "#ffffff",
    padding: 40,
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
    boxShadow: "0 30px 80px rgba(0,0,0,0.08)",
    textAlign: "center",
    boxSizing: "border-box",
    transition: "transform 0.2s",
  },

  logoBox: {
    width: 70,
    height: 70,
    borderRadius: 20,
    background: "#2563eb",
    color: "#fff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 32,
    margin: "0 auto 20px auto"
  },

  subtitle: {
    marginBottom: 24,
    color: "#6b7280",
    fontSize: 14
  },

  input: {
    width: "100%",
    padding: 14,
    fontSize: 16,
    borderRadius: 12,
    border: "1px solid #d1d5db",
    marginBottom: 16,
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.2s"
  },

  primaryButton: {
    width: "100%",
    padding: 14,
    fontSize: 16,
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 600,
    transition: "background 0.2s, transform 0.1s"
  },

  error: {
    color: "#dc2626",
    marginBottom: 12,
    fontSize: 14
  },

  appContainer: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "#f3f4f6"
  },

  header: {
    padding: "18px 28px",
    background: "#111827",
    color: "#fff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },

  headerSub: {
    fontSize: 13,
    color: "#9ca3af"
  },

  logoutButton: {
    background: "#374151",
    border: "none",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: 8,
    cursor: "pointer"
  },

  chatArea: {
    flex: 1,
    overflowY: "auto",
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 14
  },

  userBubble: {
    alignSelf: "flex-end",
    background: "#2563eb",
    color: "#fff",
    padding: 14,
    borderRadius: 16,
    maxWidth: "70%",
    animation: "fadeIn 0.2s"
  },

  aiBubble: {
    alignSelf: "flex-start",
    background: "#ffffff",
    padding: 14,
    borderRadius: 16,
    maxWidth: "70%",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    animation: "fadeIn 0.2s"
  },

  inputArea: {
    display: "flex",
    padding: 18,
    borderTop: "1px solid #e5e7eb",
    background: "#ffffff"
  },

  chatInput: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    borderRadius: 12,
    border: "1px solid #d1d5db",
    marginRight: 12,
    boxSizing: "border-box"
  },

  sendButton: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "0 24px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 600
  },

  adminPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: "#f3f4f6",
    width: "100%",
    boxSizing: "border-box",
    overflow: "hidden"
  },

  adminTabs: {
    display: "flex",
    gap: 8,
    padding: "16px 24px",
    background: "#fff",
    borderBottom: "1px solid #e5e7eb",
    overflowX: "auto",
    flexShrink: 0
  },

  adminTab: {
    padding: "8px 16px",
    border: "none",
    background: "transparent",
    color: "#6b7280",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    borderRadius: 8,
    whiteSpace: "nowrap",
    transition: "all 0.2s"
  },

  adminTabActive: {
    background: "#2563eb",
    color: "#fff"
  },

  adminContent: {
    flex: 1,
    padding: 32,
    maxWidth: 800,
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box"
  },

  label: {
    display: "block",
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 8,
    marginTop: 16
  },

  adminMessage: {
    paddingBottom: 12,
    fontSize: 14,
    fontWeight: 500,
    marginBottom: 16
  },

  statCard: {
    background: "#fff",
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    textAlign: "center"
  },

  statNumber: {
    fontSize: 36,
    fontWeight: 700,
    color: "#2563eb",
    marginBottom: 8
  },

  statLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: 500
  },

  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000
  },

  modalContent: {
    background: "#fff",
    padding: 32,
    borderRadius: 16,
    maxWidth: 400,
    width: "90%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
  }
};