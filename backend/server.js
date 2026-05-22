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

const TOP100_PLAYERS = [
  { name: "Jannik Sinner", rank: 1, elo: 95, serve: 88, return: 92, clutch: 90, momentum: 92, hard: 90, clay: 86, grass: 84, form: [90,92,94,93,95] },
  { name: "Carlos Alcaraz", rank: 2, elo: 94, serve: 86, return: 91, clutch: 91, momentum: 90, hard: 88, clay: 94, grass: 82, form: [88,91,90,93,94] },
  { name: "Novak Djokovic", rank: 3, elo: 93, serve: 85, return: 93, clutch: 95, momentum: 88, hard: 91, clay: 90, grass: 92, form: [85,88,90,87,89] },
  { name: "Alexander Zverev", rank: 4, elo: 91, serve: 87, return: 85, clutch: 83, momentum: 87, hard: 86, clay: 90, grass: 80, form: [84,86,88,85,87] },
  { name: "Daniil Medvedev", rank: 5, elo: 90, serve: 86, return: 88, clutch: 86, momentum: 85, hard: 92, clay: 78, grass: 82, form: [82,85,84,86,83] },
  { name: "Taylor Fritz", rank: 6, elo: 88, serve: 89, return: 82, clutch: 82, momentum: 84, hard: 88, clay: 76, grass: 83, form: [80,82,84,83,85] },
  { name: "Casper Ruud", rank: 7, elo: 87, serve: 80, return: 84, clutch: 84, momentum: 83, hard: 80, clay: 92, grass: 74, form: [79,81,83,82,84] },
  { name: "Andrey Rublev", rank: 8, elo: 86, serve: 84, return: 83, clutch: 80, momentum: 82, hard: 84, clay: 86, grass: 78, form: [78,80,82,81,83] },
  { name: "Hubert Hurkacz", rank: 9, elo: 85, serve: 91, return: 80, clutch: 81, momentum: 81, hard: 86, clay: 76, grass: 88, form: [77,79,81,80,82] },
  { name: "Alex de Minaur", rank: 10, elo: 84, serve: 80, return: 85, clutch: 83, momentum: 83, hard: 84, clay: 80, grass: 82, form: [76,78,80,79,81] },
  { name: "Stefanos Tsitsipas", rank: 11, elo: 83, serve: 83, return: 82, clutch: 82, momentum: 80, hard: 81, clay: 88, grass: 76, form: [75,77,79,78,80] },
  { name: "Tommy Paul", rank: 12, elo: 82, serve: 82, return: 81, clutch: 79, momentum: 79, hard: 83, clay: 77, grass: 79, form: [74,76,78,77,79] },
  { name: "Grigor Dimitrov", rank: 13, elo: 81, serve: 83, return: 80, clutch: 80, momentum: 78, hard: 82, clay: 78, grass: 82, form: [73,75,77,76,78] },
  { name: "Ben Shelton", rank: 14, elo: 80, serve: 92, return: 76, clutch: 77, momentum: 78, hard: 82, clay: 72, grass: 79, form: [72,74,76,75,77] },
  { name: "Frances Tiafoe", rank: 15, elo: 79, serve: 81, return: 79, clutch: 78, momentum: 77, hard: 80, clay: 74, grass: 77, form: [71,73,75,74,76] },
  { name: "Felix Auger-Aliassime", rank: 16, elo: 78, serve: 85, return: 77, clutch: 76, momentum: 76, hard: 79, clay: 75, grass: 80, form: [70,72,74,73,75] },
  { name: "Sebastian Korda", rank: 17, elo: 77, serve: 80, return: 78, clutch: 75, momentum: 76, hard: 78, clay: 74, grass: 76, form: [69,71,73,72,74] },
  { name: "Arthur Fils", rank: 18, elo: 76, serve: 79, return: 77, clutch: 74, momentum: 75, hard: 76, clay: 78, grass: 73, form: [68,70,72,71,73] },
  { name: "Ugo Humbert", rank: 19, elo: 75, serve: 81, return: 75, clutch: 73, momentum: 74, hard: 75, clay: 73, grass: 78, form: [67,69,71,70,72] },
  { name: "Nicolas Jarry", rank: 20, elo: 74, serve: 82, return: 73, clutch: 72, momentum: 73, hard: 74, clay: 76, grass: 71, form: [66,68,70,69,71] },
  { name: "Holger Rune", rank: 21, elo: 73, serve: 80, return: 76, clutch: 75, momentum: 73, hard: 74, clay: 78, grass: 72, form: [65,67,69,68,70] },
  { name: "Lorenzo Musetti", rank: 22, elo: 72, serve: 78, return: 74, clutch: 73, momentum: 72, hard: 72, clay: 80, grass: 70, form: [64,66,68,67,69] },
  { name: "Tomas Machac", rank: 23, elo: 71, serve: 78, return: 73, clutch: 71, momentum: 71, hard: 72, clay: 74, grass: 70, form: [63,65,67,66,68] },
  { name: "Karen Khachanov", rank: 24, elo: 70, serve: 79, return: 72, clutch: 70, momentum: 70, hard: 72, clay: 70, grass: 70, form: [62,64,66,65,67] },
  { name: "Francisco Cerundolo", rank: 25, elo: 69, serve: 76, return: 72, clutch: 70, momentum: 69, hard: 69, clay: 77, grass: 66, form: [61,63,65,64,66] },
  { name: "Jack Draper", rank: 26, elo: 68, serve: 80, return: 72, clutch: 70, momentum: 69, hard: 70, clay: 68, grass: 76, form: [60,62,64,63,65] },
  { name: "Alejandro Davidovich Fokina", rank: 27, elo: 67, serve: 74, return: 72, clutch: 69, momentum: 68, hard: 67, clay: 76, grass: 64, form: [59,61,63,62,64] },
  { name: "Matteo Arnaldi", rank: 28, elo: 66, serve: 75, return: 71, clutch: 68, momentum: 67, hard: 67, clay: 72, grass: 64, form: [58,60,62,61,63] },
  { name: "Alejandro Tabilo", rank: 29, elo: 65, serve: 76, return: 70, clutch: 67, momentum: 66, hard: 66, clay: 72, grass: 63, form: [57,59,61,60,62] },
  { name: "Cameron Norrie", rank: 30, elo: 64, serve: 73, return: 72, clutch: 67, momentum: 66, hard: 65, clay: 70, grass: 68, form: [56,58,60,59,61] },
  { name: "Jordan Thompson", rank: 31, elo: 63, serve: 74, return: 69, clutch: 66, momentum: 65, hard: 66, clay: 63, grass: 65, form: [55,57,59,58,60] },
  { name: "Maxime Cressy", rank: 32, elo: 62, serve: 86, return: 62, clutch: 64, momentum: 63, hard: 64, clay: 57, grass: 76, form: [54,56,58,57,59] },
  { name: "Tallon Griekspoor", rank: 33, elo: 61, serve: 76, return: 67, clutch: 64, momentum: 63, hard: 63, clay: 65, grass: 62, form: [53,55,57,56,58] },
  { name: "Roberto Bautista Agut", rank: 34, elo: 60, serve: 72, return: 73, clutch: 66, momentum: 62, hard: 62, clay: 68, grass: 62, form: [52,54,56,55,57] },
  { name: "Nuno Borges", rank: 35, elo: 59, serve: 73, return: 68, clutch: 63, momentum: 62, hard: 61, clay: 66, grass: 60, form: [51,53,55,54,56] },
  { name: "Denis Shapovalov", rank: 36, elo: 58, serve: 79, return: 70, clutch: 65, momentum: 62, hard: 62, clay: 60, grass: 68, form: [50,52,54,53,55] },
  { name: "Borna Coric", rank: 37, elo: 57, serve: 72, return: 68, clutch: 62, momentum: 61, hard: 60, clay: 65, grass: 58, form: [49,51,53,52,54] },
  { name: "Jiri Lehecka", rank: 38, elo: 56, serve: 75, return: 67, clutch: 62, momentum: 61, hard: 61, clay: 62, grass: 62, form: [48,50,52,51,53] },
  { name: "Miomir Kecmanovic", rank: 39, elo: 55, serve: 71, return: 68, clutch: 61, momentum: 60, hard: 59, clay: 64, grass: 57, form: [47,49,51,50,52] },
  { name: "Luca Van Assche", rank: 40, elo: 54, serve: 72, return: 66, clutch: 60, momentum: 59, hard: 58, clay: 64, grass: 56, form: [46,48,50,49,51] },
  { name: "Mariano Navone", rank: 41, elo: 53, serve: 69, return: 67, clutch: 60, momentum: 59, hard: 57, clay: 68, grass: 53, form: [45,47,49,48,50] },
  { name: "Giovanni Mpetshi Perricard", rank: 42, elo: 52, serve: 88, return: 60, clutch: 58, momentum: 58, hard: 60, clay: 55, grass: 65, form: [44,46,48,47,49] },
  { name: "Adrian Mannarino", rank: 43, elo: 51, serve: 68, return: 69, clutch: 59, momentum: 58, hard: 58, clay: 62, grass: 62, form: [43,45,47,46,48] },
  { name: "Brandon Nakashima", rank: 44, elo: 50, serve: 73, return: 66, clutch: 58, momentum: 57, hard: 61, clay: 56, grass: 58, form: [42,44,46,45,47] },
  { name: "Jan-Lennard Struff", rank: 45, elo: 49, serve: 76, return: 63, clutch: 57, momentum: 56, hard: 58, clay: 62, grass: 58, form: [41,43,45,44,46] },
  { name: "Alexander Bublik", rank: 46, elo: 48, serve: 83, return: 62, clutch: 56, momentum: 56, hard: 58, clay: 55, grass: 62, form: [40,42,44,43,45] },
  { name: "Flavio Cobolli", rank: 47, elo: 47, serve: 71, return: 64, clutch: 56, momentum: 55, hard: 56, clay: 64, grass: 53, form: [39,41,43,42,44] },
  { name: "Pedro Martinez", rank: 48, elo: 46, serve: 68, return: 66, clutch: 55, momentum: 54, hard: 55, clay: 66, grass: 52, form: [38,40,42,41,43] },
  { name: "Laslo Djere", rank: 49, elo: 45, serve: 68, return: 65, clutch: 54, momentum: 54, hard: 54, clay: 64, grass: 51, form: [37,39,41,40,42] },
  { name: "David Goffin", rank: 50, elo: 44, serve: 70, return: 68, clutch: 55, momentum: 53, hard: 55, clay: 60, grass: 58, form: [36,38,40,39,41] },
  { name: "Stan Wawrinka", rank: 51, elo: 43, serve: 74, return: 67, clutch: 62, momentum: 52, hard: 57, clay: 64, grass: 56, form: [35,37,39,38,40] },
  { name: "Dusan Lajovic", rank: 52, elo: 42, serve: 67, return: 64, clutch: 53, momentum: 52, hard: 53, clay: 62, grass: 50, form: [34,36,38,37,39] },
  { name: "Quentin Halys", rank: 53, elo: 41, serve: 72, return: 62, clutch: 52, momentum: 51, hard: 54, clay: 58, grass: 55, form: [33,35,37,36,38] },
  { name: "Facundo Diaz Acosta", rank: 54, elo: 40, serve: 67, return: 63, clutch: 52, momentum: 51, hard: 52, clay: 64, grass: 48, form: [32,34,36,35,37] },
  { name: "Yannick Hanfmann", rank: 55, elo: 39, serve: 71, return: 61, clutch: 51, momentum: 50, hard: 52, clay: 58, grass: 53, form: [31,33,35,34,36] },
  { name: "Mikhail Kukushkin", rank: 56, elo: 38, serve: 68, return: 62, clutch: 51, momentum: 50, hard: 52, clay: 56, grass: 52, form: [30,32,34,33,35] },
  { name: "Yoshihito Nishioka", rank: 57, elo: 37, serve: 65, return: 67, clutch: 51, momentum: 49, hard: 52, clay: 56, grass: 50, form: [29,31,33,32,34] },
  { name: "Marcos Giron", rank: 58, elo: 36, serve: 70, return: 61, clutch: 50, momentum: 49, hard: 53, clay: 54, grass: 52, form: [28,30,32,31,33] },
  { name: "Constant Lestienne", rank: 59, elo: 35, serve: 70, return: 60, clutch: 49, momentum: 48, hard: 51, clay: 58, grass: 52, form: [27,29,31,30,32] },
  { name: "Pavel Kotov", rank: 60, elo: 34, serve: 69, return: 61, clutch: 49, momentum: 48, hard: 52, clay: 55, grass: 49, form: [26,28,30,29,31] },
  { name: "Lorenzo Sonego", rank: 61, elo: 33, serve: 72, return: 62, clutch: 50, momentum: 48, hard: 52, clay: 60, grass: 54, form: [25,27,29,28,30] },
  { name: "Gael Monfils", rank: 62, elo: 32, serve: 72, return: 66, clutch: 54, momentum: 47, hard: 54, clay: 58, grass: 54, form: [24,26,28,27,29] },
  { name: "Sumit Nagal", rank: 63, elo: 31, serve: 66, return: 62, clutch: 48, momentum: 47, hard: 51, clay: 56, grass: 48, form: [23,25,27,26,28] },
  { name: "Hugo Gaston", rank: 64, elo: 30, serve: 67, return: 64, clutch: 49, momentum: 47, hard: 49, clay: 64, grass: 47, form: [22,24,26,25,27] },
  { name: "Daniel Altmaier", rank: 65, elo: 29, serve: 68, return: 61, clutch: 47, momentum: 46, hard: 49, clay: 60, grass: 48, form: [21,23,25,24,26] },
  { name: "Yosuke Watanuki", rank: 66, elo: 28, serve: 65, return: 61, clutch: 47, momentum: 46, hard: 50, clay: 54, grass: 47, form: [20,22,24,23,25] },
  { name: "Jaume Munar", rank: 67, elo: 27, serve: 66, return: 63, clutch: 47, momentum: 45, hard: 48, clay: 62, grass: 45, form: [19,21,23,22,24] },
  { name: "Max Purcell", rank: 68, elo: 26, serve: 73, return: 60, clutch: 46, momentum: 45, hard: 51, clay: 51, grass: 62, form: [18,20,22,21,23] },
  { name: "Hugo Dellien", rank: 69, elo: 25, serve: 63, return: 62, clutch: 46, momentum: 44, hard: 47, clay: 60, grass: 43, form: [17,19,21,20,22] },
  { name: "Rinky Hijikata", rank: 70, elo: 24, serve: 68, return: 60, clutch: 45, momentum: 44, hard: 51, clay: 52, grass: 53, form: [16,18,20,19,21] },
  { name: "Botic van de Zandschulp", rank: 71, elo: 23, serve: 70, return: 62, clutch: 46, momentum: 44, hard: 51, clay: 57, grass: 52, form: [15,17,19,18,20] },
  { name: "Alexei Popyrin", rank: 72, elo: 22, serve: 74, return: 61, clutch: 45, momentum: 43, hard: 52, clay: 54, grass: 56, form: [14,16,18,17,19] },
  { name: "Luciano Darderi", rank: 73, elo: 21, serve: 67, return: 62, clutch: 45, momentum: 43, hard: 50, clay: 62, grass: 46, form: [13,15,17,16,18] },
  { name: "Dominic Stricker", rank: 74, elo: 20, serve: 69, return: 61, clutch: 44, momentum: 42, hard: 49, clay: 58, grass: 50, form: [12,14,16,15,17] },
  { name: "Thiago Monteiro", rank: 75, elo: 19, serve: 65, return: 62, clutch: 44, momentum: 42, hard: 48, clay: 60, grass: 44, form: [11,13,15,14,16] },
  { name: "Alexander Shevchenko", rank: 76, elo: 18, serve: 67, return: 60, clutch: 43, momentum: 41, hard: 49, clay: 54, grass: 47, form: [10,12,14,13,15] },
  { name: "Richard Gasquet", rank: 77, elo: 17, serve: 70, return: 66, clutch: 48, momentum: 41, hard: 50, clay: 58, grass: 56, form: [9,11,13,12,14] },
  { name: "Dominic Thiem", rank: 78, elo: 16, serve: 72, return: 68, clutch: 50, momentum: 41, hard: 52, clay: 66, grass: 52, form: [8,10,12,11,13] },
  { name: "Zizou Bergs", rank: 79, elo: 15, serve: 66, return: 61, clutch: 43, momentum: 40, hard: 47, clay: 58, grass: 46, form: [7,9,11,10,12] },
  { name: "Bernabe Zapata Miralles", rank: 80, elo: 14, serve: 64, return: 62, clutch: 42, momentum: 40, hard: 46, clay: 62, grass: 42, form: [6,8,10,9,11] },
  { name: "Taro Daniel", rank: 81, elo: 13, serve: 65, return: 60, clutch: 42, momentum: 39, hard: 48, clay: 52, grass: 48, form: [5,7,9,8,10] },
  { name: "Mackenzie McDonald", rank: 82, elo: 12, serve: 68, return: 61, clutch: 42, momentum: 39, hard: 50, clay: 52, grass: 52, form: [4,6,8,7,9] },
  { name: "Pablo Cuevas", rank: 83, elo: 11, serve: 63, return: 63, clutch: 42, momentum: 38, hard: 45, clay: 62, grass: 42, form: [3,5,7,6,8] },
  { name: "Emilio Nava", rank: 84, elo: 10, serve: 66, return: 60, clutch: 41, momentum: 38, hard: 49, clay: 52, grass: 48, form: [2,4,6,5,7] },
  { name: "Vasek Pospisil", rank: 85, elo: 9, serve: 74, return: 59, clutch: 41, momentum: 37, hard: 49, clay: 49, grass: 58, form: [1,3,5,4,6] },
  { name: "Aleksandar Vukic", rank: 86, elo: 8, serve: 67, return: 59, clutch: 40, momentum: 37, hard: 49, clay: 51, grass: 51, form: [80,82,78,81,80] },
  { name: "Camilo Ugo Carabelli", rank: 87, elo: 7, serve: 63, return: 61, clutch: 40, momentum: 36, hard: 46, clay: 60, grass: 41, form: [79,81,77,80,79] },
  { name: "Yunchaokete Bu", rank: 88, elo: 6, serve: 69, return: 59, clutch: 39, momentum: 36, hard: 49, clay: 51, grass: 50, form: [78,80,76,79,78] },
  { name: "Giulio Zeppieri", rank: 89, elo: 5, serve: 67, return: 59, clutch: 39, momentum: 35, hard: 47, clay: 58, grass: 46, form: [77,79,75,78,77] },
  { name: "Andrea Vavassori", rank: 90, elo: 4, serve: 68, return: 58, clutch: 38, momentum: 35, hard: 47, clay: 55, grass: 50, form: [76,78,74,77,76] },
  { name: "Henri Laaksonen", rank: 91, elo: 3, serve: 66, return: 59, clutch: 38, momentum: 34, hard: 47, clay: 54, grass: 51, form: [75,77,73,76,75] },
  { name: "Sho Shimabukuro", rank: 92, elo: 2, serve: 64, return: 58, clutch: 37, momentum: 34, hard: 47, clay: 51, grass: 47, form: [74,76,72,75,74] },
  { name: "Nicolas Moreno de Alboran", rank: 93, elo: 1, serve: 62, return: 60, clutch: 37, momentum: 33, hard: 45, clay: 56, grass: 42, form: [73,75,71,74,73] },
  { name: "Joao Fonseca", rank: 94, elo: 78, serve: 78, return: 72, clutch: 72, momentum: 75, hard: 76, clay: 74, grass: 70, form: [72,74,70,73,72] },
  { name: "Learner Tien", rank: 95, elo: 77, serve: 75, return: 70, clutch: 70, momentum: 73, hard: 74, clay: 68, grass: 68, form: [71,73,69,72,71] },
  { name: "Mattia Bellucci", rank: 96, elo: 76, serve: 73, return: 69, clutch: 69, momentum: 72, hard: 72, clay: 70, grass: 67, form: [70,72,68,71,70] },
  { name: "Harold Mayot", rank: 97, elo: 75, serve: 70, return: 68, clutch: 68, momentum: 71, hard: 70, clay: 72, grass: 64, form: [69,71,67,70,69] },
  { name: "Hamad Medjedovic", rank: 98, elo: 74, serve: 71, return: 68, clutch: 67, momentum: 70, hard: 70, clay: 70, grass: 63, form: [68,70,66,69,68] },
  { name: "Sebi Korda", rank: 99, elo: 73, serve: 72, return: 67, clutch: 66, momentum: 69, hard: 71, clay: 66, grass: 66, form: [67,69,65,68,67] },
  { name: "Luca Nardi", rank: 100, elo: 72, serve: 70, return: 66, clutch: 65, momentum: 68, hard: 69, clay: 68, grass: 63, form: [66,68,64,67,66] }
];

