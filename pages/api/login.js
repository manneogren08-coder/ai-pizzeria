import { createClient } from "@supabase/supabase-js";

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
    .single();

  if (error || !data) {
    return res.status(401).json({ error: "Fel lösenord" });
  }

  return res.status(200).json({
    company: {
      id: data.id,
      name: data.name
    }
  });
}

