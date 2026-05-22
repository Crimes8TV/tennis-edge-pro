const { apiGet, setCors } = require("./_lib");

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const tournName = (req.query.name || "").toLowerCase();
    const today = new Date();
    const start = new Date(today); start.setDate(today.getDate() - 28);
    const end   = new Date(today); end.setDate(today.getDate() + 14);
    const dateStart = start.toISOString().split("T")[0];
    const dateEnd   = end.toISOString().split("T")[0];

    const [r265, r267, r281] = await Promise.allSettled([
      apiGet({ method: "get_fixtures", date_start: dateStart, date_stop: dateEnd, event_type_key: 265 }),
      apiGet({ method: "get_fixtures", date_start: dateStart, date_stop: dateEnd, event_type_key: 267 }),
      apiGet({ method: "get_fixtures", date_start: dateStart, date_stop: dateEnd, event_type_key: 281 })
    ]);

    const all = [
      ...(r265.status==="fulfilled"?r265.value.data?.result||[]:[] ).map(m=>({...m,_etk:265})),
      ...(r267.status==="fulfilled"?r267.value.data?.result||[]:[] ).map(m=>({...m,_etk:267})),
      ...(r281.status==="fulfilled"?r281.value.data?.result||[]:[] ).map(m=>({...m,_etk:281})),
    ].filter(m => !tournName || (m.tournament_name||"").toLowerCase().includes(tournName));

    const debug = all.map(m => ({
      event_key: m.event_key, event_type_key: m._etk,
      tournament_name: m.tournament_name, tournament_round: m.tournament_round,
      event_date: m.event_date, event_status: m.event_status,
      event_live: m.event_live, event_winner: m.event_winner,
      event_final_result: m.event_final_result,
      event_first_player: m.event_first_player, event_second_player: m.event_second_player,
    }));

    const byRound = {};
    debug.forEach(m => {
      const r = `[etk:${m.event_type_key}] ${m.tournament_round||"?"}`;
      if (!byRound[r]) byRound[r] = [];
      byRound[r].push(m);
    });

    res.json({ total: debug.length, byRound, raw: debug });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
