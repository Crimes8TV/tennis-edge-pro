const { apiGet, eloFromRank, setCors } = require("./_lib");

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const today = new Date().toISOString().split("T")[0];
    const [fixturesRes, standingsRes] = await Promise.allSettled([
      apiGet({ method: "get_fixtures", date_start: today, date_stop: today, event_type_key: 265 }),
      apiGet({ method: "get_standings", event_type: "ATP" })
    ]);
    const matches  = fixturesRes.status  === "fulfilled" ? fixturesRes.value.data?.result  || [] : [];
    const standings = standingsRes.status === "fulfilled" ? standingsRes.value.data?.result || [] : [];
    if (matches.length === 0) return res.json([]);

    const getName = (s) => { const ln = s.trim().split(" ").pop().toLowerCase(); const f = standings.find(p => (p.player||"").toLowerCase().split(" ").pop()===ln); return f?f.player:s; };
    const getRank = (s) => { const ln = s.trim().split(" ").pop().toLowerCase(); const f = standings.find(p => (p.player||"").toLowerCase().split(" ").pop()===ln); return f?parseInt(f.place)||100:100; };

    const valuePicks = [];
    for (const match of matches.slice(0, 15)) {
      const p1s = match.event_first_player, p2s = match.event_second_player;
      if (!p1s || !p2s) continue;
      const p1 = getName(p1s), p2 = getName(p2s);
      const r1 = getRank(p1s), r2 = getRank(p2s);
      const prob1 = Math.round(1/(1+Math.pow(10,(eloFromRank(r2)-eloFromRank(r1))/400))*100);
      const prob2 = 100-prob1;

      let odds1=null,odds2=null,bookmaker="-";
      try {
        const or = await apiGet({ method:"get_odds", match_key:match.event_key });
        const ha = or.data?.result?.[match.event_key]?.["Home/Away"];
        if (ha) { const bk=Object.keys(ha.Home||{})[0]; if(bk){bookmaker=bk;odds1=parseFloat(ha.Home[bk]);odds2=parseFloat(ha.Away[bk]);} }
      } catch(e){}

      let pick=null,edge=null,bestOdds=null;
      if (odds1&&odds2) {
        const e1=prob1-Math.round(100/odds1), e2=prob2-Math.round(100/odds2);
        if (e1>e2&&e1>2){pick=p1;edge=e1;bestOdds=odds1;} else if(e2>e1&&e2>2){pick=p2;edge=e2;bestOdds=odds2;}
      } else if (Math.abs(prob1-50)>8) {
        pick=prob1>prob2?p1:p2; edge=Math.abs(prob1-50)-8;
      }
      if (pick) valuePicks.push({ match:`${p1} vs ${p2}`, tournament:match.tournament_name||"", pick, ourProb:pick===p1?prob1:prob2, impliedProb:bestOdds?Math.round(100/bestOdds):null, bestOdds, edge:Math.round((edge||0)*10)/10, bookmaker, matchKey:match.event_key, time:match.event_time||"" });
    }
    valuePicks.sort((a,b)=>b.edge-a.edge);
    res.json(valuePicks.slice(0,10));
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Laden der Value Picks" });
  }
};
