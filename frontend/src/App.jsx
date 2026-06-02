import React, { useEffect, useState, useRef } from "react";
import {
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import { Activity, Trophy, Search, Zap, TrendingUp, Calendar, Star } from "lucide-react";
import "./App.css";

// ── Bereinigt API-Namen die in falscher Reihenfolge kommen ───────────────────
const PLAYER_NAME_FIXES = {
  "manuel cerundolo juan": "Juan Manuel Cerundolo",
  "cerundolo juan manuel": "Juan Manuel Cerundolo",
};
function formatPlayerName(name) {
  if (!name) return name;
  const lower = name.toLowerCase().trim();
  if (PLAYER_NAME_FIXES[lower]) return PLAYER_NAME_FIXES[lower];
  return name;
}

function PlayerAutocomplete({ label, playerNum, value, onChange, players, favorites = [], onToggleFavorite }) {
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
  const sortedFiltered = query ? filtered : [
    ...filtered.filter(p => favorites.includes(p)),
    ...filtered.filter(p => !favorites.includes(p))
  ];
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
      {open && sortedFiltered.length > 0 && (
        <ul className="playerDropdown">
          {sortedFiltered.map(name => (
            <li key={name} className={name === value ? "active" : ""} onMouseDown={() => handleSelect(name)}
              style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span>{favorites.includes(name) && <span style={{color:"#facc15",marginRight:"5px"}}>★</span>}{name}</span>
              {onToggleFavorite && (
                <span onMouseDown={(e) => { e.stopPropagation(); onToggleFavorite(name); }}
                  style={{color:favorites.includes(name)?"#facc15":"#334155",fontSize:"14px",cursor:"pointer",padding:"0 4px"}}>
                  {favorites.includes(name) ? "★" : "☆"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {open && players.length === 0 && (
        <div style={{padding:"12px 14px",fontSize:"13px",color:"#475569",background:"#0f172a",border:"1.5px solid rgba(34,211,238,0.2)",borderRadius:"14px",marginTop:"4px"}}>
          ⏳ Loading players... (backend waking up)
        </div>
      )}
    </div>
  );
}

// ── CHANGE 1 & 2: MatchCard — Cancelled Banner + Badge ──────────────────────
// ── BET MODAL ─────────────────────────────────────────────────────────────────
function BetModal({ match, onLog, onAddToCombi, onClose, combiBet = [] }) {
  const prefill = match?.prefill || {};
  const [betType, setBetType] = useState(prefill.betType || "match_winner");
  const [pick, setPick] = useState(prefill.pick || "");
  const [odds, setOdds] = useState(prefill.odds || "");
  const [stake, setStake] = useState("10");
  const [note, setNote] = useState("");
  const [mode, setMode] = useState("single"); // single | combi

  const p1 = match?.player1 || "";
  const p2 = match?.player2 || "";
  const p1Last = p1.split(" ").pop();
  const p2Last = p2.split(" ").pop();
  const matchStr = `${p1} vs ${p2}`;

  const BET_TYPES = [
    { id:"match_winner", label:"🏆 Match Winner",    picks:[ p1, p2 ] },
    { id:"set_2_0",      label:"🎾 Sieg 2-0",         picks:[ `${p1Last} 2-0`, `${p2Last} 2-0` ] },
    { id:"set_2_1",      label:"🎾 Sieg 2-1",         picks:[ `${p1Last} 2-1`, `${p2Last} 2-1` ] },
    { id:"set_3_0",      label:"🎾 Sieg 3-0 (Bo5)",   picks:[ `${p1Last} 3-0`, `${p2Last} 3-0` ] },
    { id:"set_3_1",      label:"🎾 Sieg 3-1 (Bo5)",   picks:[ `${p1Last} 3-1`, `${p2Last} 3-1` ] },
    { id:"set_3_2",      label:"🎾 Sieg 3-2 (Bo5)",   picks:[ `${p1Last} 3-2`, `${p2Last} 3-2` ] },
    { id:"set_hc_15",    label:"📊 +1.5 Sätze Hcap",  picks:[ `${p1Last} +1.5 Sätze`, `${p2Last} +1.5 Sätze` ] },
    { id:"set_hc_25",    label:"📊 +2.5 Sätze Hcap",  picks:[ `${p1Last} +2.5 Sätze`, `${p2Last} +2.5 Sätze` ] },
    { id:"over_3_5",     label:"📈 Over 3.5 Sätze",   picks:[ "Over 3.5 Sets", "Under 3.5 Sets" ] },
    { id:"handicap",     label:"📉 Handicap (Games)", picks:[ `${p1Last} -1.5`, `${p1Last} +1.5`, `${p2Last} -1.5`, `${p2Last} +1.5` ] },
    { id:"total_games",  label:"🔢 Total Games O/U",  picks:[ "Over 22.5", "Under 22.5", "Over 24.5", "Under 24.5", "Over 26.5", "Under 26.5" ] },
    { id:"first_set",    label:"1️⃣ 1. Satz Winner",   picks:[ `${p1Last} 1. Satz`, `${p2Last} 1. Satz` ] },
    { id:"custom",       label:"✏️ Eigene Wette",     picks:[] },
  ];

  const currentType = BET_TYPES.find(t=>t.id===betType) || BET_TYPES[0];
  const oddsVal = parseFloat(odds.replace(",","."));
  const stakeVal = parseFloat(stake) || 10;
  const potentialWin = !isNaN(oddsVal) && oddsVal > 1 ? Math.round(stakeVal * (oddsVal-1) * 100)/100 : null;
  const isValid = pick && odds && !isNaN(oddsVal) && oddsVal > 1;

  // Check if this pick already in combi
  const alreadyInCombi = combiBet.some(c => c.matchStr === matchStr && c.pick === pick);

  const handleSingle = () => {
    if (!isValid) return;
    onLog(matchStr, pick, oddsVal, stakeVal, betType, { note });
    onClose();
  };

  const handleAddCombi = () => {
    if (!isValid || alreadyInCombi) return;
    onAddToCombi({ matchStr, pick, odds: parseFloat(oddsVal), type: betType, note });
    onClose();
  };

  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(4px)"}} onClick={onClose} />
      <div style={{position:"relative",background:"#0f172a",borderRadius:"20px",border:"1px solid rgba(255,255,255,0.1)",padding:"24px",width:"100%",maxWidth:"480px",maxHeight:"90vh",overflowY:"auto",zIndex:1}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"16px"}}>
          <div>
            <div style={{fontSize:"16px",fontWeight:800,color:"#e2e8f0",marginBottom:"4px"}}>📋 Wette loggen</div>
            <div style={{fontSize:"12px",color:"#64748b"}}>{p1Last} vs {p2Last}</div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"8px",color:"#64748b",width:"32px",height:"32px",cursor:"pointer",fontSize:"16px",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>

        {/* Single / Combi toggle */}
        <div style={{display:"flex",gap:"6px",marginBottom:"16px",background:"rgba(255,255,255,0.04)",borderRadius:"10px",padding:"4px"}}>
          {["single","combi"].map(m => (
            <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:"7px",borderRadius:"8px",border:"none",fontWeight:700,fontSize:"13px",cursor:"pointer",
              background:mode===m?"rgba(34,211,238,0.15)":"transparent",
              color:mode===m?"#22d3ee":"#475569"}}>
              {m==="single"?"🎯 Einzelwette":"🔗 Kombi hinzufügen"}
              {m==="combi" && combiBet.length > 0 && <span style={{marginLeft:"6px",background:"rgba(34,211,238,0.2)",borderRadius:"999px",padding:"1px 6px",fontSize:"11px"}}>{combiBet.length}</span>}
            </button>
          ))}
        </div>

        {/* Bet Type */}
        <div style={{marginBottom:"16px"}}>
          <div style={{fontSize:"11px",color:"#64748b",fontWeight:700,textTransform:"uppercase",marginBottom:"8px",letterSpacing:"0.5px"}}>Wett-Typ</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px"}}>
            {BET_TYPES.map(t => (
              <button key={t.id} onClick={()=>{setBetType(t.id);setPick("");}}
                style={{padding:"8px 10px",borderRadius:"10px",border:"none",textAlign:"left",fontSize:"12px",fontWeight:600,cursor:"pointer",
                  background:betType===t.id?"rgba(34,211,238,0.15)":"rgba(255,255,255,0.04)",
                  color:betType===t.id?"#22d3ee":"#64748b",
                  outline:betType===t.id?"1px solid rgba(34,211,238,0.3)":"1px solid transparent"}}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pick */}
        <div style={{marginBottom:"16px"}}>
          <div style={{fontSize:"11px",color:"#64748b",fontWeight:700,textTransform:"uppercase",marginBottom:"8px",letterSpacing:"0.5px"}}>Pick</div>
          {currentType.picks.length > 0 ? (
            <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
              {currentType.picks.map(p => (
                <button key={p} onClick={()=>setPick(p)}
                  style={{padding:"8px 14px",borderRadius:"10px",border:"none",fontSize:"13px",fontWeight:700,cursor:"pointer",
                    background:pick===p?"rgba(74,222,128,0.15)":"rgba(255,255,255,0.05)",
                    color:pick===p?"#4ade80":"#94a3b8",
                    outline:pick===p?"1px solid rgba(74,222,128,0.3)":"1px solid transparent"}}>
                  {p}
                </button>
              ))}
            </div>
          ) : (
            <input value={pick} onChange={e=>setPick(e.target.value)} placeholder="Eigener Pick..."
              style={{width:"100%",padding:"10px 14px",borderRadius:"10px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#e2e8f0",fontSize:"14px",outline:"none",boxSizing:"border-box"}} />
          )}
        </div>

        {/* Odds + Stake (stake only for single) */}
        <div style={{display:"grid",gridTemplateColumns:mode==="single"?"1fr 1fr":"1fr",gap:"12px",marginBottom:"16px"}}>
          <div>
            <div style={{fontSize:"11px",color:"#64748b",fontWeight:700,textTransform:"uppercase",marginBottom:"6px",letterSpacing:"0.5px"}}>Quote</div>
            <input value={odds} onChange={e=>setOdds(e.target.value)} placeholder="z.B. 1.85" inputMode="decimal"
              style={{width:"100%",padding:"10px 14px",borderRadius:"10px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#e2e8f0",fontSize:"15px",fontWeight:700,outline:"none",boxSizing:"border-box"}} />
          </div>
          {mode==="single" && (
            <div>
              <div style={{fontSize:"11px",color:"#64748b",fontWeight:700,textTransform:"uppercase",marginBottom:"6px",letterSpacing:"0.5px"}}>Einsatz (€)</div>
              <input value={stake} onChange={e=>setStake(e.target.value)} placeholder="10" inputMode="decimal"
                style={{width:"100%",padding:"10px 14px",borderRadius:"10px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#e2e8f0",fontSize:"15px",fontWeight:700,outline:"none",boxSizing:"border-box"}} />
            </div>
          )}
        </div>

        {/* Potential win (single only) */}
        {mode==="single" && potentialWin !== null && (
          <div style={{marginBottom:"16px",padding:"10px 14px",borderRadius:"10px",background:"rgba(74,222,128,0.06)",border:"1px solid rgba(74,222,128,0.2)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:"12px",color:"#64748b"}}>Möglicher Gewinn</span>
            <span style={{fontSize:"16px",fontWeight:800,color:"#4ade80"}}>+{potentialWin}€</span>
          </div>
        )}

        {/* Combi info */}
        {mode==="combi" && combiBet.length > 0 && (
          <div style={{marginBottom:"16px",padding:"10px 14px",borderRadius:"10px",background:"rgba(34,211,238,0.06)",border:"1px solid rgba(34,211,238,0.2)"}}>
            <div style={{fontSize:"11px",color:"#64748b",marginBottom:"6px"}}>Bereits in Kombi:</div>
            {combiBet.map((c,i) => (
              <div key={i} style={{fontSize:"12px",color:"#22d3ee",marginBottom:"2px"}}>✓ {c.pick} <span style={{color:"#475569"}}>@ {c.odds}</span></div>
            ))}
            <div style={{marginTop:"6px",fontSize:"11px",color:"#64748b"}}>
              Kombi-Quote: <strong style={{color:"#facc15"}}>{combiBet.reduce((acc,c)=>acc*c.odds,1).toFixed(2)}</strong>
              {pick && !isNaN(oddsVal) && oddsVal > 1 && <span style={{color:"#4ade80"}}> → mit diesem Pick: {(combiBet.reduce((acc,c)=>acc*c.odds,1)*oddsVal).toFixed(2)}</span>}
            </div>
          </div>
        )}

        {/* Note */}
        <div style={{marginBottom:"20px"}}>
          <div style={{fontSize:"11px",color:"#64748b",fontWeight:700,textTransform:"uppercase",marginBottom:"6px",letterSpacing:"0.5px"}}>Notiz (optional)</div>
          <input value={note} onChange={e=>setNote(e.target.value)} placeholder="z.B. Value wegen News..."
            style={{width:"100%",padding:"10px 14px",borderRadius:"10px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#e2e8f0",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
        </div>

        {/* Submit buttons */}
        {mode==="single" ? (
          <button onClick={handleSingle} disabled={!isValid}
            style={{width:"100%",padding:"14px",borderRadius:"12px",border:"none",fontWeight:800,fontSize:"15px",cursor:isValid?"pointer":"not-allowed",
              background:isValid?"linear-gradient(135deg,#22d3ee,#4ade80)":"rgba(255,255,255,0.05)",
              color:isValid?"#0f172a":"#334155",transition:"all 0.2s"}}>
            ✅ Einzelwette loggen
          </button>
        ) : (
          <button onClick={handleAddCombi} disabled={!isValid||alreadyInCombi}
            style={{width:"100%",padding:"14px",borderRadius:"12px",border:"none",fontWeight:800,fontSize:"15px",cursor:isValid&&!alreadyInCombi?"pointer":"not-allowed",
              background:isValid&&!alreadyInCombi?"linear-gradient(135deg,#a78bfa,#22d3ee)":"rgba(255,255,255,0.05)",
              color:isValid&&!alreadyInCombi?"#0f172a":"#334155",transition:"all 0.2s"}}>
            {alreadyInCombi?"✓ Bereits hinzugefügt":"🔗 Zur Kombi hinzufügen"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── COMBI SLIP COMPONENT ──────────────────────────────────────────────────────
function CombiSlip({ combiBet = [], setCombiBet, valuePerformance = [], setValuePerformance, visible = false, onClose }) {
  const [combiStake, setCombiStake] = React.useState("10");
  const stakeNum = parseFloat(combiStake) || 10;
  const safeBets = combiBet.filter(c => c && typeof c.odds !== "undefined");
  const totalOdds = safeBets.length > 0 ? safeBets.reduce((a,c) => a * (parseFloat(c.odds)||1), 1) : 1;
  const potWin = Math.round(stakeNum * (totalOdds - 1) * 100) / 100;

  if (!visible) return null;

  const handleLog = () => {
    const entry = {
      id: Date.now(),
      type: "combi",
      match: safeBets.map(c=>c.pick).join(" + "),
      pick: safeBets.map(c=>c.pick).join(" + "),
      odds: Math.round(totalOdds * 100) / 100,
      stake: stakeNum,
      result: null, profit: null,
      date: new Date().toISOString(),
      combiBets: safeBets,
      note: `${safeBets.length}er Kombi`
    };
    const updated = [entry, ...(valuePerformance||[])].slice(0, 200);
    setValuePerformance(updated);
    localStorage.setItem("valuePerformance", JSON.stringify(updated));
    setCombiBet([]);
    onClose();
  };

  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"16px"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(4px)"}} onClick={onClose} />
      <div style={{position:"relative",background:"#0f172a",borderRadius:"20px 20px 16px 16px",border:"1px solid rgba(167,139,250,0.3)",padding:"24px",width:"100%",maxWidth:"480px",zIndex:1,maxHeight:"85vh",overflowY:"auto"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
          <div>
            <div style={{fontSize:"16px",fontWeight:800,color:"#e2e8f0"}}>🔗 Kombiwette</div>
            <div style={{fontSize:"12px",color:"#64748b"}}>{combiBet.length} Picks · Gesamtquote {totalOdds.toFixed(2)}</div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.05)",border:"none",borderRadius:"8px",color:"#64748b",width:"32px",height:"32px",cursor:"pointer",fontSize:"16px",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>

        {/* Picks list */}
        <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"16px"}}>
          {combiBet.map((c,i) => (
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",borderRadius:"10px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"13px",fontWeight:600,color:"#e2e8f0",marginBottom:"2px"}}>{c.pick}</div>
                <div style={{fontSize:"11px",color:"#64748b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.matchStr}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"10px",flexShrink:0}}>
                <span style={{fontSize:"15px",fontWeight:800,color:"#facc15"}}>{c.odds}</span>
                <button onClick={() => setCombiBet(prev => prev.filter((_,j) => j !== i))}
                  style={{background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:"6px",color:"#f87171",width:"26px",height:"26px",cursor:"pointer",fontSize:"13px",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              </div>
            </div>
          ))}
        </div>

        {/* Total odds display */}
        <div style={{padding:"12px 14px",borderRadius:"12px",background:"rgba(167,139,250,0.08)",border:"1px solid rgba(167,139,250,0.2)",marginBottom:"16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:"13px",color:"#94a3b8"}}>Gesamtquote</span>
          <span style={{fontSize:"24px",fontWeight:900,color:"#a78bfa"}}>{totalOdds.toFixed(2)}</span>
        </div>

        {/* Stake input */}
        <div style={{marginBottom:"12px"}}>
          <div style={{fontSize:"11px",color:"#64748b",fontWeight:700,textTransform:"uppercase",marginBottom:"6px",letterSpacing:"0.5px"}}>Einsatz (€)</div>
          <div style={{display:"flex",gap:"8px",marginBottom:"8px"}}>
            {[5,10,20,50].map(v => (
              <button key={v} onClick={() => setCombiStake(String(v))}
                style={{flex:1,padding:"8px",borderRadius:"8px",border:"none",fontWeight:700,fontSize:"13px",cursor:"pointer",
                  background:combiStake===String(v)?"rgba(34,211,238,0.15)":"rgba(255,255,255,0.05)",
                  color:combiStake===String(v)?"#22d3ee":"#475569"}}>
                {v}€
              </button>
            ))}
          </div>
          <input value={combiStake} onChange={e => setCombiStake(e.target.value)} inputMode="decimal"
            style={{width:"100%",padding:"10px 14px",borderRadius:"10px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#e2e8f0",fontSize:"15px",fontWeight:700,outline:"none",boxSizing:"border-box"}} />
        </div>

        {/* Potential win */}
        <div style={{padding:"10px 14px",borderRadius:"10px",background:"rgba(74,222,128,0.06)",border:"1px solid rgba(74,222,128,0.2)",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
          <div>
            <div style={{fontSize:"11px",color:"#64748b"}}>Einsatz</div>
            <div style={{fontSize:"14px",fontWeight:700,color:"#94a3b8"}}>{stakeNum}€</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:"11px",color:"#64748b"}}>Quote</div>
            <div style={{fontSize:"14px",fontWeight:700,color:"#a78bfa"}}>{totalOdds.toFixed(2)}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:"11px",color:"#64748b"}}>Möglicher Gewinn</div>
            <div style={{fontSize:"20px",fontWeight:900,color:"#4ade80"}}>+{potWin}€</div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{display:"flex",gap:"10px"}}>
          <button onClick={handleLog}
            style={{flex:1,padding:"14px",borderRadius:"12px",border:"none",fontWeight:800,fontSize:"15px",cursor:"pointer",background:"linear-gradient(135deg,#a78bfa,#22d3ee)",color:"#0f172a"}}>
            ✅ Kombi loggen
          </button>
          <button onClick={() => { setCombiBet([]); onClose(); }}
            style={{padding:"14px 18px",borderRadius:"12px",border:"1px solid rgba(248,113,113,0.3)",background:"rgba(248,113,113,0.06)",color:"#f87171",cursor:"pointer",fontWeight:700,fontSize:"13px"}}>
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

function MatchCard({ m, onClick, players = [], onWatchlist, isWatched, onCompare, streaks = {}, quickOdds = {}, onQuickOddsChange, favoritePlayers = [], onLogBet }) {
  const isLive = m.live;
  const isFinished = m.finished;
  const isCancelled = m.cancelled;
  const catAtp = m.category?.includes("ATP");
  const sets = Array.isArray(m.sets) && m.sets.length > 0 ? m.sets : [];
  const setCount = sets.length === 0 && m.score && m.score !== "-"
    ? (() => { const parts = m.score.replace(/ /g, "").split("-"); return { p1: parts[0], p2: parts[1] }; })() : null;
  const gameParts = m.gameScore && m.gameScore !== "-" ? m.gameScore.split("-").map(s => s.trim()) : null;

  // Streak helpers
  const getStreak = (playerName) => {
    if (!playerName) return null;
    const lastName = playerName.trim().split(" ").pop();
    for (const [key, val] of Object.entries(streaks)) {
      if (key.toLowerCase().includes(lastName.toLowerCase())) return val;
    }
    return null;
  };
  const streak1 = getStreak(m.player1);
  const streak2 = getStreak(m.player2);
  const isFav1 = favoritePlayers.some(f => m.player1?.toLowerCase().includes(f.toLowerCase().split(" ").pop()));
  const isFav2 = favoritePlayers.some(f => m.player2?.toLowerCase().includes(f.toLowerCase().split(" ").pop()));
  const hasFav = isFav1 || isFav2;
  const matchKey = m.matchKey || `${m.player1}|${m.player2}`;
  const qo = quickOdds[matchKey] || {};

  const StreakBadge = ({ streak }) => {
    if (!streak || streak.count < 2) return null;
    const color = streak.won ? "#4ade80" : "#f87171";
    const icon = streak.won ? "🔥" : "❄️";
    return (
      <span style={{fontSize:"10px",fontWeight:700,color,background:`${color}18`,border:`1px solid ${color}33`,borderRadius:"5px",padding:"1px 5px",marginLeft:"4px"}}>
        {icon} {streak.count}
      </span>
    );
  };

  return (
    // CHANGE 2: rötlicher Border + Graustich für cancelled
    <div className="matchCard" style={isCancelled ? {borderColor:"rgba(239,68,68,0.35)",opacity:0.72,filter:"grayscale(0.25)"} : hasFav ? {borderColor:"rgba(250,204,21,0.35)",boxShadow:"0 0 12px rgba(250,204,21,0.08)"} : {}}>

      {/* Favorite player highlight banner */}
      {hasFav && !isCancelled && (
        <div style={{background:"rgba(250,204,21,0.08)",borderBottom:"1px solid rgba(250,204,21,0.2)",padding:"4px 14px",fontSize:"10px",fontWeight:700,color:"#facc15",display:"flex",alignItems:"center",gap:"6px"}}>
          ⭐ Favoriten-Match
        </div>
      )}

      {/* CHANGE 2: Roter Banner-Strip oben bei cancelled */}
      {isCancelled && (
        <div style={{
          background:"rgba(239,68,68,0.1)",
          borderBottom:"1px solid rgba(239,68,68,0.25)",
          padding:"6px 14px",
          display:"flex",
          alignItems:"center",
          gap:"7px",
          fontSize:"11px",
          fontWeight:700,
          color:"#ef4444",
          letterSpacing:"0.5px"
        }}>
          <span style={{width:"7px",height:"7px",borderRadius:"50%",background:"#ef4444",flexShrink:0,display:"inline-block"}} />
          MATCH ABGESAGT / CANCELLED
        </div>
      )}

      <div onClick={onClick} style={{cursor:"pointer"}}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <span className={`matchCardBadge ${catAtp ? "atp" : "challenger"}`}>{m.category}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {isLive && <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#f87171", boxShadow: "0 0 6px #f87171", animation: "pulse 1.5s infinite", display: "inline-block" }} />}
            {/* CHANGE 1: Cancelled Badge — rot statt gelb, klarer sichtbar */}
            {isCancelled
              ? <span style={{ fontSize: "11px", color: "#ef4444", fontWeight: 700, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", padding: "2px 8px" }}>🚫 Abgesagt</span>
              : isLive ? <span style={{ fontSize: "11px", color: "#f87171", fontWeight: 700 }}>LIVE · {m.status}</span>
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
            <div style={{ fontSize: "14px", color: "#e2e8f0", fontWeight: 600, marginBottom: "4px", textDecoration: isCancelled ? "line-through" : "none", textDecorationColor: "#ef4444", display:"flex", alignItems:"center" }}>
              {isFav1 && <span style={{marginRight:"4px"}}>⭐</span>}{m.player1}<StreakBadge streak={streak1} />
            </div>
            <div style={{ fontSize: "14px", color: "#e2e8f0", fontWeight: 600, textDecoration: isCancelled ? "line-through" : "none", textDecorationColor: "#ef4444", display:"flex", alignItems:"center" }}>
              {isFav2 && <span style={{marginRight:"4px"}}>⭐</span>}{m.player2}<StreakBadge streak={streak2} />
            </div>
          </div>
        )}
        <div className="matchCardMeta" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>{m.tournament}</span>
          {m.court && <span style={{fontSize:"10px",color:"#475569",background:"rgba(255,255,255,0.04)",borderRadius:"4px",padding:"1px 6px"}}>🎾 {m.court}</span>}
        </div>
      </div>

      {/* Quick Value Check — odds input directly on card */}
      {!isFinished && !isCancelled && (
        <div style={{padding:"6px 0 0",display:"flex",gap:"6px",alignItems:"center"}}>
          <input
            type="text" inputMode="decimal"
            placeholder={`${(m.player1||"").split(" ").pop()} Quote`}
            value={qo.o1||""}
            onChange={e => onQuickOddsChange && onQuickOddsChange(matchKey, "o1", e.target.value)}
            onClick={e => e.stopPropagation()}
            style={{flex:1,padding:"5px 8px",borderRadius:"7px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"#e2e8f0",fontSize:"12px",outline:"none"}}
          />
          <input
            type="text" inputMode="decimal"
            placeholder={`${(m.player2||"").split(" ").pop()} Quote`}
            value={qo.o2||""}
            onChange={e => onQuickOddsChange && onQuickOddsChange(matchKey, "o2", e.target.value)}
            onClick={e => e.stopPropagation()}
            style={{flex:1,padding:"5px 8px",borderRadius:"7px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"#e2e8f0",fontSize:"12px",outline:"none"}}
          />
          {qo.o1 && qo.o2 && (() => {
            const o1 = parseFloat(qo.o1.replace(",",".")), o2 = parseFloat(qo.o2.replace(",","."));
            if (isNaN(o1)||isNaN(o2)||o1<=1||o2<=1) return null;
            const imp1=1/o1, imp2=1/o2, total=imp1+imp2;
            const fair1=Math.round((imp1/total)*100), fair2=100-fair1;
            const better = fair1 > fair2 ? m.player1?.split(" ").pop() : m.player2?.split(" ").pop();
            const edge = Math.abs(fair1-fair2);
            return (
              <span style={{fontSize:"10px",fontWeight:700,color:edge>10?"#4ade80":"#facc15",whiteSpace:"nowrap",cursor:"pointer"}}
                onClick={e=>{e.stopPropagation();setP1(m.player1);setP2(m.player2);setOdds1Str(qo.o1);setOdds2Str(qo.o2);setOdds1(o1);setOdds2(o2);setTab("predictor");}}>
                {better} {fair1>fair2?fair1:fair2}% →
              </span>
            );
          })()}
        </div>
      )}

      {/* CHANGE 3: Action buttons — bei cancelled komplett ausgeblendet (macht keinen Sinn) */}
      {!isFinished && !isCancelled && (
        <div style={{display:"flex",gap:"6px",marginTop:"8px",flexWrap:"wrap"}}>
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            style={{flex:1,padding:"6px",borderRadius:"8px",border:"1px solid rgba(34,211,238,0.25)",background:"rgba(34,211,238,0.06)",color:"#22d3ee",fontSize:"11px",fontWeight:600,cursor:"pointer"}}>
            ⚡ Predict
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); if(onCompare) onCompare(m.player1, m.player2); }}
            style={{flex:1,padding:"6px",borderRadius:"8px",border:"1px solid rgba(139,92,246,0.25)",background:"rgba(139,92,246,0.06)",color:"#a78bfa",fontSize:"11px",fontWeight:600,cursor:"pointer"}}>
            📊 Compare
          </button>
          {!isCancelled && !isFinished && onLogBet && (
            <button
              onClick={(e) => { e.stopPropagation(); onLogBet({...m, prefill: qo.o1 ? { odds: qo.o1 } : {}}); }}
              style={{flex:1,padding:"6px",borderRadius:"8px",border:"1px solid rgba(74,222,128,0.25)",background:"rgba(74,222,128,0.06)",color:"#4ade80",fontSize:"11px",fontWeight:600,cursor:"pointer"}}>
              📋 Wette
            </button>
          )}
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
  const [tournamentView, setTournamentView] = useState({});
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
  const [odds35, setOdds35] = useState("");
  const [odds35Str, setOdds35Str] = useState("");
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
  const [matchSearch, setMatchSearch] = useState("");
  const [dashShowAll, setDashShowAll] = useState(false);
  const [standings, setStandings] = useState([]);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [surfaceRankings, setSurfaceRankings] = useState(null);
  const [surfaceRankingsLoading, setSurfaceRankingsLoading] = useState(false);
  const [rankingsTab, setRankingsTab] = useState("overall"); // overall | hard | clay | grass
  const [newsAnalysis, setNewsAnalysis] = useState(null);
  const [newsAnalysisLoading, setNewsAnalysisLoading] = useState(false);
  const [streaks, setStreaks] = useState({});
  const [quickOdds, setQuickOdds] = useState({});
  const [calendarData, setCalendarData] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [compareMode, setCompareMode] = useState(false); // Feature 7 // matchKey → {o1, o2}
  const [pwaInstallable, setPwaInstallable] = useState(false);
  const [pwaInstalled, setPwaInstalled] = useState(false);

  useEffect(() => {
    const onInstallable = () => setPwaInstallable(true);
    const onInstalled = () => { setPwaInstallable(false); setPwaInstalled(true); };
    window.addEventListener('pwa-installable', onInstallable);
    window.addEventListener('pwa-installed', onInstalled);
    // Check if already running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) setPwaInstalled(true);
    return () => {
      window.removeEventListener('pwa-installable', onInstallable);
      window.removeEventListener('pwa-installed', onInstalled);
    };
  }, []);

  // ── Favorite Players ─────────────────────────────────────────────────────────
  const [favoritePlayers, setFavoritePlayers] = useState(() => {
    try { return JSON.parse(localStorage.getItem("favoritePlayers") || "[]"); } catch { return []; }
  });
  const toggleFavoritePlayer = (name) => {
    const updated = favoritePlayers.includes(name)
      ? favoritePlayers.filter(n => n !== name)
      : [...favoritePlayers, name].slice(0, 5);
    setFavoritePlayers(updated);
    localStorage.setItem("favoritePlayers", JSON.stringify(updated));
  };
  const isFavoritePlayer = (name) => favoritePlayers.includes(name);

  // ── Match History Log ────────────────────────────────────────────────────────
  const [matchHistory, setMatchHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("matchHistory") || "[]"); } catch { return []; }
  });
  const addToHistory = (p1, p2, surface, result) => {
    const entry = {
      id: Date.now(), p1, p2, surface,
      prediction: result?.prediction,
      winner: result?.prediction?.[p1] > result?.prediction?.[p2] ? p1 : p2,
      confidence: result?.confidence,
      date: new Date().toISOString(),
      bo: result?.bo || 3
    };
    const updated = [entry, ...matchHistory].slice(0, 50);
    setMatchHistory(updated);
    localStorage.setItem("matchHistory", JSON.stringify(updated));
  };
  const clearHistory = () => {
    setMatchHistory([]);
    localStorage.removeItem("matchHistory");
  };

  // ── Prediction Accuracy Tracker ──────────────────────────────────────────────
  const [accuracyLog, setAccuracyLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem("accuracyLog") || "[]"); } catch { return []; }
  });
  const markPredictionResult = (historyId, actualWinner) => {
    const entry = matchHistory.find(h => h.id === historyId);
    if (!entry) return;
    const correct = entry.winner === actualWinner;
    const updatedHistory = matchHistory.map(h => h.id === historyId ? {...h, actualWinner, correct, resolvedAt: new Date().toISOString()} : h);
    setMatchHistory(updatedHistory);
    localStorage.setItem("matchHistory", JSON.stringify(updatedHistory));
    const log = [{id: historyId, p1: entry.p1, p2: entry.p2, predicted: entry.winner, actual: actualWinner, correct, confidence: entry.confidence, surface: entry.surface, date: entry.date}, ...accuracyLog].slice(0, 100);
    setAccuracyLog(log);
    localStorage.setItem("accuracyLog", JSON.stringify(log));
  };

  // ── Value Pick Performance / ROI ──────────────────────────────────────────────
  const [valuePerformance, setValuePerformance] = useState(() => {
    try { return JSON.parse(localStorage.getItem("valuePerformance") || "[]"); } catch { return []; }
  });
  const [betModal, setBetModal] = useState(null);
  const [combiBet, setCombiBet] = useState([]); // Array of {match, pick, odds, type}
  const [showCombiSlip, setShowCombiSlip] = useState(false);

  const logValueBet = (match, pick, odds, stake=10, type="match_winner", extra={}) => {
    const entry = { id:Date.now(), match, pick, odds, stake, result:null, profit:null,
                    date:new Date().toISOString(), type, ...extra };
    const updated = [entry, ...valuePerformance].slice(0, 200);
    setValuePerformance(updated);
    localStorage.setItem("valuePerformance", JSON.stringify(updated));
    return entry.id;
  };
  const resolveValueBet = (betId, won) => {
    const updated = valuePerformance.map(b => {
      if (b.id !== betId) return b;
      const profit = won ? b.stake * (b.odds - 1) : -b.stake;
      return {...b, result: won?"won":"lost", profit, resolvedAt: new Date().toISOString()};
    });
    setValuePerformance(updated);
    localStorage.setItem("valuePerformance", JSON.stringify(updated));
  };

  // ── Feature 6: Auto Value Pick Tracking ──────────────────────────────────
  useEffect(() => {
    if (valuePerformance.length === 0 || fixtures.length === 0) return;
    const unresolved = valuePerformance.filter(b => b.result === null);
    if (unresolved.length === 0) return;
    let updated = false;
    const newPerf = valuePerformance.map(b => {
      if (b.result !== null) return b;
      // Find matching fixture
      const matchParts = b.match.split(" vs ");
      if (matchParts.length !== 2) return b;
      const [p1name, p2name] = matchParts;
      const p1Last = p1name.trim().split(" ").pop().toLowerCase();
      const p2Last = p2name.trim().split(" ").pop().toLowerCase();
      const fixture = fixtures.find(f => {
        const f1 = (f.player1||"").toLowerCase(), f2 = (f.player2||"").toLowerCase();
        return (f1.includes(p1Last) && f2.includes(p2Last)) || (f1.includes(p2Last) && f2.includes(p1Last));
      });
      if (!fixture || !fixture.finished) return b;
      // Match is finished — determine if pick won
      const pickLast = (b.pick||"").trim().split(" ").pop().toLowerCase();
      // Find winner from sets
      let winner = null;
      if (fixture.sets?.length > 0) {
        const p1Sets = fixture.sets.filter(s=>parseInt(s.p1)>parseInt(s.p2)).length;
        const p2Sets = fixture.sets.filter(s=>parseInt(s.p2)>parseInt(s.p1)).length;
        if (p1Sets > p2Sets) winner = fixture.player1;
        else if (p2Sets > p1Sets) winner = fixture.player2;
      }
      if (!winner) return b;
      const won = winner.toLowerCase().includes(pickLast);
      const profit = won ? b.stake * (b.odds - 1) : -b.stake;
      updated = true;
      console.log(`[AutoTrack] ${b.match} → Pick: ${b.pick} → ${won?"WON":"LOST"}`);
      return { ...b, result: won?"won":"lost", profit, resolvedAt: new Date().toISOString(), autoResolved: true };
    });
    if (updated) {
      setValuePerformance(newPerf);
      localStorage.setItem("valuePerformance", JSON.stringify(newPerf));
    }
  }, [fixtures]);
  const [notifPermission, setNotifPermission] = useState(() => typeof Notification !== "undefined" ? Notification.permission : "denied");
  const [notifiedMatches, setNotifiedMatches] = useState(() => {
    try { return JSON.parse(localStorage.getItem("notifiedMatches") || "[]"); } catch { return []; }
  });
  const requestNotifications = async () => {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  };
  const sendNotification = (title, body, onClick) => {
    if (notifPermission !== "granted") return;
    const n = new Notification(title, { body, icon: "/favicon.ico" });
    if (onClick) n.onclick = onClick;
  };
  useEffect(() => {
    if (notifPermission !== "granted" || watchlist.length === 0) return;
    const liveKeys = fixtures.filter(m => m.live).map(m => `${m.player1}|${m.player2}|${m.tournament}`);
    liveKeys.forEach(key => {
      if (!notifiedMatches.includes(key) && watchlist.find(w => w.key === key)) {
        const m = watchlist.find(w => w.key === key);
        sendNotification("🎾 Match is LIVE!", `${m.player1} vs ${m.player2} — ${m.tournament}`);
        const updated = [...notifiedMatches, key];
        setNotifiedMatches(updated);
        localStorage.setItem("notifiedMatches", JSON.stringify(updated));
      }
    });
  }, [fixtures, notifPermission]);
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
  const playerNames = safePlayers.map(p => formatPlayerName(getPlayerName(p))).filter(Boolean);
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
    found = safePlayers.find(p => getPlayerName(p).toLowerCase().includes(lastName)) || null;
    if (found) return found;
    if (name.length > 1) return { name, rank: 100, elo: 1800, hard: 0, clay: 0, grass: 0 };
    return null;
  };
  const p1Data = findPlayer(p1);
  const p2Data = findPlayer(p2);
  const winner = prediction?.prediction?.[prediction?.player1] > prediction?.prediction?.[prediction?.player2] ? prediction?.player1 : prediction?.player2;

  useEffect(() => {
    const loadPlayers = (attempt = 1) => {
      fetch("https://tennis-edge-backend.onrender.com/api/players")
        .then(res => { if (!res.ok) throw new Error("API error"); return res.json(); })
        .then(data => {
          const formatted = Array.isArray(data) ? data : [];
          if (formatted.length === 0 && attempt < 5) {
            setTimeout(() => loadPlayers(attempt + 1), 3000);
            return;
          }
          setPlayers(formatted);
          if (formatted.length > 0) setPlayer(getPlayerName(formatted[0]));
          if (formatted.length > 1) { setP1(getPlayerName(formatted[0])); setP2(getPlayerName(formatted[1])); }
        }).catch(err => {
          console.error("PLAYERS ERROR:", err);
          if (attempt < 5) setTimeout(() => loadPlayers(attempt + 1), 4000);
        });
    };
    loadPlayers();
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
    fetch(`https://tennis-edge-backend.onrender.com/api/h2h?p1_key=${p1D.player_key}&p2_key=${p2D.player_key}&p1_name=${encodeURIComponent(h2hP1)}&p2_name=${encodeURIComponent(h2hP2)}`)
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
    if (!p1 || !p2) return;
    const r1 = p1Data?.rank || 100;
    const r2 = p2Data?.rank || 100;
    setNewsAnalysis(null);
    fetch(`https://tennis-edge-backend.onrender.com/api/predict?p1=${encodeURIComponent(p1)}&p2=${encodeURIComponent(p2)}&rank1=${r1}&rank2=${r2}&surface=${surface}&surface1=${p1Data?.[surface] || 0}&surface2=${p2Data?.[surface] || 0}&bo=${bestOf}`)
      .then(res => res.json()).then(data => {
        setPrediction(data);
        addToHistory(p1, p2, surface, data);
        analyzeNewsForPrediction(p1, p2, data.prediction?.[p1] || 50);
      }).catch(err => console.error(err));
  };

  const analyzeNewsForPrediction = async (player1, player2, baseProb1) => {
    setNewsAnalysisLoading(true);
    try {
      // Step 1: Fetch news
      const [news1Res, news2Res] = await Promise.all([
        fetch(`https://tennis-edge-backend.onrender.com/api/news/${encodeURIComponent(player1)}`).then(r=>r.json()).catch(()=>[]),
        fetch(`https://tennis-edge-backend.onrender.com/api/news/${encodeURIComponent(player2)}`).then(r=>r.json()).catch(()=>[])
      ]);

      const headlines1 = (Array.isArray(news1Res) ? news1Res : []).slice(0,5).map(n=>n.title).filter(Boolean);
      const headlines2 = (Array.isArray(news2Res) ? news2Res : []).slice(0,5).map(n=>n.title).filter(Boolean);

      if (headlines1.length === 0 && headlines2.length === 0) {
        setNewsAnalysis({ noNews: true });
        setNewsAnalysisLoading(false);
        return;
      }

      // Step 2: Call backend proxy
      let response;
      try {
        response = await fetch("https://tennis-edge-backend.onrender.com/api/news-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ player1, player2, headlines1, headlines2, baseProb1 })
        });
      } catch(fetchErr) {
        throw new Error(`Backend nicht erreichbar: ${fetchErr.message}`);
      }

      if (!response.ok) {
        const errText = await response.text().catch(()=>"");
        throw new Error(`Backend Fehler ${response.status}: ${errText.slice(0,100)}`);
      }

      // Step 3: Parse response
      let parsed;
      try {
        parsed = await response.json();
      } catch(parseErr) {
        throw new Error(`JSON Parse Fehler: ${parseErr.message}`);
      }

      if (parsed.noNews) {
        setNewsAnalysis({ noNews: true });
        setNewsAnalysisLoading(false);
        return;
      }

      if (parsed.error) {
        throw new Error(`Claude Fehler: ${parsed.error}`);
      }

      const rawMod1 = parsed.player1?.modifier || 0;
      const rawMod2 = parsed.player2?.modifier || 0;
      const netMod = rawMod1 - rawMod2;
      const adjustedProb1 = Math.min(95, Math.max(5, Math.round(baseProb1 + netMod)));
      const adjustedProb2 = 100 - adjustedProb1;

      setNewsAnalysis({
        player1: { name: player1, ...parsed.player1, headlines: headlines1 },
        player2: { name: player2, ...parsed.player2, headlines: headlines2 },
        overall_impact: parsed.overall_impact,
        summary: parsed.summary,
        baseProb1: Math.round(baseProb1),
        baseProb2: Math.round(100 - baseProb1),
        adjustedProb1,
        adjustedProb2,
        netMod
      });
    } catch(err) {
      console.error("News analysis error:", err);
      setNewsAnalysis({ error: true, errorMsg: err.message });
    }
    setNewsAnalysisLoading(false);
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
    // Load streaks once
    fetch("https://tennis-edge-backend.onrender.com/api/streaks")
      .then(r=>r.json()).then(d=>setStreaks(d||{})).catch(()=>{});
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

  if (playersLoading && playerNames.length === 0) {
    setTimeout(() => setPlayersLoading(false), 3000);
    return (
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#020817"}}>
        <div style={{textAlign:"center",maxWidth:"620px",padding:"40px 20px"}}>
          <div style={{marginBottom:"32px"}}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 200" style={{width:"420px",maxWidth:"100%",height:"auto",borderRadius:"10px"}}>
              <rect x="0" y="0" width="480" height="200" rx="8" fill="#1a5c38"/>
              <rect x="30" y="20" width="420" height="160" fill="#2e7d4f"/>
              <rect x="30" y="20" width="420" height="160" fill="none" stroke="#ffffff" stroke-width="2"/>
              <line x1="56" y1="20" x2="56" y2="180" stroke="#ffffff" stroke-width="1.5"/>
              <line x1="424" y1="20" x2="424" y2="180" stroke="#ffffff" stroke-width="1.5"/>
              <line x1="240" y1="20" x2="240" y2="180" stroke="#ffffff" stroke-width="1.5"/>
              <line x1="56" y1="63" x2="240" y2="63" stroke="#ffffff" stroke-width="1.5"/>
              <line x1="240" y1="63" x2="424" y2="63" stroke="#ffffff" stroke-width="1.5"/>
              <line x1="56" y1="137" x2="240" y2="137" stroke="#ffffff" stroke-width="1.5"/>
              <line x1="240" y1="137" x2="424" y2="137" stroke="#ffffff" stroke-width="1.5"/>
              <line x1="148" y1="63" x2="148" y2="137" stroke="#ffffff" stroke-width="1.5"/>
              <line x1="332" y1="63" x2="332" y2="137" stroke="#ffffff" stroke-width="1.5"/>
              <line x1="240" y1="20" x2="240" y2="28" stroke="#ffffff" stroke-width="2"/>
              <line x1="240" y1="172" x2="240" y2="180" stroke="#ffffff" stroke-width="2"/>
              <rect x="27" y="93" width="6" height="14" rx="2" fill="#cccccc"/>
              <rect x="447" y="93" width="6" height="14" rx="2" fill="#cccccc"/>
              <line x1="30" y1="100" x2="450" y2="100" stroke="#cccccc" stroke-width="2"/>
              <line x1="30" y1="95" x2="450" y2="95" stroke="#cccccc" stroke-width="0.7" opacity="0.5"/>
              <line x1="30" y1="105" x2="450" y2="105" stroke="#cccccc" stroke-width="0.7" opacity="0.5"/>
              <rect x="30" y="20" width="420" height="160" fill="#000000" opacity="0.40"/>
              <text x="240" y="88" font-family="system-ui,sans-serif" font-size="44" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="-1">Courtside</text>
              <text x="240" y="138" font-family="system-ui,sans-serif" font-size="44" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">IQ</text>
              <text x="240" y="162" font-family="system-ui,sans-serif" font-size="10" font-weight="500" fill="#4ade80" text-anchor="middle" letter-spacing="4">SMART TENNIS ANALYTICS</text>
            </svg>
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
        <div style={{marginBottom:"4px"}}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80" style={{width:"160px",height:"64px"}}>
            <rect x="0" y="0" width="200" height="80" rx="6" fill="#1a5c38"/>
            <rect x="10" y="8" width="180" height="64" fill="#2e7d4f"/>
            <rect x="10" y="8" width="180" height="64" fill="none" stroke="#ffffff" stroke-width="1.5"/>
            <line x1="21" y1="8" x2="21" y2="72" stroke="#ffffff" stroke-width="1"/>
            <line x1="179" y1="8" x2="179" y2="72" stroke="#ffffff" stroke-width="1"/>
            <line x1="100" y1="8" x2="100" y2="72" stroke="#ffffff" stroke-width="1"/>
            <line x1="21" y1="26" x2="100" y2="26" stroke="#ffffff" stroke-width="1"/>
            <line x1="100" y1="26" x2="179" y2="26" stroke="#ffffff" stroke-width="1"/>
            <line x1="21" y1="54" x2="100" y2="54" stroke="#ffffff" stroke-width="1"/>
            <line x1="100" y1="54" x2="179" y2="54" stroke="#ffffff" stroke-width="1"/>
            <line x1="60" y1="26" x2="60" y2="54" stroke="#ffffff" stroke-width="1"/>
            <line x1="140" y1="26" x2="140" y2="54" stroke="#ffffff" stroke-width="1"/>
            <line x1="10" y1="40" x2="190" y2="40" stroke="#cccccc" stroke-width="1.5"/>
            <rect x="10" y="8" width="180" height="64" fill="#000000" opacity="0.38"/>
            <text x="100" y="36" font-family="system-ui,sans-serif" font-size="14" font-weight="900" fill="#ffffff" text-anchor="middle">Courtside</text>
            <text x="100" y="55" font-family="system-ui,sans-serif" font-size="14" font-weight="900" fill="#ffffff" text-anchor="middle">IQ</text>
          </svg>
        </div>
        <p>Smart Tennis Analytics</p>
        <button onClick={() => setTab("dashboard")}><Activity /> Dashboard</button>
        <button onClick={() => setTab("matches")}><Calendar /> Matches</button>
        <button onClick={() => setTab("valuepicks")}><TrendingUp /> Value Picks</button>
        <button onClick={() => setTab("player")}><Search /> Player Analyzer</button>
        <button onClick={() => setTab("predictor")}><Zap /> Match Predictor</button>
        <button onClick={() => setTab("h2h")}><Trophy /> Head-to-Head</button>
        <button onClick={() => setTab("tournamentpred")}><Star /> Tournament Prediction</button>
        <button onClick={() => { setTab("standings"); if(standings.length===0){setStandingsLoading(true);fetch("https://tennis-edge-backend.onrender.com/api/players").then(r=>r.json()).then(d=>{setStandings(Array.isArray(d)?d.filter(p=>p.rank<200&&p.points>0):[]);setStandingsLoading(false);}).catch(()=>setStandingsLoading(false));} }} style={tab==="standings"?{borderColor:"rgba(74,222,128,0.4)",color:"#4ade80"}:{}}>
          🏅 ATP Rankings
        </button>
        <button onClick={() => { setTab("calendar"); if(calendarData.length===0){setCalendarLoading(true);fetch("https://tennis-edge-backend.onrender.com/api/calendar").then(r=>r.json()).then(d=>{setCalendarData(Array.isArray(d)?d:[]);setCalendarLoading(false);}).catch(()=>setCalendarLoading(false));} }} style={tab==="calendar"?{borderColor:"rgba(34,211,238,0.4)",color:"#22d3ee"}:{}}>
          📅 Turnier-Kalender
        </button>
        <button onClick={() => setTab("compare")} style={tab==="compare"?{borderColor:"rgba(249,115,22,0.4)",color:"#fb923c"}:{}}>
          ⚔️ Vergleichs-Modus
        </button>
        <button onClick={() => setTab("watchlist")} style={tab==="watchlist"?{borderColor:"rgba(250,204,21,0.4)",color:"#facc15"}:{}}>
          🔖 My Watchlist {watchlist.length > 0 && <span style={{marginLeft:"6px",background:"rgba(250,204,21,0.2)",color:"#facc15",borderRadius:"999px",padding:"1px 7px",fontSize:"11px",fontWeight:700}}>{watchlist.length}</span>}
        </button>
        <button onClick={() => setTab("performance")} style={tab==="performance"?{borderColor:"rgba(99,102,241,0.4)",color:"#818cf8"}:{}}>
          📈 Performance
        </button>
        {selectedMatchKey && <button onClick={() => setTab("matchdetail")} style={{borderColor:"rgba(248,113,113,0.4)",color:"#f87171"}}>🔴 Match Detail</button>}
        <div style={{marginTop:"auto",paddingTop:"16px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
          <button onClick={() => setTab("history")} style={{marginBottom:"8px"}}>
            🕐 Match History
            {matchHistory.length > 0 && <span style={{marginLeft:"6px",background:"rgba(99,102,241,0.2)",color:"#818cf8",borderRadius:"999px",padding:"1px 7px",fontSize:"11px",fontWeight:700}}>{matchHistory.length}</span>}
          </button>
        </div>
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
          {id:"standings", icon:<span style={{fontSize:"16px"}}>🏅</span>, label:"Rankings"},
          {id:"calendar", icon:<span style={{fontSize:"16px"}}>📅</span>, label:"Kalender"},
          {id:"compare",  icon:<span style={{fontSize:"16px"}}>⚔️</span>, label:"Vergleich"},
          {id:"watchlist", icon:<span style={{fontSize:"16px"}}>🔖</span>, label:"Saved"},
          {id:"history",   icon:<span style={{fontSize:"16px"}}>🕐</span>, label:"History"},
          {id:"performance",icon:<span style={{fontSize:"16px"}}>📈</span>, label:"Stats"},
        ].map(item => (
          <button key={item.id} className={`mobile-nav-item ${tab===item.id?"active":""}`} onClick={() => setTab(item.id)}>
            {item.icon}
            <span>{item.label}</span>
            {item.id==="watchlist" && watchlist.length > 0 && <span className="mobile-nav-badge">{watchlist.length}</span>}
          </button>
        ))}
      </nav>

      <main>
        {/* ── BET MODAL ──────────────────────────────────────────────────── */}
        {betModal && (
          <BetModal
            match={betModal}
            onLog={logValueBet}
            onAddToCombi={(item) => setCombiBet(prev => [...prev, item])}
            onClose={() => setBetModal(null)}
            combiBet={combiBet}
          />
        )}

        {/* ── COMBI SLIP ─────────────────────────────────────────────────── */}
        {combiBet.length > 0 && !showCombiSlip && (
          <button onClick={() => setShowCombiSlip(true)}
            style={{position:"fixed",bottom:"80px",right:"20px",zIndex:900,background:"linear-gradient(135deg,#a78bfa,#22d3ee)",border:"none",borderRadius:"999px",padding:"12px 20px",color:"#0f172a",fontWeight:800,fontSize:"14px",cursor:"pointer",boxShadow:"0 4px 20px rgba(167,139,250,0.4)",display:"flex",alignItems:"center",gap:"8px"}}>
            🔗 Kombi ({combiBet.length}) · {combiBet.reduce((a,c)=>a*(parseFloat(c.odds)||1),1).toFixed(2)}x
          </button>
        )}

        <CombiSlip
          combiBet={combiBet}
          setCombiBet={setCombiBet}
          valuePerformance={valuePerformance}
          setValuePerformance={setValuePerformance}
          visible={showCombiSlip}
          onClose={() => setShowCombiSlip(false)}
        />

        {/* Mobile Header */}
        <div className="mobile-header">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 44" style={{width:"120px",height:"38px"}}>
              <rect x="0" y="0" width="140" height="44" rx="4" fill="#1a5c38"/>
              <rect x="6" y="4" width="128" height="36" fill="#2e7d4f"/>
              <rect x="6" y="4" width="128" height="36" fill="none" stroke="#ffffff" stroke-width="1"/>
              <line x1="70" y1="4" x2="70" y2="40" stroke="#ffffff" stroke-width="0.8"/>
              <line x1="14" y1="4" x2="14" y2="40" stroke="#ffffff" stroke-width="0.7"/>
              <line x1="126" y1="4" x2="126" y2="40" stroke="#ffffff" stroke-width="0.7"/>
              <line x1="14" y1="16" x2="70" y2="16" stroke="#ffffff" stroke-width="0.7"/>
              <line x1="70" y1="16" x2="126" y2="16" stroke="#ffffff" stroke-width="0.7"/>
              <line x1="14" y1="28" x2="70" y2="28" stroke="#ffffff" stroke-width="0.7"/>
              <line x1="70" y1="28" x2="126" y2="28" stroke="#ffffff" stroke-width="0.7"/>
              <line x1="42" y1="16" x2="42" y2="28" stroke="#ffffff" stroke-width="0.7"/>
              <line x1="98" y1="16" x2="98" y2="28" stroke="#ffffff" stroke-width="0.7"/>
              <line x1="6" y1="22" x2="134" y2="22" stroke="#cccccc" stroke-width="1"/>
              <rect x="6" y="4" width="128" height="36" fill="#000000" opacity="0.38"/>
              <text x="70" y="19" font-family="system-ui,sans-serif" font-size="8" font-weight="900" fill="#ffffff" text-anchor="middle">Courtside</text>
              <text x="70" y="31" font-family="system-ui,sans-serif" font-size="8" font-weight="900" fill="#ffffff" text-anchor="middle">IQ</text>
            </svg>
          {fixtures.some(m=>m.live) && (
            <span style={{display:"flex",alignItems:"center",gap:"5px",background:"rgba(248,113,113,0.15)",border:"1px solid rgba(248,113,113,0.4)",borderRadius:"20px",padding:"4px 10px",fontSize:"11px",color:"#f87171",fontWeight:700}}>
              <span style={{width:"6px",height:"6px",borderRadius:"50%",background:"#f87171",boxShadow:"0 0 6px #f87171",display:"inline-block"}} />
              {fixtures.filter(m=>m.live).length} Live
            </span>
          )}
        </div>

        {/* PWA Install Banner */}
        {pwaInstallable && !pwaInstalled && (
          <div style={{margin:"0 0 12px",padding:"12px 16px",borderRadius:"14px",background:"linear-gradient(135deg,rgba(34,211,238,0.1),rgba(74,222,128,0.08))",border:"1px solid rgba(34,211,238,0.25)",display:"flex",alignItems:"center",gap:"12px"}}>
            <span style={{fontSize:"24px"}}>📲</span>
            <div style={{flex:1}}>
              <div style={{fontSize:"13px",fontWeight:700,color:"#e2e8f0",marginBottom:"2px"}}>Als App installieren</div>
              <div style={{fontSize:"11px",color:"#64748b"}}>Courtside IQ direkt auf den Homescreen — wie eine native App</div>
            </div>
            <button onClick={() => {
              if (window.pwaInstallPrompt) {
                window.pwaInstallPrompt.prompt();
                window.pwaInstallPrompt.userChoice.then(choice => {
                  if (choice.outcome === 'accepted') setPwaInstalled(true);
                  setPwaInstallable(false);
                  window.pwaInstallPrompt = null;
                });
              }
            }} style={{padding:"8px 16px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#22d3ee,#4ade80)",color:"#0f172a",fontSize:"12px",fontWeight:800,cursor:"pointer",whiteSpace:"nowrap"}}>
              Installieren
            </button>
            <button onClick={() => setPwaInstallable(false)} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:"16px",padding:"4px"}}>✕</button>
          </div>
        )}

        {tab === "dashboard" && (
          <>
            <Header title="Live Dashboard" />
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"28px"}}>
              {[
                {label:"Matches Today", value:`${fixtures.length} (${fixtures.filter(m=>m.live).length} Live)`, icon:"🎾", color:"#22d3ee", tab:"matches"},
                {label:"Value Picks",   value:valuePicks.filter(p=>!!p.bestOdds).length, icon:"💰", color:"#4ade80", tab:"valuepicks"},
                {label:"My Watchlist",  value:watchlist.length, icon:"🔖", color:"#facc15", tab:"watchlist"},
                {label:"Performance",   value:accuracyLog.filter(l=>l.correct!==undefined).length > 0 ? `${Math.round(accuracyLog.filter(l=>l.correct).length/accuracyLog.filter(l=>l.correct!==undefined).length*100)}%` : "—", icon:"📈", color:"#818cf8", tab:"performance"},
              ].map((s,i) => (
                <div key={i} onClick={() => setTab(s.tab)} style={{background:"#0f172a",border:`1px solid ${s.color}22`,borderRadius:"14px",padding:"14px 16px",display:"flex",alignItems:"center",gap:"12px",cursor:"pointer",transition:"all 0.2s"}}
                  onMouseEnter={e => e.currentTarget.style.borderColor=s.color}
                  onMouseLeave={e => e.currentTarget.style.borderColor=`${s.color}22`}>
                  <span style={{fontSize:"22px"}}>{s.icon}</span>
                  <div>
                    <div style={{fontSize:"22px",fontWeight:900,color:s.color,lineHeight:1}}>{s.value}</div>
                    <div style={{fontSize:"11px",color:"#475569",marginTop:"3px",textTransform:"uppercase",letterSpacing:"0.5px"}}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {(() => {
              const resolved = accuracyLog.filter(l => l.correct !== undefined);
              const correct = resolved.filter(l => l.correct).length;
              const accuracy = resolved.length > 0 ? Math.round((correct/resolved.length)*100) : null;
              const resolvedBets = valuePerformance.filter(b => b.result !== null);
              const totalROI = resolvedBets.reduce((sum, b) => sum + (b.profit||0), 0);
              const wonBets = resolvedBets.filter(b => b.result==="won").length;
              if (!accuracy && resolvedBets.length === 0) return null;
              return (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"24px"}}>
                  {accuracy !== null && resolved.length >= 5 && (
                    <div style={{background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:"14px",padding:"14px 18px",cursor:"pointer"}} onClick={() => setTab("performance")}>
                      <div style={{fontSize:"11px",color:"#818cf8",textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,marginBottom:"6px"}}>🎯 Prediction Accuracy</div>
                      <div style={{display:"flex",alignItems:"baseline",gap:"8px"}}>
                        <span style={{fontSize:"32px",fontWeight:900,color:accuracy>=60?"#4ade80":accuracy>=50?"#facc15":"#f87171"}}>{accuracy}%</span>
                        <span style={{fontSize:"12px",color:"#475569"}}>{correct}/{resolved.length} correct</span>
                      </div>
                    </div>
                  )}
                  {resolvedBets.length > 0 && (
                    <div style={{background:`rgba(${totalROI>=0?"74,222,128":"248,113,113"},0.06)`,border:`1px solid rgba(${totalROI>=0?"74,222,128":"248,113,113"},0.2)`,borderRadius:"14px",padding:"14px 18px",cursor:"pointer"}} onClick={() => setTab("performance")}>
                      <div style={{fontSize:"11px",color:totalROI>=0?"#4ade80":"#f87171",textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,marginBottom:"6px"}}>💰 Value Bet ROI</div>
                      <div style={{display:"flex",alignItems:"baseline",gap:"8px"}}>
                        <span style={{fontSize:"32px",fontWeight:900,color:totalROI>=0?"#4ade80":"#f87171"}}>{totalROI>=0?"+":""}{totalROI.toFixed(1)}€</span>
                        <span style={{fontSize:"12px",color:"#475569"}}>{wonBets}/{resolvedBets.length} won</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {matchHistory.length > 0 && (() => {
              const last10 = matchHistory.slice(0,10);
              return (
                <div style={{background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:"14px",padding:"14px 18px",marginBottom:"24px",display:"flex",alignItems:"center",gap:"20px",flexWrap:"wrap"}}>
                  <span style={{fontSize:"13px",fontWeight:700,color:"#818cf8"}}>🕐 Recent Predictions</span>
                  <div style={{display:"flex",gap:"4px"}}>
                    {last10.map((h,i) => {
                      const favProb = h.prediction ? Math.max(...Object.values(h.prediction)) : 50;
                      const conf = favProb > 65 ? "#4ade80" : "#facc15";
                      return <div key={i} title={`${h.p1} vs ${h.p2}`} style={{width:"28px",height:"28px",borderRadius:"6px",background:`${conf}18`,border:`1px solid ${conf}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",fontWeight:700,color:conf,cursor:"pointer"}} onClick={() => {setP1(h.p1);setP2(h.p2);setSurface(h.surface);setTab("predictor");}}>{favProb}%</div>;
                    })}
                  </div>
                  <span style={{fontSize:"11px",color:"#475569",marginLeft:"auto",cursor:"pointer"}} onClick={() => setTab("history")}>View all →</span>
                </div>
              );
            })()}

            {/* ── Feature 4: Favoriten-Spieler Widget ── */}
            {favoritePlayers.length > 0 && (() => {
              const favMatches = fixtures.filter(m =>
                favoritePlayers.some(fav => {
                  const favLast = fav.toLowerCase().split(" ").pop();
                  return (m.player1||"").toLowerCase().includes(favLast) ||
                         (m.player2||"").toLowerCase().includes(favLast);
                })
              );
              if (favMatches.length === 0) return null;
              return (
                <div style={{marginBottom:"24px",background:"rgba(250,204,21,0.04)",border:"1px solid rgba(250,204,21,0.2)",borderRadius:"14px",overflow:"hidden"}}>
                  <div style={{padding:"10px 16px",borderBottom:"1px solid rgba(250,204,21,0.15)",display:"flex",alignItems:"center",gap:"8px"}}>
                    <span style={{fontSize:"14px"}}>⭐</span>
                    <span style={{fontSize:"13px",fontWeight:700,color:"#facc15"}}>Deine Favoriten heute</span>
                    <span style={{fontSize:"11px",color:"#475569"}}>{favMatches.length} Match{favMatches.length>1?"es":""}</span>
                  </div>
                  <div style={{padding:"10px 12px"}}>
                    <div className="matchCardGrid">
                      {favMatches.map((m,i) => <MatchCard key={i} m={m} players={safePlayers} onClick={() => m.live ? openMatchDetail(m) : (setP1(m.player1),setP2(m.player2),setTab("predictor"))} onWatchlist={toggleWatchlist} isWatched={isWatched(m)} onCompare={(p1,p2)=>{setPlayer(p1);setComparePlayer(p2);setTab("player");}} streaks={streaks} quickOdds={quickOdds} onQuickOddsChange={(key,field,val)=>setQuickOdds(prev=>({...prev,[key]:{...prev[key],[field]:val}}))} favoritePlayers={favoritePlayers} onLogBet={(match)=>setBetModal(match)} />)}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="dashGrid">
              <div>
                <div className="dashSectionHeader">
                  {fixtures.some(m => m.live)
                    ? <><span className="liveDot" />{fixtures.filter(m=>m.live).length} Live · Today {new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"})}</>
                    : <>📅 {new Date().getHours() >= 18 ? `Today + Tomorrow` : "Today"} — {new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"})}</>}
                </div>
                {fixturesLoading ? <p style={{color:"#94a3b8",fontSize:"14px",padding:"16px 0"}}>⏳ Loading matches...</p>
                  : fixtures.length === 0 ? <p style={{color:"#94a3b8",fontSize:"14px",padding:"16px 0"}}>No matches today.</p>
                  : (() => {
                      const sorted = [...fixtures].sort((a,b) => {
                        if (a.live && !b.live) return -1;
                        if (!a.live && b.live) return 1;
                        const aAtp = a.category?.includes("ATP") ? 0 : 1;
                        const bAtp = b.category?.includes("ATP") ? 0 : 1;
                        if (aAtp !== bAtp) return aAtp - bAtp;
                        const aSing = a.category?.includes("Singles") ? 0 : 1;
                        const bSing = b.category?.includes("Singles") ? 0 : 1;
                        if (aSing !== bSing) return aSing - bSing;
                        const aCan = a.cancelled ? 1 : 0;
                        const bCan = b.cancelled ? 1 : 0;
                        return aCan - bCan;
                      });
                      const limit = dashShowAll ? sorted.length : 6;
                      const shown = sorted.slice(0, limit);
                      return (
                        <div className="matchCardGrid">
                          {shown.map((m,i) => <MatchCard key={i} m={m} players={safePlayers} onClick={() => m.live ? openMatchDetail(m) : (setP1(m.player1),setP2(m.player2),setTab("predictor"))} onWatchlist={toggleWatchlist} isWatched={isWatched(m)} onCompare={(p1,p2) => {setPlayer(p1);setComparePlayer(p2);setTab("player");}} streaks={streaks} quickOdds={quickOdds} onQuickOddsChange={(key,field,val)=>setQuickOdds(prev=>({...prev,[key]:{...prev[key],[field]:val}}))} favoritePlayers={favoritePlayers} onLogBet={(match)=>setBetModal(match)} />)}
                          {!dashShowAll && fixtures.length > 6 && (
                            <div style={{gridColumn:"1/-1",display:"flex",gap:"10px",alignItems:"center",justifyContent:"space-between",padding:"10px 0"}}>
                              <button onClick={() => setDashShowAll(true)} style={{background:"rgba(34,211,238,0.08)",border:"1px solid rgba(34,211,238,0.25)",color:"#22d3ee",borderRadius:"10px",padding:"8px 18px",fontSize:"12px",fontWeight:700,cursor:"pointer"}}>
                                ➕ Alle {fixtures.length} Matches anzeigen
                              </button>
                              <span style={{color:"#22d3ee",fontSize:"12px",cursor:"pointer"}} onClick={() => setTab("matches")}>Matches-Tab →</span>
                            </div>
                          )}
                          {dashShowAll && fixtures.length > 6 && (
                            <div style={{gridColumn:"1/-1",textAlign:"center",paddingTop:"4px"}}>
                              <button onClick={() => setDashShowAll(false)} style={{background:"transparent",border:"1px solid rgba(255,255,255,0.1)",color:"#475569",borderRadius:"8px",padding:"6px 14px",fontSize:"12px",cursor:"pointer"}}>
                                ▲ Weniger anzeigen
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
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
            <p style={{color:"#94a3b8",marginTop:"-16px",marginBottom:"16px"}}>
              📅 {new Date().getHours() >= 18 ? `Today + Tomorrow` : "Today"} — {new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"})} · {fixtures.length} Matches
              {fixtures.filter(m=>m.live).length > 0 && <span style={{marginLeft:"10px",color:"#f87171",fontWeight:700}}>🔴 {fixtures.filter(m=>m.live).length} Live</span>}
              {fixtures.filter(m=>m.cancelled).length > 0 && <span style={{marginLeft:"10px",color:"#ef4444",fontWeight:700}}>🚫 {fixtures.filter(m=>m.cancelled).length} Abgesagt</span>}
            </p>

            {/* Suchfeld */}
            <div style={{position:"relative",marginBottom:"20px"}}>
              <Search size={15} style={{position:"absolute",left:"14px",top:"50%",transform:"translateY(-50%)",color:"#22d3ee",pointerEvents:"none"}} />
              <input
                type="text"
                value={matchSearch}
                onChange={e => setMatchSearch(e.target.value)}
                placeholder="Spieler oder Turnier suchen..."
                style={{width:"100%",boxSizing:"border-box",padding:"10px 14px 10px 40px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(34,211,238,0.2)",borderRadius:"12px",color:"#e2e8f0",fontSize:"14px",outline:"none",transition:"border-color 0.2s"}}
                onFocus={e=>e.target.style.borderColor="rgba(34,211,238,0.5)"}
                onBlur={e=>e.target.style.borderColor="rgba(34,211,238,0.2)"}
              />
              {matchSearch && <button onClick={()=>setMatchSearch("")} style={{position:"absolute",right:"12px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:"16px",lineHeight:1}}>✕</button>}
            </div>
            <div>
              {fixturesLoading ? <p style={{color:"#94a3b8"}}>⏳ Loading matches...</p>
                : fixtures.length === 0 ? <p style={{color:"#94a3b8"}}>No matches found today.</p>
                : (() => {
                    const searchLower = matchSearch.toLowerCase().trim();
                    const filteredFixtures = searchLower
                      ? fixtures.filter(m =>
                          (m.player1||"").toLowerCase().includes(searchLower) ||
                          (m.player2||"").toLowerCase().includes(searchLower) ||
                          (m.tournament||"").toLowerCase().includes(searchLower)
                        )
                      : fixtures;

                    if (filteredFixtures.length === 0) return (
                      <div style={{textAlign:"center",padding:"40px 20px",color:"#475569"}}>
                        <div style={{fontSize:"32px",marginBottom:"12px"}}>🔍</div>
                        <div style={{fontSize:"14px"}}>Kein Match gefunden für <strong style={{color:"#e2e8f0"}}>„{matchSearch}"</strong></div>
                      </div>
                    );
                    const categoryOrder = ["ATP Singles","ATP Doubles","Challenger Singles","Challenger Doubles"];
                    const grouped = {};
                    filteredFixtures.forEach(m => {
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
                      const cancelledInCat = keys.flatMap(k=>grouped[k].matches).filter(m=>m.cancelled).length;
                      return (
                        <div key={cat} style={{marginBottom:"32px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"16px",paddingBottom:"10px",borderBottom:`2px solid ${isATP?"rgba(34,211,238,0.3)":"rgba(250,204,21,0.3)"}`,cursor:"pointer",userSelect:"none"}} onClick={() => toggleCategory(cat)}>
                            <span style={{fontSize:"16px",color:isATP?"#22d3ee":"#facc15",transition:"transform 0.2s",display:"inline-block",transform:collapsedCategories[cat]?"rotate(-90deg)":"rotate(0deg)"}}>▼</span>
                            <span style={{fontSize:"18px",fontWeight:800,color:isATP?"#22d3ee":"#facc15"}}>{cat}</span>
                            {liveInCat > 0 && <span style={{display:"flex",alignItems:"center",gap:"5px",background:"rgba(248,113,113,0.15)",border:"1px solid rgba(248,113,113,0.4)",borderRadius:"20px",padding:"2px 10px",fontSize:"11px",color:"#f87171",fontWeight:700}}><span style={{width:"6px",height:"6px",borderRadius:"50%",background:"#f87171",boxShadow:"0 0 6px #f87171",display:"inline-block"}} />{liveInCat} Live</span>}
                            {/* CHANGE 4c: Cancelled Badge in Kategorie-Header */}
                            {cancelledInCat > 0 && <span style={{fontSize:"11px",color:"#ef4444",fontWeight:700,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:"20px",padding:"2px 10px"}}>🚫 {cancelledInCat} abgesagt</span>}
                            <span style={{fontSize:"12px",color:"#475569"}}>{keys.flatMap(k=>grouped[k].matches).length} Matches</span>
                          </div>
                          {!collapsedCategories[cat] && keys.map(key => {
                            const {tourn,matches} = grouped[key];
                            const liveInTourn = matches.filter(m=>m.live).length;
                            const cancelledInTourn = matches.filter(m=>m.cancelled).length;
                            const isColl = collapsedTournaments[key];
                            return (
                              <div key={key} style={{marginBottom:"16px",background:"rgba(255,255,255,0.02)",borderRadius:"14px",overflow:"hidden",border:"1px solid rgba(255,255,255,0.05)"}}>
                                <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"12px 16px",cursor:"pointer",userSelect:"none"}} onClick={() => toggleTournament(key)}>
                                  <span style={{fontSize:"13px",color:"#64748b",transition:"transform 0.2s",display:"inline-block",transform:isColl?"rotate(-90deg)":"rotate(0deg)"}}>▼</span>
                                  <span style={{fontSize:"14px",fontWeight:700,color:"#cbd5e1"}}>🏆 {tourn}</span>
                                  {liveInTourn > 0 && <span style={{display:"flex",alignItems:"center",gap:"4px",fontSize:"11px",color:"#f87171",fontWeight:700}}><span style={{width:"6px",height:"6px",borderRadius:"50%",background:"#f87171",boxShadow:"0 0 6px #f87171",display:"inline-block"}} />{liveInTourn} Live</span>}
                                  {cancelledInTourn > 0 && <span style={{fontSize:"11px",color:"#ef4444",fontWeight:600}}>🚫 {cancelledInTourn} abgesagt</span>}
                                  <span style={{fontSize:"11px",color:"#475569",marginLeft:"auto"}}>{matches.length} Matches</span>
                                </div>
                                {!isColl && <div style={{padding:"0 12px 12px"}}>
                                  <div className="matchCardGrid" style={{gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))"}}>
                                    {/* CHANGE 5: Cancelled innerhalb Turnier ans Ende */}
                                    {[...matches].sort((a,b) => { const ac=a.cancelled?1:0,bc=b.cancelled?1:0; return ac-bc; }).map((m,i) => <MatchCard key={i} m={m} players={safePlayers} onClick={() => m.live ? openMatchDetail(m) : (setP1(m.player1),setP2(m.player2),setTab("predictor"))} onWatchlist={toggleWatchlist} isWatched={isWatched(m)} onCompare={(p1,p2) => {setPlayer(p1);setComparePlayer(p2);setTab("player");}} streaks={streaks} quickOdds={quickOdds} onQuickOddsChange={(key,field,val)=>setQuickOdds(prev=>({...prev,[key]:{...prev[key],[field]:val}}))} favoritePlayers={favoritePlayers} onLogBet={(match)=>setBetModal(match)} />)}
                                  </div>
                                </div>}
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
                      {pick.bestOdds && (
                        <div style={{marginTop:"8px",display:"flex",justifyContent:"flex-end"}}>
                          <button onClick={(e) => { e.stopPropagation(); logValueBet(pick.match, pick.pick, pick.bestOdds, 10); alert(`✅ Bet logged! ${pick.pick} @ ${pick.bestOdds} — 10€ stake. Track in Performance tab.`); }}
                            style={{padding:"4px 12px",borderRadius:"6px",border:"1px solid rgba(250,204,21,0.3)",background:"rgba(250,204,21,0.08)",color:"#facc15",fontSize:"11px",fontWeight:700,cursor:"pointer"}}>
                            📋 Log Bet (10€)
                          </button>
                        </div>
                      )}
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
              <PlayerAutocomplete label="Search player 1..." playerNum={1} value={player} onChange={setPlayer} players={playerNames} favorites={favoritePlayers} onToggleFavorite={toggleFavoritePlayer} />
              <PlayerAutocomplete label="Compare player 2..." playerNum={2} value={comparePlayer} onChange={setComparePlayer} players={playerNames} favorites={favoritePlayers} onToggleFavorite={toggleFavoritePlayer} />
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
              <PlayerAutocomplete label="Enter name..." playerNum={1} value={p1} onChange={setP1} players={playerNames} favorites={favoritePlayers} onToggleFavorite={toggleFavoritePlayer} />
              <PlayerAutocomplete label="Enter name..." playerNum={2} value={p2} onChange={setP2} players={playerNames} favorites={favoritePlayers} onToggleFavorite={toggleFavoritePlayer} />
            </div>
            <div className="surfaceSelector">
              {[{value:"hard",icon:"🏟️",label:"Hard"},{value:"clay",icon:"🧱",label:"Clay"},{value:"grass",icon:"🌿",label:"Grass"}].map(s => (
                <button key={s.value} className={`surfaceBtn ${surface===s.value?"active":""}`} onClick={() => {
                  setSurface(s.value);
                  if (prediction && p1Data && p2Data) {
                    setTimeout(() => fetch(`https://tennis-edge-backend.onrender.com/api/predict?p1=${encodeURIComponent(p1)}&p2=${encodeURIComponent(p2)}&rank1=${p1Data.rank||10}&rank2=${p2Data.rank||100}&surface=${s.value}&surface1=${p1Data?.[s.value]||0}&surface2=${p2Data?.[s.value]||0}&bo=${bestOf}`).then(res=>res.json()).then(data=>{setPrediction(data);setNewsAnalysis(null);}).catch(err=>console.error(err)),50);
                  }
                }}>
                  <span className="surfaceIcon">{s.icon}</span><span className="surfaceLabel">{s.label}</span>
                </button>
              ))}
            </div>
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
            <button className="predictBtn" onClick={predictMatch} disabled={!p1||!p2}>⚡ Calculate Prediction</button>
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

                  {/* ── NEWS ANALYSIS PANEL ───────────────────────────────── */}
                  {newsAnalysisLoading && (
                    <div style={{margin:"16px 0",padding:"16px",borderRadius:"14px",background:"rgba(139,92,246,0.06)",border:"1px solid rgba(139,92,246,0.2)",display:"flex",alignItems:"center",gap:"12px"}}>
                      <div style={{width:"16px",height:"16px",borderRadius:"50%",border:"2px solid rgba(139,92,246,0.3)",borderTopColor:"#a78bfa",animation:"spin 0.8s linear infinite",flexShrink:0}} />
                      <div>
                        <div style={{fontSize:"13px",fontWeight:700,color:"#a78bfa",marginBottom:"2px"}}>📰 News-Analyse läuft...</div>
                        <div style={{fontSize:"11px",color:"#64748b"}}>Aktuelle Nachrichten werden ausgewertet</div>
                      </div>
                    </div>
                  )}

                  {newsAnalysis && !newsAnalysisLoading && (() => {
                    if (newsAnalysis.error) return (
                      <div style={{margin:"16px 0",padding:"12px 16px",borderRadius:"12px",background:"rgba(248,113,113,0.06)",border:"1px solid rgba(248,113,113,0.2)",fontSize:"12px",color:"#f87171"}}>
                        📰 News-Analyse Fehler: {newsAnalysis.errorMsg || "Unbekannt"} — stelle sicher dass ANTHROPIC_API_KEY auf Render gesetzt ist und der neue server.js deployed ist.
                      </div>
                    );
                    if (newsAnalysis.noNews) return (
                      <div style={{margin:"16px 0",padding:"12px 16px",borderRadius:"12px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",fontSize:"12px",color:"#475569"}}>
                        📰 Keine aktuellen News gefunden — News-Adjustment nicht möglich.
                      </div>
                    );

                    const impactColor = newsAnalysis.overall_impact === "high" ? "#f87171" : newsAnalysis.overall_impact === "medium" ? "#facc15" : "#64748b";
                    const signalIcon = (s) => ({ injury_risk:"🤕", poor_form:"📉", good_form:"📈", fatigue:"😴", neutral:"➖", withdrawal_risk:"⚠️", motivated:"🔥" })[s] || "➖";
                    const signalColor = (s) => ({ injury_risk:"#f87171", poor_form:"#f87171", good_form:"#4ade80", fatigue:"#facc15", neutral:"#475569", withdrawal_risk:"#f97316", motivated:"#4ade80" })[s] || "#475569";
                    const hasAdjustment = newsAnalysis.netMod !== 0;

                    return (
                      <div style={{margin:"16px 0",borderRadius:"14px",overflow:"hidden",border:`1px solid ${impactColor}33`,background:`${impactColor}08`}}>
                        {/* Header */}
                        <div style={{padding:"12px 16px",borderBottom:`1px solid ${impactColor}22`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                            <span style={{fontSize:"14px"}}>📰</span>
                            <span style={{fontSize:"13px",fontWeight:800,color:"#e2e8f0"}}>News-Analyse</span>
                            <span style={{fontSize:"10px",fontWeight:700,color:impactColor,background:`${impactColor}22`,padding:"2px 8px",borderRadius:"6px",textTransform:"uppercase"}}>
                              {newsAnalysis.overall_impact} Impact
                            </span>
                          </div>
                          <span style={{fontSize:"11px",color:"#475569"}}>powered by Claude</span>
                        </div>

                        <div style={{padding:"14px 16px"}}>
                          {/* Summary */}
                          <p style={{margin:"0 0 14px",fontSize:"13px",color:"#94a3b8",lineHeight:1.5,fontStyle:"italic"}}>„{newsAnalysis.summary}"</p>

                          {/* Player signals */}
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"14px"}}>
                            {[newsAnalysis.player1, newsAnalysis.player2].map((p, i) => (
                              <div key={i} style={{padding:"10px 12px",borderRadius:"10px",background:"rgba(255,255,255,0.03)",border:`1px solid ${signalColor(p.signal)}33`}}>
                                <div style={{fontSize:"11px",color:"#64748b",marginBottom:"4px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                                <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"4px"}}>
                                  <span style={{fontSize:"16px"}}>{signalIcon(p.signal)}</span>
                                  <span style={{fontSize:"12px",fontWeight:700,color:signalColor(p.signal)}}>{p.modifier > 0 ? `+${p.modifier}%` : p.modifier < 0 ? `${p.modifier}%` : "±0%"}</span>
                                </div>
                                <div style={{fontSize:"11px",color:"#94a3b8",lineHeight:1.4}}>{p.reason}</div>
                              </div>
                            ))}
                          </div>

                          {/* Adjusted prediction */}
                          {hasAdjustment ? (
                            <div style={{padding:"12px 14px",borderRadius:"10px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)"}}>
                              <div style={{fontSize:"11px",color:"#64748b",textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,marginBottom:"10px"}}>📊 Angepasste Wahrscheinlichkeit</div>
                              <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:"8px",alignItems:"center"}}>
                                <div>
                                  <div style={{fontSize:"12px",color:"#94a3b8",marginBottom:"3px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{newsAnalysis.player1.name}</div>
                                  <div style={{display:"flex",alignItems:"baseline",gap:"6px"}}>
                                    <span style={{fontSize:"22px",fontWeight:900,color:"#22d3ee"}}>{newsAnalysis.adjustedProb1}%</span>
                                    <span style={{fontSize:"11px",color: newsAnalysis.adjustedProb1 > newsAnalysis.baseProb1 ? "#4ade80" : newsAnalysis.adjustedProb1 < newsAnalysis.baseProb1 ? "#f87171" : "#475569",fontWeight:700}}>
                                      {newsAnalysis.adjustedProb1 > newsAnalysis.baseProb1 ? `▲+${newsAnalysis.adjustedProb1-newsAnalysis.baseProb1}` : newsAnalysis.adjustedProb1 < newsAnalysis.baseProb1 ? `▼${newsAnalysis.adjustedProb1-newsAnalysis.baseProb1}` : "="}
                                    </span>
                                  </div>
                                  <div style={{fontSize:"10px",color:"#334155"}}>war {newsAnalysis.baseProb1}%</div>
                                </div>
                                <div style={{textAlign:"center",color:"#334155",fontSize:"12px",fontWeight:700}}>VS</div>
                                <div style={{textAlign:"right"}}>
                                  <div style={{fontSize:"12px",color:"#94a3b8",marginBottom:"3px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{newsAnalysis.player2.name}</div>
                                  <div style={{display:"flex",alignItems:"baseline",gap:"6px",justifyContent:"flex-end"}}>
                                    <span style={{fontSize:"11px",color: newsAnalysis.adjustedProb2 > newsAnalysis.baseProb2 ? "#4ade80" : newsAnalysis.adjustedProb2 < newsAnalysis.baseProb2 ? "#f87171" : "#475569",fontWeight:700}}>
                                      {newsAnalysis.adjustedProb2 > newsAnalysis.baseProb2 ? `▲+${newsAnalysis.adjustedProb2-newsAnalysis.baseProb2}` : newsAnalysis.adjustedProb2 < newsAnalysis.baseProb2 ? `▼${newsAnalysis.adjustedProb2-newsAnalysis.baseProb2}` : "="}
                                    </span>
                                    <span style={{fontSize:"22px",fontWeight:900,color:"#f472b6"}}>{newsAnalysis.adjustedProb2}%</span>
                                  </div>
                                  <div style={{fontSize:"10px",color:"#334155"}}>war {newsAnalysis.baseProb2}%</div>
                                </div>
                              </div>
                              {/* Adjusted probability bar */}
                              <div style={{display:"flex",height:"8px",borderRadius:"999px",overflow:"hidden",marginTop:"10px"}}>
                                <div style={{width:`${newsAnalysis.adjustedProb1}%`,background:"linear-gradient(90deg,#22d3ee,#4ade80)",transition:"width 0.5s ease"}} />
                                <div style={{flex:1,background:"#f472b6"}} />
                              </div>
                            </div>
                          ) : (
                            <div style={{padding:"10px 14px",borderRadius:"10px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",fontSize:"12px",color:"#475569",textAlign:"center"}}>
                              ➖ Keine relevanten News gefunden — Prediction unverändert
                            </div>
                          )}

                          {/* Headlines used */}
                          <div style={{marginTop:"12px",display:"flex",gap:"8px",flexWrap:"wrap"}}>
                            {[newsAnalysis.player1, newsAnalysis.player2].map((p,pi) =>
                              (p.headlines_used||[]).map(idx => {
                                const h = p.headlines?.[idx-1];
                                if (!h) return null;
                                return (
                                  <div key={`${pi}-${idx}`} style={{fontSize:"10px",color:"#64748b",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"6px",padding:"3px 8px",lineHeight:1.4,maxWidth:"100%"}}>
                                    📄 {h.length > 80 ? h.slice(0,80)+"…" : h}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {prediction.hand && (() => {
                    const h1 = prediction.hand[prediction.player1];
                    const h2 = prediction.hand[prediction.player2];
                    if (!h1 && !h2) return null;
                    const handLabel = (h) => h === "L" ? "Left-handed" : h === "R" ? "Right-handed" : "Unknown";
                    const isLvsR = (h1 === "L" && h2 === "R") || (h1 === "R" && h2 === "L");
                    const leftie = h1 === "L" ? prediction.player1 : h2 === "L" ? prediction.player2 : null;
                    return (
                      <div style={{display:"flex",alignItems:"center",gap:"12px",padding:"8px 12px",borderRadius:"10px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",marginTop:"8px",flexWrap:"wrap"}}>
                        <span style={{fontSize:"12px",color:"#64748b",fontWeight:700}}>✋ Handedness</span>
                        <span style={{fontSize:"12px",color:"#e2e8f0"}}>{prediction.player1.split(" ").pop()}: <strong style={{color:h1==="L"?"#facc15":"#22d3ee"}}>{handLabel(h1)}</strong></span>
                        <span style={{color:"#334155"}}>·</span>
                        <span style={{fontSize:"12px",color:"#e2e8f0"}}>{prediction.player2.split(" ").pop()}: <strong style={{color:h2==="L"?"#facc15":"#22d3ee"}}>{handLabel(h2)}</strong></span>
                        {isLvsR && leftie && <span style={{fontSize:"11px",color:"#facc15",background:"rgba(250,204,21,0.1)",border:"1px solid rgba(250,204,21,0.2)",borderRadius:"6px",padding:"2px 8px"}}>⚡ Left-hand edge: {leftie.split(" ").pop()}</span>}
                      </div>
                    );
                  })()}

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
                              {(fd.handRates?.vsRight || fd.handRates?.vsLeft) && (
                                <div style={{display:"flex",gap:"6px",marginBottom:"6px",flexWrap:"wrap"}}>
                                  {fd.handRates.vsRight && (
                                    <span style={{fontSize:"10px",padding:"1px 7px",borderRadius:"5px",background:`rgba(34,211,238,0.1)`,border:"1px solid rgba(34,211,238,0.2)",color:"#22d3ee"}}>
                                      🤚 vs R: {fd.handRates.vsRight.pct}% ({fd.handRates.vsRight.wins}/{fd.handRates.vsRight.total})
                                    </span>
                                  )}
                                  {fd.handRates.vsLeft && (
                                    <span style={{fontSize:"10px",padding:"1px 7px",borderRadius:"5px",background:`rgba(250,204,21,0.1)`,border:"1px solid rgba(250,204,21,0.2)",color:"#facc15"}}>
                                      ✋ vs L: {fd.handRates.vsLeft.pct}% ({fd.handRates.vsLeft.wins}/{fd.handRates.vsLeft.total})
                                    </span>
                                  )}
                                </div>
                              )}
                              {fd.recentResults?.length > 0 && (
                                <div style={{display:"flex",gap:"3px"}}>
                                  {fd.recentResults.map((r,i) => (
                                    <span key={i} title={`${r.won?"W":"L"} vs ${r.opponent}${r.opponentHand?" ("+r.opponentHand+")":""} (${r.date})`} style={{width:"18px",height:"18px",borderRadius:"3px",background:r.won?"rgba(74,222,128,0.3)":"rgba(248,113,113,0.3)",border:`1px solid ${r.won?"#4ade80":"#f87171"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"9px",fontWeight:700,color:r.won?"#4ade80":"#f87171",cursor:"default",position:"relative"}}>
                                      {r.won?"W":"L"}
                                      {r.opponentHand==="L"&&<span style={{position:"absolute",top:"-4px",right:"-4px",fontSize:"7px",background:"#facc15",color:"#0f172a",borderRadius:"999px",width:"8px",height:"8px",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900}}>L</span>}
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
                      {[prediction.player1, prediction.player2].map(p => {
                        const baseProb = prediction.setWinProb[p];
                        // Apply news adjustment to set win prob too
                        const hasAdj = newsAnalysis && !newsAnalysis.error && !newsAnalysis.noNews && newsAnalysis.netMod !== 0;
                        const adjProb = hasAdj
                          ? (p === prediction.player1
                              ? Math.min(85, Math.max(15, baseProb + Math.round(newsAnalysis.netMod * 0.6)))
                              : Math.min(85, Math.max(15, baseProb - Math.round(newsAnalysis.netMod * 0.6))))
                          : baseProb;
                        const isWinner = adjProb >= 50;
                        return (
                          <div key={p} style={{marginBottom:"10px"}}>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:"13px",marginBottom:"4px"}}>
                              <span style={{color:"#cbd5e1"}}>{p}</span>
                              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                                {hasAdj && adjProb !== baseProb && <span style={{fontSize:"10px",color:adjProb>baseProb?"#4ade80":"#f87171"}}>{adjProb>baseProb?`▲+${adjProb-baseProb}`:`▼${adjProb-baseProb}`}</span>}
                                <strong style={{color:isWinner?"#4ade80":"#f472b6"}}>{adjProb}% per set</strong>
                              </div>
                            </div>
                            <div style={{height:"8px",background:"#1e293b",borderRadius:"999px",overflow:"hidden"}}>
                              <div style={{width:`${adjProb}%`,height:"100%",background:isWinner?"linear-gradient(90deg,#22d3ee,#4ade80)":"#f472b6",borderRadius:"999px"}} />
                            </div>
                          </div>
                        );
                      })}
                      <p style={{margin:"8px 0 0",fontSize:"12px",color:"#64748b"}}>
                        Based on Elo, form, surface experience and ranking
                        {newsAnalysis && !newsAnalysis.error && !newsAnalysis.noNews && newsAnalysis.netMod !== 0 && <span style={{color:"#a78bfa"}}> · News-adjustiert</span>}
                      </p>
                    </div>
                  )}
                  {prediction.handicap && (
                    <div style={{margin:"0 0 16px",padding:"16px",borderRadius:"14px",background:"rgba(250,204,21,0.06)",border:"1px solid rgba(250,204,21,0.25)"}}>
                      <h4 style={{color:"#facc15",margin:"0 0 12px",fontSize:"14px"}}>📊 Handicap Recommendation</h4>
                      {(() => {
                        const hasAdj = newsAnalysis && !newsAnalysis.error && !newsAnalysis.noNews && newsAnalysis.netMod !== 0;
                        const dispFav = hasAdj ? (newsAnalysis.adjustedProb1 >= newsAnalysis.adjustedProb2 ? prediction.player1 : prediction.player2) : prediction.handicap.favorite;
                        const dispDog = dispFav === prediction.player1 ? prediction.player2 : prediction.player1;
                        const surfSetMod = prediction.surface==="clay"?0.03:prediction.surface==="grass"?-0.02:0;
                        const adjP = hasAdj ? Math.min(0.85, Math.max(0.15, Math.max(newsAnalysis.adjustedProb1, newsAnalysis.adjustedProb2)/100 + surfSetMod)) : null;
                        const adjQ = adjP ? 1 - adjP : null;
                        const bo = prediction.bo || 3;
                        let adjExpFav = prediction.handicap.expGames?.[dispFav];
                        let adjExpDog = prediction.handicap.expGames?.[dispDog];
                        let adjLine = prediction.handicap.line;
                        let adjPick = prediction.handicap.pick;
                        let adjReason = prediction.handicap.reason;
                        if (hasAdj && adjP) {
                          const expGPSW = 6 + Math.max(0, (adjP-0.5)*2);
                          const expGPSL = Math.max(1, 6-(adjP-0.5)*10);
                          const p=adjP, q=adjQ;
                          const sc20=p*p, sc21=2*p*p*q, sc12=2*p*q*q, sc02=q*q;
                          const sc30=p*p*p, sc31=3*p*p*p*q, sc32=6*p*p*p*q*q, sc03=q*q*q, sc13=3*p*q*q*q, sc23=6*p*p*q*q*q;
                          if (bo===5) {
                            adjExpFav=Math.round((sc30*(3*expGPSW)+sc31*(3*expGPSW+expGPSL)+sc32*(3*expGPSW+2*expGPSL)+sc03*(3*expGPSL)+sc13*(expGPSW+3*expGPSL)+sc23*(2*expGPSW+3*expGPSL))*10)/10;
                            adjExpDog=Math.round((sc30*(3*expGPSL)+sc31*(3*expGPSL+expGPSW)+sc32*(3*expGPSL+2*expGPSW)+sc03*(3*expGPSW)+sc13*(expGPSL+3*expGPSW)+sc23*(2*expGPSL+3*expGPSW))*10)/10;
                          } else {
                            adjExpFav=Math.round((sc20*2*expGPSW+sc21*(2*expGPSW+expGPSL)+sc12*(expGPSW+2*expGPSL)+sc02*2*expGPSL)*10)/10;
                            adjExpDog=Math.round((sc20*2*expGPSL+sc21*(2*expGPSL+expGPSW)+sc12*(expGPSL+2*expGPSW)+sc02*2*expGPSW)*10)/10;
                          }
                          adjLine=Math.round((adjExpFav-adjExpDog)*2)/2;
                          adjPick=adjLine>=2?`${dispFav} -${adjLine} Games`:adjLine>=0.5?`${dispFav} -${adjLine} Games (knapp)`:"Kein klares Handicap";
                          adjReason=adjLine>=2?`${dispFav} dominiert mit ~${adjLine} Games Vorsprung (News-adjustiert).`:adjLine>=0.5?`Leichter Vorteil für ${dispFav} (News-adjustiert).`:"Zu knapp für klares Handicap.";
                        }
                        return (
                          <>
                            <span style={{color:"#e2e8f0",fontWeight:700,fontSize:"15px"}}>{adjPick}</span>
                            <div style={{display:"flex",gap:"20px",margin:"10px 0"}}>
                              <div style={{textAlign:"center"}}><div style={{fontSize:"11px",color:"#64748b",marginBottom:"2px"}}>Exp. Games {dispFav?.split(" ").slice(-1)[0]}</div><div style={{fontSize:"20px",fontWeight:800,color:"#4ade80"}}>{adjExpFav}</div></div>
                              <div style={{textAlign:"center",alignSelf:"center",color:"#475569",fontSize:"18px"}}>:</div>
                              <div style={{textAlign:"center"}}><div style={{fontSize:"11px",color:"#64748b",marginBottom:"2px"}}>Exp. Games {dispDog?.split(" ").slice(-1)[0]}</div><div style={{fontSize:"20px",fontWeight:800,color:"#94a3b8"}}>{adjExpDog}</div></div>
                            </div>
                            <p style={{margin:0,fontSize:"13px",color:"#94a3b8"}}>{adjReason}</p>
                          </>
                        );
                      })()}
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
                              if (oddsGap > 10) reasons.push(`Bookmaker significantly undervalues ${bestPick} (${implProb}% implied vs ${ourProb}% model — gap of ${oddsGap}%)`);
                              else if (oddsGap > 5) reasons.push(`Bookmaker slightly undervalues ${bestPick} (${implProb}% implied vs ${ourProb}% model)`);
                              if (pickStats && oppStats) {
                                if (pickStats.serve - oppStats.serve >= 3) reasons.push(`Stronger serve (${pickStats.serve} vs ${oppStats.serve})`);
                                if (pickStats.return - oppStats.return >= 3) reasons.push(`Stronger return (${pickStats.return} vs ${oppStats.return})`);
                                if (pickStats.clutch - oppStats.clutch >= 3) reasons.push(`Higher clutch factor (${pickStats.clutch} vs ${oppStats.clutch})`);
                                if (pickStats.momentum - oppStats.momentum >= 3) reasons.push(`Better momentum (${pickStats.momentum} vs ${oppStats.momentum})`);
                              }
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

                  {(() => {
                    // ══════════════════════════════════════════════════════════
                    // SINGLE SOURCE OF TRUTH — alle 5 Tips basieren auf favProb
                    // Priorität: 1. Buchmacher-Quoten  2. News-adjustiert  3. Modell
                    // ══════════════════════════════════════════════════════════

                    const hasNewsAdj = newsAnalysis && !newsAnalysis.error && !newsAnalysis.noNews && newsAnalysis.netMod !== 0;
                    const rawP1w = prediction.prediction?.[prediction.player1] || 50;
                    const rawP2w = prediction.prediction?.[prediction.player2] || 50;

                    // Buchmacher-Quoten aus Value Bet Check
                    const bookOdds1 = odds1 && odds1 > 1 ? odds1 : null;
                    const bookOdds2 = odds2 && odds2 > 1 ? odds2 : null;
                    const hasBookOdds = bookOdds1 && bookOdds2;

                    // Implied probabilities aus Quoten (normalisiert auf 100%)
                    let bookP1 = null, bookP2 = null;
                    if (hasBookOdds) {
                      const imp1 = 1/bookOdds1, imp2 = 1/bookOdds2;
                      const total = imp1 + imp2; // >1 wegen Marge
                      bookP1 = Math.round((imp1/total)*100);
                      bookP2 = 100 - bookP1;
                    }

                    // Quellen-Hierarchie
                    const matchP1 = hasBookOdds ? bookP1
                                  : hasNewsAdj  ? newsAnalysis.adjustedProb1
                                  : rawP1w;
                    const matchP2 = hasBookOdds ? bookP2
                                  : hasNewsAdj  ? newsAnalysis.adjustedProb2
                                  : rawP2w;
                    const sourceLabel = hasBookOdds ? "📊 Buchmacher-Quoten"
                                      : hasNewsAdj  ? "📰 News-adjustiert"
                                      : "🤖 Modell";
                    const sourceColor = hasBookOdds ? "#facc15"
                                      : hasNewsAdj  ? "#a78bfa"
                                      : "#22d3ee";

                    const fav = matchP1 >= matchP2 ? prediction.player1 : prediction.player2;
                    const dog = matchP1 >= matchP2 ? prediction.player2 : prediction.player1;
                    const favProb = Math.max(matchP1, matchP2);
                    const dogProb = Math.min(matchP1, matchP2);
                    const bo = prediction.bo || 3;
                    const setsToWin = bo === 5 ? 3 : 2;
                    const surface = prediction.surface || "hard";

                    // 2. SET WIN PROBABILITY — abgeleitet direkt von favProb (Match Winner)
                    // Formel: setP so dass P(fav gewinnt Match) = favProb/100
                    // Für Bo3: P(win match) = p² + 2p²(1-p) → löse nach p auf via Newton
                    // Näherung: setP ≈ favProb/100 ^ (1/setsToWin) — gute Näherung
                    // Korrekte Methode: iterativ
                    const matchWinTarget = favProb / 100;
                    const calcMatchWinFromSetP = (sp) => {
                      const sq = 1 - sp;
                      if (bo === 5) {
                        return sp*sp*sp + 3*sp*sp*sp*sq + 6*sp*sp*sp*sq*sq; // P(3-0)+P(3-1)+P(3-2)
                      } else {
                        return sp*sp + 2*sp*sp*sq; // P(2-0)+P(2-1)
                      }
                    };
                    // Binary search for consistent setP
                    let lo = 0.5, hi = 0.95, setP = 0.6;
                    for (let i = 0; i < 30; i++) {
                      const mid = (lo + hi) / 2;
                      if (calcMatchWinFromSetP(mid) < matchWinTarget) lo = mid;
                      else hi = mid;
                      setP = mid;
                    }
                    setP = Math.min(0.88, Math.max(0.50, setP));
                    const p = setP, q = 1 - p;

                    // 3. SET BETTING — direkt aus setP
                    let setBets = [];
                    if (bo === 5) {
                      const p30=p*p*p, p31=3*p*p*p*q, p32=6*p*p*p*q*q;
                      const upsetProb = Math.round((1 - calcMatchWinFromSetP(p))*100);
                      setBets = [
                        { score:`${fav.split(" ").pop()} 3-0`, prob:Math.round(p30*100), label:"3-0" },
                        { score:`${fav.split(" ").pop()} 3-1`, prob:Math.round(p31*100), label:"3-1" },
                        { score:`${fav.split(" ").pop()} 3-2`, prob:Math.round(p32*100), label:"3-2" },
                        { score:`${dog.split(" ").pop()} wins`, prob:upsetProb, label:"Upset" },
                      ];
                    } else {
                      const p20=p*p, p21=2*p*p*q;
                      const upsetProb = Math.round((1 - calcMatchWinFromSetP(p))*100);
                      setBets = [
                        { score:`${fav.split(" ").pop()} 2-0`, prob:Math.round(p20*100), label:"2-0" },
                        { score:`${fav.split(" ").pop()} 2-1`, prob:Math.round(p21*100), label:"2-1" },
                        { score:`${dog.split(" ").pop()} wins`, prob:upsetProb, label:"Upset" },
                      ];
                    }
                    // Most likely outcome = highest prob bet
                    const mostLikely = [...setBets].sort((a,b)=>b.prob-a.prob)[0];

                    // 4. EXPECTED GAMES — aus setP, kalibriert gegen echte Tennisdaten
                    // loser_games = 6*(q/p)*0.85  →  bei setP=0.55: ~4.6, bei 0.65: ~3.7, bei 0.75: ~2.9
                    const expGperSetFav = 6.0;
                    const expGperSetDog = Math.min(5.0, Math.max(1.0, 6.0 * (q/p) * 0.85));

                    // Expected games in full match
                    let expFavG, expDogG;
                    if (bo === 5) {
                      const sc30=p*p*p,sc31=3*p*p*p*q,sc32=6*p*p*p*q*q;
                      const sc03=q*q*q,sc13=3*p*q*q*q,sc23=6*p*p*q*q*q;
                      // fav games = sets won * avgGamesWonSet + sets lost * avgGamesLostSet
                      expFavG = sc30*(3*expGperSetFav+0*expGperSetDog) + sc31*(3*expGperSetFav+1*expGperSetDog) + sc32*(3*expGperSetFav+2*expGperSetDog)
                               + sc03*(0*expGperSetFav+3*expGperSetDog) + sc13*(1*expGperSetFav+3*expGperSetDog) + sc23*(2*expGperSetFav+3*expGperSetDog);
                      expDogG = sc30*(3*expGperSetDog+0*expGperSetFav) + sc31*(3*expGperSetDog+1*expGperSetFav) + sc32*(3*expGperSetDog+2*expGperSetFav)
                               + sc03*(0*expGperSetDog+3*expGperSetFav) + sc13*(1*expGperSetDog+3*expGperSetFav) + sc23*(2*expGperSetDog+3*expGperSetFav);
                    } else {
                      const sc20=p*p,sc21=2*p*p*q,sc12=2*p*q*q,sc02=q*q;
                      expFavG = sc20*(2*expGperSetFav) + sc21*(2*expGperSetFav+expGperSetDog) + sc12*(expGperSetFav+2*expGperSetDog) + sc02*(2*expGperSetDog);
                      expDogG = sc20*(2*expGperSetDog) + sc21*(2*expGperSetDog+expGperSetFav) + sc12*(expGperSetDog+2*expGperSetFav) + sc02*(2*expGperSetFav);
                    }
                    expFavG = Math.round(expFavG * 10) / 10;
                    expDogG = Math.round(expDogG * 10) / 10;
                    const expTotal = Math.round((expFavG + expDogG) * 10) / 10;

                    // 5. HANDICAP
                    const hLine = Math.round((expFavG - expDogG) * 2) / 2;
                    const hPick = hLine >= 2 ? `${fav} -${hLine} Games`
                                : hLine >= 0.5 ? `${fav} -${hLine} Games (knapp)`
                                : "Kein klares Handicap";
                    const hConf = hLine >= 4 ? "High" : hLine >= 2 ? "Medium" : "Low";
                    const hColor = hLine >= 4 ? "#4ade80" : hLine >= 2 ? "#facc15" : "#94a3b8";

                    // 6. OVER/UNDER
                    // Line = expected total rounded to nearest 0.5
                    const ouLine = Math.round(expTotal / 0.5) * 0.5;
                    // Probability of going over: based on how far expected is from line
                    const ouDiff = expTotal - ouLine;
                    const ouProb = Math.min(80, Math.max(35, 50 + ouDiff * 15));
                    const ouPick = ouDiff >= 0 ? `Over ${ouLine}` : `Under ${ouLine}`;
                    const ouConf = Math.abs(ouDiff) > 1.5 ? "High" : Math.abs(ouDiff) > 0.5 ? "Medium" : "Low";
                    const ouColor = ouConf === "High" ? "#4ade80" : ouConf === "Medium" ? "#facc15" : "#94a3b8";

                    // 7. OVER 3.5 SETS (Bo5 only) — direkt aus setBets, konsistent!
                    const over35Prob = bo === 5
                      ? Math.round((setBets.find(b=>b.label==="3-2")?.prob||0) + (setBets.find(b=>b.label==="Upset")?.prob||0))
                      : 0; // only defined for Bo5

                    // Confidence helpers
                    const matchWinner = { pick: fav, prob: favProb,
                      confidence: favProb > 70 ? "High" : favProb > 60 ? "Medium" : "Low",
                      color: favProb > 70 ? "#4ade80" : favProb > 60 ? "#facc15" : "#94a3b8" };
                    const tipStyle = (conf) => ({
                      background: conf === "High" ? "rgba(74,222,128,0.06)" : conf === "Medium" ? "rgba(250,204,21,0.06)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${conf === "High" ? "rgba(74,222,128,0.2)" : conf === "Medium" ? "rgba(250,204,21,0.2)" : "rgba(255,255,255,0.07)"}`,
                      borderRadius: "12px", padding: "14px 16px", marginBottom: "10px"
                    });

                    return (
                      <div style={{marginTop:"20px",padding:"20px",borderRadius:"16px",background:"rgba(255,255,255,0.02)",border:`1px solid ${hasNewsAdj?"rgba(139,92,246,0.25)":"rgba(255,255,255,0.07)"}`}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
                          <h4 style={{margin:0,color:"#e2e8f0",fontSize:"15px",fontWeight:800}}>🎯 Betting Tips</h4>
                          <span style={{fontSize:"11px",color:sourceColor,background:`${sourceColor}18`,border:`1px solid ${sourceColor}33`,borderRadius:"6px",padding:"2px 8px",fontWeight:600}}>
                            {sourceLabel}{hasNewsAdj && !hasBookOdds ? ` (${newsAnalysis.netMod > 0 ? "+" : ""}${newsAnalysis.netMod}%)` : ""}
                          </span>
                        </div>
                        <div style={tipStyle(matchWinner.confidence)}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                            <span style={{fontSize:"11px",color:"#64748b",textTransform:"uppercase",letterSpacing:"1px",fontWeight:700}}>1. Match Winner</span>
                            <span style={{fontSize:"11px",fontWeight:700,color:matchWinner.color,background:`${matchWinner.color}22`,padding:"2px 8px",borderRadius:"6px"}}>{matchWinner.confidence} Confidence</span>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <span style={{fontSize:"16px",fontWeight:800,color:"#e2e8f0"}}>✅ {fav}</span>
                            <div style={{textAlign:"right"}}>
                              <span style={{fontSize:"20px",fontWeight:900,color:matchWinner.color}}>{favProb}%</span>
                              <div style={{fontSize:"11px",color:"#64748b",marginTop:"2px"}}>Faire Quote: <span style={{color:"#facc15",fontWeight:700}}>{(1/(favProb/100)).toFixed(2)}</span></div>
                            </div>
                          </div>
                          {/* Underdog faire Quote */}
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"8px",padding:"6px 10px",borderRadius:"8px",background:"rgba(255,255,255,0.03)"}}>
                            <span style={{fontSize:"12px",color:"#64748b"}}>{dog} ({dogProb}%)</span>
                            <span style={{fontSize:"12px",color:"#475569"}}>Faire Quote: <span style={{color:"#94a3b8",fontWeight:600}}>{(1/(dogProb/100)).toFixed(2)}</span></span>
                          </div>
                          <p style={{margin:"6px 0 0",fontSize:"12px",color:"#64748b"}}>Model gives {fav.split(" ").pop()} a {favProb}% win probability vs {dogProb}% for {dog.split(" ").pop()}.</p>
                        </div>
                        <div style={tipStyle(mostLikely?.prob > 40 ? "High" : "Medium")}>
                          <div style={{marginBottom:"10px"}}>
                            <span style={{fontSize:"11px",color:"#64748b",textTransform:"uppercase",letterSpacing:"1px",fontWeight:700}}>2. Set Betting (Best of {bo})</span>
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:`repeat(${setBets.length},1fr)`,gap:"8px"}}>
                            {setBets.map((b,i) => {
                              const isTop = b === mostLikely;
                              return (
                                <div key={i} style={{textAlign:"center",padding:"10px 6px",borderRadius:"10px",background:isTop?"rgba(34,211,238,0.08)":"rgba(255,255,255,0.03)",border:isTop?"1px solid rgba(34,211,238,0.3)":"1px solid rgba(255,255,255,0.06)"}}>
                                  <div style={{fontSize:"11px",color:isTop?"#22d3ee":"#64748b",fontWeight:700,marginBottom:"4px"}}>{b.label}</div>
                                  <div style={{fontSize:"16px",fontWeight:800,color:isTop?"#22d3ee":"#94a3b8"}}>{b.prob}%</div>
                                  <div style={{fontSize:"11px",color:"#facc15",fontWeight:600,marginTop:"3px"}}>{b.prob > 0 ? (1/(b.prob/100)).toFixed(2) : "—"}</div>
                                  <div style={{fontSize:"10px",color:"#475569",marginTop:"1px"}}>{b.score}</div>
                                </div>
                              );
                            })}
                          </div>
                          <p style={{margin:"8px 0 0",fontSize:"12px",color:"#64748b"}}>Most likely outcome: <strong style={{color:"#22d3ee"}}>{mostLikely?.score}</strong> ({mostLikely?.prob}%) · Faire Quote: <span style={{color:"#facc15",fontWeight:600}}>{mostLikely?.prob > 0 ? (1/(mostLikely.prob/100)).toFixed(2) : "—"}</span></p>
                        </div>
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
                          <p style={{margin:"6px 0 0",fontSize:"12px",color:"#64748b"}}>
                            {hLine >= 4 ? `${fav.split(" ").pop()} dominiert mit erwartetem Vorsprung von ${hLine} Games.`
                            : hLine >= 2 ? `Klarer Vorteil für ${fav.split(" ").pop()} — ${hLine} Games erwartet.`
                            : hLine >= 0.5 ? `Knapper Vorteil für ${fav.split(" ").pop()}.`
                            : "Zu ausgeglichen für ein klares Handicap."}
                          </p>
                        </div>
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
                          <div style={{display:"flex",gap:"8px",marginTop:"8px"}}>
                            <div style={{flex:1,textAlign:"center",padding:"6px 8px",borderRadius:"8px",background:`${ouColor}0d`,border:`1px solid ${ouColor}33`}}>
                              <div style={{fontSize:"10px",color:"#64748b",marginBottom:"2px"}}>{ouPick}</div>
                              <div style={{fontSize:"13px",fontWeight:700,color:"#facc15"}}>{(1/(Math.max(1,Math.round(ouProb))/100)).toFixed(2)}</div>
                              <div style={{fontSize:"10px",color:"#475569"}}>{Math.round(ouProb)}%</div>
                            </div>
                            <div style={{flex:1,textAlign:"center",padding:"6px 8px",borderRadius:"8px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
                              <div style={{fontSize:"10px",color:"#64748b",marginBottom:"2px"}}>{ouPick.startsWith("Over")?"Under":"Over"} {ouLine}</div>
                              <div style={{fontSize:"13px",fontWeight:700,color:"#94a3b8"}}>{(1/(Math.max(1,100-Math.round(ouProb))/100)).toFixed(2)}</div>
                              <div style={{fontSize:"10px",color:"#475569"}}>{Math.round(100-ouProb)}%</div>
                            </div>
                          </div>
                          <p style={{margin:"6px 0 0",fontSize:"12px",color:"#64748b"}}>Model expects {expFavG} games for {fav.split(" ").pop()} + {expDogG} for {dog.split(" ").pop()} = {expTotal} total.</p>
                        </div>
                        {bo === 5 && (() => {
                          // Over 3.5 Sets — direkt aus setBets: P(3-2) + P(Upset) = P(>3.5 sets)
                          const over35 = over35Prob;
                          const under35 = 100 - over35;
                          const o35Conf = over35 >= 55 ? "High" : over35 >= 40 ? "Medium" : "Low";
                          const o35Color = over35 >= 55 ? "#4ade80" : over35 >= 40 ? "#facc15" : "#94a3b8";
                          const surfaceName = prediction.surface;
                          const surfIcon = surfaceName === "clay" ? "🧱 Clay" : surfaceName === "grass" ? "🌿 Grass" : "🏟️ Hard";
                          const p30prob = setBets.find(b=>b.label==="3-0")?.prob || 0;
                          const p31prob = setBets.find(b=>b.label==="3-1")?.prob || 0;
                          const oddsVal = parseFloat(String(odds35Str).replace(",","."));
                          const hasOdds = !isNaN(oddsVal) && oddsVal > 1;
                          const impliedProb = hasOdds ? Math.round(100 / oddsVal) : null;
                          const edge = hasOdds ? parseFloat((over35 - impliedProb).toFixed(1)) : null;
                          const isValue = edge !== null && edge > 0;
                          const edgeColor = edge > 5 ? "#4ade80" : edge > 0 ? "#facc15" : "#f87171";
                          return (
                            <div style={tipStyle(o35Conf)}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                                <span style={{fontSize:"11px",color:"#64748b",textTransform:"uppercase",letterSpacing:"1px",fontWeight:700}}>5. Over 3.5 Sets</span>
                                <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                                  <span style={{fontSize:"10px",color:"#475569"}}>{surfIcon}</span>
                                  <span style={{fontSize:"11px",fontWeight:700,color:o35Color,background:`${o35Color}22`,padding:"2px 8px",borderRadius:"6px"}}>{o35Conf} Confidence</span>
                                </div>
                              </div>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                                <span style={{fontSize:"16px",fontWeight:800,color:"#e2e8f0"}}>
                                  {over35 >= 50 ? `✅ Over 3.5 Sets (${over35}%)` : `❌ Under 3.5 Sets (${under35}%)`}
                                </span>
                                <div style={{textAlign:"right"}}>
                                  <div style={{fontSize:"12px",color:"#64748b"}}>3-0 + 3-1 prob.</div>
                                  <div style={{fontSize:"15px",fontWeight:800,color:"#94a3b8"}}>{p30prob+p31prob}%</div>
                                </div>
                              </div>
                              <div style={{display:"flex",gap:"8px",marginBottom:"10px"}}>
                                <div style={{flex:1,textAlign:"center",padding:"6px 8px",borderRadius:"8px",background:over35>=50?`${o35Color}0d`:"rgba(255,255,255,0.03)",border:`1px solid ${over35>=50?o35Color+"33":"rgba(255,255,255,0.07)"}`}}>
                                  <div style={{fontSize:"10px",color:"#64748b",marginBottom:"2px"}}>Over 3.5 Sets</div>
                                  <div style={{fontSize:"13px",fontWeight:700,color:"#facc15"}}>{over35>0?(1/(over35/100)).toFixed(2):"—"}</div>
                                  <div style={{fontSize:"10px",color:"#475569"}}>{over35}%</div>
                                </div>
                                <div style={{flex:1,textAlign:"center",padding:"6px 8px",borderRadius:"8px",background:over35<50?`${o35Color}0d`:"rgba(255,255,255,0.03)",border:`1px solid ${over35<50?o35Color+"33":"rgba(255,255,255,0.07)"}`}}>
                                  <div style={{fontSize:"10px",color:"#64748b",marginBottom:"2px"}}>Under 3.5 Sets</div>
                                  <div style={{fontSize:"13px",fontWeight:700,color:"#facc15"}}>{under35>0?(1/(under35/100)).toFixed(2):"—"}</div>
                                  <div style={{fontSize:"10px",color:"#475569"}}>{under35}%</div>
                                </div>
                              </div>
                              <div style={{height:"4px",background:"#1e293b",borderRadius:"999px",overflow:"hidden",marginBottom:"10px"}}>
                                <div style={{width:`${over35}%`,height:"100%",background:o35Color,borderRadius:"999px",transition:"width 0.4s"}} />
                              </div>
                              <div style={{background:"rgba(255,255,255,0.03)",borderRadius:"10px",padding:"10px 12px",border:"1px solid rgba(255,255,255,0.06)"}}>
                                <div style={{fontSize:"11px",color:"#64748b",marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.5px"}}>💰 Bookmaker Odds — Over 3.5 Sets</div>
                                <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
                                  <input type="text" inputMode="decimal" placeholder="e.g. 1.85" value={odds35Str}
                                    onChange={e => { setOdds35Str(e.target.value); const v = parseFloat(e.target.value.replace(",",".")); if(!isNaN(v)&&v>1) setOdds35(v); }}
                                    onBlur={e => { const v = parseFloat(e.target.value.replace(",",".")); if(!isNaN(v)&&v>1){setOdds35(v);setOdds35Str(String(v));} }}
                                    style={{flex:1,padding:"8px 12px",borderRadius:"8px",background:"#0f172a",border:"1px solid rgba(34,211,238,0.3)",color:"#e2e8f0",fontSize:"14px",outline:"none"}}
                                  />
                                  {hasOdds && (
                                    <div style={{textAlign:"right",minWidth:"80px"}}>
                                      <div style={{fontSize:"11px",color:"#64748b"}}>Implied</div>
                                      <div style={{fontSize:"14px",fontWeight:700,color:"#f472b6"}}>{impliedProb}%</div>
                                    </div>
                                  )}
                                </div>
                                {hasOdds && (
                                  <div style={{marginTop:"10px",padding:"10px 12px",borderRadius:"8px",background:isValue?"rgba(74,222,128,0.08)":"rgba(248,113,113,0.08)",border:`1px solid ${isValue?"rgba(74,222,128,0.2)":"rgba(248,113,113,0.2)"}`}}>
                                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                      <div>
                                        <div style={{fontSize:"13px",fontWeight:700,color:isValue?"#4ade80":"#f87171",marginBottom:"2px"}}>{isValue ? "✅ Value Bet!" : "❌ No Value"}</div>
                                        <div style={{fontSize:"11px",color:"#64748b"}}>Our model: <span style={{color:o35Color,fontWeight:700}}>{over35}%</span>{" · "}Bookmaker: <span style={{color:"#f472b6",fontWeight:700}}>{impliedProb}%</span></div>
                                      </div>
                                      <div style={{textAlign:"right"}}>
                                        <div style={{fontSize:"11px",color:"#64748b"}}>Edge</div>
                                        <div style={{fontSize:"20px",fontWeight:900,color:edgeColor}}>{edge > 0 ? "+" : ""}{edge}%</div>
                                      </div>
                                    </div>
                                    {isValue && <div style={{marginTop:"6px",fontSize:"11px",color:"#64748b"}}>Odds of {oddsVal} imply {impliedProb}% — our model gives {over35}%. Positive edge at these odds.</div>}
                                  </div>
                                )}
                              </div>
                              <p style={{margin:"8px 0 0",fontSize:"12px",color:"#64748b"}}>
                                Berechnet aus Set Betting: P(3-2) + P(Upset) = {over35}% · P(3-0) + P(3-1) = {under35}%.
                                {surfaceName==="clay"?" Clay tendiert zu längeren Matches.":surfaceName==="grass"?" Grass bevorzugt kürzere Matches.":" Hard Courts sind neutral."}
                              </p>
                            </div>
                          );
                        })()}
                        <p style={{margin:"8px 0 0",fontSize:"11px",color:"#334155",textAlign:"center"}}>⚠️ These are model-based estimates only. Always bet responsibly.</p>

                        {/* ── SCHNELL-WETTE DIREKT LOGGEN ──────────────────── */}
                        <div style={{marginTop:"16px",padding:"16px",borderRadius:"14px",background:"rgba(74,222,128,0.04)",border:"1px solid rgba(74,222,128,0.15)"}}>
                          <div style={{fontSize:"13px",fontWeight:700,color:"#4ade80",marginBottom:"12px",display:"flex",alignItems:"center",gap:"8px"}}>
                            📋 Wette direkt loggen
                            <span style={{fontSize:"10px",color:"#475569",fontWeight:500}}>Quoten aus Value Check werden übernommen</span>
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"8px"}}>
                            {[{
                              label:`🏆 ${fav.split(" ").pop()} siegt`,
                              type:"match_winner",
                              pick: fav,
                              odds: hasBookOdds
                                ? (matchP1>=matchP2 ? bookOdds1 : bookOdds2)
                                : (1/(favProb/100)).toFixed(2),
                              prob: favProb
                            },
                            mostLikely && {
                              label:`🎾 ${mostLikely.score}`,
                              type: mostLikely.label==="Upset"?"match_winner"
                                  : mostLikely.label.includes("2-")?"set_2_"+mostLikely.label.split("-")[1]
                                  : "set_3_"+mostLikely.label.split("-")[1],
                              pick: mostLikely.score,
                              odds: mostLikely.prob > 0 ? (1/(mostLikely.prob/100)).toFixed(2) : null,
                              prob: mostLikely.prob
                            },
                            /* +2.5 Sätze = leichter: Underdog gewinnt ≥1 Satz */
                            {
                              label:`📊 ${dog.split(" ").pop()} +2.5 Sätze`,
                              type:"set_hc_25",
                              pick:`${dog.split(" ").pop()} +2.5 Sätze`,
                              odds: (() => {
                                const pFav30 = bo===5
                                  ? (setBets.find(b=>b.label==="3-0")?.prob||0)/100
                                  : (setBets.find(b=>b.label==="2-0")?.prob||0)/100;
                                const p = 1 - pFav30;
                                return p > 0.01 ? (1/p).toFixed(2) : null;
                              })(),
                              prob: bo===5
                                ? 100 - (setBets.find(b=>b.label==="3-0")?.prob||0)
                                : 100 - (setBets.find(b=>b.label==="2-0")?.prob||0)
                            },
                            /* +1.5 Sätze = schwerer: Underdog gewinnt ≥2 Sätze (Bo5) oder Match (Bo3) */
                            {
                              label:`📊 ${dog.split(" ").pop()} +1.5 Sätze`,
                              type:"set_hc_15",
                              pick:`${dog.split(" ").pop()} +1.5 Sätze`,
                              odds: (() => {
                                if (bo===5) {
                                  // ≥2 Sätze = 1 - P(3-0) - P(3-1)
                                  const p30 = (setBets.find(b=>b.label==="3-0")?.prob||0)/100;
                                  const p31 = (setBets.find(b=>b.label==="3-1")?.prob||0)/100;
                                  const p = 1 - p30 - p31;
                                  return p > 0.01 ? (1/p).toFixed(2) : null;
                                } else {
                                  // Bo3: ≥2 Sätze = Underdog wins match
                                  const p = (setBets.find(b=>b.label==="Upset")?.prob||0)/100;
                                  return p > 0.01 ? (1/p).toFixed(2) : null;
                                }
                              })(),
                              prob: bo===5
                                ? Math.round(100 - (setBets.find(b=>b.label==="3-0")?.prob||0) - (setBets.find(b=>b.label==="3-1")?.prob||0))
                                : (setBets.find(b=>b.label==="Upset")?.prob||0)
                            },
                            bo===5 && {
                              label: over35Prob>=50 ? `📈 Over 3.5 Sets` : `📉 Under 3.5 Sets`,
                              type:"over_3_5",
                              pick: over35Prob>=50 ? "Over 3.5 Sets" : "Under 3.5 Sets",
                              odds: over35Prob>=50
                                ? (odds35 && odds35 > 1 ? odds35 : (1/(over35Prob/100)).toFixed(2))
                                : (1/((100-over35Prob)/100)).toFixed(2),
                              prob: over35Prob>=50 ? over35Prob : 100-over35Prob
                            },
                            hLine >= 1 && {
                              label:`📉 ${fav.split(" ").pop()} -${hLine} Games`,
                              type:"handicap",
                              pick:`${fav.split(" ").pop()} -${hLine} Games`,
                              odds: null,
                              prob: null
                            }].filter(Boolean).map((bet, i) => bet && (
                              <button key={i} onClick={() => {
                                setBetModal({
                                  player1: prediction.player1,
                                  player2: prediction.player2,
                                  tournament: prediction.tournament || "",
                                  prefill: {
                                    betType: bet.type,
                                    pick: bet.pick,
                                    odds: bet.odds ? String(bet.odds) : ""
                                  }
                                });
                              }} style={{
                                padding:"10px 12px",borderRadius:"10px",
                                border:"1px solid rgba(74,222,128,0.2)",
                                background:"rgba(74,222,128,0.06)",
                                cursor:"pointer",textAlign:"left",transition:"all 0.2s"
                              }}
                              onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(74,222,128,0.4)"}
                              onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(74,222,128,0.2)"}>
                                <div style={{fontSize:"12px",fontWeight:700,color:"#4ade80",marginBottom:"3px"}}>{bet.label}</div>
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                  {bet.prob!=null && <span style={{fontSize:"11px",color:"#64748b"}}>Modell: {Math.round(bet.prob)}%</span>}
                                  {bet.odds && <span style={{fontSize:"13px",fontWeight:800,color:"#facc15"}}>{bet.odds}</span>}
                                </div>
                              </button>
                            ))}
                          </div>
                          <button onClick={() => setBetModal({
                            player1: prediction.player1,
                            player2: prediction.player2,
                            tournament: prediction.tournament || ""
                          })} style={{width:"100%",padding:"9px",borderRadius:"10px",border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.03)",color:"#64748b",fontSize:"12px",cursor:"pointer",fontWeight:600}}>
                            ✏️ Eigene Wette eingeben
                          </button>
                        </div>
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
                              {tourn.eliminatedCount>0&&<span style={{color:"#f87171"}}>({tourn.eliminatedCount} eliminated)</span>}
                            </>
                          ) : <span>{tourn.playerCount} players in draw</span>}
                          {tourn.isLive&&<span style={{color:"#f87171",fontWeight:700}}>🔴 Live</span>}
                        </div>
                      </div>
                      {tourn.favorite && <div style={{textAlign:"right"}}><div style={{fontSize:"11px",color:"#64748b",marginBottom:"2px"}}>Favorite</div><div style={{fontSize:"14px",fontWeight:700,color:"#4ade80"}}>{tourn.favorite.name}</div><div style={{fontSize:"11px",color:"#475569"}}>#{tourn.favorite.rank}</div></div>}
                    </div>
                    {isExpanded && (
                      <div style={{borderTop:"1px solid rgba(255,255,255,0.05)",padding:"16px 20px"}}>
                        {(() => {
                          const allMatches = (tourn.rounds||[]).flatMap(r => r.matches||[]);
                          const finished = allMatches.filter(m => m.isFinished && !m.isWalkover && m.actualWinner && m.prediction);
                          const correct = finished.filter(m => m.correct === true).length;
                          const wrong = finished.filter(m => m.correct === false).length;
                          const total = finished.length;
                          const accuracy = total > 0 ? Math.round((correct/total)*100) : null;
                          const byRound = {};
                          finished.forEach(m => {
                            const round = (tourn.rounds||[]).find(r => r.matches?.includes(m))?.round || "?";
                            if (!byRound[round]) byRound[round] = {correct:0,total:0};
                            byRound[round].total++;
                            if (m.correct) byRound[round].correct++;
                          });
                          if (total === 0) return (
                            <div style={{marginBottom:"16px",padding:"10px 14px",borderRadius:"10px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",fontSize:"12px",color:"#475569"}}>
                              📊 No finished matches yet — accuracy tracker will update automatically
                            </div>
                          );
                          const accColor = accuracy >= 70 ? "#4ade80" : accuracy >= 50 ? "#facc15" : "#f87171";
                          return (
                            <div style={{marginBottom:"16px",padding:"12px 16px",borderRadius:"12px",background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.2)"}}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                                <span style={{fontSize:"13px",fontWeight:700,color:"#818cf8"}}>📊 Prediction Accuracy — {tourn.name}</span>
                                <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                                  <span style={{fontSize:"11px",color:"#64748b"}}>{total} matches resolved</span>
                                  <span style={{fontSize:"20px",fontWeight:900,color:accColor}}>{accuracy}%</span>
                                </div>
                              </div>
                              <div style={{height:"6px",background:"#1e293b",borderRadius:"999px",overflow:"hidden",marginBottom:"10px",display:"flex"}}>
                                <div style={{width:`${Math.round(correct/total*100)}%`,background:"#4ade80",transition:"width 0.4s"}} />
                                <div style={{width:`${Math.round(wrong/total*100)}%`,background:"#f87171"}} />
                              </div>
                              <div style={{display:"flex",gap:"16px",flexWrap:"wrap"}}>
                                <span style={{fontSize:"12px",color:"#4ade80"}}>✅ Correct: {correct}</span>
                                <span style={{fontSize:"12px",color:"#f87171"}}>❌ Wrong: {wrong}</span>
                                {Object.entries(byRound).map(([round, d]) => (
                                  <span key={round} style={{fontSize:"11px",color:"#64748b"}}>{round}: {d.correct}/{d.total}</span>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                        <div style={{display:"flex",gap:"8px",marginBottom:"16px"}}>
                          {["list","draw"].map(v => (
                            <button key={v} onClick={() => setTournamentView(prev => ({...prev,[globalIdx]:v}))}
                              style={{padding:"5px 14px",borderRadius:"8px",fontSize:"12px",fontWeight:700,cursor:"pointer",border:"none",
                                background:(tournamentView[globalIdx]||"list")===v?"rgba(34,211,238,0.15)":"rgba(255,255,255,0.04)",
                                color:(tournamentView[globalIdx]||"list")===v?"#22d3ee":"#475569"}}>
                              {v==="list"?"📋 List":"🌳 Draw"}
                            </button>
                          ))}
                        </div>
                        {(tournamentView[globalIdx]||"list")==="draw" && tourn.rounds?.length>0 && (
                          <div style={{overflowX:"auto",paddingBottom:"12px"}}>
                            <div style={{marginBottom:"12px",fontSize:"13px",fontWeight:700,color:"#22d3ee"}}>🌳 {tourn.name} — Draw View</div>
                            <div style={{display:"flex",gap:"0",minWidth:`${tourn.rounds.length*220}px`}}>
                              {[...tourn.rounds].reverse().map((r,ri) => (
                                <div key={ri} style={{flex:1,minWidth:"200px",padding:"0 6px"}}>
                                  <div style={{fontSize:"10px",fontWeight:800,color:"#475569",textTransform:"uppercase",letterSpacing:"1px",textAlign:"center",marginBottom:"12px",paddingBottom:"6px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>{r.round}</div>
                                  <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around",height:`${Math.max(r.matches.length*64,120)}px`,gap:"8px"}}>
                                    {r.matches.map((m,mi) => {
                                      const favIsP1 = (m.prob||50) >= 50;
                                      const fav = favIsP1 ? m.player1 : m.player2;
                                      const dog = favIsP1 ? m.player2 : m.player1;
                                      const favProb = m.prob || 50;
                                      return (
                                        <div key={mi} onClick={() => {setP1(m.player1);setP2(m.player2);setTab("predictor");}}
                                          style={{background:m.isWalkover?"rgba(250,204,21,0.06)":m.isFinished?"rgba(74,222,128,0.05)":"rgba(255,255,255,0.03)",
                                            border:`1px solid ${m.isWalkover?"rgba(250,204,21,0.2)":m.isFinished?"rgba(74,222,128,0.15)":"rgba(255,255,255,0.07)"}`,
                                            borderRadius:"10px",padding:"8px 10px",cursor:"pointer",transition:"all 0.15s"}}>
                                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"5px"}}>
                                            <div style={{display:"flex",alignItems:"center",gap:"5px",minWidth:0,flex:1}}>
                                              {m.actualWinner===m.player1&&<span style={{fontSize:"9px"}}>🏆</span>}
                                              <span style={{fontSize:"12px",fontWeight:m.prediction===m.player1||m.actualWinner===m.player1?700:400,
                                                color:m.actualWinner===m.player1?"#4ade80":m.prediction===m.player1?"#22d3ee":"#94a3b8",
                                                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                                {(m.player1||"").split(" ").pop()}
                                              </span>
                                            </div>
                                            <span style={{fontSize:"11px",fontWeight:700,color:m.prediction===m.player1?"#22d3ee":"#475569",flexShrink:0,marginLeft:"4px"}}>
                                              {m.prediction===m.player1?`${favProb}%`:m.prediction===m.player2?`${100-favProb}%`:""}
                                            </span>
                                          </div>
                                          <div style={{height:"3px",background:"#1e293b",borderRadius:"999px",overflow:"hidden",marginBottom:"5px"}}>
                                            <div style={{width:`${m.prediction===m.player1?favProb:100-favProb}%`,height:"100%",
                                              background:m.actualWinner===m.player1?"#4ade80":m.prediction===m.player1?"#22d3ee":"#475569",borderRadius:"999px"}} />
                                          </div>
                                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                            <div style={{display:"flex",alignItems:"center",gap:"5px",minWidth:0,flex:1}}>
                                              {m.actualWinner===m.player2&&<span style={{fontSize:"9px"}}>🏆</span>}
                                              <span style={{fontSize:"12px",fontWeight:m.prediction===m.player2||m.actualWinner===m.player2?700:400,
                                                color:m.actualWinner===m.player2?"#4ade80":m.prediction===m.player2?"#22d3ee":"#94a3b8",
                                                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                                {(m.player2||"").split(" ").pop()}
                                              </span>
                                            </div>
                                            <span style={{fontSize:"11px",fontWeight:700,color:m.prediction===m.player2?"#22d3ee":"#475569",flexShrink:0,marginLeft:"4px"}}>
                                              {m.prediction===m.player2?`${favProb}%`:m.prediction===m.player1?`${100-favProb}%`:""}
                                            </span>
                                          </div>
                                          {m.isWalkover&&<div style={{fontSize:"9px",color:"#facc15",marginTop:"3px"}}>⚠️ W/O</div>}
                                          {m.score&&<div style={{fontSize:"9px",color:"#475569",marginTop:"2px",textAlign:"center"}}>{m.score}</div>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {(tournamentView[globalIdx]||"list")==="list" && (<>
                          {tourn.winProbs?.length>0 && (
                          <div style={{marginBottom:"20px"}}>
                            <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"12px"}}>
                              <h4 style={{color:"#22d3ee",margin:0,fontSize:"14px"}}>🏅 Tournament Win Probability</h4>
                              {tourn.surface && <span style={{fontSize:"10px",color:"#64748b",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"6px",padding:"2px 7px"}}>
                                {tourn.surface==="clay"?"🧱 Clay":tourn.surface==="grass"?"🌿 Grass":"🏟️ Hard"} · Surface-adjustiert
                              </span>}
                            </div>
                            {tourn.winProbs.map((p,i) => {
                              const hasSurfBonus = p.surfMult && p.surfMult > 1.05;
                              const hasDrawBonus = p.drawFactor && p.drawFactor > 1.02;
                              const hasDrawPenalty = p.drawFactor && p.drawFactor < 0.98;
                              return (
                                <div key={i} style={{marginBottom:"10px",display:"flex",alignItems:"center",gap:"10px"}}>
                                  <span style={{width:"32px",fontSize:"11px",color:"#475569",flexShrink:0,textAlign:"right"}}>#{p.rank}</span>
                                  <div style={{width:"150px",flexShrink:0,minWidth:0}}>
                                    <div style={{fontSize:"13px",color:i===0?"#4ade80":"#cbd5e1",fontWeight:i===0?700:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                      {i===0&&"⭐ "}{p.name}
                                    </div>
                                    <div style={{display:"flex",gap:"4px",marginTop:"2px",flexWrap:"wrap"}}>
                                      {hasSurfBonus && <span style={{fontSize:"9px",color:"#f97316",background:"rgba(249,115,22,0.1)",border:"1px solid rgba(249,115,22,0.2)",borderRadius:"4px",padding:"0 4px"}}>
                                        🎯 Surface +{Math.round((p.surfMult-1)*100)}%
                                      </span>}
                                      {hasDrawBonus && <span style={{fontSize:"9px",color:"#4ade80",background:"rgba(74,222,128,0.1)",border:"1px solid rgba(74,222,128,0.2)",borderRadius:"4px",padding:"0 4px"}}>
                                        🎲 Leichtes Draw
                                      </span>}
                                      {hasDrawPenalty && <span style={{fontSize:"9px",color:"#f87171",background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:"4px",padding:"0 4px"}}>
                                        🎲 Schweres Draw
                                      </span>}
                                    </div>
                                  </div>
                                  <div style={{flex:1,height:"6px",background:"#1e293b",borderRadius:"999px",overflow:"hidden"}}>
                                    <div style={{width:`${p.winProb}%`,height:"100%",background:i===0?"linear-gradient(90deg,#22d3ee,#4ade80)":i===1?"#6366f1":i===2?"#8b5cf6":"#334155",borderRadius:"999px",transition:"width 0.4s ease"}} />
                                  </div>
                                  <strong style={{width:"36px",textAlign:"right",fontSize:"13px",color:i===0?"#4ade80":"#94a3b8",flexShrink:0}}>{p.winProb}%</strong>
                                </div>
                              );
                            })}
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
                        </>)}
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
              <PlayerAutocomplete label="Player 1..." playerNum={1} value={h2hP1} onChange={setH2hP1} players={playerNames} favorites={favoritePlayers} onToggleFavorite={toggleFavoritePlayer} />
              <PlayerAutocomplete label="Player 2..." playerNum={2} value={h2hP2} onChange={setH2hP2} players={playerNames} favorites={favoritePlayers} onToggleFavorite={toggleFavoritePlayer} />
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
                    const p1Last=h2hP1.toLowerCase().trim().split(" ").pop();
                    const p2Last=h2hP2.toLowerCase().trim().split(" ").pop();
                    const getWinner=(m)=>{const fp=(m.event_first_player||"").toLowerCase();const sp=(m.event_second_player||"").toLowerCase();const winnerIsFirst=m.event_winner==="First Player";const wName=winnerIsFirst?fp:sp;if(wName.includes(p1Last))return 1;if(wName.includes(p2Last))return 2;return winnerIsFirst?1:2;};
                    const surfaceStats=["hard","clay","grass"].map(s=>{const matches=h2hData.h2h_matches.filter(m=>getSurface(m.tournament_name)===s);const w1=matches.filter(m=>getWinner(m)===1).length;const w2=matches.filter(m=>getWinner(m)===2).length;return{s,w1,w2,total:matches.length};}).filter(x=>x.total>0);
                    return surfaceStats.length>0?(<div style={{marginTop:"20px",display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px"}}>{surfaceStats.map(({s,w1,w2,total})=>(<div key={s} style={{background:`${colors[s]}11`,border:`1px solid ${colors[s]}33`,borderRadius:"14px",padding:"14px",textAlign:"center"}}><div style={{fontSize:"20px",marginBottom:"4px"}}>{icons[s]}</div><div style={{fontSize:"11px",color:colors[s],textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",fontWeight:700}}>{s}</div><div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:"12px"}}><span style={{fontSize:"22px",fontWeight:900,color:"#22d3ee"}}>{w1}</span><span style={{color:"#475569"}}>:</span><span style={{fontSize:"22px",fontWeight:900,color:"#f472b6"}}>{w2}</span></div><div style={{fontSize:"11px",color:"#64748b",marginTop:"4px"}}>{total} Matches</div></div>))}</div>):null;
                  })()}
                </Panel>
                {h2hData.h2h_matches?.length>0&&(
                  <Panel title="📋 Recent Matches" style={{marginTop:"20px"}}>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:"13px"}}>
                        <thead><tr style={{color:"#94a3b8",borderBottom:"1px solid rgba(34,211,238,0.2)"}}><th style={{padding:"8px",textAlign:"left"}}>Date</th><th style={{padding:"8px",textAlign:"left"}}>Tournament</th><th style={{padding:"8px",textAlign:"left"}}>Surface</th><th style={{padding:"8px",textAlign:"left"}}>Result</th><th style={{padding:"8px",textAlign:"left"}}>Winner</th></tr></thead>
                        <tbody>{h2hData.h2h_matches.map((m,i)=>{
                          const p1Last=h2hP1.toLowerCase().trim().split(" ").pop();
                          const fp=(m.event_first_player||"").toLowerCase();
                          const sp=(m.event_second_player||"").toLowerCase();
                          const winnerIsFirst=m.event_winner==="First Player";
                          const wName=winnerIsFirst?fp:sp;
                          const p1Won=wName.includes(p1Last);
                          const winnerDisplay=winnerIsFirst?m.event_first_player:m.event_second_player;
                          const tn=(m.tournament_name||"").toLowerCase();
                          const surf=tn.includes("clay")||tn.includes("roland")||tn.includes("french")||tn.includes("monte")||tn.includes("madrid")||tn.includes("rome")||tn.includes("barcelona")?{label:"Clay",icon:"🧱",color:"#ef4444"}:tn.includes("grass")||tn.includes("wimbledon")||tn.includes("halle")||tn.includes("queens")||tn.includes("eastbourne")?{label:"Grass",icon:"🌿",color:"#4ade80"}:{label:"Hard",icon:"🏟️",color:"#22d3ee"};
                          return(<tr key={i} style={{borderBottom:"1px solid rgba(255,255,255,0.05)"}}><td style={{padding:"8px",color:"#64748b"}}>{m.event_date}</td><td style={{padding:"8px",color:"#cbd5e1"}}>{m.tournament_name}</td><td style={{padding:"8px"}}><span style={{background:`${surf.color}22`,color:surf.color,border:`1px solid ${surf.color}44`,borderRadius:"6px",padding:"2px 8px",fontSize:"11px",fontWeight:700,whiteSpace:"nowrap"}}>{surf.icon} {surf.label}</span></td><td style={{padding:"8px",color:"#94a3b8"}}>{m.event_final_result}</td><td style={{padding:"8px"}}><span style={{color:p1Won?"#22d3ee":"#f472b6",fontWeight:700}}>{winnerDisplay}</span></td></tr>);
                        })}</tbody>
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
            <p style={{color:"#94a3b8",marginTop:"-16px",marginBottom:"24px"}}>Your saved matches — add notes and track your picks</p>
            {watchlist.length === 0 ? (
              <div style={{textAlign:"center",padding:"60px 20px",background:"rgba(255,255,255,0.02)",borderRadius:"16px",border:"1px solid rgba(255,255,255,0.05)"}}>
                <div style={{fontSize:"48px",marginBottom:"16px"}}>🔖</div>
                <h3 style={{color:"#e2e8f0",marginBottom:"8px"}}>No matches saved yet</h3>
                <p style={{color:"#64748b",fontSize:"14px",marginBottom:"24px"}}>Go to the Matches tab and click "Add to Watchlist" on any upcoming match.</p>
                <button className="predictBtn" style={{width:"auto",padding:"10px 28px"}} onClick={() => setTab("matches")}>📅 Go to Matches</button>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
                {watchlist.map((w) => {
                  const note = watchlistNotes[w.key] || "";
                  const surface = (w.tournament||"").toLowerCase().includes("clay")||["roland","french","monte","madrid","rome","barcelona"].some(x=>(w.tournament||"").toLowerCase().includes(x)) ? {icon:"🧱",label:"Clay",color:"#ef4444"} : (w.tournament||"").toLowerCase().includes("grass")||["wimbledon","halle","queens"].some(x=>(w.tournament||"").toLowerCase().includes(x)) ? {icon:"🌿",label:"Grass",color:"#4ade80"} : {icon:"🏟️",label:"Hard",color:"#22d3ee"};
                  return (
                    <div key={w.key} style={{background:"#0f172a",borderRadius:"16px",border:"1px solid rgba(255,255,255,0.07)",overflow:"hidden"}}>
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
                        {note && (<div style={{display:"flex",justifyContent:"flex-end",marginTop:"4px"}}><span style={{fontSize:"11px",color:"#334155"}}>✓ Auto-saved</span></div>)}
                      </div>
                    </div>
                  );
                })}
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

        {tab === "history" && (
          <>
            <Header title="Match History" />
            <p style={{color:"#94a3b8",marginTop:"-16px",marginBottom:"24px"}}>Your last {matchHistory.length} predictions</p>
            {matchHistory.length === 0 ? (
              <div style={{textAlign:"center",padding:"60px 20px",background:"rgba(255,255,255,0.02)",borderRadius:"16px",border:"1px solid rgba(255,255,255,0.05)"}}>
                <div style={{fontSize:"48px",marginBottom:"16px"}}>🕐</div>
                <h3 style={{color:"#e2e8f0",marginBottom:"8px"}}>No predictions yet</h3>
                <p style={{color:"#64748b",fontSize:"14px",marginBottom:"24px"}}>Use the Match Predictor to calculate a prediction — it will appear here.</p>
                <button className="predictBtn" style={{width:"auto",padding:"10px 28px"}} onClick={() => setTab("predictor")}>⚡ Go to Match Predictor</button>
              </div>
            ) : (
              <>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
                  <div style={{display:"flex",gap:"16px",fontSize:"13px",color:"#64748b"}}>
                    <span>📊 {matchHistory.length} predictions</span>
                    <span style={{color:"#22d3ee"}}>Most recent first</span>
                  </div>
                  <button onClick={clearHistory} style={{padding:"6px 14px",borderRadius:"8px",border:"1px solid rgba(248,113,113,0.2)",background:"transparent",color:"#f87171",fontSize:"12px",cursor:"pointer"}}>
                    🗑️ Clear History
                  </button>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                  {matchHistory.map((h) => {
                    const p1prob = h.prediction?.[h.p1] || 50;
                    const p2prob = h.prediction?.[h.p2] || 50;
                    const surfIcon = h.surface === "clay" ? "🧱" : h.surface === "grass" ? "🌿" : "🏟️";
                    const date = new Date(h.date).toLocaleDateString("en-GB", {day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
                    return (
                      <div key={h.id} style={{background:"#0f172a",borderRadius:"14px",border:"1px solid rgba(255,255,255,0.07)",padding:"14px 16px",cursor:"pointer"}}
                        onClick={() => { setP1(h.p1); setP2(h.p2); setSurface(h.surface); setBestOf(h.bo||3); setTab("predictor"); }}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"10px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                            <span style={{fontSize:"13px"}}>{surfIcon}</span>
                            <span style={{fontSize:"11px",color:"#475569",textTransform:"uppercase",letterSpacing:"0.5px"}}>{h.surface} · {h.bo === 5 ? "🏆 Bo5" : "Bo3"}</span>
                          </div>
                          <span style={{fontSize:"11px",color:"#334155"}}>{date}</span>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:"8px",alignItems:"center"}}>
                          <div>
                            <div style={{fontSize:"14px",fontWeight:700,color:h.winner===h.p1?"#4ade80":"#94a3b8",marginBottom:"4px"}}>{h.winner===h.p1?"🏆 ":""}{h.p1}</div>
                            <div style={{height:"6px",background:"#1e293b",borderRadius:"999px",overflow:"hidden"}}>
                              <div style={{width:`${p1prob}%`,height:"100%",background:h.winner===h.p1?"linear-gradient(90deg,#22d3ee,#4ade80)":"#334155",borderRadius:"999px"}} />
                            </div>
                            <div style={{fontSize:"12px",color:h.winner===h.p1?"#4ade80":"#64748b",marginTop:"3px",fontWeight:700}}>{p1prob}%</div>
                          </div>
                          <div style={{textAlign:"center"}}>
                            <div style={{fontSize:"11px",color:"#334155",fontWeight:700}}>VS</div>
                            <div style={{fontSize:"10px",color:"#334155",marginTop:"2px"}}>Conf. {h.confidence}%</div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:"14px",fontWeight:700,color:h.winner===h.p2?"#4ade80":"#94a3b8",marginBottom:"4px"}}>{h.p2}{h.winner===h.p2?" 🏆":""}</div>
                            <div style={{height:"6px",background:"#1e293b",borderRadius:"999px",overflow:"hidden"}}>
                              <div style={{width:`${p2prob}%`,height:"100%",background:h.winner===h.p2?"linear-gradient(90deg,#22d3ee,#4ade80)":"#334155",borderRadius:"999px",marginLeft:"auto"}} />
                            </div>
                            <div style={{fontSize:"12px",color:h.winner===h.p2?"#4ade80":"#64748b",marginTop:"3px",fontWeight:700}}>{p2prob}%</div>
                          </div>
                        </div>
                        <div style={{marginTop:"10px",display:"flex",gap:"6px",alignItems:"center",borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:"10px"}}>
                          {!h.actualWinner ? (
                            <>
                              <span style={{fontSize:"11px",color:"#475569",flex:1}}>Mark result:</span>
                              <button onClick={(e) => {e.stopPropagation(); if(window.confirm(`Mark ${h.p1} as winner? Only confirm if this match is fully finished.`)) markPredictionResult(h.id, h.p1);}}
                                style={{padding:"3px 10px",borderRadius:"6px",border:"1px solid rgba(74,222,128,0.3)",background:"rgba(74,222,128,0.08)",color:"#4ade80",fontSize:"11px",cursor:"pointer",fontWeight:600}}>
                                {h.p1.split(" ").pop()} won
                              </button>
                              <button onClick={(e) => {e.stopPropagation(); if(window.confirm(`Mark ${h.p2} as winner? Only confirm if this match is fully finished.`)) markPredictionResult(h.id, h.p2);}}
                                style={{padding:"3px 10px",borderRadius:"6px",border:"1px solid rgba(248,113,113,0.3)",background:"rgba(248,113,113,0.08)",color:"#f87171",fontSize:"11px",cursor:"pointer",fontWeight:600}}>
                                {h.p2.split(" ").pop()} won
                              </button>
                            </>
                          ) : (
                            <div style={{display:"flex",alignItems:"center",gap:"8px",flex:1}}>
                              <span style={{fontSize:"13px"}}>{h.correct ? "✅" : "❌"}</span>
                              <span style={{fontSize:"12px",color:h.correct?"#4ade80":"#f87171",fontWeight:700}}>
                                {h.correct ? "Correct!" : "Wrong"} — {h.actualWinner} won
                              </span>
                            </div>
                          )}
                          <span style={{fontSize:"11px",color:"#22d3ee",cursor:"pointer"}} onClick={() => {setP1(h.p1);setP2(h.p2);setSurface(h.surface);setBestOf(h.bo||3);setTab("predictor");}}>↩ Re-run</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {tab === "performance" && (
          <>
            <Header title="Performance" />
            <p style={{color:"#94a3b8",marginTop:"-16px",marginBottom:"24px"}}>Track your prediction accuracy and value bet ROI</p>
            <div style={{background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:"14px",padding:"14px 18px",marginBottom:"24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:"13px",fontWeight:700,color:"#818cf8",marginBottom:"4px"}}>🔔 Live Match Notifications</div>
                <div style={{fontSize:"12px",color:"#64748b"}}>Get notified when a Watchlist match goes live</div>
              </div>
              {notifPermission === "granted" ? (
                <span style={{padding:"6px 14px",borderRadius:"8px",background:"rgba(74,222,128,0.1)",color:"#4ade80",fontSize:"12px",fontWeight:700,border:"1px solid rgba(74,222,128,0.3)"}}>✅ Enabled</span>
              ) : notifPermission === "denied" ? (
                <span style={{fontSize:"12px",color:"#f87171"}}>Blocked in browser settings</span>
              ) : (
                <button onClick={requestNotifications} style={{padding:"6px 14px",borderRadius:"8px",background:"rgba(99,102,241,0.15)",color:"#818cf8",fontSize:"12px",fontWeight:700,border:"1px solid rgba(99,102,241,0.3)",cursor:"pointer"}}>
                  Enable Notifications
                </button>
              )}
            </div>
            {(() => {
              const resolved = accuracyLog.filter(l => l.correct !== undefined);
              const correct = resolved.filter(l => l.correct).length;
              const accuracy = resolved.length > 0 ? Math.round((correct/resolved.length)*100) : null;
              const highConf = resolved.filter(l => l.confidence >= 70);
              const highConfCorrect = highConf.filter(l => l.correct).length;
              const bySurface = {};
              resolved.forEach(l => {
                if (!bySurface[l.surface]) bySurface[l.surface] = {correct:0,total:0};
                bySurface[l.surface].total++;
                if (l.correct) bySurface[l.surface].correct++;
              });
              return (
                <div style={{marginBottom:"28px"}}>
                  <div style={{fontSize:"14px",fontWeight:800,color:"#e2e8f0",marginBottom:"14px"}}>🎯 Prediction Accuracy</div>
                  {resolved.length === 0 ? (
                    <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"14px",padding:"24px",textAlign:"center",color:"#475569"}}>
                      No results tracked yet. Go to Match History and mark outcomes after matches finish.
                    </div>
                  ) : resolved.length < 5 ? (
                    <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"14px",padding:"24px",textAlign:"center"}}>
                      <div style={{fontSize:"32px",marginBottom:"8px"}}>📊</div>
                      <div style={{color:"#94a3b8",fontSize:"14px",marginBottom:"4px"}}>Not enough data yet</div>
                      <div style={{color:"#64748b",fontSize:"12px"}}>{resolved.length}/5 results needed for a meaningful accuracy score.</div>
                      <div style={{marginTop:"12px",display:"flex",gap:"4px",justifyContent:"center"}}>
                        {[...Array(5)].map((_,i) => (
                          <div key={i} style={{width:"32px",height:"6px",borderRadius:"999px",background:i < resolved.length ? "#22d3ee" : "#1e293b"}} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px"}}>
                      <div style={{background:"#0f172a",borderRadius:"14px",padding:"16px",border:"1px solid rgba(99,102,241,0.2)",textAlign:"center"}}>
                        <div style={{fontSize:"36px",fontWeight:900,color:accuracy>=60?"#4ade80":accuracy>=50?"#facc15":"#f87171"}}>{accuracy}%</div>
                        <div style={{fontSize:"11px",color:"#475569",marginTop:"4px"}}>Overall Accuracy</div>
                        <div style={{fontSize:"11px",color:"#64748b",marginTop:"2px"}}>{correct}/{resolved.length} predictions</div>
                      </div>
                      <div style={{background:"#0f172a",borderRadius:"14px",padding:"16px",border:"1px solid rgba(99,102,241,0.2)",textAlign:"center"}}>
                        <div style={{fontSize:"36px",fontWeight:900,color:"#22d3ee"}}>{highConf.length > 0 ? Math.round((highConfCorrect/highConf.length)*100) : "-"}%</div>
                        <div style={{fontSize:"11px",color:"#475569",marginTop:"4px"}}>High Conf. (≥70%)</div>
                        <div style={{fontSize:"11px",color:"#64748b",marginTop:"2px"}}>{highConfCorrect}/{highConf.length} predictions</div>
                      </div>
                      <div style={{background:"#0f172a",borderRadius:"14px",padding:"16px",border:"1px solid rgba(99,102,241,0.2)"}}>
                        <div style={{fontSize:"11px",color:"#475569",marginBottom:"8px",textTransform:"uppercase",letterSpacing:"0.5px"}}>By Surface</div>
                        {Object.entries(bySurface).map(([surf,d]) => (
                          <div key={surf} style={{display:"flex",justifyContent:"space-between",fontSize:"12px",marginBottom:"4px"}}>
                            <span style={{color:"#94a3b8"}}>{surf==="clay"?"🧱":surf==="grass"?"🌿":"🏟️"} {surf}</span>
                            <span style={{color:"#22d3ee",fontWeight:700}}>{Math.round((d.correct/d.total)*100)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            {(() => {
              const resolved = valuePerformance.filter(b => b.result !== null);
              const won = resolved.filter(b => b.result==="won");
              const totalStaked = resolved.reduce((s,b) => s + b.stake, 0);
              const totalROI = resolved.reduce((s,b) => s + b.profit, 0);
              const roiPct = totalStaked > 0 ? ((totalROI/totalStaked)*100).toFixed(1) : null;
              return (
                <div style={{marginBottom:"28px"}}>
                  <div style={{fontSize:"14px",fontWeight:800,color:"#e2e8f0",marginBottom:"14px"}}>💰 Value Bet Performance</div>
                  {valuePerformance.length === 0 ? (
                    <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"14px",padding:"24px",textAlign:"center",color:"#475569"}}>
                      No value bets logged yet. Use the "Log Bet" button on Value Picks.
                    </div>
                  ) : (
                    <>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"16px"}}>
                        {[
                          {label:"Total Bets", value:valuePerformance.length, color:"#22d3ee"},
                          {label:"Won", value:won.length, color:"#4ade80"},
                          {label:"ROI", value:roiPct ? `${roiPct >= 0 ? "+" : ""}${roiPct}%` : "-", color:totalROI>=0?"#4ade80":"#f87171"},
                          {label:"Profit", value:`${totalROI>=0?"+":""}${totalROI.toFixed(1)}€`, color:totalROI>=0?"#4ade80":"#f87171"},
                        ].map((s,i) => (
                          <div key={i} style={{background:"#0f172a",borderRadius:"14px",padding:"14px",textAlign:"center",border:`1px solid ${s.color}22`}}>
                            <div style={{fontSize:"24px",fontWeight:900,color:s.color}}>{s.value}</div>
                            <div style={{fontSize:"11px",color:"#475569",marginTop:"4px"}}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                        {valuePerformance.slice(0,20).map(b => (
                          <div key={b.id} style={{background:"#0f172a",borderRadius:"12px",padding:"12px 14px",border:`1px solid ${b.result==="won"?"rgba(74,222,128,0.2)":b.result==="lost"?"rgba(248,113,113,0.2)":"rgba(255,255,255,0.07)"}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px"}}>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"2px",flexWrap:"wrap"}}>
                                <div style={{fontSize:"13px",fontWeight:600,color:"#e2e8f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                  {b.type==="combi" ? `🔗 ${b.combiBets?.length||"?"}er Kombiwette` : b.match}
                                </div>
                                {b.type==="combi" ? (
                                  <span style={{fontSize:"10px",color:"#a78bfa",background:"rgba(139,92,246,0.1)",border:"1px solid rgba(139,92,246,0.2)",borderRadius:"4px",padding:"1px 5px",flexShrink:0}}>🔗 Kombi</span>
                                ) : b.type && b.type!=="match_winner" && (
                                  <span style={{fontSize:"10px",color:"#a78bfa",background:"rgba(139,92,246,0.1)",border:"1px solid rgba(139,92,246,0.2)",borderRadius:"4px",padding:"1px 5px",flexShrink:0}}>
                                    {b.type==="set_2_0"?"🎾 2-0":b.type==="set_2_1"?"🎾 2-1":b.type==="set_3_0"?"🎾 3-0":b.type==="set_3_1"?"🎾 3-1":b.type==="set_3_2"?"🎾 3-2":b.type==="over_3_5"?"📊 Over 3.5":b.type==="handicap"?"📉 HC":b.type==="total_games"?"🔢 O/U":b.type==="first_set"?"1️⃣ Set 1":"✏️"}
                                  </span>
                                )}
                              </div>
                              {b.type==="combi" && b.combiBets ? (
                                <div style={{fontSize:"11px",color:"#64748b"}}>
                                  {b.combiBets.map((c,i)=>(
                                    <span key={i}>{c.pick} <span style={{color:"#475569"}}>({c.odds})</span>{i<b.combiBets.length-1?" · ":""}</span>
                                  ))}
                                </div>
                              ) : (
                                <div style={{fontSize:"11px",color:"#64748b"}}>Pick: <span style={{color:"#22d3ee"}}>{b.pick}</span> · Odds: <span style={{color:"#facc15"}}>{b.odds}</span> · Stake: {b.stake}€</div>
                              )}
                              {b.note && b.type!=="combi" && <div style={{fontSize:"10px",color:"#475569",marginTop:"2px",fontStyle:"italic"}}>"{b.note}"</div>}
                            </div>
                            {b.result === null ? (
                              <div style={{display:"flex",gap:"6px",flexShrink:0}}>
                                <button onClick={() => resolveValueBet(b.id, true)} style={{padding:"4px 10px",borderRadius:"6px",border:"1px solid rgba(74,222,128,0.3)",background:"rgba(74,222,128,0.08)",color:"#4ade80",fontSize:"11px",cursor:"pointer",fontWeight:600}}>Won</button>
                                <button onClick={() => resolveValueBet(b.id, false)} style={{padding:"4px 10px",borderRadius:"6px",border:"1px solid rgba(248,113,113,0.3)",background:"rgba(248,113,113,0.08)",color:"#f87171",fontSize:"11px",cursor:"pointer",fontWeight:600}}>Lost</button>
                              </div>
                            ) : (
                              <div style={{textAlign:"right",flexShrink:0}}>
                                <div style={{fontSize:"13px",fontWeight:700,color:b.result==="won"?"#4ade80":"#f87171"}}>{b.result==="won"?"+":""}{b.profit?.toFixed(1)}€</div>
                                <div style={{fontSize:"10px",color:b.result==="won"?"#4ade80":"#f87171"}}>{b.result==="won"?"✅ Won":"❌ Lost"}{b.autoResolved&&<span style={{fontSize:"9px",color:"#475569",marginLeft:"4px"}}>auto</span>}</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
          </>
        )}

        {tab === "standings" && (
          <>
            <Header title="ATP Rankings" />
            <p style={{color:"#94a3b8",marginTop:"-16px",marginBottom:"20px"}}>
              🏅 ATP World Tour Rankings — Top 100
            </p>

            {/* Surface Tab Selector */}
            <div style={{display:"flex",gap:"8px",marginBottom:"20px",flexWrap:"wrap"}}>
              {[
                {id:"overall", label:"🌍 Gesamt", color:"#22d3ee"},
                {id:"clay",    label:"🧱 Clay",   color:"#ef4444"},
                {id:"hard",    label:"🏟️ Hard",   color:"#22d3ee"},
                {id:"grass",   label:"🌿 Grass",  color:"#4ade80"},
              ].map(t => (
                <button key={t.id} onClick={() => {
                  setRankingsTab(t.id);
                  if (t.id !== "overall" && !surfaceRankings && !surfaceRankingsLoading) {
                    setSurfaceRankingsLoading(true);
                    fetch("https://tennis-edge-backend.onrender.com/api/surface-rankings")
                      .then(r=>r.json()).then(d=>{setSurfaceRankings(d);setSurfaceRankingsLoading(false);})
                      .catch(()=>setSurfaceRankingsLoading(false));
                  }
                }} style={{
                  padding:"7px 16px",borderRadius:"10px",fontWeight:700,fontSize:"13px",
                  cursor:"pointer",border:"none",
                  background: rankingsTab===t.id ? `linear-gradient(135deg,${t.color}33,${t.color}18)` : "rgba(255,255,255,0.05)",
                  color: rankingsTab===t.id ? t.color : "#475569",
                  borderLeft: rankingsTab===t.id ? `3px solid ${t.color}` : "3px solid transparent",
                  transition:"all 0.2s"
                }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Surface Rankings */}
            {rankingsTab !== "overall" && (
              <>
                {surfaceRankingsLoading ? (
                  <div style={{display:"flex",alignItems:"center",gap:"12px",padding:"20px 0",color:"#64748b"}}>
                    <div style={{width:"16px",height:"16px",borderRadius:"50%",border:"2px solid rgba(34,211,238,0.3)",borderTopColor:"#22d3ee",animation:"spin 0.8s linear infinite"}} />
                    Lade Surface-Rankings (Top 50 Spieler)...
                  </div>
                ) : surfaceRankings ? (() => {
                  const list = surfaceRankings[rankingsTab] || [];
                  const dataWindow = surfaceRankings.dataWindow || "3 Jahre";
                  const surfLabel = rankingsTab==="clay"?"🧱 Clay":rankingsTab==="grass"?"🌿 Grass":"🏟️ Hard";
                  const surfColor = rankingsTab==="clay"?"#ef4444":rankingsTab==="grass"?"#4ade80":"#22d3ee";
                  if (list.length === 0) return <p style={{color:"#64748b"}}>Keine Daten verfügbar.</p>;
                  return (
                    <div style={{background:"#0f172a",borderRadius:"16px",overflow:"hidden",border:`1px solid ${surfColor}22`}}>
                      <div style={{padding:"10px 16px",background:`${surfColor}0a`,borderBottom:`1px solid ${surfColor}22`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{display:"grid",gridTemplateColumns:"40px 1fr 70px 80px 110px",gap:"8px",flex:1,fontSize:"11px",color:"#475569",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>
                          <span>#</span><span>Spieler</span><span style={{textAlign:"right"}}>ATP</span><span style={{textAlign:"right"}}>Siege</span><span style={{textAlign:"right"}}>W / L (%)</span>
                        </div>
                        <span style={{fontSize:"10px",color:surfColor,background:`${surfColor}18`,border:`1px solid ${surfColor}33`,borderRadius:"6px",padding:"2px 8px",marginLeft:"12px",whiteSpace:"nowrap",fontWeight:600}}>
                          📅 {dataWindow}
                        </span>
                      </div>
                      {list.map((p,i) => {
                        const wins = p[rankingsTab+"Wins"];
                        const matches = p[rankingsTab+"Matches"];
                        const losses = matches - wins;
                        const pct = p[rankingsTab];
                        return (
                          <div key={p.name} style={{display:"grid",gridTemplateColumns:"40px 1fr 70px 80px 110px",gap:"8px",padding:"11px 16px",borderBottom:"1px solid rgba(255,255,255,0.04)",alignItems:"center",cursor:"pointer",transition:"background 0.15s"}}
                            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}
                            onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                            onClick={()=>{setPlayer(p.name);setTab("player");}}>
                            <span style={{fontSize:"14px",fontWeight:800,color:i<3?surfColor:"#475569"}}>
                              {i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}
                            </span>
                            <div>
                              <div style={{fontSize:"14px",fontWeight:i<3?700:500,color:i<3?"#e2e8f0":"#cbd5e1",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{formatPlayerName(p.name)}</div>
                              <div style={{height:"3px",background:"#1e293b",borderRadius:"999px",overflow:"hidden",marginTop:"3px",width:"80%"}}>
                                <div style={{width:`${pct}%`,height:"100%",background:surfColor,borderRadius:"999px"}} />
                              </div>
                            </div>
                            <span style={{fontSize:"12px",color:"#475569",textAlign:"right"}}>#{p.rank}</span>
                            <span style={{fontSize:"18px",fontWeight:900,color:surfColor,textAlign:"right"}}>{wins}</span>
                            <span style={{fontSize:"12px",textAlign:"right"}}>
                              <span style={{color:"#4ade80",fontWeight:700}}>{wins}W</span>
                              <span style={{color:"#475569",margin:"0 3px"}}>/</span>
                              <span style={{color:"#f87171",fontWeight:700}}>{losses}L</span>
                              <span style={{color:"#334155",marginLeft:"4px",fontSize:"11px"}}>({pct}%)</span>
                            </span>
                          </div>
                        );
                      })}
                      <div style={{padding:"10px 16px",fontSize:"11px",color:"#334155",textAlign:"center"}}>
                        Basiert auf Fixture-Daten der letzten 3 Jahre ({dataWindow}) · Score = Siege × Win%^1.5 · Klick → Spieler-Analyzer
                      </div>
                    </div>
                  );
                })() : (
                  <p style={{color:"#64748b",fontSize:"13px"}}>Surface-Rankings noch nicht geladen.</p>
                )}
              </>
            )}

            {/* Overall Rankings */}
            {rankingsTab === "overall" && (standingsLoading ? (
              <p style={{color:"#94a3b8"}}>⏳ Loading rankings...</p>
            ) : standings.length === 0 ? (
              <div style={{textAlign:"center",padding:"40px",color:"#475569"}}>
                <div style={{fontSize:"32px",marginBottom:"12px"}}>🏅</div>
                <p>No rankings data available.</p>
                <button className="predictBtn" style={{width:"auto",padding:"10px 24px",marginTop:"8px"}} onClick={() => {
                  setStandingsLoading(true);
                  fetch("https://tennis-edge-backend.onrender.com/api/players")
                    .then(r=>r.json()).then(d=>{setStandings(Array.isArray(d)?d.filter(p=>p.rank<200&&p.points>0):[]);setStandingsLoading(false);})
                    .catch(()=>setStandingsLoading(false));
                }}>🔄 Laden</button>
              </div>
            ) : (
              <>
                {/* Top 3 Podium */}
                {standings.length >= 3 && (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px",marginBottom:"28px"}}>
                    {[standings[1], standings[0], standings[2]].map((p, i) => {
                      const podiumPos = [2, 1, 3][i];
                      const colors = ["#94a3b8","#facc15","#b45309"];
                      const sizes = ["80px","100px","80px"];
                      const color = colors[i];
                      return (
                        <div key={p.name} onClick={() => {setPlayer(p.name);setTab("player");}}
                          style={{background:"#0f172a",border:`1px solid ${color}44`,borderRadius:"16px",padding:"16px",textAlign:"center",cursor:"pointer",transition:"all 0.2s",order:i===1?-1:0}}
                          onMouseEnter={e=>e.currentTarget.style.borderColor=color}
                          onMouseLeave={e=>e.currentTarget.style.borderColor=`${color}44`}>
                          <div style={{fontSize:i===0?"32px":"28px",marginBottom:"4px"}}>{["🥈","🥇","🥉"][i]}</div>
                          <div style={{fontSize:i===0?"28px":"22px",fontWeight:900,color,marginBottom:"2px"}}>#{podiumPos}</div>
                          <div style={{fontSize:"13px",fontWeight:700,color:"#e2e8f0",marginBottom:"4px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                          <div style={{fontSize:"11px",color:"#475569"}}>{p.points?.toLocaleString()} Pts</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Full Rankings Table */}
                <div style={{background:"#0f172a",borderRadius:"16px",overflow:"hidden",border:"1px solid rgba(255,255,255,0.07)"}}>
                  {/* Header */}
                  <div style={{display:"grid",gridTemplateColumns:"48px 1fr 80px 80px",gap:"8px",padding:"10px 16px",background:"rgba(255,255,255,0.03)",borderBottom:"1px solid rgba(255,255,255,0.07)",fontSize:"11px",color:"#475569",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>
                    <span>#</span><span>Spieler</span><span style={{textAlign:"right"}}>Punkte</span><span style={{textAlign:"right"}}>Aktion</span>
                  </div>
                  {standings.slice(0,100).map((p, i) => {
                    const displayName = formatPlayerName(p.name);
                    const isTop3 = p.rank <= 3;
                    const isTop10 = p.rank <= 10;
                    const rankColor = isTop3 ? "#facc15" : isTop10 ? "#22d3ee" : "#94a3b8";
                    return (
                      <div key={p.name} style={{display:"grid",gridTemplateColumns:"48px 1fr 80px 80px",gap:"8px",padding:"11px 16px",borderBottom:"1px solid rgba(255,255,255,0.04)",alignItems:"center",transition:"background 0.15s",cursor:"pointer"}}
                        onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                        onClick={() => {setPlayer(p.name);setTab("player");}}>
                        <span style={{fontSize:"14px",fontWeight:800,color:rankColor}}>#{p.rank}</span>
                        <div style={{minWidth:0}}>
                          <div style={{fontSize:"14px",fontWeight:isTop10?700:500,color:isTop10?"#e2e8f0":"#cbd5e1",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{displayName}</div>
                          {p.country && <div style={{fontSize:"11px",color:"#475569",marginTop:"1px"}}>{p.country}</div>}
                        </div>
                        <span style={{fontSize:"13px",fontWeight:600,color:rankColor,textAlign:"right"}}>{p.points?.toLocaleString()}</span>
                        <div style={{display:"flex",gap:"4px",justifyContent:"flex-end"}}>
                          <button onClick={(e)=>{e.stopPropagation();setPlayer(p.name);setTab("player");}}
                            style={{padding:"3px 8px",borderRadius:"6px",border:"1px solid rgba(34,211,238,0.25)",background:"rgba(34,211,238,0.06)",color:"#22d3ee",fontSize:"10px",fontWeight:600,cursor:"pointer"}}>
                            📊
                          </button>
                          <button onClick={(e)=>{e.stopPropagation();setP1(p.name);setTab("predictor");}}
                            style={{padding:"3px 8px",borderRadius:"6px",border:"1px solid rgba(139,92,246,0.25)",background:"rgba(139,92,246,0.06)",color:"#a78bfa",fontSize:"10px",fontWeight:600,cursor:"pointer"}}>
                            ⚡
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p style={{textAlign:"center",fontSize:"12px",color:"#334155",marginTop:"16px"}}>Nur Spieler mit Ranking-Punkten · Klick auf Spieler → Analyzer</p>
              </>
            ))}
          </>
        )}

        {/* ── FEATURE 5: TURNIER-KALENDER ──────────────────────────────────── */}
        {tab === "calendar" && (
          <>
            <Header title="Turnier-Kalender" />
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"-16px",marginBottom:"24px"}}>
              <p style={{color:"#94a3b8",margin:0}}>📅 Aktuelle & kommende ATP/Challenger Turniere</p>
              <button onClick={()=>{setCalendarLoading(true);fetch("https://tennis-edge-backend.onrender.com/api/calendar").then(r=>r.json()).then(d=>{setCalendarData(Array.isArray(d)?d:[]);setCalendarLoading(false);}).catch(()=>setCalendarLoading(false));}}
                style={{background:"rgba(34,211,238,0.1)",border:"1px solid rgba(34,211,238,0.3)",color:"#22d3ee",padding:"6px 14px",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:600}}>
                🔄 Aktualisieren
              </button>
            </div>

            {calendarLoading ? <p style={{color:"#94a3b8"}}>⏳ Lade Turniere...</p>
              : calendarData.length === 0 ? (
                <div style={{textAlign:"center",padding:"40px",color:"#475569"}}>
                  <div style={{fontSize:"32px",marginBottom:"12px"}}>📅</div>
                  <p>Keine Turniere gefunden.</p>
                  <button className="predictBtn" style={{width:"auto",padding:"10px 24px"}} onClick={()=>{setCalendarLoading(true);fetch("https://tennis-edge-backend.onrender.com/api/calendar").then(r=>r.json()).then(d=>{setCalendarData(Array.isArray(d)?d:[]);setCalendarLoading(false);}).catch(()=>setCalendarLoading(false));}}>🔄 Laden</button>
                </div>
              ) : (() => {
                const active = calendarData.filter(t=>t.isActive);
                const upcoming = calendarData.filter(t=>t.isUpcoming);
                const surfIcon = (s) => s==="clay"?"🧱":s==="grass"?"🌿":"🏟️";
                const surfColor = (s) => s==="clay"?"#ef4444":s==="grass"?"#4ade80":"#22d3ee";
                const TournCard = ({t}) => {
                  const isATP = t.type?.includes("ATP");
                  const sc = surfColor(t.surface);
                  return (
                    <div style={{background:"#0f172a",borderRadius:"14px",border:`1px solid ${isATP?"rgba(34,211,238,0.15)":"rgba(250,204,21,0.12)"}`,padding:"14px 18px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"12px"}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"6px",flexWrap:"wrap"}}>
                            <span style={{fontSize:"15px",fontWeight:800,color:isATP?"#22d3ee":"#facc15",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>🏆 {t.name}</span>
                            <span className={`matchCardBadge ${isATP?"atp":"challenger"}`}>{t.type}</span>
                            <span style={{fontSize:"11px",color:sc,background:`${sc}18`,border:`1px solid ${sc}33`,borderRadius:"5px",padding:"1px 6px",flexShrink:0}}>{surfIcon(t.surface)} {t.surface==="clay"?"Clay":t.surface==="grass"?"Grass":"Hard"}</span>
                          </div>
                          <div style={{display:"flex",gap:"12px",fontSize:"12px",color:"#475569",flexWrap:"wrap"}}>
                            <span>📆 {t.startDate} → {t.endDate}</span>
                            {t.isActive && <span style={{color:"#4ade80",fontWeight:600}}>🎾 Läuft</span>}
                            {t.isUpcoming && <span style={{color:"#22d3ee",fontWeight:600}}>⏳ Upcoming</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                };
                return (
                  <>
                    {active.length > 0 && (
                      <div style={{marginBottom:"28px"}}>
                        <div style={{fontSize:"14px",fontWeight:800,color:"#4ade80",marginBottom:"12px",display:"flex",alignItems:"center",gap:"8px"}}>
                          <span style={{width:"8px",height:"8px",borderRadius:"50%",background:"#4ade80",display:"inline-block",boxShadow:"0 0 6px #4ade80"}} />
                          Laufende Turniere ({active.length})
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                          {active.map((t,i) => <TournCard key={i} t={t} />)}
                        </div>
                      </div>
                    )}
                    {upcoming.length > 0 && (
                      <div>
                        <div style={{fontSize:"14px",fontWeight:800,color:"#22d3ee",marginBottom:"12px",display:"flex",alignItems:"center",gap:"8px"}}>
                          <span style={{width:"8px",height:"8px",borderRadius:"50%",background:"#22d3ee",display:"inline-block"}} />
                          Kommende Turniere ({upcoming.length})
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                          {upcoming.map((t,i) => <TournCard key={i} t={t} />)}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()
            }
          </>
        )}

        {/* ── FEATURE 7: VERGLEICHS-MODUS ──────────────────────────────────── */}
        {tab === "compare" && (
          <>
            <Header title="Vergleichs-Modus" />
            <p style={{color:"#94a3b8",marginTop:"-16px",marginBottom:"24px"}}>
              ⚔️ Zwei Spieler direkt nebeneinander auf allen Surfaces
            </p>
            <div className="grid two" style={{marginBottom:"20px",alignItems:"flex-start"}}>
              <PlayerAutocomplete label="Spieler 1..." playerNum={1} value={player} onChange={setPlayer} players={playerNames} favorites={favoritePlayers} onToggleFavorite={toggleFavoritePlayer} />
              <PlayerAutocomplete label="Spieler 2..." playerNum={2} value={comparePlayer} onChange={setComparePlayer} players={playerNames} favorites={favoritePlayers} onToggleFavorite={toggleFavoritePlayer} />
            </div>
            {playerStats && compareStats && (
              <>
                {/* Surface-by-surface comparison */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px",marginBottom:"20px"}}>
                  {[{label:"🏟️ Hard",key:"hard",color:"#22d3ee"},{label:"🧱 Clay",key:"clay",color:"#ef4444"},{label:"🌿 Grass",key:"grass",color:"#4ade80"}].map(s => {
                    const v1 = playerStats.surfaces?.[s.key]||0;
                    const v2 = compareStats.surfaces?.[s.key]||0;
                    const winner = v1>v2?player:v2>v1?comparePlayer:"Tie";
                    return (
                      <div key={s.key} style={{background:"#0f172a",borderRadius:"14px",padding:"16px",border:`1px solid ${s.color}22`,textAlign:"center"}}>
                        <div style={{fontSize:"20px",marginBottom:"6px"}}>{s.label}</div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                          <div style={{textAlign:"left"}}>
                            <div style={{fontSize:"11px",color:"#64748b",marginBottom:"2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"70px"}}>{player.split(" ").pop()}</div>
                            <div style={{fontSize:"22px",fontWeight:900,color:v1>=v2?s.color:"#475569"}}>{v1!=="-"?`${v1}%`:"—"}</div>
                          </div>
                          <div style={{fontSize:"12px",color:"#334155",fontWeight:700}}>VS</div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:"11px",color:"#64748b",marginBottom:"2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"70px"}}>{comparePlayer.split(" ").pop()}</div>
                            <div style={{fontSize:"22px",fontWeight:900,color:v2>v1?s.color:"#475569"}}>{v2!=="-"?`${v2}%`:"—"}</div>
                          </div>
                        </div>
                        <div style={{height:"6px",display:"flex",borderRadius:"999px",overflow:"hidden",background:"#1e293b"}}>
                          {v1!=="-"&&v2!=="-" ? <>
                            <div style={{width:`${Math.round(v1/(v1+v2)*100)}%`,background:s.color}} />
                            <div style={{flex:1,background:"#334155"}} />
                          </> : <div style={{flex:1,background:"#1e293b"}} />}
                        </div>
                        <div style={{fontSize:"11px",color:s.color,marginTop:"6px",fontWeight:700}}>
                          {winner==="Tie"?"🟰 Unentschieden":`👑 ${winner.split(" ").pop()}`}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Stats comparison */}
                <Panel title="📊 Stats-Vergleich">
                  {[
                    {label:"Win Rate",v1:playerStats.stats?.winRate,v2:compareStats.stats?.winRate,unit:"%"},
                    {label:"Titel",v1:playerStats.stats?.titles,v2:compareStats.stats?.titles,unit:""},
                    {label:"Ranking Punkte",v1:playerStats.stats?.points,v2:compareStats.stats?.points,unit:""},
                  ].map(({label,v1,v2,unit}) => {
                    const n1=parseFloat(v1)||0, n2=parseFloat(v2)||0, total=n1+n2||1;
                    const better1=n1>=n2;
                    return (
                      <div key={label} style={{marginBottom:"14px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:"13px",marginBottom:"5px"}}>
                          <strong style={{color:better1?"#4ade80":"#94a3b8"}}>{v1}{unit}</strong>
                          <span style={{color:"#64748b"}}>{label}</span>
                          <strong style={{color:!better1?"#4ade80":"#94a3b8"}}>{v2}{unit}</strong>
                        </div>
                        <div style={{display:"flex",height:"8px",borderRadius:"999px",overflow:"hidden"}}>
                          <div style={{width:`${Math.round(n1/total*100)}%`,background:"linear-gradient(90deg,#22d3ee,#4ade80)"}} />
                          <div style={{flex:1,background:"#f472b6"}} />
                        </div>
                      </div>
                    );
                  })}
                </Panel>

                {/* Quick predict on all surfaces */}
                <Panel title="⚡ Schnell-Prediction auf allen Surfaces">
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px"}}>
                    {["hard","clay","grass"].map(surf => {
                      const surfIcon = surf==="clay"?"🧱":surf==="grass"?"🌿":"🏟️";
                      const p1Data = safePlayers.find(p=>getPlayerName(p)===player);
                      const p2Data2 = safePlayers.find(p=>getPlayerName(p)===comparePlayer);
                      const r1=p1Data?.rank||100, r2=p2Data2?.rank||100;
                      const eloA=Math.max(1500,2400-r1*6), eloB=Math.max(1500,2400-r2*6);
                      const expA=1/(1+Math.pow(10,(eloB-eloA)/400));
                      const prob=Math.round(expA*100);
                      const favProb=Math.max(prob,100-prob);
                      const fav=prob>=50?player:comparePlayer;
                      const color=favProb>65?"#4ade80":favProb>55?"#facc15":"#94a3b8";
                      return (
                        <div key={surf} onClick={()=>{setSurface(surf);setP1(player);setP2(comparePlayer);setTab("predictor");}}
                          style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"12px",padding:"14px",textAlign:"center",cursor:"pointer",transition:"all 0.2s"}}
                          onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(34,211,238,0.3)"}
                          onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.08)"}>
                          <div style={{fontSize:"22px",marginBottom:"6px"}}>{surfIcon}</div>
                          <div style={{fontSize:"12px",color:"#64748b",marginBottom:"4px",textTransform:"capitalize"}}>{surf}</div>
                          <div style={{fontSize:"18px",fontWeight:900,color,marginBottom:"2px"}}>{favProb}%</div>
                          <div style={{fontSize:"11px",color:"#94a3b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{fav.split(" ").pop()}</div>
                          <div style={{fontSize:"10px",color:"#475569",marginTop:"4px"}}>→ Predictor</div>
                        </div>
                      );
                    })}
                  </div>
                  <p style={{fontSize:"11px",color:"#334155",textAlign:"center",marginTop:"10px"}}>Basiert auf Elo-Ranking · Klick öffnet vollen Predictor</p>
                </Panel>
              </>
            )}
            {(!playerStats || !compareStats) && (
              <div style={{textAlign:"center",padding:"40px",color:"#475569"}}>
                <div style={{fontSize:"32px",marginBottom:"12px"}}>⚔️</div>
                <p>Wähle zwei Spieler oben um den Vergleich zu starten.</p>
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
