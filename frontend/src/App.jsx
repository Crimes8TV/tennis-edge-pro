import React, { useEffect, useState, useRef } from "react";
import {
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import { Activity, Trophy, Search, Zap, TrendingUp } from "lucide-react";
import "./App.css";

function PlayerAutocomplete({ label, playerNum, value, onChange, players }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => { setQuery(value || ""); }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = query
    ? players.filter(p => p.toLowerCase().includes(query.toLowerCase()))
    : players;

  const handleSelect = (name) => {
    setQuery(name);
    onChange(name);
    setOpen(false);
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
    setOpen(true);
    const exact = players.find(p => p.toLowerCase() === e.target.value.toLowerCase());
    if (exact) onChange(exact);
  };

  return (
    <div ref={ref} className="playerSearchWrapper">
      <span className="playerSearchLabel">Spieler {playerNum}</span>
      <div style={{ position: "relative" }}>
        <Search
          size={15}
          style={{
            position: "absolute", left: "13px", top: "50%",
            transform: "translateY(-50%)", color: "#22d3ee", pointerEvents: "none"
          }}
        />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          placeholder={label}
          className="playerSearchInput"
        />
      </div>

      {open && filtered.length > 0 && (
        <ul className="playerDropdown">
          {filtered.map(name => (
            <li
              key={name}
              className={name === value ? "active" : ""}
              onMouseDown={() => handleSelect(name)}
            >
              {name}
            </li>
          ))}
        </ul>
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
  const [h2hP1, setH2hP1] = useState("");
  const [h2hP2, setH2hP2] = useState("");
  const [h2hData, setH2hData] = useState(null);
  const [h2hLoading, setH2hLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);

  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");

  const [odds1, setOdds1] = useState(1.7);
  const [odds2, setOdds2] = useState(2.2);
  const [liveMatches, setLiveMatches] = useState([]);
  const [valuePicks, setValuePicks] = useState([]);
  const [valuePicksLoading, setValuePicksLoading] = useState(true);
  const [fixtures, setFixtures] = useState([]);
  const [fixturesLoading, setFixturesLoading] = useState(true);
  const [surface, setSurface] = useState("hard");

  const safePlayers = Array.isArray(players) ? players : [];

  const getPlayerName = (p) =>
    typeof p.name === "string" ? p.name : p.name?.name || "";

  const playerNames = safePlayers.map(getPlayerName).filter(Boolean);
  const active = safePlayers.find(p => getPlayerName(p) === player) || {};
  const compareActive = safePlayers.find(p => getPlayerName(p) === comparePlayer) || {};
  const findPlayer = (name) => {
    if (!name) return null;
    const lower = name.toLowerCase();
    // 1. Exact match
    let found = safePlayers.find(p => getPlayerName(p).toLowerCase() === lower);
    if (found) return found;
    // 2. Last name match (handles "I. Ivashka" → "Ilya Ivashka")
    const lastName = lower.split(" ").pop();
    found = safePlayers.find(p => getPlayerName(p).toLowerCase().split(" ").pop() === lastName);
    if (found) return found;
    // 3. Contains match
    found = safePlayers.find(p => getPlayerName(p).toLowerCase().includes(lastName));
    return found || null;
  };
  const p1Data = findPlayer(p1);
  const p2Data = findPlayer(p2);

  const winner =
    prediction?.prediction?.[prediction?.player1] >
    prediction?.prediction?.[prediction?.player2]
      ? prediction?.player1
      : prediction?.player2;

  useEffect(() => {
    fetch("https://tennis-edge-backend.onrender.com/api/players")
      .then(res => { if (!res.ok) throw new Error("API Fehler"); return res.json(); })
      .then(data => {
        const formatted = Array.isArray(data) ? data : [];
        setPlayers(formatted);
        if (formatted.length > 0) setPlayer(getPlayerName(formatted[0]));
        if (formatted.length > 1) {
          setP1(getPlayerName(formatted[0]));
          setP2(getPlayerName(formatted[1]));
        }
      })
      .catch(err => console.error("FEHLER PLAYERS:", err));
  }, []);

  useEffect(() => {
    if (!player) return;
    fetch(`https://tennis-edge-backend.onrender.com/api/player/${encodeURIComponent(player)}`)
      .then(res => res.json())
      .then(data => setPlayerStats(data))
      .catch(err => console.error(err));
  }, [player]);


  useEffect(() => {
    if (!comparePlayer) return;
    fetch(`https://tennis-edge-backend.onrender.com/api/player/${encodeURIComponent(comparePlayer)}`)
      .then(res => res.json())
      .then(data => setCompareStats(data))
      .catch(err => console.error(err));
  }, [comparePlayer]);

  const fetchH2H = () => {
    if (!h2hP1 || !h2hP2) return;
    const p1Data = safePlayers.find(p => getPlayerName(p).toLowerCase() === h2hP1.toLowerCase());
    const p2Data = safePlayers.find(p => getPlayerName(p).toLowerCase() === h2hP2.toLowerCase());
    if (!p1Data?.player_key || !p2Data?.player_key) return;
    setH2hLoading(true);
    fetch(`https://tennis-edge-backend.onrender.com/api/h2h?p1_key=${p1Data.player_key}&p2_key=${p2Data.player_key}`)
      .then(res => res.json())
      .then(data => { setH2hData(data); setH2hLoading(false); })
      .catch(err => { console.error(err); setH2hLoading(false); });
  };

  const predictMatch = () => {
    if (!p1 || !p2 || !p1Data || !p2Data) return;
    fetch(
      `https://tennis-edge-backend.onrender.com/api/predict?p1=${encodeURIComponent(p1)}&p2=${encodeURIComponent(p2)}&rank1=${p1Data.rank || 10}&rank2=${p2Data.rank || 100}&surface=${surface}&surface1=${p1Data?.[surface] || 0}&surface2=${p2Data?.[surface] || 0}`
    )
      .then(res => res.json())
      .then(data => setPrediction(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      fetch("https://tennis-edge-backend.onrender.com/api/live")
        .then(res => res.json())
        .then(data => setLiveMatches(Array.isArray(data) ? data : []))
        .catch(err => console.error(err));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setValuePicksLoading(true);
    fetch("https://tennis-edge-backend.onrender.com/api/valuepicks")
      .then(res => res.json())
      .then(data => { setValuePicks(Array.isArray(data) ? data : []); setValuePicksLoading(false); })
      .catch(err => { console.error(err); setValuePicksLoading(false); });
  }, []);

  useEffect(() => {
    setFixturesLoading(true);
    fetch("https://tennis-edge-backend.onrender.com/api/fixtures/today")
      .then(res => { if (!res.ok) throw new Error("Fehler"); return res.json(); })
      .then(data => { setFixtures(Array.isArray(data) ? data : []); setFixturesLoading(false); })
      .catch(err => { console.error("Fixtures Fehler:", err); setFixtures([]); setFixturesLoading(false); });
  }, []);

  const formData = (active.form || []).map((v, i) => ({ match: `M-${6 - i}`, form: v }));

  const radarData = [
    { stat: "Serve", value: active.serve || 0 },
    { stat: "Return", value: active.return || 0 },
    { stat: "Clutch", value: active.clutch || 0 },
    { stat: "Momentum", value: active.momentum || 0 },
    { stat: "Hard", value: active.hard || 0 },
    { stat: "Clay", value: active.clay || 0 },
  ];

  if (playerNames.length === 0) {
    return <div className="app"><main><h2>Lade Backend-Daten...</h2></main></div>;
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>TennisEdge&nbsp;Pro</h1>
        <p>Advanced Tennis Analytics</p>
        <button onClick={() => setTab("dashboard")}><Activity /> Dashboard</button>
        <button onClick={() => setTab("valuepicks")}><TrendingUp /> Value Picks</button>
        <button onClick={() => setTab("player")}><Search /> Player Analyzer</button>
        <button onClick={() => setTab("predictor")}><Zap /> Match Predictor</button>
        <button onClick={() => setTab("h2h")}><Trophy /> H2H Intelligence</button>
      </aside>

      <main>
        {tab === "dashboard" && (
          <>
            <Header title="Live Dashboard" />
            <div className="dashGrid">
              <div>
                <div className="dashSectionHeader">
                  {liveMatches.length > 0
                    ? <><span className="liveDot" />Live Matches</>
                    : <>📅 Heute — {new Date().toLocaleDateString("de-DE")}</>
                  }
                </div>
                {liveMatches.length > 0 ? (
                  <div className="matchCardGrid">
                    {liveMatches.slice(0, 5).map((m, i) => (
                      <div key={i} className="matchCard" onClick={() => { setP1(m.player1); setP2(m.player2); setTab("predictor"); }}>
                        <div className="matchCardBadge atp">{m.category}</div>
                        <div className="matchCardPlayers">
                          <span>{m.player1}</span>
                          <span className="matchCardScore">{m.score !== "-" ? m.score : "vs"}</span>
                          <span>{m.player2}</span>
                        </div>
                        <div className="matchCardMeta">{m.tournament} · <span style={{color:"#f87171"}}>{m.status}</span></div>
                      </div>
                    ))}
                    {liveMatches.length > 5 && (
                      <p style={{color:"#22d3ee",fontSize:"12px",marginTop:"8px",cursor:"pointer"}} onClick={() => setTab("valuepicks")}>+{liveMatches.length - 5} weitere →</p>
                    )}
                  </div>
                ) : fixturesLoading ? (
                  <p style={{color:"#94a3b8",fontSize:"14px",padding:"16px 0"}}>⏳ Lade Matches...</p>
                ) : fixtures.length === 0 ? (
                  <p style={{color:"#94a3b8",fontSize:"14px",padding:"16px 0"}}>Keine Matches heute.</p>
                ) : (
                  <div className="matchCardGrid">
                    {fixtures.slice(0, 5).map((m, i) => (
                      <div key={i} className="matchCard" onClick={() => { setP1(m.player1); setP2(m.player2); setTab("predictor"); }}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                          <span className={`matchCardBadge ${m.category?.includes("ATP") ? "atp" : "challenger"}`}>{m.category}</span>
                          {m.time && <span style={{fontSize:"12px",color:"#94a3b8"}}>🕐 {m.time}</span>}
                        </div>
                        <div className="matchCardPlayers">
                          <span>{m.player1}</span>
                          <span className="matchCardVs">vs</span>
                          <span>{m.player2}</span>
                        </div>
                        <div className="matchCardMeta">{m.tournament}</div>
                      </div>
                    ))}
                    {fixtures.length > 5 && (
                      <p style={{color:"#22d3ee",fontSize:"12px",marginTop:"8px",cursor:"pointer"}} onClick={() => setTab("valuepicks")}>+{fixtures.length - 5} weitere → alle anzeigen</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div className="dashSectionHeader" style={{justifyContent:"space-between"}}>
                  <span>💰 Top Value Picks</span>
                  <span style={{fontSize:"12px",color:"#22d3ee",cursor:"pointer"}} onClick={() => setTab("valuepicks")}>Alle anzeigen →</span>
                </div>
                {valuePicksLoading ? (
                  <p style={{color:"#94a3b8",fontSize:"14px",padding:"16px 0"}}>⏳ Berechne Value Picks...</p>
                ) : valuePicks.length === 0 ? (
                  <p style={{color:"#94a3b8",fontSize:"14px",padding:"16px 0"}}>Keine Value Picks heute.</p>
                ) : (
                  valuePicks.slice(0, 3).map((pick, i) => (
                    <div key={i} className="valuePickCardMini" onClick={() => { setP1(pick.match.split(" vs ")[0]); setP2(pick.match.split(" vs ")[1]); setTab("predictor"); }}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{color:"#e2e8f0",fontSize:"14px",fontWeight:600}}>{pick.match}</span>
                        <span className="valuePickEdge">+{pick.edge}%</span>
                      </div>
                      <div style={{display:"flex",gap:"12px",marginTop:"6px",fontSize:"12px"}}>
                        <span style={{color:"#4ade80"}}>✅ {pick.pick}</span>
                        {pick.bestOdds && <span style={{color:"#facc15"}}>Quote: {pick.bestOdds}</span>}
                        {pick.time && <span style={{color:"#64748b"}}>🕐 {pick.time}</span>}
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:"8px",marginTop:"6px"}}>
                        <span style={{fontSize:"11px",color:"#64748b",minWidth:"80px"}}>Unser Modell</span>
                        <div style={{flex:1,height:"4px",background:"#1e293b",borderRadius:"999px",overflow:"hidden"}}>
                          <div style={{width:`${pick.ourProb}%`,height:"100%",background:"linear-gradient(90deg,#22d3ee,#4ade80)"}} />
                        </div>
                        <span style={{fontSize:"11px",color:"#4ade80",minWidth:"30px"}}>{pick.ourProb}%</span>
                      </div>
                      {pick.impliedProb && (
                        <div style={{display:"flex",alignItems:"center",gap:"8px",marginTop:"4px"}}>
                          <span style={{fontSize:"11px",color:"#64748b",minWidth:"80px"}}>Buchmacher</span>
                          <div style={{flex:1,height:"4px",background:"#1e293b",borderRadius:"999px",overflow:"hidden"}}>
                            <div style={{width:`${pick.impliedProb}%`,height:"100%",background:"#f472b6"}} />
                          </div>
                          <span style={{fontSize:"11px",color:"#f472b6",minWidth:"30px"}}>{pick.impliedProb}%</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

                {tab === "valuepicks" && (
          <>
            <Header title="Value Picks" />
            <p style={{color:"#94a3b8",marginTop:"-16px",marginBottom:"24px"}}>Tagesaktuelle Value Bets — {new Date().toLocaleDateString("de-DE")}</p>

            {/* Alle heutigen Matches */}
            <Panel title={`📅 Alle Matches heute (${fixtures.length})`}>
              {fixturesLoading ? (
                <p style={{color:"#94a3b8"}}>⏳ Lade...</p>
              ) : (
                <div className="matchCardGrid" style={{gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))"}}>
                  {fixtures.map((m, i) => (
                    <div key={i} className="matchCard" onClick={() => { setP1(m.player1); setP2(m.player2); setTab("predictor"); }}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                        <span className={`matchCardBadge ${m.category?.includes("ATP") ? "atp" : "challenger"}`}>{m.category}</span>
                        {m.time && <span style={{fontSize:"12px",color:"#94a3b8"}}>🕐 {m.time}</span>}
                      </div>
                      <div className="matchCardPlayers">
                        <span>{m.player1}</span>
                        <span className="matchCardVs">vs</span>
                        <span>{m.player2}</span>
                      </div>
                      <div className="matchCardMeta">{m.tournament}</div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <div style={{marginTop:"24px"}}>
              <div className="dashSectionHeader">💰 Value Picks heute</div>
              {valuePicksLoading ? (
                <p style={{color:"#94a3b8"}}>⏳ Berechne...</p>
              ) : valuePicks.length === 0 ? (
                <p style={{color:"#94a3b8"}}>Keine Value Picks heute.</p>
              ) : (
                valuePicks.map((pick, i) => (
                  <div key={i} className="valuePickRow" onClick={() => { setP1(pick.match.split(" vs ")[0]); setP2(pick.match.split(" vs ")[1]); setTab("predictor"); }}>
                    <div className="valuePickTop">
                      <span className="valuePickRank">#{i + 1}</span>
                      <span className="valuePickMatch">{pick.match}</span>
                      <span className="valuePickEdge">+{pick.edge}% Edge</span>
                    </div>
                    <div className="valuePickBottom">
                      <span className="valuePickPick">✅ Pick: <strong>{pick.pick}</strong></span>
                      {pick.bestOdds && <span className="valuePickOdds">Quote: {pick.bestOdds}</span>}
                      {pick.time && <span className="valuePickTime">🕐 {pick.time}</span>}
                    </div>
                    <div className="valuePickProbBar">
                      <div className="valuePickProbItem">
                        <span className="valuePickProbLabel">Unser Modell</span>
                        <div className="valuePickProbTrack"><div className="valuePickProbFill ourFill" style={{width:`${pick.ourProb}%`}} /></div>
                        <span className="valuePickProbValue our">{pick.ourProb}%</span>
                      </div>
                      {pick.impliedProb && (
                        <div className="valuePickProbItem">
                          <span className="valuePickProbLabel">Buchmacher</span>
                          <div className="valuePickProbTrack"><div className="valuePickProbFill bookFill" style={{width:`${pick.impliedProb}%`}} /></div>
                          <span className="valuePickProbValue book">{pick.impliedProb}%</span>
                        </div>
                      )}
                    </div>
                    {pick.tournament && <div className="valuePickTournament">{pick.tournament}</div>}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {tab === "h2h" && (
          <>
            <Header title="H2H Intelligence" />

            <div className="grid two" style={{ marginBottom: "20px", alignItems: "flex-start" }}>
              <PlayerAutocomplete
                label="Spieler 1..."
                playerNum={1}
                value={h2hP1}
                onChange={setH2hP1}
                players={playerNames}
              />
              <PlayerAutocomplete
                label="Spieler 2..."
                playerNum={2}
                value={h2hP2}
                onChange={setH2hP2}
                players={playerNames}
              />
            </div>

            <button
              className="predictBtn"
              onClick={fetchH2H}
              disabled={!h2hP1 || !h2hP2}
              style={{ marginBottom: "24px" }}
            >
              ⚡ H2H laden
            </button>

            {h2hLoading && <p style={{ color: "#94a3b8" }}>⏳ Lade H2H-Daten...</p>}

            {h2hData && !h2hLoading && (
              <>
                <Panel title={`⚔️ ${h2hP1} vs ${h2hP2}`}>
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "40px", padding: "20px 0" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "48px", fontWeight: 900, color: "#22d3ee" }}>{h2hData.p1_wins}</div>
                      <div style={{ color: "#94a3b8", fontSize: "13px", marginTop: "4px" }}>{h2hP1}</div>
                    </div>
                    <div style={{ fontSize: "24px", color: "#475569", fontWeight: 700 }}>:</div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "48px", fontWeight: 900, color: "#f472b6" }}>{h2hData.p2_wins}</div>
                      <div style={{ color: "#94a3b8", fontSize: "13px", marginTop: "4px" }}>{h2hP2}</div>
                    </div>
                  </div>

                  {h2hData.p1_wins + h2hData.p2_wins > 0 && (
                    <div style={{ marginTop: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>
                        <span>{Math.round(h2hData.p1_wins / (h2hData.p1_wins + h2hData.p2_wins) * 100)}%</span>
                        <span>H2H Bilanz</span>
                        <span>{Math.round(h2hData.p2_wins / (h2hData.p1_wins + h2hData.p2_wins) * 100)}%</span>
                      </div>
                      <div style={{ display: "flex", height: "10px", borderRadius: "999px", overflow: "hidden" }}>
                        <div style={{ width: `${Math.round(h2hData.p1_wins / (h2hData.p1_wins + h2hData.p2_wins) * 100)}%`, background: "linear-gradient(90deg,#22d3ee,#4ade80)" }} />
                        <div style={{ flex: 1, background: "#f472b6" }} />
                      </div>
                    </div>
                  )}

                  {h2hData.h2h_matches?.length > 0 && (() => {
                    const getSurface = (tn) => {
                      const t = (tn || "").toLowerCase();
                      if (t.includes("clay") || t.includes("roland") || t.includes("french") || t.includes("monte") || t.includes("madrid") || t.includes("rome") || t.includes("barcelona")) return "clay";
                      if (t.includes("grass") || t.includes("wimbledon") || t.includes("halle") || t.includes("queens")) return "grass";
                      return "hard";
                    };
                    const surfaces = ["hard","clay","grass"];
                    const icons = { hard: "🏟️", clay: "🧱", grass: "🌿" };
                    const colors = { hard: "#22d3ee", clay: "#ef4444", grass: "#4ade80" };
                    const surfaceStats = surfaces.map(s => {
                      const matches = h2hData.h2h_matches.filter(m => getSurface(m.tournament_name) === s);
                      const w1 = matches.filter(m => m.event_winner === "First Player").length;
                      const w2 = matches.filter(m => m.event_winner === "Second Player").length;
                      return { s, w1, w2, total: matches.length };
                    }).filter(x => x.total > 0);
                    return surfaceStats.length > 0 ? (
                      <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}>
                        {surfaceStats.map(({ s, w1, w2, total }) => (
                          <div key={s} style={{ background: `${colors[s]}11`, border: `1px solid ${colors[s]}33`, borderRadius: "14px", padding: "14px", textAlign: "center" }}>
                            <div style={{ fontSize: "20px", marginBottom: "4px" }}>{icons[s]}</div>
                            <div style={{ fontSize: "11px", color: colors[s], textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px", fontWeight: 700 }}>{s}</div>
                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px" }}>
                              <span style={{ fontSize: "22px", fontWeight: 900, color: "#22d3ee" }}>{w1}</span>
                              <span style={{ color: "#475569" }}>:</span>
                              <span style={{ fontSize: "22px", fontWeight: 900, color: "#f472b6" }}>{w2}</span>
                            </div>
                            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>{total} Spiele</div>
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </Panel>

                {h2hData.h2h_matches?.length > 0 && (
                  <Panel title="📋 Letzte Begegnungen" style={{ marginTop: "20px" }}>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                        <thead>
                          <tr style={{ color: "#94a3b8", borderBottom: "1px solid rgba(34,211,238,0.2)" }}>
                            <th style={{ padding: "8px", textAlign: "left" }}>Datum</th>
                            <th style={{ padding: "8px", textAlign: "left" }}>Turnier</th>
                            <th style={{ padding: "8px", textAlign: "left" }}>Belag</th>
                            <th style={{ padding: "8px", textAlign: "left" }}>Ergebnis</th>
                            <th style={{ padding: "8px", textAlign: "left" }}>Sieger</th>
                          </tr>
                        </thead>
                        <tbody>
                          {h2hData.h2h_matches.map((m, i) => {
                            const p1Won = m.event_winner === "First Player";
                            const tn = (m.tournament_name || "").toLowerCase();
                            const surface = tn.includes("clay") || tn.includes("roland") || tn.includes("french") || tn.includes("monte") || tn.includes("madrid") || tn.includes("rome") || tn.includes("barcelona")
                              ? { label: "Clay", icon: "🧱", color: "#ef4444" }
                              : tn.includes("grass") || tn.includes("wimbledon") || tn.includes("halle") || tn.includes("queens") || tn.includes("eastbourne")
                              ? { label: "Grass", icon: "🌿", color: "#4ade80" }
                              : tn.includes("indoor") || tn.includes("hard") || tn.includes("australian") || tn.includes("us open") || tn.includes("miami") || tn.includes("indian wells") || tn.includes("cincinnati")
                              ? { label: "Hard", icon: "🏟️", color: "#22d3ee" }
                              : { label: "Hard", icon: "🏟️", color: "#22d3ee" };
                            return (
                              <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                <td style={{ padding: "8px", color: "#64748b" }}>{m.event_date}</td>
                                <td style={{ padding: "8px", color: "#cbd5e1" }}>{m.tournament_name}</td>
                                <td style={{ padding: "8px" }}>
                                  <span style={{
                                    background: `${surface.color}22`,
                                    color: surface.color,
                                    border: `1px solid ${surface.color}44`,
                                    borderRadius: "6px",
                                    padding: "2px 8px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    whiteSpace: "nowrap"
                                  }}>
                                    {surface.icon} {surface.label}
                                  </span>
                                </td>
                                <td style={{ padding: "8px", color: "#94a3b8" }}>{m.event_final_result}</td>
                                <td style={{ padding: "8px" }}>
                                  <span style={{
                                    color: p1Won ? "#22d3ee" : "#f472b6",
                                    fontWeight: 700
                                  }}>
                                    {p1Won ? m.event_first_player : m.event_second_player}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Panel>
                )}

                {h2hData.h2h_matches?.length === 0 && (
                  <Panel title="📋 Begegnungen">
                    <p style={{ color: "#94a3b8" }}>Keine direkten Begegnungen in der Datenbank gefunden.</p>
                  </Panel>
                )}

                <div className="grid two" style={{ marginTop: "20px" }}>
                  <Panel title={`📈 Letzte Spiele: ${h2hP1}`}>
                    {h2hData.p1_recent?.length > 0 ? h2hData.p1_recent.map((m, i) => {
                      const won = m.event_winner === "First Player";
                      const tn = (m.tournament_name || "").toLowerCase();
                      const surface = tn.includes("clay") || tn.includes("roland") || tn.includes("french") || tn.includes("monte") || tn.includes("madrid") || tn.includes("rome") || tn.includes("barcelona")
                        ? { icon: "🧱", color: "#ef4444" }
                        : tn.includes("grass") || tn.includes("wimbledon") || tn.includes("halle") || tn.includes("queens")
                        ? { icon: "🌿", color: "#4ade80" }
                        : { icon: "🏟️", color: "#22d3ee" };
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "13px" }}>
                          <span style={{ color: won ? "#4ade80" : "#f87171", fontWeight: 700, minWidth: "24px" }}>{won ? "W" : "L"}</span>
                          <span style={{ fontSize: "14px" }} title={surface.label}>{surface.icon}</span>
                          <span style={{ color: "#cbd5e1", flex: 1 }}>{m.event_second_player}</span>
                          <span style={{ color: "#64748b", fontSize: "11px" }}>{m.event_date}</span>
                        </div>
                      );
                    }) : <p style={{ color: "#94a3b8" }}>Keine Daten</p>}
                  </Panel>

                  <Panel title={`📈 Letzte Spiele: ${h2hP2}`}>
                    {h2hData.p2_recent?.length > 0 ? h2hData.p2_recent.map((m, i) => {
                      const won = m.event_winner === "Second Player";
                      const tn = (m.tournament_name || "").toLowerCase();
                      const surface = tn.includes("clay") || tn.includes("roland") || tn.includes("french") || tn.includes("monte") || tn.includes("madrid") || tn.includes("rome") || tn.includes("barcelona")
                        ? { icon: "🧱", color: "#ef4444" }
                        : tn.includes("grass") || tn.includes("wimbledon") || tn.includes("halle") || tn.includes("queens")
                        ? { icon: "🌿", color: "#4ade80" }
                        : { icon: "🏟️", color: "#22d3ee" };
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "13px" }}>
                          <span style={{ color: won ? "#4ade80" : "#f87171", fontWeight: 700, minWidth: "24px" }}>{won ? "W" : "L"}</span>
                          <span style={{ fontSize: "14px" }} title={surface.label}>{surface.icon}</span>
                          <span style={{ color: "#cbd5e1", flex: 1 }}>{m.event_first_player}</span>
                          <span style={{ color: "#64748b", fontSize: "11px" }}>{m.event_date}</span>
                        </div>
                      );
                    }) : <p style={{ color: "#94a3b8" }}>Keine Daten</p>}
                  </Panel>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Header({ title }) { return <h2>{title}</h2>; }

function Panel({ title, children }) {
  return (
    <div className="panel">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function Kpis({ data }) {
  return (
    <div className="grid kpis">
      <Card label="Elo Rating" value={data.elo || "-"} />
      <Card label="Serve" value={data.serve || "-"} />
      <Card label="Return" value={data.return || "-"} />
      <Card label="Clutch" value={data.clutch || "-"} />
      <Card label="Momentum" value={data.momentum || "-"} />
      <Card label="Rank" value={data.rank ? `#${data.rank}` : "-"} />
    </div>
  );
}

function Card({ label, value }) {
  return <div className="card"><span>{label}</span><strong>{value}</strong></div>;
}
