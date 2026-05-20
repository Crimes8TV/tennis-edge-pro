const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: [
    "https://tennis-edge-pro.vercel.app",
    "https://tennis-edge-75d75ggx0-crimes8tvs-projects.vercel.app"
  ]
}));
app.use(express.json());


const players = Array.from({ length: 1000 }, (_, i) => ({
  name: `Player ${i + 1}`,
  rank: i + 1,
  elo: Math.floor(70 + Math.random() * 30),
  serve: Math.floor(70 + Math.random() * 30),
  return: Math.floor(70 + Math.random() * 30),
  clutch: Math.floor(70 + Math.random() * 30),
  momentum: Math.floor(70 + Math.random() * 30),
  hard: Math.floor(70 + Math.random() * 30),
  clay: Math.floor(70 + Math.random() * 30),
  grass: Math.floor(70 + Math.random() * 30),
  form: Array.from({ length: 6 }, () =>
    Math.floor(70 + Math.random() * 30)
  )
}));

app.get("/", (req, res) => {
  res.send("TennisEdge Pro API läuft");
});

app.get("/api/players", (req, res) => {
  res.json(players);
});

app.get("/api/live", (req, res) => {
  res.json({
    match: "Sinner vs Alcaraz",
    score: "6-4, 3-2",
    momentum: Math.floor(70 + Math.random() * 25),
    updatedAt: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Backend läuft auf http://localhost:${PORT}`);
});