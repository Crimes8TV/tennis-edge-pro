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

const apiGet = (params) =>
  axios.get(BASE_URL, { params: { APIkey: API_KEY, ...params } });

// Helper: is it after 18:00 in Berlin?
const isAfter18Berlin = () => {
  const hour = parseInt(new Date().toLocaleString("sv-SE", { timeZone: "Europe/Berlin", hour: "2-digit", hour12: false }).slice(11, 13));
  return hour >= 18;
};
const getBerlinDate = (offsetDays = 0) => {
  const now = new Date();
  // Get current Berlin date string first, then add offset
  const berlinNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  berlinNow.setDate(berlinNow.getDate() + offsetDays);
  const y = berlinNow.getFullYear();
  const m = String(berlinNow.getMonth()+1).padStart(2,"0");
  const d = String(berlinNow.getDate()).padStart(2,"0");
  return `${y}-${m}-${d}`;
};

// ─── ATP PLAYER HAND DATABASE ─────────────────────────────────────────────────
let playerHandDB = {};
let playerHandDBLoaded = false;

async function loadPlayerHandDB() {
  try {
    const res = await axios.get(
      "https://raw.githubusercontent.com/JeffSackmann/tennis_atp/master/atp_players.csv",
      { timeout: 10000 }
    );
    const lines = res.data.split("\n").slice(1);
    lines.forEach(line => {
      const parts = line.split(",");
      if (parts.length < 5) return;
      const firstName = (parts[1] || "").trim().toLowerCase();
      const lastName = (parts[2] || "").trim().toLowerCase();
      const hand = (parts[3] || "").trim().toUpperCase();
      if (!lastName) return;
      const key = lastName;
      const fullKey = `${lastName}_${firstName}`;
      if (hand === "R" || hand === "L") {
        playerHandDB[key] = playerHandDB[key] || hand;
        playerHandDB[fullKey] = hand;
      }
    });
    playerHandDBLoaded = true;
    console.log(`Player hand DB loaded: ${Object.keys(playerHandDB).length} entries`);
  } catch (err) {
    console.error("Failed to load player hand DB:", err.message);
  }
}

loadPlayerHandDB();

// ── Manuelle Korrekturen für Spieler die in der CSV fehlen oder falsch eingetragen sind ──
const HAND_OVERRIDES = {
  "de minaur": "R",
  "draper": "R",
  "shelton": "L",       // Ben Shelton ist Linkshänder
  "paul": "R",
  "perricard": "R",
  "fils": "R",
  "mensik": "R",
  "struff": "R",
  "griekspoor": "R",
  "cerundolo": "R",     // Francisco — J.M. ist Links
  "humbert": "R",
  "muller": "R",
  "eubanks": "R",
  "norrie": "L",        // Cameron Norrie ist Linkshänder
  "mcdonald": "R",
  "kokkinakis": "R",
};

function getPlayerHand(name) {
  if (!name) return null;
  const nameLower = name.toLowerCase().trim();
  const parts = nameLower.split(" ");
  const lastName = parts[parts.length - 1];
  const firstName = parts.length > 1 ? parts[0] : "";

  // Manual overrides — check full name first, then last name
  for (const [key, hand] of Object.entries(HAND_OVERRIDES)) {
    if (nameLower.includes(key)) return hand;
  }

  const fullKey = `${lastName}_${firstName}`;
  return playerHandDB[fullKey] || playerHandDB[lastName] || null;
}

// ─── SPIELERLISTE ─────────────────────────────────────────────────────────────
app.get("/api/players", async (req, res) => {
  try {
    const today = getBerlinDate();
    const [atpRes, fixturesRes] = await Promise.allSettled([
      apiGet({ method: "get_standings", event_type: "ATP" }),
      apiGet({ method: "get_fixtures", date_start: today, date_stop: today, event_type_key: 281 })
    ]);
    const atpRaw = atpRes.status === "fulfilled" ? atpRes.value.data?.result || [] : [];
    const fixturesRaw = fixturesRes.status === "fulfilled" ? fixturesRes.value.data?.result || [] : [];
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
    const atpNames = new Set(atpPlayers.map(p => p.name.toLowerCase()));
    const challengerPlayers = [];
    const seen = new Set();
    fixturesRaw.forEach(m => {
      [m.event_first_player, m.event_second_player].forEach(shortName => {
        if (!shortName) return;
        const lastName = shortName.trim().split(" ").pop();
        if (seen.has(lastName.toLowerCase())) return;
        seen.add(lastName.toLowerCase());
        const alreadyIn = [...atpNames].some(n => n.includes(lastName.toLowerCase()));
        if (!alreadyIn) {
          const idx = challengerPlayers.length;
          const base = Math.max(55, 72 - idx * 0.3);
          const hashStr = (str) => { let h=0; for(let i=0;i<str.length;i++) h=(Math.imul(31,h)+str.charCodeAt(i))|0; return Math.abs(h); };
          const stableVary = (key) => Math.round(((hashStr(`${shortName}-${key}`) % 800) / 100) - 4);
          challengerPlayers.push({
            name: shortName,
            rank: 200 + idx,
            points: 0, country: "", player_key: null,
            elo: Math.max(1400, 1600 - idx * 2),
            serve:    Math.min(80, Math.max(52, Math.round(base + stableVary("serve")))),
            return:   Math.min(80, Math.max(52, Math.round(base + stableVary("return")))),
            clutch:   Math.min(80, Math.max(52, Math.round(base + stableVary("clutch")))),
            momentum: Math.min(80, Math.max(52, Math.round(base + stableVary("momentum")))),
            hard: 68, clay: 68, grass: 63,
            form: [Math.round(base), Math.round(base+stableVary("f1")), Math.round(base+stableVary("f2")), Math.round(base+stableVary("f3")), Math.round(base+stableVary("f4"))]
          });
        }
      });
    });
    res.json([...atpPlayers, ...challengerPlayers]);
  } catch (err) {
    console.error("STANDINGS ERROR:", err.message);
    res.status(500).json({ error: "Error loading player list" });
  }
});

// ─── SPIELER STATS ────────────────────────────────────────────────────────────
app.get("/api/player/:name", async (req, res) => {
  try {
    const playerName = req.params.name;
    const standingsRes = await apiGet({ method: "get_standings", event_type: "ATP" });
    const standings = standingsRes.data?.result || [];
    const found = standings.find(p => (p.player || "").toLowerCase().includes(playerName.toLowerCase()));
    if (!found?.player_key) {
      return res.json({ name: playerName, stats: { winRate: "-", serveRating: "-", returnRating: "-", fitness: "-" }, surfaces: { hard: "-", clay: "-", grass: "-" }, recentForm: [] });
    }
    const playerRes = await apiGet({ method: "get_players", player_key: found.player_key });
    const playerData = playerRes.data?.result?.[0];
    if (!playerData) throw new Error("No player data");
    const stats = playerData.stats?.find(s => s.type === "singles") || {};
    const hardWon = parseInt(stats.hard_won) || 0, hardLost = parseInt(stats.hard_lost) || 0;
    const clayWon = parseInt(stats.clay_won) || 0, clayLost = parseInt(stats.clay_lost) || 0;
    const grassWon = parseInt(stats.grass_won) || 0, grassLost = parseInt(stats.grass_lost) || 0;
    const totalWon = parseInt(stats.matches_won) || 0, totalLost = parseInt(stats.matches_lost) || 0;
    const total = totalWon + totalLost;
    res.json({
      name: playerData.player_name, country: playerData.player_country, logo: playerData.player_logo,
      stats: { winRate: total > 0 ? Math.round((totalWon / total) * 100) : "-", titles: stats.titles || 0, rank: found.place, points: found.points },
      surfaces: {
        hard: hardWon + hardLost > 0 ? Math.round((hardWon / (hardWon + hardLost)) * 100) : "-",
        clay: clayWon + clayLost > 0 ? Math.round((clayWon / (clayWon + clayLost)) * 100) : "-",
        grass: grassWon + grassLost > 0 ? Math.round((grassWon / (grassWon + grassLost)) * 100) : "-"
      },
      recentForm: []
    });
  } catch (err) {
    console.error("PLAYER ERROR:", err.message);
    res.status(500).json({ error: "Error loading player data" });
  }
});

// ─── LIVE MATCHES ─────────────────────────────────────────────────────────────
app.get("/api/live", async (req, res) => {
  try {
    const response = await apiGet({ method: "get_livescore", event_type_key: 265 });
    const matches = response.data?.result || [];
    res.json(matches.map(m => ({
      player1: m.event_first_player, player2: m.event_second_player,
      score: m.event_final_result || "-", status: m.event_status || "", tournament: m.tournament_name || ""
    })));
  } catch (err) { console.error("LIVE ERROR:", err.message); res.json([]); }
});

// ─── H2H ──────────────────────────────────────────────────────────────────────
app.get("/api/h2h", async (req, res) => {
  try {
    const { p1_key, p2_key, p1_name, p2_name } = req.query;
    if (!p1_key || !p2_key) return res.status(400).json({ error: "Player keys missing" });
    const response = await apiGet({ method: "get_H2H", first_player_key: p1_key, second_player_key: p2_key });
    const result = response.data?.result || {};
    const h2h = result.H2H || [];
    const p1Results = result.firstPlayerResults || [];
    const p2Results = result.secondPlayerResults || [];
    const p1Last = (p1_name || "").toLowerCase().trim().split(" ").pop();
    const p2Last = (p2_name || "").toLowerCase().trim().split(" ").pop();
    let p1Wins = 0, p2Wins = 0;
    h2h.forEach(match => {
      const winner = match.event_winner;
      const fp = (match.event_first_player || "").toLowerCase();
      const sp = (match.event_second_player || "").toLowerCase();
      if (!winner) return;
      const winnerIsFirst = winner === "First Player";
      const winnerName = winnerIsFirst ? fp : sp;
      if (p1Last && winnerName.includes(p1Last)) p1Wins++;
      else if (p2Last && winnerName.includes(p2Last)) p2Wins++;
      else if (winnerIsFirst) p1Wins++;
      else p2Wins++;
    });
    const filterSelfMatches = (matches) => matches.filter(m => {
      const p1 = (m.event_first_player || "").toLowerCase().trim();
      const p2 = (m.event_second_player || "").toLowerCase().trim();
      if (!p1 || !p2 || p1 === p2) return false;
      if (p1.split(" ").pop() === p2.split(" ").pop()) return false;
      return true;
    }).slice(0, 5);
    res.json({ h2h_matches: h2h.slice(0, 10), p1_wins: p1Wins, p2_wins: p2Wins, p1_recent: filterSelfMatches(p1Results), p2_recent: filterSelfMatches(p2Results) });
  } catch (err) { console.error("H2H ERROR:", err.message); res.status(500).json({ error: "Error loading H2H data" }); }
});

// ─── ODDS ─────────────────────────────────────────────────────────────────────
app.get("/api/odds/:match_key", async (req, res) => {
  try {
    const response = await apiGet({ method: "get_odds", match_key: req.params.match_key });
    res.json(response.data?.result || {});
  } catch (err) { console.error("ODDS ERROR:", err.message); res.status(500).json({ error: "Error" }); }
});

