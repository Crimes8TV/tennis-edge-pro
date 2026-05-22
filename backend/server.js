const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors({
  origin: (origin, callback) => callback(null, true)
}));

app.use(express.json());

const API_KEY = process.env.API_TENNIS_KEY;
const BASE_URL = "https://api.api-tennis.com/tennis/";

// Hilfsfunktion
const apiGet = (params) =>
  axios.get(BASE_URL, { params: { APIkey: API_KEY, ...params } });

// ─── SPIELERLISTE (ATP Rankings via get_standings) ───────────────────────────
app.get("/api/players", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    // ATP Rankings + heutige Fixture-Spieler parallel laden
    const [atpRes, fixturesRes] = await Promise.allSettled([
      apiGet({ method: "get_standings", event_type: "ATP" }),
      apiGet({ method: "get_fixtures", date_start: today, date_stop: today, event_type_key: 281 })
    ]);

    const atpRaw = atpRes.status === "fulfilled" ? atpRes.value.data?.result || [] : [];
    const fixturesRaw = fixturesRes.status === "fulfilled" ? fixturesRes.value.data?.result || [] : [];

    // ATP Spieler
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

    // Challenger Spieler aus heutigen Fixtures extrahieren
    const atpNames = new Set(atpPlayers.map(p => p.name.toLowerCase()));
    const challengerPlayers = [];
    const seen = new Set();

    fixturesRaw.forEach(m => {
      [m.event_first_player, m.event_second_player].forEach(shortName => {
        if (!shortName) return;
        // Vollständigen Nachnamen extrahieren
        const lastName = shortName.trim().split(" ").pop();
        if (seen.has(lastName.toLowerCase())) return;
        seen.add(lastName.toLowerCase());

        // Prüfen ob schon in ATP Liste
        const alreadyIn = [...atpNames].some(n => n.includes(lastName.toLowerCase()));
        if (!alreadyIn) {
          challengerPlayers.push({
            name: shortName,
            rank: 200 + challengerPlayers.length,
            points: 0,
            country: "",
            player_key: null,
            elo: 1500,
            serve: 65, return: 65, clutch: 70, momentum: 70,
            hard: 70, clay: 70, grass: 65,
            form: [70, 72, 68, 71, 70]
          });
        }
      });
    });

    res.json([...atpPlayers, ...challengerPlayers]);
  } catch (err) {
    console.error("STANDINGS ERROR:", err.message);
    res.status(500).json({ error: "Fehler beim Laden der Spielerliste" });
  }
});

// ─── SPIELER STATS (get_players) ─────────────────────────────────────────────
app.get("/api/player/:name", async (req, res) => {
  try {
    const playerName = req.params.name;

    // Erst Standings holen um player_key zu finden
    const standingsRes = await apiGet({ method: "get_standings", event_type: "ATP" });
    const standings = standingsRes.data?.result || [];
    const found = standings.find(p =>
      (p.player || "").toLowerCase().includes(playerName.toLowerCase())
    );

    if (!found?.player_key) {
      return res.json({
        name: playerName,
        stats: { winRate: "-", serveRating: "-", returnRating: "-", fitness: "-" },
        surfaces: { hard: "-", clay: "-", grass: "-" },
        recentForm: []
      });
    }

    const playerRes = await apiGet({ method: "get_players", player_key: found.player_key });
    const playerData = playerRes.data?.result?.[0];

    if (!playerData) throw new Error("Keine Spielerdaten");

    // Aktuellste Saison-Stats
    const stats = playerData.stats?.find(s => s.type === "singles") || {};
    const hardWon = parseInt(stats.hard_won) || 0;
    const hardLost = parseInt(stats.hard_lost) || 0;
    const clayWon = parseInt(stats.clay_won) || 0;
    const clayLost = parseInt(stats.clay_lost) || 0;
    const grassWon = parseInt(stats.grass_won) || 0;
    const grassLost = parseInt(stats.grass_lost) || 0;
    const totalWon = parseInt(stats.matches_won) || 0;
    const totalLost = parseInt(stats.matches_lost) || 0;
    const total = totalWon + totalLost;

    res.json({
      name: playerData.player_name,
      country: playerData.player_country,
      logo: playerData.player_logo,
      stats: {
        winRate: total > 0 ? Math.round((totalWon / total) * 100) : "-",
        titles: stats.titles || 0,
        rank: found.place,
        points: found.points
      },
      surfaces: {
        hard: hardWon + hardLost > 0
          ? Math.round((hardWon / (hardWon + hardLost)) * 100) : "-",
        clay: clayWon + clayLost > 0
          ? Math.round((clayWon / (clayWon + clayLost)) * 100) : "-",
        grass: grassWon + grassLost > 0
          ? Math.round((grassWon / (grassWon + grassLost)) * 100) : "-"
      },
      recentForm: []
    });
  } catch (err) {
    console.error("PLAYER ERROR:", err.message);
    res.status(500).json({ error: "Fehler beim Laden der Spielerdaten" });
  }
});

