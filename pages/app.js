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
    <div style={{ padding: 20 }}>
      <h1>
        {company === "santana" && "🍕 Pizzeria Santana"}
        {company === "dolores" && "☕ Don Dolores"}
      </h1>

      <div>
        {chat.map((m, i) => (
          <div key={i}>
            <strong>Du:</strong> {m.q}<br />
            <strong>AI:</strong> {m.a}
            <hr />
          </div>
        ))}
      </div>

      <input
        value={question}
        onChange={e => setQuestion(e.target.value)}
        placeholder="Ställ en fråga"
      />
      <button onClick={askAI}>Fråga</button>
    </div>
  );
}
