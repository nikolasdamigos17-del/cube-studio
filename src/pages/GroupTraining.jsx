import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import CubeBackground from '../components/CubeBackground';

/* ── Παλμός palette (ίδιο με Live Training) ── */
const ACCENT = '#e0457b';
const ACCENT2 = '#8b5cf6';
const PULSE_BG = 'radial-gradient(130% 90% at 50% 118%, #2a1140 0%, #140a24 46%, #0b0714 100%)';

const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const setsOf = (ex) => ex.set_details?.length || ex.sets || 3;
const repsOf = (ex) => String(ex.reps ?? '10');
const restSet = (ex) => ex.rest_between_sets || 60;
const restEx = (ex) => ex.rest_after_exercise || 90;
const fmt = (s) => `${Math.floor(s/60)}:${String(Math.max(0,s)%60).padStart(2,'0')}`;

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
    if (e.button === 0) { resetTimer('left'); }
    else if (e.button === 2) { e.preventDefault(); resetTimer('right'); }
  };
  useEffect(() => {
    if (screen !== 'run') return;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); resetTimer('left'); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); resetTimer('right'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, resetTimer]);

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
    page:{ minHeight:'100vh', position:'relative', overflowX:'hidden', color:'#f3ecff', fontFamily:'var(--cp-font, "Space Grotesk", sans-serif)' },
    center:{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 20px', position:'relative', zIndex:1, textAlign:'center' },
    kicker:{ fontSize:10.5, letterSpacing:'.3em', textTransform:'uppercase', color:'rgba(224,69,123,.9)', fontWeight:700, margin:0 },
    cta:(bg)=>({ border:'none', borderRadius:15, padding:'15px 30px', fontSize:15, fontWeight:800, cursor:'pointer', color:'#fff', fontFamily:'inherit',
      background: bg || 'linear-gradient(180deg,#e0457b,#b52f78)', boxShadow:'0 6px 26px rgba(224,69,123,.4)' }),
    ghost:{ border:'1px solid rgba(255,255,255,.2)', borderRadius:14, padding:'12px 20px', fontSize:13.5, fontWeight:700, cursor:'pointer', background:'rgba(255,255,255,.05)', color:'#e6dcff', fontFamily:'inherit' },
  };

  if (!plans.length) {
    return (
      <div style={{ ...S.page, background:PULSE_BG }}>
        <div style={S.center}>
          <p style={{ fontSize:16, marginBottom:16 }}>Δεν βρέθηκε ομαδική προπόνηση.</p>
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
    <div style={{ ...S.page, background:PULSE_BG }}
      onMouseDown={screen === 'run' ? onMouseDown : undefined}
      onContextMenu={screen === 'run' ? (e)=>e.preventDefault() : undefined}>
      <CubeBackground/>
      <div style={{ position:'fixed', inset:0, zIndex:0, background:'rgba(6,4,14,.55)', pointerEvents:'none' }}/>

      {/* ── ΧΑΙΡΕΤΙΣΜΟΣ ── */}
      {screen === 'greet' && (
        <div style={S.center}>
          <p style={S.kicker}>The Cube · Ομαδική προπόνηση</p>
          <div style={{ fontSize:54, margin:'14px 0 6px' }}>👥</div>
          <h1 style={{ fontSize:34, fontWeight:800, color:'#fff', margin:'0 0 8px', fontFamily:'var(--cp-font)' }}>{groupName}</h1>
          <p style={{ fontSize:14.5, color:'rgba(240,224,236,.7)', margin:'0 0 4px' }}>
            {plans.map((p,i)=>nameOf(i)).join('  ·  ')}
          </p>
          <p style={{ fontSize:12.5, color:'rgba(255,255,255,.42)', maxWidth:400, margin:'6px 0 26px' }}>Προπονείστε ταυτόχρονα — ένας προπονητής, δύο προγράμματα. Χωρίς live tracking· κρατάς τα δύο χρονόμετρα με το κλικερ.</p>
          <button onClick={()=>setScreen('preview')} style={S.cta()}>Προβολή προπόνησης</button>
        </div>
      )}

      {/* ── PREVIEW (μόνο ονόματα ασκήσεων) ── */}
      {screen === 'preview' && (
        <div style={{ position:'relative', zIndex:1, maxWidth:820, margin:'0 auto', padding:'34px 18px 44px' }}>
          <p style={{ ...S.kicker, textAlign:'center' }}>Σύνοψη · {groupName}</p>
          <h1 style={{ fontSize:24, fontWeight:800, color:'#fff', textAlign:'center', margin:'8px 0 22px', fontFamily:'var(--cp-font)' }}>Η σημερινή προπόνηση</h1>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {plans.map((p, i) => (
              <div key={i} style={{ background:'rgba(0,0,0,.5)', border:'1px solid rgba(255,255,255,.1)', borderRadius:16, padding:'16px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                  <span style={{ width:24, height:24, borderRadius:'50%', background:colorOf(i), display:'grid', placeItems:'center', color:'#fff', fontWeight:800, fontSize:11 }}>{nameOf(i).charAt(0)}</span>
                  <span style={{ fontSize:15, fontWeight:800, color:'#fff' }}>{nameOf(i)}</span>
                </div>
                {(p.exercises || []).map((ex, k) => (
                  <div key={k} style={{ display:'flex', gap:8, padding:'6px 0', borderTop: k ? '1px solid rgba(255,255,255,.06)' : 'none' }}>
                    <span style={{ color:colorOf(i), fontWeight:800, fontSize:13, minWidth:16 }}>{k + 1}</span>
                    <span style={{ fontSize:13.5, color:'#eee', fontWeight:600 }}>{ex.name}</span>
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

      {/* ── RUN (δύο προπονήσεις δίπλα-δίπλα + χρονόμετρα) ── */}
      {screen === 'run' && (
        <div style={{ position:'relative', zIndex:1, minHeight:'100vh', display:'flex', flexDirection:'column', userSelect:'none' }}>
          <div style={{ display:'flex', flex:1, alignItems:'stretch' }}>
            <Column i={0}/>
            <div style={{ width:1, background:'linear-gradient(180deg, transparent, rgba(224,69,123,.5), rgba(139,92,246,.5), transparent)', flexShrink:0 }}/>
            {plans[1] ? <Column i={1}/> : <div style={{ flex:1, display:'grid', placeItems:'center', color:'rgba(255,255,255,.4)', fontSize:13 }}>Μόνο ένα μέλος</div>}
          </div>
          <div style={{ position:'sticky', bottom:0, padding:'12px 16px calc(14px + env(safe-area-inset-bottom))', background:'linear-gradient(0deg, rgba(11,7,20,.96), rgba(11,7,20,.4))', display:'flex', justifyContent:'center', gap:10 }}>
            <button onClick={()=>setScreen('finish')} style={S.cta()}>Ολοκλήρωση προπόνησης</button>
          </div>
        </div>
      )}

      {/* ── FINISH (σημειώσεις ανά πελάτη → feedback εγκεφάλου) ── */}
      {screen === 'finish' && (
        savedMsg ? (
          <div style={S.center}>
            <span style={{ width:52, height:52, borderRadius:'50%', background:'#22c55e', display:'grid', placeItems:'center', marginBottom:14, fontSize:26 }}>✓</span>
            <p style={{ fontSize:16, fontWeight:800, color:'#fff', maxWidth:420 }}>{savedMsg}</p>
          </div>
        ) : (
          <div style={{ position:'relative', zIndex:1, maxWidth:640, margin:'0 auto', padding:'34px 18px 44px' }}>
            <p style={{ ...S.kicker, textAlign:'center' }}>Ολοκλήρωση · {groupName}</p>
            <h1 style={{ fontSize:23, fontWeight:800, color:'#fff', textAlign:'center', margin:'8px 0 6px', fontFamily:'var(--cp-font)' }}>Σημειώσεις ανά πελάτη</h1>
            <p style={{ fontSize:12.5, color:'rgba(255,255,255,.5)', textAlign:'center', margin:'0 0 22px', maxWidth:440, marginInline:'auto' }}>π.χ. «απέτυχε στις τελευταίες επαναλήψεις», «αύξηση κιλών την επόμενη φορά». Ο εγκέφαλος θα τις λάβει υπόψη στις μελλοντικές προπονήσεις και διατροφές.</p>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {plans.map((p, i) => (
                <div key={i} style={{ background:'rgba(0,0,0,.5)', border:'1px solid rgba(255,255,255,.1)', borderRadius:16, padding:'14px 15px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:10 }}>
                    <span style={{ width:26, height:26, borderRadius:'50%', background:colorOf(i), display:'grid', placeItems:'center', color:'#fff', fontWeight:800, fontSize:12 }}>{nameOf(i).charAt(0)}</span>
                    <span style={{ fontSize:15, fontWeight:800, color:'#fff' }}>{nameOf(i)}</span>
                    {p.title && <span style={{ fontSize:11, color:colorOf(i), fontWeight:700 }}>· {p.title}</span>}
                  </div>
                  <textarea value={notes[p.id] || ''} onChange={e=>setNotes(n=>({ ...n, [p.id]: e.target.value }))}
                    placeholder="Παρατηρήσεις προπόνησης…"
                    style={{ width:'100%', minHeight:74, resize:'vertical', background:'rgba(0,0,0,.45)', border:'1px solid rgba(255,255,255,.15)', borderRadius:11, color:'#fff', padding:'10px 12px', fontSize:13.5, fontFamily:'inherit', outline:'none' }}/>
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
  );
}
