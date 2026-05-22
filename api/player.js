const { apiGet, setCors } = require("./_lib");

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const playerName = decodeURIComponent(req.url.split("/api/player/")[1]?.split("?")[0] || "");
    const standingsRes = await apiGet({ method: "get_standings", event_type: "ATP" });
    const standings = standingsRes.data?.result || [];
    const found = standings.find(p => (p.player||"").toLowerCase().includes(playerName.toLowerCase()));

    if (!found?.player_key) return res.json({ name: playerName, stats: { winRate:"-" }, surfaces: { hard:"-", clay:"-", grass:"-" }, recentForm: [] });

    const playerRes = await apiGet({ method: "get_players", player_key: found.player_key });
    const pd = playerRes.data?.result?.[0];
    if (!pd) throw new Error("Keine Spielerdaten");

    const stats = pd.stats?.find(s => s.type === "singles") || {};
    const hw=parseInt(stats.hard_won)||0, hl=parseInt(stats.hard_lost)||0;
    const cw=parseInt(stats.clay_won)||0, cl2=parseInt(stats.clay_lost)||0;
    const gw=parseInt(stats.grass_won)||0, gl=parseInt(stats.grass_lost)||0;
    const tw=parseInt(stats.matches_won)||0, tl=parseInt(stats.matches_lost)||0;

    res.json({
      name: pd.player_name, country: pd.player_country, logo: pd.player_logo,
      stats: { winRate: tw+tl>0?Math.round(tw/(tw+tl)*100):"-", titles: stats.titles||0, rank: found.place, points: found.points },
      surfaces: {
        hard:  hw+hl>0?Math.round(hw/(hw+hl)*100):"-",
        clay:  cw+cl2>0?Math.round(cw/(cw+cl2)*100):"-",
        grass: gw+gl>0?Math.round(gw/(gw+gl)*100):"-"
      },
      recentForm: []
    });
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Laden der Spielerdaten" });
  }
};
