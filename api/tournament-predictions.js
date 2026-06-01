const { apiGet, eloFromRank, getRankFn, getFullNameFn, setCors } = require("./_lib");

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const today = new Date();
    const start = new Date(today); start.setDate(today.getDate() - 28);
    const end   = new Date(today); end.setDate(today.getDate() + 14);
    const dateStart = start.toISOString().split("T")[0];
    const dateEnd   = end.toISOString().split("T")[0];
    const todayStr  = today.toISOString().split("T")[0];

    const [singlesRes, doublesRes, standingsRes] = await Promise.allSettled([
      apiGet({ method: "get_fixtures", date_start: dateStart, date_stop: dateEnd, event_type_key: 265 }),
      apiGet({ method: "get_fixtures", date_start: dateStart, date_stop: dateEnd, event_type_key: 267 }),
      apiGet({ method: "get_standings", event_type: "ATP" })
    ]);

    const singles  = singlesRes.status  === "fulfilled" ? singlesRes.value.data?.result  || [] : [];
    const doubles  = doublesRes.status  === "fulfilled" ? doublesRes.value.data?.result  || [] : [];
    const standings = standingsRes.status === "fulfilled" ? standingsRes.value.data?.result || [] : [];

    const getRank    = getRankFn(standings);
    const getFullName = getFullNameFn(standings);

    // ── Runden-Normalisierung ─────────────────────────────────────────────────
    const ROUND_ORDER = {
      "final": 7, "semi-finals": 6, "quarter-finals": 5,
      "1/8-finals": 4, "1/16-finals": 3, "1/32-finals": 2, "1/64-finals": 1
    };

    const normalizeRound = (raw) => {
      if (!raw) return null;
      const dashIdx = raw.lastIndexOf(" - ");
      let clean = dashIdx !== -1 ? raw.substring(dashIdx + 3).trim() : raw.trim();
      const cl = clean.toLowerCase();
      if (cl.includes("qual") || cl.includes("pre-") || cl.includes("qualifying")) return null;
      if (cl === "final" || cl === "finals")        return "Final";
      if (cl.includes("semi"))                      return "Semi-Finals";
      if (cl.includes("quarter"))                   return "Quarter-Finals";
      if (cl.includes("1/8")  || cl === "r16" || cl === "round of 16") return "1/8-Finals";
      if (cl.includes("1/16") || cl === "r32" || cl === "round 1" || cl === "r1" || cl === "first round" || cl === "round of 32") return "1/16-Finals";
      if (cl.includes("1/32") || cl === "round of 64") return "1/32-Finals";
      if (cl.includes("1/64"))                      return "1/64-Finals";
      return clean;
    };

    const roundOrder = (name) => ROUND_ORDER[(name || "").toLowerCase()] || 0;

    // ── Match-Status / Sieger ─────────────────────────────────────────────────
    const isFinished = (m) => {
      if (m.event_status === "Finished" || m.event_status === "After Extra Time") return true;
      if (m.event_winner && m.event_winner !== "" && m.event_winner !== "0") return true;
      if (m.event_live === "1" || m.event_live === 1) return false;
      if (m.event_date && m.event_date < todayStr) return true;
      return false;
    };

    const getWinner = (m, p1, p2) => {
      if (!isFinished(m)) return null;
      if (m.event_winner === "First Player"  || m.event_winner === "1") return p1;
      if (m.event_winner === "Second Player" || m.event_winner === "2") return p2;
      const sc = (m.event_final_result || "").replace(/ /g, "").split("-");
      if (sc.length === 2 && !isNaN(sc[0]) && !isNaN(sc[1])) {
        const s1 = parseInt(sc[0]), s2 = parseInt(sc[1]);
        if (s1 > s2) return p1;
        if (s2 > s1) return p2;
      }
      return null;
    };

    // ── Alle Fixtures mit event_type_key markieren ────────────────────────────
    // FIX: event_type_key im Turnier-Schlüssel → ATP und Challenger mit gleichem
    // Namen (z.B. "Geneva") werden nicht mehr vermischt
    const allFixtures = [
      ...singles.map(m => ({ ...m, _disc: "Singles", _etk: "265" })),
      ...doubles.map(m => ({ ...m, _disc: "Doubles", _etk: "267" }))
    ];

    // ── Turnier-Gruppierung ───────────────────────────────────────────────────
    const tournMap = {};
    allFixtures.forEach(m => {
      const roundName = normalizeRound(m.tournament_round || m.event_round || "");
      if (!roundName) return;

      const tKey = `${m.tournament_name || "Unbekannt"}|||${m._disc}|||${m._etk}`;
      if (!tournMap[tKey]) {
        tournMap[tKey] = {
          name: m.tournament_name || "Unbekannt",
          disc: m._disc,
          etk: m._etk,
          dateStart: m.event_date || dateStart,
          matches: []
        };
      }
      if (m.event_date && m.event_date < tournMap[tKey].dateStart) {
        tournMap[tKey].dateStart = m.event_date;
      }
      tournMap[tKey].matches.push({ ...m, _roundName: roundName });
    });

    // ── Pro Turnier verarbeiten ───────────────────────────────────────────────
    const result = Object.values(tournMap).map(tourn => {

      // 1) Deduplizieren: gleiches Matchup+Runde → abgeschlossenes bevorzugen
      const dedup = new Map();
      tourn.matches.forEach(m => {
        const p1 = getFullName(m.event_first_player);
        const p2 = getFullName(m.event_second_player);
        if (!p1 || !p2) return;
        const k = [p1, p2].sort().join("|||") + "|||" + m._roundName;
        if (!dedup.has(k)) {
          dedup.set(k, { ...m, _p1: p1, _p2: p2 });
        } else if (isFinished(m) && !isFinished(dedup.get(k))) {
          dedup.set(k, { ...m, _p1: p1, _p2: p2 });
        }
      });
      const matches = [...dedup.values()];

      // 2) Alle Spieler sammeln
      const playerMap = new Map();
      matches.forEach(m => {
        [m._p1, m._p2].forEach(name => {
          if (!name || playerMap.has(name)) return;
          const rank = getRank(name);
          playerMap.set(name, { name, rank, elo: eloFromRank(rank) });
        });
      });
      const allPlayers = [...playerMap.values()].sort((a, b) => a.rank - b.rank);

      // 3) Eliminierte ermitteln
      // Letzter bekannter Rundenstand pro Spieler
      const lastRound = new Map();
      matches.forEach(m => {
        const ro = roundOrder(m._roundName);
        [m._p1, m._p2].forEach(name => {
          if (!lastRound.has(name) || lastRound.get(name) < ro) lastRound.set(name, ro);
        });
      });

      const eliminated = new Set();
      matches.forEach(m => {
        const winner = getWinner(m, m._p1, m._p2);
        if (!winner) return;
        const loser = winner === m._p1 ? m._p2 : m._p1;
        const ro = roundOrder(m._roundName);
        if ((lastRound.get(loser) || 0) <= ro) {
          eliminated.add(loser.toLowerCase());
        }
      });

      // 4) Aktive Spieler
      const activePlayers = allPlayers.filter(p =>
        !eliminated.has(p.name.toLowerCase()) &&
        !eliminated.has(p.name.toLowerCase().split(" ").pop())
      );

      // 5) Win-Probability (normalisiert auf 100%)
      const pool = (activePlayers.length > 0 ? activePlayers : allPlayers).slice(0, 8);
      const scores = pool.map(p => ({ ...p, s: Math.exp(-p.rank * 0.08) }));
      const total  = scores.reduce((acc, p) => acc + p.s, 0) || 1;
      const winProbs = scores
        .map(p => ({ ...p, winProb: Math.max(1, Math.round((p.s / total) * 100)) }))
        .sort((a, b) => b.winProb - a.winProb);
      const probSum = winProbs.reduce((s, p) => s + p.winProb, 0);
      if (winProbs.length > 0 && probSum !== 100) winProbs[0].winProb += (100 - probSum);

      // 6) Runden aufbauen
      const roundsMap = {};
      matches.forEach(m => {
        const key = m._roundName;
        if (!roundsMap[key]) roundsMap[key] = { round: key, matches: [] };

        const r1 = getRank(m._p1), r2 = getRank(m._p2);
        const elo1 = eloFromRank(r1), elo2 = eloFromRank(r2);
        const prob1 = Math.round(1 / (1 + Math.pow(10, (elo2 - elo1) / 400)) * 100);
        const predPick = prob1 >= 50 ? m._p1 : m._p2;
        const fin = isFinished(m);
        const actualWinner = fin ? getWinner(m, m._p1, m._p2) : null;
        const score = m.event_final_result && m.event_final_result !== "-" ? m.event_final_result : null;
        const wLast = actualWinner ? actualWinner.toLowerCase().split(" ").pop() : null;
        const pLast = predPick ? predPick.toLowerCase().split(" ").pop() : null;

        roundsMap[key].matches.push({
          player1: m._p1, player2: m._p2, rank1: r1, rank2: r2,
          prediction: predPick, prob: Math.max(prob1, 100 - prob1),
          date: m.event_date || "", time: m.event_time || "",
          actualWinner, score, isFinished: fin,
          correct: wLast && pLast ? wLast === pLast : null
        });
      });

      const MAX = { "1/64-Finals":64,"1/32-Finals":32,"1/16-Finals":16,"1/8-Finals":8,"Quarter-Finals":4,"Semi-Finals":2,"Final":1 };

      const sortedRounds = Object.values(roundsMap)
        .sort((a, b) => roundOrder(a.round) - roundOrder(b.round))
        .map(r => {
          const max = MAX[r.round] || 999;
          const sorted = [...r.matches].sort((a, b) => {
            if (a.isFinished && !b.isFinished) return -1;
            if (!a.isFinished && b.isFinished) return 1;
            return (a.date || "").localeCompare(b.date || "");
          });
          return { ...r, matches: sorted.slice(0, max) };
        })
        .filter(r => r.matches.length > 0);

      const typeLabel = tourn.disc === "Doubles"
        ? (tourn.etk === "267" ? "ATP Doubles" : "Challenger Doubles")
        : (tourn.etk === "265" ? "ATP Singles" : "Challenger Singles");

      return {
        name: tourn.name, type: typeLabel, dateStart: tourn.dateStart,
        playerCount: allPlayers.length,
        favorite: allPlayers[0] ? { name: allPlayers[0].name, rank: allPlayers[0].rank, elo: allPlayers[0].elo } : null,
        winProbs: winProbs.slice(0, 5), rounds: sortedRounds,
        drawSet: allPlayers.length > 0,
        eliminatedCount: eliminated.size, activePlayerCount: activePlayers.length,
        isLive: tourn.matches.some(m => m.event_live === "1" || m.event_live === 1),
        hasStarted: eliminated.size > 0
      };
    }).sort((a, b) => a.dateStart.localeCompare(b.dateStart));

    res.json(result);
  } catch (err) {
    console.error("TOURNAMENT PREDICTIONS ERROR:", err.message);
    res.status(500).json({ error: "Fehler beim Laden der Turnier-Predictions" });
  }
};
