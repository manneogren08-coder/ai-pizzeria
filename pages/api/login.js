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

  // LÄGG TILL: Skapa token
  const token = jwt.sign(
    { companyId: data.id },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  return res.status(200).json({
    token: token,  // LÄGG TILL
    company: {
      id: data.id,
      name: data.name
    }
  });
}