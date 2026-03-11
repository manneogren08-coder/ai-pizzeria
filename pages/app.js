import { useRouter } from "next/router";
import { useState } from "react";

export default function App() {
  const router = useRouter();
  const { company } = router.query;

  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);

  if (!company) return null;

  const askAI = async () => {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, company })
    });

    const data = await res.json();
    setChat(prev => [...prev, { q: question, a: data.answer }]);
    setQuestion("");
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
      <h1 style={styles.title}>
        {company === "santana" && "🍕 Pizzeria Santana"}
        {company === "dolores" && "☕ Don Dolores"}
      </h1>

      <div style={styles.chatBox}>
        {chat.map((m, i) => (
          <div key={i} style={styles.message}>
            <strong>Du:</strong> {m.q}<br />
            <strong>AI:</strong> {m.a}
            <hr />
          </div>
        ))}
      </div>

      <input
        style={styles.input}
        value={question}
        onChange={e => setQuestion(e.target.value)}
        placeholder="Ställ en fråga"
      />
      <button style={styles.button} onClick={askAI}>Fråga</button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: 20,
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start"
  },
  card: {
    width: "100%",
    maxWidth: 680,
    background: "#fff",
    border: "1px solid #dbeafe",
    borderRadius: 14,
    padding: 20,
    boxShadow: "0 8px 20px rgba(37,99,235,0.08)"
  },
  title: {
    marginTop: 0,
    marginBottom: 14,
    color: "#0f172a"
  },
  chatBox: {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: 12,
    background: "#fff",
    marginBottom: 12
  },
  message: {
    color: "#334155",
    lineHeight: 1.45
  },
  input: {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    marginBottom: 10,
    boxSizing: "border-box"
  },
  button: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 16px",
    cursor: "pointer",
    fontWeight: 600
  }
};
