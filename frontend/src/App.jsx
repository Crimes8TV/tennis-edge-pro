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
  const [player, setPlayer] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [live, setLive] = useState(null);

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
    const interval = setInterval(() => {
      fetch("https://tennis-edge-backend.onrender.com/api/live")
        .then(res => res.json())
        .then(data => setLive(data));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const active = players[player] || {};
  const playerNames = Object.keys(players);

  const prediction = useMemo(() => {
    if (!players[p1] || !players[p2]) return 50;

    const a = players[p1];
    const b = players[p2];

    const scoreA = a.elo * .3 + a.serve * .2 + a.return * .2 + a.clutch * .15 + a.momentum * .15;
    const scoreB = b.elo * .3 + b.serve * .2 + b.return * .2 + b.clutch * .15 + b.momentum * .15;

    return Math.round((scoreA / (scoreA + scoreB)) * 100);
  }, [players, p1, p2]);

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

            {live && (
              <section className="panel">
                <h3>Live Match</h3>
                <p>{live.match}</p>
                <p>{live.score}</p>
                <p>Momentum: {live.momentum}</p>
              </section>
            )}

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
              <div className="prediction"><span>{p1}</span><strong>{prediction}%</strong></div>
              <div className="bar"><div style={{ width: `${prediction}%` }} /></div>
              <div className="prediction muted"><span>{p2}</span><strong>{100 - prediction}%</strong></div>
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
  return <section className="panel"><h3>{title}</h3>{children}</section>;
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