app.get("/api/players", async (req, res) => {
  try {
    const response = await axios.get(
      "https://tennis-api-atp-wta-itf.p.rapidapi.com/tennis/v2/atp/ranking/singles/",
      {
        headers: {
          "X-RapidAPI-Key": process.env.RAPID_API_KEY,
          "X-RapidAPI-Host": process.env.RAPID_API_HOST
        }
      }
    );

    const raw = response.data;
    const data = Array.isArray(raw) ? raw : raw.data || raw.results || [];

    if (data.length < 20) {
      console.log(`RapidAPI nur ${data.length} Spieler – nutze lokale Top-100-Liste`);
      return res.json(TOP100_PLAYERS);
    }

    const players = data.map(p => ({
      name: p.player || p.name || p.player_name || "Unknown",
      rank: p.rank || 999,
      elo: 85,
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
    console.error("RAPID PLAYERS ERROR:", err.response?.status, err.response?.data || err.message);
    return res.json(TOP100_PLAYERS);
  }
});

app.get("/api/live", async (req, res) => {
  try {
    const response = await axios.get(
      "https://tennis-api-atp-wta-itf.p.rapidapi.com/tennis/v2/atp/live",
      {
        headers: {
          "X-RapidAPI-Key": process.env.RAPID_API_KEY,
          "X-RapidAPI-Host": process.env.RAPID_API_HOST
        }
      }
    );

    const matches = response.data.results || [];
    const formatted = matches.map(m => ({
      player1: m.home_player,
      player2: m.away_player,
      score: m.score || "-"
    }));

    res.json(formatted);

  } catch (err) {
    console.error("RAPID LIVE ERROR:", err.response?.status, err.response?.data || err.message);
    return res.json([
      { player1: "Jannik Sinner", player2: "Carlos Alcaraz", score: "-" },
      { player1: "Novak Djokovic", player2: "Alexander Zverev", score: "-" }
    ]);
  }
});

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
        : `Das Match ist sehr ausgeglichen. Kleine Vorteile können durch Form, Momentum oder Surface entstehen.`,
    edge:
      p1Win > 65 ? `${p1} klar überlegen`
      : p1Win > 55 ? `${p1} leichter Vorteil`
      : p1Win < 35 ? `${p2} klar überlegen`
      : p1Win < 45 ? `${p2} leichter Vorteil`
      : "sehr ausgeglichen"
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend läuft auf Port ${PORT}`);
});