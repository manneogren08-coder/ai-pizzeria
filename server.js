require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(cors()); // Tillåter alla origins
app.use(express.json());

// Rate limiter - max 20 frågor/minut per IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minut
  max: 20,
  message: "För många frågor, vänta lite och försök igen."
});
app.use(limiter);

// OpenAI setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Endpoint för att fråga AI:n
app.post('/ask', async (req, res) => {
  const { question, password } = req.body;

  // ✅ Loggar för felsökning
  console.log("Fråga mottagen:", question);
  console.log("Lösenord från frontend:", password);
  console.log("Rätt lösenord i .env:", process.env.ACCESS_PASSWORD);

  // Lösenordskontroll före OpenAI-anrop
  if (password !== process.env.ACCESS_PASSWORD) {
    return res.status(401).json({ answer: "Obehörig åtkomst!" });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: question }],
      max_tokens: 200
    });

    res.json({ answer: response.choices[0].message.content });

  } catch (error) {
    console.error("OpenAI-anropet misslyckades:", error);
    res.status(500).json({ answer: "Oj, något gick fel med AI:n!" });
  }
});

// Starta servern
app.listen(port, () => {
  console.log(`Servern körs på http://localhost:${port}`);
});

