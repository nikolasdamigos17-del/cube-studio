import { useState, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Sparkles, Loader2, X } from 'lucide-react';
import { db, callAI } from '../lib/db';

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  weight:'#818cf8', fat:'#f87171', muscle:'#34d399',
  water:'#38bdf8',  bone:'#c084fc', bmr:'#fbbf24',
  bmi:'#f472b6',    visc:'#fb923c',
  bg:'#07070f', card:'rgba(255,255,255,0.03)',
  border:'rgba(255,255,255,0.07)', dim:'rgba(255,255,255,0.32)',
};
const num = v => parseFloat(v) || 0;
const dlt = (a, b, k) => {
  const v = num(a?.[k]) - num(b?.[k]);
  return isNaN(v) ? null : parseFloat(v.toFixed(1));
};

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ to, unit='', size=36, color='#fff', dec=1 }) {
  const [cur, setCur] = useState(0);
  const ra = useRef();
  useEffect(() => {
    const target = num(to), s = performance.now(), dur = 1300;
    const tick = now => {
      const p = Math.min((now-s)/dur, 1), e = 1-Math.pow(1-p,4);
      setCur((target*e).toFixed(dec));
      if (p<1) ra.current = requestAnimationFrame(tick);
    };
    ra.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ra.current);
  }, [to]);
  return (
    <span style={{fontSize:size, fontWeight:800, color, letterSpacing:'-0.04em', fontFamily:'var(--font-display)'}}>
      {cur}<span style={{fontSize:size*0.4, opacity:0.45, marginLeft:3, fontWeight:500}}>{unit}</span>
    </span>
  );
}

// ── Pulsing live dot ──────────────────────────────────────────────────────────
function LiveDot({ color, size=7 }) {
  return (
    <span style={{display:'inline-flex', alignItems:'center', justifyContent:'center', position:'relative', width:size+4, height:size+4, flexShrink:0}}>
      <span style={{position:'absolute', inset:0, borderRadius:'50%', background:color, animation:'ping 1.6s ease infinite', opacity:0.4}}/>
      <span style={{width:size, height:size, borderRadius:'50%', background:color, display:'block', flexShrink:0}}/>
    </span>
  );
}

// ── Delta badge ───────────────────────────────────────────────────────────────
function Delta({ val, goodDown=true, unit='' }) {
  if (val === null || val === undefined) return null;
  const good = goodDown ? val <= 0 : val >= 0;
  return (
    <span style={{fontSize:11, fontWeight:700, color: good ? '#34d399' : '#f87171', display:'inline-flex', alignItems:'center', gap:2}}>
      {val > 0 ? '▲' : '▼'} {Math.abs(val)}{unit}
    </span>
  );
}

// ── Short insight ─────────────────────────────────────────────────────────────
function Tip({ statKey, val, prev, goodDown }) {
  const dv = prev != null ? parseFloat((num(val) - num(prev)).toFixed(1)) : null;
  if (dv === null) return null;
  const good = goodDown ? dv <= 0 : dv >= 0;
  const pct = prev && num(prev) > 0 ? Math.abs(Math.round((Math.abs(dv)/num(prev))*100)) : null;
  const GOOD = {
    weight_kg: pct ? `${pct}% lighter` : '✓ On track',
    body_fat_pct: pct ? `−${pct}% fat` : '✓ Dropping',
    muscle_mass_kg: pct ? `+${pct}% muscle` : '✓ Growing',
    body_water_pct: '✓ Hydrated',
    bmr: '✓ Metabolism up',
    bmi: '✓ Improving',
    visceral_fat: '✓ Healthier',
    bone_mass_kg: '✓ Stronger',
  };
  const BAD = {
    weight_kg: 'Review caloric intake',
    body_fat_pct: 'Increase cardio sessions',
    muscle_mass_kg: 'More protein post-workout',
    body_water_pct: '+500ml water daily',
    bmr: 'Build more muscle',
    bmi: 'Focus on fat loss',
    visceral_fat: 'Cut processed foods',
    bone_mass_kg: 'Add calcium & vitamin D',
  };
  const msg = good ? (GOOD[statKey] || '✓ Good') : (BAD[statKey] || 'Stay consistent');
  return (
    <span style={{fontSize:10, fontWeight:600, color: good ? '#34d399' : '#f87171'}}>{msg}</span>
  );
}

