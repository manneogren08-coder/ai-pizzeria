"use client";

import { useState, useRef, useEffect } from "react";


export default function Demo() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState(null);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chat, loading]);

  // ✅ Alltid synliga "snabbfrågor" när man är inloggad
  const EXAMPLE_QUESTIONS = [
    "När öppnar vi på söndag?",
    "Vilka allergener finns i Margherita?",
    "Vad är stängningsrutinen steg för steg?",
    "Vad gör vi om en gäst klagar på maten?",
    "Vad gör jag om kassan inte stämmer?",
    "Hur hanterar vi sjukfrånvaro samma dag?"
  ];

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

      // 🔒 Tillåt BARA DEMO-kontot
      if (!data.company || String(data.company.name).toUpperCase() !== "DEMO") {
        setError("Fel demo-lösenord");
        setLoading(false);
        return;
      }

      setToken(data.token);
      setCompany({ name: "DEMO" });
    } catch (err) {
      setError("Ett fel uppstod. Försök igen.");
    }

    setLoading(false);
  };

  // ✅ En enda funktion som kan skicka valfri text (chips eller input)
  const askAI = async (text) => {
    const q = (text ?? question).trim();
    if (!q || loading) return;

    setChat((prev) => [...prev, { from: "user", text: q }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          question: q
        })
      });

      const data = await res.json();
      setChat((prev) => [...prev, { from: "ai", text: data.answer }]);
    } catch (error) {
      console.error(error);
      setChat((prev) => [
        ...prev,
        { from: "ai", text: "Ett fel uppstod. Försök igen." }
      ]);
    }

    setQuestion("");
    setLoading(false);
  };

  // 🔒 LOGIN-SIDA
  if (!company) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2 style={{ marginTop: 0 }}>DEMO</h2>
          <p>Skriv in demo-lösenord</p>

          <input
            style={styles.input}
            className="demoInput"
            type="password"
            placeholder="Demo-lösenord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && login()}
            disabled={loading}
          />

          {error && <p style={{ color: "red", marginTop: 0 }}>{error}</p>}

          <button
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer"
            }}
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

  // ✅ INLOGGAD DEMO-SIDA
  return (
    <div style={styles.page}>
      <style jsx>{`
        .primaryButton:hover, .sendButton:hover { background: #1e40af; }
        .chatInput:focus, .demoInput:focus { border-color: #2563eb; }
        .typing { display: flex; gap: 4px; }
        .typing .dot { width: 8px; height: 8px; background: #2563eb; border-radius: 50%; animation: blink 1s infinite alternate; }
        .typing .dot:nth-child(2) { animation-delay: 0.2s; }
        .typing .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink { from { opacity: 0.3; } to { opacity: 1; } }
      `}</style>
      <div style={styles.card}>
        <h1 style={{ marginTop: 0 }}>DEMO</h1>
        <p style={{ marginTop: 0 }}>
          Exempel på intern AI-guide för restaurangpersonal
        </p>

        {/* ✅ "Bevis"-rad så du vet att rätt fil renderas */}
        <div style={styles.proof}>
          OM DU SER DETTA: du kör den uppdaterade demo.js (chips ska synas under).
        </div>

        {/* ✅ Snabbknappar (syns alltid här) */}
        <div style={styles.chipsWrap}>
          {EXAMPLE_QUESTIONS.map((text) => (
            <button
              key={text}
              type="button"
              style={{
                ...styles.chip,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer"
              }}
              disabled={loading}
              onClick={() => {
                setQuestion(text); // fyll input så man ser vad som skickas
                askAI(text);       // skicka direkt
              }}
            >
              {text}
            </button>
          ))}
        </div>

        <div style={styles.chat} ref={chatRef}>
          {chat.map((msg, i) => (
            <div key={i} style={msg.from === "user" ? styles.user : styles.ai}>
              {msg.text}
            </div>
          ))}
          {loading && (
            <div style={styles.ai} className="typing">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          )}
        </div>

        <input
          style={styles.input}
          className="chatInput"
          placeholder="Ställ en fråga…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && askAI()}
          disabled={loading}
        />

        <button
          style={{
            ...styles.button,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "not-allowed" : "pointer"
          }}
          className="sendButton"
          onClick={() => askAI()}
          disabled={loading}
        >
          {loading ? "Skickar..." : "Fråga AI"}
        </button>

        {/* Bonus: liten reset för demo */}
        {chat.length > 0 && (
          <button
            type="button"
            onClick={() => setChat([])}
            style={styles.secondaryButton}
            disabled={loading}
          >
            Rensa chatten
          </button>
        )}
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
    maxWidth: 520,
    width: "100%",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
  },
  proof: {
    border: "2px solid #ef4444",
    background: "#fff7ed",
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    marginBottom: 12
  },
  chipsWrap: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 12
  },
  chip: {
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid #d1d5db",
    background: "#fff",
    fontSize: 13,
    lineHeight: 1.2,
    textAlign: "left"
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
  },
  secondaryButton: {
    marginTop: 10,
    width: "100%",
    padding: 12,
    minHeight: 48,
    fontSize: 16,
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    opacity: 0.9
  }
};