// ─── In-memory cache for form data (5 min TTL) ───────────────────────────────
const formCache = new Map();
const FORM_TTL = 5 * 60 * 1000;

// ─── HELPER: Calculate real form from recent matches ─────────────────────────
async function getPlayerForm(playerName, standings) {
  const cacheKey = playerName.toLowerCase().trim();
  const cached = formCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < FORM_TTL) return cached.data;

  try {
    const lastName = playerName.toLowerCase().trim().split(" ").pop();

    let found = standings.find(p => {
      const pn = (p.player||"").toLowerCase();
      return pn.split(" ").some(word => word === lastName) || pn.includes(lastName);
    });

    if (!found?.player_key) {
      try {
        const chalRes = await apiGet({ method: "get_standings", event_type: "Challenger" });
        const chalStandings = chalRes.data?.result || [];
        found = chalStandings.find(p => (p.player||"").toLowerCase().trim().split(" ").pop() === lastName);
      } catch(e) { /* ignore */ }
    }

    if (!found?.player_key) {
      try {
        const today = getBerlinDate();
        const fixRes = await apiGet({ method: "get_fixtures", date_start: today, date_stop: today });
        const fixtures = fixRes.data?.result || [];
        for (const m of fixtures) {
          if ((m.event_first_player||"").toLowerCase().includes(lastName) && m.event_first_player_key) {
            found = { player: m.event_first_player, player_key: m.event_first_player_key };
            break;
          }
          if ((m.event_second_player||"").toLowerCase().includes(lastName) && m.event_second_player_key) {
            found = { player: m.event_second_player, player_key: m.event_second_player_key };
            break;
          }
        }
      } catch(e) { /* ignore */ }
    }

    if (!found?.player_key) return null;
    const playerKey = String(found.player_key);

    const dateEnd = getBerlinDate();
    const dateStart = getBerlinDate(-90);

    const [atpRes, chalRes] = await Promise.allSettled([
      apiGet({ method:"get_fixtures", date_start:dateStart, date_stop:dateEnd, event_type_key:265, player_key:playerKey }),
      apiGet({ method:"get_fixtures", date_start:dateStart, date_stop:dateEnd, event_type_key:281, player_key:playerKey })
    ]);

    const allMatches = [
      ...(atpRes.status==="fulfilled" ? atpRes.value.data?.result||[] : []),
      ...(chalRes.status==="fulfilled" ? chalRes.value.data?.result||[] : [])
    ];

    const matches = allMatches
      .filter(m => m.event_status==="Finished" || m.event_winner)
      .sort((a,b) => (a.event_date||"").localeCompare(b.event_date||""));
    if (matches.length === 0) return null;

    const recent = matches.slice(-10).reverse();
    let wins = 0, losses = 0, formScore = 0;
    let surfaceWins = { hard: 0, clay: 0, grass: 0 };
    let surfaceTotal = { hard: 0, clay: 0, grass: 0 };
    let handWins = { R: 0, L: 0 };
    let handTotal = { R: 0, L: 0 };

    recent.forEach((m, idx) => {
      const isFirst = (m.event_first_player||"").toLowerCase().includes(lastName);
      const won = (isFirst && m.event_winner === "First Player") ||
                  (!isFirst && m.event_winner === "Second Player");
      const weight = 1 - (idx * 0.08);
      if (won) { wins++; formScore += weight * 10; }
      else { losses++; formScore -= weight * 3; }
      const tn = (m.tournament_name||"").toLowerCase();
      const surf = tn.includes("clay")||tn.includes("roland")||tn.includes("french")||tn.includes("madrid")||tn.includes("rome")||tn.includes("monte") ? "clay"
        : tn.includes("grass")||tn.includes("wimbledon")||tn.includes("halle")||tn.includes("queens") ? "grass" : "hard";
      surfaceTotal[surf]++;
      if (won) surfaceWins[surf]++;

      const opponentName = isFirst ? m.event_second_player : m.event_first_player;
      const oppHand = getPlayerHand(opponentName);
      console.log(`  Hand lookup: "${opponentName}" → ${oppHand||"not found"}`);
      if (oppHand === "R" || oppHand === "L") {
        handTotal[oppHand]++;
        if (won) handWins[oppHand]++;
      }
    });

    const total = wins + losses;
    const normalizedForm = Math.min(92, Math.max(30, 50 + formScore * 2));
    const surfaceRates = {};
    ["hard","clay","grass"].forEach(s => {
      surfaceRates[s] = surfaceTotal[s] > 0 ? Math.round((surfaceWins[s]/surfaceTotal[s])*100) : null;
    });

    const result = {
      form: Math.round(normalizedForm),
      winRate: Math.round(total > 0 ? (wins/total)*100 : 50),
      wins, losses, total,
      recentResults: recent.slice(0,5).map(m => {
        const isFirst = (m.event_first_player||"").toLowerCase().includes(lastName);
        const won = (isFirst && m.event_winner==="First Player")||(!isFirst && m.event_winner==="Second Player");
        const oppName = isFirst ? m.event_second_player : m.event_first_player;
        return { won, tournament: m.tournament_name, date: m.event_date, opponent: oppName, opponentHand: getPlayerHand(oppName) };
      }),
      surfaceRates,
      handRates: {
        vsRight: handTotal.R > 0 ? { wins: handWins.R, total: handTotal.R, pct: Math.round((handWins.R/handTotal.R)*100) } : null,
        vsLeft:  handTotal.L > 0 ? { wins: handWins.L, total: handTotal.L, pct: Math.round((handWins.L/handTotal.L)*100) } : null,
      }
    };
    formCache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  } catch (err) {
    console.error("FORM ERROR:", err.message);
    formCache.set(cacheKey, { data: null, ts: Date.now() });
    return null;
  }
}