// ── Animated sparkline ────────────────────────────────────────────────────────
function Spark({ data, color, h=50 }) {
  const [pct, setPct] = useState(0);
  const ra = useRef();
  useEffect(() => {
    const s = performance.now(), dur = 1100;
    const tick = now => { const t = Math.min((now-s)/dur,1); setPct(1-Math.pow(1-t,3)); if(t<1) ra.current=requestAnimationFrame(tick); };
    ra.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ra.current);
  }, [data?.join?.(',')]);
  if (!data || data.length < 2) return null;
  const vals = data.map(Number).filter(v=>!isNaN(v));
  const min = Math.min(...vals), max = Math.max(...vals), range = max-min||1;
  const W = 260;
  const pts = vals.map((v,i) => [(i/(vals.length-1))*W, h-((v-min)/range)*(h-8)-4]);
  const cut = Math.max(2, Math.round(pts.length*pct));
  const vis = pts.slice(0, cut);
  const path = vis.map((p,i)=>`${i===0?'M':'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${path} L${vis[vis.length-1][0]},${h} L0,${h} Z`;
  const id = `sp${color.replace('#','')}`;
  return (
    <svg viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none" style={{width:'100%', height:h}}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.25}/><stop offset="100%" stopColor={color} stopOpacity={0}/></linearGradient></defs>
      <path d={area} fill={`url(#${id})`}/>
      <path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
      {vis.length === pts.length && <circle cx={vis[vis.length-1][0]} cy={vis[vis.length-1][1]} r={4} fill={color} stroke={C.bg} strokeWidth={2}/>}
    </svg>
  );
}

// ── Animated bars ─────────────────────────────────────────────────────────────
function Bars({ data, labels, color, prev, h=80 }) {
  const [pct, setPct] = useState(0);
  const ra = useRef();
  useEffect(() => {
    const s = performance.now(), dur = 900;
    const tick = now => { const t=Math.min((now-s)/dur,1); setPct(1-Math.pow(1-t,3)); if(t<1) ra.current=requestAnimationFrame(tick); };
    ra.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ra.current);
  }, [data?.join?.(',')]);
  if (!data || !data.length) return null;
  const mx = Math.max(...data.map(Number), ...(prev||[]).map(Number), 0.01);
  return (
    <div style={{display:'flex', alignItems:'flex-end', gap:3, height:h+16}}>
      {data.map((v, i) => {
        const hh = Math.max(2, (num(v)/mx)*h*pct);
        const ph = prev?.[i] ? Math.max(2,(num(prev[i])/mx)*h) : 0;
        const isLast = i === data.length-1;
        return (
          <div key={i} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3}}>
            <div style={{width:'100%', display:'flex', alignItems:'flex-end', justifyContent:'center', gap:1, height:h}}>
              {prev && ph>0 && <div style={{width:'42%', height:ph, borderRadius:'3px 3px 0 0', background:'rgba(255,255,255,0.09)'}}/>}
              <div style={{width:prev?'55%':'80%', height:hh, borderRadius:'3px 3px 0 0', background:isLast?color:color+'55', boxShadow:isLast?`0 0 12px ${color}88`:'none', position:'relative'}}>
                {isLast && <span style={{position:'absolute', top:-16, left:'50%', transform:'translateX(-50%)', fontSize:8, color, fontWeight:700, whiteSpace:'nowrap'}}>{v}</span>}
              </div>
            </div>
            {labels && <span style={{fontSize:7, color:C.dim}}>{labels[i]}</span>}
          </div>
        );
      })}
    </div>
  );
}

// ── Hollow donut ──────────────────────────────────────────────────────────────
function Donut({ value, max, color, size=90, thick=11, label, prevValue }) {
  const [pct, setPct] = useState(0);
  const ra = useRef();
  const target = Math.min(1, num(value)/num(max||100));
  const prevPct = prevValue!=null ? Math.min(1,num(prevValue)/num(max||100)) : null;
  useEffect(() => {
    const s=performance.now(), dur=1400;
    const tick=now=>{const t=Math.min((now-s)/dur,1),e=1-Math.pow(1-t,3);setPct(target*e);if(t<1)ra.current=requestAnimationFrame(tick);};
    ra.current=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(ra.current);
  },[target]);
  const r=(size-thick)/2, circ=2*Math.PI*r;
  return (
    <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:5}}>
      <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={thick}/>
        {prevPct!=null && <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={thick} strokeDasharray={`${prevPct*circ} ${circ}`} strokeLinecap="round" opacity={0.18}/>}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={thick} strokeDasharray={`${pct*circ} ${circ}`} strokeLinecap="round" style={{filter:`drop-shadow(0 0 7px ${color}aa)`}}/>
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
          style={{transform:`rotate(90deg)`,transformOrigin:`${size/2}px ${size/2}px`,fill:'#fff',fontSize:size*0.18,fontWeight:700,fontFamily:'inherit'}}>
          {num(value).toFixed(1)}
        </text>
      </svg>
      {label && <span style={{fontSize:9,fontWeight:700,color:C.dim,textTransform:'uppercase',letterSpacing:'0.08em'}}>{label}</span>}
    </div>
  );
}

