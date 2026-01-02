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
        { from: "ai", text: "Ett fel uppstod. Försök igen." }
      ]);
    }

    setQuestion("");
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <header style={styles.header}>
          <h1 style={styles.title}>🍕 Intern AI-guide för personal</h1>
          <p style={styles.subtitle}>
            Snabba svar om rutiner, meny och allergener – alltid samma svar.
          </p>
        </header>

        <section style={styles.value}>
          <p><strong>Vad kan denna AI hjälpa till med?</strong></p>
          <ul>
            <li>• Hur vi gör vid stängning</li>
            <li>• Priser & tillval (extra ost, glutenfritt m.m.)</li>
            <li>• Allergener & specialkost</li>
            <li>• Väntetider & rutiner</li>
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
              {msg.from === "user" ? "Du: " : "AI: "}
              {msg.text}
            </div>
          ))}
          {loading && <div style={styles.aiMsg}>AI tänker…</div>}
        </div>

        <input
          style={styles.input}
          placeholder="Ex: Hur gör vi vid stängning?"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === "Enter" && askAI()}
        />

        <button style={styles.button} onClick={askAI}>
          Få svar
        </button>

        <footer style={styles.footer}>
          Endast för intern användning
        </footer>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f1f5f9, #e2e8f0)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  card: {
    background: "#ffffff",
    width: "100%",
    maxWidth: 520,
    borderRadius: 14,
    padding: 22,
    boxShadow: "0 20px 40px rgba(0,0,0,0.12)"
  },
  header: {
    marginBottom: 16
  },
  title: {
    margin: 0,
    fontSize: 22
  },
  subtitle: {
    marginTop: 6,
    color: "#555",
    fontSize: 14
  },
  value: {
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 12,
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
    padding: 11,
    fontSize: 15,
    marginBottom: 10,
    borderRadius: 6,
    border: "1px solid #d1d5db"
  },
  button: {
    width: "100%",
    padding: 12,
    fontSize: 16,
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer"
  },
  footer: {
    marginTop: 12,
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center"
  }
};
