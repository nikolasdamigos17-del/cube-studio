import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { EQUIPMENT } from '../lib/gymEquipment';
import CubeBackground from '../components/CubeBackground';

/* ── audio ────────────────────────────────────────────────────────────── */
const beep = (freq = 880, dur = .18, vol = .4) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = freq; o.type = 'sine';
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + dur);
    o.start(); o.stop(ctx.currentTime + dur);
  } catch (e) {}
};
const sRep   = () => beep(880, .07, .22);
const sUndo  = () => beep(440, .08, .15);
const sSet   = () => { beep(660, .1, .28); setTimeout(() => beep(880, .18, .38), 130); };
const sStart = () => { beep(440, .08, .2); setTimeout(() => beep(660, .08, .25), 110);
                       setTimeout(() => beep(880, .2, .4), 220); };
const sEnd   = () => { beep(550, .1, .25); setTimeout(() => beep(750, .15, .35), 120); };

/* ── shared bits ──────────────────────────────────────────────────────── */
const ACCENT = 'var(--cp-accent,#22c55e)';
const DONE   = '#22c55e';

const setsOf = (ex) => ex.set_details?.length
  ? ex.set_details
  : Array.from({ length: ex.sets || 3 }, () => ({
      reps: ex.reps || '10', weight_kg: ex.weight_kg || 0,
      rest_sec: ex.rest_between_sets || 60 }));

const repTargetOf = (s) => {
  const m = String(s?.reps ?? '10').match(/\d+/g);
  return m ? parseInt(m[m.length - 1], 10) : 10;
};

/* Row of dots — one per set. Used in the header strip per exercise. */
function DotRow({ total, done, active, size = 7 }) {
  return (
    <div style={{ display:'flex', gap:3.5 }}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} style={{ width:size, height:size, borderRadius:'50%',
          background: i < done ? DONE : 'transparent',
          border: i < done ? 'none' : `1.5px solid ${active ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.25)'}`,
          transition:'background .25s' }}/>
      ))}
    </div>
  );
}

