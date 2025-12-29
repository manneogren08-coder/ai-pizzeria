import { useState } from "react";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  const askAI = async () => {
    if (!question.trim()) return;

    setChat(prev => [...prev, { from: "user", text: question }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      });

      const data = await res.json();
      setChat(prev => [...prev, { from: "ai", text: data.answer }]);
    } catch {
      setChat(prev => [...prev, { from: "ai", text: "Något gick fel." }]);
    }

    setQuestion("");
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>🍕 Pizzeria Santana – Intern AI</h1>
        <p style={styles.subtitle}>
          Ställ frågor om meny, rutiner, allergener eller stängning.
        </p>

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
          placeholder="Ex: Hur gör vi vid stängning?"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === "Enter" && askAI()}
        />

        <button style={styles.button} onClick={askAI}>
          Fråga AI:n
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
    padding: 20
  },
  card: {
    background: "#fff",
    maxWidth: 420,
    width: "100%",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
  },
  title: { marginBottom: 5 },
  subtitle: { color: "#555", marginBottom: 15 },
  chat: {
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: 10,
    height: 250,
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
    marginBottom: 10
  },
  button: {
    width: "100%",
    padding: 12,
    fontSize: 16,
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer"
  }
};
