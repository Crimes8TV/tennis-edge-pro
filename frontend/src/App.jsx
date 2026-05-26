import React, { useEffect, useState, useRef } from "react";
import {
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import { Activity, Trophy, Search, Zap, TrendingUp, Calendar, Star } from "lucide-react";
import "./App.css";

function PlayerAutocomplete({ label, playerNum, value, onChange, players }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { setQuery(value || ""); }, [value]);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const filtered = query ? players.filter(p => p.toLowerCase().includes(query.toLowerCase())) : players;
  const handleSelect = (name) => { setQuery(name); onChange(name); setOpen(false); };
  const handleChange = (e) => {
    setQuery(e.target.value); setOpen(true);
    const exact = players.find(p => p.toLowerCase() === e.target.value.toLowerCase());
    if (exact) onChange(exact);
  };
  return (
    <div ref={ref} className="playerSearchWrapper">
      <span className="playerSearchLabel">Player {playerNum}</span>
      <div style={{ position: "relative" }}>
        <Search size={15} style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", color: "#22d3ee", pointerEvents: "none" }} />
        <input type="text" value={query} onChange={handleChange} onFocus={() => setOpen(true)} placeholder={label} className="playerSearchInput" />
      </div>
      {open && filtered.length > 0 && (
        <ul className="playerDropdown">
          {filtered.map(name => <li key={name} className={name === value ? "active" : ""} onMouseDown={() => handleSelect(name)}>{name}</li>)}
        </ul>
      )}
    </div>
  );
}

