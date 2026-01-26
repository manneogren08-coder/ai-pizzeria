import { useState } from "react";

export default function Demo() {
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState(null);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Vi sparar den password som faktiskt loggade in (så du kan rensa input om du vill)
  const [authPassword, setAuthPassword] = useState("");

  // ✅ SNABB DEMO-LOGIN (ingen OpenAI)
  const login = async () => {
    if (!password.trim()) {
      setError("Skriv in demo-lösenord");
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
        setError("Fel demo-lösenord");
        setLoading(false);
        return;
      }

      // 🔒 Viktigt: tillåt BARA DEMO-kontot på /demo
      if (!data.company || String(data.company.name).toUpperCase() !== "DEMO") {
        setError("Fel demo-lösenord");
        setLoading(false);
        return;
      }

      setAuthPassword(password);

      // Visa alltid rubriken DEMO (du kan också använda data.company.name)
      setCompany({ name: "DEMO" });
    } catch (err) {
      setError("Ett fel uppstod. Försök igen.");
    }

    setLoading(false);
  };

  // ✅ Fråga AI (använder authPassword så demo-data används)
  const askAI = async () => {
    if (!question.trim() || loading) return;

    setChat(prev => [...prev, { from: "user", text: question }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          password: authPassword
        })
      });

      const data = await res.json();
      setChat(prev => [...prev, { from: "ai", text: data.answer }]);
    } catch (error) {
      console.error(error);
      setChat(prev => [
        ...prev,
        { from: "ai", text: "Ett fel uppstod. Försök igen." }
      ]);
    }

    setQuestion("");
    setLoading(false);
  };

  // 🔒 DEMO LOGIN-SIDA
  if (!company) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2>DEMO</h2>
          <p>Skriv in demo-lösenord</p>

          <input
            style={styles.input}
            type="password"
            placeholder="Demo-lösenord"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !loading && login()}
            disabled={loading}
          />

          {error && <p style={{ color: "red" }}>{error}</p>}

          <button
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer"
            }}
            onClick={login}
            disabled={loading}
          >
            {loading ? "Loggar in..." : "Logga in"}
          </button>
        </div>
      </div>
    );
  }

  // ✅ INLOGGAD DEMO-SIDA
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1>DEMO</h1>
        <p>Exempel på intern AI-guide för restaurangpersonal</p>

        <div style={styles.chat}>
          {chat.map((msg, i) => (
            <div key={i} style={msg.from === "user" ? styles.user : styles.ai}>
              {msg.text}
            </div>
          ))}
          {loading && <div style={styles.ai}>AI skriver…</div>}
        </div>

        <input
          style={styles.input}
          placeholder="Ställ en fråga…"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === "Enter" && askAI()}
          disabled={loading}
        />

        <button
          style={{
            ...styles.button,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "not-allowed" : "pointer"
          }}
          onClick={askAI}
          disabled={loading}
        >
          {loading ? "Skickar..." : "Fråga AI"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f3f4f6",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  card: {
    background: "#fff",
    maxWidth: 420,
    width: "100%",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
  },
  chat: {
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: 10,
    height: 220,
    overflowY: "auto",
    marginBottom: 10
  },
  user: {
    background: "#e5e7eb",
    padding: 8,
    borderRadius: 6,
    marginBottom: 6
  },
  ai: {
    background: "#dbeafe",
    padding: 8,
    borderRadius: 6,
    marginBottom: 6
  },
  input: {
    width: "100%",
    padding: 10,
    fontSize: 16,
    marginBottom: 10,
    boxSizing: "border-box",
    borderRadius: 8,
    border: "1px solid #d1d5db"
  },
  button: {
    width: "100%",
    padding: 12,
    minHeight: 48,
    fontSize: 16,
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 8
  }
};