// ── Radar (hex, animated) ─────────────────────────────────────────────────────
function Radar({ now, prev, size=180 }) {
  const [pct, setPct] = useState(0);
  const ra = useRef();
  useEffect(() => {
    const s=performance.now(),dur=1200;
    const tick=now2=>{const t=Math.min((now2-s)/dur,1);setPct(1-Math.pow(1-t,3));if(t<1)ra.current=requestAnimationFrame(tick);};
    ra.current=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(ra.current);
  },[now?.map(d=>d.v).join(',')]);
  const cx=size/2,cy=size/2,R=size*0.34,N=now.length;
  const ang = i => (i/N)*Math.PI*2-Math.PI/2;
  const pt  = (i,r) => [cx+Math.cos(ang(i))*r, cy+Math.sin(ang(i))*r];
  const poly = (d, scale=1) => d.map((x,i)=>pt(i,R*(num(x.v)/100)*scale).join(',')).join(' ');
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.25,0.5,0.75,1].map(f=><polygon key={f} points={now.map((_,i)=>pt(i,R*f).join(',')).join(' ')} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={1}/>)}
      {now.map((_,i)=>{const[x,y]=pt(i,R);return<line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.05)"/>})}
      {prev && <polygon points={poly(prev)} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} strokeDasharray="3 3"/>}
      <defs><linearGradient id="rfg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#818cf8" stopOpacity={0.3}/><stop offset="100%" stopColor="#34d399" stopOpacity={0.15}/></linearGradient></defs>
      <polygon points={poly(now,pct)} fill="url(#rfg)" stroke="#818cf8" strokeWidth={2} strokeLinejoin="round" style={{filter:'drop-shadow(0 0 8px #818cf866)'}}/>
      {now.map((d,i)=>{const[x,y]=pt(i,R*(num(d.v)/100)*pct);return<circle key={i} cx={x} cy={y} r={3} fill={d.c||'#818cf8'} stroke={C.bg} strokeWidth={1.5}/>})}
      {now.map((d,i)=>{const[x,y]=pt(i,R*1.22);return<text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="central" style={{fill:C.dim,fontSize:9,fontFamily:'inherit'}}>{d.l}</text>})}
    </svg>
  );
}

// ── Stat block (always visible, no collapse) ──────────────────────────────────
function StatBlock({ label, value, unit, color, series, prevVal, goodDown, statKey, graphType }) {
  const dv = prevVal != null ? parseFloat((num(value)-num(prevVal)).toFixed(1)) : null;
  const isGood = dv===null ? null : (goodDown ? dv<=0 : dv>=0);
  const dates = series.dates || [];
  const vals  = series.vals  || [];
  const prevVals = series.prevVals || [];

  return (
    <div style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:'18px 20px', borderTop:`2px solid ${color}`}}>
      {/* Header row */}
      <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:12}}>
        <LiveDot color={color}/>
        <span style={{fontSize:11, fontWeight:600, color:C.dim, textTransform:'uppercase', letterSpacing:'0.08em', flex:1}}>{label}</span>
        {dv!==null && <Delta val={dv} goodDown={goodDown} unit={unit}/>}
      </div>

      {/* Big number */}
      <div style={{display:'flex', alignItems:'baseline', gap:8, marginBottom:8}}>
        <Counter to={value} unit={unit} color={color} size={34} dec={1}/>
        {prevVal!=null && (
          <span style={{fontSize:12, color:'rgba(255,255,255,0.25)', textDecoration:'line-through'}}>{prevVal}{unit}</span>
        )}
      </div>

      {/* Short tip */}
      <div style={{marginBottom:12}}>
        <Tip statKey={statKey} val={value} prev={prevVal} goodDown={goodDown}/>
      </div>

      {/* Graph — rotates based on graphType */}
      {graphType === 'spark' && vals.length > 1 && (
        <div>
          <Spark data={vals} color={color} h={48}/>
          <div style={{display:'flex', justifyContent:'space-between', marginTop:3}}>
            <span style={{fontSize:8, color:C.dim}}>{dates[0]}</span>
            <span style={{fontSize:8, color:C.dim}}>{dates[dates.length-1]}</span>
          </div>
        </div>
      )}
      {graphType === 'bars' && vals.length > 1 && (
        <Bars data={vals} labels={dates} color={color} prev={prevVals.length>1?prevVals:null} h={70}/>
      )}
      {graphType === 'donut' && value != null && (
        <div style={{display:'flex', justifyContent:'center', gap:20, paddingTop:4}}>
          {prevVal!=null && <Donut value={prevVal} max={statKey==='weight_kg'?130:statKey==='bmr'?2500:statKey==='steps'?15000:100} color={`${color}44`} label="Prev" size={76} thick={10}/>}
          <Donut value={value} max={statKey==='weight_kg'?130:statKey==='bmr'?2500:statKey==='steps'?15000:100} color={color} label="Now" size={76} thick={10} prevValue={prevVal}/>
        </div>
      )}
    </div>
  );
}

