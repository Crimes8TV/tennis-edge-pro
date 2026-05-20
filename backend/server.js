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

    const data = response.data.result || [];

    const players = data.slice(0, 100).map((p, i) => ({
      name: p.player || "Unknown",
      rank: parseInt(p.place) || i + 1,
      elo: Math.round(85 - i * 0.2),
      serve: Math.floor(70 + Math.random() * 25),
      return: Math.floor(70 + Math.random() * 25),
      clutch: Math.floor(70 + Math.random() * 25),
      momentum: Math.floor(70 + Math.random() * 25),
      hard: Math.floor(70 + Math.random() * 25),
      clay: Math.floor(70 + Math.random() * 25),
      grass: Math.floor(70 + Math.random() * 25),
      form: Array.from({ length: 6 }, () =>
        Math.floor(70 + Math.random() * 30)
      )
    }));

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

    const match = response.data.result?.[0];

    if (!match) {
      return res.json({
        match: "Keine Live Matches",
        score: "-",
        momentum: 50
      });
    }

    res.json({
      match: `${match.event_first_player} vs ${match.event_second_player}`,
      score: match.event_final_result || "Live",
      momentum: Math.floor(70 + Math.random() * 25)
    });

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

  const rankPower = (rank) => Math.max(30, 120 - Number(rank) * 1.1);

  const surfaceBoost = {
    hard: 1.0,
    clay: 1.08,
    grass: 1.05
  };

  const form1 = 70 + Math.random() * 30;
  const form2 = 70 + Math.random() * 30;

  const clutch1 = 70 + Math.random() * 25;
  const clutch2 = 70 + Math.random() * 25;

  const momentum1 = 70 + Math.random() * 25;
  const momentum2 = 70 + Math.random() * 25;

  let score1 =
    rankPower(rank1) * 0.70 +
    form1 * 0.15 +
    clutch1 * 0.08 +
    momentum1 * 0.07;

  let score2 =
    rankPower(rank2) * 0.70 +
    form2 * 0.15 +
    clutch2 * 0.08 +
    momentum2 * 0.07;

  score1 *= surfaceBoost[surface] || 1;
  score2 *= surfaceBoost[surface] || 1;

  const p1Win = Math.round((score1 / (score1 + score2)) * 100);

const rankDiff = Math.abs(rank1 - rank2);

const rankingFactor = Math.min(70, 20 + rankDiff * 0.6);
const formFactor = Math.max(10, 40 - rankDiff * 0.2);
const clutchFactor = 10 + Math.random() * 10;
const momentumFactor = 100 - rankingFactor - formFactor - clutchFactor;

  res.json({
    player1: p1,
    player2: p2,
    surface,
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
    edge:
      p1Win > 60
        ? `${p1} klarer Favorit`
        : p1Win < 40
        ? `${p2} klarer Favorit`
        : "ausgeglichen"
  });
});
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Backend läuft auf Port ${PORT}`);
});