const companies = {
  "santana123": {
    id: "santana"
  },
  "dolores123": {
    id: "dolores"
  }
};

export default function handler(req, res) {
  const { password } = req.body;

  const company = companies[password];

  if (!company) {
    return res.status(401).json({ error: "Fel lösenord" });
  }

  res.status(200).json({ companyId: company.id });
}