// ─── MATCH PREDICTION ─────────────────────────────────────────────────────────
app.get("/api/predict", async (req, res) => {
  const { p1, p2, surface = "hard" } = req.query;
  let rank1 = parseInt(req.query.rank1) || 100;
  let rank2 = parseInt(req.query.rank2) || 100;
  const bo = parseInt(req.query.bo) === 5 ? 5 : 3;

  const hashStr = (str) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  };
  const stableRand = (seed) => ((hashStr(seed) % 1000) / 500) - 1;

  const eloFromRank = (rank) => Math.max(1500, 2400 - Number(rank) * 6);

  let form1Data = null, form2Data = null, standings = [];
  try {
    const [atpRes, chalRes] = await Promise.allSettled([
      apiGet({ method: "get_standings", event_type: "ATP" }),
      apiGet({ method: "get_standings", event_type: "Challenger" })
    ]);
    const atpStandings = atpRes.status === "fulfilled" ? atpRes.value.data?.result || [] : [];
    const chalStandings = chalRes.status === "fulfilled" ? chalRes.value.data?.result || [] : [];
    standings = [...atpStandings, ...chalStandings];

    // ── Look up real rank from standings if frontend passed 100 as fallback ──
    const findRank = (name) => {
      if (!name) return null;
      const nameLow = name.toLowerCase().trim();
      const parts = nameLow.split(" ");
      const lastName = parts[parts.length-1];
      const found = standings.find(s => {
        const sn = (s.player||"").toLowerCase();
        return sn.includes(nameLow) || sn.split(" ").pop() === lastName;
      });
      return found ? parseInt(found.place)||null : null;
    };

    if (rank1 >= 100) {
      const found = findRank(p1);
      if (found) rank1 = found;
    }
    if (rank2 >= 100) {
      const found = findRank(p2);
      if (found) rank2 = found;
    }
    console.log(`[PREDICT] ${p1} rank=${rank1}, ${p2} rank=${rank2}`);

    [form1Data, form2Data] = await Promise.all([
      getPlayerForm(p1, standings),
      getPlayerForm(p2, standings)
    ]);
  } catch(e) { console.error("Form fetch error:", e.message); }

  const elo1 = eloFromRank(rank1), elo2 = eloFromRank(rank2);
  const expected1 = 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
  const expected2 = 1 - expected1;

  const hand1 = getPlayerHand(p1);
  const hand2 = getPlayerHand(p2);
  let handMod1 = 0, handMod2 = 0;
  if (hand1 === "L" && hand2 === "R") { handMod1 = 2.5; handMod2 = -2.5; }
  else if (hand1 === "R" && hand2 === "L") { handMod1 = -2.5; handMod2 = 2.5; }
  if (surface === "clay") { handMod1 *= 1.3; handMod2 *= 1.3; }

  const form1 = form1Data ? form1Data.form : Math.max(30, Math.min(85, 85 - Number(rank1) * 0.2));
  const form2 = form2Data ? form2Data.form : Math.max(30, Math.min(85, 85 - Number(rank2) * 0.2));

  if (form1Data?.handRates && hand2) {
    const rate = hand2 === "R" ? form1Data.handRates.vsRight : form1Data.handRates.vsLeft;
    if (rate && rate.total >= 3) handMod1 += (rate.pct - 50) * 0.08;
  }
  if (form2Data?.handRates && hand1) {
    const rate = hand1 === "R" ? form2Data.handRates.vsRight : form2Data.handRates.vsLeft;
    if (rate && rate.total >= 3) handMod2 += (rate.pct - 50) * 0.08;
  }

  const surfRate1 = form1Data?.surfaceRates?.[surface];
  const surfRate2 = form2Data?.surfaceRates?.[surface];
  const surface1 = surfRate1 != null ? surfRate1 : Number(req.query.surface1 || 0);
  const surface2 = surfRate2 != null ? surfRate2 : Number(req.query.surface2 || 0);

  const getSurfaceModifier = (playerName, rank, surf) => {
    const variance = Math.max(2, 8 - Number(rank) * 0.05);
    return Math.round(stableRand(`${playerName}-${surf}`) * variance);
  };
  const surfMod1 = getSurfaceModifier(p1, rank1, surface);
  const surfMod2 = getSurfaceModifier(p2, rank2, surface);

  const surfaceWeightAdj = surface === "clay" ? 1.4 : surface === "grass" ? 1.2 : 1.0;
  let score1 = expected1*100*0.30 + form1*0.40 + surfMod1*surfaceWeightAdj + handMod1*0.05;
  let score2 = expected2*100*0.30 + form2*0.40 + surfMod2*surfaceWeightAdj + handMod2*0.05;
  if (surface1 > 0 || surface2 > 0) { score1 += surface1*0.25; score2 += surface2*0.25; }

  const p1Win = Math.round((score1/(score1+score2))*100);
  const rankDiff = Math.abs(rank1-rank2);
  const rankingFactor = Math.min(70, 20+rankDiff*0.6);
  const formFactor = Math.max(10, 40-rankDiff*0.2);
  const clutchFactor = 10 + (hashStr(`${p1}-${p2}-clutch`) % 100) / 10;
  const momentumFactor = Math.max(10, 100-rankingFactor-formFactor-clutchFactor);
  const confidence = Math.min(99, Math.round(Math.abs(p1Win-50)*1.8+Math.min(30,rankDiff*0.4)));

  const deriveStats = (playerName, rank, elo, formData) => {
    const base = Math.max(52, Math.min(88, 90 - Math.sqrt(Math.min(rank, 300)) * 2.5));
    const eloBonus = Math.max(-5, Math.min(5, (elo - 1900) * 0.02));
    const r = (key) => stableRand(`${playerName}-${key}`) * 4;
    const formBoost = formData ? (formData.form - 65) * 0.15 : 0;
    return {
      serve:    Math.min(92, Math.max(52, Math.round(base + eloBonus + r("serve") + formBoost))),
      return:   Math.min(92, Math.max(52, Math.round(base + eloBonus + r("return") + formBoost))),
      clutch:   Math.min(92, Math.max(52, Math.round(base + eloBonus + r("clutch") + formBoost))),
      momentum: Math.min(92, Math.max(52, Math.round(base + eloBonus + r("momentum") + formBoost))),
    };
  };
  const p1Stats = deriveStats(p1, Number(rank1), elo1, form1Data);
  const p2Stats = deriveStats(p2, Number(rank2), elo2, form2Data);
  const surfaceSetMod = surface==="clay"?0.03:surface==="grass"?-0.02:0;

  // ── FIX: setWinP1 von finalem p1Win ableiten (inkl. Form, Surface, Hand)
  // statt nur von rohem Elo — damit Handicap/SetBetting konsistent mit Match Winner ist
  const p1WinFrac = p1Win / 100;
  const setWinP1 = Math.min(0.85, Math.max(0.15, p1WinFrac + surfaceSetMod));
  const setWinP2 = 1 - setWinP1;
  const expGPSW = 6+Math.max(0,(Math.max(setWinP1,setWinP2)-0.5)*2);
  const expGPSL = Math.max(1, 6-(Math.max(setWinP1,setWinP2)-0.5)*10); // steeper falloff for close matches
  const favoriteIsP1 = setWinP1>=setWinP2;
  const favorite = favoriteIsP1?p1:p2, underdog = favoriteIsP1?p2:p1;
  const p=Math.max(setWinP1,setWinP2), q=1-p;

  let expFav, expDog;
  if (bo === 5) {
    const sc30 = p*p*p, sc31 = 3*p*p*p*q, sc32 = 6*p*p*p*q*q;
    const sc03 = q*q*q, sc13 = 3*p*q*q*q, sc23 = 6*p*p*q*q*q;
    expFav = sc30*(3*expGPSW) + sc31*(3*expGPSW+expGPSL) + sc32*(3*expGPSW+2*expGPSL) + sc03*(3*expGPSL) + sc13*(expGPSW+3*expGPSL) + sc23*(2*expGPSW+3*expGPSL);
    expDog = sc30*(3*expGPSL) + sc31*(expGPSL*3+expGPSW) + sc32*(3*expGPSL+2*expGPSW) + sc03*(3*expGPSW) + sc13*(expGPSL+3*expGPSW) + sc23*(2*expGPSL+3*expGPSW);
  } else {
    const sc20 = p*p, sc21 = 2*p*p*q, sc12 = 2*p*q*q, sc02 = q*q;
    expFav = sc20*2*expGPSW + sc21*(2*expGPSW+expGPSL) + sc12*(expGPSW+2*expGPSL) + sc02*2*expGPSL;
    expDog = sc20*2*expGPSL + sc21*(2*expGPSL+expGPSW) + sc12*(expGPSL+2*expGPSW) + sc02*2*expGPSW;
  }

  const handicapLine = Math.round((expFav-expDog)*2)/2;
  const handicapPick = handicapLine>=2?`${favorite} -${handicapLine} Games`:handicapLine>=0.5?`${favorite} -${handicapLine} Games (knapp)`:`Kein klares Handicap`;
  const handicapReason = handicapLine>=2?`${favorite} dominates by an expected ~${handicapLine} Games.`:handicapLine>=0.5?`Slight advantage for ${favorite}.`:`Too close to call.`;
  res.json({
    player1:p1, player2:p2, surface,
    bo, format: bo === 5 ? "Best of 5 (Grand Slam)" : "Best of 3",
    hand:{[p1]:hand1||"U",[p2]:hand2||"U"},
    elo:{[p1]:Math.round(elo1),[p2]:Math.round(elo2)},
    prediction:{[p1]:p1Win,[p2]:100-p1Win}, confidence,
    playerStats:{[p1]:p1Stats,[p2]:p2Stats},
    setWinProb:{[p1]:Math.round(setWinP1*100),[p2]:Math.round(setWinP2*100)},
    handicap:{line:handicapLine,favorite,underdog,pick:handicapPick,reason:handicapReason,expGames:{[favorite]:Math.round(expFav*10)/10,[underdog]:Math.round(expDog*10)/10}},
    factors:{ranking:Math.round(rankingFactor),form:Math.round(formFactor),clutch:Math.round(clutchFactor),momentum:Math.round(momentumFactor),surface},
    formData:{[p1]:form1Data?{form:form1Data.form,wins:form1Data.wins,losses:form1Data.losses,recentResults:form1Data.recentResults,handRates:form1Data.handRates}:null,[p2]:form2Data?{form:form2Data.form,wins:form2Data.wins,losses:form2Data.losses,recentResults:form2Data.recentResults,handRates:form2Data.handRates}:null},
    explain:p1Win>60?`${p1} has clear advantages in ranking, form and matchup strength.`:p1Win<40?`${p2} has clear advantages in ranking, form and matchup strength.`:`Very evenly matched.`,
    edge:p1Win>65?`${p1} clearly superior`:p1Win>55?`${p1} slight advantage`:p1Win<35?`${p2} clearly superior`:p1Win<45?`${p2} slight advantage`:"very even"
  });
});

// ─── VALUE PICKS ──────────────────────────────────────────────────────────────
app.get("/api/valuepicks", async (req, res) => {
  try {
    const today = getBerlinDate();
    const fixturesRes = await apiGet({ method: "get_fixtures", date_start: today, date_stop: today, event_type_key: 265 });
    const matches = fixturesRes.data?.result || [];
    if (matches.length === 0) return res.json([]);
    const standingsRes = await apiGet({ method: "get_standings", event_type: "ATP" });
    const standings = standingsRes.data?.result || [];

    // Also load Challenger standings for players not in ATP top
    let chalStandings = [];
    try {
      const chalRes = await apiGet({ method: "get_standings", event_type: "Challenger" });
      chalStandings = chalRes.data?.result || [];
    } catch(e) {}

    const allStandings = [...standings, ...chalStandings];

    // ── Manual disambiguation for known name conflicts ────────────────────────
    // API sometimes returns names reversed (e.g. "Manuel Cerundolo Juan")
    // Map from fixture short name → exact standings player name
    const NAME_MAP = {
      "j. m. cerundolo": "Manuel Cerundolo Juan",
      "j.m. cerundolo":  "Manuel Cerundolo Juan",
      "j. cerundolo":    "Manuel Cerundolo Juan",
      "f. cerundolo":    "Francisco Cerundolo",
    };

    // Normalize reversed names for display (standings → readable)
    const normalizeDisplayName = (standingsName) => {
      if (!standingsName) return standingsName;
      // Detect reversed format: last word looks like a first name
      // e.g. "Manuel Cerundolo Juan" → last word "Juan" is a first name
      // Simple heuristic: if standings name has 3+ words, try to detect reversal
      return standingsName; // keep as-is for now, display handled in frontend
    };

    const matchPlayerInStandings = (shortName, standingsList) => {
      if (!shortName) return null;
      const key = shortName.trim().toLowerCase();

      // Check manual map first
      if (NAME_MAP[key]) {
        const mapped = standingsList.find(p =>
          (p.player||"").toLowerCase() === NAME_MAP[key].toLowerCase()
        );
        if (mapped) return mapped;
        return { player: NAME_MAP[key], place: "200" };
      }

      const parts = shortName.trim().split(" ");
      const lastName = parts[parts.length-1].toLowerCase();
      const initials = parts.slice(0,-1).map(p => p.replace(/\./g,"").toLowerCase()).filter(Boolean);

      if (initials.length > 0) {
        // Try matching against ALL words in standings name (handles reversed names)
        const exact = standingsList.find(p => {
          const pn = (p.player||"").toLowerCase();
          const pWords = pn.split(" ").filter(Boolean);
          const hasLastName = pWords.some(w => w === lastName);
          if (!hasLastName) return false;
          return initials.every(init => pWords.some(w => w.startsWith(init)));
        });
        if (exact) return exact;
      }

      return standingsList.find(p => (p.player||"").toLowerCase().split(" ").includes(lastName)) || null;
    };

    const getFullName = (shortName) => {
      const key = (shortName||"").trim().toLowerCase();
      if (NAME_MAP[key]) return NAME_MAP[key];
      const found = matchPlayerInStandings(shortName, allStandings);
      return found ? found.player : shortName;
    };

    const getRank = (shortName) => {
      const found = matchPlayerInStandings(shortName, allStandings);
      return found ? parseInt(found.place)||100 : 100;
    };
    const eloFromRank = (rank) => Math.max(1500, 2400-rank*6);
    const valuePicks = [];
    for (const match of matches.slice(0,15)) {
      // ── FIX: Skip cancelled/walkover matches for value picks ──────────────
      const statusNorm = (match.event_status||"").toLowerCase().replace(/ /g, "");
      const isCancelled = ["cancelled","canceled","walkover","w/o","retired","retirement","abandoned","withdrawal"].some(s => statusNorm.includes(s));
      if (isCancelled) continue;

      const p1Short = match.event_first_player, p2Short = match.event_second_player;
      if (!p1Short || !p2Short) continue;
      const p1=getFullName(p1Short), p2=getFullName(p2Short);
      const rank1=getRank(p1Short), rank2=getRank(p2Short);
      const elo1=eloFromRank(rank1), elo2=eloFromRank(rank2);
      const expected1 = 1/(1+Math.pow(10,(elo2-elo1)/400));
      const prob1=Math.round(expected1*100), prob2=100-prob1;
      let odds1=null, odds2=null, bookmaker="-";
      try {
        const oddsRes = await apiGet({ method: "get_odds", match_key: match.event_key });
        const oddsData = oddsRes.data?.result?.[match.event_key];
        const homeAway = oddsData?.["Home/Away"];
        if (homeAway) {
          const books = Object.keys(homeAway.Home||{});
          if (books.length > 0) { bookmaker=books[0]; odds1=parseFloat(homeAway.Home[bookmaker]); odds2=parseFloat(homeAway.Away[bookmaker]); }
        }
      } catch(e) {}
      let pick=null, edge=null, bestOdds=null;
      if (odds1 && odds2) {
        const e1=prob1-Math.round(100/odds1), e2=prob2-Math.round(100/odds2);
        if (e1>e2&&e1>2){pick=p1;edge=e1;bestOdds=odds1;} else if(e2>e1&&e2>2){pick=p2;edge=e2;bestOdds=odds2;}
      } else if (Math.abs(prob1-50)>8) { pick=prob1>prob2?p1:p2; edge=Math.abs(prob1-50)-8; }
      if (pick) {
        const ourProb=pick===p1?prob1:prob2;
        valuePicks.push({ match:`${p1} vs ${p2}`, tournament:match.tournament_name||"", pick, ourProb, impliedProb:bestOdds?Math.round(100/bestOdds):null, bestOdds, edge:Math.round(edge*10)/10, bookmaker, matchKey:match.event_key, time:match.event_time||"" });
      }
    }
    valuePicks.sort((a,b)=>b.edge-a.edge);
    res.json(valuePicks.slice(0,10));
  } catch(err) { console.error("VALUE PICKS ERROR:", err.message); res.status(500).json({ error: "Error" }); }
});

