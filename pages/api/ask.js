import OpenAI from "openai";
import { supabase } from "@/lib/supabase";
import jwt from 'jsonwebtoken';

// ⏱️ Enkel in-memory rate limit (per IP)
const rateLimitMap = new Map();
const MAX_REQUESTS = 30;           // 30 frågor
const WINDOW_MS = 60 * 1000;       // per minut

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ answer: "Endast POST-metod tillåten." });
  }

  const { question } = req.body; // TA BORT: password
  
  try {
    // 🔐 Verifiera token istället för lösenord
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ answer: "Ingen token skickad." })
    }
    
    const { companyId } = jwt.verify(token, process.env.JWT_SECRET)
    
    // Hämta företag från databasen via companyId istället
    const { data: companyData, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single();

    console.log("companyData from supabase:", companyData, "error:", error);
    if (error || !companyData) {
      return res.status(401).json({ answer: "Ogiltig token." });
    }

    // 📍 Rate limiting (samma som innan)
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
    const now = Date.now();
    const userData = rateLimitMap.get(ip) || { count: 0, start: now };

    if (now - userData.start > WINDOW_MS) {
      userData.count = 0;
      userData.start = now;
    }

    userData.count += 1;
    rateLimitMap.set(ip, userData);

    if (userData.count > MAX_REQUESTS) {
      return res.status(429).json({
        answer: "För många frågor just nu. Vänta en minut och försök igen."
      });
    }

    // 🤖 OpenAI-klient (samma som innan)
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // assemble the system prompt from all text columns returned by Supabase
    const ignore = new Set(["id", "name", "password", "active"]);
    let companyInfoText = Object.entries(companyData)
      .filter(([k, v]) => typeof v === "string" && v.trim() && !ignore.has(k))
      .map(([k, v]) => `${k}:
${v.trim()}`)
      .join("\n\n");

    // fallback to static files if the database has no usable data
    if (!companyInfoText) {
      try {
        const pizzeriaSantana = await import("@/data/pizzeriaSantana");
        const donDolores = await import("@/data/donDolores");
        const localMap = {
          "Pizzeria Santana": pizzeriaSantana.default,
          "Don Dolores": donDolores.default
        };
        const local = localMap[companyData.name];
        if (local) {
          companyInfoText = JSON.stringify(local, null, 2);
        }
      } catch (_) {
        // ignore import failures
      }
    }

    const systemPrompt = `Du är en INTERN AI-assistent för ${companyData.name}.

Följande information gäller för företaget och ska användas i svaren:
${companyInfoText}

Besvara alla frågor som om du sitter på plats i restaurangen. Var kortfattad, ge precisa instruktioner och använd talspråk.
`;

    console.log("systemPrompt used for OpenAI call:\n", systemPrompt);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      max_tokens: 200
    });
    return res.status(200).json({
      answer: response.choices[0].message.content,
      company: { name: companyData.name }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ answer: "Ogiltig token." });
    }
    console.error("Fel:", error);
    return res.status(500).json({ answer: "Ett fel uppstod." });
  }
}