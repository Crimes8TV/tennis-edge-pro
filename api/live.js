const { apiGet, setCors } = require("./_lib");

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const response = await apiGet({ method: "get_livescore", event_type_key: 265 });
    const matches = response.data?.result || [];
    res.json(matches.map(m => ({
      player1: m.event_first_player,
      player2: m.event_second_player,
      score: m.event_final_result || "-",
      status: m.event_status || "",
      tournament: m.tournament_name || ""
    })));
  } catch (err) {
    console.error("LIVE ERROR:", err.message);
    res.json([]);
  }
};