// ─── HEUTIGE FIXTURES ─────────────────────────────────────────────────────────
app.get("/api/fixtures/today", async (req, res) => {
  try {
    const today = getBerlinDate();
    const tomorrow = getBerlinDate(1);
    const showTomorrow = isAfter18Berlin();
    const dateStop = showTomorrow ? tomorrow : today;

    const eventTypes = [
      { key: 265, label: "ATP Singles" },
      { key: 281, label: "Challenger Singles" },
      { key: 282, label: "Challenger Doubles" }
    ];
    const [fixtureResults, liveResults] = await Promise.all([
      Promise.allSettled(eventTypes.map(et => apiGet({ method:"get_fixtures", date_start:today, date_stop:dateStop, event_type_key:et.key }).then(r=>(r.data?.result||[]).map(m=>({...m,_category:et.label}))))),
      Promise.allSettled(eventTypes.map(et => apiGet({ method:"get_livescore", event_type_key:et.key }).then(r=>(r.data?.result||[]).map(m=>({...m,_category:et.label})))))
    ]);
    const allFixtures = fixtureResults.filter(r=>r.status==="fulfilled").flatMap(r=>r.value);
    const allLive = liveResults.filter(r=>r.status==="fulfilled").flatMap(r=>r.value);
    const liveMap = new Map();
    allLive.forEach(m => liveMap.set(`${m.event_first_player}|${m.event_second_player}`, m));

    const formatted = allFixtures.map(m => {
      const key = `${m.event_first_player}|${m.event_second_player}`;
      const liveMatch = liveMap.get(key);
      const isLive = !!liveMatch || m.event_live==="1" || m.event_live===1;
      const isFinished = m.event_status==="Finished" || m.event_status==="After Extra Time";

      // ── FIX: Normalize status before checking (handles "Walk Over" with space) ──
      const statusNorm = (m.event_status||"").toLowerCase().replace(/ /g, "");
      const isCancelled = ["cancelled","canceled","walkover","w/o","retired","retirement","abandoned","withdrawal"].some(s => statusNorm.includes(s));

      const src = liveMatch||m;
      const parseScore = (val) => val!==undefined&&val!==null?String(val).split(".")[0]:"-";
      const setScores = [];
      if (Array.isArray(src.scores)&&src.scores.length>0) {
        [...src.scores].sort((a,b)=>parseInt(a.score_set)-parseInt(b.score_set)).forEach(s=>{
          if (s.score_first!==undefined&&s.score_first!==null) setScores.push({p1:parseScore(s.score_first),p2:parseScore(s.score_second)});
        });
      }
      // ── Streak berechnen aus recentResults ───────────────────────────────────
      const getStreak = (recentResults) => {
        if (!Array.isArray(recentResults) || recentResults.length === 0) return null;
        let streak = 0;
        const dir = recentResults[0].won ? 1 : -1;
        for (const r of recentResults) {
          if ((r.won ? 1 : -1) === dir) streak++;
          else break;
        }
        return { count: streak, won: dir === 1 };
      };

      return {
        player1:m.event_first_player, player2:m.event_second_player,
        score:src.event_final_result||"-", gameScore:src.event_game_result||"-",
        sets:setScores, status:isLive?(src.event_status||"Live"):isFinished?"Finished":isCancelled?"Cancelled":m.event_status||"Scheduled",
        tournament:m.tournament_name||"", category:m._category||"",
        court: m.event_ground||m.court_name||"",
        time:m.event_time||"", date:m.event_date||"",
        isTomorrow: showTomorrow && m.event_date === tomorrow,
        live:isLive, finished:isFinished, cancelled:isCancelled, matchKey:m.event_key
      };
    }).sort((a,b)=>{
      if(a.live&&!b.live)return -1; if(!a.live&&b.live)return 1;
      if(a.finished&&!b.finished)return 1; if(!a.finished&&b.finished)return -1;
      return a.time>b.time?1:-1;
    });
    res.json(formatted);
  } catch(err) { console.error("FIXTURES TODAY ERROR:", err.message); res.status(500).json({ error: "Error" }); }
});

// ─── MATCH DETAILS ────────────────────────────────────────────────────────────
app.get("/api/match/:matchKey", async (req, res) => {
  try {
    const { matchKey } = req.params;
    const today = getBerlinDate();
    const eventTypes = [265, 281, 282];
    let match = null;
    const liveResults = await Promise.allSettled(eventTypes.map(et => apiGet({ method:"get_livescore", event_type_key:et })));
    for (const r of liveResults) {
      if (r.status==="fulfilled") {
        const found = (r.value.data?.result||[]).find(m=>String(m.event_key)===String(matchKey));
        if (found) { match={...found,_isLive:true}; break; }
      }
    }
    if (!match) {
      const fixtureResults = await Promise.allSettled(eventTypes.map(et => apiGet({ method:"get_fixtures", date_start:today, date_stop:today, event_type_key:et })));
      for (const r of fixtureResults) {
        if (r.status==="fulfilled") {
          const found = (r.value.data?.result||[]).find(m=>String(m.event_key)===String(matchKey));
          if (found) { match=found; break; }
        }
      }
    }
    if (!match) return res.status(404).json({ error: "Match not found" });
    const extractSets = (m) => {
      const sets = [];
      if (Array.isArray(m.scores)&&m.scores.length>0) {
        [...m.scores].sort((a,b)=>parseInt(a.score_set)-parseInt(b.score_set)).forEach(s=>{
          if (s.score_first!==undefined&&s.score_first!==null) sets.push({p1:String(s.score_first).split(".")[0],p2:String(s.score_second??"").split(".")[0],set:parseInt(s.score_set)});
        });
      }
      if (sets.length===0) {
        const scoreStr=m.event_final_result||"";
        if (scoreStr.includes(",")) scoreStr.split(",").forEach((s,i)=>{const parts=s.trim().split("-");if(parts.length===2&&!isNaN(parts[0])&&!isNaN(parts[1]))sets.push({p1:parts[0].trim(),p2:parts[1].trim(),set:i+1});});
      }
      return sets;
    };
    let sets = extractSets(match);
    if (sets.length===0) {
      const parts=(match.event_final_result||"").replace(/ /g,"").split("-");
      if (parts.length===2&&!isNaN(parts[0])&&!isNaN(parts[1])) sets=[{p1:parts[0],p2:parts[1],set:1,isTotalSets:true}];
    }
    const isLive = match._isLive||match.event_live==="1"||match.event_live===1;
    const server = match.event_serve==="1"?1:match.event_serve==="2"?2:null;
    res.json({
      player1:match.event_first_player, player2:match.event_second_player,
      score:match.event_final_result||"-", gameScore:match.event_game_result||"-",
      status:match.event_status||"-", tournament:match.tournament_name||"",
      round:match.tournament_round||"", sets, scores:match.scores||[],
      statistics:match.statistics||[], pointbypoint:match.pointbypoint||[],
      server, live:isLive, time:match.event_time||"", date:match.event_date||"", surface:match.event_ground||""
    });
  } catch(err) { console.error("MATCH DETAIL ERROR:", err.message); res.status(500).json({ error: "Error" }); }
});

// ─── PLAYER NEWS ──────────────────────────────────────────────────────────────
app.get("/api/news/:player", async (req, res) => {
  try {
    const playerName = decodeURIComponent(req.params.player);
    const query = encodeURIComponent(`${playerName} tennis`);
    const response = await axios.get(`https://news.google.com/rss/search?q=${query}&hl=de&gl=DE&ceid=DE:de`, { headers:{"User-Agent":"Mozilla/5.0"}, timeout:5000 });
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match=itemRegex.exec(response.data))!==null&&items.length<5) {
      const item=match[1];
      const title=(item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)||item.match(/<title>(.*?)<\/title>/))?.[1]||"";
      const link=(item.match(/<link>(.*?)<\/link>/))?.[1]||"";
      const pubDate=(item.match(/<pubDate>(.*?)<\/pubDate>/))?.[1]||"";
      const source=(item.match(/<source[^>]*>(.*?)<\/source>/))?.[1]||"";
      if (title) items.push({ title:title.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#39;/g,"'").replace(/&quot;/g,'"'), link, pubDate:pubDate?new Date(pubDate).toLocaleDateString("de-DE"):"", source });
    }
    res.json(items);
  } catch(err) { console.error("NEWS ERROR:", err.message); res.json([]); }
});

