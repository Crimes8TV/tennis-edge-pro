import React, { useEffect, useState, useRef } from "react";
import {
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import { Activity, BarChart3, Trophy, Search, Zap } from "lucide-react";
import "./App.css";

function PlayerAutocomplete({ label, value, onChange, players }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = query
    ? players.filter(p => p.toLowerCase().includes(query.toLowerCase())).slice(0, 50)
    : players.slice(0, 50);

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
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <div style={{ position: "relative" }}>
        <Search
          size={14}
          style={{
            position: "absolute",
            left: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--color-text-secondary)",
            pointerEvents: "none"
          }}
        />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          placeholder={label}
          style={{
            width: "100%",
            paddingLeft: "30px",
            boxSizing: "border-box"
          }}
        />
      </div>

      {open && filtered.length > 0 && (
        <ul style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-secondary)",
          borderRadius: "var(--border-radius-md)",
          maxHeight: "220px",
          overflowY: "auto",
          zIndex: 100,
          margin: 0,
          padding: 0,
          listStyle: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
        }}>
          {filtered.map(name => (
            <li
              key={name}
              onMouseDown={() => handleSelect(name)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: "14px",
                color: "var(--color-text-primary)",
                background: name === value ? "var(--color-background-secondary)" : "transparent",
                borderBottom: "0.5px solid var(--color-border-tertiary)"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
              onMouseLeave={e => e.currentTarget.style.background = name === value ? "var(--color-background-secondary)" : "transparent"}
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
  const [prediction, setPrediction] = useState(null);

  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");

  const [odds1, setOdds1] = useState(1.7);
  const [odds2, setOdds2] = useState(2.2);
  const [liveMatches, setLiveMatches] = useState([]);
  const [surface, setSurface] = useState("hard");

  const safePlayers = Array.isArray(players) ? players : [];

  const getPlayerName = (p) =>
    typeof p.name === "string" ? p.name : p.name?.name || "";

  const playerNames = safePlayers.map(getPlayerName).filter(Boolean);

  const active = safePlayers.find(p => getPlayerName(p) === player) || {};

  const p1Data = safePlayers.find(p =>
    getPlayerName(p).toLowerCase() === p1.toLowerCase()
  );

  const p2Data = safePlayers.find(p =>
    getPlayerName(p).toLowerCase() === p2.toLowerCase()
  );

  const winner =
    prediction?.prediction?.[prediction?.player1] >
    prediction?.prediction?.[prediction?.player2]
      ? prediction?.player1
      : prediction?.player2;

  useEffect(() => {
    fetch("https://tennis-edge-backend.onrender.com/api/players")
      .then(res => {
        if (!res.ok) throw new Error("API Fehler");
        return res.json();
      })
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

  const topMatches = [...safePlayers]
    .sort((a, b) => (a.rank || 999) - (b.rank || 999))
    .filter((_, i) => i % 2 === 0)
    .map((p, i, arr) => [getPlayerName(p), getPlayerName(arr[i + 1] || {})])
    .filter(m => m[0] && m[1]);

  const autoValuePicks = topMatches
    .map(([a, b]) => {
      const pA = safePlayers.find(p => getPlayerName(p) === a);
      const pB = safePlayers.find(p => getPlayerName(p) === b);
      if (!pA || !pB) return null;
      const probA = Math.round(((pB.rank || 100) / ((pA.rank || 100) + (pB.rank || 100))) * 100);
      const probB = 100 - probA;
      const valueA = probA - 50;
      const valueB = probB - 50;
      return {
        match: `${a} vs ${b}`,
        pick: valueA > valueB ? a : b,
        value: Math.max(valueA, valueB),
      };
    })
    .filter(Boolean)
    .filter(pick => pick.value > 0)
    .sort((a, b) => b.value - a.value);

  const formData = (active.form || []).map((v, i) => ({
    match: `M-${6 - i}`,
    form: v,
  }));

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
        <h1>TennisEdge Pro</h1>
        <p>Advanced Tennis Analytics</p>

        <button onClick={() => setTab("dashboard")}><Activity /> Dashboard</button>
        <button onClick={() => setTab("player")}><Search /> Player Analyzer</button>
        <button onClick={() => setTab("predictor")}><Zap /> Match Predictor</button>
        <button onClick={() => setTab("surface")}><BarChart3 /> Surface Lab</button>
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
                  <p key={i} className="matchItem" onClick={() => {
                    setP1(m.player1);
                    setP2(m.player2);
                    setTab("predictor");
                  }}>
                    {m.player1} vs {m.player2}
                  </p>
                ))
              )}
            </div>

            <div className="valuePicks">
              <h4>💰 Auto Value Picks</h4>
              {autoValuePicks.map((pick, i) => (
                <p key={i}>#{i + 1} {pick.pick} — {pick.match} ({pick.value.toFixed(1)}%)</p>
              ))}
            </div>

            <Kpis data={active} />

            <div className="grid two">
              <Panel title="Formkurve">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={formData}>
                    <XAxis dataKey="match" />
                    <YAxis domain={[60, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="form" stroke="#22d3ee" strokeWidth={4} />
                  </LineChart>
                </ResponsiveContainer>
              </Panel>

              <Panel title="Performance Radar">
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="stat" />
                    <Radar dataKey="value" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.35} />
                  </RadarChart>
                </ResponsiveContainer>
              </Panel>
            </div>
          </>
        )}

        {tab === "player" && (
          <>
            <Header title="Player Analyzer" />
            <select value={player} onChange={e => setPlayer(e.target.value)}>
              {playerNames.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <Kpis data={active} />

            {playerStats && (
              <Panel title="Player Stats">
                <p>Win Rate: {playerStats.stats?.winRate}%</p>
                <p>Serve: {playerStats.stats?.serveRating}</p>
                <p>Return: {playerStats.stats?.returnRating}</p>
                <p>Fitness: {playerStats.stats?.fitness}</p>
                <p>Hard: {playerStats.surfaces?.hard}</p>
                <p>Clay: {playerStats.surfaces?.clay}</p>
                <p>Grass: {playerStats.surfaces?.grass}</p>
                <p>Form: {playerStats.recentForm?.join(" ")}</p>
              </Panel>
            )}
          </>
        )}

        {tab === "predictor" && (
          <>
            <Header title="Match Predictor" />

            <div className="grid two" style={{ marginBottom: "1rem" }}>
              <PlayerAutocomplete
                label="Spieler 1 suchen..."
                value={p1}
                onChange={setP1}
                players={playerNames}
              />
              <PlayerAutocomplete
                label="Spieler 2 suchen..."
                value={p2}
                onChange={setP2}
                players={playerNames}
              />
            </div>

            <select
              className="surfaceSelect"
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
            >
              <option value="hard">Hard</option>
              <option value="clay">Clay</option>
              <option value="grass">Grass</option>
            </select>

            {!p1Data || !p2Data ? (
              <p>Bitte zwei Spieler auswählen.</p>
            ) : (
              <button onClick={predictMatch}>Prediction berechnen</button>
            )}

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
                    <span className={winner === prediction.player1 ? "winnerName" : ""}>
                      {prediction.player1}
                    </span>
                    <strong>{prediction.prediction?.[prediction.player1]}%</strong>
                  </div>

                  <div className="bar">
                    <div
                      className={winner === prediction.player1 ? "barFill winBar" : "barFill"}
                      style={{ width: (prediction.prediction?.[prediction.player1] || 0) + "%" }}
                    />
                  </div>

                  <div className={`prediction muted ${winner === prediction.player2 ? "win" : ""}`}>
                    <span className={winner === prediction.player2 ? "winnerName" : ""}>
                      {prediction.player2}
                    </span>
                    <strong>{prediction.prediction?.[prediction.player2]}%</strong>
                  </div>

                  <p className="confidence">Confidence: {prediction.confidence}%</p>
                  <p className="edge">{prediction.edge}</p>

                  {prediction.explain && (
                    <p className="proExplain">🧠 {prediction.explain}</p>
                  )}

                  <div className="valueBox">
                    <h4>💰 Value Bet Check</h4>
                    <input type="number" step="0.01" value={odds1} onChange={(e) => setOdds1(Number(e.target.value))} />
                    <input type="number" step="0.01" value={odds2} onChange={(e) => setOdds2(Number(e.target.value))} />
                    <p>{prediction.player1}: {(prediction.prediction[prediction.player1] - 100 / odds1).toFixed(1)}%</p>
                    <p>{prediction.player2}: {(prediction.prediction[prediction.player2] - 100 / odds2).toFixed(1)}%</p>
                  </div>

                  {p1Data && p2Data && (
                    <div className="compareBox">
                      <h4>Player Compare</h4>
                      <p>Serve: {p1Data.serve} vs {p2Data.serve}</p>
                      <p>Return: {p1Data.return} vs {p2Data.return}</p>
                      <p>Clutch: {p1Data.clutch} vs {p2Data.clutch}</p>
                      <p>Momentum: {p1Data.momentum} vs {p2Data.momentum}</p>
                    </div>
                  )}
                </>
              )}
            </Panel>
          </>
        )}

        {tab === "surface" && (
          <>
            <Header title="Surface Lab" />
            <Panel title="Belag-Stärken">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={[
                  { name: "Hard", value: active.hard || 0 },
                  { name: "Clay", value: active.clay || 0 },
                  { name: "Grass", value: active.grass || 0 },
                ]}>
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#22d3ee" radius={[12, 12, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </>
        )}

        {tab === "h2h" && (
          <>
            <Header title="H2H Intelligence" />
            <Panel title="Matchup Insight">
              <p className="insight">Daten kommen jetzt über dein Backend.</p>
            </Panel>
          </>
        )}
      </main>
    </div>
  );
}

function Header({ title }) {
  return <h2>{title}</h2>;
}

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