const { apiGet, setCors } = require("./_lib");

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const match_key = req.query.match_key || req.url.split("/").pop().split("?")[0];
    const response = await apiGet({ method: "get_odds", match_key });
    res.json(response.data?.result || {});
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Laden der Quoten" });
  }
};