// ─── LIVE MATCHES (get_livescore) ─────────────────────────────────────────────
app.get("/api/live", async (req, res) => {
  try {
    const response = await apiGet({
      method: "get_livescore",
      event_type_key: 265  // ATP Singles
    });
    const matches = response.data?.result || [];

    const formatted = matches.map(m => ({
      player1: m.event_first_player,
      player2: m.event_second_player,
      score: m.event_final_result || "-",
      status: m.event_status || "",
      tournament: m.tournament_name || ""
    }));

    res.json(formatted);
  } catch (err) {
    console.error("LIVE ERROR:", err.message);
    res.json([]);
  }
});

// ─── H2H (get_H2H) ────────────────────────────────────────────────────────────
app.get("/api/h2h", async (req, res) => {
  try {
    const { p1_key, p2_key } = req.query;
    if (!p1_key || !p2_key) return res.status(400).json({ error: "Spieler-Keys fehlen" });

    const response = await apiGet({
      method: "get_H2H",
      first_player_key: p1_key,
      second_player_key: p2_key
    });

    const result = response.data?.result || {};
    const h2h = result.H2H || [];
    const p1Results = result.firstPlayerResults || [];
    const p2Results = result.secondPlayerResults || [];

    // H2H Bilanz berechnen
    let p1Wins = 0, p2Wins = 0;
    h2h.forEach(match => {
      if (match.event_winner === "First Player") p1Wins++;
      else if (match.event_winner === "Second Player") p2Wins++;
    });

    // Selbst-Matches und ungültige Einträge filtern
    const filterSelfMatches = (matches) => matches.filter(m => {
      const p1 = (m.event_first_player || "").toLowerCase().trim();
      const p2 = (m.event_second_player || "").toLowerCase().trim();
      if (!p1 || !p2) return false;
      if (p1 === p2) return false;
      // Nachnamen vergleichen
      const p1Last = p1.split(" ").pop();
      const p2Last = p2.split(" ").pop();
      if (p1Last === p2Last) return false;
      // Initialen-Match: "B. Gojo" vs "B. Gojo"
      const p1Init = p1.split(" ")[0].replace(".", "");
      const p2Init = p2.split(" ")[0].replace(".", "");
      if (p1Init === p2Init && p1Last === p2Last) return false;
      return true;
    }).slice(0, 5);

    res.json({
      h2h_matches: h2h.slice(0, 10),
      p1_wins: p1Wins,
      p2_wins: p2Wins,
      p1_recent: filterSelfMatches(p1Results),
      p2_recent: filterSelfMatches(p2Results)
    });
  } catch (err) {
    console.error("H2H ERROR:", err.message);
    res.status(500).json({ error: "Fehler beim Laden der H2H-Daten" });
  }
});

// ─── ODDS (get_odds) ──────────────────────────────────────────────────────────
app.get("/api/odds/:match_key", async (req, res) => {
  try {
    const response = await apiGet({
      method: "get_odds",
      match_key: req.params.match_key
    });
    res.json(response.data?.result || {});
  } catch (err) {
    console.error("ODDS ERROR:", err.message);
    res.status(500).json({ error: "Fehler beim Laden der Quoten" });
  }
});

