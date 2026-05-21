import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import { Activity, BarChart3, Trophy, Search, Zap } from "lucide-react";
import "./App.css";

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [players, setPlayers] = useState([]);
  const [player, setPlayer] = useState("")
  const [playerStats, setPlayerStats] = useState(null);
const [prediction, setPrediction] = useState(null);
const winner = null;


  prediction?.prediction?.[prediction?.player1] >
  prediction?.prediction?.[prediction?.player2]
    ? prediction?.player1
    : prediction?.player2 || null;
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const p1Data = players.find(p => p.name === p1);
const p2Data = players.find(p => p.name === p2);

if (!p1Data || !p2Data) {
  return <p>Spielerdaten fehlen. Bitte andere Spieler auswählen.</p>;
}
  const [playerSearch1, setPlayerSearch1] = useState("");
const [playerSearch2, setPlayerSearch2] = useState("");
  const [odds1, setOdds1] = useState(1.70);
const [odds2, setOdds2] = useState(2.20);
  const [live, setLive] = useState(null);
  const [liveMatches, setLiveMatches] = useState([]);
  const [surface, setSurface] = useState("hard");
 
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
   if (data.length > 0) {
  setPlayer(data[0].name);
}

if (data.length > 1) {
  setP1(data[0].name);
  setP2(data[1].name);
}
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
const rank1 = p1Data?.rank || 10;
const rank2 = p2Data?.rank || 100;

