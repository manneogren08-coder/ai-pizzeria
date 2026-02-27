import { createClient } from "@supabase/supabase-js";
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    // Make sure the secret is available (common culprit in prod)
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not set!");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Missing password" });
    }

    const { data, error } = await supabase
      .from("companies")
      .select("id, name")
      .eq("password", password)
      .eq("active", true)
      .maybeSingle();

    if (error || !data) {
      return res.status(401).json({ error: "Fel lösenord" });
    }

    // create token
    const token = jwt.sign(
      { companyId: data.id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      token,
      company: {
        id: data.id,
        name: data.name
      }
    });
  } catch (err) {
    console.error("login handler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}