// ── AI panel ──────────────────────────────────────────────────────────────────
function AIPanel({ client, latest, prev, trainings, waterAvg }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(false);
  const ra = useRef();

  const generate = async () => {
    if (loading || text) return;
    setLoading(true);
    const dW=dlt(latest,prev,'weight_kg'), dF=dlt(latest,prev,'body_fat_pct'), dM=dlt(latest,prev,'muscle_mass_kg');
    const name = client?.name?.split(' ')[0] || 'Athlete';
    const prompt = `Personal trainer speaking TO client ${name}. Exactly 3 short sentences, max 55 words total.
Sentence 1: ONE specific number insight (e.g. "You dropped ${Math.abs(dW||0)}kg — that's like losing a bag of sugar off your frame.")
Sentence 2: ONE direct thing to fix, no softening.
Sentence 3: Short motivation tied to goal "${client?.goals||'get fit'}".
Data: weight ${latest?.weight_kg}kg (${dW>0?'+':''}${dW}), fat ${latest?.body_fat_pct}% (${dF>0?'+':''}${dF}%), muscle ${latest?.muscle_mass_kg}kg (${dM>0?'+':''}${dM}%), water ${waterAvg||'?'}L/day, ${trainings?.length||0} sessions.
Bold. Brief. Specific. No fluff.`;
    const r = await callAI(prompt, 'Bold direct coach. Max 55 words. 3 sentences. Specific numbers only.');
    const result = (r && !r.startsWith('__ERROR__')) ? r : `${name}, solid effort this session. Keep pushing on the areas that need work. Every session gets you closer to your goal.`;
    setLoading(false);
    setText('');
    let i = 0;
    const type = () => { if(i<result.length){setText(result.slice(0,i+1));i++;ra.current=setTimeout(type,11);}};
    type();
  };

  return (
    <div style={{padding:'20px 28px 28px'}}>
      {!shown ? (
        <button onClick={()=>{setShown(true);generate();}}
          style={{width:'100%', padding:'13px', borderRadius:14, border:'1px dashed rgba(129,140,248,0.3)', background:'rgba(129,140,248,0.05)', color:'#818cf8', fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8}}>
          <Sparkles style={{width:15,height:15}}/> Show AI analysis to client
        </button>
      ) : (
        <div style={{background:'linear-gradient(135deg,rgba(129,140,248,0.1),rgba(52,211,153,0.04))', border:'1px solid rgba(129,140,248,0.2)', borderRadius:14, padding:'18px 20px', position:'relative'}}>
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:10}}>
            <Sparkles style={{width:13,height:13,color:'#818cf8'}}/>
            <span style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'#818cf8'}}>AI Session Analysis</span>
            {loading && <Loader2 style={{width:12,height:12,color:C.dim,animation:'spin 1s linear infinite'}}/>}
            <button onClick={()=>{setShown(false);setText('');}} style={{marginLeft:'auto',background:'none',border:'none',color:C.dim,cursor:'pointer',padding:2}}><X style={{width:12,height:12}}/></button>
          </div>
          <p style={{fontSize:14, lineHeight:1.65, color:'rgba(255,255,255,0.72)', minHeight:36}}>{text}</p>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id:'body',      icon:'⬡', label:'Body Stats'  },
  { id:'lifestyle', icon:'◈', label:'Lifestyle'   },
  { id:'training',  icon:'◆', label:'Training'    },
  { id:'nutrition', icon:'◇', label:'Nutrition'   },
];

