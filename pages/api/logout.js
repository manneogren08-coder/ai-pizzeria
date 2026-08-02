import { clearAuthCookie } from "../../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  clearAuthCookie(res);

  return res.status(200).json({ success: true });
}