// ─── MATCH PREDICTION (eigene Logik, unverändert) ────────────────────────────
app.get("/api/predict", async (req, res) => {
  const { p1, p2, rank1 = 10, rank2 = 20, surface = "hard" } = req.query;

  const form1 = Number(req.query.form1 || 75);
  const form2 = Number(req.query.form2 || 75);
  const clutch1 = Number(req.query.clutch1 || 70);
  const clutch2 = Number(req.query.clutch2 || 70);
  const momentum1 = Number(req.query.momentum1 || 75);
  const momentum2 = Number(req.query.momentum2 || 75);

  const eloFromRank = (rank) => Math.max(1500, 2400 - Number(rank) * 6);
  const elo1 = eloFromRank(rank1);
  const elo2 = eloFromRank(rank2);
  const expected1 = 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
  const expected2 = 1 - expected1;

  // Surface-spezifische Modifikatoren basierend auf Spielertyp (Rang + Nationalität)
  // Generelle Surface-Tendenzen nach Rang-Bereich
  const getSurfaceModifier = (rank, surf) => {
    const r = Number(rank);
    // Top-Spieler sind ausgeglichener, niedrigere Ränge haben mehr Varianz
    const variance = Math.max(2, 8 - r * 0.05);
    const mods = {
      hard:  Math.round((Math.random() - 0.5) * variance),
      clay:  Math.round((Math.random() - 0.5) * variance),
      grass: Math.round((Math.random() - 0.5) * variance)
    };
    return mods[surf] || 0;
  };

  const surfMod1 = getSurfaceModifier(rank1, surface);
  const surfMod2 = getSurfaceModifier(rank2, surface);

  // Surface-Gewichtung: Clay = mehr Unterschiede, Grass = schnell & serve-dominant
  const surfaceWeight = surface === "clay" ? 1.8 : surface === "grass" ? 1.5 : 1.2;

  let score1 = expected1 * 100 * 0.50 + form1 * 0.20 + clutch1 * 0.10 + momentum1 * 0.15 + surfMod1 * surfaceWeight;
  let score2 = expected2 * 100 * 0.50 + form2 * 0.20 + clutch2 * 0.10 + momentum2 * 0.15 + surfMod2 * surfaceWeight;

  // Externe Surface-Werte falls vorhanden
  const surface1 = Number(req.query.surface1 || 0);
  const surface2 = Number(req.query.surface2 || 0);
  if (surface1 > 0 || surface2 > 0) {
    score1 += surface1 * 0.5;
    score2 += surface2 * 0.5;
  }

  const p1Win = Math.round((score1 / (score1 + score2)) * 100);
  const rankDiff = Math.abs(rank1 - rank2);
  const rankingFactor = Math.min(70, 20 + rankDiff * 0.6);
  const formFactor = Math.max(10, 40 - rankDiff * 0.2);
  const clutchFactor = 10 + Math.random() * 10;
  const momentumFactor = Math.max(10, 100 - rankingFactor - formFactor - clutchFactor);

  // Bessere Confidence: basiert auf Rankdifferenz + Winwahrscheinlichkeit
  const gap = Math.abs(p1Win - 50);
  const rankBoost = Math.min(30, rankDiff * 0.4);
  const confidence = Math.min(99, Math.round(gap * 1.8 + rankBoost));

  // Abgeleitete Spieler-Stats aus Rang und Elo — realistisch skaliert
  const deriveStats = (rank, elo) => {
    // Rang 1 = ~88, Rang 50 = ~75, Rang 100 = ~68, Rang 200 = ~60
    const base = Math.max(55, Math.min(88, 90 - Math.sqrt(rank) * 2.5));
    const eloBonus = Math.max(-5, Math.min(5, (elo - 1900) * 0.02));
    const rand = () => (Math.random() - 0.5) * 6;
    return {
      serve:    Math.min(92, Math.max(55, Math.round(base + eloBonus + rand()))),
      return:   Math.min(92, Math.max(55, Math.round(base + eloBonus + rand()))),
      clutch:   Math.min(92, Math.max(55, Math.round(base + eloBonus + rand()))),
      momentum: Math.min(92, Math.max(55, Math.round(base + eloBonus + rand()))),
    };
  };
  const p1Stats = deriveStats(Number(rank1), elo1);
  const p2Stats = deriveStats(Number(rank2), elo2);

  // ── Set-Win Wahrscheinlichkeit ──────────────────────────────────────────────
  // Basiert auf Elo + Surface-Modifikator
  const surfaceSetMod = surface === "clay" ? 0.03 : surface === "grass" ? -0.02 : 0;
  const setWinP1 = Math.min(0.85, Math.max(0.15, expected1 + surfaceSetMod + (surfMod1 - surfMod2) * 0.01));
  const setWinP2 = 1 - setWinP1;

  // ── Handicap-Empfehlung (Games) ──────────────────────────────────────────────
  // Typisches Tennis-Matchformat: Best of 3 (6 Games pro Satz)
  // Erwartete Games-Differenz pro Satz basierend auf Set-Win%
  // Wenn setWinP1 = 0.65 → Favorit gewinnt ~65% der Sätze
  // Expected games: Favorit ~6.2, Underdog ~4.1 pro Satz
  const expectedGamesPerSetWinner = 6 + Math.max(0, (Math.max(setWinP1, setWinP2) - 0.5) * 2);
  const expectedGamesPerSetLoser = Math.max(1, 6 - (Math.max(setWinP1, setWinP2) - 0.5) * 8);
  
  const favoriteIsP1 = setWinP1 >= setWinP2;
  const favWinProb = Math.max(setWinP1, setWinP2);
  const favorite = favoriteIsP1 ? p1 : p2;
  const underdog = favoriteIsP1 ? p2 : p1;

  // Erwartete Total-Games über 3 Sätze
  // Szenario 1: Favorit gewinnt 2-0 (prob: favWinProb^2)
  // Szenario 2: Favorit gewinnt 2-1 (prob: 2*favWinProb^2*(1-favWinProb))
  // Szenario 3: Underdog gewinnt 2-1 (prob: 2*favWinProb*(1-favWinProb)^2)
  // Szenario 4: Underdog gewinnt 2-0 (prob: (1-favWinProb)^2)
  const p = favWinProb;
  const q = 1 - p;
  
  const sc20 = p*p; // fav 2-0
  const sc21 = 2*p*p*q; // fav 2-1
  const sc12 = 2*p*q*q; // dog 2-1
  const sc02 = q*q; // dog 2-0
  
  // Expected games für Favorit und Underdog
  const favGames20 = 2 * expectedGamesPerSetWinner;
  const dogGames20 = 2 * expectedGamesPerSetLoser;
  const favGames21 = 2 * expectedGamesPerSetWinner + expectedGamesPerSetLoser;
  const dogGames21 = 2 * expectedGamesPerSetLoser + expectedGamesPerSetWinner;
  const favGames12 = expectedGamesPerSetWinner + 2 * expectedGamesPerSetLoser;
  const dogGames12 = expectedGamesPerSetLoser + 2 * expectedGamesPerSetWinner;
  const favGames02 = 2 * expectedGamesPerSetLoser;
  const dogGames02 = 2 * expectedGamesPerSetWinner;
  
  const expFavGames = sc20*favGames20 + sc21*favGames21 + sc12*favGames12 + sc02*favGames02;
  const expDogGames = sc20*dogGames20 + sc21*dogGames21 + sc12*dogGames12 + sc02*dogGames02;
  const expGameDiff = expFavGames - expDogGames;
  
  // Handicap-Linie: runde auf .5
  const handicapLine = Math.round(expGameDiff * 2) / 2;
  
  // Handicap-Empfehlung
  let handicapPick, handicapReason;
  if (handicapLine >= 2) {
    handicapPick = `${favorite} -${handicapLine} Games`;
    handicapReason = `${favorite} dominiert erwartungsgemäß um ~${handicapLine} Games. Favorit auf Handicap empfohlen.`;
  } else if (handicapLine >= 0.5) {
    handicapPick = `${favorite} -${handicapLine} Games (knapp)`;
    handicapReason = `Kleiner Vorteil für ${favorite}. Handicap nur bei guter Quote spielen.`;
  } else {
    handicapPick = `Kein klares Handicap`;
    handicapReason = `Zu ausgeglichen für eine Handicap-Empfehlung.`;
  }

  res.json({
    player1: p1,
    player2: p2,
    surface,
    elo: { [p1]: Math.round(elo1), [p2]: Math.round(elo2) },
    prediction: { [p1]: p1Win, [p2]: 100 - p1Win },
    confidence,
    playerStats: { [p1]: p1Stats, [p2]: p2Stats },
    setWinProb: {
      [p1]: Math.round(setWinP1 * 100),
      [p2]: Math.round(setWinP2 * 100)
    },
    handicap: {
      line: handicapLine,
      favorite,
      underdog,
      pick: handicapPick,
      reason: handicapReason,
      expGames: {
        [favorite]: Math.round(expFavGames * 10) / 10,
        [underdog]: Math.round(expDogGames * 10) / 10
      }
    },
    factors: {
      ranking: Math.round(rankingFactor),
      form: Math.round(formFactor),
      clutch: Math.round(clutchFactor),
      momentum: Math.round(momentumFactor),
      surface
    },
    explain:
      p1Win > 60
        ? `${p1} hat klare Vorteile durch Ranking, Form und Matchup-Stärke.`
        : p1Win < 40
        ? `${p2} hat klare Vorteile durch Ranking, Form und Matchup-Stärke.`
        : `Das Match ist sehr ausgeglichen.`,
    edge:
      p1Win > 65 ? `${p1} klar überlegen`
      : p1Win > 55 ? `${p1} leichter Vorteil`
      : p1Win < 35 ? `${p2} klar überlegen`
      : p1Win < 45 ? `${p2} leichter Vorteil`
      : "sehr ausgeglichen"
  });
});