export default function SessionPresentation({ client, allProgress, onBack }) {
  const [tab, setTab] = useState('body');
  const [nutritionPlan, setNutritionPlan] = useState(null);
  const [trainings,     setTrainings]     = useState([]);
  const [waterLogs,     setWaterLogs]     = useState([]);

  const latest = allProgress[allProgress.length - 1];
  const prev   = allProgress.length > 1 ? allProgress[allProgress.length - 2] : null;

  useEffect(() => {
    if (!client?.id) return;
    Promise.all([
      db.NutritionPlan.filter({ client_id:client.id }, '-date', 1),
      db.TrainingPlan.filter({ client_id:client.id }, '-date', 10),
      db.WaterLog.filter({ client_id:client.id }, '-date', 30),
    ]).then(([np, tp, wl]) => { setNutritionPlan(np[0]||null); setTrainings(tp); setWaterLogs(wl); });
  }, [client?.id]);

  const avgWater = waterLogs.length
    ? (waterLogs.reduce((s,l)=>s+(l.amount_liters||0),0)/waterLogs.length).toFixed(2)
    : null;

  // Build series object for a stat key
  const series = (key) => {
    const rows = allProgress.filter(r=>r[key]!=null);
    return {
      vals:     rows.map(r=>parseFloat(r[key])),
      dates:    rows.map(r=>r.date?format(parseISO(r.date),'MMM d'):''),
      prevVals: rows.slice(0,-1).map(r=>parseFloat(r[key])),
    };
  };

  // Rotate graph types — different each time the page opens
  const [gTypes] = useState(() => {
    const arr = ['spark','bars','donut'];
    const offset = new Date().getMinutes() % 3;
    return Array.from({length:10},(_,i) => arr[(i+offset)%3]);
  });

  const radarNow = [
    {l:'Weight',  v:Math.min(100,(num(latest?.weight_kg)/120)*100),     c:C.weight},
    {l:'Muscle',  v:Math.min(100,(num(latest?.muscle_mass_kg)/80)*100),  c:C.muscle},
    {l:'Hydrat.', v:num(latest?.body_water_pct)||0,                      c:C.water},
    {l:'Sleep',   v:Math.min(100,(num(latest?.sleep_hours)/9)*100),      c:C.bone},
    {l:'Steps',   v:Math.min(100,(num(latest?.steps)/10000)*100),        c:C.bmr},
    {l:'Bone',    v:Math.min(100,(num(latest?.bone_mass_kg)/5)*100),     c:C.bmi},
  ];
  const radarPrev = prev ? [
    {l:'Weight',  v:Math.min(100,(num(prev.weight_kg)/120)*100)},
    {l:'Muscle',  v:Math.min(100,(num(prev.muscle_mass_kg)/80)*100)},
    {l:'Hydrat.', v:num(prev.body_water_pct)||0},
    {l:'Sleep',   v:Math.min(100,(num(prev.sleep_hours)/9)*100)},
    {l:'Steps',   v:Math.min(100,(num(prev.steps)/10000)*100)},
    {l:'Bone',    v:Math.min(100,(num(prev.bone_mass_kg)/5)*100)},
  ] : null;

  const BODY_STATS = [
    {key:'weight_kg',      label:'Weight',       unit:'kg',  color:C.weight, goodDown:true  },
    {key:'body_fat_pct',   label:'Body Fat',     unit:'%',   color:C.fat,    goodDown:true  },
    {key:'muscle_mass_kg', label:'Muscle Mass',  unit:'kg',  color:C.muscle, goodDown:false },
    {key:'body_water_pct', label:'Hydration',    unit:'%',   color:C.water,  goodDown:false },
    {key:'bmr',            label:'Metabolism',   unit:'kcal',color:C.bmr,    goodDown:false },
    {key:'bmi',            label:'BMI',          unit:'',    color:C.bmi,    goodDown:true  },
    {key:'visceral_fat',   label:'Visceral Fat', unit:'',    color:C.visc,   goodDown:true  },
    {key:'bone_mass_kg',   label:'Bone Mass',    unit:'kg',  color:C.bone,   goodDown:false },
  ].filter(s => latest?.[s.key] != null);

  const S = {
    page:  { minHeight:'100vh', background:C.bg, color:'#f0f0f8', fontFamily:'Inter,system-ui,sans-serif', display:'flex' },
    aside: { width:64, flexShrink:0, background:'#04040b', borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', alignItems:'center', padding:'20px 0', gap:6, position:'fixed', top:0, left:0, height:'100vh', zIndex:20 },
    main:  { flex:1, marginLeft:64, display:'flex', flexDirection:'column', minHeight:'100vh' },
  };

  return (
    <div style={S.page}>
      {/* ── Sidebar ── */}
      <aside style={S.aside}>
        <button onClick={onBack}
          style={{width:38,height:38,borderRadius:11,border:`1px solid ${C.border}`,background:'transparent',color:C.dim,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14}}>
          <ArrowLeft style={{width:14,height:14}}/>
        </button>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} title={t.label}
            style={{width:44,height:44,borderRadius:13,border:'none',fontSize:19,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s',
              background: tab===t.id ? 'rgba(129,140,248,0.2)' : 'transparent',
              color: tab===t.id ? '#818cf8' : C.dim,
              boxShadow: tab===t.id ? '0 0 0 1px rgba(129,140,248,0.4)' : 'none',
            }}>
            {t.icon}
          </button>
        ))}
        <div style={{flex:1}}/>
        <div style={{width:34,height:34,borderRadius:9,background:`linear-gradient(135deg,${client?.theme_color||'#818cf8'},#1e1b4b)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700}}>
          {client?.name?.charAt(0)}
        </div>
      </aside>

      {/* ── Content ── */}
      <main style={S.main}>
        {/* Top header */}
        <div style={{padding:'32px 32px 20px', borderBottom:`1px solid ${C.border}`}}>
          <p style={{fontSize:10,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',color:'rgba(255,255,255,0.22)',marginBottom:6}}>
            {latest?.date ? format(parseISO(latest.date),'MMMM d, yyyy') : format(new Date(),'MMMM d, yyyy')}
            {prev?.date && ` · vs ${format(parseISO(prev.date),'MMM d')}`}
          </p>
          <h1 style={{fontSize:38,fontWeight:800,letterSpacing:'-0.04em',lineHeight:1,fontFamily:'var(--font-display)',background:'linear-gradient(135deg,#fff 30%,rgba(255,255,255,0.4))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
            {client?.name}
          </h1>
          {client?.goals && <p style={{fontSize:11,color:C.dim,marginTop:5}}>Goal · {client.goals}</p>}

          {/* Tab pills */}
          <div style={{display:'flex',gap:6,marginTop:18}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{padding:'7px 16px',borderRadius:20,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.15s',
                  background: tab===t.id ? '#818cf8' : 'rgba(255,255,255,0.06)',
                  color: tab===t.id ? '#fff' : C.dim,
                  boxShadow: tab===t.id ? '0 0 16px rgba(129,140,248,0.4)' : 'none',
                }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ══ BODY STATS ════════════════════════════════════════════════════ */}
        {tab === 'body' && (
          <div style={{animation:'fadeSlide 0.3s ease', flex:1, overflowY:'auto'}}>
            {/* Radar overview strip */}
            <div style={{display:'flex',alignItems:'center',gap:24,padding:'20px 32px',borderBottom:`1px solid ${C.border}`,background:'rgba(255,255,255,0.015)'}}>
              <Radar now={radarNow} prev={radarPrev} size={170}/>
              <div style={{flex:1}}>
                <p style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:C.dim,marginBottom:12}}>
                  Fitness Radar {radarPrev && '— dashed = previous'}
                </p>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {BODY_STATS.slice(0,4).map(s=>(
                    <div key={s.key} style={{display:'flex',alignItems:'center',gap:8}}>
                      <LiveDot color={s.color} size={6}/>
                      <span style={{fontSize:11,color:C.dim,flex:1}}>{s.label}</span>
                      <span style={{fontSize:13,fontWeight:700,color:s.color}}>{latest[s.key]}<span style={{fontSize:9,opacity:0.5,marginLeft:2}}>{s.unit}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ALL STATS — always visible grid */}
            <div style={{padding:'24px 32px', display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14}}>
              {BODY_STATS.map((s, i) => (
                <StatBlock
                  key={s.key}
                  label={s.label}
                  value={latest[s.key]}
                  unit={s.unit}
                  color={s.color}
                  series={series(s.key)}
                  prevVal={prev?.[s.key]}
                  goodDown={s.goodDown}
                  statKey={s.key}
                  graphType={gTypes[i % 3]}
                />
              ))}
            </div>

            <AIPanel client={client} latest={latest} prev={prev} trainings={trainings} waterAvg={avgWater}/>
          </div>
        )}

        {/* ══ LIFESTYLE ══════════════════════════════════════════════════════ */}
        {tab === 'lifestyle' && (
          <div style={{animation:'fadeSlide 0.3s ease', flex:1, overflowY:'auto'}}>
            {/* 3 big live cards */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',borderBottom:`1px solid ${C.border}`}}>
              {[
                {icon:'💧', label:'Avg Water',  val:avgWater,           unit:'L/day', color:C.water,   good:num(avgWater)>=2.5,  tip:num(avgWater)>=2.5?`${Math.round((num(avgWater)/3)*100)}% of 3L goal`:'Drink more daily'},
                {icon:'🌙', label:'Sleep',      val:latest?.sleep_hours, unit:'h',     color:'#c084fc', good:num(latest?.sleep_hours)>=7, tip:num(latest?.sleep_hours)>=7?'Recovery on point':'+1h = better recovery'},
                {icon:'👟', label:'Steps',      val:latest?.steps,       unit:'',      color:'#34d399', good:num(latest?.steps)>=8000,    tip:num(latest?.steps)>=10000?'Daily goal crushed 🏆':num(latest?.steps)>=8000?'Almost there':'Add a 15min walk'},
              ].map((item, i) => (
                <div key={i} style={{padding:'28px 24px',textAlign:'center',borderRight:i<2?`1px solid ${C.border}`:'none'}}>
                  <div style={{fontSize:30,marginBottom:10}}>{item.icon}</div>
                  <p style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:C.dim,marginBottom:8}}>{item.label}</p>
                  {item.val
                    ? <Counter to={item.val} unit={item.unit} color={item.color} size={30} dec={1}/>
                    : <span style={{fontSize:24,color:C.dim}}>—</span>}
                  <p style={{fontSize:11,fontWeight:600,color:item.val?(item.good?'#34d399':'#f87171'):C.dim,marginTop:8}}>{item.val?item.tip:'No data'}</p>
                </div>
              ))}
            </div>

            <div style={{padding:'24px 32px', display:'flex', flexDirection:'column', gap:20}}>
              {/* Water bar chart — always visible */}
              {waterLogs.length > 1 && (
                <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:'18px 20px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
                    <LiveDot color={C.water}/>
                    <span style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:C.dim}}>Daily Water — last {Math.min(14,waterLogs.length)} days</span>
                    <span style={{marginLeft:'auto',fontSize:13,fontWeight:700,color:C.water}}>{avgWater} L avg</span>
                  </div>
                  <Bars
                    data={waterLogs.slice(-14).map(l=>l.amount_liters||0)}
                    labels={waterLogs.slice(-14).map(l=>l.date?format(parseISO(l.date),'d'):'')}
                    color={C.water} h={90}/>
                </div>
              )}

              {/* Donuts for lifestyle metrics — always visible */}
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:'20px'}}>
                <p style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:C.dim,marginBottom:16}}>Lifestyle Indicators {prev&&'— faded ring = previous'}</p>
                <div style={{display:'flex',gap:24,justifyContent:'center',flexWrap:'wrap'}}>
                  {[
                    {key:'sleep_hours',label:'Sleep',    max:9,     color:'#c084fc'},
                    {key:'steps',      label:'Steps',    max:12000, color:'#34d399'},
                    {key:'body_water_pct',label:'Hydration %',max:70,color:C.water},
                  ].filter(d=>latest?.[d.key]!=null).map(d=>(
                    <Donut key={d.key} value={latest[d.key]} max={d.max} color={d.color} label={d.label} size={100} thick={12} prevValue={prev?.[d.key]}/>
                  ))}
                </div>
              </div>

              {/* Progress bars — lifestyle vs target */}
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:'20px'}}>
                <p style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:C.dim,marginBottom:16}}>vs Target</p>
                {[
                  {label:`Water ${avgWater||0}L / 3L`, value:Math.min(100,Math.round((num(avgWater)/3)*100)), color:C.water},
                  {label:`Sleep ${latest?.sleep_hours||0}h / 8h`, value:Math.min(100,Math.round((num(latest?.sleep_hours)/8)*100)), color:'#c084fc'},
                  {label:`Steps ${latest?.steps||0} / 10,000`, value:Math.min(100,Math.round((num(latest?.steps)/10000)*100)), color:'#34d399'},
                ].map(b=>(
                  <div key={b.label} style={{marginBottom:14}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                      <span style={{fontSize:11,color:C.dim}}>{b.label}</span>
                      <span style={{fontSize:11,fontWeight:700,color:b.value>=100?'#34d399':'#fff'}}>{b.value}%</span>
                    </div>
                    <div style={{height:5,borderRadius:3,background:'rgba(255,255,255,0.07)',overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${b.value}%`,borderRadius:3,background:b.color,boxShadow:`0 0 8px ${b.color}88`,transition:'width 1.2s cubic-bezier(0.4,0,0.2,1)'}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <AIPanel client={client} latest={latest} prev={prev} trainings={trainings} waterAvg={avgWater}/>
          </div>
        )}

        {/* ══ TRAINING ════════════════════════════════════════════════════════ */}
        {tab === 'training' && (
          <div style={{animation:'fadeSlide 0.3s ease', flex:1, overflowY:'auto'}}>
            <div style={{padding:'24px 32px', display:'flex', flexDirection:'column', gap:14}}>
              {trainings.length === 0
                ? <div style={{textAlign:'center',padding:'80px 0',color:C.dim}}>No training sessions recorded yet</div>
                : trainings.map(plan => (
                  <div key={plan.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,borderLeft:`3px solid ${C.muscle}`,overflow:'hidden'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'18px 22px',borderBottom:`1px solid ${C.border}`}}>
                      <div>
                        <p style={{fontSize:15,fontWeight:700,color:'#fff',marginBottom:3}}>{plan.title}</p>
                        <p style={{fontSize:11,color:C.dim}}>{plan.date?format(parseISO(plan.date),'EEEE, MMMM d, yyyy'):''}</p>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <p style={{fontSize:28,fontWeight:800,color:C.muscle,lineHeight:1}}>{plan.exercises?.length||0}</p>
                        <p style={{fontSize:9,color:C.dim}}>exercises</p>
                      </div>
                    </div>
                    <div style={{padding:'14px 22px',display:'flex',flexWrap:'wrap',gap:7}}>
                      {plan.exercises?.map((ex, ei) => (
                        <div key={ei} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:9,padding:'5px 11px'}}>
                          <p style={{fontSize:12,fontWeight:600,color:'#fff'}}>{ex.name}</p>
                          <p style={{fontSize:10,color:C.muscle}}>{ex.sets}×{ex.reps}{ex.weight_kg?` @ ${ex.weight_kg}kg`:''}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              }
            </div>
            <AIPanel client={client} latest={latest} prev={prev} trainings={trainings} waterAvg={avgWater}/>
          </div>
        )}

        {/* ══ NUTRITION ═══════════════════════════════════════════════════════ */}
        {tab === 'nutrition' && (
          <div style={{animation:'fadeSlide 0.3s ease', flex:1, overflowY:'auto'}}>
            <div style={{padding:'24px 32px', display:'flex', flexDirection:'column', gap:14}}>
              {!nutritionPlan
                ? <div style={{textAlign:'center',padding:'80px 0',color:C.dim}}>No nutrition plan assigned</div>
                : (
                  <>
                    {/* Macro summary */}
                    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:'20px',borderTop:`2px solid ${C.bmr}`}}>
                      <p style={{fontSize:16,fontWeight:700,color:'#fff',marginBottom:12}}>{nutritionPlan.title}</p>
                      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                        {[['🔥',nutritionPlan.calories,'kcal','#f59e0b'],['💪',nutritionPlan.protein,'g P','#34d399'],['🌾',nutritionPlan.carbs,'g C','#38bdf8'],['🥑',nutritionPlan.fat,'g F','#f87171'],['💧',nutritionPlan.water_liters_daily,'L','#60a5fa']].map(([e,v,l,c])=>v&&(
                          <div key={l} style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${c}22`,borderRadius:11,padding:'8px 14px',textAlign:'center'}}>
                            <p style={{fontSize:16,marginBottom:3}}>{e}</p>
                            <p style={{fontSize:16,fontWeight:700,color:c}}>{v}</p>
                            <p style={{fontSize:9,color:C.dim}}>{l}</p>
                          </div>
                        ))}
                      </div>
                      {nutritionPlan.notes && <p style={{fontSize:12,color:C.dim,fontStyle:'italic',marginTop:10}}>{nutritionPlan.notes}</p>}
                    </div>

                    {/* Meal sections */}
                    {nutritionPlan.meal_sections?.map((sec, si) => (
                      <div key={si} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:'hidden'}}>
                        <div style={{display:'flex',alignItems:'center',gap:10,padding:'14px 20px',borderBottom:`1px solid ${C.border}`,background:'rgba(255,255,255,0.02)'}}>
                          <span style={{fontSize:20}}>{sec.section_name?.toLowerCase().includes('breakfast')?'🌅':sec.section_name?.toLowerCase().includes('lunch')?'☀️':sec.section_name?.toLowerCase().includes('dinner')?'🌙':sec.section_name?.toLowerCase().includes('snack')?'🍎':'🍽️'}</span>
                          <span style={{fontSize:14,fontWeight:700,color:'#fff',flex:1}}>{sec.section_name}</span>
                          <span style={{fontSize:11,color:C.dim}}>{sec.time}</span>
                        </div>
                        {sec.options?.map((opt, oi) => (
                          <div key={oi} style={{display:'flex',justifyContent:'space-between',padding:'12px 20px',borderBottom:oi<sec.options.length-1?`1px solid rgba(255,255,255,0.04)`:'none',gap:14}}>
                            <div style={{flex:1}}>
                              <p style={{fontSize:13,fontWeight:600,color:'#fff',marginBottom:2}}>{opt.name}</p>
                              <p style={{fontSize:11,color:C.dim,marginBottom:2}}>{opt.description}</p>
                              <p style={{fontSize:10,color:'rgba(255,255,255,0.18)',fontStyle:'italic'}}>{opt.ingredients}</p>
                            </div>
                            <div style={{textAlign:'right',flexShrink:0}}>
                              <p style={{fontSize:16,fontWeight:700,color:'#fbbf24'}}>{opt.calories}</p>
                              <p style={{fontSize:9,color:C.dim}}>kcal</p>
                              <p style={{fontSize:10,color:C.dim,marginTop:2}}>P:{opt.protein} C:{opt.carbs} F:{opt.fat}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}

                    {/* Supplements */}
                    {nutritionPlan.supplements?.length > 0 && (
                      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:'18px 20px'}}>
                        <p style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:C.dim,marginBottom:12}}>Supplements</p>
                        <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                          {nutritionPlan.supplements.map((s,i)=>(
                            <div key={i} style={{background:'rgba(192,132,252,0.1)',border:'1px solid rgba(192,132,252,0.2)',borderRadius:10,padding:'6px 12px'}}>
                              <p style={{fontSize:12,fontWeight:600,color:'#c084fc'}}>💊 {s.name}</p>
                              <p style={{fontSize:10,color:C.dim}}>{s.quantity} · {s.timing}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )
              }
            </div>
            <AIPanel client={client} latest={latest} prev={prev} trainings={trainings} waterAvg={avgWater}/>
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadeSlide { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes ping { 75%,100%{transform:scale(2.2);opacity:0} }
      `}</style>
    </div>
  );
}
