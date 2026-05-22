const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors({
  origin: [
    "https://tennis-edge-pro.vercel.app",
    "https://tennis-edge-75d75ggx0-crimes8tvs-projects.vercel.app"
  ]
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
    const response = await apiGet({ method: "get_standings", event_type: "ATP" });
    const raw = response.data?.result || [];

    const players = raw.map(p => ({
      name: p.player || "Unknown",
      rank: parseInt(p.place) || 999,
      points: parseInt(p.points) || 0,
      country: p.country || "",
      player_key: p.player_key,
      elo: Math.max(1500, 2400 - (parseInt(p.place) || 100) * 6),
      serve: 70,
      return: 75,
      clutch: 80,
      momentum: 85,
      hard: 80,
      clay: 75,
      grass: 70,
      form: [80, 82, 78, 85, 87]
    }));

    res.json(players);
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

    res.json({
      h2h_matches: h2h.slice(0, 10),
      p1_wins: p1Wins,
      p2_wins: p2Wins,
      p1_recent: p1Results.slice(0, 5),
      p2_recent: p2Results.slice(0, 5)
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

  let score1 = expected1 * 100 * 0.55 + form1 * 0.20 + clutch1 * 0.10 + momentum1 * 0.15;
  let score2 = expected2 * 100 * 0.55 + form2 * 0.20 + clutch2 * 0.10 + momentum2 * 0.15;

  const surface1 = Number(req.query.surface1 || 0);
  const surface2 = Number(req.query.surface2 || 0);
  score1 += surface1 * 0.5;
  score2 += surface2 * 0.5;

  const p1Win = Math.round((score1 / (score1 + score2)) * 100);
  const rankDiff = Math.abs(rank1 - rank2);
  const rankingFactor = Math.min(70, 20 + rankDiff * 0.6);
  const formFactor = Math.max(10, 40 - rankDiff * 0.2);
  const clutchFactor = 10 + Math.random() * 10;
  const momentumFactor = Math.max(10, 100 - rankingFactor - formFactor - clutchFactor);

  res.json({
    player1: p1,
    player2: p2,
    surface,
    elo: { [p1]: Math.round(elo1), [p2]: Math.round(elo2) },
    prediction: { [p1]: p1Win, [p2]: 100 - p1Win },
    confidence: Math.round(Math.abs(p1Win - 50) * 2),
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend läuft auf Port ${PORT}`));