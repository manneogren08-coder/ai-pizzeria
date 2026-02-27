import { createClient } from "@supabase/supabase-js";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Missing password" });
    }

    // Hämta alla aktiva företag
    const { data: companies, error } = await supabase
      .from("companies")
      .select("id, name, password_hash")
      .eq("active", true);

    console.log("Aktiva företag:", companies);

    if (error || !companies || companies.length === 0) {
      console.log("Inga företag hittades eller fel:", error);
      return res.status(401).json({ error: "Fel lösenord" });
    }

    // Testa lösenordet mot alla aktiva företag
    let matchedCompany = null;
    for (const company of companies) {
      if (!company.password_hash) {
        console.log(`${company.name} saknar password_hash`);
        continue;
      }
      const match = await bcrypt.compare(password, company.password_hash);
      console.log(`Testar ${company.name}: ${match ? "MATCH" : "fel"}`);
      if (match) {
        matchedCompany = company;
        break;
      }
    }

    if (!matchedCompany) {
      return res.status(401).json({ error: "Fel lösenord" });
    }

    const data = matchedCompany;

    // Skapa token
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
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}