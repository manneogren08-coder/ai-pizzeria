import { useState } from "react";

export default function Home() {
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState(null);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🔐 Test-lösenord (ENKELT & TYDLIGT)
  const PASSWORDS = {
    santana123: {
      id: "santana",
      name: "Pizzeria Santana"
    },
    dondolores123: {
      id: "donDolores",
      name: "Don Dolores"
    }
  };

  const login = () => {
    const match = PASSWORDS[password];
    if (!match) {
      setError("Fel lösenord");
      return;
    }
    setCompany(match);
    setError("");
  };

  const askAI = async () => {
    if (!question.trim()) return;

    setChat(prev => [...prev, { from: "user", text: question }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          company: company.id
        })
      });

      const data = await res.json();
      setChat(prev => [...prev, { from: "ai", text: data.answer }]);
    } catch {
      setChat(prev => [...prev, { from: "ai", text: "Ett fel uppstod." }]);
    }

    setQuestion("");
    setLoading(false);
  };

  // 🔒 LOGIN-SIDA
  if (!company) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2>Intern personalguide</h2>
          <p>Skriv in ert personal-lösenord</p>

          <input
            style={styles.input}
            type="password"
            placeholder="Lösenord"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />

          {error && <p style={{ color: "red" }}>{error}</p>}

          <button style={styles.button} onClick={login}>
            Logga in
          </button>
        </div>
      </div>
    );
  }

  // ✅ INLOGGAD SIDA
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1>{company.name}</h1>
        <p>Intern AI-guide för personal</p>

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
        />

        <button style={styles.button} onClick={askAI}>
          Fråga AI
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