// ─── TURNIER PREDICTIONS ──────────────────────────────────────────────────────
app.get("/api/tournament-predictions", async (req, res) => {
  try {
    const dateEnd = getBerlinDate(14);
    const todayStr = getBerlinDate();
    const dateStart = getBerlinDate(-16);
    const mainDrawCutoff = getBerlinDate(-14);

    const [singlesRes, standingsRes] = await Promise.allSettled([
      apiGet({ method:"get_fixtures", date_start:dateStart, date_stop:dateEnd, event_type_key:265 }),
      apiGet({ method:"get_standings", event_type:"ATP" })
    ]);
    const singles = singlesRes.status==="fulfilled"?singlesRes.value.data?.result||[]:[];
    const standings = standingsRes.status==="fulfilled"?standingsRes.value.data?.result||[]:[];

    const eloFromRank = (rank) => Math.max(1500, 2400-Number(rank)*6);

    const rankCache = new Map();
    const getRank = (name) => {
      if (!name) return 300;
      if (rankCache.has(name)) return rankCache.get(name);
      const lastName = name.toLowerCase().trim().split(" ").pop();
      const found = standings.find(p=>(p.player||"").toLowerCase().trim().split(" ").pop()===lastName);
      const rank = found?parseInt(found.place)||300:300;
      rankCache.set(name, rank); return rank;
    };

    const fullNameCache = new Map();
    const getFullName = (shortName) => {
      if (!shortName) return "";
      if (fullNameCache.has(shortName)) return fullNameCache.get(shortName);
      const lastName = shortName.trim().split(" ").pop().toLowerCase();
      const found = standings.find(p=>(p.player||"").toLowerCase().split(" ").pop()===lastName);
      const full = found?found.player:shortName;
      fullNameCache.set(shortName, full); return full;
    };

    const ROUND_ORDER = { "1/64-finals":1,"1/32-finals":2,"1/16-finals":3,"1/8-finals":4,"quarter-finals":5,"semi-finals":6,"final":7 };

    const normalizeRoundName = (raw) => {
      if (!raw) return null;
      const dashIdx = raw.lastIndexOf(" - ");
      let clean = dashIdx!==-1?raw.substring(dashIdx+3).trim():raw.trim();
      const cl = clean.toLowerCase();
      if (cl.includes("qual")||cl.includes("pre-")||cl.includes("qualifying")) return null;
      if (cl==="final"||cl==="finals") return "Final";
      if (cl.includes("semi")) return "Semi-Finals";
      if (cl.includes("quarter")) return "Quarter-Finals";
      if (cl.includes("1/8")||cl==="r16"||cl==="round of 16") return "1/8-Finals";
      if (cl.includes("1/16")||cl==="r32"||cl==="round 1"||cl==="r1"||cl==="first round"||cl==="round of 32") return "1/16-Finals";
      if (cl.includes("1/32")||cl==="round of 64") return "1/32-Finals";
      if (cl.includes("1/64")) return "1/64-Finals";
      return clean;
    };

    const getRoundOrder = (roundName) => ROUND_ORDER[(roundName||"").toLowerCase()]||0;

    // ── FIX: Normalize status before checking (handles "Walk Over" with space) ──
    const isWalkoverOrRetired = (m) => {
      const status = (m.event_status||"").toLowerCase().replace(/ /g, "");
      return status.includes("walkover")||status.includes("w/o")||status.includes("retired")||status.includes("retirement")||status.includes("withdraw")||status.includes("default")||status.includes("cancelled")||status.includes("canceled")||status.includes("abandoned");
    };

    const isFinished = (m) => {
      if (m.event_status==="Finished"||m.event_status==="After Extra Time") return true;
      if (isWalkoverOrRetired(m)) return true;
      if (m.event_winner&&m.event_winner!==""&&m.event_winner!=="0") return true;
      if (m.event_live==="1"||m.event_live===1) return false;
      return false;
    };

    const getWinner = (m, p1Name, p2Name) => {
      if (!isFinished(m)) return null;
      if (m.event_winner==="First Player"||m.event_winner==="1") return p1Name;
      if (m.event_winner==="Second Player"||m.event_winner==="2") return p2Name;
      const score=(m.event_final_result||"").replace(/ /g,"");
      const parts=score.split("-");
      if (parts.length===2&&!isNaN(parts[0])&&!isNaN(parts[1])) {
        const s1=parseInt(parts[0]),s2=parseInt(parts[1]);
        if (s1>s2) return p1Name; if (s2>s1) return p2Name;
      }
      return null;
    };

    const allFixtures = singles.map(m=>({...m,_disc:"Singles",event_type_key:265}));

    const tournMap = {};
    allFixtures.forEach(m => {
      const roundName = normalizeRoundName(m.tournament_round||m.event_round||"");
      if (!roundName) return;
      const tKey = `${m.tournament_name||"Unbekannt"}|||Singles|||265`;
      if (!tournMap[tKey]) {
        tournMap[tKey] = { name:m.tournament_name||"Unbekannt", disc:"Singles", eventTypeKey:"265", dateStart:m.event_date||dateStart, matches:[] };
      }
      if (m.event_date && m.event_date > tournMap[tKey].dateStart) tournMap[tKey].dateStart = m.event_date;
      if (!tournMap[tKey]._minDate || m.event_date < tournMap[tKey]._minDate) tournMap[tKey]._minDate = m.event_date;
      tournMap[tKey].matches.push({...m,_roundName:roundName});
    });

    const result = Object.values(tournMap).map(tourn => {
      const mainDrawRounds = ["1/64-Finals","1/32-Finals","1/16-Finals"];
      const mainDrawMatches = tourn.matches.filter(m => mainDrawRounds.includes(m._roundName));
      const mainDrawStart = mainDrawMatches.length > 0
        ? mainDrawMatches.map(m => m.event_date||"").filter(Boolean).sort()[0]
        : null;

      const filteredMatches = mainDrawStart
        ? tourn.matches.filter(m => !m.event_date || m.event_date >= mainDrawStart)
        : tourn.matches;

      const matchDedup = new Map();
      filteredMatches.forEach(m => {
        const p1=getFullName(m.event_first_player), p2=getFullName(m.event_second_player);
        if (!p1||!p2) return;
        const mKey=[p1,p2].sort().join("|||")+"|||"+m._roundName;
        if (!matchDedup.has(mKey)) matchDedup.set(mKey,{...m,_p1full:p1,_p2full:p2});
        else { const ex=matchDedup.get(mKey); if(isFinished(m)&&!isFinished(ex)) matchDedup.set(mKey,{...m,_p1full:p1,_p2full:p2}); }
      });
      const dedupedMatches=[...matchDedup.values()];

      const playerSet = new Map();
      dedupedMatches.forEach(m=>{
        [m._p1full,m._p2full].forEach(name=>{
          if (!name||playerSet.has(name)) return;
          const rank=getRank(name);
          playerSet.set(name,{name,rank,elo:eloFromRank(rank)});
        });
      });
      const allPlayers=[...playerSet.values()].sort((a,b)=>a.rank-b.rank);

      const finishedMatches = dedupedMatches
        .filter(m=>isFinished(m)&&getWinner(m,m._p1full,m._p2full))
        .map(m=>({ winner:getWinner(m,m._p1full,m._p2full), loser:getWinner(m,m._p1full,m._p2full)===m._p1full?m._p2full:m._p1full, round:m._roundName, roundOrder:getRoundOrder(m._roundName) }));

      const lastRoundPlayed = new Map();
      dedupedMatches.forEach(m=>{
        const ro=getRoundOrder(m._roundName);
        [m._p1full,m._p2full].forEach(name=>{ if(!lastRoundPlayed.has(name)||lastRoundPlayed.get(name)<ro) lastRoundPlayed.set(name,ro); });
      });

      const eliminated = new Set();
      finishedMatches.forEach(({loser,roundOrder})=>{
        const loserLastRound=lastRoundPlayed.get(loser)||0;
        if (loserLastRound<=roundOrder) eliminated.add(loser.toLowerCase());
      });

      // ── FIX: Cancelled matches with no winner ─────────────────────────────────
      // Only eliminate the player who has NO other matches in the tournament
      // (the one who withdrew, not the one replaced by a lucky loser)
      dedupedMatches.forEach(m => {
        const statusNorm = (m.event_status||"").toLowerCase().replace(/ /g,"");
        const isCancelled = statusNorm.includes("cancelled")||statusNorm.includes("canceled")||
                            statusNorm.includes("abandoned");
        const hasNoWinner = !m.event_winner || m.event_winner==="" || m.event_winner==="0" || m.event_winner===null;
        if (!isCancelled || !hasNoWinner) return;

        // For each player in this cancelled match:
        // if they appear in NO other match → they withdrew → eliminate them
        [m._p1full, m._p2full].forEach(playerName => {
          if (!playerName) return;
          const playerLow = playerName.toLowerCase();
          const otherMatches = dedupedMatches.filter(om => {
            if (om === m) return false;
            return om._p1full?.toLowerCase()===playerLow || om._p2full?.toLowerCase()===playerLow;
          });
          console.log(`[Cancelled check] ${playerName}: ${otherMatches.length} other matches`);
          if (otherMatches.length === 0) {
            eliminated.add(playerLow);
            console.log(`[Cancelled] Eliminated: ${playerName}`);
          }
        });
      });

      // ── FIX: W/O winner who then withdrew (next match also cancelled/WO) ─────
      dedupedMatches.forEach(m => {
        if (!isWalkoverOrRetired(m)) return;
        const winner = getWinner(m, m._p1full, m._p2full);
        if (!winner) return;
        const winnerLow = winner.toLowerCase();
        const roundOrder = getRoundOrder(m._roundName);
        const laterMatches = dedupedMatches.filter(lm => {
          const p1 = lm._p1full?.toLowerCase();
          const p2 = lm._p2full?.toLowerCase();
          return getRoundOrder(lm._roundName) > roundOrder && (p1===winnerLow||p2===winnerLow);
        });
        const allLaterCancelledOrNone = laterMatches.length===0 ||
          laterMatches.every(lm=>isWalkoverOrRetired(lm));
        if (allLaterCancelledOrNone) eliminated.add(winnerLow);
      });

      const maxFinishedRound = finishedMatches.reduce((max,m)=>Math.max(max,m.roundOrder),0);
      const winnersOfHighestRound = new Set(finishedMatches.filter(m=>m.roundOrder===maxFinishedRound).map(m=>m.winner.toLowerCase()));
      const allLosers = new Set(finishedMatches.map(m=>m.loser.toLowerCase()));

      let activePlayers;
      if (maxFinishedRound===0) {
        activePlayers=allPlayers.filter(p=>!eliminated.has(p.name.toLowerCase()));
        if (activePlayers.length===0) activePlayers=allPlayers;
      } else if (maxFinishedRound===7) {
        activePlayers=allPlayers.filter(p=>winnersOfHighestRound.has(p.name.toLowerCase()));
      } else {
        activePlayers=allPlayers.filter(p=>{
          const nameLow=p.name.toLowerCase();
          const lastLow=nameLow.split(" ").pop();
          return !allLosers.has(nameLow)&&!allLosers.has(lastLow)&&!eliminated.has(nameLow);
        });
      }
      if (activePlayers.length===0) activePlayers=allPlayers.slice(0,8);

      const top8=activePlayers.slice(0,8);

      // ── CLAY SPECIALIST BONUS ────────────────────────────────────────────────
      // Tournament surface detection
      const tournNameLower = (tourn.name||"").toLowerCase();
      const isClay = tournNameLower.includes("roland")||tournNameLower.includes("french")||
                     tournNameLower.includes("clay")||tournNameLower.includes("monte")||
                     tournNameLower.includes("madrid")||tournNameLower.includes("rome")||
                     tournNameLower.includes("barcelona")||tournNameLower.includes("hamburg")||
                     tournNameLower.includes("buenos")||tournNameLower.includes("estoril")||
                     tournNameLower.includes("munich")||tournNameLower.includes("lyon");
      const isGrass = tournNameLower.includes("wimbledon")||tournNameLower.includes("halle")||
                      tournNameLower.includes("queens")||tournNameLower.includes("grass")||
                      tournNameLower.includes("eastbourne")||tournNameLower.includes("stuttgart");

      // Surface specialist multipliers (based on career surface performance)
      const CLAY_SPECIALISTS = {
        "alcaraz":1.25,"ruud":1.20,"nadal":1.30,"tsitsipas":1.12,"zverev":1.08,
        "norrie":1.05,"cerundolo":1.15,"rune":1.08,"musetti":1.12,"davidovich":1.10,
        "coria":1.10,"schwartzman":1.10,"sonego":1.05,"gasquet":1.05,"simon":1.05
      };
      const GRASS_SPECIALISTS = {
        "djokovic":1.15,"federer":1.20,"kyrgios":1.10,"norrie":1.08,"draper":1.10,
        "fritz":1.05,"tiafoe":1.05,"hurkacz":1.10,"berrettini":1.12
      };
      const HARD_SPECIALISTS = {
        "sinner":1.10,"medvedev":1.12,"djokovic":1.08,"murray":1.05
      };

      const getSurfaceMultiplier = (playerName) => {
        const nameLow = playerName.toLowerCase();
        const lastName = nameLow.split(" ").pop();
        const specialists = isClay ? CLAY_SPECIALISTS : isGrass ? GRASS_SPECIALISTS : HARD_SPECIALISTS;
        for (const [key, mult] of Object.entries(specialists)) {
          if (lastName.includes(key) || nameLow.includes(key)) return mult;
        }
        return 1.0;
      };

      // ── DRAW DIFFICULTY ANALYSIS ─────────────────────────────────────────────
      // Split draw into halves based on round structure
      // Players in same half of draw can only meet in semis/final
      // Assign draw half based on match position in early rounds
      const drawHalfMap = new Map(); // playerName → 0 or 1 (draw half)
      const earlyRounds = dedupedMatches.filter(m =>
        ["1/64-Finals","1/32-Finals","1/16-Finals"].includes(m._roundName)
      );

      // Build half assignments from bracket position
      // Sort early round matches, first half gets 0, second half gets 1
      const sortedEarlyMatches = [...earlyRounds].sort((a,b)=>(a.event_date||"").localeCompare(b.event_date||""));
      sortedEarlyMatches.forEach((m, idx) => {
        const half = idx < sortedEarlyMatches.length / 2 ? 0 : 1;
        if (m._p1full) drawHalfMap.set(m._p1full.toLowerCase(), half);
        if (m._p2full) drawHalfMap.set(m._p2full.toLowerCase(), half);
      });

      // Calculate draw difficulty: avg rank of opponents in same half
      const getDrawDifficulty = (playerName) => {
        const half = drawHalfMap.get(playerName.toLowerCase());
        if (half === undefined) return 1.0;
        // Get all active players in same half
        const sameHalf = activePlayers.filter(p =>
          p.name !== playerName && drawHalfMap.get(p.name.toLowerCase()) === half
        );
        if (sameHalf.length === 0) return 1.0;
        const avgRank = sameHalf.reduce((s,p)=>s+p.rank,0) / sameHalf.length;
        const allAvgRank = activePlayers.filter(p=>p.name!==playerName).reduce((s,p)=>s+p.rank,0) /
                           Math.max(1, activePlayers.length-1);
        // Easier draw (higher avg rank of opponents) → bonus; harder draw → penalty
        // drawFactor: 0.9 to 1.1 range
        const drawFactor = Math.min(1.10, Math.max(0.90, 1.0 + (avgRank - allAvgRank) / allAvgRank * 0.3));
        return drawFactor;
      };

      // ── WIN PROBABILITY WITH ALL FACTORS ────────────────────────────────────
      const rawScores = top8.map(p => {
        const baseScore = Math.exp(-p.rank * 0.08);
        const surfMult = getSurfaceMultiplier(p.name);
        const drawFactor = getDrawDifficulty(p.name);
        // Also boost players who have been winning (round advancement bonus)
        const roundsWon = finishedMatches.filter(m=>m.winner.toLowerCase()===p.name.toLowerCase()).length;
        const formBonus = 1.0 + roundsWon * 0.03; // +3% per round won in this tournament
        return {
          ...p,
          score: baseScore * surfMult * drawFactor * formBonus,
          surfMult, drawFactor, formBonus
        };
      });

      const totalScore=rawScores.reduce((s,p)=>s+p.score,0)||1;
      const winProbs=rawScores.map(p=>({
        ...p,
        winProb:Math.max(1,Math.round((p.score/totalScore)*100))
      })).sort((a,b)=>b.winProb-a.winProb);
      const probSum=winProbs.reduce((s,p)=>s+p.winProb,0);
      if (winProbs.length>0&&probSum!==100) winProbs[0].winProb+=(100-probSum);

      // ── FIX 1: Dynamic favorite = highest win probability ────────────────────
      const dynamicFavorite = winProbs[0] || allPlayers[0];

      // ── FIX 2: Also recalculate match predictions with surface ELO ───────────
      // (used in roundsMap below)

      const roundsMap = {};
      dedupedMatches.forEach(m=>{
        const key=m._roundName;
        if (!roundsMap[key]) roundsMap[key]={round:key,matches:[]};
        const r1=getRank(m._p1full), r2=getRank(m._p2full);
        // Surface-adjusted Elo for match predictions
        const surfMult1 = getSurfaceMultiplier(m._p1full);
        const surfMult2 = getSurfaceMultiplier(m._p2full);
        const elo1=eloFromRank(r1) * surfMult1;
        const elo2=eloFromRank(r2) * surfMult2;
        const prob1=Math.round(1/(1+Math.pow(10,(elo2-elo1)/400))*100);
        const predPick=prob1>=50?m._p1full:m._p2full;
        const fin=isFinished(m);
        const actualWinner=fin?getWinner(m,m._p1full,m._p2full):null;
        const score=m.event_final_result&&m.event_final_result!=="-"?m.event_final_result:null;
        const winnerLast=actualWinner?actualWinner.toLowerCase().split(" ").pop():null;
        const predLast=predPick?predPick.toLowerCase().split(" ").pop():null;
        const correct=winnerLast&&predLast?winnerLast===predLast:null;
        const isWO = isWalkoverOrRetired(m);
        const matchStatus = isWO ? (m.event_status||"W/O") : null;

        roundsMap[key].matches.push({
          player1:m._p1full, player2:m._p2full, rank1:r1, rank2:r2,
          prediction:predPick, prob:Math.max(prob1,100-prob1),
          date:m.event_date||"", time:m.event_time||"",
          actualWinner, score, isFinished:fin, correct,
          isWalkover:isWO, matchStatus
        });
      });

      const MAX_PER_ROUND = { "1/64-Finals":64,"1/32-Finals":32,"1/16-Finals":16,"1/8-Finals":8,"Quarter-Finals":4,"Semi-Finals":2,"Final":1 };
      const sortedRounds = Object.values(roundsMap)
        .sort((a,b)=>getRoundOrder(a.round)-getRoundOrder(b.round))
        .map(r=>{
          const max=MAX_PER_ROUND[r.round]||999;
          const sorted=[...r.matches].sort((a,b)=>{ if(a.isFinished&&!b.isFinished)return -1; if(!a.isFinished&&b.isFinished)return 1; return (a.date||"").localeCompare(b.date||""); });
          return {...r,matches:sorted.slice(0,max)};
        })
        .filter(r=>r.matches.length>0);

      return {
        name:tourn.name, type:"ATP Singles", discipline:"Singles",
        dateStart:mainDrawStart||tourn._minDate||tourn.dateStart, playerCount:allPlayers.length,
        favorite:dynamicFavorite?{name:dynamicFavorite.name,rank:dynamicFavorite.rank,elo:dynamicFavorite.elo}:null,
        surface: isClay?"clay":isGrass?"grass":"hard",
        winProbs:winProbs.slice(0,8), rounds:sortedRounds,
        drawSet:allPlayers.length>0,
        eliminatedCount:eliminated.size,
        activePlayerCount:activePlayers.length,
        isLive:filteredMatches.some(m=>m.event_live==="1"||m.event_live===1),
        hasStarted:eliminated.size>0
      };
    }).sort((a,b)=>a.dateStart.localeCompare(b.dateStart));

    res.json(result);
  } catch(err) { console.error("TOURNAMENT PREDICTIONS ERROR:", err.message); res.status(500).json({ error: "Error" }); }
});

