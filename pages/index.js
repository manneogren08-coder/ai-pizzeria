import { useState } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const login = async () => {
    setError("");

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    if (!res.ok) {
      setError("Fel lösenord");
      return;
    }

    const data = await res.json();
    router.push(`/app?company=${data.companyId}`);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1>Intern personalguide</h1>
        <p>Logga in med företagets kod</p>

        <input
          type="password"
          placeholder="Lösenord"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={styles.input}
        />

        <button onClick={login} style={styles.button}>
          Logga in
        </button>

        {error && <p style={{ color: "red" }}>{error}</p>}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f3f4f6"
  },
  card: {
    background: "#fff",
    padding: 24,
    borderRadius: 10,
    width: 350,
    textAlign: "center",
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
  },
  input: {
    width: "100%",
    padding: 10,
    marginBottom: 10
  },
  button: {
    width: "100%",
    padding: 12,
    background: "#1f2937",
    color: "#fff",
    border: "none",
    borderRadius: 6
  }
};
