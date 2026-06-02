const { setCors } = require("./_lib");

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const { p1, p2, rank1 = 10, rank2 = 20, surface = "hard" } = req.query;
  const form1 = Number(req.query.form1 || 75), form2 = Number(req.query.form2 || 75);
  const clutch1 = Number(req.query.clutch1 || 70), clutch2 = Number(req.query.clutch2 || 70);
  const momentum1 = Number(req.query.momentum1 || 75), momentum2 = Number(req.query.momentum2 || 75);

  const eloFromRank = (rank) => Math.max(1500, 2400 - Number(rank) * 6);
  const elo1 = eloFromRank(rank1), elo2 = eloFromRank(rank2);
  const expected1 = 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
  const expected2 = 1 - expected1;

  const getSurfMod = (rank, surf) => {
    const v = Math.max(2, 8 - Number(rank) * 0.05);
    const m = { hard: Math.round((Math.random()-.5)*v), clay: Math.round((Math.random()-.5)*v), grass: Math.round((Math.random()-.5)*v) };
    return m[surf] || 0;
  };
  const surfMod1 = getSurfMod(rank1, surface), surfMod2 = getSurfMod(rank2, surface);
  const sw = surface === "clay" ? 1.8 : surface === "grass" ? 1.5 : 1.2;

  let score1 = expected1*100*0.5 + form1*0.2 + clutch1*0.1 + momentum1*0.15 + surfMod1*sw;
  let score2 = expected2*100*0.5 + form2*0.2 + clutch2*0.1 + momentum2*0.15 + surfMod2*sw;
  const s1 = Number(req.query.surface1||0), s2 = Number(req.query.surface2||0);
  if (s1>0||s2>0) { score1+=s1*0.5; score2+=s2*0.5; }

  const p1Win = Math.round((score1/(score1+score2))*100);
  const rankDiff = Math.abs(rank1-rank2);
  const rankingFactor = Math.min(70, 20+rankDiff*0.6);
  const formFactor = Math.max(10, 40-rankDiff*0.2);
  const clutchFactor = 10+Math.random()*10;
  const momentumFactor = Math.max(10, 100-rankingFactor-formFactor-clutchFactor);
  const confidence = Math.min(99, Math.round(Math.abs(p1Win-50)*1.8 + Math.min(30,rankDiff*0.4)));

  const deriveStats = (rank, elo) => {
    const base = Math.max(55, Math.min(88, 90-Math.sqrt(rank)*2.5));
    const eb = Math.max(-5, Math.min(5,(elo-1900)*0.02));
    const r = () => (Math.random()-0.5)*6;
    return { serve: Math.min(92,Math.max(55,Math.round(base+eb+r()))), return: Math.min(92,Math.max(55,Math.round(base+eb+r()))), clutch: Math.min(92,Math.max(55,Math.round(base+eb+r()))), momentum: Math.min(92,Math.max(55,Math.round(base+eb+r()))) };
  };

  const surfaceSetMod = surface==="clay"?0.03:surface==="grass"?-0.02:0;
  const setWinP1 = Math.min(0.85,Math.max(0.15,expected1+surfaceSetMod+(surfMod1-surfMod2)*0.01));
  const setWinP2 = 1-setWinP1;
  const fav = setWinP1>=setWinP2;
  const favName = fav?p1:p2, undName = fav?p2:p1;
  const p=Math.max(setWinP1,setWinP2), q=1-p;
  const egw = 6+Math.max(0,(p-0.5)*2), egl = Math.max(1,6-(p-0.5)*8);
  const expFav = p*p*(2*egw) + 2*p*p*q*(2*egw+egl) + 2*p*q*q*(egw+2*egl) + q*q*(2*egl);
  const expDog = p*p*(2*egl) + 2*p*p*q*(2*egl+egw) + 2*p*q*q*(egl+2*egw) + q*q*(2*egw);
  const hLine = Math.round((expFav-expDog)*2)/2;

  res.json({
    player1:p1, player2:p2, surface,
    elo:{[p1]:Math.round(elo1),[p2]:Math.round(elo2)},
    prediction:{[p1]:p1Win,[p2]:100-p1Win}, confidence,
    playerStats:{[p1]:deriveStats(Number(rank1),elo1),[p2]:deriveStats(Number(rank2),elo2)},
    setWinProb:{[p1]:Math.round(setWinP1*100),[p2]:Math.round(setWinP2*100)},
    handicap:{line:hLine,favorite:favName,underdog:undName,pick:hLine>=2?`${favName} -${hLine} Games`:hLine>=0.5?`${favName} -${hLine} Games (knapp)`:"Kein klares Handicap",reason:hLine>=2?`${favName} dominiert erwartungsgemäß.`:hLine>=0.5?`Kleiner Vorteil für ${favName}.`:"Zu ausgeglichen.",expGames:{[favName]:Math.round(expFav*10)/10,[undName]:Math.round(expDog*10)/10}},
    factors:{ranking:Math.round(rankingFactor),form:Math.round(formFactor),clutch:Math.round(clutchFactor),momentum:Math.round(momentumFactor),surface},
    explain:p1Win>60?`${p1} hat klare Vorteile.`:p1Win<40?`${p2} hat klare Vorteile.`:"Das Match ist sehr ausgeglichen.",
    edge:p1Win>65?`${p1} klar überlegen`:p1Win>55?`${p1} leichter Vorteil`:p1Win<35?`${p2} klar überlegen`:p1Win<45?`${p2} leichter Vorteil`:"sehr ausgeglichen"
  });
};