// ─── TAGESAKTUELLE VALUE PICKS ────────────────────────────────────────────────
app.get("/api/valuepicks", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    // 1. Heutige ATP Singles Fixtures holen
    const fixturesRes = await apiGet({
      method: "get_fixtures",
      date_start: today,
      date_stop: today,
      event_type_key: 265
    });

    const matches = fixturesRes.data?.result || [];
    if (matches.length === 0) return res.json([]);

    // 2. Standings für Rank-Lookup
    const standingsRes = await apiGet({ method: "get_standings", event_type: "ATP" });
    const standings = standingsRes.data?.result || [];

    // Vollständigen Namen aus Standings finden anhand Nachname
    const getFullName = (shortName) => {
      const parts = shortName.trim().split(" ");
      const lastName = parts[parts.length - 1].toLowerCase();
      const found = standings.find(p =>
        (p.player || "").toLowerCase().split(" ").pop() === lastName
      );
      return found ? found.player : shortName;
    };

    const getRank = (name) => {
      const parts = name.trim().split(" ");
      const lastName = parts[parts.length - 1].toLowerCase();
      const found = standings.find(p =>
        (p.player || "").toLowerCase().split(" ").pop() === lastName
      );
      return found ? parseInt(found.place) || 100 : 100;
    };

    const eloFromRank = (rank) => Math.max(1500, 2400 - rank * 6);

    const valuePicks = [];

    for (const match of matches.slice(0, 15)) {
      const p1Short = match.event_first_player;
      const p2Short = match.event_second_player;
      if (!p1Short || !p2Short) continue;

      const p1 = getFullName(p1Short);
      const p2 = getFullName(p2Short);

      const rank1 = getRank(p1Short);
      const rank2 = getRank(p2Short);
      const elo1 = eloFromRank(rank1);
      const elo2 = eloFromRank(rank2);

      // Unsere Gewinnwahrscheinlichkeit via Elo
      const expected1 = 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
      const prob1 = Math.round(expected1 * 100);
      const prob2 = 100 - prob1;

      // Quoten holen
      let odds1 = null, odds2 = null;
      let bookmaker = "-";
      try {
        const oddsRes = await apiGet({
          method: "get_odds",
          match_key: match.event_key
        });
        const oddsData = oddsRes.data?.result?.[match.event_key];
        const homeAway = oddsData?.["Home/Away"];
        if (homeAway) {
          const books = Object.keys(homeAway.Home || {});
          if (books.length > 0) {
            bookmaker = books[0];
            odds1 = parseFloat(homeAway.Home[bookmaker]);
            odds2 = parseFloat(homeAway.Away[bookmaker]);
          }
        }
      } catch (e) {}

      // Value berechnen: unsere Prob - implizierte Buchmacher-Prob
      let pick = null, edge = null, bestOdds = null;

      if (odds1 && odds2) {
        const implied1 = Math.round(100 / odds1);
        const implied2 = Math.round(100 / odds2);
        const edge1 = prob1 - implied1;
        const edge2 = prob2 - implied2;

        if (edge1 > edge2 && edge1 > 2) {
          pick = p1;
          edge = edge1;
          bestOdds = odds1;
        } else if (edge2 > edge1 && edge2 > 2) {
          pick = p2;
          edge = edge2;
          bestOdds = odds2;
        }
      } else {
        // Kein Odds-Daten: rein Elo-basiert
        if (Math.abs(prob1 - 50) > 8) {
          pick = prob1 > prob2 ? p1 : p2;
          edge = Math.abs(prob1 - 50) - 8;
          bestOdds = null;
        }
      }

      if (pick) {
        const ourProb = pick === p1 ? prob1 : prob2;
        const impliedProb = bestOdds ? Math.round(100 / bestOdds) : null;
        valuePicks.push({
          match: `${p1} vs ${p2}`,
          tournament: match.tournament_name || "",
          pick,
          ourProb,
          impliedProb,
          bestOdds,
          edge: Math.round(edge * 10) / 10,
          bookmaker,
          matchKey: match.event_key,
          time: match.event_time || ""
        });
      }
    }

    // Sortiert nach Edge absteigend
    valuePicks.sort((a, b) => b.edge - a.edge);
    res.json(valuePicks.slice(0, 10));

  } catch (err) {
    console.error("VALUE PICKS ERROR:", err.message);
    res.status(500).json({ error: "Fehler beim Laden der Value Picks" });
  }
});


