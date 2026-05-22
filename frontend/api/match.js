const { apiGet, setCors } = require("./_lib");

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const matchKey = req.url.split("/api/match/")[1]?.split("?")[0] || "";
    const today = new Date().toISOString().split("T")[0];
    const eventTypes = [265, 267, 281, 282];
    let match = null;

    const liveResults = await Promise.allSettled(eventTypes.map(et => apiGet({ method: "get_livescore", event_type_key: et })));
    for (const r of liveResults) {
      if (r.status === "fulfilled") {
        const found = (r.value.data?.result || []).find(m => String(m.event_key) === String(matchKey));
        if (found) { match = { ...found, _isLive: true }; break; }
      }
    }
    if (!match) {
      const fixResults = await Promise.allSettled(eventTypes.map(et => apiGet({ method: "get_fixtures", date_start: today, date_stop: today, event_type_key: et })));
      for (const r of fixResults) {
        if (r.status === "fulfilled") {
          const found = (r.value.data?.result || []).find(m => String(m.event_key) === String(matchKey));
          if (found) { match = found; break; }
        }
      }
    }
    if (!match) return res.status(404).json({ error: "Match nicht gefunden" });

    const extractSets = (m) => {
      const sets = [];
      if (Array.isArray(m.scores) && m.scores.length > 0) {
        [...m.scores].sort((a,b)=>parseInt(a.score_set)-parseInt(b.score_set)).forEach(s => {
          if (s.score_first != null) sets.push({ p1: String(s.score_first).split(".")[0], p2: String(s.score_second??"−").split(".")[0], set: parseInt(s.score_set) });
        });
      }
      if (sets.length === 0) {
        const sc = m.event_final_result || "";
        if (sc.includes(",")) sc.split(",").forEach((s,i) => { const p=s.trim().split("-"); if(p.length===2&&!isNaN(p[0])&&!isNaN(p[1])) sets.push({p1:p[0].trim(),p2:p[1].trim(),set:i+1}); });
      }
      return sets;
    };

    let sets = extractSets(match);
    if (sets.length === 0) {
      const sc = (match.event_final_result||"").replace(/ /g,"").split("-");
      if (sc.length===2&&!isNaN(sc[0])&&!isNaN(sc[1])) sets=[{p1:sc[0],p2:sc[1],set:1,isTotalSets:true}];
    }

    res.json({
      player1: match.event_first_player, player2: match.event_second_player,
      score: match.event_final_result||"-", gameScore: match.event_game_result||"-",
      status: match.event_status||"-", tournament: match.tournament_name||"",
      round: match.tournament_round||"", sets, scores: match.scores||[],
      statistics: match.statistics||[], pointbypoint: match.pointbypoint||[],
      server: match.event_serve==="1"?1:match.event_serve==="2"?2:null,
      live: !!(match._isLive||match.event_live==="1"||match.event_live===1),
      time: match.event_time||"", date: match.event_date||"", surface: match.event_ground||""
    });
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Laden der Match-Details" });
  }
};
