import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import { Activity, BarChart3, Trophy, Search, Zap } from "lucide-react";
import "./App.css";

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [players, setPlayers] = useState({});
  const [player, setPlayer] = useState("")
  const [playerStats, setPlayerStats] = useState(null);
const [prediction, setPrediction] = useState(null);
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [live, setLive] = useState(null);
  const topMatches = Object.values(players)
  .slice(0, 6)
  .map((p, i, arr) =>
    i < arr.length - 1 ? [p.name, arr[i + 1].name] : null
  )
  .filter(Boolean);

  useEffect(() => {
    fetch("https://tennis-edge-backend.onrender.com/api/players")
  .then(res => {
    if (!res.ok) {
      throw new Error("API Fehler");
    }
    return res.json();
  })
  .then(data => {
    console.log("PLAYERS DATA:", data); // DEBUG
    const formatted = {};
    data.forEach(p => formatted[p.name] = p);
    setPlayers(formatted);
    setPlayer(data[0].name);
    setP1(data[0].name);
    setP2(data[1].name);
  })
  .catch(err => {
    console.error("FEHLER PLAYERS:", err);
  });
       
  }, []);
useEffect(() => {
  if (!player) return;

  fetch(`https://tennis-edge-backend.onrender.com/api/player/${encodeURIComponent(player)}`)
    .then(res => res.json())
    .then(data => {
      console.log("PLAYER STATS:", data);
      setPlayerStats(data);
    })
    .catch(err => console.error(err));
}, [player]);
useEffect(() => {
  if (!p1 || !p2) return;
const rank1 = players[p1]?.rank || 10;
const rank2 = players[p2]?.rank || 100;
  fetch(`https://tennis-edge-backend.onrender.com/api/predict?p1=${encodeURIComponent(p1)}&p2=${encodeURIComponent(p2)}&rank1=${rank1}&rank2=${rank2}&surface=hard`)
    .then(res => res.json())
    .then(data => {
      console.log("PREDICTION:", data);
      setPrediction(data);
    })
    .catch(err => console.error(err));
}, [p1, p2, players]);
  useEffect(() => {
    const interval = setInterval(() => {
      fetch("https://tennis-edge-backend.onrender.com/api/live")
        .then(res => res.json())
        .then(data => setLive(data));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const active = players[player] || {};
  const playerNames = Object.keys(players);

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
        <p style={{color: "red"}}>DEBUG TEST</p>
        {true && (
          <>
            <Header title="Live Dashboard" />

            {live && (
              <section className="panel">
                <h3>Live Match</h3>
                <p>{live.match}</p>
                <p>{live.score}</p>
                <p>Momentum: {live.momentum}</p>
              </section>
             
            )}

            <div className="topMatches">
           <h4>🔥 Suggested Matches</h4>
           <p>TEST MATCHES</p>

           {topMatches.map((m, i) => (
           <p key={i}>{m[0]} vs {m[1]}</p>
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
              {playerNames.map(p => <option key={p}>{p}</option>)}
            </select>
            <Kpis data={active} />
            {playerStats && (
              <Panel title="Player Stats">
              <p>Win Rate: {playerStats.stats.winRate}%</p>
              <p>Serve: {playerStats.stats.serveRating}</p>
             <p>Return: {playerStats.stats.returnRating}</p>
              <p>Fitness: {playerStats.stats.fitness}</p>
             <p>Hard: {playerStats.surfaces.hard}</p>
              <p>Clay: {playerStats.surfaces.clay}</p>
             <p>Grass: {playerStats.surfaces.grass}</p>
              <p>Form: {playerStats.recentForm.join(" ")}</p>
              </Panel>
              )}
          </>
        )}

        {tab === "predictor" && (
          <>
            <Header title="Match Predictor" />
            <div className="grid two">
              <select value={p1} onChange={e => setP1(e.target.value)}>
                {playerNames.map(p => <option key={p}>{p}</option>)}
              </select>
              <select value={p2} onChange={e => setP2(e.target.value)}>
                {playerNames.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>

            <Panel title="Prediction Engine">
{prediction && (
  <p className="bestPick">
    🔥 Best Pick: {
      prediction.prediction[prediction.player1] > prediction.prediction[prediction.player2]
        ? prediction.player1
        : prediction.player2
    } ({Math.max(
      prediction.prediction[prediction.player1],
      prediction.prediction[prediction.player2]
    )}%)
  </p>
)}
  <>
    <div className={`prediction ${prediction.prediction[prediction.player1] > 50 ? "win" : ""}`}>
      <span>{prediction.player1}</span>
      <strong>{prediction.prediction[prediction.player1]}%</strong>
    </div>

    <div className="bar">
      <div style={{ width: prediction.prediction[prediction.player1] + "%" }} />
    </div>

    <div className="prediction muted">
      <span>{prediction.player2}</span>
      <strong>{prediction.prediction[prediction.player2]}%</strong>
    </div>

    <p>Confidence: {prediction.confidence}%</p>
    <p className="edge">{prediction.edge}</p>
    {prediction.factors && (
  <div className="factorBox">
    {players[p1] && players[p2] && (
  <div className="compareBox">
    <h4>Player Compare</h4>

    <p>Serve: {players[p1].serve} vs {players[p2].serve}</p>
    <p>Return: {players[p1].return} vs {players[p2].return}</p>
    <p>Clutch: {players[p1].clutch} vs {players[p2].clutch}</p>
    <p>Momentum: {players[p1].momentum} vs {players[p2].momentum}</p>
  </div>
)}
    <h4>Prediction Explain</h4>

    <FactorBar label="Ranking" value={70} />
    <FactorBar label="Form" value={15} />
    <FactorBar label="Clutch" value={8} />
    <FactorBar label="Momentum" value={7} />

    <p className="surfaceNote">
      Surface: {prediction.factors.surface}
    </p>
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
              <p className="insight">Daten kommen jetzt über dein Backend. Nächster Schritt: echte Tennis-API anbinden.</p>
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

function FactorBar({ label, value }) {
  return (
    <div className="factorRow">
      <div className="factorTop">
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className="factorTrack">
        <div style={{ width: value + "%" }} />
      </div>
    </div>
  );
}