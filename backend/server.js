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

const players = [
  {
    name: "Jannik Sinner",
    rank: 1,
    elo: 94,
    serve: 91,
    return: 87,
    clutch: 84,
    momentum: 89,
    hard: 95,
    clay: 86,
    grass: 82,
    form: [78, 80, 82, 85, 88, 89]
  },
  {
    name: "Carlos Alcaraz",
    rank: 2,
    elo: 93,
    serve: 85,
    return: 92,
    clutch: 89,
    momentum: 91,
    hard: 90,
    clay: 96,
    grass: 87,
    form: [74, 79, 81, 84, 89, 91]
  },
  {
    name: "Daniil Medvedev",
    rank: 5,
    elo: 88,
    serve: 87,
    return: 88,
    clutch: 80,
    momentum: 82,
    hard: 93,
    clay: 71,
    grass: 79,
    form: [70, 73, 76, 81, 80, 82]
  }
];

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