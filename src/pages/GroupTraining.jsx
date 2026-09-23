import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import CubeBackground from '../components/CubeBackground';
import { exerciseVideoUrl } from '../lib/exerciseApi';

/* ── Παλμός palette (ίδιο με Live Training) ── */
const ACCENT = '#e0457b';
const ACCENT2 = '#8b5cf6';
const PULSE_BG = 'radial-gradient(130% 90% at 50% 118%, #2a1140 0%, #140a24 46%, #0b0714 100%)';

const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const setsOf = (ex) => ex.set_details?.length || ex.sets || 3;
const repsOf = (ex) => String(ex.reps ?? '10');
const restSet = (ex) => ex.rest_between_sets || 60;
const restEx = (ex) => ex.rest_after_exercise || 90;
const setRows = (ex) => ex.set_details?.length ? ex.set_details
  : Array.from({ length: ex.sets || 3 }, () => ({ reps: ex.reps || '10', weight_kg: ex.weight_kg || 0, rest_sec: ex.rest_between_sets || 60 }));
const repN = (r) => { const m = String(r ?? '10').match(/\d+/g); return m ? parseInt(m[m.length-1],10) : 10; };

/* ── μικρό βίντεο άσκησης μέλους — κρύβεται αν δεν υπάρχει ── */
function GVid({ name, col, w = 92 }) {
  const url = exerciseVideoUrl(name);
  const [ok, setOk] = useState(true);
  useEffect(() => { setOk(true); }, [url]);
  if (!url || !ok) return (
    <div style={{ width:w, alignSelf:'stretch', minHeight:'clamp(96px,14vh,300px)', borderRadius:12, background:`${col}14`,
      display:'grid', placeItems:'center', color:col, fontWeight:900, fontSize:'clamp(26px,4vh,60px)', flexShrink:0 }}>{(name||'?').charAt(0)}</div>
  );
  return <video key={url} src={url} autoPlay loop muted playsInline preload="metadata" onError={() => setOk(false)}
    style={{ width:w, alignSelf:'stretch', minHeight:'clamp(96px,14vh,300px)', objectFit:'contain', background:'#fcfcfd',
      mixBlendMode:'multiply', flexShrink:0 }}/>;
}
const fmt = (s) => `${Math.floor(s/60)}:${String(Math.max(0,s)%60).padStart(2,'0')}`;