// ─── HEUTIGE FIXTURES + LIVE STATUS ──────────────────────────────────────────
app.get("/api/fixtures/today", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const eventTypes = [
      { key: 265, label: "ATP Singles" },
      { key: 267, label: "ATP Doubles" },
      { key: 281, label: "Challenger Singles" },
      { key: 282, label: "Challenger Doubles" }
    ];

    // Fixtures + Live parallel laden
    const [fixtureResults, liveResults] = await Promise.all([
      Promise.allSettled(
        eventTypes.map(et =>
          apiGet({ method: "get_fixtures", date_start: today, date_stop: today, event_type_key: et.key })
            .then(r => (r.data?.result || []).map(m => ({ ...m, _category: et.label })))
        )
      ),
      Promise.allSettled(
        eventTypes.map(et =>
          apiGet({ method: "get_livescore", event_type_key: et.key })
            .then(r => (r.data?.result || []).map(m => ({ ...m, _category: et.label })))
        )
      )
    ]);

    const allFixtures = fixtureResults
      .filter(r => r.status === "fulfilled")
      .flatMap(r => r.value);

    const allLive = liveResults
      .filter(r => r.status === "fulfilled")
      .flatMap(r => r.value);

    // Live-Matches als Map für schnellen Lookup
    const liveMap = new Map();
    allLive.forEach(m => {
      const key = `${m.event_first_player}|${m.event_second_player}`;
      liveMap.set(key, m);
    });

    const formatted = allFixtures.map(m => {
      const key = `${m.event_first_player}|${m.event_second_player}`;
      const liveMatch = liveMap.get(key);
      const isLive = !!liveMatch || m.event_live === "1" || m.event_live === 1;
      const isFinished = m.event_status === "Finished" || m.event_status === "After Extra Time";

      const src = liveMatch || m;
      // Set-Scores aus scores Array (score_first/score_second/score_set)
      const parseScore = (val) => val !== undefined && val !== null ? String(val).split(".")[0] : "-";
      const setScores = [];
      if (Array.isArray(src.scores) && src.scores.length > 0) {
        const sorted = [...src.scores].sort((a, b) => parseInt(a.score_set) - parseInt(b.score_set));
        sorted.forEach(s => {
          if (s.score_first !== undefined && s.score_first !== null) {
            setScores.push({ p1: parseScore(s.score_first), p2: parseScore(s.score_second) });
          }
        });
      }

      return {
        player1: m.event_first_player,
        player2: m.event_second_player,
        score: src.event_final_result || "-",
        gameScore: src.event_game_result || "-",
        sets: setScores,
        status: isLive ? (src.event_status || "Live") : isFinished ? "Beendet" : m.event_status || "Geplant",
        tournament: m.tournament_name || "",
        category: m._category || "",
        time: m.event_time || "",
        live: isLive,
        finished: isFinished,
        matchKey: m.event_key
      };
    })
    .sort((a, b) => {
      // Sortierung: Live zuerst, dann geplant nach Zeit, dann beendet
      if (a.live && !b.live) return -1;
      if (!a.live && b.live) return 1;
      if (a.finished && !b.finished) return 1;
      if (!a.finished && b.finished) return -1;
      return a.time > b.time ? 1 : -1;
    });

    res.json(formatted);
  } catch (err) {
    console.error("FIXTURES TODAY ERROR:", err.message);
    res.status(500).json({ error: "Fehler beim Laden der Fixtures" });
  }
});