console.log("PLAYER 1 DATA:", p1Data);
console.log("PLAYER 2 DATA:", p2Data);
console.log("SURFACE:", surface);
console.log("SURFACE 1 VALUE:", p1Data?.[surface]);
console.log("SURFACE 2 VALUE:", p2Data?.[surface]);

  fetch(`https://tennis-edge-backend.onrender.com/api/predict?p1=${encodeURIComponent(p1)}&p2=${encodeURIComponent(p2)}&rank1=${rank1}&rank2=${rank2}&surface=${surface}&surface1=${p1Data?.[surface] || 0}&surface2=${p2Data?.[surface] || 0}`)
    .then(res => res.json())
    .then(data => {
      console.log("PREDICTION:", data);
      setPrediction(data);
    })
    .catch(err => console.error(err));
}, [p1, p2, players, surface]);
  useEffect(() => {
    const interval = setInterval(() => {
      fetch("https://tennis-edge-backend.onrender.com/api/live")
        .then(res => res.json())
        .then(data => setLiveMatches(data));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const active = players[player] || {};
  const playerNames = Object.keys(players);
 const filteredPlayerNames1 = playerSearch1
  ? playerNames.filter(name =>
      name.toLowerCase().includes(playerSearch1.toLowerCase())
    )
  : playerNames;

const filteredPlayerNames2 = playerSearch2
  ? playerNames.filter(name =>
      name.toLowerCase().includes(playerSearch2.toLowerCase())
    )
  : playerNames;

  const topMatches = Object.values(players)
  .sort((a, b) => a.rank - b.rank)
  .slice(0, 50)
  .filter((_, i) => i % 2 === 0)
  .map((p, i, arr) => [p.name, arr[i + 1]?.name])
  .filter(m => m[1]);

  const autoValuePicks = topMatches.map(([a, b]) => {
  const pA = players[a];
  const pB = players[b];

  if (!pA || !pB) return null;

  const probA = Math.round((pB.rank / (pA.rank + pB.rank)) * 100);
  const probB = 100 - probA;

  const demoOddsA = 2.00;
const demoOddsB = 2.00;

  const valueA = probA - 100 / demoOddsA;
  const valueB = probB - 100 / demoOddsB;

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
           <h4>🔥 Live Matches</h4>
           
          {liveMatches.length === 0 ? (
  <p>Keine Live Matches</p>
) : (
  liveMatches.map((m, i) => (
             <p
  key={i}
  className="matchItem"
  onClick={() => {
  if (!players[m.player1] || !players[m.player2]) {
    alert("Für dieses Live Match fehlen noch Player-Daten im System.");
    return;
  }

  setP1(m.player1);
  setP2(m.player2);
  setTab("predictor");
}}
>
  {m.player1} vs {m.player2}
</p>
          ))
          )}
          </div>

          <div className="valuePicks">
  <h4>💰 Auto Value Picks</h4>

  {autoValuePicks.map((pick, i) => (
    <p key={i}>
      #{i + 1} {pick.pick} — {pick.match} ({pick.value.toFixed(1)}%)
    </p>
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
  <input
  className="searchInput"
  value={playerSearch1}
  onChange={(e) => {
    const value = e.target.value;
    setPlayerSearch1(value);

    const found = playerNames.find(name =>
      name.toLowerCase().includes(value.toLowerCase())
    );

    if (found) setP1(found);
  }}
  placeholder="Spieler 1 suchen..."
/>

<input
  className="searchInput"
  value={playerSearch2}
  onChange={(e) => {
    const value = e.target.value;
    setPlayerSearch2(value);

    const found = playerNames.find(name =>
      name.toLowerCase().includes(value.toLowerCase())
    );

    if (found) setP2(found);
  }}
  placeholder="Spieler 2 suchen..."
/>
</div>
            <div className="grid two">
              <select value={p1} onChange={e => setP1(e.target.value)}>
                {filteredPlayerNames1.map(p => (
  <option key={p} value={p}>{p}</option>
))}
              </select>
              <select value={p2} onChange={e => setP2(e.target.value)}>
                {filteredPlayerNames2.map(p => (
  <option key={p} value={p}>{p}</option>
))}
              </select>
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

            <Panel title="Prediction Engine">
  {prediction && (
    <>
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

     {prediction?.elo && (
  <div className="eloBarBox">
    <div className="eloBar">
      <div
        className="eloFill"
        style={{
          width: (() => {
            const e1 = prediction.elo?.[prediction.player1] || 0;
            const e2 = prediction.elo?.[prediction.player2] || 0;
            const total = e1 + e2 || 1;
            return (e1 / total) * 100 + "%";
          })()
        }}
      />
    </div>

    <div className="eloValues">
      <span>{prediction.elo[prediction.player1]}</span>
      <span>{prediction.elo[prediction.player2]}</span>
    </div>
  </div>
)}

      <div className={`prediction ${winner === prediction.player1 ? "win" : ""}`}>
        
<span className={winner === prediction.player1 ? "winnerName" : ""}>
  {prediction.player1}
</span>
        <strong>{prediction.prediction[prediction.player1]}%</strong>
      </div>

      <div className="bar">
  <div
    className={winner === prediction.player1 ? "barFill winBar" : "barFill"}
    style={{ width: prediction.prediction[prediction.player1] + "%" }}
  />
</div>

      <div className={`prediction muted ${winner === prediction.player2 ? "win" : ""}`}>
        <span className={winner === prediction.player2 ? "winnerName" : ""}>
  {prediction.player2}
</span>
        <strong>{prediction.prediction[prediction.player2]}%</strong>
      </div>

      <p className={`confidence ${
  prediction.confidence > 10
    ? "high"
    : prediction.confidence > 5
    ? "mid"
    : "low"
}`}>
  Confidence: {prediction.confidence}%
</p>
      <p className="edge">{prediction.edge}</p>
      {prediction.explain && (
  <p className="proExplain">
    🧠 {prediction.explain}
  </p>
)}
      <div className="valueBox">
  <h4>💰 Value Bet Check</h4>

  <input
    type="number"
    step="0.01"
    value={odds1}
    onChange={(e) => setOdds1(Number(e.target.value))}
    placeholder={`${prediction.player1} odds`}
  />

  <input
    type="number"
    step="0.01"
    value={odds2}
    onChange={(e) => setOdds2(Number(e.target.value))}
    placeholder={`${prediction.player2} odds`}
  />

  <p className={(prediction.prediction[prediction.player1] - 100 / odds1) > 0 ? "valuePositive" : "valueNegative"}>
  {prediction.player1}: {(prediction.prediction[prediction.player1] - 100 / odds1) > 0 ? "+" : ""} ({(prediction.prediction[prediction.player1] - 100 / odds1).toFixed(1)}%)
</p>

<p className={(prediction.prediction[prediction.player2] - 100 / odds2) > 0 ? "valuePositive" : "valueNegative"}>
  {prediction.player2}: {(prediction.prediction[prediction.player2] - 100 / odds2) > 0 ? "+" : ""} ({(prediction.prediction[prediction.player2] - 100 / odds2).toFixed(1)}%)
</p>
</div>

 {prediction.factors && (
  <div className="factorBox">
    <h4>Prediction Explain</h4>

    <FactorBar label="Ranking" value={prediction.factors.ranking} />
    <FactorBar label="Form" value={prediction.factors.form} />
    <FactorBar label="Clutch" value={prediction.factors.clutch} />
    <FactorBar label="Momentum" value={prediction.factors.momentum} />

    <p className="surfaceNote">
      Surface: {prediction.factors.surface}
    </p>

    <div className="advantageBox">
      <h4>Matchup Edge</h4>
      <p>Ranking Edge: {p1Data.rank < p2Data.rank ? p1 : p2}</p>
      <p>Serve Edge: {p1Data.serve > p2Data.serve ? p1 : p2}</p>
      <p>Return Edge: {p1Data.return > p2Data.return ? p1 : p2}</p>
      <p>Momentum Edge: {p1Data.momentum > p2Data.momentum ? p1 : p2}</p>
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