import React, { useEffect, useState, useRef } from "react";
import {
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import { Activity, Trophy, Search, Zap } from "lucide-react";
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
  const [surface, setSurface] = useState("hard");

  const safePlayers = Array.isArray(players) ? players : [];

  const getPlayerName = (p) =>
    typeof p.name === "string" ? p.name : p.name?.name || "";

  const playerNames = safePlayers.map(getPlayerName).filter(Boolean);
  const active = safePlayers.find(p => getPlayerName(p) === player) || {};
  const compareActive = safePlayers.find(p => getPlayerName(p) === comparePlayer) || {};
  const p1Data = safePlayers.find(p => getPlayerName(p).toLowerCase() === p1.toLowerCase());
  const p2Data = safePlayers.find(p => getPlayerName(p).toLowerCase() === p2.toLowerCase());

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
        <button onClick={() => setTab("player")}><Search /> Player Analyzer</button>
        <button onClick={() => setTab("predictor")}><Zap /> Match Predictor</button>
        <button onClick={() => setTab("h2h")}><Trophy /> H2H Intelligence</button>
      </aside>

      <main>
        {tab === "dashboard" && (
          <>
            <Header title="Live Dashboard" />
            <div className="topMatches">
              <h4>🔥 Live Matches</h4>
              {liveMatches.length === 0 ? (
                <p>Keine Live Matches</p>
              ) : (
                liveMatches.map((m, i) => (
                  <p key={i} className="matchItem" onClick={() => { setP1(m.player1); setP2(m.player2); setTab("predictor"); }}>
                    {m.player1} vs {m.player2}
                  </p>
                ))
              )}
            </div>
            <div className="valuePicks">
              <h4>💰 Value Picks heute — {new Date().toLocaleDateString("de-DE")}</h4>
              {valuePicksLoading ? (
                <p style={{ color: "#94a3b8", fontSize: "14px" }}>⏳ Lade heutige Matches...</p>
              ) : valuePicks.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: "14px" }}>Keine Matches heute gefunden.</p>
              ) : (
                valuePicks.map((pick, i) => (
                  <div
                    key={i}
                    className="valuePickRow"
                    onClick={() => { setP1(pick.match.split(" vs ")[0]); setP2(pick.match.split(" vs ")[1]); setTab("predictor"); }}
                  >
                    <div className="valuePickTop">
                      <span className="valuePickRank">#{i + 1}</span>
                      <span className="valuePickMatch">{pick.match}</span>
                      <span className="valuePickEdge">+{pick.edge}% Edge</span>
                    </div>
                    <div className="valuePickBottom">
                      <span className="valuePickPick">✅ Pick: <strong>{pick.pick}</strong></span>
                      {pick.bestOdds && (
                        <span className="valuePickOdds">Quote: {pick.bestOdds}</span>
                      )}
                      {pick.time && <span className="valuePickTime">🕐 {pick.time}</span>}
                    </div>
                    <div className="valuePickProbBar">
                      <div className="valuePickProbItem">
                        <span className="valuePickProbLabel">Unsere Einschätzung</span>
                        <div className="valuePickProbTrack">
                          <div className="valuePickProbFill ourFill" style={{ width: `${pick.ourProb}%` }} />
                        </div>
                        <span className="valuePickProbValue our">{pick.ourProb}%</span>
                      </div>
                      {pick.impliedProb && (
                        <div className="valuePickProbItem">
                          <span className="valuePickProbLabel">Buchmacher</span>
                          <div className="valuePickProbTrack">
                            <div className="valuePickProbFill bookFill" style={{ width: `${pick.impliedProb}%` }} />
                          </div>
                          <span className="valuePickProbValue book">{pick.impliedProb}%</span>
                        </div>
                      )}
                    </div>
                    {pick.tournament && (
                      <div className="valuePickTournament">{pick.tournament}</div>
                    )}
                  </div>
                ))
              )}
            </div>

          </>
        )}

        {tab === "player" && (
          <>
            <Header title="Player Analyzer" />

            <div className="grid two" style={{ marginBottom: "20px", alignItems: "flex-start" }}>
              <PlayerAutocomplete
                label="Spieler 1 suchen..."
                playerNum={1}
                value={player}
                onChange={setPlayer}
                players={playerNames}
              />
              <PlayerAutocomplete
                label="Spieler 2 vergleichen..."
                playerNum={2}
                value={comparePlayer}
                onChange={setComparePlayer}
                players={playerNames}
              />
            </div>

            <div className="grid two">
              {playerStats && (
                <Panel title={`📊 ${player}`}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ color: "#94a3b8" }}>Win Rate</span>
                    <strong style={{ color: "#22d3ee" }}>{playerStats.stats?.winRate}%</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ color: "#94a3b8" }}>Titles</span>
                    <strong style={{ color: "#22d3ee" }}>{playerStats.stats?.titles}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                    <span style={{ color: "#94a3b8" }}>Ranking Points</span>
                    <strong style={{ color: "#22d3ee" }}>{playerStats.stats?.points}</strong>
                  </div>

                  <h4 style={{ color: "#22d3ee", marginBottom: "12px" }}>Belag Win-%</h4>
                  {[
                    { label: "🏟️ Hard", value: playerStats.surfaces?.hard },
                    { label: "🧱 Clay", value: playerStats.surfaces?.clay },
                    { label: "🌿 Grass", value: playerStats.surfaces?.grass },
                  ].map(s => (
                    <div key={s.label} style={{ marginBottom: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                        <span style={{ color: "#cbd5e1" }}>{s.label}</span>
                        <strong style={{ color: s.value >= 60 ? "#4ade80" : s.value >= 45 ? "#facc15" : "#f87171" }}>
                          {s.value !== "-" ? `${s.value}%` : "–"}
                        </strong>
                      </div>
                      <div style={{ height: "8px", background: "#1e293b", borderRadius: "999px", overflow: "hidden" }}>
                        <div style={{
                          width: `${s.value !== "-" ? s.value : 0}%`,
                          height: "100%",
                          background: s.value >= 60 ? "linear-gradient(90deg,#22d3ee,#4ade80)" : s.value >= 45 ? "#facc15" : "#f87171",
                          borderRadius: "999px"
                        }} />
                      </div>
                    </div>
                  ))}

                  <h4 style={{ color: "#22d3ee", marginTop: "20px", marginBottom: "8px" }}>Formkurve</h4>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={formData}>
                      <XAxis dataKey="match" stroke="#475569" tick={{ fontSize: 11 }} />
                      <YAxis domain={[60, 100]} stroke="#475569" tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="form" stroke="#22d3ee" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>

                  <h4 style={{ color: "#22d3ee", marginTop: "20px", marginBottom: "8px" }}>Performance Radar</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={[
                      { stat: "Serve", value: active.serve || 0 },
                      { stat: "Return", value: active.return || 0 },
                      { stat: "Clutch", value: active.clutch || 0 },
                      { stat: "Momentum", value: active.momentum || 0 },
                      { stat: "Hard", value: active.hard || 0 },
                      { stat: "Clay", value: active.clay || 0 },
                    ]}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="stat" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <Radar dataKey="value" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </Panel>
              )}

              {compareStats && (
                <Panel title={`📊 ${comparePlayer}`}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ color: "#94a3b8" }}>Win Rate</span>
                    <strong style={{ color: "#22d3ee" }}>{compareStats.stats?.winRate}%</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ color: "#94a3b8" }}>Titles</span>
                    <strong style={{ color: "#22d3ee" }}>{compareStats.stats?.titles}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                    <span style={{ color: "#94a3b8" }}>Ranking Points</span>
                    <strong style={{ color: "#22d3ee" }}>{compareStats.stats?.points}</strong>
                  </div>

                  <h4 style={{ color: "#22d3ee", marginBottom: "12px" }}>Belag Win-%</h4>
                  {[
                    { label: "🏟️ Hard", value: compareStats.surfaces?.hard },
                    { label: "🧱 Clay", value: compareStats.surfaces?.clay },
                    { label: "🌿 Grass", value: compareStats.surfaces?.grass },
                  ].map(s => (
                    <div key={s.label} style={{ marginBottom: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                        <span style={{ color: "#cbd5e1" }}>{s.label}</span>
                        <strong style={{ color: s.value >= 60 ? "#4ade80" : s.value >= 45 ? "#facc15" : "#f87171" }}>
                          {s.value !== "-" ? `${s.value}%` : "–"}
                        </strong>
                      </div>
                      <div style={{ height: "8px", background: "#1e293b", borderRadius: "999px", overflow: "hidden" }}>
                        <div style={{
                          width: `${s.value !== "-" ? s.value : 0}%`,
                          height: "100%",
                          background: s.value >= 60 ? "linear-gradient(90deg,#22d3ee,#4ade80)" : s.value >= 45 ? "#facc15" : "#f87171",
                          borderRadius: "999px"
                        }} />
                      </div>
                    </div>
                  ))}

                  <h4 style={{ color: "#22d3ee", marginTop: "20px", marginBottom: "8px" }}>Formkurve</h4>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={formData}>
                      <XAxis dataKey="match" stroke="#475569" tick={{ fontSize: 11 }} />
                      <YAxis domain={[60, 100]} stroke="#475569" tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="form" stroke="#f472b6" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>

                  <h4 style={{ color: "#22d3ee", marginTop: "20px", marginBottom: "8px" }}>Performance Radar</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={[
                      { stat: "Serve", value: compareActive.serve || 0 },
                      { stat: "Return", value: compareActive.return || 0 },
                      { stat: "Clutch", value: compareActive.clutch || 0 },
                      { stat: "Momentum", value: compareActive.momentum || 0 },
                      { stat: "Hard", value: compareActive.hard || 0 },
                      { stat: "Clay", value: compareActive.clay || 0 },
                    ]}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="stat" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <Radar dataKey="value" stroke="#f472b6" fill="#f472b6" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </Panel>
              )}
            </div>

            {playerStats && compareStats && (
              <Panel title="⚔️ Direktvergleich Belag">
                {[
                  { label: "🏟️ Hard Court", v1: playerStats.surfaces?.hard, v2: compareStats.surfaces?.hard },
                  { label: "🧱 Clay Court", v1: playerStats.surfaces?.clay, v2: compareStats.surfaces?.clay },
                  { label: "🌿 Grass Court", v1: playerStats.surfaces?.grass, v2: compareStats.surfaces?.grass },
                ].map(s => {
                  const v1 = s.v1 !== "-" ? s.v1 : 0;
                  const v2 = s.v2 !== "-" ? s.v2 : 0;
                  const total = v1 + v2 || 1;
                  return (
                    <div key={s.label} style={{ marginBottom: "16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                        <strong style={{ color: v1 >= v2 ? "#4ade80" : "#94a3b8" }}>{player}: {v1}%</strong>
                        <span style={{ color: "#94a3b8" }}>{s.label}</span>
                        <strong style={{ color: v2 > v1 ? "#4ade80" : "#94a3b8" }}>{comparePlayer}: {v2}%</strong>
                      </div>
                      <div style={{ display: "flex", height: "10px", borderRadius: "999px", overflow: "hidden" }}>
                        <div style={{ width: `${Math.round(v1 / total * 100)}%`, background: "linear-gradient(90deg,#22d3ee,#4ade80)" }} />
                        <div style={{ flex: 1, background: "#f472b6" }} />
                      </div>
                    </div>
                  );
                })}
              </Panel>
            )}
          </>
        )}

        {tab === "predictor" && (
          <>
            <Header title="Match Predictor" />

            <div className="grid two" style={{ marginBottom: "20px", alignItems: "flex-start" }}>
              <PlayerAutocomplete
                label="Name eingeben..."
                playerNum={1}
                value={p1}
                onChange={setP1}
                players={playerNames}
              />
              <PlayerAutocomplete
                label="Name eingeben..."
                playerNum={2}
                value={p2}
                onChange={setP2}
                players={playerNames}
              />
            </div>

            <div className="surfaceSelector">
              {[
                { value: "hard", icon: "🏟️", label: "Hard" },
                { value: "clay", icon: "🧱", label: "Clay" },
                { value: "grass", icon: "🌿", label: "Grass" }
              ].map(s => (
                <button
                  key={s.value}
                  className={`surfaceBtn ${surface === s.value ? "active" : ""}`}
                  onClick={() => setSurface(s.value)}
                >
                  <span className="surfaceIcon">{s.icon}</span>
                  <span className="surfaceLabel">{s.label}</span>
                </button>
              ))}
            </div>

            <button
              className="predictBtn"
              onClick={predictMatch}
              disabled={!p1Data || !p2Data}
            >
              ⚡ Prediction berechnen
            </button>

            <Panel title="Prediction Engine">
              {prediction && (
                <>
                  <p className="bestPick">
                    🔥 Best Pick: {winner} ({Math.max(
                      prediction.prediction?.[prediction.player1] || 0,
                      prediction.prediction?.[prediction.player2] || 0
                    )}%)
                  </p>
                  <div className={`prediction ${winner === prediction.player1 ? "win" : ""}`}>
                    <span className={winner === prediction.player1 ? "winnerName" : ""}>{prediction.player1}</span>
                    <strong>{prediction.prediction?.[prediction.player1]}%</strong>
                  </div>
                  <div className="bar">
                    <div
                      className={winner === prediction.player1 ? "barFill winBar" : "barFill"}
                      style={{ width: (prediction.prediction?.[prediction.player1] || 0) + "%" }}
                    />
                  </div>
                  <div className={`prediction muted ${winner === prediction.player2 ? "win" : ""}`}>
                    <span className={winner === prediction.player2 ? "winnerName" : ""}>{prediction.player2}</span>
                    <strong>{prediction.prediction?.[prediction.player2]}%</strong>
                  </div>
                  <p className="confidence">Confidence: {prediction.confidence}%</p>
                  <p className="edge">{prediction.edge}</p>
                  {prediction.explain && <p className="proExplain">🧠 {prediction.explain}</p>}
                  <div className="valueBox">
                    <h4>💰 Value Bet Check</h4>
                    <input type="number" step="0.01" value={odds1} onChange={(e) => setOdds1(Number(e.target.value))} />
                    <input type="number" step="0.01" value={odds2} onChange={(e) => setOdds2(Number(e.target.value))} />
                    <p>{prediction.player1}: {(prediction.prediction[prediction.player1] - 100 / odds1).toFixed(1)}%</p>
                    <p>{prediction.player2}: {(prediction.prediction[prediction.player2] - 100 / odds2).toFixed(1)}%</p>
                  </div>
                  {prediction.playerStats && (
                    <div className="compareBox">
                      <h4>Player Compare</h4>
                      {[
                        { label: "Serve",    k: "serve" },
                        { label: "Return",   k: "return" },
                        { label: "Clutch",   k: "clutch" },
                        { label: "Momentum", k: "momentum" },
                      ].map(({ label, k }) => {
                        const v1 = prediction.playerStats[prediction.player1]?.[k] || 0;
                        const v2 = prediction.playerStats[prediction.player2]?.[k] || 0;
                        const better1 = v1 > v2;
                        return (
                          <div key={k} style={{ marginBottom: "10px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                              <span style={{ color: better1 ? "#4ade80" : "#94a3b8", fontWeight: better1 ? 700 : 400 }}>{v1}</span>
                              <span style={{ color: "#94a3b8" }}>{label}</span>
                              <span style={{ color: !better1 ? "#4ade80" : "#94a3b8", fontWeight: !better1 ? 700 : 400 }}>{v2}</span>
                            </div>
                            <div style={{ display: "flex", height: "6px", borderRadius: "999px", overflow: "hidden", background: "#1e293b" }}>
                              <div style={{ width: `${Math.round(v1 / (v1 + v2) * 100)}%`, background: "linear-gradient(90deg,#22d3ee,#4ade80)" }} />
                              <div style={{ flex: 1, background: "#f472b6" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </Panel>
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