/* ── Χρονόμετρο σε σχήμα χρονομέτρου — το 4ο τεταρτημόριο στα 3μελή groups ── */
function StopwatchWidget({ acc = '#e0457b', acc2 = '#8b5cf6' }) {
  const [ms, setMs] = useState(0);
  const [run, setRun] = useState(false);
  const t0 = useRef(0);
  useEffect(() => {
    if (!run) return;
    t0.current = Date.now() - ms;
    const iv = setInterval(() => setMs(Date.now() - t0.current), 50);
    return () => clearInterval(iv);
  }, [run]);
  const sec = ms / 1000;
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(Math.floor(sec % 60)).padStart(2, '0');
  const cs = String(Math.floor((ms % 1000) / 10)).padStart(2, '0');
  const angle = (sec % 60) * 6;
  const ticks = Array.from({ length: 60 }, (_, i) => i);
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', width:'100%', height:'100%', minHeight:0 }}>
      <div style={{ position:'relative', width:'min(46vh, 78%, 300px)', aspectRatio:'1' }}>
        <div style={{ position:'absolute', top:'-5%', left:'50%', transform:'translateX(-50%)', width:'11%', height:'6%', borderRadius:'6px 6px 3px 3px', background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.25)' }}/>
        <svg viewBox="0 0 200 200" style={{ width:'100%', height:'100%', filter:`drop-shadow(0 0 18px ${acc}33)` }}>
          <circle cx="100" cy="100" r="96" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.22)" strokeWidth="3"/>
          <circle cx="100" cy="100" r="86" fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.10)" strokeWidth="1"/>
          {ticks.map(i => {
            const a = (i * 6 - 90) * Math.PI / 180;
            const big = i % 5 === 0;
            const r1 = big ? 74 : 79, r2 = 84;
            return <line key={i} x1={100 + r1 * Math.cos(a)} y1={100 + r1 * Math.sin(a)} x2={100 + r2 * Math.cos(a)} y2={100 + r2 * Math.sin(a)}
              stroke={big ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.28)'} strokeWidth={big ? 2.4 : 1.2} strokeLinecap="round"/>;
          })}
          <g style={{ transform:`rotate(${angle}deg)`, transformOrigin:'100px 100px', transition: run ? 'none' : 'transform .3s' }}>
            <line x1="100" y1="112" x2="100" y2="26" stroke={acc} strokeWidth="3" strokeLinecap="round"/>
            <circle cx="100" cy="100" r="5.5" fill={acc}/>
          </g>
          <circle cx="100" cy="100" r="2.4" fill="#fff"/>
        </svg>
        <div style={{ position:'absolute', left:0, right:0, top:'62%', textAlign:'center', pointerEvents:'none' }}>
          <span style={{ fontSize:'clamp(16px,3.4vh,24px)', fontWeight:900, letterSpacing:'.04em', color:'#fff', fontVariantNumeric:'tabular-nums' }}>{mm}:{ss}<span style={{ fontSize:'.55em', color:'rgba(255,255,255,0.55)' }}>.{cs}</span></span>
        </div>
      </div>
      <div style={{ display:'flex', gap:10, marginTop:'2vh' }}>
        <button onClick={() => setRun(r => !r)}
          style={{ padding:'10px 22px', borderRadius:12, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight:800,
            background: run ? 'rgba(255,255,255,0.14)' : `linear-gradient(135deg, ${acc}, ${acc2})`, color:'#fff' }}>
          {run ? '⏸ Παύση' : ms ? '▶ Συνέχεια' : '▶ Έναρξη'}
        </button>
        <button onClick={() => { setRun(false); setMs(0); }} disabled={!ms}
          style={{ padding:'10px 18px', borderRadius:12, border:'1px solid rgba(255,255,255,0.22)', cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight:800, background:'transparent', color:'rgba(255,255,255,0.8)', opacity: ms ? 1 : 0.4 }}>
          ⟲ Μηδενισμός
        </button>
      </div>
    </div>
  );
}