// ─── MATCH DETAILS ────────────────────────────────────────────────────────────
app.get("/api/match/:matchKey", async (req, res) => {
  try {
    const { matchKey } = req.params;
    const today = new Date().toISOString().split("T")[0];

    // Alle Event-Types durchsuchen um das Match zu finden
    const eventTypes = [265, 267, 281, 282];
    let match = null;

    // Erst in Live-Scores suchen
    const liveResults = await Promise.allSettled(
      eventTypes.map(et => apiGet({ method: "get_livescore", event_type_key: et }))
    );
    for (const r of liveResults) {
      if (r.status === "fulfilled") {
        const found = (r.value.data?.result || []).find(m => String(m.event_key) === String(matchKey));
        if (found) { match = { ...found, _isLive: true }; break; }
      }
    }

    // Falls nicht live, in Fixtures suchen
    if (!match) {
      const fixtureResults = await Promise.allSettled(
        eventTypes.map(et => apiGet({ method: "get_fixtures", date_start: today, date_stop: today, event_type_key: et }))
      );
      for (const r of fixtureResults) {
        if (r.status === "fulfilled") {
          const found = (r.value.data?.result || []).find(m => String(m.event_key) === String(matchKey));
          if (found) { match = found; break; }
        }
      }
    }

    if (!match) return res.status(404).json({ error: "Match nicht gefunden" });

    // Set-Scores aus scores Array extrahieren (score_first, score_second, score_set)
    const extractSets = (m) => {
      const sets = [];

      // Methode 1: scores Array mit score_first/score_second/score_set
      if (Array.isArray(m.scores) && m.scores.length > 0) {
        const sorted = [...m.scores].sort((a, b) => parseInt(a.score_set) - parseInt(b.score_set));
        sorted.forEach(s => {
          if (s.score_first !== undefined && s.score_first !== null) {
            // score_first kann "6" oder "6.3" sein — nur Integer-Teil nehmen
            sets.push({
              p1: String(s.score_first).split(".")[0],
              p2: String(s.score_second ?? "-").split(".")[0],
              set: parseInt(s.score_set)
            });
          }
        });
      }

      // Methode 2: event_final_result "6-4, 3-6, 7-5"
      if (sets.length === 0) {
        const scoreStr = m.event_final_result || "";
        if (scoreStr.includes(",")) {
          scoreStr.split(",").forEach((s, i) => {
            const parts = s.trim().split("-");
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              sets.push({ p1: parts[0].trim(), p2: parts[1].trim(), set: i + 1 });
            }
          });
        }
      }

      return sets;
    };

    let sets = extractSets(match);
    
    // Fallback: wenn keine individuellen Sets, Score-String "1 - 1" als Satz-Stand verwenden
    if (sets.length === 0) {
      const scoreStr = match.event_final_result || "";
      const parts = scoreStr.replace(/ /g, "").split("-");
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        sets = [{ p1: parts[0], p2: parts[1], set: 1, isTotalSets: true }];
      }
    }

    const isLive = match._isLive || match.event_live === "1" || match.event_live === 1;

    // event_serve: wer aufschlägt (1 = Player1, 2 = Player2)
    const server = match.event_serve === "1" ? 1 : match.event_serve === "2" ? 2 : null;

    res.json({
      player1: match.event_first_player,
      player2: match.event_second_player,
      score: match.event_final_result || "-",
      gameScore: match.event_game_result || "-",
      status: match.event_status || "-",
      tournament: match.tournament_name || "",
      round: match.tournament_round || "",
      sets,
      scores: match.scores || [],
      statistics: match.statistics || [],
      pointbypoint: match.pointbypoint || [],
      server,
      live: isLive,
      time: match.event_time || "",
      date: match.event_date || "",
      surface: match.event_ground || ""
    });
  } catch (err) {
    console.error("MATCH DETAIL ERROR:", err.message);
    res.status(500).json({ error: "Fehler beim Laden der Match-Details" });
  }
});


