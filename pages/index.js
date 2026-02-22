import { useState } from "react";

export default function Home() {
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState(null);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

      setCompany(data.company);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMessage, password })
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

  // 🔒 LOGIN
  if (!company) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginCard}>
          <h2 style={{ marginBottom: 8 }}>Intern personalguide</h2>
          <p style={{ marginBottom: 20, color: "#6b7280" }}>
            Logga in med ert personal-lösenord
          </p>

          <input
            style={styles.input}
            type="password"
            placeholder="Lösenord"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !loading && login()}
            disabled={loading}
          />

          {error && <p style={{ color: "#dc2626" }}>{error}</p>}

          <button
            style={styles.primaryButton}
            onClick={login}
            disabled={loading}
          >
            {loading ? "Loggar in..." : "Logga in"}
          </button>
        </div>
      </div>
    );
  }

  // ✅ APP-LAYOUT
  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>{company.name}</h2>
          <span style={{ fontSize: 14, color: "#9ca3af" }}>
            Intern AI-guide
          </span>
        </div>

        <button
          style={styles.logoutButton}
          onClick={() => {
            setCompany(null);
            setChat([]);
          }}
        >
          Logga ut
        </button>
      </header>

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
          <div style={styles.aiBubble}>
            AI skriver...
          </div>
        )}
      </div>

      <div style={styles.inputArea}>
        <input
          style={styles.chatInput}
          placeholder="Ställ en fråga till personalguiden..."
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === "Enter" && askAI()}
          disabled={loading}
        />

        <button
          style={styles.sendButton}
          onClick={askAI}
          disabled={loading}
        >
          Skicka
        </button>
      </div>
    </div>
  );
}

const styles = {
  loginPage: {
    minHeight: "100vh",
    background: "#f9fafb",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  loginCard: {
  background: "#ffffff",
  padding: 20,
  borderRadius: 16,
  width: "100%",
  maxWidth: 360,
  boxSizing: "border-box",
  boxShadow: "0 20px 50px rgba(0,0,0,0.08)"
},
  appContainer: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "#f3f4f6"
  },
  header: {
    padding: "16px 24px",
    background: "#111827",
    color: "#fff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
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
    gap: 12
  },
  userBubble: {
    alignSelf: "flex-end",
    background: "#2563eb",
    color: "#fff",
    padding: 12,
    borderRadius: 12,
    maxWidth: "70%"
  },
  aiBubble: {
    alignSelf: "flex-start",
    background: "#ffffff",
    padding: 12,
    borderRadius: 12,
    maxWidth: "70%",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
  },
  inputArea: {
    display: "flex",
    padding: 16,
    borderTop: "1px solid #e5e7eb",
    background: "#ffffff"
  },
  chatInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    borderRadius: 10,
    border: "1px solid #d1d5db",
    marginRight: 12
  },
  sendButton: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "0 20px",
    borderRadius: 10,
    cursor: "pointer"
  },
  input: {
    width: "100%",
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    borderRadius: 10,
    border: "1px solid #d1d5db"
  },
  primaryButton: {
    width: "100%",
    padding: 12,
    fontSize: 16,
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    cursor: "pointer"
  }
};