export default function GroupTraining() {
  const location = useLocation();
  const navigate = useNavigate();
  const st = location.state || {};
  const plans = st.plans || [];
  const members = st.members || [];
  const groupName = st.groupName || 'Group';

  const [screen, setScreen] = useState('greet');     // greet | preview | run | finish
  const [timers, setTimers] = useState({ left: 0, right: 0 });
  const [pulse, setPulse] = useState({ left: 0, right: 0 });
  const [notes, setNotes] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [prog, setProg] = useState(() => plans.map(() => ({ ex: 0, set: 0, done: false })));
  const [marks, setMarks] = useState({});           // μέλος -> δευτερόλεπτο ρολογιού τελευταίου ✓ σετ
  const [clock, setClock] = useState(0);            // κεντρικό ρολόι προπόνησης (sec)
  useEffect(() => {
    if (screen !== 'run') return;
    const t = setInterval(() => setClock(c => c + 1), 1000);
    return () => clearInterval(t);
  }, [screen]);
  const advance = useCallback((i) => {
    setProg(p => p.map((m, j) => {
      if (j !== i || m.done) return m;
      const exs = plans[i]?.exercises || [];
      const cx = exs[m.ex];
      if (!cx) return { ...m, done: true };
      const total = setRows(cx).length;
      if (m.set + 1 < total) return { ...m, set: m.set + 1 };
      if (m.ex + 1 < exs.length) return { ex: m.ex + 1, set: 0, done: false };
      return { ...m, done: true };
    }));
    setMarks(v => ({ ...v, [i]: null }));
    setClock(c => { setMarks(v => ({ ...v, [i]: c })); return c; });
  }, [plans]);

  const colorOf = (i) => members[i]?.theme_color || (i === 0 ? ACCENT : ACCENT2);
  const nameOf = (i) => plans[i]?.client_name || members[i]?.name || `Μέλος ${i + 1}`;

  /* stopwatch: μετράει προς τα πάνω, μηδενίζεται με το κλικερ */
  useEffect(() => {
    if (screen !== 'run') return;
    const t = setInterval(() => setTimers(v => ({ left: v.left + 1, right: v.right + 1 })), 1000);
    return () => clearInterval(t);
  }, [screen]);

  const resetTimer = useCallback((side) => {
    setTimers(v => ({ ...v, [side]: 0 }));
    setPulse(v => ({ ...v, [side]: v[side] + 1 }));
  }, []);

  /* κλικερ: ΑΡΙΣΤΕΡΟ κλικ → αριστερό χρονόμετρο, ΔΕΞΙ κλικ → δεξί */
  const onMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('textarea')) return;
    if (e.button === 0) { advance(0); }
    else if (e.button === 2) { e.preventDefault(); advance(1); }
  };
  useEffect(() => {
    if (screen !== 'run') return;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft' || e.key === '1') { e.preventDefault(); advance(0); }
      else if (e.key === 'ArrowRight' || e.key === '2') { e.preventDefault(); advance(1); }
      else if (e.key === '3') { e.preventDefault(); advance(2); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, advance]);

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    const stamp = new Date().toISOString();
    for (const p of plans) {
      const fb = (notes[p.id] || '').trim();
      try {
        if (p.id) await db.TrainingPlan.update(p.id, { completed: true, completed_date: stamp, trainer_feedback: fb });
        if (fb && p.client_id) await db.ClientNote.create({ client_id: p.client_id, type: 'training_feedback', content: fb, date: stamp.split('T')[0], source: 'group_training' });
      } catch (e) {}
    }
    setSavedMsg('Οι σημειώσεις αποθηκεύτηκαν — ο εγκέφαλος θα τις λάβει υπόψη στις επόμενες προπονήσεις/διατροφές.');
    setTimeout(() => navigate('/TrainingPlans'), 1400);
  };

  const S = {
    page:{ minHeight:'var(--lt-vh, 100vh)', position:'relative', overflowX:'hidden', color:'#0e1116', fontFamily:'var(--cp-font, "Space Grotesk", sans-serif)' },
    center:{ minHeight:'var(--lt-vh, 100vh)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 20px', position:'relative', zIndex:1, textAlign:'center' },
    kicker:{ fontSize:10.5, letterSpacing:'.3em', textTransform:'uppercase', color:'rgba(224,69,123,.9)', fontWeight:700, margin:0 },
    cta:(bg)=>({ border:'none', borderRadius:15, padding:'15px 30px', fontSize:15, fontWeight:800, cursor:'pointer', color:'#fff', fontFamily:'inherit',
      background: bg || 'linear-gradient(135deg,#e0457b,#8b5cf6)', boxShadow:'0 8px 28px rgba(224,69,123,.3)' }),
    ghost:{ border:'1px solid rgba(14,17,22,.16)', borderRadius:14, padding:'12px 20px', fontSize:13.5, fontWeight:700, cursor:'pointer', background:'#fff', color:'#0e1116', fontFamily:'inherit' },
  };

  if (!plans.length) {
    return (
      <div style={{ ...S.page, background:'#fcfcfd' }}>
        <div style={S.center}>
          <p style={{ fontSize:16, marginBottom:16, fontWeight:700 }}>Δεν βρέθηκε ομαδική προπόνηση.</p>
          <button onClick={()=>navigate('/TrainingPlans')} style={S.cta()}>Πίσω στο Training Center</button>
        </div>
      </div>
    );
  }

  /* ── column με τη λεπτομερή προπόνηση ενός μέλους ── */
  const Column = ({ i }) => {
    const p = plans[i];
    const side = i === 0 ? 'left' : 'right';
    const col = colorOf(i);
    const exs = p.exercises || [];
    const over = timers[side] >= 45;
    return (
      <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
        {/* όνομα + χρονόμετρο */}
        <div style={{ position:'sticky', top:0, zIndex:2, padding:'14px 12px 12px', background:'linear-gradient(180deg, rgba(11,7,20,.96), rgba(11,7,20,.75))', backdropFilter:'blur(6px)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9, justifyContent:'center', marginBottom:8 }}>
            <span style={{ width:26, height:26, borderRadius:'50%', background:col, display:'grid', placeItems:'center', color:'#fff', fontWeight:800, fontSize:12, flexShrink:0 }}>{nameOf(i).charAt(0)}</span>
            <span style={{ fontSize:16, fontWeight:800, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{nameOf(i)}</span>
          </div>
          <div key={pulse[side]} style={{ textAlign:'center', animation:'gtPulse .5s ease' }}>
            <div style={{ fontSize:'clamp(40px,9vw,60px)', fontWeight:800, lineHeight:1, fontVariantNumeric:'tabular-nums',
              color: over ? col : '#fff', textShadow:`0 0 26px ${col}88`, transition:'color .3s' }}>{fmt(timers[side])}</div>
            <div style={{ fontSize:9.5, letterSpacing:'.2em', textTransform:'uppercase', color:'rgba(255,255,255,.4)', fontWeight:700, marginTop:4 }}>
              {side === 'left' ? '◀ αριστερό κλικ' : 'δεξί κλικ ▶'} · μηδενισμός
            </div>
          </div>
        </div>

        {/* λεπτομερής προπόνηση */}
        <div style={{ padding:'4px 10px 20px' }}>
          {p.title && <p style={{ fontSize:11, letterSpacing:'.1em', textTransform:'uppercase', color:col, fontWeight:800, margin:'2px 0 10px', textAlign:'center' }}>{p.title}</p>}
          {exs.map((ex, k) => (
            <div key={k} style={{ background:'rgba(0,0,0,.5)', border:'1px solid rgba(255,255,255,.09)', borderRadius:14, padding:'11px 13px', marginBottom:9 }}>
              <p style={{ margin:'0 0 8px', fontSize:14, fontWeight:800, color:'#fff' }}>{k + 1}. {ex.name}</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 12px' }}>
                <Stat label="Κιλά" value={num(ex.weight_kg) > 0 ? `${ex.weight_kg} kg` : '—'} col={col}/>
                <Stat label="Σετ × Επαν." value={`${setsOf(ex)} × ${repsOf(ex)}`} col={col}/>
                <Stat label="Διάλ. μετά σετ" value={`${restSet(ex)}s`} col={col}/>
                <Stat label="Διάλ. μετά άσκηση" value={`${restEx(ex)}s`} col={col}/>
              </div>
            </div>
          ))}
          {exs.length === 0 && <p style={{ color:'rgba(255,255,255,.5)', textAlign:'center', fontSize:13 }}>Χωρίς ασκήσεις.</p>}
        </div>
      </div>
    );
  };

  const Stat = ({ label, value, col }) => (
    <div>
      <span style={{ display:'block', fontSize:8.5, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.4)', fontWeight:700 }}>{label}</span>
      <span style={{ fontSize:13.5, fontWeight:800, color: value === '—' ? 'rgba(255,255,255,.4)' : '#fff' }}>{value}</span>
    </div>
  );

  return (
    <>
    <div style={{ ...S.page, background:'#fcfcfd', color:'#0e1116' }}
      onMouseDown={screen === 'run' ? onMouseDown : undefined}
      onContextMenu={screen === 'run' ? (e)=>e.preventDefault() : undefined}>

      {/* ── ΧΑΙΡΕΤΙΣΜΟΣ — λευκό (Arena) ── */}
      {screen === 'greet' && (
        <div style={S.center}>
          <p style={{ fontSize:'clamp(10.5px,1.4vh,18px)', letterSpacing:'.3em', textTransform:'uppercase', color:ACCENT, fontWeight:800, margin:0 }}>GROUP <span style={{ color:'#0e1116' }}>LIVE</span> · The Cube</p>
          <div style={{ fontSize:'clamp(50px,7vh,110px)', margin:'14px 0 6px' }}>👥</div>
          <h1 style={{ fontSize:'clamp(34px,5.4vh,84px)', fontWeight:900, letterSpacing:'-.03em', margin:'0 0 10px',
            background:'linear-gradient(135deg,#e0457b,#8b5cf6)', WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent' }}>{groupName}</h1>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center', margin:'0 0 12px' }}>
            {plans.map((p, i2) => (
              <span key={i2} style={{ fontSize:'clamp(11px,1.5vh,20px)', fontWeight:800, padding:'.4em 1.2em', borderRadius:99, color:'#fff', background:colorOf(i2) }}>{nameOf(i2)}</span>
            ))}
          </div>
          <p style={{ fontSize:'clamp(12.5px,1.7vh,21px)', color:'#6b7280', maxWidth:520, margin:'0 0 26px', lineHeight:1.6 }}>Προπονείστε ταυτόχρονα — κάθε μέλος με το πρόγραμμά του. Με το ✓ (ή τα πλήκτρα 1/2/3 · αριστερό/δεξί κλικ) μετράς τα σετ του καθενός, και το ρολόι δείχνει σε όλους το διάλειμμά τους.</p>
          <button onClick={()=>setScreen('preview')} style={S.cta()}>Προβολή προπόνησης</button>
        </div>
      )}

      {/* ── PREVIEW — λευκό (Arena) ── */}
      {screen === 'preview' && (
        <div style={{ position:'relative', zIndex:1, maxWidth:880, margin:'0 auto', padding:'34px 18px 44px' }}>
          <p style={{ fontSize:'clamp(10.5px,1.4vh,17px)', letterSpacing:'.3em', textTransform:'uppercase', color:ACCENT, fontWeight:800, margin:0, textAlign:'center' }}>Σύνοψη · {groupName}</p>
          <h1 style={{ fontSize:'clamp(24px,3.4vh,44px)', fontWeight:900, letterSpacing:'-.02em', textAlign:'center', margin:'8px 0 22px' }}>Η σημερινή προπόνηση</h1>
          <div style={{ display:'grid', gridTemplateColumns: plans.length >= 3 ? '1fr 1fr 1fr' : '1fr 1fr', gap:12 }}>
            {plans.map((p, i2) => (
              <div key={i2} style={{ background:'#fff', border:'1px solid rgba(14,17,22,.09)', borderRadius:16, padding:'16px', position:'relative', overflow:'hidden' }}>
                <span style={{ position:'absolute', inset:'0 0 auto 0', height:4, background:colorOf(i2) }}/>
                <div style={{ display:'flex', alignItems:'center', gap:8, margin:'4px 0 12px' }}>
                  <span style={{ fontSize:'clamp(9.5px,1.3vh,16px)', fontWeight:800, padding:'.35em 1.1em', borderRadius:99, color:'#fff', background:colorOf(i2) }}>{nameOf(i2).toUpperCase()}</span>
                </div>
                {(p.exercises || []).map((ex, k) => (
                  <div key={k} style={{ display:'flex', gap:8, padding:'6px 0', borderTop: k ? '1px solid rgba(14,17,22,.07)' : 'none' }}>
                    <span style={{ color:colorOf(i2), fontWeight:800, fontSize:'clamp(13px,1.7vh,20px)', minWidth:18 }}>{k + 1}</span>
                    <span style={{ fontSize:'clamp(13.5px,1.8vh,21px)', fontWeight:600 }}>{ex.name}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'center', marginTop:24 }}>
            <button onClick={()=>setScreen('greet')} style={S.ghost}>Πίσω</button>
            <button onClick={()=>{ setTimers({left:0,right:0}); setScreen('run'); }} style={S.cta()}>▶ Έναρξη</button>
          </div>
        </div>
      )}

      {/* ── RUN — ARENA: λευκό θέμα, ζωντανό ρολόι, κάρτες μελών ── */}
      {screen === 'run' && (
        <div style={{ position:'relative', zIndex:1, minHeight:'var(--lt-vh, 100vh)', display:'flex', flexDirection:'column',
          background:'#fcfcfd', color:'#0e1116', userSelect:'none',
          padding:'calc(12px + env(safe-area-inset-top)) 14px 0' }}>

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontWeight:900, letterSpacing:'.16em', fontSize:'clamp(11px,1.4vh,20px)' }}>GROUP <span style={{ color:ACCENT }}>LIVE</span></span>
            <span style={{ fontSize:'clamp(10px,1.3vh,18px)', fontWeight:800, padding:'.4em 1.1em', borderRadius:99, letterSpacing:'.06em', background:'#fdf2f8', color:ACCENT, maxWidth:'32vw', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{groupName.toUpperCase()}</span>
          </div>

          {/* κεντρικό ψηφιακό ρολόι με δευτερόλεπτα */}
          <div style={{ textAlign:'center', margin:'6px 0 10px' }}>
            <span style={{ display:'block', fontSize:'clamp(8.5px,1.2vh,16px)', letterSpacing:'.24em', fontWeight:800, color:'#a1a1aa' }}>ΡΟΛΟΪ ΠΡΟΠΟΝΗΣΗΣ</span>
            <span style={{ fontFamily:'ui-monospace,monospace', fontWeight:700, fontSize:'clamp(44px,8vh,150px)', letterSpacing:'-.02em', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>
              {String(Math.floor(clock/60)).padStart(2,'0')}:{String(clock%60).padStart(2,'0')}
            </span>
            <span style={{ display:'block', fontSize:'clamp(9px,1.3vh,18px)', color:'#6b7280', marginTop:2 }}>μέτρα το δικό σου διάλειμμα</span>
          </div>

          {/* κάρτες μελών */}
          <div style={{ display:'flex', flexDirection:'column', gap:9, flex:1, minHeight:0 }}>
            {plans.map((p, i) => {
              const col = colorOf(i);
              const exs = p.exercises || [];
              const m = prog[i] || { ex:0, set:0, done:false };
              const cx = exs[m.ex];
              const rows = cx ? setRows(cx) : [];
              const curRow = rows[m.set] || {};
              const kg = num(curRow.weight_kg);
              const rr = repN(curRow.reps);
              const restLbl = parseInt(curRow.rest_sec ?? (cx ? restSet(cx) : 60), 10);
              const myRest = marks[i] != null ? clock - marks[i] : null;
              const three = plans.length >= 3;
              return (
                <div key={i} style={{ position:'relative', flex:1, minHeight:0, background:'#fff',
                  border:'1px solid rgba(14,17,22,.09)', borderRadius:16, padding:'12px 11px 10px',
                  display:'flex', gap:10, alignItems:'stretch', overflow:'hidden', opacity: m.done ? .55 : 1 }}>
                  <span style={{ position:'absolute', inset:'0 0 auto 0', height:4, background:col }}/>
                  {cx && <GVid name={cx.name} col={col} w={three ? 'clamp(88px,12vh,270px)' : 'clamp(110px,17vh,360px)'}/>}
                  <div style={{ minWidth:0, flex:1, display:'flex', flexDirection:'column', justifyContent:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <span style={{ fontSize:'clamp(9.5px,1.3vh,17px)', fontWeight:800, padding:'.35em 1.1em', borderRadius:99, color:'#fff', background:col, letterSpacing:'.05em' }}>{nameOf(i).toUpperCase()}</span>
                      {myRest != null && !m.done && (
                        <span style={{ fontFamily:'ui-monospace,monospace', fontSize:'clamp(10.5px,1.6vh,22px)', fontWeight:700, color: myRest >= restLbl ? '#dc2626' : '#6b7280' }}>
                          ⏱ {fmt(myRest)}
                        </span>
                      )}
                    </div>
                    {m.done ? (
                      <p style={{ margin:'8px 0 0', fontSize:'clamp(15px,2.2vh,30px)', fontWeight:900 }}>Ολοκληρώθηκε 🏁</p>
                    ) : cx ? (
                      <>
                        <p style={{ margin:'5px 0 1px', fontSize: three ? 'clamp(13.5px,2vh,28px)' : 'clamp(15.5px,2.4vh,34px)', fontWeight:900, letterSpacing:'-.01em',
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cx.name}</p>
                        <p style={{ margin:'0 0 3px', fontSize:'clamp(8.5px,1.2vh,16px)', letterSpacing:'.16em', fontWeight:800, color:'#a1a1aa' }}>
                          ΑΣΚ. {m.ex + 1}/{exs.length} · ΣΕΤ {m.set + 1}/{rows.length} · ΔΙΑΛ. {restLbl}″
                        </p>
                        <p style={{ margin:0, fontFamily:'ui-monospace,monospace', fontWeight:700, letterSpacing:'-.04em',
                          fontSize: three ? 'clamp(26px,4.2vh,64px)' : 'clamp(32px,5vh,78px)', lineHeight:1, color:col, fontVariantNumeric:'tabular-nums' }}>
                          {kg > 0 ? <>{kg}<span style={{ fontSize:'.45em' }}>kg</span></> : 'BW'}
                          <span style={{ fontSize:'.5em', color:'#0e1116' }}> × {rr}</span>
                        </p>
                        {!three && (
                          <div style={{ display:'flex', gap:6, marginTop:8 }}>
                            {rows.map((r2, si) => {
                              const st = si < m.set ? 'don' : si === m.set ? 'act' : 'fut';
                              return (
                                <span key={si} style={{ flex:1, textAlign:'center', borderRadius:10, padding:'5px 2px 4px',
                                  fontSize:'clamp(10.5px,1.5vh,20px)', fontWeight:800, fontVariantNumeric:'tabular-nums',
                                  border: st === 'fut' ? '1.5px solid rgba(14,17,22,.1)' : '1.5px solid transparent',
                                  background: st === 'don' ? '#16a34a' : st === 'act' ? col : '#fff',
                                  color: st === 'fut' ? '#c3c8d1' : '#fff' }}>
                                  <span style={{ display:'block', fontSize:'clamp(7px,.95vh,12px)', letterSpacing:'.1em', opacity:.8 }}>ΣΕΤ {si + 1}</span>
                                  {num(r2.weight_kg) > 0 ? num(r2.weight_kg) : 'BW'}×{repN(r2.reps)}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      <p style={{ margin:'8px 0 0', fontSize:13, color:'#a1a1aa' }}>Χωρίς ασκήσεις.</p>
                    )}
                  </div>
                  {three && !m.done && cx && (
                    <div style={{ width:'clamp(34px,4.4vh,72px)', flexShrink:0, display:'flex', flexDirection:'column', gap:4 }}>
                      <span style={{ fontSize:'clamp(7px,1vh,13px)', letterSpacing:'.16em', textAlign:'center', color:'#a1a1aa', fontWeight:800 }}>ΣΕΤ</span>
                      {rows.map((r2, si) => {
                        const st = si < m.set ? 'don' : si === m.set ? 'act' : 'fut';
                        return (
                          <span key={si} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center',
                            borderRadius:8, fontSize:'clamp(11px,1.6vh,22px)', fontWeight:800, minHeight:'clamp(20px,2.6vh,44px)',
                            border: st === 'fut' ? '1.5px solid rgba(14,17,22,.1)' : '1.5px solid transparent',
                            background: st === 'don' ? '#16a34a' : st === 'act' ? col : '#fff',
                            color: st === 'fut' ? '#c3c8d1' : '#fff' }}>{si + 1}</span>
                        );
                      })}
                    </div>
                  )}
                  {!m.done && cx && (
                    <button onClick={(e) => { e.stopPropagation(); advance(i); }}
                      style={{ alignSelf:'center', flexShrink:0, width:'clamp(46px,6vh,96px)', height:'clamp(46px,6vh,96px)', borderRadius:'clamp(14px,1.8vh,24px)', border:'none', cursor:'pointer',
                        background:col, color:'#fff', fontSize:'clamp(17px,2.4vh,36px)', fontWeight:900, boxShadow:`0 4px 14px ${col}55` }}
                      title={`Σετ ✓ (πλήκτρο ${i + 1})`}>✓</button>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ position:'sticky', bottom:0, padding:'10px 0 calc(12px + env(safe-area-inset-bottom))',
            background:'linear-gradient(0deg,#fcfcfd 65%,rgba(252,252,253,0))', display:'flex', justifyContent:'center', gap:10 }}>
            <button onClick={()=>setScreen('finish')} style={{ border:'none', borderRadius:14, padding:'13px 26px',
              fontSize:13.5, fontWeight:800, cursor:'pointer', color:'#fff', fontFamily:'inherit',
              background:'linear-gradient(135deg,#e0457b,#8b5cf6)', boxShadow:'0 6px 22px rgba(224,69,123,.3)' }}>
              Ολοκλήρωση προπόνησης
            </button>
          </div>
        </div>
      )}

      {/* ── FINISH (σημειώσεις ανά πελάτη → feedback εγκεφάλου) ── */}
      {screen === 'finish' && (
        savedMsg ? (
          <div style={S.center}>
            <span style={{ width:56, height:56, borderRadius:'50%', background:'#16a34a', display:'grid', placeItems:'center', marginBottom:14, fontSize:26, color:'#fff' }}>✓</span>
            <p style={{ fontSize:'clamp(16px,2.1vh,26px)', fontWeight:800, color:'#0e1116', maxWidth:460 }}>{savedMsg}</p>
          </div>
        ) : (
          <div style={{ position:'relative', zIndex:1, maxWidth:640, margin:'0 auto', padding:'34px 18px 44px' }}>
            <p style={{ ...S.kicker, textAlign:'center' }}>Ολοκλήρωση · {groupName}</p>
            <h1 style={{ fontSize:'clamp(23px,3.2vh,40px)', fontWeight:900, letterSpacing:'-.02em', textAlign:'center', margin:'8px 0 6px' }}>Σημειώσεις ανά πελάτη</h1>
            <p style={{ fontSize:'clamp(12.5px,1.7vh,20px)', color:'#6b7280', textAlign:'center', margin:'0 0 22px', maxWidth:460, marginInline:'auto' }}>π.χ. «απέτυχε στις τελευταίες επαναλήψεις», «αύξηση κιλών την επόμενη φορά». Ο εγκέφαλος θα τις λάβει υπόψη στις μελλοντικές προπονήσεις και διατροφές.</p>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {plans.map((p, i) => (
                <div key={i} style={{ background:'#fff', border:'1px solid rgba(14,17,22,.09)', borderRadius:16, padding:'14px 15px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:10 }}>
                    <span style={{ width:26, height:26, borderRadius:'50%', background:colorOf(i), display:'grid', placeItems:'center', color:'#fff', fontWeight:800, fontSize:12 }}>{nameOf(i).charAt(0)}</span>
                    <span style={{ fontSize:'clamp(15px,2vh,24px)', fontWeight:800 }}>{nameOf(i)}</span>
                    {p.title && <span style={{ fontSize:11, color:colorOf(i), fontWeight:700 }}>· {p.title}</span>}
                  </div>
                  <textarea value={notes[p.id] || ''} onChange={e=>setNotes(n=>({ ...n, [p.id]: e.target.value }))}
                    placeholder="Παρατηρήσεις προπόνησης…"
                    style={{ width:'100%', minHeight:74, resize:'vertical', background:'#fcfcfd', border:'1px solid rgba(14,17,22,.14)', borderRadius:11, color:'#0e1116', padding:'10px 12px', fontSize:'clamp(13.5px,1.8vh,20px)', fontFamily:'inherit', outline:'none' }}/>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'center', marginTop:22 }}>
              <button onClick={()=>setScreen('run')} style={S.ghost}>Πίσω</button>
              <button onClick={finish} disabled={saving} style={{ ...S.cta(), opacity:saving?.6:1 }}>{saving ? 'Αποθήκευση…' : 'Αποθήκευση & τέλος'}</button>
            </div>
          </div>
        )
      )}

      <style>{`
        @keyframes gtPulse { 0%{transform:scale(1)} 45%{transform:scale(1.06)} 100%{transform:scale(1)} }
        @media (max-width:560px){ }
      `}</style>
    </div>
    </>
  );
}
