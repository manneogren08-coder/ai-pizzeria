import { useState, useRef, useEffect } from "react";

export default function Home() {
  const emptyDetails = {
    support_email: "",
    opening_hours: "",
    closure_info: "",
    menu: "",
    allergens: "",
    routines: "",
    opening_routine: "",
    closing_routine: "",
    behavior_guidelines: "",
    staff_roles: "",
    staff_situations: ""
  };

  const tabFieldMap = {
    info: ["support_email", "opening_hours", "closure_info"],
    menu: ["menu", "allergens"],
    routines: ["routines", "opening_routine", "closing_routine", "behavior_guidelines", "staff_roles", "staff_situations"]
  };

  const quickQuestions = ["Visa hela menyn", "Vilka allergener finns?", "Vad är öppettiderna?", "Vad är öppningsrutinen?"];

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
  const [companyDetails, setCompanyDetails] = useState(emptyDetails);
  const [savedCompanyDetails, setSavedCompanyDetails] = useState(emptyDetails);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [toast, setToast] = useState({ text: "", type: "success", visible: false });
  const chatAreaRef = useRef(null);
  const toastTimerRef = useRef(null);

  const showToast = (text, type = "success") => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast({ text, type, visible: true });
    toastTimerRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 2600);
  };

  const isTabDirty = (tab) => {
    const fields = tabFieldMap[tab] || [];
    return fields.some(field => (companyDetails[field] || "") !== (savedCompanyDetails[field] || ""));
  };

  const resetCurrentTab = () => {
    const fields = tabFieldMap[adminTab] || [];
    if (fields.length === 0) {
      return;
    }

    const nextDetails = { ...companyDetails };
    fields.forEach((field) => {
      nextDetails[field] = savedCompanyDetails[field] || "";
    });
    setCompanyDetails(nextDetails);
    showToast("Ändringar återställda", "info");
  };

  const formatAiAnswer = (answer) => {
    if (typeof answer !== "string") return "";
    const trimmed = answer.trim();
    if (trimmed.length < 520 || trimmed.includes("\n\n") || trimmed.includes("**")) {
      return trimmed;
    }

    const lower = trimmed.toLowerCase();
    if (!/(meny|allergen|rutin|öppettid|kontakt)/i.test(lower)) {
      return trimmed;
    }

    const chunks = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed];
    if (chunks.length < 6) {
      return trimmed;
    }

    const sectionSize = Math.ceil(chunks.length / 3);
    const sections = [
      { title: "Meny", body: chunks.slice(0, sectionSize) },
      { title: "Rutiner", body: chunks.slice(sectionSize, sectionSize * 2) },
      { title: "Kontakt", body: chunks.slice(sectionSize * 2) }
    ];

    return sections
      .filter(section => section.body.length)
      .map(section => `${section.title}:\n${section.body.join(" ").trim()}`)
      .join("\n\n");
  };

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
        setSavedCompanyDetails(data.details);
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

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

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

  const askAI = async (presetQuestion) => {
    const userMessage = (presetQuestion || question).trim();
    if (!userMessage || loading) return;

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

    setChat(prev => [...prev, { from: "ai", text: formatAiAnswer(data.answer) }]);
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
    showToast("Skriv in ett nytt lösenord", "error");
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
      const errorText = data.details ? `${data.error || "Fel vid uppdatering"} (${data.details})` : (data.error || "Fel vid uppdatering");
      setAdminMessage("❌ " + errorText);
      showToast(errorText, "error");
      setAdminLoading(false);
      return;
    }

    setAdminMessage("✅ Lösenord uppdaterat!");
    showToast("Lösenord uppdaterat", "success");
    setNewPassword("");
    setTimeout(() => setAdminMessage(""), 3000);
  } catch (err) {
    setAdminMessage("❌ Ett fel uppstod");
    showToast("Ett fel uppstod", "error");
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
      const errorText = data.details ? `${data.error || "Fel vid uppdatering"} (${data.details})` : (data.error || "Fel vid uppdatering");
      setAdminMessage("❌ " + errorText);
      showToast(errorText, "error");
      setAdminLoading(false);
      return;
    }

    setAdminMessage("✅ Uppgifter uppdaterade!");
    setSavedCompanyDetails(companyDetails);
    setLastSavedAt(new Date());
    showToast("Ändringar sparade", "success");
    setTimeout(() => setAdminMessage(""), 3000);
  } catch (err) {
    setAdminMessage("❌ Ett fel uppstod");
    showToast("Ett fel uppstod", "error");
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
      showToast(data.error || "Fel vid statusändring", "error");
      setAdminLoading(false);
      return;
    }

    // Update local company state
    const updatedCompany = { ...company, active: !company.active };
    setCompany(updatedCompany);
    localStorage.setItem("company", JSON.stringify(updatedCompany));
    
    setAdminMessage(`✅ Företaget är nu ${!company.active ? 'aktiverat' : 'deaktiverat'}`);
    showToast(`Företaget är nu ${!company.active ? 'aktiverat' : 'deaktiverat'}`, "success");
    setTimeout(() => setAdminMessage(""), 3000);
  } catch (err) {
    setAdminMessage("❌ Ett fel uppstod");
    showToast("Ett fel uppstod", "error");
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
        input:focus, textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }
        .adminSectionCard {
          background: #fff;
          border-radius: 14px;
          padding: 18px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .adminSectionCard:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.08);
        }
        .quickActionButton:hover { background: #e0ebff; }

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
          .adminTabsBar { padding: 12px 12px !important; gap: 6px !important; }
          .quickActionWrap { padding: 8px 12px !important; }
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
      {toast.visible && (
        <div
          style={{
            ...styles.toast,
            ...(toast.type === "error" ? styles.toastError : {}),
            ...(toast.type === "info" ? styles.toastInfo : {})
          }}
        >
          {toast.text}
        </div>
      )}
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
            <div style={styles.adminTabs} className="adminTabsBar">
              <button
                style={{
                  ...styles.adminTab,
                  ...(adminTab === "info" ? styles.adminTabActive : {})
                }}
                className="adminTabButton"
                onClick={() => setAdminTab("info")}
              >
                📋 Företagsinfo
                {isTabDirty("info") && <span style={styles.tabDirtyDot}>●</span>}
              </button>
              <button
                style={{
                  ...styles.adminTab,
                  ...(adminTab === "menu" ? styles.adminTabActive : {})
                }}
                className="adminTabButton"
                onClick={() => setAdminTab("menu")}
              >
                🍕 Meny & Allergener
                {isTabDirty("menu") && <span style={styles.tabDirtyDot}>●</span>}
              </button>
              <button
                style={{
                  ...styles.adminTab,
                  ...(adminTab === "routines" ? styles.adminTabActive : {})
                }}
                className="adminTabButton"
                onClick={() => setAdminTab("routines")}
              >
                📝 Rutiner & Regler
                {isTabDirty("routines") && <span style={styles.tabDirtyDot}>●</span>}
              </button>
              <button
                style={{
                  ...styles.adminTab,
                  ...(adminTab === "security" ? styles.adminTabActive : {})
                }}
                className="adminTabButton"
                onClick={() => setAdminTab("security")}
              >
                🔐 Säkerhet
              </button>
              <button
                style={{
                  ...styles.adminTab,
                  ...(adminTab === "stats" ? styles.adminTabActive : {})
                }}
                className="adminTabButton"
                onClick={() => setAdminTab("stats")}
              >
                📊 Statistik
              </button>
            </div>

            {/* Admin Content */}
            <div style={styles.adminContent}>
              {lastSavedAt && (
                <p style={styles.lastSavedText}>
                  Senast uppdaterad: {lastSavedAt.toLocaleString("sv-SE")}
                </p>
              )}
              {adminTab === "info" && (
                <div className="adminSectionCard">
                  <h3 style={{ marginTop: 0 }}>Företagsinformation</h3>
                  <p style={styles.helperText}>Exempel: supportmail, öppettider och eventuell stängningsinfo.</p>
                  
                  <label style={styles.label}>Support E-post</label>
                  <input
                    style={styles.input}
                    type="email"
                    placeholder="t.ex. support@restaurang.se"
                    value={companyDetails.support_email || ""}
                    onChange={e => setCompanyDetails({...companyDetails, support_email: e.target.value})}
                  />

                  <label style={styles.label}>Öppettider</label>
                  <textarea
                    style={{...styles.input, minHeight: 80}}
                    placeholder="t.ex. Mån-Fre 10-22"
                    value={companyDetails.opening_hours || ""}
                    onChange={e => setCompanyDetails({...companyDetails, opening_hours: e.target.value})}
                  />

                  <label style={styles.label}>Stängningsinformation</label>
                  <textarea
                    style={{...styles.input, minHeight: 60}}
                    placeholder="t.ex. Stängt röda dagar"
                    value={companyDetails.closure_info || ""}
                    onChange={e => setCompanyDetails({...companyDetails, closure_info: e.target.value})}
                  />

                  <div style={styles.adminActionBar}>
                    <button
                      style={{ ...styles.secondaryButton, flex: 1 }}
                      onClick={resetCurrentTab}
                      disabled={!isTabDirty("info") || adminLoading}
                    >
                      Återställ
                    </button>
                    <button
                      style={{ ...styles.primaryButton, flex: 1, width: "auto" }}
                      onClick={updateCompanyDetails}
                      disabled={!isTabDirty("info") || adminLoading}
                    >
                      {adminLoading ? "Sparar..." : "Spara ändringar"}
                    </button>
                  </div>
                </div>
              )}

              {adminTab === "menu" && (
                <div className="adminSectionCard">
                  <h3 style={{ marginTop: 0 }}>Meny & Allergener</h3>
                  <p style={styles.helperText}>Exempel: kategori + rätt + pris + kort beskrivning.</p>
                  
                  <label style={styles.label}>Meny</label>
                  <textarea
                    style={{...styles.input, minHeight: 120}}
                    placeholder="t.ex. Förrätt: Toast Skagen - 145 kr"
                    value={companyDetails.menu || ""}
                    onChange={e => setCompanyDetails({...companyDetails, menu: e.target.value})}
                  />

                  <label style={styles.label}>Allergener</label>
                  <textarea
                    style={{...styles.input, minHeight: 100}}
                    placeholder="t.ex. Innehåller gluten, mjölk, nötter"
                    value={companyDetails.allergens || ""}
                    onChange={e => setCompanyDetails({...companyDetails, allergens: e.target.value})}
                  />

                  <div style={styles.adminActionBar}>
                    <button
                      style={{ ...styles.secondaryButton, flex: 1 }}
                      onClick={resetCurrentTab}
                      disabled={!isTabDirty("menu") || adminLoading}
                    >
                      Återställ
                    </button>
                    <button
                      style={{ ...styles.primaryButton, flex: 1, width: "auto" }}
                      onClick={updateCompanyDetails}
                      disabled={!isTabDirty("menu") || adminLoading}
                    >
                      {adminLoading ? "Sparar..." : "Spara ändringar"}
                    </button>
                  </div>
                </div>
              )}

              {adminTab === "routines" && (
                <div className="adminSectionCard">
                  <h3 style={{ marginTop: 0 }}>Rutiner & Regler</h3>
                  <p style={styles.helperText}>Exempel: korta punktlistor för öppning, stängning och personalsituationer.</p>
                  
                  <label style={styles.label}>Arbetsrutiner</label>
                  <textarea
                    style={{...styles.input, minHeight: 80}}
                    placeholder="t.ex. Starta kassan, fyll på stationer"
                    value={companyDetails.routines || ""}
                    onChange={e => setCompanyDetails({...companyDetails, routines: e.target.value})}
                  />

                  <label style={styles.label}>Öppningsrutiner</label>
                  <textarea
                    style={{...styles.input, minHeight: 80}}
                    placeholder="t.ex. Ugn 250°, deg ut 30 min innan"
                    value={companyDetails.opening_routine || ""}
                    onChange={e => setCompanyDetails({...companyDetails, opening_routine: e.target.value})}
                  />

                  <label style={styles.label}>Stängningsrutiner</label>
                  <textarea
                    style={{...styles.input, minHeight: 80}}
                    placeholder="t.ex. Stäng kassan, rengör alla ytor"
                    value={companyDetails.closing_routine || ""}
                    onChange={e => setCompanyDetails({...companyDetails, closing_routine: e.target.value})}
                  />

                  <label style={styles.label}>Beteenderegler</label>
                  <textarea
                    style={{...styles.input, minHeight: 80}}
                    placeholder="t.ex. Mobil endast på rast"
                    value={companyDetails.behavior_guidelines || ""}
                    onChange={e => setCompanyDetails({...companyDetails, behavior_guidelines: e.target.value})}
                  />

                  <label style={styles.label}>Personalroller</label>
                  <textarea
                    style={{...styles.input, minHeight: 80}}
                    placeholder="t.ex. Kassa, kök, servering"
                    value={companyDetails.staff_roles || ""}
                    onChange={e => setCompanyDetails({...companyDetails, staff_roles: e.target.value})}
                  />

                  <label style={styles.label}>Personalsituationer</label>
                  <textarea
                    style={{...styles.input, minHeight: 80}}
                    placeholder="t.ex. Sen kollega, allergifråga, stress"
                    value={companyDetails.staff_situations || ""}
                    onChange={e => setCompanyDetails({...companyDetails, staff_situations: e.target.value})}
                  />

                  <div style={styles.adminActionBar}>
                    <button
                      style={{ ...styles.secondaryButton, flex: 1 }}
                      onClick={resetCurrentTab}
                      disabled={!isTabDirty("routines") || adminLoading}
                    >
                      Återställ
                    </button>
                    <button
                      style={{ ...styles.primaryButton, flex: 1, width: "auto" }}
                      onClick={updateCompanyDetails}
                      disabled={!isTabDirty("routines") || adminLoading}
                    >
                      {adminLoading ? "Sparar..." : "Spara ändringar"}
                    </button>
                  </div>
                </div>
              )}

              {adminTab === "security" && (
                <div className="adminSectionCard">
                  <h3 style={{ marginTop: 0 }}>Säkerhet & Åtkomst</h3>
                  <p style={styles.helperText}>Hantera åtkomst och byt lösenord vid behov.</p>
                  
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
                <div className="adminSectionCard">
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

          <div style={styles.quickActions} className="quickActionWrap">
            {quickQuestions.map((quickQuestion) => (
              <button
                key={quickQuestion}
                style={styles.quickActionButton}
                className="quickActionButton"
                onClick={() => askAI(quickQuestion)}
                disabled={loading}
              >
                {quickQuestion}
              </button>
            ))}
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
    height: "100dvh",
    minHeight: "100vh",
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
    whiteSpace: "pre-wrap",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    animation: "fadeIn 0.2s"
  },

  quickActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    padding: "8px 18px 0 18px",
    background: "#ffffff"
  },

  quickActionButton: {
    border: "1px solid #dbeafe",
    background: "#eff6ff",
    color: "#1e3a8a",
    borderRadius: 999,
    padding: "7px 12px",
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 500
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
    minHeight: 0,
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
    padding: "12px 16px",
    minHeight: 44,
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

  tabDirtyDot: {
    marginLeft: 8,
    fontSize: 10,
    verticalAlign: "middle"
  },

  adminTabActive: {
    background: "#2563eb",
    color: "#fff"
  },

  adminContent: {
    flex: 1,
    minHeight: 0,
    padding: 24,
    maxWidth: 800,
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box",
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    paddingBottom: 40
  },

  label: {
    display: "block",
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 8,
    marginTop: 16
  },

  helperText: {
    color: "#6b7280",
    fontSize: 13,
    marginTop: -4,
    marginBottom: 12
  },

  lastSavedText: {
    margin: "0 0 12px 2px",
    color: "#4b5563",
    fontSize: 13,
    fontWeight: 500
  },

  adminActionBar: {
    position: "sticky",
    bottom: 0,
    zIndex: 3,
    display: "flex",
    gap: 10,
    paddingTop: 12,
    paddingBottom: 6,
    background: "linear-gradient(180deg, rgba(255,255,255,0), #fff 28%)"
  },

  secondaryButton: {
    width: "auto",
    padding: 14,
    fontSize: 16,
    background: "#e5e7eb",
    color: "#111827",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 600
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
    background: "#374151"
  }
};