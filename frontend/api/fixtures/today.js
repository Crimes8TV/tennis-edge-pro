const { apiGet, setCors } = require("../_lib");

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const today = new Date().toISOString().split("T")[0];
    const eventTypes = [
      { key: 265, label: "ATP Singles" }, { key: 267, label: "ATP Doubles" },
      { key: 281, label: "Challenger Singles" }, { key: 282, label: "Challenger Doubles" }
    ];
    const [fixtureResults, liveResults] = await Promise.all([
      Promise.allSettled(eventTypes.map(et =>
        apiGet({ method: "get_fixtures", date_start: today, date_stop: today, event_type_key: et.key })
          .then(r => (r.data?.result || []).map(m => ({ ...m, _category: et.label })))
      )),
      Promise.allSettled(eventTypes.map(et =>
        apiGet({ method: "get_livescore", event_type_key: et.key })
          .then(r => (r.data?.result || []).map(m => ({ ...m, _category: et.label })))
      ))
    ]);

    const allFixtures = fixtureResults.filter(r => r.status === "fulfilled").flatMap(r => r.value);
    const allLive = liveResults.filter(r => r.status === "fulfilled").flatMap(r => r.value);
    const liveMap = new Map();
    allLive.forEach(m => liveMap.set(`${m.event_first_player}|${m.event_second_player}`, m));

    const formatted = allFixtures.map(m => {
      const liveMatch = liveMap.get(`${m.event_first_player}|${m.event_second_player}`);
      const isLive = !!liveMatch || m.event_live === "1" || m.event_live === 1;
      const isFinished = m.event_status === "Finished" || m.event_status === "After Extra Time";
      const src = liveMatch || m;
      const parseScore = (v) => v != null ? String(v).split(".")[0] : "-";
      const setScores = [];
      if (Array.isArray(src.scores) && src.scores.length > 0) {
        [...src.scores].sort((a,b) => parseInt(a.score_set)-parseInt(b.score_set)).forEach(s => {
          if (s.score_first != null) setScores.push({ p1: parseScore(s.score_first), p2: parseScore(s.score_second) });
        });
      }
      return {
        player1: m.event_first_player, player2: m.event_second_player,
        score: src.event_final_result || "-", gameScore: src.event_game_result || "-", sets: setScores,
        status: isLive ? (src.event_status || "Live") : isFinished ? "Beendet" : m.event_status || "Geplant",
        tournament: m.tournament_name || "", category: m._category || "",
        time: m.event_time || "", live: isLive, finished: isFinished, matchKey: m.event_key
      };
    }).sort((a, b) => {
      if (a.live && !b.live) return -1; if (!a.live && b.live) return 1;
      if (a.finished && !b.finished) return 1; if (!a.finished && b.finished) return -1;
      return a.time > b.time ? 1 : -1;
    });
    res.json(formatted);
  } catch (err) {
    console.error("FIXTURES TODAY ERROR:", err.message);
    res.status(500).json({ error: "Fehler beim Laden der Fixtures" });
  }
};
