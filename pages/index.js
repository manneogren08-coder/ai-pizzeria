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

  // 🔐 LOGIN PAGE
  if (!company) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginCard}>

          

          <h2 style={{ marginBottom: 6 }}>Intern personalguide</h2>
          <p style={styles.subtitle}>
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

          {error && <p style={styles.error}>{error}</p>}

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

  // 💬 APP
  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>{company.name}</h2>
          <span style={styles.headerSub}>AI Personalguide</span>
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
    boxSizing: "border-box"
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
    outline: "none"
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
    fontWeight: 600
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
    maxWidth: "70%"
  },

  aiBubble: {
    alignSelf: "flex-start",
    background: "#ffffff",
    padding: 14,
    borderRadius: 16,
    maxWidth: "70%",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
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
  }
};