// ─── CACHE CLEAR ─────────────────────────────────────────────────────────────
app.get("/api/clear-cache", (req, res) => {
  formCache.clear();
  res.json({ ok: true, message: `Cache cleared` });
});

app.get("/api/debug-player-full", async (req, res) => {
  try {
    const name = (req.query.name||"sinner").toLowerCase();
    const standingsRes = await apiGet({ method: "get_standings", event_type: "ATP" });
    const standings = standingsRes.data?.result || [];
    const found = standings.find(p => (p.player||"").toLowerCase().includes(name));
    if (!found?.player_key) return res.json({ error: "Player not found in standings", name });
    const playerRes = await apiGet({ method: "get_players", player_key: found.player_key });
    const playerData = playerRes.data?.result?.[0];
    res.json({ standings_entry: found, full_player_data: playerData });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/debug-player", async (req, res) => {
  try {
    const name = (req.query.name||"").toLowerCase();
    const lastName = name.split(" ").pop();
    const today = getBerlinDate();
    const results = {};
    const atpRes = await apiGet({ method: "get_standings", event_type: "ATP" });
    const atpFound = (atpRes.data?.result||[]).find(p => (p.player||"").toLowerCase().includes(lastName));
    results.atp_standings = atpFound ? { name: atpFound.player, key: atpFound.player_key, rank: atpFound.place } : "not found";
    try {
      const chalRes = await apiGet({ method: "get_standings", event_type: "Challenger" });
      const chalFound = (chalRes.data?.result||[]).find(p => (p.player||"").toLowerCase().includes(lastName));
      results.challenger_standings = chalFound ? { name: chalFound.player, key: chalFound.player_key } : "not found";
    } catch(e) { results.challenger_standings = "error: " + e.message; }
    const fixRes = await apiGet({ method: "get_fixtures", date_start: today, date_stop: today });
    const fixMatches = (fixRes.data?.result||[]).filter(m =>
      (m.event_first_player||"").toLowerCase().includes(lastName) ||
      (m.event_second_player||"").toLowerCase().includes(lastName)
    );
    results.today_fixtures = fixMatches.map(m => ({
      p1: m.event_first_player, p1_key: m.event_first_player_key,
      p2: m.event_second_player, p2_key: m.event_second_player_key,
      tournament: m.tournament_name
    }));
    res.json(results);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/debug-tournament", async (req, res) => {
  try {
    const tournName=(req.query.name||"").toLowerCase();
    const singlesRes=await apiGet({ method:"get_fixtures", date_start:getBerlinDate(-1), date_stop:getBerlinDate(14), event_type_key:265 });
    const all=singlesRes.data?.result||[];
    const filtered=all.filter(m=>!tournName||(m.tournament_name||"").toLowerCase().includes(tournName));
    const debug=filtered.map(m=>({ event_key:m.event_key, tournament_name:m.tournament_name, tournament_round:m.tournament_round, event_round:m.event_round, event_date:m.event_date, event_time:m.event_time, event_status:m.event_status, event_live:m.event_live, event_winner:m.event_winner, event_final_result:m.event_final_result, event_first_player:m.event_first_player, event_second_player:m.event_second_player }));
    const byRound={};
    debug.forEach(m=>{ const r=m.tournament_round||m.event_round||"?"; if(!byRound[r])byRound[r]=[]; byRound[r].push(m); });
    res.json({ total:debug.length, byRound, raw:debug });
  } catch(err) { res.status(500).json({ error:err.message }); }
});

// ─── NEWS ANALYSIS (Claude Proxy) ────────────────────────────────────────────
// ─── HELPER: Detect withdrawals from fixture data ────────────────────────────
const getWithdrawals = async (playerName) => {
  try {
    const lastName = playerName.split(" ").pop().toLowerCase();
    const dateFrom = getBerlinDate(-21);
    const dateTo = getBerlinDate(1);
    const [atp, chal] = await Promise.allSettled([
      apiGet({ method:"get_fixtures", date_start:dateFrom, date_stop:dateTo, event_type_key:265 }),
      apiGet({ method:"get_fixtures", date_start:dateFrom, date_stop:dateTo, event_type_key:281 })
    ]);
    const all = [
      ...(atp.status==="fulfilled" ? atp.value.data?.result||[] : []),
      ...(chal.status==="fulfilled" ? chal.value.data?.result||[] : [])
    ];
    return all.filter(m => {
      const p1 = (m.event_first_player||"").toLowerCase();
      const p2 = (m.event_second_player||"").toLowerCase();
      if (!p1.includes(lastName) && !p2.includes(lastName)) return false;
      const status = (m.event_status||"").toLowerCase().replace(/ /g,"");
      return status.includes("cancelled") || status.includes("walkover") ||
             status.includes("retired") || status.includes("w/o") ||
             (m.event_winner === null && status !== "" && status !== "scheduled" && status !== "notstarted");
    }).map(m => ({
      tournament: m.tournament_name||"",
      date: m.event_date||"",
      opponent: (m.event_first_player||"").toLowerCase().includes(lastName)
        ? m.event_second_player : m.event_first_player,
      status: m.event_status||"W/O"
    }));
  } catch(e) { return []; }
};

app.post("/api/news-analysis", async (req, res) => {
  try {
    const { player1, player2, headlines1, headlines2, baseProb1 } = req.body;
    if (!player1 || !player2) return res.status(400).json({ error: "Missing players" });
    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_KEY) return res.status(500).json({ error: "No Anthropic API key configured" });

    // ── Echte Form-Daten holen ──────────────────────────────────────────────
    const getRecentForm = async (playerName) => {
      try {
        const [atpRes, chalRes] = await Promise.allSettled([
          apiGet({ method:"get_standings", event_type:"ATP" }),
          apiGet({ method:"get_standings", event_type:"Challenger" })
        ]);
        const standings = [
          ...(atpRes.status==="fulfilled" ? atpRes.value.data?.result||[] : []),
          ...(chalRes.status==="fulfilled" ? chalRes.value.data?.result||[] : [])
        ];
        const formData = await getPlayerForm(playerName, standings);
        if (!formData?.recentResults?.length) return null;
        const recent = formData.recentResults.slice(0, 10);
        const wins = recent.filter(r=>r.won).length;
        const losses = recent.length - wins;
        let streak = 0;
        const dir = recent[0]?.won ? 1 : -1;
        for (const r of recent) { if ((r.won?1:-1)===dir) streak++; else break; }
        return {
          wins, losses, total: recent.length,
          winPct: recent.length > 0 ? Math.round(wins/recent.length*100) : null,
          streak, streakWon: dir===1,
          recentMatches: recent.slice(0,5).map(r => ({
            won: r.won, tournament: r.tournament||"", opponent: r.opponent||""
          }))
        };
      } catch(e) { return null; }
    };

    const [with1, with2, form1, form2] = await Promise.all([
      getWithdrawals(player1),
      getWithdrawals(player2),
      getRecentForm(player1),
      getRecentForm(player2)
    ]);

    // ── Nur verletzungsrelevante News filtern ─────────────────────────────
    const injuryKw = ["verletz","injury","injured","retire","withdraw","zurückgezogen",
      "aufgabe","krank","illness","schmerz","pain","wrist","knee","back","shoulder",
      "ankle","hamstring","doubtful","fraglich","fitness","physical","medical","scratched"];
    const filterInjury = (h) => (h||[]).filter(s => injuryKw.some(k=>(s||"").toLowerCase().includes(k))).slice(0,3);
    const injNews1 = filterInjury(headlines1);
    const injNews2 = filterInjury(headlines2);

    // ── Verletzungs-Muster in Ergebnissen erkennen ───────────────────────────
    const detectInjuryPattern = (form) => {
      if (!form?.recentMatches?.length) return null;
      const matches = form.recentMatches;
      // Viele Niederlagen in kurzer Zeit (letzte 2 Turniere) = mögliche Verletzung
      const lastThree = matches.slice(0, 3);
      const lastThreeLosses = lastThree.filter(m => !m.won).length;
      // Mehrere Turniere kurz hintereinander = Erschöpfung
      const tournaments = [...new Set(matches.map(m => m.tournament))];
      return {
        recentLossRun: lastThreeLosses >= 2,
        manyTournaments: tournaments.length >= 3,
        tournaments
      };
    };

    const pattern1 = detectInjuryPattern(form1);
    const pattern2 = detectInjuryPattern(form2);

    const fmt = (name, form, pattern, withdrawals) => {
      if (!form) return `${name}: Keine aktuellen Ergebnisse.`;
      const streak = form.streak >= 2 ? (form.streakWon ? `🔥 ${form.streak}W-Streak` : `❄️ ${form.streak}L-Streak`) : "";
      const matches = form.recentMatches.map(m =>
        `${m.won?"W":"L"} vs ${m.opponent||"?"} (${m.tournament||"?"}${m.date?", "+m.date:""})`
      ).join("; ");
      const warnings = [];
      if (pattern?.recentLossRun) warnings.push("⚠️ 2+ Niederlagen zuletzt");
      if (pattern?.manyTournaments) warnings.push(`⚠️ ${pattern.tournaments.length} Turniere in kurzer Zeit`);
      if (withdrawals?.length > 0) {
        withdrawals.forEach(w => warnings.push(`🚨 RÜCKZUG/W/O: ${w.tournament} (${w.date}) - Status: ${w.status}`));
      }
      return `${name}: ${form.wins}W/${form.losses}L ${streak}\nErgebnisse: ${matches}${warnings.length ? "\n⚠️ HINWEISE: "+warnings.join(", ") : ""}`;
    };

    const prompt = `Du bist Tennis-Analyst. Bewerte die aktuelle Form und Verletzungsrisiken für ein bevorstehendes Match.

WICHTIG: Rückzüge/W/O aus Fixture-Daten sind verlässlicher als News. Wenn ein Spieler einen Rückzug hatte, werte das als starkes Verletzungssignal.

AKTUELLE FORM + RÜCKZÜGE:
${fmt(player1, form1, pattern1, with1)}

${fmt(player2, form2, pattern2, with2)}

VERLETZUNGS-NEWS:
${player1}: ${(headlines1||[]).slice(0,5).join(" | ") || "keine"}
${player2}: ${(headlines2||[]).slice(0,5).join(" | ") || "keine"}

Modell-Vorhersage: ${player1} ${Math.round(baseProb1)}% vs ${player2} ${Math.round(100-baseProb1)}%

Bewertungsregeln:
- Verletzung/Rückzug in News → injury_risk, modifier -4 bis -7
- 3+ Niederlagen in Folge → poor_form, modifier -2 bis -4
- 3+ Siege in Folge gegen gute Gegner → good_form, modifier +2 bis +4
- Neutral/gemischt → modifier 0
- Erschöpfung (viele Turniere) ohne Verletzung → fatigue, modifier -1 bis -2
- Sei konservativ: max ±5 wenn keine klaren Signale

Antworte NUR mit validem JSON:
{
  "player1": {
    "signal": "good_form | poor_form | injury_risk | neutral | motivated | fatigue | withdrawal_risk",
    "modifier": <-8 bis +8>,
    "reason": "<konkreter Satz auf Deutsch, direkt auf Ergebnisse/News bezogen>",
    "form_summary": "<z.B. '2W/3L' oder '4W-Streak'>",
    "injury_flag": <true wenn Verletzungshinweise vorhanden, sonst false>
  },
  "player2": {
    "signal": "good_form | poor_form | injury_risk | neutral | motivated | fatigue | withdrawal_risk",
    "modifier": <-8 bis +8>,
    "reason": "<konkreter Satz auf Deutsch, direkt auf Ergebnisse/News bezogen>",
    "form_summary": "<z.B. '2W/3L' oder '3L-Streak'>",
    "injury_flag": <true wenn Verletzungshinweise vorhanden, sonst false>
  },
  "overall_impact": "low | medium | high",
  "summary": "<ein konkreter Satz auf Deutsch>"
}`;

    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      { model: "claude-haiku-4-5-20251001", max_tokens: 900,
        messages: [{ role: "user", content: prompt }] },
      { headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01" }, timeout: 20000 }
    );

    const text = response.data.content?.map(c=>c.text||"").join("").trim();
    const parsed = JSON.parse(text.replace(/```json|```/g,"").trim());
    parsed.player1.formData = form1;
    parsed.player2.formData = form2;
    parsed.player1.injuryNews = injNews1;
    parsed.player2.injuryNews = injNews2;
    parsed.player1.withdrawals = with1;
    parsed.player2.withdrawals = with2;
    res.json(parsed);
  } catch(err) {
    console.error("FORM ANALYSIS ERROR:", err.response?.data || err.message);
    res.status(500).json({ error: "Analysis failed" });
  }
});


// ─── SURFACE RANKINGS ─────────────────────────────────────────────────────────
app.get("/api/surface-rankings", async (req, res) => {
  try {
    const standingsRes = await apiGet({ method: "get_standings", event_type: "ATP" });
    const standings = standingsRes.data?.result || [];
    const top100 = standings.slice(0, 100);

    const dateEnd = getBerlinDate();
    const dateStart3Y = getBerlinDate(-1095); // 3 years back

    // Surface detection helper
    const getSurf = (m) => {
      const tn = (m.tournament_name||"").toLowerCase();
      if (tn.includes("clay")||tn.includes("roland")||tn.includes("french")||tn.includes("madrid")||
          tn.includes("rome")||tn.includes("monte")||tn.includes("hamburg")||tn.includes("barcelona")||
          tn.includes("geneva")||tn.includes("buenos")||tn.includes("munich")||tn.includes("perugia")||
          tn.includes("prostejov")||tn.includes("heilbronn")) return "clay";
      if (tn.includes("grass")||tn.includes("wimbledon")||tn.includes("halle")||tn.includes("queens")||
          tn.includes("eastbourne")||tn.includes("stuttgart")||tn.includes("birmingham")||
          tn.includes("mallorca")||tn.includes("nottingham")) return "grass";
      return "hard";
    };

    const results = [];

    // Process in batches of 8
    for (let i = 0; i < top100.length; i += 8) {
      const batch = top100.slice(i, i + 8);
      const batchResults = await Promise.allSettled(
        batch.map(async p => {
          if (!p.player_key) return null;
          try {
            const r = await apiGet({
              method: "get_fixtures",
              date_start: dateStart3Y,
              date_stop: dateEnd,
              event_type_key: 265,
              player_key: String(p.player_key)
            });
            const matches = (r.data?.result||[]).filter(m =>
              (m.event_status==="Finished"||m.event_winner) &&
              m.event_winner !== null && m.event_winner !== ""
            );
            if (matches.length === 0) return null;

            const lastName = (p.player||"").toLowerCase().split(" ").pop();
            let hw=0,hl=0,cw=0,cl=0,gw=0,gl=0;
            matches.forEach(m => {
              const isFirst = (m.event_first_player||"").toLowerCase().includes(lastName);
              const won = (isFirst && m.event_winner==="First Player") ||
                          (!isFirst && m.event_winner==="Second Player");
              const surf = getSurf(m);
              if (surf==="hard")  { won?hw++:hl++; }
              if (surf==="clay")  { won?cw++:cl++; }
              if (surf==="grass") { won?gw++:gl++; }
            });

            return {
              name: p.player,
              rank: parseInt(p.place)||999,
              hardWins: hw,  hardMatches:  hw+hl,
              clayWins: cw,  clayMatches:  cw+cl,
              grassWins: gw, grassMatches: gw+gl,
              hard:  hw+hl>=5  ? Math.round(hw/(hw+hl)*100) : null,
              clay:  cw+cl>=5  ? Math.round(cw/(cw+cl)*100) : null,
              grass: gw+gl>=3  ? Math.round(gw/(gw+gl)*100) : null,
            };
          } catch(e) { return null; }
        })
      );
      batchResults.forEach(r => { if (r.status==="fulfilled"&&r.value) results.push(r.value); });
      if (i + 8 < top100.length) await new Promise(r => setTimeout(r, 300));
    }

    // Weighted score: wins × (win%)^1.5 × recency bonus (already baked in via 3Y window)
    const score = (wins, matches) => {
      if (matches < 1) return 0;
      const pct = wins/matches;
      return wins * Math.pow(pct, 1.5);
    };

    const hardRanking  = results.filter(p=>p.hardMatches >=5).map(p=>({...p,score:score(p.hardWins,p.hardMatches)})).sort((a,b)=>b.score-a.score).slice(0,20);
    const clayRanking  = results.filter(p=>p.clayMatches >=5).map(p=>({...p,score:score(p.clayWins,p.clayMatches)})).sort((a,b)=>b.score-a.score).slice(0,20);
    const grassRanking = results.filter(p=>p.grassMatches>=3).map(p=>({...p,score:score(p.grassWins,p.grassMatches)})).sort((a,b)=>b.score-a.score).slice(0,20);

    res.json({ hard: hardRanking, clay: clayRanking, grass: grassRanking, dataWindow: "3 Jahre (2023–2026)" });
  } catch(err) {
    console.error("SURFACE RANKINGS ERROR:", err.message);
    res.status(500).json({ error: "Error" });
  }
});

// ─── TURNIER-KALENDER ─────────────────────────────────────────────────────────
app.get("/api/calendar", async (req, res) => {
  try {
    const today = getBerlinDate();
    const in4weeks = getBerlinDate(28);
    const past2weeks = getBerlinDate(-14);

    const [singlesRes, chalRes] = await Promise.allSettled([
      apiGet({ method:"get_fixtures", date_start:past2weeks, date_stop:in4weeks, event_type_key:265 }),
      apiGet({ method:"get_fixtures", date_start:past2weeks, date_stop:in4weeks, event_type_key:281 })
    ]);

    const singles = singlesRes.status==="fulfilled" ? singlesRes.value.data?.result||[] : [];
    const challengers = chalRes.status==="fulfilled" ? chalRes.value.data?.result||[] : [];
    const all = [
      ...singles.map(m=>({...m,_type:"ATP Singles"})),
      ...challengers.map(m=>({...m,_type:"Challenger Singles"}))
    ];

    // ── Surface detection — comprehensive city/tournament name list ────────────
    const detectSurface = (name) => {
      const n = (name||"").toLowerCase();
      // Clay tournaments
      const clayKeywords = [
        "roland","french open","clay","monte carlo","monte-carlo","madrid","rome","roma",
        "hamburg","geneva","genf","barcelona","buenos aires","munich","münchen","lyon",
        "estoril","marrakech","houston","bucharest","istanbul","bastad","båstad",
        "gstaad","kitzbühel","kitzbuehel","umag","winston","perugia","prostejov",
        "heilbronn","salinas","marbella","cordoba","santiago","lima","bogota"
      ];
      // Grass tournaments
      const grassKeywords = [
        "wimbledon","halle","queen","queens","eastbourne","stuttgart","grass",
        "mallorca","nottingham","rosmalen","s-hertogenbosch","hertogenbosch",
        "birmingham","ilkley","surbiton","boodles","hurlingham","cambridge"
      ];
      for (const k of clayKeywords) { if (n.includes(k)) return "clay"; }
      for (const k of grassKeywords) { if (n.includes(k)) return "grass"; }
      return "hard";
    };

    // ── Filter out qualifying rounds from progress calculation ─────────────────
    const isMainDraw = (m) => {
      const round = (m.tournament_round||m.event_round||"").toLowerCase();
      // Filter out anything that looks like qualifying
      if (round.includes("qual")) return false;
      if (round.includes("pre-")) return false;
      if (round.includes("qualifying")) return false;
      if (round.includes("q1") || round.includes("q2") || round.includes("q3")) return false;
      // Keep only recognised main draw rounds
      const mainDrawTerms = ["final","semi","quarter","1/2","1/4","1/8","1/16","1/32","1/64","round of","r16","r32","r64","r128","first round","second round","third round"];
      return mainDrawTerms.some(t => round.includes(t));
    };

    const tournMap = {};
    all.forEach(m => {
      const key = `${m.tournament_name}|||${m._type}`;
      if (!tournMap[key]) {
        tournMap[key] = {
          name: m.tournament_name,
          type: m._type,
          dates: [],
          mainDrawDates: [],
          mainDrawStatuses: [],
        };
      }
      if (m.event_date) tournMap[key].dates.push(m.event_date);
      if (isMainDraw(m)) {
        if (m.event_date) tournMap[key].mainDrawDates.push(m.event_date);
        if (m.event_status) tournMap[key].mainDrawStatuses.push(m.event_status);
      }
    });

    const calendar = Object.values(tournMap).map(t => {
      const sortedDates = t.dates.sort();
      const startDate = sortedDates[0];
      const endDate = sortedDates[sortedDates.length-1];
      const isFinished = endDate < today;
      const isActive = startDate <= today && endDate >= today;
      const isUpcoming = startDate > today;
      const surface = detectSurface(t.name);

      const mainDrawStatuses = t.mainDrawStatuses;
      const finishedCount = mainDrawStatuses.filter(s=>s==="Finished").length;
      const totalMatches = mainDrawStatuses.length;
      const mainDrawStart = t.mainDrawDates.sort()[0] || startDate;

      return {
        name: t.name,
        type: t.type,
        surface,
        startDate: mainDrawStart,
        endDate,
        isFinished,
        isActive,
        isUpcoming,
        finishedCount,
        totalMatches,
        progress: totalMatches > 0 ? Math.round((finishedCount/totalMatches)*100) : 0
      };
    })
    .filter(t => !t.isFinished)
    // Hide pure qualification tournaments
    .filter(t => !t.name.toLowerCase().includes("qualification"))
    .filter(t => !t.name.toLowerCase().includes("qualifying"))
    // Hide tournaments with no main draw matches detected
    .filter(t => t.totalMatches > 0 || t.isUpcoming)
    .sort((a,b) => a.startDate.localeCompare(b.startDate));

    res.json(calendar);
  } catch(err) {
    console.error("CALENDAR ERROR:", err.message);
    res.status(500).json({ error: "Error" });
  }
});

// ─── STREAKS (Tagesform für heutige Spieler) ──────────────────────────────────
app.get("/api/streaks", async (req, res) => {
  try {
    const today = getBerlinDate();
    const [fixturesRes, standingsRes] = await Promise.all([
      apiGet({ method:"get_fixtures", date_start:today, date_stop:today, event_type_key:265 }),
      apiGet({ method:"get_standings", event_type:"ATP" })
    ]);
    const fixtures = fixturesRes.data?.result || [];
    const standings = standingsRes.data?.result || [];
    const playerNames = new Set();
    fixtures.forEach(m => {
      if (m.event_first_player) playerNames.add(m.event_first_player);
      if (m.event_second_player) playerNames.add(m.event_second_player);
    });
    const streakMap = {};
    await Promise.allSettled([...playerNames].slice(0,20).map(async shortName => {
      try {
        const formData = await getPlayerForm(shortName, standings);
        if (!formData?.recentResults?.length) return;
        const results = formData.recentResults;
        let streak = 0;
        const dir = results[0].won ? 1 : -1;
        for (const r of results) {
          if ((r.won?1:-1) === dir) streak++;
          else break;
        }
        streakMap[shortName] = { count: streak, won: dir === 1 };
      } catch(e) {}
    }));
    res.json(streakMap);
  } catch(err) { console.error("STREAKS ERROR:", err.message); res.json({}); }
});

// ─── DEBUG: Form Analysis Data ───────────────────────────────────────────────
app.get("/api/debug-form", async (req, res) => {
  try {
    const { p1, p2 } = req.query;
    if (!p1 || !p2) return res.status(400).json({ error: "Need p1 and p2 params" });

    const [atpRes, chalRes] = await Promise.allSettled([
      apiGet({ method:"get_standings", event_type:"ATP" }),
      apiGet({ method:"get_standings", event_type:"Challenger" })
    ]);
    const standings = [
      ...(atpRes.status==="fulfilled" ? atpRes.value.data?.result||[] : []),
      ...(chalRes.status==="fulfilled" ? chalRes.value.data?.result||[] : [])
    ];

    const [form1, form2, debugWith1, debugWith2] = await Promise.all([
      getPlayerForm(p1, standings),
      getPlayerForm(p2, standings),
      getWithdrawals(p1),
      getWithdrawals(p2)
    ]);

    res.json({
      player1: {
        name: p1,
        recentResults: form1?.recentResults?.slice(0,8) || [],
        wins: form1?.recentResults?.filter(r=>r.won).length || 0,
        losses: form1?.recentResults?.filter(r=>!r.won).length || 0,
        withdrawals: debugWith1
      },
      player2: {
        name: p2,
        recentResults: form2?.recentResults?.slice(0,8) || [],
        wins: form2?.recentResults?.filter(r=>r.won).length || 0,
        losses: form2?.recentResults?.filter(r=>!r.won).length || 0,
        withdrawals: debugWith2
      }
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DEBUG: Player tournament matches ────────────────────────────────────────
app.get("/api/debug-player-tournament", async (req, res) => {
  try {
    const playerName = (req.query.name||"fils").toLowerCase();
    const dateStart = getBerlinDate(-16);
    const dateEnd = getBerlinDate(14);
    const singlesRes = await apiGet({ method:"get_fixtures", date_start:dateStart, date_stop:dateEnd, event_type_key:265 });
    const all = singlesRes.data?.result || [];
    const matches = all.filter(m =>
      (m.event_first_player||"").toLowerCase().includes(playerName) ||
      (m.event_second_player||"").toLowerCase().includes(playerName)
    );
    res.json(matches.map(m => ({
      round: m.tournament_round,
      p1: m.event_first_player,
      p2: m.event_second_player,
      status: m.event_status,
      winner: m.event_winner,
      live: m.event_live,
      date: m.event_date,
      result: m.event_final_result
    })));
  } catch(err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
