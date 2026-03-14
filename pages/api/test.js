export default function handler(req, res) {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }

  res.json({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'OK' : 'MISSING'
  })
}
