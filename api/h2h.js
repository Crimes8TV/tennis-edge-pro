const { apiGet, setCors } = require("./_lib");

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const { p1_key, p2_key } = req.query;
    if (!p1_key || !p2_key) return res.status(400).json({ error: "Spieler-Keys fehlen" });

    const response = await apiGet({ method: "get_H2H", first_player_key: p1_key, second_player_key: p2_key });
    const result = response.data?.result || {};
    const h2h = result.H2H || [];
    const p1Results = result.firstPlayerResults || [];
    const p2Results = result.secondPlayerResults || [];

    let p1Wins = 0, p2Wins = 0;
    h2h.forEach(m => {
      if (m.event_winner === "First Player") p1Wins++;
      else if (m.event_winner === "Second Player") p2Wins++;
    });

    const filterSelf = (matches) => matches.filter(m => {
      const p1 = (m.event_first_player || "").toLowerCase().trim();
      const p2 = (m.event_second_player || "").toLowerCase().trim();
      if (!p1 || !p2 || p1 === p2) return false;
      const p1Last = p1.split(" ").pop();
      const p2Last = p2.split(" ").pop();
      return p1Last !== p2Last;
    }).slice(0, 5);

    res.json({ h2h_matches: h2h.slice(0, 10), p1_wins: p1Wins, p2_wins: p2Wins, p1_recent: filterSelf(p1Results), p2_recent: filterSelf(p2Results) });
  } catch (err) {
    console.error("H2H ERROR:", err.message);
    res.status(500).json({ error: "Fehler beim Laden der H2H-Daten" });
  }
};