function MatchCard({ m, onClick, players = [], onWatchlist, isWatched }) {
  const isLive = m.live;
  const isFinished = m.finished;
  const catAtp = m.category?.includes("ATP");
  const sets = Array.isArray(m.sets) && m.sets.length > 0 ? m.sets : [];
  const setCount = sets.length === 0 && m.score && m.score !== "-"
    ? (() => { const parts = m.score.replace(/ /g, "").split("-"); return { p1: parts[0], p2: parts[1] }; })() : null;
  const gameParts = m.gameScore && m.gameScore !== "-" ? m.gameScore.split("-").map(s => s.trim()) : null;

  return (
    <div className="matchCard">
      <div onClick={onClick} style={{cursor:"pointer"}}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <span className={`matchCardBadge ${catAtp ? "atp" : "challenger"}`}>{m.category}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {isLive && <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#f87171", boxShadow: "0 0 6px #f87171", animation: "pulse 1.5s infinite", display: "inline-block" }} />}
            {isLive ? <span style={{ fontSize: "11px", color: "#f87171", fontWeight: 700 }}>LIVE · {m.status}</span>
              : isFinished ? <span style={{ fontSize: "11px", color: "#475569" }}>✅ Finished</span>
              : <span style={{ fontSize: "12px", color: "#94a3b8" }}>🕐 {m.time}</span>}
          </div>
        </div>
        {(isLive || isFinished) ? (
          <div style={{ marginBottom: "8px" }}>
            {sets.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: `1fr ${sets.map(() => "36px").join(" ")}${isLive && gameParts ? " 44px" : ""}`, gap: "4px 10px", alignItems: "center" }}>
                <div />
                {sets.map((_, i) => <div key={i} style={{ textAlign: "center", fontSize: "10px", color: "#475569", fontWeight: 700 }}>S{i+1}</div>)}
                {isLive && gameParts && <div style={{ textAlign: "center", fontSize: "10px", color: "#f87171", fontWeight: 700 }}>Game</div>}
                <div style={{ fontSize: "14px", color: "#e2e8f0", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.player1}</div>
                {sets.map((s, i) => <div key={i} style={{ textAlign: "center", fontSize: "15px", fontWeight: 700, color: parseInt(s.p1) > parseInt(s.p2) ? "#4ade80" : "#94a3b8" }}>{s.p1}</div>)}
                {isLive && gameParts && <div style={{ textAlign: "center", fontSize: "14px", fontWeight: 700, color: "#facc15" }}>{gameParts[0]}</div>}
                <div style={{ fontSize: "14px", color: isFinished ? "#94a3b8" : "#e2e8f0", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.player2}</div>
                {sets.map((s, i) => <div key={i} style={{ textAlign: "center", fontSize: "15px", fontWeight: 700, color: parseInt(s.p2) > parseInt(s.p1) ? "#4ade80" : "#94a3b8" }}>{s.p2}</div>)}
                {isLive && gameParts && <div style={{ textAlign: "center", fontSize: "14px", fontWeight: 700, color: "#facc15" }}>{gameParts[1]}</div>}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 50px", gap: "4px 12px", alignItems: "center" }}>
                <div style={{ fontSize: "10px", color: "#475569" }} />
                <div style={{ textAlign: "center", fontSize: "10px", color: "#475569", fontWeight: 700 }}>Sets</div>
                {isLive && gameParts && <div style={{ textAlign: "center", fontSize: "10px", color: "#f87171", fontWeight: 700 }}>Game</div>}
                <div style={{ fontSize: "14px", color: "#e2e8f0", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.player1}</div>
                <div style={{ textAlign: "center", fontSize: "18px", fontWeight: 800, color: parseInt(setCount?.p1) > parseInt(setCount?.p2) ? "#4ade80" : "#94a3b8" }}>{setCount?.p1 ?? "-"}</div>
                {isLive && gameParts && <div style={{ textAlign: "center", fontSize: "15px", fontWeight: 700, color: "#facc15" }}>{gameParts[0]}</div>}
                <div style={{ fontSize: "14px", color: isFinished ? "#94a3b8" : "#e2e8f0", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.player2}</div>
                <div style={{ textAlign: "center", fontSize: "18px", fontWeight: 800, color: parseInt(setCount?.p2) > parseInt(setCount?.p1) ? "#4ade80" : "#94a3b8" }}>{setCount?.p2 ?? "-"}</div>
                {isLive && gameParts && <div style={{ textAlign: "center", fontSize: "15px", fontWeight: 700, color: "#facc15" }}>{gameParts[1]}</div>}
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginBottom: "8px" }}>
            <div style={{ fontSize: "14px", color: "#e2e8f0", fontWeight: 600, marginBottom: "4px" }}>{m.player1}</div>
            <div style={{ fontSize: "14px", color: "#e2e8f0", fontWeight: 600 }}>{m.player2}</div>
          </div>
        )}
        <div className="matchCardMeta">{m.tournament}</div>
      </div>

      {/* Action buttons for upcoming matches */}
      {!isFinished && (
        <div style={{display:"flex",gap:"6px",marginTop:"8px"}}>
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            style={{flex:1,padding:"6px",borderRadius:"8px",border:"1px solid rgba(34,211,238,0.25)",background:"rgba(34,211,238,0.06)",color:"#22d3ee",fontSize:"11px",fontWeight:600,cursor:"pointer"}}>
            ⚡ Predict
          </button>
          {onWatchlist && (
            <button
              onClick={(e) => { e.stopPropagation(); onWatchlist(m); }}
              style={{flex:1,padding:"6px",borderRadius:"8px",border:`1px solid ${isWatched?"rgba(250,204,21,0.4)":"rgba(255,255,255,0.08)"}`,background:isWatched?"rgba(250,204,21,0.08)":"transparent",color:isWatched?"#facc15":"#475569",fontSize:"11px",fontWeight:600,cursor:"pointer",transition:"all 0.2s"}}>
              {isWatched ? "🔖 Saved" : "☆ Watch"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [players, setPlayers] = useState([]);
  const [player, setPlayer] = useState("");
  const [playerStats, setPlayerStats] = useState(null);
  const [comparePlayer, setComparePlayer] = useState("");
  const [compareStats, setCompareStats] = useState(null);
  const [playerNews, setPlayerNews] = useState({});
  const [compareNews, setCompareNews] = useState({});
  const [h2hP1, setH2hP1] = useState("");
  const [h2hP2, setH2hP2] = useState("");
  const [h2hData, setH2hData] = useState(null);
  const [h2hLoading, setH2hLoading] = useState(false);
  const [matchDetail, setMatchDetail] = useState(null);
  const [tournamentPreds, setTournamentPreds] = useState([]);
  const [tournamentPredsLoading, setTournamentPredsLoading] = useState(false);
  const [expandedTournament, setExpandedTournament] = useState(null);
  const [collapsedRounds, setCollapsedRounds] = useState({});
  const toggleRound = (key) => setCollapsedRounds(prev => ({ ...prev, [key]: !prev[key] }));
  const [matchDetailLoading, setMatchDetailLoading] = useState(false);
  const [selectedMatchKey, setSelectedMatchKey] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [odds1, setOdds1] = useState(1.7);
  const [odds2, setOdds2] = useState(2.2);
  const [odds1Str, setOdds1Str] = useState("1.7");
  const [odds2Str, setOdds2Str] = useState("2.2");
  const [liveMatches, setLiveMatches] = useState([]);
  const [valuePicks, setValuePicks] = useState([]);
  const [valuePicksLoading, setValuePicksLoading] = useState(true);
  const [fixtures, setFixtures] = useState([]);
  const [fixturesLoading, setFixturesLoading] = useState(true);
  const [collapsedTournaments, setCollapsedTournaments] = useState({});
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const toggleTournament = (key) => setCollapsedTournaments(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleCategory = (cat) => setCollapsedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  const [surface, setSurface] = useState("hard");
  const [bestOf, setBestOf] = useState(3);
  const [tournamentSection, setTournamentSection] = useState("active");

  // Watchlist state — persisted in localStorage
  const [watchlist, setWatchlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem("watchlist") || "[]"); } catch { return []; }
  });
  const [watchlistNotes, setWatchlistNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem("watchlistNotes") || "{}"); } catch { return {}; }
  });

  const saveWatchlist = (list) => {
    setWatchlist(list);
    localStorage.setItem("watchlist", JSON.stringify(list));
  };
  const saveNote = (key, text) => {
    const updated = { ...watchlistNotes, [key]: text };
    setWatchlistNotes(updated);
    localStorage.setItem("watchlistNotes", JSON.stringify(updated));
  };
  const toggleWatchlist = (m) => {
    const key = `${m.player1}|${m.player2}|${m.tournament}`;
    const exists = watchlist.find(w => w.key === key);
    if (exists) saveWatchlist(watchlist.filter(w => w.key !== key));
    else saveWatchlist([...watchlist, { key, player1: m.player1, player2: m.player2, tournament: m.tournament, time: m.time, date: new Date().toISOString().split("T")[0] }]);
  };
  const isWatched = (m) => {
    const key = `${m.player1}|${m.player2}|${m.tournament}`;
    return !!watchlist.find(w => w.key === key);
  };

  const safePlayers = Array.isArray(players) ? players : [];
  const getPlayerName = (p) => typeof p.name === "string" ? p.name : p.name?.name || "";
  const playerNames = safePlayers.map(getPlayerName).filter(Boolean);
  const active = safePlayers.find(p => getPlayerName(p) === player) || {};
  const compareActive = safePlayers.find(p => getPlayerName(p) === comparePlayer) || {};
  const findPlayer = (name) => {
    if (!name) return null;
    const lower = name.toLowerCase();
    let found = safePlayers.find(p => getPlayerName(p).toLowerCase() === lower);
    if (found) return found;
    const lastName = lower.split(" ").pop();
    found = safePlayers.find(p => getPlayerName(p).toLowerCase().split(" ").pop() === lastName);
    if (found) return found;
    return safePlayers.find(p => getPlayerName(p).toLowerCase().includes(lastName)) || null;
  };
  const p1Data = findPlayer(p1);
  const p2Data = findPlayer(p2);
  const winner = prediction?.prediction?.[prediction?.player1] > prediction?.prediction?.[prediction?.player2] ? prediction?.player1 : prediction?.player2;

  useEffect(() => {
    fetch("https://tennis-edge-backend.onrender.com/api/players")
      .then(res => { if (!res.ok) throw new Error("API Fehler"); return res.json(); })
      .then(data => {
        const formatted = Array.isArray(data) ? data : [];
        setPlayers(formatted);
        if (formatted.length > 0) setPlayer(getPlayerName(formatted[0]));
        if (formatted.length > 1) { setP1(getPlayerName(formatted[0])); setP2(getPlayerName(formatted[1])); }
      }).catch(err => console.error("FEHLER PLAYERS:", err));
  }, []);

  useEffect(() => {
    if (!player) return;
    fetch(`https://tennis-edge-backend.onrender.com/api/player/${encodeURIComponent(player)}`)
      .then(res => res.json()).then(data => setPlayerStats(data)).catch(err => console.error(err));
  }, [player]);

  useEffect(() => {
    if (!comparePlayer) return;
    fetch(`https://tennis-edge-backend.onrender.com/api/player/${encodeURIComponent(comparePlayer)}`)
      .then(res => res.json()).then(data => setCompareStats(data)).catch(err => console.error(err));
    fetch(`https://tennis-edge-backend.onrender.com/api/news/${encodeURIComponent(comparePlayer)}`)
      .then(res => res.json()).then(data => setCompareNews(data)).catch(err => console.error(err));
  }, [comparePlayer]);

  useEffect(() => {
    if (!player) return;
    fetch(`https://tennis-edge-backend.onrender.com/api/news/${encodeURIComponent(player)}`)
      .then(res => res.json()).then(data => setPlayerNews(data)).catch(err => console.error(err));
  }, [player]);

  const loadTournamentPreds = () => {
    setTournamentPredsLoading(true);
    fetch("https://tennis-edge-backend.onrender.com/api/tournament-predictions")
      .then(r => r.json())
      .then(d => { setTournamentPreds(Array.isArray(d) ? d : []); setTournamentPredsLoading(false); })
      .catch(() => setTournamentPredsLoading(false));
  };

  useEffect(() => {
    if (tab === "tournamentpred") {
      if (tournamentPreds.length === 0) loadTournamentPreds();
      const interval = setInterval(loadTournamentPreds, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [tab]);

  const openMatchDetail = (m) => {
    if (!m.matchKey) return;
    setSelectedMatchKey(m.matchKey); setMatchDetail(null); setMatchDetailLoading(true); setTab("matchdetail");
    fetch(`https://tennis-edge-backend.onrender.com/api/match/${m.matchKey}`)
      .then(res => res.json()).then(data => { setMatchDetail(data); setMatchDetailLoading(false); })
      .catch(err => { console.error(err); setMatchDetailLoading(false); });
  };

  const fetchH2H = () => {
    if (!h2hP1 || !h2hP2) return;
    const p1D = safePlayers.find(p => getPlayerName(p).toLowerCase() === h2hP1.toLowerCase());
    const p2D = safePlayers.find(p => getPlayerName(p).toLowerCase() === h2hP2.toLowerCase());
    if (!p1D?.player_key || !p2D?.player_key) return;
    setH2hLoading(true);
    fetch(`https://tennis-edge-backend.onrender.com/api/h2h?p1_key=${p1D.player_key}&p2_key=${p2D.player_key}`)
      .then(res => res.json()).then(data => { setH2hData(data); setH2hLoading(false); })
      .catch(err => { console.error(err); setH2hLoading(false); });
  };

  useEffect(() => {
    if (tab === "predictor" && p1Data && p2Data && !prediction) {
      setTimeout(() => {
        fetch(`https://tennis-edge-backend.onrender.com/api/predict?p1=${encodeURIComponent(p1)}&p2=${encodeURIComponent(p2)}&rank1=${p1Data.rank || 10}&rank2=${p2Data.rank || 100}&surface=${surface}&surface1=${p1Data?.[surface] || 0}&surface2=${p2Data?.[surface] || 0}&bo=${bestOf}`)
          .then(res => res.json()).then(data => setPrediction(data)).catch(err => console.error(err));
      }, 100);
    }
  }, [tab, p1, p2]);

  const predictMatch = () => {
    if (!p1 || !p2 || !p1Data || !p2Data) return;
    fetch(`https://tennis-edge-backend.onrender.com/api/predict?p1=${encodeURIComponent(p1)}&p2=${encodeURIComponent(p2)}&rank1=${p1Data.rank || 10}&rank2=${p2Data.rank || 100}&surface=${surface}&surface1=${p1Data?.[surface] || 0}&surface2=${p2Data?.[surface] || 0}&bo=${bestOf}`)
      .then(res => res.json()).then(data => setPrediction(data)).catch(err => console.error(err));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      fetch("https://tennis-edge-backend.onrender.com/api/live")
        .then(res => res.json()).then(data => setLiveMatches(Array.isArray(data) ? data : [])).catch(err => console.error(err));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setValuePicksLoading(true);
    fetch("https://tennis-edge-backend.onrender.com/api/valuepicks")
      .then(res => res.json()).then(data => { setValuePicks(Array.isArray(data) ? data : []); setValuePicksLoading(false); })
      .catch(err => { console.error(err); setValuePicksLoading(false); });
  }, []);

  useEffect(() => {
    const loadFixtures = () => {
      fetch("https://tennis-edge-backend.onrender.com/api/fixtures/today")
        .then(res => { if (!res.ok) throw new Error("Fehler"); return res.json(); })
        .then(data => { setFixtures(Array.isArray(data) ? data : []); setFixturesLoading(false); })
        .catch(err => { console.error(err); setFixtures([]); setFixturesLoading(false); });
    };
    setFixturesLoading(true); loadFixtures();
    const interval = setInterval(loadFixtures, 30000);
    return () => clearInterval(interval);
  }, []);

  const formData = (active.form || []).map((v, i) => ({ match: `M-${6 - i}`, form: v }));

  const activeTournaments = tournamentPreds.filter(t => {
    const allFinished = t.rounds?.length > 0 && t.rounds.every(r => r.matches.every(m => m.isFinished));
    const noPlayers = t.hasStarted && t.activePlayerCount === 0 && !t.isLive;
    return !allFinished && !noPlayers;
  });
  const finishedTournaments = tournamentPreds.filter(t => {
    const allFinished = t.rounds?.length > 0 && t.rounds.every(r => r.matches.every(m => m.isFinished));
    const noPlayers = t.hasStarted && t.activePlayerCount === 0 && !t.isLive;
    return allFinished || noPlayers;
  });
  const displayedTournaments = tournamentSection === "active" ? activeTournaments : finishedTournaments;

  const [playersLoading, setPlayersLoading] = useState(true);

  // Show welcome screen only on very first load (< 2 seconds)
  if (playersLoading && playerNames.length === 0) {
    setTimeout(() => setPlayersLoading(false), 2000); // max 2s then show app anyway
    return (
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#020817"}}>
        <div style={{textAlign:"center",maxWidth:"620px",padding:"40px 20px"}}>
          <div style={{marginBottom:"32px"}}>
            <h1 style={{fontSize:"52px",fontWeight:900,background:"linear-gradient(135deg,#22d3ee,#4ade80)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:0,letterSpacing:"-1px",padding:"4px 8px",lineHeight:1.2}}>
              TennisEdge Pro
            </h1>
            <p style={{color:"#475569",fontSize:"13px",marginTop:"8px",letterSpacing:"3px",textTransform:"uppercase"}}>Advanced Tennis Analytics Platform</p>
          </div>

          <p style={{color:"#64748b",fontSize:"15px",marginBottom:"36px",lineHeight:1.7}}>
            Your all-in-one platform for professional tennis analytics —<br/>
            live scores, AI predictions, value picks and much more.
          </p>

          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"12px",marginBottom:"40px",textAlign:"left"}}>
            {[
              {icon:"🎾",title:"Live Scores",desc:"Real-time match tracking with set-by-set breakdowns"},
              {icon:"⚡",title:"Match Predictor",desc:"AI-powered win probabilities with Elo & surface analysis"},
              {icon:"💰",title:"Value Picks",desc:"Daily value bets with edge calculations vs. bookmakers"},
              {icon:"🏆",title:"Tournament Predictions",desc:"Full draw predictions for current ATP tournaments"},
              {icon:"⚔️",title:"Head-to-Head",desc:"Complete H2H history with surface & recent form"},
              {icon:"📊",title:"Player Analytics",desc:"In-depth stats, form curves and radar charts"},
            ].map((f,i) => (
              <div key={i} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"14px",padding:"18px",transition:"border-color 0.2s"}}>
                <div style={{fontSize:"26px",marginBottom:"8px"}}>{f.icon}</div>
                <div style={{fontSize:"13px",fontWeight:700,color:"#e2e8f0",marginBottom:"5px"}}>{f.title}</div>
                <div style={{fontSize:"11px",color:"#475569",lineHeight:1.6}}>{f.desc}</div>
              </div>
            ))}
          </div>

          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"12px"}}>
            <div style={{width:"18px",height:"18px",borderRadius:"50%",border:"2px solid rgba(34,211,238,0.2)",borderTopColor:"#22d3ee",animation:"spin 0.8s linear infinite"}} />
            <span style={{color:"#64748b",fontSize:"14px"}}>Loading player data...</span>
          </div>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>TennisEdge&nbsp;Pro</h1>
        <p>Advanced Tennis Analytics</p>
        <button onClick={() => setTab("dashboard")}><Activity /> Dashboard</button>
        <button onClick={() => setTab("matches")}><Calendar /> Matches</button>
        <button onClick={() => setTab("valuepicks")}><TrendingUp /> Value Picks</button>
        <button onClick={() => setTab("player")}><Search /> Player Analyzer</button>
        <button onClick={() => setTab("predictor")}><Zap /> Match Predictor</button>
        <button onClick={() => setTab("h2h")}><Trophy /> Head-to-Head</button>
        <button onClick={() => setTab("tournamentpred")}><Star /> Tournament Prediction</button>
        <button onClick={() => setTab("watchlist")} style={tab==="watchlist"?{borderColor:"rgba(250,204,21,0.4)",color:"#facc15"}:{}}>
          🔖 My Watchlist {watchlist.length > 0 && <span style={{marginLeft:"6px",background:"rgba(250,204,21,0.2)",color:"#facc15",borderRadius:"999px",padding:"1px 7px",fontSize:"11px",fontWeight:700}}>{watchlist.length}</span>}
        </button>
        {selectedMatchKey && <button onClick={() => setTab("matchdetail")} style={{borderColor:"rgba(248,113,113,0.4)",color:"#f87171"}}>🔴 Match Detail</button>}
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        {[
          {id:"dashboard", icon:<Activity size={18}/>, label:"Home"},
          {id:"matches",   icon:<Calendar size={18}/>, label:"Matches"},
          {id:"valuepicks",icon:<TrendingUp size={18}/>, label:"Value"},
          {id:"predictor", icon:<Zap size={18}/>, label:"Predict"},
          {id:"tournamentpred", icon:<Star size={18}/>, label:"Cups"},
          {id:"h2h",       icon:<Trophy size={18}/>, label:"H2H"},
          {id:"player",    icon:<Search size={18}/>, label:"Players"},
          {id:"watchlist", icon:<span style={{fontSize:"16px"}}>🔖</span>, label:"Saved"},
        ].map(item => (
          <button key={item.id} className={`mobile-nav-item ${tab===item.id?"active":""}`} onClick={() => setTab(item.id)}>
            {item.icon}
            <span>{item.label}</span>
            {item.id==="watchlist" && watchlist.length > 0 && <span className="mobile-nav-badge">{watchlist.length}</span>}
          </button>
        ))}
      </nav>

      <main>
        {/* Mobile Header */}
        <div className="mobile-header">
          <h1>TennisEdge Pro</h1>
          {fixtures.some(m=>m.live) && (
            <span style={{display:"flex",alignItems:"center",gap:"5px",background:"rgba(248,113,113,0.15)",border:"1px solid rgba(248,113,113,0.4)",borderRadius:"20px",padding:"4px 10px",fontSize:"11px",color:"#f87171",fontWeight:700}}>
              <span style={{width:"6px",height:"6px",borderRadius:"50%",background:"#f87171",boxShadow:"0 0 6px #f87171",display:"inline-block"}} />
              {fixtures.filter(m=>m.live).length} Live
            </span>
          )}
        </div>

        {tab === "dashboard" && (
          <>
            <Header title="Live Dashboard" />
            <div className="dashGrid">
              <div>
                <div className="dashSectionHeader">
                  {fixtures.some(m => m.live)
                    ? <><span className="liveDot" />{fixtures.filter(m=>m.live).length} Live · Today {new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"})}</>
                    : <>📅 Today — {new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"})}</>}
                </div>
                {fixturesLoading ? <p style={{color:"#94a3b8",fontSize:"14px",padding:"16px 0"}}>⏳ Loading matches...</p>
                  : fixtures.length === 0 ? <p style={{color:"#94a3b8",fontSize:"14px",padding:"16px 0"}}>No matches today.</p>
                  : <div className="matchCardGrid">
                      {fixtures.slice(0,5).map((m,i) => <MatchCard key={i} m={m} players={safePlayers} onClick={() => m.live ? openMatchDetail(m) : (setP1(m.player1),setP2(m.player2),setTab("predictor"))} onWatchlist={toggleWatchlist} isWatched={isWatched(m)} />)}
                      {fixtures.length > 5 && <p style={{color:"#22d3ee",fontSize:"12px",marginTop:"8px",cursor:"pointer"}} onClick={() => setTab("matches")}>+{fixtures.length-5} more → show all</p>}
                    </div>}
              </div>
              <div>
                <div className="dashSectionHeader" style={{justifyContent:"space-between"}}>
                  <span>💰 Top Value Picks</span>
                  <span style={{fontSize:"12px",color:"#22d3ee",cursor:"pointer"}} onClick={() => setTab("valuepicks")}>Show all →</span>
                </div>
                {valuePicksLoading ? <p style={{color:"#94a3b8",fontSize:"14px",padding:"16px 0"}}>⏳ Calculating value picks...</p>
                  : valuePicks.length === 0 ? <p style={{color:"#94a3b8",fontSize:"14px",padding:"16px 0"}}>No value picks today.</p>
                  : valuePicks.slice(0,3).map((pick,i) => {
                    const hasOdds = !!pick.bestOdds;
                    return (
                    <div key={i} className="valuePickCardMini" onClick={() => {setP1(pick.match.split(" vs ")[0]);setP2(pick.match.split(" vs ")[1]);setTab("predictor");}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                          <span style={{color:"#e2e8f0",fontSize:"14px",fontWeight:600}}>{pick.match}</span>
                          {!hasOdds && <span style={{fontSize:"9px",fontWeight:700,color:"#94a3b8",background:"rgba(148,163,184,0.1)",border:"1px solid rgba(148,163,184,0.2)",borderRadius:"4px",padding:"1px 5px"}}>MODEL ONLY</span>}
                        </div>
                        <span className="valuePickEdge" style={{color:hasOdds?"#4ade80":"#94a3b8"}}>+{pick.edge}%</span>
                      </div>
                      <div style={{display:"flex",gap:"12px",marginTop:"6px",fontSize:"12px"}}>
                        <span style={{color:"#4ade80"}}>✅ {pick.pick}</span>
                        {hasOdds && <span style={{color:"#facc15"}}>Odds: {pick.bestOdds}</span>}
                        {!hasOdds && <span style={{color:"#64748b",fontStyle:"italic"}}>No bookmaker odds available</span>}
                        {pick.time && <span style={{color:"#64748b"}}>🕐 {pick.time}</span>}
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:"8px",marginTop:"6px"}}>
                        <span style={{fontSize:"11px",color:"#64748b",minWidth:"80px"}}>Our Model</span>
                        <div style={{flex:1,height:"4px",background:"#1e293b",borderRadius:"999px",overflow:"hidden"}}>
                          <div style={{width:`${pick.ourProb}%`,height:"100%",background:"linear-gradient(90deg,#22d3ee,#4ade80)"}} />
                        </div>
                        <span style={{fontSize:"11px",color:"#4ade80",minWidth:"30px"}}>{pick.ourProb}%</span>
                      </div>
                      {hasOdds && pick.impliedProb && (
                        <div style={{display:"flex",alignItems:"center",gap:"8px",marginTop:"4px"}}>
                          <span style={{fontSize:"11px",color:"#64748b",minWidth:"80px"}}>Bookmaker</span>
                          <div style={{flex:1,height:"4px",background:"#1e293b",borderRadius:"999px",overflow:"hidden"}}>
                            <div style={{width:`${pick.impliedProb}%`,height:"100%",background:"#f472b6"}} />
                          </div>
                          <span style={{fontSize:"11px",color:"#f472b6",minWidth:"30px"}}>{pick.impliedProb}%</span>
                        </div>
                      )}
                    </div>
                    );
                  })}
              </div>
            </div>
          </>
        )}

        {tab === "matches" && (
          <>
            <Header title="Matches" />
            <p style={{color:"#94a3b8",marginTop:"-16px",marginBottom:"24px"}}>
              📅 Today — {new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"})} · {fixtures.length} Matches
              {fixtures.filter(m=>m.live).length > 0 && <span style={{marginLeft:"10px",color:"#f87171",fontWeight:700}}>🔴 {fixtures.filter(m=>m.live).length} Live</span>}
            </p>
            <div>
              {fixturesLoading ? <p style={{color:"#94a3b8"}}>⏳ Loading matches...</p>
                : fixtures.length === 0 ? <p style={{color:"#94a3b8"}}>No matches found today.</p>
                : (() => {
                    const categoryOrder = ["ATP Singles","ATP Doubles","Challenger Singles","Challenger Doubles"];
                    const grouped = {};
                    fixtures.forEach(m => {
                      const cat = m.category || "Sonstige";
                      const tourn = m.tournament || "Unbekannt";
                      const key = `${cat}|||${tourn}`;
                      if (!grouped[key]) grouped[key] = {cat,tourn,matches:[]};
                      grouped[key].matches.push(m);
                    });
                    const sortedKeys = Object.keys(grouped).sort((a,b) => {
                      const idxA = categoryOrder.indexOf(grouped[a].cat);
                      const idxB = categoryOrder.indexOf(grouped[b].cat);
                      if (idxA !== idxB) return (idxA===-1?99:idxA)-(idxB===-1?99:idxB);
                      return grouped[a].tourn.localeCompare(grouped[b].tourn);
                    });
                    const byCategory = {};
                    sortedKeys.forEach(key => { const {cat} = grouped[key]; if (!byCategory[cat]) byCategory[cat]=[]; byCategory[cat].push(key); });
                    return Object.entries(byCategory).map(([cat,keys]) => {
                      const isATP = cat.includes("ATP");
                      const liveInCat = keys.flatMap(k=>grouped[k].matches).filter(m=>m.live).length;
                      return (
                        <div key={cat} style={{marginBottom:"32px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"16px",paddingBottom:"10px",borderBottom:`2px solid ${isATP?"rgba(34,211,238,0.3)":"rgba(250,204,21,0.3)"}`,cursor:"pointer",userSelect:"none"}} onClick={() => toggleCategory(cat)}>
                            <span style={{fontSize:"16px",color:isATP?"#22d3ee":"#facc15",transition:"transform 0.2s",display:"inline-block",transform:collapsedCategories[cat]?"rotate(-90deg)":"rotate(0deg)"}}>▼</span>
                            <span style={{fontSize:"18px",fontWeight:800,color:isATP?"#22d3ee":"#facc15"}}>{cat}</span>
                            {liveInCat > 0 && <span style={{display:"flex",alignItems:"center",gap:"5px",background:"rgba(248,113,113,0.15)",border:"1px solid rgba(248,113,113,0.4)",borderRadius:"20px",padding:"2px 10px",fontSize:"11px",color:"#f87171",fontWeight:700}}><span style={{width:"6px",height:"6px",borderRadius:"50%",background:"#f87171",boxShadow:"0 0 6px #f87171",display:"inline-block"}} />{liveInCat} Live</span>}
                            <span style={{fontSize:"12px",color:"#475569"}}>{keys.flatMap(k=>grouped[k].matches).length} Matches</span>
                          </div>
                          {!collapsedCategories[cat] && keys.map(key => {
                            const {tourn,matches} = grouped[key];
                            const liveInTourn = matches.filter(m=>m.live).length;
                            const isColl = collapsedTournaments[key];
                            return (
                              <div key={key} style={{marginBottom:"16px",background:"rgba(255,255,255,0.02)",borderRadius:"14px",overflow:"hidden",border:"1px solid rgba(255,255,255,0.05)"}}>
                                <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"12px 16px",cursor:"pointer",userSelect:"none"}} onClick={() => toggleTournament(key)}>
                                  <span style={{fontSize:"13px",color:"#64748b",transition:"transform 0.2s",display:"inline-block",transform:isColl?"rotate(-90deg)":"rotate(0deg)"}}>▼</span>
                                  <span style={{fontSize:"14px",fontWeight:700,color:"#cbd5e1"}}>🏆 {tourn}</span>
                                  {liveInTourn > 0 && <span style={{display:"flex",alignItems:"center",gap:"4px",fontSize:"11px",color:"#f87171",fontWeight:700}}><span style={{width:"6px",height:"6px",borderRadius:"50%",background:"#f87171",boxShadow:"0 0 6px #f87171",display:"inline-block"}} />{liveInTourn} Live</span>}
                                  <span style={{fontSize:"11px",color:"#475569",marginLeft:"auto"}}>{matches.length} Matches</span>
                                </div>
                                {!isColl && <div style={{padding:"0 12px 12px"}}><div className="matchCardGrid" style={{gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))"}}>
                                  {matches.map((m,i) => <MatchCard key={i} m={m} players={safePlayers} onClick={() => m.live ? openMatchDetail(m) : (setP1(m.player1),setP2(m.player2),setTab("predictor"))} onWatchlist={toggleWatchlist} isWatched={isWatched(m)} />)}
                                </div></div>}
                              </div>
                            );
                          })}
                        </div>
                      );
                    });
                  })()}
            </div>
          </>
        )}

        {tab === "valuepicks" && (
          <>
            <Header title="Value Picks" />
            <p style={{color:"#94a3b8",marginTop:"-16px",marginBottom:"24px"}}>Daily Value Bets — {new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"})}</p>
            <div>
              <div className="dashSectionHeader">💰 Value Picks today</div>
              {valuePicksLoading ? <p style={{color:"#94a3b8"}}>⏳ Calculating...</p>
                : valuePicks.length === 0 ? <p style={{color:"#94a3b8"}}>No value picks today.</p>
                : (() => {
                  const realPicks = valuePicks.filter(p => !!p.bestOdds);
                  const modelPicks = valuePicks.filter(p => !p.bestOdds);
                  const renderPick = (pick, i, isModel) => (
                    <div key={i} className="valuePickRow" style={{opacity:isModel?0.75:1,border:isModel?"1px solid rgba(148,163,184,0.15)":undefined}} onClick={() => {setP1(pick.match.split(" vs ")[0]);setP2(pick.match.split(" vs ")[1]);setTab("predictor");}}>
                      <div className="valuePickTop">
                        <span className="valuePickRank">#{i+1}</span>
                        <span className="valuePickMatch">{pick.match}</span>
                        <span className="valuePickEdge" style={{color:isModel?"#94a3b8":"#4ade80"}}>+{pick.edge}% {isModel?"Model Edge":"Edge"}</span>
                      </div>
                      <div className="valuePickBottom">
                        <span className="valuePickPick">✅ Pick: <strong>{pick.pick}</strong></span>
                        {pick.bestOdds && <span className="valuePickOdds">Odds: {pick.bestOdds}</span>}
                        {!pick.bestOdds && <span style={{fontSize:"11px",color:"#64748b",fontStyle:"italic"}}>⚠️ No bookmaker odds — model estimate only</span>}
                        {pick.time && <span className="valuePickTime">🕐 {pick.time}</span>}
                      </div>
                      <div className="valuePickProbBar">
                        <div className="valuePickProbItem"><span className="valuePickProbLabel">Our Model</span><div className="valuePickProbTrack"><div className="valuePickProbFill ourFill" style={{width:`${pick.ourProb}%`}} /></div><span className="valuePickProbValue our">{pick.ourProb}%</span></div>
                        {pick.impliedProb && <div className="valuePickProbItem"><span className="valuePickProbLabel">Bookmaker</span><div className="valuePickProbTrack"><div className="valuePickProbFill bookFill" style={{width:`${pick.impliedProb}%`}} /></div><span className="valuePickProbValue book">{pick.impliedProb}%</span></div>}
                      </div>
                      {pick.tournament && <div className="valuePickTournament">{pick.tournament}</div>}
                    </div>
                  );
                  return (
                    <>
                      {realPicks.length > 0 && (
                        <>
                          <div style={{display:"flex",alignItems:"center",gap:"8px",margin:"0 0 12px",fontSize:"12px",fontWeight:700,color:"#4ade80",textTransform:"uppercase",letterSpacing:"1px"}}>
                            <span style={{width:"8px",height:"8px",borderRadius:"50%",background:"#4ade80",display:"inline-block"}} />
                            Confirmed Value Picks ({realPicks.length})
                          </div>
                          {realPicks.map((pick, i) => renderPick(pick, i, false))}
                        </>
                      )}
                      {modelPicks.length > 0 && (
                        <>
                          <div style={{display:"flex",alignItems:"center",gap:"8px",margin:"20px 0 12px",fontSize:"12px",fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"1px"}}>
                            <span style={{width:"8px",height:"8px",borderRadius:"50%",background:"#94a3b8",display:"inline-block"}} />
                            Model-Only Picks — No Bookmaker Odds ({modelPicks.length})
                          </div>
                          <p style={{fontSize:"12px",color:"#475569",marginBottom:"12px"}}>These picks have no bookmaker odds available. Edge is based on our model only — use with caution.</p>
                          {modelPicks.map((pick, i) => renderPick(pick, i, true))}
                        </>
                      )}
                    </>
                  );
                })()}
            </div>
          </>
        )}

        {tab === "player" && (
          <>
            <Header title="Player Analyzer" />
            <div className="grid two" style={{marginBottom:"20px",alignItems:"flex-start"}}>
              <PlayerAutocomplete label="Search player 1..." playerNum={1} value={player} onChange={setPlayer} players={playerNames} />
              <PlayerAutocomplete label="Compare player 2..." playerNum={2} value={comparePlayer} onChange={setComparePlayer} players={playerNames} />
            </div>
            <div className="grid two">
              {playerStats && (
                <Panel title={`📊 ${player}`}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}><span style={{color:"#94a3b8"}}>Win Rate</span><strong style={{color:"#22d3ee"}}>{playerStats.stats?.winRate}%</strong></div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}><span style={{color:"#94a3b8"}}>Titles</span><strong style={{color:"#22d3ee"}}>{playerStats.stats?.titles}</strong></div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"20px"}}><span style={{color:"#94a3b8"}}>Ranking Points</span><strong style={{color:"#22d3ee"}}>{playerStats.stats?.points}</strong></div>
                  <h4 style={{color:"#22d3ee",marginBottom:"12px"}}>Surface Win-%</h4>
                  {[{label:"🏟️ Hard",value:playerStats.surfaces?.hard},{label:"🧱 Clay",value:playerStats.surfaces?.clay},{label:"🌿 Grass",value:playerStats.surfaces?.grass}].map(s => (
                    <div key={s.label} style={{marginBottom:"12px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:"13px",marginBottom:"4px"}}><span style={{color:"#cbd5e1"}}>{s.label}</span><strong style={{color:s.value>=60?"#4ade80":s.value>=45?"#facc15":"#f87171"}}>{s.value!=="-"?`${s.value}%`:"–"}</strong></div>
                      <div style={{height:"8px",background:"#1e293b",borderRadius:"999px",overflow:"hidden"}}><div style={{width:`${s.value!=="-"?s.value:0}%`,height:"100%",background:s.value>=60?"linear-gradient(90deg,#22d3ee,#4ade80)":s.value>=45?"#facc15":"#f87171",borderRadius:"999px"}} /></div>
                    </div>
                  ))}
                  <h4 style={{color:"#22d3ee",marginTop:"20px",marginBottom:"8px"}}>Form Curve</h4>
                  <ResponsiveContainer width="100%" height={160}><LineChart data={formData}><XAxis dataKey="match" stroke="#475569" tick={{fontSize:11}} /><YAxis domain={[60,100]} stroke="#475569" tick={{fontSize:11}} /><Tooltip /><Line type="monotone" dataKey="form" stroke="#22d3ee" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer>
                  <h4 style={{color:"#22d3ee",marginTop:"20px",marginBottom:"8px"}}>Performance Radar</h4>
                  <ResponsiveContainer width="100%" height={200}><RadarChart data={[{stat:"Serve",value:active.serve||0},{stat:"Return",value:active.return||0},{stat:"Clutch",value:active.clutch||0},{stat:"Momentum",value:active.momentum||0},{stat:"Hard",value:active.hard||0},{stat:"Clay",value:active.clay||0}]}><PolarGrid /><PolarAngleAxis dataKey="stat" tick={{fontSize:11,fill:"#94a3b8"}} /><Radar dataKey="value" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.3} /></RadarChart></ResponsiveContainer>
                </Panel>
              )}
              {compareStats && (
                <Panel title={`📊 ${comparePlayer}`}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}><span style={{color:"#94a3b8"}}>Win Rate</span><strong style={{color:"#22d3ee"}}>{compareStats.stats?.winRate}%</strong></div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}><span style={{color:"#94a3b8"}}>Titles</span><strong style={{color:"#22d3ee"}}>{compareStats.stats?.titles}</strong></div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"20px"}}><span style={{color:"#94a3b8"}}>Ranking Points</span><strong style={{color:"#22d3ee"}}>{compareStats.stats?.points}</strong></div>
                  <h4 style={{color:"#22d3ee",marginBottom:"12px"}}>Surface Win-%</h4>
                  {[{label:"🏟️ Hard",value:compareStats.surfaces?.hard},{label:"🧱 Clay",value:compareStats.surfaces?.clay},{label:"🌿 Grass",value:compareStats.surfaces?.grass}].map(s => (
                    <div key={s.label} style={{marginBottom:"12px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:"13px",marginBottom:"4px"}}><span style={{color:"#cbd5e1"}}>{s.label}</span><strong style={{color:s.value>=60?"#4ade80":s.value>=45?"#facc15":"#f87171"}}>{s.value!=="-"?`${s.value}%`:"–"}</strong></div>
                      <div style={{height:"8px",background:"#1e293b",borderRadius:"999px",overflow:"hidden"}}><div style={{width:`${s.value!=="-"?s.value:0}%`,height:"100%",background:s.value>=60?"linear-gradient(90deg,#22d3ee,#4ade80)":s.value>=45?"#facc15":"#f87171",borderRadius:"999px"}} /></div>
                    </div>
                  ))}
                  <h4 style={{color:"#22d3ee",marginTop:"20px",marginBottom:"8px"}}>Form Curve</h4>
                  <ResponsiveContainer width="100%" height={160}><LineChart data={formData}><XAxis dataKey="match" stroke="#475569" tick={{fontSize:11}} /><YAxis domain={[60,100]} stroke="#475569" tick={{fontSize:11}} /><Tooltip /><Line type="monotone" dataKey="form" stroke="#f472b6" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer>
                  <h4 style={{color:"#22d3ee",marginTop:"20px",marginBottom:"8px"}}>Performance Radar</h4>
                  <ResponsiveContainer width="100%" height={200}><RadarChart data={[{stat:"Serve",value:compareActive.serve||0},{stat:"Return",value:compareActive.return||0},{stat:"Clutch",value:compareActive.clutch||0},{stat:"Momentum",value:compareActive.momentum||0},{stat:"Hard",value:compareActive.hard||0},{stat:"Clay",value:compareActive.clay||0}]}><PolarGrid /><PolarAngleAxis dataKey="stat" tick={{fontSize:11,fill:"#94a3b8"}} /><Radar dataKey="value" stroke="#f472b6" fill="#f472b6" fillOpacity={0.3} /></RadarChart></ResponsiveContainer>
                </Panel>
              )}
            </div>
            {(playerNews.length > 0 || compareNews.length > 0) && (
              <div className="grid two" style={{marginTop:"20px"}}>
                {playerNews.length > 0 && <Panel title={`📰 News: ${player}`}>{playerNews.map((n,i) => <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" style={{display:"block",textDecoration:"none",padding:"10px 0",borderBottom:i<playerNews.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}><div style={{fontSize:"13px",color:"#e2e8f0",fontWeight:600,marginBottom:"4px",lineHeight:1.4}}>{n.title}</div><div style={{display:"flex",gap:"10px",fontSize:"11px",color:"#475569"}}>{n.source&&<span>{n.source}</span>}{n.pubDate&&<span>{n.pubDate}</span>}</div></a>)}</Panel>}
                {compareNews.length > 0 && <Panel title={`📰 News: ${comparePlayer}`}>{compareNews.map((n,i) => <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" style={{display:"block",textDecoration:"none",padding:"10px 0",borderBottom:i<compareNews.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}><div style={{fontSize:"13px",color:"#e2e8f0",fontWeight:600,marginBottom:"4px",lineHeight:1.4}}>{n.title}</div><div style={{display:"flex",gap:"10px",fontSize:"11px",color:"#475569"}}>{n.source&&<span>{n.source}</span>}{n.pubDate&&<span>{n.pubDate}</span>}</div></a>)}</Panel>}
              </div>
            )}
            {playerStats && compareStats && (
              <Panel title="⚔️ Surface Head-to-Head">
                {[{label:"🏟️ Hard Court",v1:playerStats.surfaces?.hard,v2:compareStats.surfaces?.hard},{label:"🧱 Clay Court",v1:playerStats.surfaces?.clay,v2:compareStats.surfaces?.clay},{label:"🌿 Grass Court",v1:playerStats.surfaces?.grass,v2:compareStats.surfaces?.grass}].map(s => {
                  const v1=s.v1!=="-"?s.v1:0; const v2=s.v2!=="-"?s.v2:0; const total=v1+v2||1;
                  return (<div key={s.label} style={{marginBottom:"16px"}}><div style={{display:"flex",justifyContent:"space-between",fontSize:"13px",marginBottom:"6px"}}><strong style={{color:v1>=v2?"#4ade80":"#94a3b8"}}>{player}: {v1}%</strong><span style={{color:"#94a3b8"}}>{s.label}</span><strong style={{color:v2>v1?"#4ade80":"#94a3b8"}}>{comparePlayer}: {v2}%</strong></div><div style={{display:"flex",height:"10px",borderRadius:"999px",overflow:"hidden"}}><div style={{width:`${Math.round(v1/total*100)}%`,background:"linear-gradient(90deg,#22d3ee,#4ade80)"}} /><div style={{flex:1,background:"#f472b6"}} /></div></div>);
                })}
              </Panel>
            )}
          </>
        )}

        {tab === "predictor" && (
          <>
            <Header title="Match Predictor" />
            <div className="grid two" style={{marginBottom:"20px",alignItems:"flex-start"}}>
              <PlayerAutocomplete label="Enter name..." playerNum={1} value={p1} onChange={setP1} players={playerNames} />
              <PlayerAutocomplete label="Enter name..." playerNum={2} value={p2} onChange={setP2} players={playerNames} />
            </div>
            <div className="surfaceSelector">
              {[{value:"hard",icon:"🏟️",label:"Hard"},{value:"clay",icon:"🧱",label:"Clay"},{value:"grass",icon:"🌿",label:"Grass"}].map(s => (
                <button key={s.value} className={`surfaceBtn ${surface===s.value?"active":""}`} onClick={() => {
                  setSurface(s.value);
                  if (prediction && p1Data && p2Data) {
                    setTimeout(() => fetch(`https://tennis-edge-backend.onrender.com/api/predict?p1=${encodeURIComponent(p1)}&p2=${encodeURIComponent(p2)}&rank1=${p1Data.rank||10}&rank2=${p2Data.rank||100}&surface=${s.value}&surface1=${p1Data?.[s.value]||0}&surface2=${p2Data?.[s.value]||0}&bo=${bestOf}`).then(res=>res.json()).then(data=>setPrediction(data)).catch(err=>console.error(err)),50);
                  }
                }}>
                  <span className="surfaceIcon">{s.icon}</span><span className="surfaceLabel">{s.label}</span>
                </button>
              ))}
            </div>

            {/* Best of Toggle */}
            <div style={{display:"flex",gap:"8px",marginBottom:"16px",alignItems:"center"}}>
              <span style={{fontSize:"13px",color:"#64748b",marginRight:"4px"}}>Format:</span>
              {[3,5].map(bo => (
                <button key={bo} onClick={() => {
                  setBestOf(bo);
                  if (prediction && p1Data && p2Data) {
                    setTimeout(() => fetch(`https://tennis-edge-backend.onrender.com/api/predict?p1=${encodeURIComponent(p1)}&p2=${encodeURIComponent(p2)}&rank1=${p1Data.rank||10}&rank2=${p2Data.rank||100}&surface=${surface}&surface1=${p1Data?.[surface]||0}&surface2=${p2Data?.[surface]||0}&bo=${bo}`).then(res=>res.json()).then(data=>setPrediction(data)).catch(err=>console.error(err)),50);
                  }
                }} style={{
                  padding:"6px 18px", borderRadius:"8px", fontWeight:700, fontSize:"13px",
                  cursor:"pointer", border:"none",
                  background: bestOf===bo ? (bo===5?"linear-gradient(135deg,#f59e0b,#f97316)":"linear-gradient(135deg,#22d3ee,#4ade80)") : "rgba(255,255,255,0.05)",
                  color: bestOf===bo ? "#0f172a" : "#94a3b8",
                  transition:"all 0.2s"
                }}>
                  {bo===5 ? "🏆 Best of 5" : "⚡ Best of 3"}
                </button>
              ))}
              {bestOf===5 && <span style={{fontSize:"11px",color:"#f59e0b",marginLeft:"4px"}}>Grand Slam Mode</span>}
            </div>

            <button className="predictBtn" onClick={predictMatch} disabled={!p1Data||!p2Data}>⚡ Calculate Prediction</button>
            <Panel title="Prediction Engine">
              {prediction && (
                <>
                  <p className="bestPick">🔥 Best Pick: {winner} ({Math.max(prediction.prediction?.[prediction.player1]||0,prediction.prediction?.[prediction.player2]||0)}%)</p>
                  {prediction.format && (
                    <div style={{display:"inline-block",marginBottom:"12px",padding:"4px 12px",borderRadius:"6px",background:prediction.bo===5?"rgba(245,158,11,0.15)":"rgba(34,211,238,0.1)",border:prediction.bo===5?"1px solid rgba(245,158,11,0.3)":"1px solid rgba(34,211,238,0.2)",fontSize:"12px",color:prediction.bo===5?"#f59e0b":"#22d3ee",fontWeight:600}}>
                      {prediction.bo===5?"🏆":"⚡"} {prediction.format}
                    </div>
                  )}
                  <div className={`prediction ${winner===prediction.player1?"win":""}`}><span className={winner===prediction.player1?"winnerName":""}>{prediction.player1}</span><strong>{prediction.prediction?.[prediction.player1]}%</strong></div>
                  <div className="bar"><div className={winner===prediction.player1?"barFill winBar":"barFill"} style={{width:(prediction.prediction?.[prediction.player1]||0)+"%"}} /></div>
                  <div className={`prediction muted ${winner===prediction.player2?"win":""}`}><span className={winner===prediction.player2?"winnerName":""}>{prediction.player2}</span><strong>{prediction.prediction?.[prediction.player2]}%</strong></div>
                  <p className="confidence">Confidence: {prediction.confidence}%</p>
                  <p className="edge">{prediction.edge}</p>
                  {prediction.explain && <p className="proExplain">🧠 {prediction.explain}</p>}

                  {/* Recent Form Display */}
                  {prediction.formData && (
                    <div style={{margin:"12px 0",padding:"14px 16px",borderRadius:"12px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)"}}>
                      <div style={{fontSize:"12px",color:"#64748b",textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,marginBottom:"10px"}}>📈 Recent Form (last 3 months)</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                        {[prediction.player1, prediction.player2].map(player => {
                          const fd = prediction.formData?.[player];
                          if (!fd) return (
                            <div key={player} style={{padding:"10px",borderRadius:"8px",background:"rgba(255,255,255,0.02)"}}>
                              <div style={{fontSize:"12px",color:"#94a3b8",fontWeight:600,marginBottom:"6px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{player}</div>
                              <div style={{fontSize:"11px",color:"#475569"}}>No recent data</div>
                            </div>
                          );
                          const formColor = fd.form >= 70 ? "#4ade80" : fd.form >= 55 ? "#facc15" : "#f87171";
                          return (
                            <div key={player} style={{padding:"10px",borderRadius:"8px",background:"rgba(255,255,255,0.02)",border:`1px solid ${formColor}22`}}>
                              <div style={{fontSize:"12px",color:"#94a3b8",fontWeight:600,marginBottom:"6px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{player}</div>
                              <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"6px"}}>
                                <div style={{flex:1,height:"6px",background:"#1e293b",borderRadius:"999px",overflow:"hidden"}}>
                                  <div style={{width:`${fd.form}%`,height:"100%",background:formColor,borderRadius:"999px"}} />
                                </div>
                                <span style={{fontSize:"13px",fontWeight:800,color:formColor}}>{fd.form}</span>
                              </div>
                              <div style={{fontSize:"11px",color:"#64748b",marginBottom:"6px"}}>{fd.wins}W - {fd.losses}L ({fd.total} matches)</div>
                              {fd.recentResults?.length > 0 && (
                                <div style={{display:"flex",gap:"3px"}}>
                                  {fd.recentResults.map((r,i) => (
                                    <span key={i} title={`${r.won?"W":"L"} vs ${r.opponent} (${r.date})`} style={{width:"18px",height:"18px",borderRadius:"3px",background:r.won?"rgba(74,222,128,0.3)":"rgba(248,113,113,0.3)",border:`1px solid ${r.won?"#4ade80":"#f87171"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"9px",fontWeight:700,color:r.won?"#4ade80":"#f87171",cursor:"default"}}>
                                      {r.won?"W":"L"}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {prediction.setWinProb && (
                    <div style={{margin:"16px 0",padding:"16px",borderRadius:"14px",background:"rgba(34,211,238,0.06)",border:"1px solid rgba(34,211,238,0.2)"}}>
                      <h4 style={{color:"#22d3ee",margin:"0 0 12px",fontSize:"14px"}}>🎾 Set Win Probability</h4>
                      {[prediction.player1,prediction.player2].map(p => {
                        const prob=prediction.setWinProb[p]; const isWinner=prob>=50;
                        return (<div key={p} style={{marginBottom:"10px"}}><div style={{display:"flex",justifyContent:"space-between",fontSize:"13px",marginBottom:"4px"}}><span style={{color:"#cbd5e1"}}>{p}</span><strong style={{color:isWinner?"#4ade80":"#f472b6"}}>{prob}%  per set</strong></div><div style={{height:"8px",background:"#1e293b",borderRadius:"999px",overflow:"hidden"}}><div style={{width:`${prob}%`,height:"100%",background:isWinner?"linear-gradient(90deg,#22d3ee,#4ade80)":"#f472b6",borderRadius:"999px"}} /></div></div>);
                      })}
                      <p style={{margin:"8px 0 0",fontSize:"12px",color:"#64748b"}}>Based on Elo, form, surface experience and ranking</p>
                    </div>
                  )}
                  {prediction.handicap && (
                    <div style={{margin:"0 0 16px",padding:"16px",borderRadius:"14px",background:"rgba(250,204,21,0.06)",border:"1px solid rgba(250,204,21,0.25)"}}>
                      <h4 style={{color:"#facc15",margin:"0 0 12px",fontSize:"14px"}}>📊 Handicap Recommendation</h4>
                      <span style={{color:"#e2e8f0",fontWeight:700,fontSize:"15px"}}>{prediction.handicap.pick}</span>
                      <div style={{display:"flex",gap:"20px",margin:"10px 0"}}>
                        <div style={{textAlign:"center"}}><div style={{fontSize:"11px",color:"#64748b",marginBottom:"2px"}}>Exp. Games {prediction.handicap.favorite?.split(" ").slice(-1)[0]}</div><div style={{fontSize:"20px",fontWeight:800,color:"#4ade80"}}>{prediction.handicap.expGames?.[prediction.handicap.favorite]}</div></div>
                        <div style={{textAlign:"center",alignSelf:"center",color:"#475569",fontSize:"18px"}}>:</div>
                        <div style={{textAlign:"center"}}><div style={{fontSize:"11px",color:"#64748b",marginBottom:"2px"}}>Exp. Games {prediction.handicap.underdog?.split(" ").slice(-1)[0]}</div><div style={{fontSize:"20px",fontWeight:800,color:"#94a3b8"}}>{prediction.handicap.expGames?.[prediction.handicap.underdog]}</div></div>
                      </div>
                      <p style={{margin:0,fontSize:"13px",color:"#94a3b8"}}>{prediction.handicap.reason}</p>
                    </div>
                  )}
                  <div className="valueBox">
                    <h4>💰 Value Bet Check</h4>
                    <div style={{display:"flex",gap:"12px",marginBottom:"12px"}}>
                      <div style={{flex:1}}><div style={{fontSize:"11px",color:"#94a3b8",marginBottom:"4px",textTransform:"uppercase"}}>{prediction.player1} Odds</div><input type="text" inputMode="decimal" value={odds1Str} onChange={e=>{setOdds1Str(e.target.value);const v=parseFloat(e.target.value.replace(",","."));if(!isNaN(v)&&v>0)setOdds1(v);}} onBlur={e=>{const v=parseFloat(e.target.value.replace(",","."));if(!isNaN(v)&&v>0){setOdds1(v);setOdds1Str(String(v));}}} style={{width:"100%",boxSizing:"border-box"}} /></div>
                      <div style={{flex:1}}><div style={{fontSize:"11px",color:"#94a3b8",marginBottom:"4px",textTransform:"uppercase"}}>{prediction.player2} Odds</div><input type="text" inputMode="decimal" value={odds2Str} onChange={e=>{setOdds2Str(e.target.value);const v=parseFloat(e.target.value.replace(",","."));if(!isNaN(v)&&v>0)setOdds2(v);}} onBlur={e=>{const v=parseFloat(e.target.value.replace(",","."));if(!isNaN(v)&&v>0){setOdds2(v);setOdds2Str(String(v));}}} style={{width:"100%",boxSizing:"border-box"}} /></div>
                    </div>
                    {(() => {
                      const edge1=parseFloat((prediction.prediction[prediction.player1]-100/odds1).toFixed(1));
                      const edge2=parseFloat((prediction.prediction[prediction.player2]-100/odds2).toFixed(1));
                      const bestPick=edge1>0&&edge2>0?(edge1>=edge2?prediction.player1:prediction.player2):edge1>0?prediction.player1:edge2>0?prediction.player2:null;
                      const bestEdge=bestPick===prediction.player1?edge1:edge2;
                      return (
                        <>
                          <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"16px"}}>
                            {[{name:prediction.player1,edge:edge1,odds:odds1},{name:prediction.player2,edge:edge2,odds:odds2}].map(({name,edge,odds}) => (
                              <div key={name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderRadius:"10px",background:edge>0?"rgba(74,222,128,0.08)":"rgba(248,113,113,0.08)",border:`1px solid ${edge>0?"rgba(74,222,128,0.3)":"rgba(248,113,113,0.3)"}`}}>
                                <span style={{color:"#cbd5e1",fontSize:"13px"}}>{name}</span>
                                <div style={{display:"flex",alignItems:"center",gap:"12px"}}><span style={{fontSize:"11px",color:"#64748b"}}>Prob: {prediction.prediction[name]}% | Impl: {Math.round(100/odds)}%</span><span style={{fontWeight:700,fontSize:"15px",color:edge>0?"#4ade80":"#f87171"}}>{edge>0?"+":""}{edge}%</span></div>
                              </div>
                            ))}
                          </div>
                          <div style={{padding:"14px 16px",borderRadius:"12px",background:bestPick?"rgba(34,211,238,0.08)":"rgba(100,116,139,0.1)",border:`1px solid ${bestPick?"rgba(34,211,238,0.3)":"rgba(100,116,139,0.2)"}`}}>
                            <div style={{fontSize:"12px",color:"#94a3b8",marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.5px"}}>🧠 Summary</div>
                            {!bestPick ? (
                              <>
                                <p style={{margin:"0 0 6px",color:"#e2e8f0",fontSize:"14px"}}><strong style={{color:"#f87171"}}>No value detected.</strong></p>
                                <p style={{margin:0,color:"#94a3b8",fontSize:"13px"}}>The bookmaker odds are fairly priced. A negative edge is not profitable long-term — better to pass.</p>
                              </>
                            ) : (() => {
                              const isP1 = bestPick === prediction.player1;
                              const implProb = Math.round(100 / (isP1 ? odds1 : odds2));
                              const ourProb = prediction.prediction[bestPick];
                              const oppName = isP1 ? prediction.player2 : prediction.player1;
                              const eloVal = prediction.elo?.[bestPick] || 0;
                              const eloOpp = prediction.elo?.[oppName] || 0;
                              const pickStats = prediction.playerStats?.[bestPick];
                              const oppStats = prediction.playerStats?.[oppName];
                              const pickRank = safePlayers.find(p => getPlayerName(p).toLowerCase() === bestPick.toLowerCase())?.rank;
                              const oppRank = safePlayers.find(p => getPlayerName(p).toLowerCase() === oppName.toLowerCase())?.rank;
                              const reasons = [];
                              const oddsGap = ourProb - implProb;

                              // Primary reason: always the odds gap
                              if (oddsGap > 10) reasons.push(`Bookmaker significantly undervalues ${bestPick} (${implProb}% implied vs ${ourProb}% model — gap of ${oddsGap}%)`);
                              else if (oddsGap > 5) reasons.push(`Bookmaker slightly undervalues ${bestPick} (${implProb}% implied vs ${ourProb}% model)`);

                              // Only add stat reasons if bestPick is actually BETTER in those stats
                              if (pickStats && oppStats) {
                                if (pickStats.serve - oppStats.serve >= 3) reasons.push(`Stronger serve (${pickStats.serve} vs ${oppStats.serve})`);
                                if (pickStats.return - oppStats.return >= 3) reasons.push(`Stronger return (${pickStats.return} vs ${oppStats.return})`);
                                if (pickStats.clutch - oppStats.clutch >= 3) reasons.push(`Higher clutch factor (${pickStats.clutch} vs ${oppStats.clutch})`);
                                if (pickStats.momentum - oppStats.momentum >= 3) reasons.push(`Better momentum (${pickStats.momentum} vs ${oppStats.momentum})`);
                              }
                              // Ranking/Elo only if bestPick is actually better
                              if (pickRank && oppRank && pickRank < oppRank) reasons.push(`Better world ranking (#${pickRank} vs #${oppRank})`);
                              if (eloVal && eloOpp && eloVal > eloOpp + 10) reasons.push(`Higher Elo rating (${eloVal} vs ${eloOpp}, Δ${eloVal - eloOpp})`);

                              if (reasons.length === 0) reasons.push(`Model detects ${oddsGap}% edge — bookmaker odds offer positive expected value`);
                              return (
                                <>
                                  <p style={{margin:"0 0 6px",color:"#e2e8f0",fontSize:"14px"}}><strong style={{color:"#22d3ee"}}>{bestPick}</strong> is the value bet — Edge: <strong style={{color:"#4ade80"}}>+{bestEdge}%</strong></p>
                                  <p style={{margin:"0 0 8px",color:"#94a3b8",fontSize:"13px"}}>Bookmaker: <strong style={{color:"#f472b6"}}>{implProb}%</strong> → Our model: <strong style={{color:"#4ade80"}}>{ourProb}%</strong> — Difference: +{bestEdge}%</p>
                                  <p style={{margin:"0 0 6px",color:"#22d3ee",fontSize:"12px",fontWeight:600}}>Why rated higher:</p>
                                  <ul style={{margin:"0 0 8px",paddingLeft:"16px"}}>
                                    {reasons.map((r,i) => <li key={i} style={{color:"#94a3b8",fontSize:"12px",marginBottom:"3px"}}>{r}</li>)}
                                  </ul>
                                  <p style={{margin:0,color:"#64748b",fontSize:"11px"}}>Positive edge = long-term profitable with repeated use. No win guaranteed.</p>
                                </>
                              );
                            })()}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  {prediction.playerStats && (
                    <div className="compareBox">
                      <h4>Player Compare</h4>
                      {[{label:"Serve",k:"serve"},{label:"Return",k:"return"},{label:"Clutch",k:"clutch"},{label:"Momentum",k:"momentum"}].map(({label,k}) => {
                        const v1=prediction.playerStats[prediction.player1]?.[k]||0; const v2=prediction.playerStats[prediction.player2]?.[k]||0; const better1=v1>v2;
                        return (<div key={k} style={{marginBottom:"10px"}}><div style={{display:"flex",justifyContent:"space-between",fontSize:"13px",marginBottom:"4px"}}><span style={{color:better1?"#4ade80":"#94a3b8",fontWeight:better1?700:400}}>{v1}</span><span style={{color:"#94a3b8"}}>{label}</span><span style={{color:!better1?"#4ade80":"#94a3b8",fontWeight:!better1?700:400}}>{v2}</span></div><div style={{display:"flex",height:"6px",borderRadius:"999px",overflow:"hidden",background:"#1e293b"}}><div style={{width:`${Math.round(v1/(v1+v2)*100)}%`,background:"linear-gradient(90deg,#22d3ee,#4ade80)"}} /><div style={{flex:1,background:"#f472b6"}} /></div></div>);
                      })}
                    </div>
                  )}

                  {/* 🎯 Betting Tips */}
                  {(() => {
                    const p1w = prediction.prediction?.[prediction.player1] || 50;
                    const p2w = prediction.prediction?.[prediction.player2] || 50;
                    const fav = p1w >= p2w ? prediction.player1 : prediction.player2;
                    const dog = p1w >= p2w ? prediction.player2 : prediction.player1;
                    const favProb = Math.max(p1w, p2w);
                    const dogProb = Math.min(p1w, p2w);
                    const setP = (prediction.setWinProb?.[fav] || favProb) / 100;
                    const bo = prediction.bo || 3;
                    const setsToWin = bo === 5 ? 3 : 2;

                    // Match Winner
                    const matchWinner = { pick: fav, prob: favProb, confidence: favProb > 70 ? "High" : favProb > 60 ? "Medium" : "Low", color: favProb > 70 ? "#4ade80" : favProb > 60 ? "#facc15" : "#94a3b8" };

                    // Set Betting probabilities
                    const p = setP, q = 1 - p;
                    let setBets = [];
                    if (bo === 5) {
                      const p30 = p*p*p;
                      const p31 = 3*p*p*p*q;
                      const p32 = 6*p*p*p*q*q;
                      setBets = [
                        { score: `${fav.split(" ").pop()} 3-0`, prob: Math.round(p30*100), label: "3-0" },
                        { score: `${fav.split(" ").pop()} 3-1`, prob: Math.round(p31*100), label: "3-1" },
                        { score: `${fav.split(" ").pop()} 3-2`, prob: Math.round(p32*100), label: "3-2" },
                        { score: `${dog.split(" ").pop()} wins`, prob: Math.round((q*q*q + 3*q*q*q*p + 6*q*q*q*p*p)*100), label: "Upset" },
                      ];
                    } else {
                      const p20 = p*p;
                      const p21 = 2*p*p*q;
                      setBets = [
                        { score: `${fav.split(" ").pop()} 2-0`, prob: Math.round(p20*100), label: "2-0" },
                        { score: `${fav.split(" ").pop()} 2-1`, prob: Math.round(p21*100), label: "2-1" },
                        { score: `${dog.split(" ").pop()} wins`, prob: Math.round((q*q + 2*q*q*p)*100), label: "Upset" },
                      ];
                    }

                    // Handicap
                    const hLine = prediction.handicap?.line || 0;
                    const hPick = prediction.handicap?.pick || `${fav} -${hLine} Games`;
                    const hConf = hLine >= 3 ? "High" : hLine >= 1.5 ? "Medium" : "Low";
                    const hColor = hLine >= 3 ? "#4ade80" : hLine >= 1.5 ? "#facc15" : "#94a3b8";

                    // Total Games (Over/Under)
                    const expFavG = prediction.handicap?.expGames?.[fav] || (setsToWin * 6);
                    const expDogG = prediction.handicap?.expGames?.[dog] || (setsToWin * 4.5);
                    const expTotal = Math.round((expFavG + expDogG) * 10) / 10;
                    const ouLine = bo === 5 ? Math.round(expTotal / 0.5) * 0.5 : Math.round(expTotal / 0.5) * 0.5;
                    const ouPick = expTotal > ouLine ? `Over ${ouLine}` : `Under ${ouLine}`;
                    const ouConf = Math.abs(expTotal - ouLine) > 1.5 ? "High" : Math.abs(expTotal - ouLine) > 0.5 ? "Medium" : "Low";
                    const ouColor = ouConf === "High" ? "#4ade80" : ouConf === "Medium" ? "#facc15" : "#94a3b8";

                    const tipStyle = (conf) => ({
                      background: conf === "High" ? "rgba(74,222,128,0.06)" : conf === "Medium" ? "rgba(250,204,21,0.06)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${conf === "High" ? "rgba(74,222,128,0.2)" : conf === "Medium" ? "rgba(250,204,21,0.2)" : "rgba(255,255,255,0.07)"}`,
                      borderRadius: "12px", padding: "14px 16px", marginBottom: "10px"
                    });

                    return (
                      <div style={{marginTop:"20px",padding:"20px",borderRadius:"16px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)"}}>
                        <h4 style={{margin:"0 0 16px",color:"#e2e8f0",fontSize:"15px",fontWeight:800}}>🎯 Betting Tips</h4>

                        {/* 1. Match Winner */}
                        <div style={tipStyle(matchWinner.confidence)}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                            <span style={{fontSize:"11px",color:"#64748b",textTransform:"uppercase",letterSpacing:"1px",fontWeight:700}}>1. Match Winner</span>
                            <span style={{fontSize:"11px",fontWeight:700,color:matchWinner.color,background:`${matchWinner.color}22`,padding:"2px 8px",borderRadius:"6px"}}>{matchWinner.confidence} Confidence</span>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <span style={{fontSize:"16px",fontWeight:800,color:"#e2e8f0"}}>✅ {fav}</span>
                            <span style={{fontSize:"20px",fontWeight:900,color:matchWinner.color}}>{favProb}%</span>
                          </div>
                          <p style={{margin:"6px 0 0",fontSize:"12px",color:"#64748b"}}>Model gives {fav.split(" ").pop()} a {favProb}% win probability vs {dogProb}% for {dog.split(" ").pop()}.</p>
                        </div>

                        {/* 2. Set Betting */}
                        <div style={tipStyle(setBets[0]?.prob > 40 ? "High" : "Medium")}>
                          <div style={{marginBottom:"10px"}}>
                            <span style={{fontSize:"11px",color:"#64748b",textTransform:"uppercase",letterSpacing:"1px",fontWeight:700}}>2. Set Betting (Best of {bo})</span>
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:`repeat(${setBets.length},1fr)`,gap:"8px"}}>
                            {setBets.map((b,i) => (
                              <div key={i} style={{textAlign:"center",padding:"10px 6px",borderRadius:"10px",background:i===0?"rgba(34,211,238,0.08)":"rgba(255,255,255,0.03)",border:i===0?"1px solid rgba(34,211,238,0.3)":"1px solid rgba(255,255,255,0.06)"}}>
                                <div style={{fontSize:"11px",color:i===0?"#22d3ee":"#64748b",fontWeight:700,marginBottom:"4px"}}>{b.label}</div>
                                <div style={{fontSize:"16px",fontWeight:800,color:i===0?"#22d3ee":"#94a3b8"}}>{b.prob}%</div>
                                <div style={{fontSize:"10px",color:"#475569",marginTop:"2px"}}>{b.score}</div>
                              </div>
                            ))}
                          </div>
                          <p style={{margin:"8px 0 0",fontSize:"12px",color:"#64748b"}}>Most likely outcome: <strong style={{color:"#22d3ee"}}>{setBets[0]?.score}</strong> ({setBets[0]?.prob}%)</p>
                        </div>

                        {/* 3. Handicap */}
                        <div style={tipStyle(hConf)}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                            <span style={{fontSize:"11px",color:"#64748b",textTransform:"uppercase",letterSpacing:"1px",fontWeight:700}}>3. Handicap (Games)</span>
                            <span style={{fontSize:"11px",fontWeight:700,color:hColor,background:`${hColor}22`,padding:"2px 8px",borderRadius:"6px"}}>{hConf} Confidence</span>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <span style={{fontSize:"16px",fontWeight:800,color:"#e2e8f0"}}>✅ {hPick}</span>
                            <div style={{textAlign:"right"}}>
                              <div style={{fontSize:"12px",color:"#64748b"}}>Exp. games</div>
                              <div style={{fontSize:"16px",fontWeight:800,color:hColor}}>{expFavG} : {expDogG}</div>
                            </div>
                          </div>
                          <p style={{margin:"6px 0 0",fontSize:"12px",color:"#64748b"}}>{prediction.handicap?.reason || `Expected game difference of ${hLine} games.`}</p>
                        </div>

                        {/* 4. Total Games Over/Under */}
                        <div style={tipStyle(ouConf)}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                            <span style={{fontSize:"11px",color:"#64748b",textTransform:"uppercase",letterSpacing:"1px",fontWeight:700}}>4. Total Games (Over/Under)</span>
                            <span style={{fontSize:"11px",fontWeight:700,color:ouColor,background:`${ouColor}22`,padding:"2px 8px",borderRadius:"6px"}}>{ouConf} Confidence</span>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <span style={{fontSize:"16px",fontWeight:800,color:"#e2e8f0"}}>✅ {ouPick} Games</span>
                            <div style={{textAlign:"right"}}>
                              <div style={{fontSize:"12px",color:"#64748b"}}>Expected total</div>
                              <div style={{fontSize:"16px",fontWeight:800,color:ouColor}}>{expTotal} games</div>
                            </div>
                          </div>
                          <p style={{margin:"6px 0 0",fontSize:"12px",color:"#64748b"}}>Model expects {expFavG} games for {fav.split(" ").pop()} + {expDogG} for {dog.split(" ").pop()} = {expTotal} total.</p>
                        </div>

                        <p style={{margin:"8px 0 0",fontSize:"11px",color:"#334155",textAlign:"center"}}>⚠️ These are model-based estimates only. Always bet responsibly.</p>
                      </div>
                    );
                  })()}
                </>
              )}
            </Panel>
          </>
        )}

        {tab === "matchdetail" && (
          <>
            <div style={{display:"flex",alignItems:"center",gap:"16px",marginBottom:"24px"}}>
              <h2 style={{margin:0,color:"#67e8f9"}}>Match Detail</h2>
              {matchDetail?.live && <span style={{display:"flex",alignItems:"center",gap:"6px",background:"rgba(248,113,113,0.15)",border:"1px solid rgba(248,113,113,0.4)",borderRadius:"20px",padding:"4px 12px",fontSize:"12px",color:"#f87171",fontWeight:700}}><span style={{width:"7px",height:"7px",borderRadius:"50%",background:"#f87171",boxShadow:"0 0 6px #f87171",animation:"pulse 1.5s infinite"}} />LIVE</span>}
            </div>
            {matchDetailLoading ? <p style={{color:"#94a3b8"}}>⏳ Loading match details...</p>
              : !matchDetail ? <p style={{color:"#94a3b8"}}>No data available.</p>
              : (
                <>
                  <Panel title={`${matchDetail.tournament}${matchDetail.round?" · "+matchDetail.round:""}`}>
                    {matchDetail.surface && <p style={{color:"#94a3b8",fontSize:"13px",marginTop:0}}>Surface: {matchDetail.surface==="clay"?"🧱 Clay":matchDetail.surface==="grass"?"🌿 Grass":"🏟️ Hard"}</p>}
                    {(() => {
                      const sets=matchDetail.sets||[]; const showGame=matchDetail.live&&matchDetail.gameScore&&matchDetail.gameScore!=="-";
                      const gp=showGame?matchDetail.gameScore.split("-").map(s=>s.trim()):[];
                      const colW="56px"; const rowStyle={display:"flex",alignItems:"center",padding:"14px 24px"};
                      const nameStyle={flex:1,minWidth:0,fontSize:"16px",fontWeight:700,color:"#e2e8f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"};
                      const numStyle=(color)=>({width:colW,flexShrink:0,textAlign:"center",fontSize:"22px",fontWeight:900,color});
                      return (
                        <div style={{background:"#0f172a",borderRadius:"16px",overflow:"hidden",marginBottom:"20px"}}>
                          <div style={{...rowStyle,background:"#0a0f1e",padding:"8px 24px"}}><div style={{flex:1,minWidth:0}} />{sets.map((s,i)=><div key={i} style={{width:colW,flexShrink:0,textAlign:"center",fontSize:"11px",color:"#64748b",fontWeight:700}}>{s.isTotalSets?"Sets":`S${i+1}`}</div>)}{showGame&&<div style={{width:colW,flexShrink:0,textAlign:"center",fontSize:"11px",color:"#f87171",fontWeight:700}}>GAME</div>}</div>
                          <div style={{...rowStyle,borderBottom:"1px solid rgba(255,255,255,0.05)"}}><div style={nameStyle}>{matchDetail.server===1&&<span style={{color:"#facc15",fontSize:"10px",marginRight:"6px"}}>●</span>}{matchDetail.player1}</div>{sets.map((s,i)=><div key={i} style={numStyle(parseInt(s.p1)>parseInt(s.p2)?"#4ade80":"#475569")}>{s.p1}</div>)}{showGame&&<div style={numStyle("#facc15")}>{gp[0]||"0"}</div>}</div>
                          <div style={rowStyle}><div style={nameStyle}>{matchDetail.server===2&&<span style={{color:"#facc15",fontSize:"10px",marginRight:"6px"}}>●</span>}{matchDetail.player2}</div>{sets.map((s,i)=><div key={i} style={numStyle(parseInt(s.p2)>parseInt(s.p1)?"#4ade80":"#475569")}>{s.p2}</div>)}{showGame&&<div style={numStyle("#facc15")}>{gp[1]||"0"}</div>}</div>
                          <div style={{...rowStyle,background:"#0a0f1e",padding:"8px 24px"}}>{matchDetail.live&&<span style={{width:"7px",height:"7px",borderRadius:"50%",background:"#f87171",boxShadow:"0 0 6px #f87171",display:"inline-block",marginRight:"8px"}} />}<span style={{fontSize:"12px",color:matchDetail.live?"#f87171":"#64748b",fontWeight:600}}>{matchDetail.status}</span></div>
                        </div>
                      );
                    })()}
                    <div style={{display:"flex",gap:"12px"}}>
                      <button className="predictBtn" style={{flex:1,padding:"12px"}} onClick={() => {setP1(matchDetail.player1);setP2(matchDetail.player2);setTab("predictor");}}>⚡ Match Prediction</button>
                      <button className="predictBtn" style={{flex:1,padding:"12px",background:"linear-gradient(135deg,#8b5cf6,#6366f1)"}} onClick={() => {setH2hP1(matchDetail.player1);setH2hP2(matchDetail.player2);setTab("h2h");fetchH2H();}}>⚔️ Load H2H</button>
                    </div>
                  </Panel>
                  {matchDetail.statistics?.length > 0 && (() => {
                    const matchStats=matchDetail.statistics.filter(s=>s.stat_period==="match");
                    const keyStats=["1st serve percentage","1st serve points won","2nd serve points won","Break Points Converted","Return Points Won","Winners","Unforced errors","Total Points Won"];
                    return (
                      <Panel title="📊 Match Statistics" style={{marginTop:"20px"}}>
                        {keyStats.map(statName => {
                          const p1stat=matchStats.find(s=>s.stat_name===statName&&s.player_key===matchDetail.statistics[0]?.player_key);
                          const p2stat=matchStats.find(s=>s.stat_name===statName&&s.player_key!==matchDetail.statistics[0]?.player_key);
                          if (!p1stat&&!p2stat) return null;
                          const v1=p1stat?.stat_value||"0"; const v2=p2stat?.stat_value||"0";
                          const n1=parseFloat(v1.replace("%",""))||0; const n2=parseFloat(v2.replace("%",""))||0; const total=n1+n2||1;
                          return (
                            <div key={statName} style={{marginBottom:"16px"}}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}><strong style={{color:n1>=n2?"#4ade80":"#94a3b8",fontSize:"14px",minWidth:"60px"}}>{v1}</strong><span style={{color:"#64748b",fontSize:"12px",textAlign:"center",flex:1}}>{statName}</span><strong style={{color:n2>n1?"#4ade80":"#94a3b8",fontSize:"14px",minWidth:"60px",textAlign:"right"}}>{v2}</strong></div>
                              <div style={{display:"flex",height:"8px",borderRadius:"999px",overflow:"hidden",background:"#1e293b"}}><div style={{width:`${Math.round(n1/total*100)}%`,background:"linear-gradient(90deg,#22d3ee,#4ade80)",borderRadius:"999px 0 0 999px"}} /><div style={{flex:1,background:"#f472b6",borderRadius:"0 999px 999px 0"}} /></div>
                            </div>
                          );
                        }).filter(Boolean)}
                      </Panel>
                    );
                  })()}
                </>
              )}
          </>
        )}

        {tab === "tournamentpred" && (
          <>
            <Header title="Tournament Prediction" />
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"-16px",marginBottom:"20px"}}>
              <p style={{color:"#94a3b8",margin:0}}>ATP Tournaments · Current + Next 2 Weeks · {new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"})}</p>
              <button onClick={loadTournamentPreds} disabled={tournamentPredsLoading} style={{background:"rgba(34,211,238,0.1)",border:"1px solid rgba(34,211,238,0.3)",color:"#22d3ee",padding:"6px 14px",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:600}}>
                {tournamentPredsLoading?"⏳ Loading...":"🔄 Refresh"}
              </button>
            </div>

            {/* Active / Finished Toggle */}
            <div style={{display:"flex",gap:"8px",marginBottom:"24px"}}>
              <button onClick={() => setTournamentSection("active")} style={{padding:"8px 20px",borderRadius:"10px",fontWeight:700,fontSize:"13px",cursor:"pointer",border:"none",background:tournamentSection==="active"?"linear-gradient(135deg,#22d3ee,#4ade80)":"rgba(255,255,255,0.05)",color:tournamentSection==="active"?"#0f172a":"#94a3b8",transition:"all 0.2s"}}>
                🎾 Active / Live {activeTournaments.length > 0 && <span style={{marginLeft:"6px",background:"rgba(0,0,0,0.2)",borderRadius:"999px",padding:"1px 7px",fontSize:"11px"}}>{activeTournaments.length}</span>}
              </button>
              <button onClick={() => setTournamentSection("finished")} style={{padding:"8px 20px",borderRadius:"10px",fontWeight:700,fontSize:"13px",cursor:"pointer",border:"none",background:tournamentSection==="finished"?"rgba(100,116,139,0.3)":"rgba(255,255,255,0.05)",color:tournamentSection==="finished"?"#e2e8f0":"#94a3b8",transition:"all 0.2s"}}>
                ✅ Finished {finishedTournaments.length > 0 && <span style={{marginLeft:"6px",background:"rgba(100,116,139,0.3)",borderRadius:"999px",padding:"1px 7px",fontSize:"11px"}}>{finishedTournaments.length}</span>}
              </button>
            </div>

            {tournamentPredsLoading ? <p style={{color:"#94a3b8"}}>⏳ Loading tournament data...</p>
              : tournamentPreds.length === 0 ? (
                <div style={{textAlign:"center",padding:"40px 0"}}>
                  <p style={{color:"#94a3b8",marginBottom:"16px"}}>No tournament data available yet.</p>
                  <button className="predictBtn" style={{width:"auto",padding:"12px 32px"}} onClick={loadTournamentPreds}>🔄 Load tournament data</button>
                </div>
              ) : displayedTournaments.length === 0 ? (
                <p style={{color:"#64748b",fontSize:"14px",textAlign:"center",padding:"32px 0"}}>{tournamentSection==="active"?"No active tournaments right now.":"No finished tournaments."}</p>
              ) : displayedTournaments.map((tourn) => {
                const globalIdx=tournamentPreds.indexOf(tourn);
                const isExpanded=expandedTournament===globalIdx;
                const isATP=tourn.type?.includes("ATP");
                return (
                  <div key={globalIdx} style={{marginBottom:"16px",background:"#0f172a",borderRadius:"16px",overflow:"hidden",border:`1px solid ${isATP?"rgba(34,211,238,0.2)":"rgba(250,204,21,0.2)"}`}}>
                    <div style={{padding:"16px 20px",cursor:"pointer",display:"flex",alignItems:"center",gap:"12px"}} onClick={() => setExpandedTournament(isExpanded?null:globalIdx)}>
                      <span style={{fontSize:"13px",color:"#64748b",transition:"transform 0.2s",display:"inline-block",transform:isExpanded?"rotate(0deg)":"rotate(-90deg)"}}>▼</span>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"4px"}}>
                          <span style={{fontSize:"16px",fontWeight:800,color:isATP?"#22d3ee":"#facc15"}}>🏆 {tourn.name}</span>
                          <span className={`matchCardBadge ${isATP?"atp":"challenger"}`}>{tourn.type}</span>
                          {tourn.discipline && <span style={{fontSize:"10px",fontWeight:700,padding:"2px 8px",borderRadius:"4px",background:"rgba(99,102,241,0.15)",color:"#818cf8"}}>{tourn.discipline==="Singles"?"👤 Singles":"👥 Doubles"}</span>}
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:"8px",fontSize:"12px",color:"#475569",flexWrap:"wrap"}}>
                          <span>{tourn.dateStart}</span><span>·</span>
                          {tourn.hasStarted ? (
                            <>
                              <span style={{color:"#4ade80",fontWeight:600}}>
                                🎾 Live{tourn.activePlayerCount>1?` — ${tourn.activePlayerCount} players remaining`:tourn.activePlayerCount===1?" — Finale":""}
                              </span>
                              {tourn.eliminatedCount>0&&<span style={{color:"#f87171"}}>({tourn.eliminatedCount} (eliminated))</span>}
                            </>
                          ) : <span>{tourn.playerCount} players in draw</span>}
                          {tourn.isLive&&<span style={{color:"#f87171",fontWeight:700}}>🔴 Live</span>}
                        </div>
                      </div>
                      {tourn.favorite && <div style={{textAlign:"right"}}><div style={{fontSize:"11px",color:"#64748b",marginBottom:"2px"}}>Favorite</div><div style={{fontSize:"14px",fontWeight:700,color:"#4ade80"}}>{tourn.favorite.name}</div><div style={{fontSize:"11px",color:"#475569"}}>#{tourn.favorite.rank}</div></div>}
                    </div>
                    {isExpanded && (
                      <div style={{borderTop:"1px solid rgba(255,255,255,0.05)",padding:"16px 20px"}}>
                        {tourn.winProbs?.length>0 && (
                          <div style={{marginBottom:"20px"}}>
                            <h4 style={{color:"#22d3ee",marginBottom:"12px",fontSize:"14px"}}>🏅 Tournament Win Probability</h4>
                            {tourn.winProbs.map((p,i) => (
                              <div key={i} style={{marginBottom:"10px",display:"flex",alignItems:"center",gap:"12px"}}>
                                <span style={{width:"36px",fontSize:"11px",color:"#475569",flexShrink:0,textAlign:"right"}}>#{p.rank}</span>
                                <span style={{width:"160px",fontSize:"13px",color:i===0?"#4ade80":"#cbd5e1",flexShrink:0,fontWeight:i===0?700:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{i===0&&"⭐ "}{p.name}</span>
                                <div style={{flex:1,height:"6px",background:"#1e293b",borderRadius:"999px",overflow:"hidden"}}><div style={{width:`${p.winProb}%`,height:"100%",background:i===0?"linear-gradient(90deg,#22d3ee,#4ade80)":i===1?"#6366f1":"#334155",borderRadius:"999px",transition:"width 0.4s ease"}} /></div>
                                <strong style={{width:"40px",textAlign:"right",fontSize:"13px",color:i===0?"#4ade80":"#94a3b8",flexShrink:0}}>{p.winProb}%</strong>
                              </div>
                            ))}
                          </div>
                        )}
                        {tourn.rounds?.length>0 && (
                          <div>
                            <h4 style={{color:"#22d3ee",marginBottom:"12px",fontSize:"14px"}}>📋 Round Predictions</h4>
                            {tourn.rounds.map((r,ri) => {
                              const roundKey=`${globalIdx}-${ri}`; const isRoundCollapsed=collapsedRounds[roundKey];
                              return (
                                <div key={ri} style={{marginBottom:"8px",background:"rgba(255,255,255,0.02)",borderRadius:"12px",overflow:"hidden",border:"1px solid rgba(255,255,255,0.05)"}}>
                                  <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",cursor:"pointer",userSelect:"none"}} onClick={() => toggleRound(roundKey)}>
                                    <span style={{fontSize:"11px",color:"#64748b",transition:"transform 0.2s",display:"inline-block",transform:isRoundCollapsed?"rotate(-90deg)":"rotate(0deg)"}}>▼</span>
                                    <span style={{fontSize:"12px",color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",flex:1}}>{r.round}</span>
                                    <span style={{fontSize:"11px",color:"#475569"}}>{r.matches.length} Matches</span>
                                  </div>
                                  {!isRoundCollapsed && (
                                    <div style={{padding:"0 10px 10px"}}>
                                      {r.matches.map((m,mi) => (
                                        <div key={mi} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",marginBottom:"4px",background:m.isWalkover?"rgba(250,204,21,0.04)":m.isFinished?(m.correct?"rgba(74,222,128,0.05)":m.correct===false?"rgba(248,113,113,0.05)":"rgba(255,255,255,0.03)"):"rgba(255,255,255,0.03)",borderRadius:"8px",cursor:"pointer",border:m.isWalkover?"1px solid rgba(250,204,21,0.2)":m.isFinished?`1px solid ${m.correct?"rgba(74,222,128,0.2)":m.correct===false?"rgba(248,113,113,0.2)":"rgba(255,255,255,0.05)"}`:"1px solid rgba(255,255,255,0.05)"}} onClick={() => {setP1(m.player1);setP2(m.player2);setTab("predictor");}}>
                                          <div style={{flex:1,minWidth:0}}>
                                            {m.isWalkover && (
                                              <div style={{fontSize:"10px",color:"#facc15",fontWeight:700,marginBottom:"4px",letterSpacing:"0.5px"}}>
                                                ⚠️ {m.matchStatus || "W/O"}
                                              </div>
                                            )}
                                            <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
                                              {m.actualWinner===m.player1&&<span style={{fontSize:"10px"}}>🏆</span>}
                                              {m.isWalkover&&m.actualWinner!==m.player1&&<span style={{fontSize:"10px",color:"#64748b"}}>↩️</span>}
                                              <span style={{fontSize:"13px",fontWeight:m.prediction===m.player1||m.actualWinner===m.player1?700:400,color:m.actualWinner===m.player1?"#4ade80":m.prediction===m.player1?"#22d3ee":"#94a3b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.player1}</span>
                                              <span style={{color:"#475569",fontSize:"10px",flexShrink:0}}>#{m.rank1}</span>
                                            </div>
                                            <div style={{display:"flex",gap:"6px",alignItems:"center",marginTop:"3px"}}>
                                              {m.actualWinner===m.player2&&<span style={{fontSize:"10px"}}>🏆</span>}
                                              {m.isWalkover&&m.actualWinner!==m.player2&&<span style={{fontSize:"10px",color:"#64748b"}}>↩️</span>}
                                              <span style={{fontSize:"13px",fontWeight:m.prediction===m.player2||m.actualWinner===m.player2?700:400,color:m.actualWinner===m.player2?"#4ade80":m.prediction===m.player2?"#22d3ee":"#94a3b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.player2}</span>
                                              <span style={{color:"#475569",fontSize:"10px",flexShrink:0}}>#{m.rank2}</span>
                                            </div>
                                          </div>
                                          <div style={{textAlign:"center",flexShrink:0,margin:"0 12px",minWidth:"60px"}}>
                                            {m.isWalkover?<span style={{fontSize:"11px",color:"#facc15",fontWeight:600}}>W/O</span>:m.isFinished&&m.score?<span style={{fontSize:"11px",color:"#64748b"}}>{m.score}</span>:m.time?<span style={{fontSize:"11px",color:"#475569"}}>🕐 {m.time}</span>:null}
                                          </div>
                                          <div style={{textAlign:"right",flexShrink:0}}>
                                            {!m.isWalkover&&<div style={{fontSize:"10px",color:"#64748b",marginBottom:"2px"}}>Pick {m.prob}%</div>}
                                            {!m.isWalkover&&<div style={{fontSize:"12px",fontWeight:700,color:"#22d3ee"}}>{m.prediction?.split(" ").slice(-1)[0]}</div>}
                                            {m.isFinished&&!m.isWalkover&&<div style={{fontSize:"11px",marginTop:"2px"}}>{m.correct===true&&<span style={{color:"#4ade80"}}>✅ Correct</span>}{m.correct===false&&<span style={{color:"#f87171"}}>❌ Wrong</span>}</div>}
                                            {m.isWalkover&&<div style={{fontSize:"11px",color:"#facc15"}}>⚠️ Retirement</div>}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {!tourn.drawSet && <p style={{color:"#475569",fontSize:"13px",textAlign:"center",padding:"16px 0"}}>⏳ Draw not yet complete — predictions will update once all players are set.</p>}
                      </div>
                    )}
                  </div>
                );
              })}
          </>
        )}

        {tab === "h2h" && (
          <>
            <Header title="Head-to-Head Intelligence" />
            <div className="grid two" style={{marginBottom:"20px",alignItems:"flex-start"}}>
              <PlayerAutocomplete label="Player 1..." playerNum={1} value={h2hP1} onChange={setH2hP1} players={playerNames} />
              <PlayerAutocomplete label="Player 2..." playerNum={2} value={h2hP2} onChange={setH2hP2} players={playerNames} />
            </div>
            <button className="predictBtn" onClick={fetchH2H} disabled={!h2hP1||!h2hP2} style={{marginBottom:"24px"}}>⚡ Load Head-to-Head</button>
            {h2hLoading && <p style={{color:"#94a3b8"}}>⏳ Loading H2H data...</p>}
            {h2hData && !h2hLoading && (
              <>
                <Panel title={`⚔️ ${h2hP1} vs ${h2hP2} — Head-to-Head`}>
                  <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:"40px",padding:"20px 0"}}>
                    <div style={{textAlign:"center"}}><div style={{fontSize:"48px",fontWeight:900,color:"#22d3ee"}}>{h2hData.p1_wins}</div><div style={{color:"#94a3b8",fontSize:"13px",marginTop:"4px"}}>{h2hP1}</div></div>
                    <div style={{fontSize:"24px",color:"#475569",fontWeight:700}}>:</div>
                    <div style={{textAlign:"center"}}><div style={{fontSize:"48px",fontWeight:900,color:"#f472b6"}}>{h2hData.p2_wins}</div><div style={{color:"#94a3b8",fontSize:"13px",marginTop:"4px"}}>{h2hP2}</div></div>
                  </div>
                  {h2hData.p1_wins+h2hData.p2_wins>0 && (
                    <div style={{marginTop:"8px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:"12px",color:"#94a3b8",marginBottom:"4px"}}><span>{Math.round(h2hData.p1_wins/(h2hData.p1_wins+h2hData.p2_wins)*100)}%</span><span>H2H Record</span><span>{Math.round(h2hData.p2_wins/(h2hData.p1_wins+h2hData.p2_wins)*100)}%</span></div>
                      <div style={{display:"flex",height:"10px",borderRadius:"999px",overflow:"hidden"}}><div style={{width:`${Math.round(h2hData.p1_wins/(h2hData.p1_wins+h2hData.p2_wins)*100)}%`,background:"linear-gradient(90deg,#22d3ee,#4ade80)"}} /><div style={{flex:1,background:"#f472b6"}} /></div>
                    </div>
                  )}
                  {h2hData.h2h_matches?.length>0&&(()=>{
                    const getSurface=(tn)=>{const t=(tn||"").toLowerCase();if(t.includes("clay")||t.includes("roland")||t.includes("french")||t.includes("monte")||t.includes("madrid")||t.includes("rome")||t.includes("barcelona"))return"clay";if(t.includes("grass")||t.includes("wimbledon")||t.includes("halle")||t.includes("queens"))return"grass";return"hard";};
                    const icons={hard:"🏟️",clay:"🧱",grass:"🌿"};const colors={hard:"#22d3ee",clay:"#ef4444",grass:"#4ade80"};
                    const surfaceStats=["hard","clay","grass"].map(s=>{const matches=h2hData.h2h_matches.filter(m=>getSurface(m.tournament_name)===s);const w1=matches.filter(m=>m.event_winner==="First Player").length;const w2=matches.filter(m=>m.event_winner==="Second Player").length;return{s,w1,w2,total:matches.length};}).filter(x=>x.total>0);
                    return surfaceStats.length>0?(<div style={{marginTop:"20px",display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px"}}>{surfaceStats.map(({s,w1,w2,total})=>(<div key={s} style={{background:`${colors[s]}11`,border:`1px solid ${colors[s]}33`,borderRadius:"14px",padding:"14px",textAlign:"center"}}><div style={{fontSize:"20px",marginBottom:"4px"}}>{icons[s]}</div><div style={{fontSize:"11px",color:colors[s],textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",fontWeight:700}}>{s}</div><div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:"12px"}}><span style={{fontSize:"22px",fontWeight:900,color:"#22d3ee"}}>{w1}</span><span style={{color:"#475569"}}>:</span><span style={{fontSize:"22px",fontWeight:900,color:"#f472b6"}}>{w2}</span></div><div style={{fontSize:"11px",color:"#64748b",marginTop:"4px"}}>{total} Spiele</div></div>))}</div>):null;
                  })()}
                </Panel>
                {h2hData.h2h_matches?.length>0&&(
                  <Panel title="📋 Recent Matches" style={{marginTop:"20px"}}>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:"13px"}}>
                        <thead><tr style={{color:"#94a3b8",borderBottom:"1px solid rgba(34,211,238,0.2)"}}><th style={{padding:"8px",textAlign:"left"}}>Date</th><th style={{padding:"8px",textAlign:"left"}}>Tournament</th><th style={{padding:"8px",textAlign:"left"}}>Surface</th><th style={{padding:"8px",textAlign:"left"}}>Result</th><th style={{padding:"8px",textAlign:"left"}}>Winner</th></tr></thead>
                        <tbody>{h2hData.h2h_matches.map((m,i)=>{const p1Won=m.event_winner==="First Player";const tn=(m.tournament_name||"").toLowerCase();const surf=tn.includes("clay")||tn.includes("roland")||tn.includes("french")||tn.includes("monte")||tn.includes("madrid")||tn.includes("rome")||tn.includes("barcelona")?{label:"Clay",icon:"🧱",color:"#ef4444"}:tn.includes("grass")||tn.includes("wimbledon")||tn.includes("halle")||tn.includes("queens")||tn.includes("eastbourne")?{label:"Grass",icon:"🌿",color:"#4ade80"}:{label:"Hard",icon:"🏟️",color:"#22d3ee"};return(<tr key={i} style={{borderBottom:"1px solid rgba(255,255,255,0.05)"}}><td style={{padding:"8px",color:"#64748b"}}>{m.event_date}</td><td style={{padding:"8px",color:"#cbd5e1"}}>{m.tournament_name}</td><td style={{padding:"8px"}}><span style={{background:`${surf.color}22`,color:surf.color,border:`1px solid ${surf.color}44`,borderRadius:"6px",padding:"2px 8px",fontSize:"11px",fontWeight:700,whiteSpace:"nowrap"}}>{surf.icon} {surf.label}</span></td><td style={{padding:"8px",color:"#94a3b8"}}>{m.event_final_result}</td><td style={{padding:"8px"}}><span style={{color:p1Won?"#22d3ee":"#f472b6",fontWeight:700}}>{p1Won?m.event_first_player:m.event_second_player}</span></td></tr>);})}</tbody>
                      </table>
                    </div>
                  </Panel>
                )}
                {h2hData.h2h_matches?.length===0&&<Panel title="📋 Matches"><p style={{color:"#94a3b8"}}>No direct matches found.</p></Panel>}
                <div className="grid two" style={{marginTop:"20px"}}>
                  <Panel title={`📈 Recent Matches: ${h2hP1}`}>
                    {h2hData.p1_recent?.length>0?h2hData.p1_recent.map((m,i)=>{const won=m.event_winner==="First Player";const tn=(m.tournament_name||"").toLowerCase();const surf=tn.includes("clay")||tn.includes("roland")||tn.includes("french")||tn.includes("monte")||tn.includes("madrid")||tn.includes("rome")||tn.includes("barcelona")?{icon:"🧱"}:tn.includes("grass")||tn.includes("wimbledon")||tn.includes("halle")||tn.includes("queens")?{icon:"🌿"}:{icon:"🏟️"};return(<div key={i} style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.05)",fontSize:"13px"}}><span style={{color:won?"#4ade80":"#f87171",fontWeight:700,minWidth:"24px"}}>{won?"W":"L"}</span><span style={{fontSize:"14px"}}>{surf.icon}</span><span style={{color:"#cbd5e1",flex:1}}>{(()=>{const name=h2hP1.toLowerCase();const p1l=(m.event_first_player||"").toLowerCase();return name.split(" ").pop()===p1l.split(" ").pop()?m.event_second_player:m.event_first_player;})()}</span><span style={{color:"#64748b",fontSize:"11px"}}>{m.event_date}</span></div>);}): <p style={{color:"#94a3b8"}}>No data</p>}
                  </Panel>
                  <Panel title={`📈 Recent Matches: ${h2hP2}`}>
                    {h2hData.p2_recent?.length>0?h2hData.p2_recent.map((m,i)=>{const won=m.event_winner==="Second Player";const tn=(m.tournament_name||"").toLowerCase();const surf=tn.includes("clay")||tn.includes("roland")||tn.includes("french")||tn.includes("monte")||tn.includes("madrid")||tn.includes("rome")||tn.includes("barcelona")?{icon:"🧱"}:tn.includes("grass")||tn.includes("wimbledon")||tn.includes("halle")||tn.includes("queens")?{icon:"🌿"}:{icon:"🏟️"};return(<div key={i} style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.05)",fontSize:"13px"}}><span style={{color:won?"#4ade80":"#f87171",fontWeight:700,minWidth:"24px"}}>{won?"W":"L"}</span><span style={{fontSize:"14px"}}>{surf.icon}</span><span style={{color:"#cbd5e1",flex:1}}>{(()=>{const name=h2hP2.toLowerCase();const p2l=(m.event_second_player||"").toLowerCase();return name.split(" ").pop()===p2l.split(" ").pop()?m.event_first_player:m.event_second_player;})()}</span><span style={{color:"#64748b",fontSize:"11px"}}>{m.event_date}</span></div>);}): <p style={{color:"#94a3b8"}}>No data</p>}
                  </Panel>
                </div>
              </>
            )}
          </>
        )}

        {tab === "watchlist" && (
          <>
            <Header title="My Watchlist" />
            <p style={{color:"#94a3b8",marginTop:"-16px",marginBottom:"24px"}}>
              Your saved matches — add notes and track your picks
            </p>

            {watchlist.length === 0 ? (
              <div style={{textAlign:"center",padding:"60px 20px",background:"rgba(255,255,255,0.02)",borderRadius:"16px",border:"1px solid rgba(255,255,255,0.05)"}}>
                <div style={{fontSize:"48px",marginBottom:"16px"}}>🔖</div>
                <h3 style={{color:"#e2e8f0",marginBottom:"8px"}}>No matches saved yet</h3>
                <p style={{color:"#64748b",fontSize:"14px",marginBottom:"24px"}}>Go to the Matches tab and click "Add to Watchlist" on any upcoming match.</p>
                <button className="predictBtn" style={{width:"auto",padding:"10px 28px"}} onClick={() => setTab("matches")}>
                  📅 Go to Matches
                </button>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
                {watchlist.map((w) => {
                  const note = watchlistNotes[w.key] || "";
                  const surface = (w.tournament||"").toLowerCase().includes("clay")||["roland","french","monte","madrid","rome","barcelona"].some(x=>(w.tournament||"").toLowerCase().includes(x)) ? {icon:"🧱",label:"Clay",color:"#ef4444"} : (w.tournament||"").toLowerCase().includes("grass")||["wimbledon","halle","queens"].some(x=>(w.tournament||"").toLowerCase().includes(x)) ? {icon:"🌿",label:"Grass",color:"#4ade80"} : {icon:"🏟️",label:"Hard",color:"#22d3ee"};
                  return (
                    <div key={w.key} style={{background:"#0f172a",borderRadius:"16px",border:"1px solid rgba(255,255,255,0.07)",overflow:"hidden"}}>
                      {/* Match Header */}
                      <div style={{padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"16px"}}>
                          <div style={{flex:1}}>
                            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"6px"}}>
                              <span style={{fontSize:"11px",padding:"2px 8px",borderRadius:"4px",background:`${surface.color}22`,color:surface.color,fontWeight:700}}>{surface.icon} {surface.label}</span>
                              <span style={{fontSize:"11px",color:"#475569"}}>{w.tournament}</span>
                              {w.time && <span style={{fontSize:"11px",color:"#475569"}}>🕐 {w.time}</span>}
                            </div>
                            <div style={{fontSize:"16px",fontWeight:700,color:"#e2e8f0",marginBottom:"2px"}}>{w.player1}</div>
                            <div style={{fontSize:"16px",fontWeight:700,color:"#94a3b8"}}>vs {w.player2}</div>
                          </div>
                          <div style={{display:"flex",gap:"8px",flexShrink:0}}>
                            <button onClick={() => { setP1(w.player1); setP2(w.player2); setTab("predictor"); }}
                              style={{padding:"6px 12px",borderRadius:"8px",border:"1px solid rgba(34,211,238,0.3)",background:"rgba(34,211,238,0.08)",color:"#22d3ee",fontSize:"11px",fontWeight:600,cursor:"pointer"}}>
                              ⚡ Predict
                            </button>
                            <button onClick={() => { setH2hP1(w.player1); setH2hP2(w.player2); setTab("h2h"); fetchH2H(); }}
                              style={{padding:"6px 12px",borderRadius:"8px",border:"1px solid rgba(99,102,241,0.3)",background:"rgba(99,102,241,0.08)",color:"#818cf8",fontSize:"11px",fontWeight:600,cursor:"pointer"}}>
                              ⚔️ H2H
                            </button>
                            <button onClick={() => saveWatchlist(watchlist.filter(x => x.key !== w.key))}
                              style={{padding:"6px 10px",borderRadius:"8px",border:"1px solid rgba(248,113,113,0.2)",background:"rgba(248,113,113,0.06)",color:"#f87171",fontSize:"11px",cursor:"pointer"}}>
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Notes Section */}
                      <div style={{padding:"16px 20px"}}>
                        <div style={{fontSize:"11px",color:"#475569",textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,marginBottom:"8px"}}>📝 My Notes</div>
                        <textarea
                          value={note}
                          onChange={(e) => saveNote(w.key, e.target.value)}
                          placeholder="Add your notes, analysis or picks here..."
                          style={{width:"100%",boxSizing:"border-box",minHeight:"80px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"10px",padding:"10px 12px",color:"#e2e8f0",fontSize:"13px",resize:"vertical",outline:"none",fontFamily:"inherit",lineHeight:1.5}}
                          onFocus={e => e.target.style.borderColor="rgba(34,211,238,0.3)"}
                          onBlur={e => e.target.style.borderColor="rgba(255,255,255,0.08)"}
                        />
                        {note && (
                          <div style={{display:"flex",justifyContent:"flex-end",marginTop:"4px"}}>
                            <span style={{fontSize:"11px",color:"#334155"}}>✓ Auto-saved</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Clear all */}
                <div style={{textAlign:"center",paddingTop:"8px"}}>
                  <button onClick={() => { if(window.confirm("Clear all watchlist entries?")) saveWatchlist([]); }}
                    style={{padding:"6px 16px",borderRadius:"8px",border:"1px solid rgba(248,113,113,0.2)",background:"transparent",color:"#f87171",fontSize:"12px",cursor:"pointer"}}>
                    🗑️ Clear Watchlist
                  </button>
                </div>
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}

function Header({ title }) { return <h2>{title}</h2>; }
function Panel({ title, children }) { return <div className="panel"><h3>{title}</h3>{children}</div>; }
function Card({ label, value }) { return <div className="card"><span>{label}</span><strong>{value}</strong></div>; }
