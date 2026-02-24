import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState(null);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);

  async function handleLogin() {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("password", password)
      .single();

    if (data) {
      setCompany(data);
    } else {
      alert("Fel lösenord");
    }
  }

  function sendMessage() {
    if (!message.trim()) return;

    setChat([...chat, { role: "user", text: message }]);

    setTimeout(() => {
      setChat((prev) => [
        ...prev,
        { role: "ai", text: "Detta är ett AI-svar (koppla OpenAI här)." },
      ]);
    }, 600);

    setMessage("");
  }

  if (!company) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginCard}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={styles.title}>AI Assistent</h1>
            <p style={styles.subtitle}>
              Intern AI-assistent för restauranger
            </p>
          </div>

          <form
  onSubmit={(e) => {
    e.preventDefault();
    handleLogin();
  }}
>
  <input
    type="password"
    placeholder="Ange företagslösenord"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    style={styles.input}
  />

  <button type="submit" style={styles.primaryButton}>
    Logga in
  </button>
</form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
        <div>
          <strong>{company.name}</strong>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            AI-assistent aktiv
          </div>
        </div>
        <button onClick={() => setCompany(null)} style={styles.logoutButton}>
          Logga ut
        </button>
      </header>

      <div style={styles.chatArea}>
        {chat.map((msg, i) => (
          <div
            key={i}
            style={msg.role === "user" ? styles.userBubble : styles.aiBubble}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <div style={styles.inputArea}>
        <input
  value={message}
  onChange={(e) => setMessage(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  }}
  placeholder="Skriv ditt meddelande..."
  style={styles.chatInput}
/>
        <button onClick={sendMessage} style={styles.sendButton}>
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
    padding: 20,
  },

  loginCard: {
    background: "#ffffff",
    padding: 40,
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
    boxSizing: "border-box",
    boxShadow: "0 30px 80px rgba(0,0,0,0.08)",
    textAlign: "center",
  },

  title: {
    fontSize: 30,
    fontWeight: 700,
    letterSpacing: -0.5,
    marginBottom: 6,
    color: "#111827",
  },

  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    margin: 0,
  },

  input: {
    width: "100%",
    padding: 14,
    fontSize: 16,
    marginBottom: 14,
    borderRadius: 12,
    border: "1px solid #d1d5db",
    outline: "none",
    boxSizing: "border-box",
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
  },

  appContainer: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "#f3f4f6",
  },

  header: {
    padding: "16px 24px",
    background: "#111827",
    color: "#fff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  logoutButton: {
    background: "#374151",
    border: "none",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: 8,
    cursor: "pointer",
  },

  chatArea: {
    flex: 1,
    overflowY: "auto",
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  userBubble: {
    alignSelf: "flex-end",
    background: "#2563eb",
    color: "#fff",
    padding: 12,
    borderRadius: 12,
    maxWidth: "70%",
  },

  aiBubble: {
    alignSelf: "flex-start",
    background: "#ffffff",
    padding: 12,
    borderRadius: 12,
    maxWidth: "70%",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  },

  inputArea: {
    display: "flex",
    padding: 16,
    borderTop: "1px solid #e5e7eb",
    background: "#ffffff",
  },

  chatInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    borderRadius: 10,
    border: "1px solid #d1d5db",
    marginRight: 12,
    boxSizing: "border-box",
  },

  sendButton: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "0 20px",
    borderRadius: 10,
    cursor: "pointer",
  },
};