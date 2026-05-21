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

const API_KEY = process.env.TENNIS_API_KEY;

// 👉 TEST
app.get("/api/players", async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.api-tennis.com/tennis/?method=get_standings&event_type=ATP&APIkey=${API_KEY}`
    );

    const data = Array.isArray(response.data.result)
  ? response.data.result
  : [];

    if (data.length > 0) {
  console.log("FIRST PLAYER:", data[0]);
} else {
  console.log("NO PLAYER DATA");
}
  const players = data.map(p => {
  try {
    return {
      name: p.player_name || p.player || p.name || "Unknown",
      rank: parseInt(p.player_rank) || 999,
      elo: 85,
      serve: 70,
      return: 75,
      clutch: 80,
      momentum: 85,
      hard: 80,
      clay: 75,
      grass: 70,
      form: [80, 82, 78, 85, 87]
    };
  } catch (e) {
    return null;
  }
}).filter(Boolean);

    res.json(players);
  } catch (err) {
    console.error("API ERROR:", err.message);
    res.status(500).json({ error: "API Fehler" });
  }
});
// 🔥 LIVE MATCHES
app.get("/api/live", async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.api-tennis.com/tennis/?method=get_livescore&APIkey=${API_KEY}`
    );

    
const liveResponse = await axios.get(
  `https://api.api-tennis.com/tennis/?method=get_livescore&APIkey=${API_KEY}`
);

// 🔥 HIER
console.log("RAW LIVE DATA:", liveResponse.data);

    const matches = liveResponse.data.result || [];

const formatted = matches
  .filter(m => m.event_first_player && m.event_second_player)
  .map(m => ({
    player1: m.event_first_player,
    player2: m.event_second_player,
    score: m.event_final_result || "-"
  }));

res.json(formatted);

  } catch (err) {
    console.error("LIVE ERROR:", err.message);
    res.status(500).json({ error: "Live Fehler" });
  }
});
// 🔥 PLAYER STATS
app.get("/api/player/:name", async (req, res) => {
  try {
    const playerName = req.params.name;

    res.json({
      name: playerName,
      stats: {
        winRate: Math.floor(55 + Math.random() * 35),
        serveRating: Math.floor(70 + Math.random() * 25),
        returnRating: Math.floor(70 + Math.random() * 25),
        breakPoints: Math.floor(40 + Math.random() * 45),
        tieBreaks: Math.floor(45 + Math.random() * 40),
        fitness: Math.floor(70 + Math.random() * 25)
      },
      surfaces: {
        hard: Math.floor(70 + Math.random() * 25),
        clay: Math.floor(70 + Math.random() * 25),
        grass: Math.floor(70 + Math.random() * 25)
      },
      recentForm: Array.from({ length: 10 }, () =>
        Math.random() > 0.35 ? "W" : "L"
      )
    });
  } catch (err) {
    res.status(500).json({ error: "Player stats error" });
  }
});

// 🔥 MATCH PREDICTION
app.get("/api/predict", async (req, res) => {
  const { p1, p2, rank1 = 10, rank2 = 20, surface = "hard" } = req.query;

  const form1 = Number(req.query.form1 || 75);
const form2 = Number(req.query.form2 || 75);

const clutch1 = Number(req.query.clutch1 || 70);
const clutch2 = Number(req.query.clutch2 || 70);

const momentum1 = Number(req.query.momentum1 || 75);
const momentum2 = Number(req.query.momentum2 || 75);

  const rankPower = (rank) => Math.max(30, 120 - Number(rank) * 1.1);

  // 🔥 ELO FUNCTION
const eloFromRank = (rank) => {
  return Math.max(1500, 2400 - Number(rank) * 6);
};

const elo1 = eloFromRank(rank1);
const elo2 = eloFromRank(rank2);

const expected1 = 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
const expected2 = 1 - expected1;

  const surfaceBoost = {
    hard: 1.0,
    clay: 1.08,
    grass: 1.05
  };


  let score1 =
  expected1 * 100 * 0.55 +
  form1 * 0.20 +
  clutch1 * 0.10 +
  momentum1 * 0.15;

let score2 =
  expected2 * 100 * 0.55 +
  form2 * 0.20 +
  clutch2 * 0.10 +
  momentum2 * 0.15;

// 🔥 Surface Impact (bleibt)
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

    elo: {
  [p1]: Math.round(elo1),
  [p2]: Math.round(elo2)
},
    prediction: {
      [p1]: p1Win,
      [p2]: 100 - p1Win
    },
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
    : `Das Match ist sehr ausgeglichen. Kleine Vorteile können durch Form, Momentum oder Surface entstehen.`,

    edge:
  p1Win > 65
    ? `${p1} klar überlegen`
    : p1Win > 55
    ? `${p1} leichter Vorteil`
    : p1Win < 35
    ? `${p2} klar überlegen`
    : p1Win < 45
    ? `${p2} leichter Vorteil`
    : "sehr ausgeglichen"
  });
});
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Backend läuft auf Port ${PORT}`);
});