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
app.get("/", (req, res) => {
  res.send("TennisEdge Pro API läuft");
});

// 🔥 ECHTE SPIELER (Ranking)
app.get("/api/players", async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.api-tennis.com/tennis/?method=get_standings&event_type=ATP&APIkey=${API_KEY}`
    );

    const data = response.data.result;

    const players = (data || []).slice(0, 100).map((p, i) => ({
  name: p.player || "Unknown",
  rank: parseInt(p.place) || i + 1,
  elo: Math.round(85 - (i * 0.2)), // besseres Ranking-System
  serve: 70 + Math.random() * 25,
  return: 70 + Math.random() * 25,
  clutch: 70 + Math.random() * 25,
  momentum: 70 + Math.random() * 25,
  hard: 70 + Math.random() * 25,
  clay: 70 + Math.random() * 25,
  grass: 70 + Math.random() * 25,
  form: Array.from({ length: 6 }, () =>
    Math.floor(70 + Math.random() * 30)
  )
}));
      name: p.player,
      rank: parseInt(p.place),
      elo: 80 + Math.random() * 15,
      serve: 75 + Math.random() * 20,
      return: 75 + Math.random() * 20,
      clutch: 75 + Math.random() * 20,
      momentum: 75 + Math.random() * 20,
      hard: 75 + Math.random() * 20,
      clay: 75 + Math.random() * 20,
      grass: 75 + Math.random() * 20,
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

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Backend läuft auf Port ${PORT}`);
});