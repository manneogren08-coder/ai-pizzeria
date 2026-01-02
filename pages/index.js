import { useState } from "react";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");

  const askAI = async () => {
    if (!question.trim()) return;

    setChat(prev => [...prev, { from: "user", text: question }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, password })
      });

      const data = await res.json();
      setChat(prev => [...prev, { from: "ai", text: data.answer }]);
    } catch {
      setChat(prev => [
        ...prev,
        { from: "ai", text: "Ett fel uppstod. Försök igen eller kontakta ansvarig." }
      ]);
    }

    setQuestion("");
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>🍕 Intern Personal-AI</h1>
          <p style={styles.subtitle}>Pizzeria Santana</p>
        </header>

        <section style={styles.info}>
          <strong>Detta är ett internt verktyg för personal.</strong>
          <p style={{ marginTop: 6 }}>
            Få snabba och tydliga svar om hur vi jobbar – utan att störa kollegor
            eller ringa chefen.
          </p>
        </section>

        <section style={styles.examples}>
          <p><strong>Exempel på frågor:</strong></p>
          <ul>
            <li>Hur gör vi vid stängning?</li>
            <li>Vad säger jag om allergener?</li>
            <li>Vad kostar extra ost?</li>
            <li>Hur lång är väntetiden?</li>
          </ul>
        </section>

        <input
          style={styles.input}
          type="password"
          placeholder="Personal-lösenord"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <div style={styles.chat}>
          {chat.map((msg, i) => (
            <div
              key={i}
              style={msg.from === "user" ? styles.userMsg : styles.aiMsg}
            >
              {msg.text}
            </div>
          ))}
          {loading && <div style={styles.aiMsg}>Söker svar…</div>}
        </div>

        <input
          style={styles.input}
          placeholder="Skriv din fråga här…"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === "Enter" && askAI()}
        />

        <button style={styles.button} onClick={askAI}>
          Hämta svar
        </button>

        <footer style={styles.footer}>
          Endast för intern användning • Testversion
        </footer>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #eef2f7, #f8fafc)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  container: {
    background: "#ffffff",
    width: "100%",
    maxWidth: 520,
    borderRadius: 12,
    padding: 22,
    boxShadow: "0 12px 35px rgba(0,0,0,0.1)"
  },
  header: {
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: 12,
    marginBottom: 16
  },
  title: {
    margin: 0,
    fontSize: 24
  },
  subtitle: {
    margin: 0,
    color: "#555",
    fontSize: 14
  },
  info: {
    background: "#f1f5f9",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 14
  },
  examples: {
    fontSize: 14,
    marginBottom: 14
  },
  chat: {
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: 10,
    height: 240,
    overflowY: "auto",
    background: "#fafafa",
    marginBottom: 10
  },
  userMsg: {
    background: "#e5e7eb",
    padding: 8,
    borderRadius: 6,
    marginBottom: 6
  },
  aiMsg: {
    background: "#dbeafe",
    padding: 8,
    borderRadius: 6,
    marginBottom: 6
  },
  input: {
    width: "100%",
    padding: 10,
    fontSize: 15,
    marginBottom: 10,
    borderRadius: 6,
    border: "1px solid #d1d5db"
  },
  button: {
    width: "100%",
    padding: 12,
    fontSize: 16,
    background: "#1f2937",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer"
  },
  footer: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 12,
    color: "#777"
  }
};
