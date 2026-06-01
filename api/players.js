const { apiGet, setCors } = require("./_lib");

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const today = new Date().toISOString().split("T")[0];
    const [atpRes, fixturesRes] = await Promise.allSettled([
      apiGet({ method: "get_standings", event_type: "ATP" }),
      apiGet({ method: "get_fixtures", date_start: today, date_stop: today, event_type_key: 281 })
    ]);
    const atpRaw = atpRes.status === "fulfilled" ? atpRes.value.data?.result || [] : [];
    const fixturesRaw = fixturesRes.status === "fulfilled" ? fixturesRes.value.data?.result || [] : [];

    const atpPlayers = atpRaw.map(p => ({
      name: p.player || "Unknown",
      rank: parseInt(p.place) || 999,
      points: parseInt(p.points) || 0,
      country: p.country || "",
      player_key: p.player_key,
      elo: Math.max(1500, 2400 - (parseInt(p.place) || 100) * 6),
      serve: 70, return: 75, clutch: 80, momentum: 85,
      hard: 80, clay: 75, grass: 70,
      form: [80, 82, 78, 85, 87]
    }));

    const atpNames = new Set(atpPlayers.map(p => p.name.toLowerCase()));
    const challengerPlayers = [];
    const seen = new Set();
    fixturesRaw.forEach(m => {
      [m.event_first_player, m.event_second_player].forEach(shortName => {
        if (!shortName) return;
        const lastName = shortName.trim().split(" ").pop();
        if (seen.has(lastName.toLowerCase())) return;
        seen.add(lastName.toLowerCase());
        const alreadyIn = [...atpNames].some(n => n.includes(lastName.toLowerCase()));
        if (!alreadyIn) {
          challengerPlayers.push({
            name: shortName, rank: 200 + challengerPlayers.length, points: 0,
            country: "", player_key: null, elo: 1500,
            serve: 65, return: 65, clutch: 70, momentum: 70,
            hard: 70, clay: 70, grass: 65, form: [70, 72, 68, 71, 70]
          });
        }
      });
    });
    res.json([...atpPlayers, ...challengerPlayers]);
  } catch (err) {
    console.error("STANDINGS ERROR:", err.message);
    res.status(500).json({ error: "Fehler beim Laden der Spielerliste" });
  }
};
