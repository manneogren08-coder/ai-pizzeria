import { useState, useRef, useEffect } from "react";

export default function Home() {
  const [token, setToken] = useState(""); // LÄGG TILL DENNA
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState(null);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const chatAreaRef = useRef(null);

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

    setToken(data.token);      // LÄGG TILL DENNA
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

        <button
          style={styles.logoutButton}
          onClick={() => {
  setCompany(null);
  setToken("");  // LÄGG TILL DENNA
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
  }
};