// ─── PLAYER NEWS ──────────────────────────────────────────────────────────────
app.get("/api/news/:player", async (req, res) => {
  try {
    const playerName = decodeURIComponent(req.params.player);
    
    // Google News RSS Feed - kein API Key nötig
    const query = encodeURIComponent(`${playerName} tennis`);
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=de&gl=DE&ceid=DE:de`;
    
    const response = await axios.get(rssUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 5000
    });

    const xml = response.data;
    
    // RSS XML parsen
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    
    while ((match = itemRegex.exec(xml)) !== null && items.length < 5) {
      const item = match[1];
      const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/))?.[1] || "";
      const link = (item.match(/<link>(.*?)<\/link>/) || [])?.[1] || "";
      const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])?.[1] || "";
      const source = (item.match(/<source[^>]*>(.*?)<\/source>/) || [])?.[1] || "";
      
      if (title) {
        items.push({
          title: title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
          link,
          pubDate: pubDate ? new Date(pubDate).toLocaleDateString("de-DE") : "",
          source
        });
      }
    }

    res.json(items);
  } catch (err) {
    console.error("NEWS ERROR:", err.message);
    res.json([]);
  }
});


// ─── TURNIER PREDICTIONS ──────────────────────────────────────────────────────
app.get("/api/tournament-predictions", async (req, res) => {
  try {
    const today = new Date();
    // Aktuelles + nächste 2 Wochen (laufende Turniere einschließen)
    const start = new Date(today);
    start.setDate(today.getDate() - 7); // auch laufende Turniere
    const end = new Date(today);
    end.setDate(today.getDate() + 14);

    const dateStart = start.toISOString().split("T")[0];
    const dateEnd = end.toISOString().split("T")[0];
    const todayStr = today.toISOString().split("T")[0];

    // ATP Singles (265) + ATP Doubles (267) + alle bisherigen Matches des Turniers
    const [singlesRes, doublesRes, standingsRes] = await Promise.allSettled([
      apiGet({ method: "get_fixtures", date_start: dateStart, date_stop: dateEnd, event_type_key: 265 }),
      apiGet({ method: "get_fixtures", date_start: dateStart, date_stop: dateEnd, event_type_key: 267 }),
      apiGet({ method: "get_standings", event_type: "ATP" })
    ]);

    const singles = singlesRes.status === "fulfilled" ? singlesRes.value.data?.result || [] : [];
    const doubles = doublesRes.status === "fulfilled" ? doublesRes.value.data?.result || [] : [];
    const standings = standingsRes.status === "fulfilled" ? standingsRes.value.data?.result || [] : [];

    const allFixtures = [
      ...singles.map(m => ({ ...m, _type: "ATP Singles" })),
      ...doubles.map(m => ({ ...m, _type: "ATP Doubles" }))
    ];

    // Nach Turnier gruppieren
    const tournaments = {};
    allFixtures.forEach(m => {
      const key = m.tournament_name || "Unbekannt";
      if (!tournaments[key]) {
        tournaments[key] = {
          name: key,
          type: m._type,
          matches: [],
          players: new Set(),
          eliminated: new Set(),
          dateStart: m.event_date || dateStart,
        };
      }
      tournaments[key].matches.push(m);
      if (m.event_first_player) tournaments[key].players.add(m.event_first_player);
      if (m.event_second_player) tournaments[key].players.add(m.event_second_player);

      // Ausgeschiedene aus abgeschlossenen Matches ermitteln
      const isFinished = m.event_status === "Finished" || m.event_winner;
      if (isFinished && m.event_winner) {
        const loser = m.event_winner === "First Player" ? m.event_second_player : m.event_first_player;
        if (loser) tournaments[key].eliminated.add(loser);
      }
    });

    const eloFromRank = (rank) => Math.max(1500, 2400 - Number(rank) * 6);

    const getRank = (name) => {
      const lastName = (name || "").toLowerCase().split(" ").pop();
      const found = standings.find(p => (p.player || "").toLowerCase().split(" ").pop() === lastName);
      return found ? parseInt(found.place) || 100 : 100;
    };

    const getFullName = (shortName) => {
      const lastName = (shortName || "").trim().split(" ").pop().toLowerCase();
      const found = standings.find(p => (p.player || "").toLowerCase().split(" ").pop() === lastName);
      return found ? found.player : shortName;
    };

    // Für jedes Turnier: Favoriten berechnen
    const result = Object.values(tournaments).map(tourn => {
      const playerList = [...tourn.players].map(p => {
        const fullName = getFullName(p);
        const rank = getRank(p);
        const elo = eloFromRank(rank);
        return { name: fullName, shortName: p, rank, elo };
      }).sort((a, b) => a.rank - b.rank);

      // Top-Favorit: höchster Elo
      const favorite = playerList[0] || null;

      // Runden-Predictions aus vorhandenen Matches
      const rounds = {};
      tourn.matches.forEach(m => {
        const round = m.tournament_round || m.event_round || "Round 1";
        if (!rounds[round]) rounds[round] = [];
        const p1 = getFullName(m.event_first_player);
        const p2 = getFullName(m.event_second_player);
        const r1 = getRank(m.event_first_player);
        const r2 = getRank(m.event_second_player);
        const elo1 = eloFromRank(r1);
        const elo2 = eloFromRank(r2);
        const prob1 = Math.round(1 / (1 + Math.pow(10, (elo2 - elo1) / 400)) * 100);

        if (p1 && p2) {
          rounds[round].push({
            player1: p1,
            player2: p2,
            rank1: r1,
            rank2: r2,
            prediction: prob1 > 50 ? p1 : p2,
            prob: Math.max(prob1, 100 - prob1),
            date: m.event_date || "",
            time: m.event_time || ""
          });
        }
      });

      // Turniersieg-Wahrscheinlichkeit
      // Realistischer Ansatz: Rang-basierte Exponentialfunktion
      // #1 hat exponentiell mehr Chance als #10, #10 mehr als #50
      // Ausgeschiedene Spieler aus der Berechnung entfernen
      const eliminatedNames = new Set([...tourn.eliminated].map(p => getFullName(p).toLowerCase()));
      const activePlayers = playerList.filter(p => !eliminatedNames.has(p.name.toLowerCase()));
      const stillIn = activePlayers.length > 0 ? activePlayers : playerList;
      const top8 = stillIn.slice(0, Math.min(8, stillIn.length));
      const eliminatedCount = playerList.length - stillIn.length;
      
      // Score = e^(-rank * 0.15) → stärkere Differenzierung
      const scores = top8.map(p => ({
        ...p,
        score: Math.exp(-p.rank * 0.08)
      }));
      const totalScore = scores.reduce((sum, p) => sum + p.score, 0) || 1;
      const winProbs = scores.map(p => ({
        ...p,
        winProb: Math.max(1, Math.round((p.score / totalScore) * 100))
      })).sort((a, b) => b.winProb - a.winProb);

      return {
        name: tourn.name,
        type: tourn.type,
        dateStart: tourn.dateStart,
        playerCount: playerList.length,
        favorite: favorite ? { name: favorite.name, rank: favorite.rank, elo: favorite.elo } : null,
        winProbs: winProbs.slice(0, 5),
        rounds: Object.entries(rounds).map(([round, matches]) => ({ round, matches }))
          .sort((a, b) => a.round.localeCompare(b.round)),
        drawSet: playerList.length > 0,
        eliminatedCount,
        activePlayerCount: stillIn.length,
        isLive: tourn.matches.some(m => m.event_live === "1" || m.event_live === 1),
        hasStarted: tourn.eliminated.size > 0
      };
    }).sort((a, b) => a.dateStart.localeCompare(b.dateStart));

    res.json(result);
  } catch (err) {
    console.error("TOURNAMENT PREDICTIONS ERROR:", err.message);
    res.status(500).json({ error: "Fehler beim Laden der Turnier-Predictions" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend läuft auf Port ${PORT}`));
