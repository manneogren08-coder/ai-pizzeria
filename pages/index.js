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
      setChat(prev => [...prev, { from: "ai", text: "Ett fel uppstod. Försök igen." }]);
    }

    setQuestion("");
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>Intern personalguide</h1>
          <p style={styles.subtitle}>Pizzeria Santana</p>
        </header>

        <section style={styles.infoBox}>
          <strong>Denna sida används internt av personal.</strong>
          <p>
            Här kan du snabbt få svar om meny, rutiner, allergener,
            väntetider och stängning – utan att fråga kollegor eller chef.
          </p>
        </section>

        <section style={styles.examples}>
          <p><strong>Vanliga frågor:</strong></p>
          <ul>
            <li>Hur gör vi vid stängning?</li>
            <li>Vad kostar extra ost?</li>
            <li>Har vi glutenfri pizza?</li>
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
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#eef2f7",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  container: {
    background: "#ffffff",
    width: "100%",
    maxWidth: 500,
    borderRadius: 10,
    padding: 20,
    boxShadow: "0 8px 25px rgba(0,0,0,0.08)"
  },
  header: {
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: 10,
    marginBottom: 15
  },
  title: {
    margin: 0,
    fontSize: 22
  },
  subtitle: {
    margin: 0,
    color: "#555",
    fontSize: 14
  },
  infoBox: {
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    marginBottom: 12
  },
  examples: {
    fontSize: 14,
    marginBottom: 12
  },
  chat: {
    border: "1px solid #d1d5db",
    borderRadius: 6,
    padding: 10,
    height: 220,
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
    background: "#e0f2fe",
    padding: 8,
    borderRadius: 6,
    marginBottom: 6
  },
  input: {
    width: "100%",
    padding: 10,
    fontSize: 15,
    marginBottom: 10
  },
  button: {
    width: "100%",
    padding: 12,
    fontSize: 16,
    background: "#1f2937",
    color: "#ffffff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer"
  }
};
