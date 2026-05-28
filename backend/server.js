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
  now.setDate(now.getDate() + offsetDays);
  return now.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
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

function getPlayerHand(name) {
  if (!name) return null;
  const parts = name.toLowerCase().trim().split(" ");
  const lastName = parts[parts.length - 1];
  const firstName = parts.length > 1 ? parts[0] : "";
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

    const res = await apiGet({
      method: "get_fixtures",
      date_start: dateStart,
      date_stop: dateEnd,
      event_type_key: 265,
      player_key: playerKey
    });

    const matches = (res.data?.result || []).filter(m =>
      m.event_status === "Finished" || m.event_winner
    );
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
  const { p1, p2, rank1 = 10, rank2 = 20, surface = "hard" } = req.query;
  const bo = parseInt(req.query.bo) === 5 ? 5 : 3;

  const hashStr = (str) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  };
  const stableRand = (seed) => ((hashStr(seed) % 1000) / 500) - 1;

  const eloFromRank = (rank) => Math.max(1500, 2400 - Number(rank) * 6);
  const elo1 = eloFromRank(rank1), elo2 = eloFromRank(rank2);
  const expected1 = 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
  const expected2 = 1 - expected1;

  let form1Data = null, form2Data = null, standings = [];
  try {
    const [atpRes, chalRes] = await Promise.allSettled([
      apiGet({ method: "get_standings", event_type: "ATP" }),
      apiGet({ method: "get_standings", event_type: "Challenger" })
    ]);
    const atpStandings = atpRes.status === "fulfilled" ? atpRes.value.data?.result || [] : [];
    const chalStandings = chalRes.status === "fulfilled" ? chalRes.value.data?.result || [] : [];
    standings = [...atpStandings, ...chalStandings];
    [form1Data, form2Data] = await Promise.all([
      getPlayerForm(p1, standings),
      getPlayerForm(p2, standings)
    ]);
  } catch(e) { console.error("Form fetch error:", e.message); }

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
    const getFullName = (shortName) => {
      const lastName = shortName.trim().split(" ").pop().toLowerCase();
      const found = standings.find(p => (p.player||"").toLowerCase().split(" ").pop() === lastName);
      return found ? found.player : shortName;
    };
    const getRank = (name) => {
      const lastName = name.trim().split(" ").pop().toLowerCase();
      const found = standings.find(p => (p.player||"").toLowerCase().split(" ").pop() === lastName);
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
      return {
        player1:m.event_first_player, player2:m.event_second_player,
        score:src.event_final_result||"-", gameScore:src.event_game_result||"-",
        sets:setScores, status:isLive?(src.event_status||"Live"):isFinished?"Finished":isCancelled?"Cancelled":m.event_status||"Scheduled",
        tournament:m.tournament_name||"", category:m._category||"",
        time:m.event_time||"", live:isLive, finished:isFinished, cancelled:isCancelled, matchKey:m.event_key
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

      const maxFinishedRound = finishedMatches.reduce((max,m)=>Math.max(max,m.roundOrder),0);
      const winnersOfHighestRound = new Set(finishedMatches.filter(m=>m.roundOrder===maxFinishedRound).map(m=>m.winner.toLowerCase()));
      const allLosers = new Set(finishedMatches.map(m=>m.loser.toLowerCase()));

      let activePlayers;
      if (maxFinishedRound===0) {
        activePlayers=allPlayers;
      } else if (maxFinishedRound===7) {
        activePlayers=allPlayers.filter(p=>winnersOfHighestRound.has(p.name.toLowerCase()));
      } else {
        activePlayers=allPlayers.filter(p=>{
          const nameLow=p.name.toLowerCase();
          const lastLow=nameLow.split(" ").pop();
          return !allLosers.has(nameLow)&&!allLosers.has(lastLow);
        });
      }
      if (activePlayers.length===0) activePlayers=allPlayers.slice(0,8);

      const top8=activePlayers.slice(0,8);
      const rawScores=top8.map(p=>({...p,score:Math.exp(-p.rank*0.08)}));
      const totalScore=rawScores.reduce((s,p)=>s+p.score,0)||1;
      const winProbs=rawScores.map(p=>({...p,winProb:Math.max(1,Math.round((p.score/totalScore)*100))})).sort((a,b)=>b.winProb-a.winProb);
      const probSum=winProbs.reduce((s,p)=>s+p.winProb,0);
      if (winProbs.length>0&&probSum!==100) winProbs[0].winProb+=(100-probSum);

      const roundsMap = {};
      dedupedMatches.forEach(m=>{
        const key=m._roundName;
        if (!roundsMap[key]) roundsMap[key]={round:key,matches:[]};
        const r1=getRank(m._p1full), r2=getRank(m._p2full);
        const elo1=eloFromRank(r1), elo2=eloFromRank(r2);
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
        favorite:allPlayers[0]?{name:allPlayers[0].name,rank:allPlayers[0].rank,elo:allPlayers[0].elo}:null,
        winProbs:winProbs.slice(0,5), rounds:sortedRounds,
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