/* ── header: every exercise with its set dots ─────────────────────────── */
function ExerciseStrip({ exercises, current, doneMap }) {
  return (
    <div style={{ display:'flex', gap:0, alignItems:'stretch', overflowX:'auto',
      scrollbarWidth:'none', padding:'0 2px' }}>
      {exercises.map((ex, i) => {
        const total = setsOf(ex).length;
        const done = doneMap[i] ?? (i < current ? total : 0);
        const isNow = i === current;
        return (
          <div key={i} style={{ display:'flex', alignItems:'stretch', flex:'0 0 auto' }}>
            {i > 0 && <span style={{ width:1, background:'rgba(255,255,255,.14)', margin:'2px 11px 2px' }}/>}
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:11.5, fontWeight:isNow ? 700 : 500, whiteSpace:'nowrap',
                color: isNow ? '#fff' : i < current ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.4)',
                marginBottom:5 }}>
                {ex.name}
              </div>
              <DotRow total={total} done={done} active={isNow}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── the rep grid: circles that fill in as reps are logged ────────────── */
function RepGrid({ target, done, columns }) {
  const cols = columns || (target > 12 ? 5 : target > 8 ? 4 : 3);
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`,
      gap:'clamp(9px,2.6vw,15px)', justifyItems:'center' }}>
      {Array.from({ length: target }, (_, i) => (
        <span key={i} style={{ width:'clamp(30px,8.4vw,46px)', height:'clamp(30px,8.4vw,46px)',
          borderRadius:'50%',
          background: i < done ? DONE : 'transparent',
          border: i < done ? 'none' : '1.5px solid rgba(255,255,255,.32)',
          transition:'background .18s cubic-bezier(.34,1.56,.64,1), transform .18s',
          transform: i === done - 1 ? 'scale(1.08)' : 'scale(1)' }}/>
      ))}
    </div>
  );
}

/* ── circular workout progress ────────────────────────────────────────── */
function ProgressRing({ pct, size = 74, stroke = 7 }) {
  const r = (size - stroke) / 2, C = 2 * Math.PI * r;
  return (
    <div style={{ position:'relative', width:size, height:size, flex:'0 0 auto' }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)', display:'block' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={DONE} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)}
          style={{ transition:'stroke-dashoffset .5s ease' }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
        justifyContent:'center', fontSize:size * .25, fontWeight:800, color:'#fff',
        fontFamily:'var(--cp-font)', fontVariantNumeric:'tabular-nums' }}>
        {Math.round(pct)}%
      </div>
    </div>
  );
}

/* ── rest countdown, sits in the footer next to the ring ──────────────── */
function RestPanel({ seconds, onDone, nextLabel }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) { sStart(); onDone(); return; }
    if (left <= 3) beep(660, .07, .18);
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const pct = ((seconds - left) / seconds) * 100;
  const urgent = left <= 3;
  return (
    <div style={{ flex:1, minWidth:0, background:'rgba(255,255,255,.06)',
      border:'1px solid rgba(255,255,255,.14)', borderRadius:16, padding:'10px 14px' }}>
      <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
        <span style={{ fontSize:11, letterSpacing:'.14em', textTransform:'uppercase',
          color:'rgba(255,255,255,.5)' }}>Ξεκούραση</span>
        <span style={{ marginLeft:'auto', fontSize:26, fontWeight:800, fontFamily:'var(--cp-font)',
          color: urgent ? '#f87171' : '#fff', fontVariantNumeric:'tabular-nums', lineHeight:1 }}>
          {left}<span style={{ fontSize:12, opacity:.6 }}>s</span>
        </span>
      </div>
      <div style={{ height:5, borderRadius:5, background:'rgba(255,255,255,.12)',
        overflow:'hidden', margin:'8px 0 7px' }}>
        <div style={{ height:'100%', width:`${pct}%`, borderRadius:5,
          background: urgent ? '#f87171' : ACCENT, transition:'width .9s linear' }}/>
      </div>
      <div style={{ fontSize:11.5, color:'rgba(255,255,255,.62)', overflow:'hidden',
        textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {nextLabel}
      </div>
    </div>
  );
}

/* ── welcome ──────────────────────────────────────────────────────────── */
function Welcome({ plan, clientName, onStart }) {
  const exs = plan.exercises || [];
  const sets = exs.reduce((s, e) => s + setsOf(e).length, 0);
  const reps = exs.reduce((s, e) => s + setsOf(e).reduce((x, d) => x + repTargetOf(d), 0), 0);
  const eq = [...new Set(exs.map(e => e.eq).filter(Boolean))];
  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', justifyContent:'center',
      alignItems:'center', padding:'32px 20px', position:'relative', zIndex:1, textAlign:'center' }}>
      <div style={{ maxWidth:440, width:'100%' }}>
        <p style={{ fontSize:10, letterSpacing:'.24em', textTransform:'uppercase',
          color:'rgba(255,255,255,.42)', margin:0 }}>Personal Training Studio</p>
        <h1 style={{ fontSize:32, fontWeight:800, color:'#fff', fontFamily:'var(--cp-font)',
          lineHeight:1.12, margin:'8px 0 6px' }}>
          Έτοιμος,<br/><span style={{ color:ACCENT }}>{clientName || 'Athlete'}</span>;
        </h1>
        <p style={{ fontSize:14, color:'rgba(255,255,255,.5)', margin:'0 0 24px' }}>{plan.title}</p>

        <div style={{ display:'flex', gap:10, marginBottom:16 }}>
          {[[exs.length, 'ΑΣΚΗΣΕΙΣ'], [sets, 'ΣΕΤ'], [reps, 'ΕΠΑΝΑΛΗΨΕΙΣ']].map(([v, k]) => (
            <div key={k} style={{ flex:1, background:'rgba(0,0,0,.5)', backdropFilter:'blur(10px)',
              border:'1px solid rgba(255,255,255,.1)', borderRadius:14, padding:'13px 8px' }}>
              <div style={{ fontSize:22, fontWeight:900, color:'#fff', fontFamily:'var(--cp-font)' }}>{v}</div>
              <div style={{ fontSize:8.5, letterSpacing:'.12em', color:'rgba(255,255,255,.4)', marginTop:3 }}>{k}</div>
            </div>
          ))}
        </div>

        {eq.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:5, justifyContent:'center', marginBottom:16 }}>
            {eq.map(k => EQUIPMENT[k] && (
              <span key={k} style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:20,
                color:EQUIPMENT[k].color, background:EQUIPMENT[k].bg,
                border:`1px solid ${EQUIPMENT[k].color}44` }}>{EQUIPMENT[k].label}</span>
            ))}
          </div>
        )}

        <button onClick={onStart} style={{ width:'100%', padding:16, borderRadius:15, border:'none',
          cursor:'pointer', background:ACCENT, color:'#04140a', fontSize:15, fontWeight:800,
          fontFamily:'var(--cp-font)', letterSpacing:'.02em' }}>
          ▶ ΕΝΑΡΞΗ ΠΡΟΠΟΝΗΣΗΣ
        </button>
        <p style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:9 }}>
          Πάτα το κουμπί του clicker για να ξεκινήσεις
        </p>
      </div>
    </div>
  );
}

/* ── finish ───────────────────────────────────────────────────────────── */
function Finish({ plan, clientName, totals, onClose }) {
  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', justifyContent:'center',
      alignItems:'center', padding:'40px 20px', position:'relative', zIndex:1, textAlign:'center' }}>
      <div style={{ maxWidth:400, width:'100%' }}>
        <div style={{ fontSize:56, marginBottom:10 }}>🏆</div>
        <h1 style={{ fontSize:27, fontWeight:800, color:'#fff', fontFamily:'var(--cp-font)', margin:'0 0 6px' }}>
          Ολοκληρώθηκε!
        </h1>
        <p style={{ fontSize:14, color:'rgba(255,255,255,.5)', margin:'0 0 24px' }}>
          Τέλεια δουλειά, <strong style={{ color:ACCENT }}>{clientName || 'Athlete'}</strong>.
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:24 }}>
          {[['💪', totals.exercises, 'ΑΣΚΗΣΕΙΣ'], ['📊', totals.sets, 'ΣΕΤ'],
            ['🔁', totals.reps, 'ΕΠΑΝΑΛΗΨΕΙΣ'],
            ['⚖️', totals.volume ? `${Math.round(totals.volume).toLocaleString()}kg` : '—', 'ΟΓΚΟΣ']].map(([e, v, k]) => (
            <div key={k} style={{ background:'rgba(0,0,0,.55)', backdropFilter:'blur(8px)',
              border:'1px solid rgba(255,255,255,.1)', borderRadius:15, padding:'15px 10px' }}>
              <div style={{ fontSize:20 }}>{e}</div>
              <div style={{ fontSize:19, fontWeight:900, color:'#fff', fontFamily:'var(--cp-font)',
                margin:'3px 0 2px' }}>{v}</div>
              <div style={{ fontSize:8.5, letterSpacing:'.12em', color:'rgba(255,255,255,.38)' }}>{k}</div>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{ width:'100%', padding:14, borderRadius:14, border:'none',
          cursor:'pointer', background:ACCENT, color:'#04140a', fontSize:14, fontWeight:800 }}>
          ← Πίσω στα πλάνα
        </button>
      </div>
    </div>
  );
}

/* ── main ─────────────────────────────────────────────────────────────── */
export default function LiveTraining() {
  const nav = useNavigate();
  const { state } = useLocation();
  const plan = state?.plan;
  const clientName = state?.clientName || '';
  const exercises = plan?.exercises || [];

  const [screen, setScreen] = useState('welcome');   // welcome | run | finish
  const [exIdx, setExIdx] = useState(0);
  const [setIdx, setSetIdx] = useState(0);
  const [rep, setRep] = useState(0);
  const [phase, setPhase] = useState('ready');       // ready | active | rest | restEx
  const [logged, setLogged] = useState({});          // `${ex}-${set}` -> reps done

  const ex = exercises[exIdx];
  const sets = ex ? setsOf(ex) : [];
  const cur = sets[setIdx];
  const target = repTargetOf(cur);
  const rest = parseInt(cur?.rest_sec ?? ex?.rest_between_sets ?? 60, 10);
  const restEx = parseInt(ex?.rest_after_exercise ?? 90, 10);

  /* totals for the ring */
  const totalReps = exercises.reduce((s, e) => s + setsOf(e).reduce((x, d) => x + repTargetOf(d), 0), 0);
  const doneReps = Object.values(logged).reduce((s, v) => s + v, 0) + (phase === 'active' ? rep : 0);
  const pct = totalReps ? Math.min(100, (doneReps / totalReps) * 100) : 0;

  /* per-exercise completed set counts, for the header dots */
  const doneMap = {};
  Object.keys(logged).forEach(k => {
    const [e] = k.split('-').map(Number);
    doneMap[e] = (doneMap[e] || 0) + 1;
  });

  const nextSetLabel = (() => {
    if (!ex) return '';
    if (setIdx + 1 < sets.length) {
      const n = sets[setIdx + 1];
      return `Επόμενο σετ: ${ex.name} ${n.weight_kg || 0}kg / ${repTargetOf(n)} επαν.`;
    }
    const nx = exercises[exIdx + 1];
    if (!nx) return 'Τελευταίο σετ — τέλος προπόνησης';
    const ns = setsOf(nx)[0];
    return `Επόμενη άσκηση: ${nx.name} ${ns.weight_kg || 0}kg / ${repTargetOf(ns)} επαν.`;
  })();

  const commit = useCallback((count) => {
    setLogged(l => ({ ...l, [`${exIdx}-${setIdx}`]: count }));
  }, [exIdx, setIdx]);

  const addRep = useCallback(() => {
    if (phase === 'ready') { setPhase('active'); return; }
    if (phase !== 'active') return;
    const n = rep + 1;
    sRep(); setRep(n);
    if (n >= target) {
      commit(n); sSet();
      setPhase(setIdx + 1 >= sets.length ? 'restEx' : 'rest');
    }
  }, [phase, rep, target, setIdx, sets.length, commit]);

  const undoRep = useCallback(() => {
    if (phase === 'active' && rep > 0) { sUndo(); setRep(r => r - 1); }
  }, [phase, rep]);

  const endSet = useCallback(() => {
    if (phase !== 'active') return;
    sEnd(); commit(rep);
    setPhase(setIdx + 1 >= sets.length ? 'restEx' : 'rest');
  }, [phase, rep, setIdx, sets.length, commit]);

  const afterRest = () => { setSetIdx(i => i + 1); setRep(0); setPhase('active'); };
  const afterExRest = () => {
    if (exIdx + 1 >= exercises.length) { setScreen('finish'); return; }
    setExIdx(i => i + 1); setSetIdx(0); setRep(0); setPhase('ready');
  };

  /* clicker + keyboard */
  useEffect(() => {
    const h = (e) => {
      if (screen === 'welcome') {
        if ([' ', 'Enter', 'ArrowUp'].includes(e.key)) { e.preventDefault(); setScreen('run'); }
        return;
      }
      if (screen !== 'run') { if (e.key === 'Escape') nav(-1); return; }
      if (['ArrowUp', 'ArrowRight', ' '].includes(e.key)) { e.preventDefault(); addRep(); }
      if (['ArrowDown', 'ArrowLeft'].includes(e.key)) { e.preventDefault(); undoRep(); }
      if (['Enter', 'PageDown'].includes(e.key)) { e.preventDefault(); endSet(); }
      if (e.key === 'Escape') nav(-1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [screen, addRep, undoRep, endSet, nav]);

  if (!plan) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', gap:16,
      alignItems:'center', justifyContent:'center', position:'relative', zIndex:1 }}>
      <p style={{ color:'#fff' }}>Δεν επιλέχθηκε πλάνο.</p>
      <button onClick={() => nav(-1)} style={{ padding:'10px 24px', borderRadius:10, border:'none',
        background:ACCENT, color:'#04140a', cursor:'pointer', fontWeight:700 }}>Πίσω</button>
    </div>
  );

  const totals = {
    exercises: exercises.length,
    sets: Object.keys(logged).length,
    reps: Object.values(logged).reduce((s, v) => s + v, 0),
    volume: Object.entries(logged).reduce((s, [k, v]) => {
      const [e, i] = k.split('-').map(Number);
      const w = setsOf(exercises[e])[i]?.weight_kg || 0;
      return s + v * w;
    }, 0),
  };

  return (
    <div style={{ minHeight:'100vh', position:'relative', overflowX:'hidden' }}>
      <CubeBackground/>
      <div style={{ position:'fixed', inset:0, zIndex:0, background:'rgba(0,0,0,.62)', pointerEvents:'none' }}/>

      {screen === 'welcome' && (
        <Welcome plan={plan} clientName={clientName} onStart={() => setScreen('run')}/>
      )}

      {screen === 'finish' && (
        <Finish plan={plan} clientName={clientName} totals={totals} onClose={() => nav(-1)}/>
      )}

      {screen === 'run' && ex && (
        <div style={{ position:'relative', zIndex:1, minHeight:'100vh', display:'flex',
          flexDirection:'column', padding:'14px 16px 0' }}>

          {/* ── 1. every exercise with its set dots ── */}
          <ExerciseStrip exercises={exercises} current={exIdx} doneMap={doneMap}/>

          {/* ── 2. current exercise, highlighted ── */}
          <div style={{ margin:'16px 0 14px' }}>
            <span style={{ display:'inline-block', background:ACCENT, color:'#04140a',
              padding:'5px 14px 6px', borderRadius:8, fontFamily:'var(--cp-font)',
              fontSize:'clamp(24px,6.4vw,34px)', fontWeight:800, letterSpacing:'-.02em',
              lineHeight:1.15 }}>
              {exIdx + 1}/{exercises.length} : {ex.name}
            </span>
          </div>

          {/* ── 3. set dots with numbers underneath ── */}
          <div style={{ display:'flex', gap:'clamp(10px,3vw,18px)', marginBottom:16 }}>
            {sets.map((s, i) => {
              const isDone = logged[`${exIdx}-${i}`] !== undefined;
              const isNow = i === setIdx && phase !== 'restEx';
              return (
                <div key={i} style={{ textAlign:'center' }}>
                  <div style={{ width:'clamp(26px,7vw,38px)', height:'clamp(26px,7vw,38px)',
                    borderRadius:'50%',
                    background: isDone ? DONE : 'transparent',
                    border: isDone ? 'none' : `2px solid ${isNow ? '#fff' : 'rgba(255,255,255,.3)'}`,
                    transition:'background .25s' }}/>
                  <div style={{ fontSize:11, marginTop:4,
                    color: isNow ? '#fff' : 'rgba(255,255,255,.42)',
                    fontWeight: isNow ? 700 : 500 }}>{i + 1}</div>
                </div>
              );
            })}
          </div>

          {/* ── 4. what this set asks for ── */}
          <div style={{ fontSize:'clamp(18px,5vw,26px)', fontWeight:700, color:'#fff',
            fontFamily:'var(--cp-font)', letterSpacing:'-.01em', marginBottom:18 }}>
            Σετ {setIdx + 1}: {cur?.weight_kg || 0}kg / {target} επαν.
          </div>

          {/* ── 5. the rep grid ── */}
          <div style={{ marginBottom:20 }}>
            <RepGrid target={target} done={phase === 'active' ? rep : (logged[`${exIdx}-${setIdx}`] ?? 0)}/>
          </div>

          {/* ── 6. what's coming ── */}
          <div style={{ marginTop:'auto', paddingBottom:14 }}>
            {phase === 'ready' && (
              <p style={{ fontSize:14, color:'rgba(255,255,255,.62)', margin:'0 0 14px' }}>
                Έτοιμος για το σετ {setIdx + 1} · {nextSetLabel.replace(/^Επόμενο σετ: /, '')}
              </p>
            )}
            {phase === 'active' && (
              <p style={{ fontSize:14, color:'rgba(255,255,255,.62)', margin:'0 0 14px' }}>
                Μετά: {rest}s ξεκούραση · {nextSetLabel}
              </p>
            )}

            {/* ── 7. footer: ring + rest panel / actions ── */}
            <div style={{ display:'flex', alignItems:'center', gap:12,
              paddingBottom:'calc(16px + env(safe-area-inset-bottom))' }}>
              <ProgressRing pct={pct}/>

              {phase === 'rest' && (
                <RestPanel key={`r${exIdx}-${setIdx}`} seconds={rest}
                  onDone={afterRest} nextLabel={nextSetLabel}/>
              )}
              {phase === 'restEx' && (
                <RestPanel key={`re${exIdx}`} seconds={restEx}
                  onDone={afterExRest} nextLabel={nextSetLabel}/>
              )}

              {phase === 'ready' && (
                <button onClick={addRep} style={{ flex:1, padding:'16px 0', borderRadius:16,
                  border:'none', cursor:'pointer', background:ACCENT, color:'#04140a',
                  fontSize:15, fontWeight:800, fontFamily:'var(--cp-font)' }}>
                  ▶ ΕΝΑΡΞΗ ΣΕΤ {setIdx + 1}
                </button>
              )}

              {phase === 'active' && (
                <div style={{ flex:1, display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:10, letterSpacing:'.12em', textTransform:'uppercase',
                      color:'rgba(255,255,255,.42)' }}>Επανάληψη</div>
                    <div style={{ fontSize:26, fontWeight:900, color:'#fff', fontFamily:'var(--cp-font)',
                      lineHeight:1.05, fontVariantNumeric:'tabular-nums' }}>
                      {rep}<span style={{ fontSize:13, color:'rgba(255,255,255,.35)' }}>/{target}</span>
                    </div>
                  </div>
                  <button onClick={undoRep} aria-label="Undo"
                    style={{ width:46, height:46, borderRadius:13, cursor:'pointer',
                      border:'1px solid rgba(255,255,255,.18)', background:'rgba(255,255,255,.07)',
                      color:'#fff', fontSize:17 }}>◀</button>
                  <button onClick={endSet}
                    style={{ height:46, padding:'0 13px', borderRadius:13, cursor:'pointer',
                      border:'1px solid rgba(255,165,0,.42)', background:'rgba(255,140,0,.16)',
                      color:'#ffa040', fontSize:10.5, fontWeight:800, whiteSpace:'nowrap' }}>
                    ΤΕΛΟΣ ΣΕΤ
                  </button>
                  <button onClick={addRep} aria-label="Rep"
                    style={{ width:58, height:46, borderRadius:13, border:'none', cursor:'pointer',
                      background:ACCENT, color:'#04140a', fontSize:19, fontWeight:800,
                      boxShadow:'0 3px 18px rgba(34,197,94,.4)' }}>▲</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
