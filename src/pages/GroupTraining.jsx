import { useState, useEffect, useCallback, Fragment } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import { addGroupCredit } from '../lib/credits';
import CubeBackground from '../components/CubeBackground';

/* ── Παλμός palette (ίδιο με Live Training) ── */
const ACCENT = '#e0457b';
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
  const [timer, setTimer] = useState(0);             // ΚΟΙΝΟ χρονόμετρο προπόνησης (sec)
  const [pulse, setPulse] = useState(0);
  const [notes, setNotes] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const colorOf = (i) => members[i]?.theme_color || (i === 0 ? ACCENT : '#8b5cf6');
  const nameOf = (i) => plans[i]?.client_name || members[i]?.name || `Μέλος ${i + 1}`;

  /* κοινό χρονόμετρο: μετράει προς τα πάνω, μηδενίζεται με το κλικερ */
  useEffect(() => {
    if (screen !== 'run') return;
    const t = setInterval(() => setTimer(v => v + 1), 1000);
    return () => clearInterval(t);
  }, [screen]);

  const resetTimer = useCallback(() => {
    setTimer(0);
    setPulse(p => p + 1);
  }, []);

  /* κλικερ: οποιοδήποτε κλικ / βέλη / space → μηδενισμός του κοινού χρονομέτρου */
  const onMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('textarea')) return;
    if (e.button === 2) e.preventDefault();
    resetTimer();
  };
  useEffect(() => {
    if (screen !== 'run') return;
    const onKey = (e) => {
      if (e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); resetTimer(); }
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
    /* −1 κοινό token του group ανά session (Logistics) */
    const gid = members.find(m => m?.group_id)?.group_id;
    if (gid) { try { await addGroupCredit(gid, -1, 'session', plans[0]?.id || null, groupName); } catch (e) {} }
    setSavedMsg('Οι σημειώσεις αποθηκεύτηκαν — ο εγκέφαλος θα τις λάβει υπόψη στις επόμενες προπονήσεις/διατροφές.');
    setTimeout(() => navigate('/TrainingPlans'), 1400);
  };

  const S = {
    page:{ minHeight:'var(--lt-vh, 100vh)', position:'relative', overflowX:'hidden', color:'#f3ecff', fontFamily:'var(--cp-font, "Space Grotesk", sans-serif)' },
    center:{ minHeight:'var(--lt-vh, 100vh)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 20px', position:'relative', zIndex:1, textAlign:'center' },
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

  /* ── column με τη λεπτομερή προπόνηση ενός μέλους (απλή λίστα) ── */
  const Column = ({ i }) => {
    const p = plans[i];
    const col = colorOf(i);
    const exs = p.exercises || [];
    return (
      <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, justifyContent:'center', padding:'12px 10px 8px' }}>
          <span style={{ width:26, height:26, borderRadius:'50%', background:col, display:'grid', placeItems:'center', color:'#fff', fontWeight:800, fontSize:12, flexShrink:0 }}>{nameOf(i).charAt(0)}</span>
          <span style={{ fontSize:'clamp(15px,2vh,24px)', fontWeight:800, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{nameOf(i)}</span>
        </div>

        {/* λεπτομερής προπόνηση */}
        <div style={{ padding:'2px 10px 20px' }}>
          {p.title && <p style={{ fontSize:11, letterSpacing:'.1em', textTransform:'uppercase', color:col, fontWeight:800, margin:'2px 0 10px', textAlign:'center' }}>{p.title}</p>}
          {exs.map((ex, k) => (
            <div key={k} style={{ background:'rgba(0,0,0,.5)', border:'1px solid rgba(255,255,255,.09)', borderRadius:14, padding:'11px 13px', marginBottom:9 }}>
              <p style={{ margin:'0 0 8px', fontSize:'clamp(13px,1.8vh,20px)', fontWeight:800, color:'#fff' }}>{k + 1}. {ex.name}</p>
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

  const Stat = ({ label, value }) => (
    <div>
      <span style={{ display:'block', fontSize:'clamp(8px,1vh,12px)', letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.4)', fontWeight:700 }}>{label}</span>
      <span style={{ fontSize:'clamp(13px,1.7vh,19px)', fontWeight:800, color: value === '—' ? 'rgba(255,255,255,.4)' : '#fff' }}>{value}</span>
    </div>
  );

  /* ψηφιακό ρολόι — ζωντανεύει από το tick του κοινού χρονομέτρου */
  const wall = (() => { const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`; })();

  return (
    <>
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
          <p style={{ fontSize:12.5, color:'rgba(255,255,255,.42)', maxWidth:400, margin:'6px 0 26px' }}>Προπονείστε ταυτόχρονα — ένας προπονητής, όλα τα προγράμματα μπροστά σου. Κρατάς το κοινό χρονόμετρο με το κλικερ.</p>
          <button onClick={()=>setScreen('preview')} style={S.cta()}>Προβολή προπόνησης</button>
        </div>
      )}

      {/* ── PREVIEW (μόνο ονόματα ασκήσεων) ── */}
      {screen === 'preview' && (
        <div style={{ position:'relative', zIndex:1, maxWidth:960, margin:'0 auto', padding:'34px 18px 44px' }}>
          <p style={{ ...S.kicker, textAlign:'center' }}>Σύνοψη · {groupName}</p>
          <h1 style={{ fontSize:24, fontWeight:800, color:'#fff', textAlign:'center', margin:'8px 0 22px', fontFamily:'var(--cp-font)' }}>Η σημερινή προπόνηση</h1>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:12 }}>
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
            <button onClick={()=>{ setTimer(0); setScreen('run'); }} style={S.cta()}>▶ Έναρξη</button>
          </div>
        </div>
      )}

      {/* ── RUN — προπονήσεις σε λίστες δίπλα-δίπλα + ΚΟΙΝΟ χρονόμετρο + ρολόι ── */}
      {screen === 'run' && (
        <div style={{ position:'relative', zIndex:1, minHeight:'var(--lt-vh, 100vh)', display:'flex', flexDirection:'column', userSelect:'none' }}>

          {/* sticky title bar: group | ΚΟΙΝΟ χρονόμετρο | ψηφιακό ρολόι */}
          <div style={{ position:'sticky', top:0, zIndex:3, display:'flex', alignItems:'center', gap:14,
            padding:'calc(10px + env(safe-area-inset-top)) 16px 10px',
            background:'linear-gradient(180deg, rgba(11,7,20,.97), rgba(11,7,20,.78))', backdropFilter:'blur(6px)' }}>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ margin:0, fontSize:'clamp(9px,1.1vh,14px)', letterSpacing:'.26em', fontWeight:800, color:ACCENT }}>THE CUBE · GROUP</p>
              <p style={{ margin:'1px 0 0', fontSize:'clamp(13px,1.9vh,26px)', fontWeight:800, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{groupName}</p>
            </div>
            <div key={pulse} style={{ textAlign:'center', animation:'gtPulse .5s ease' }}>
              <div style={{ fontSize:'clamp(36px,7vh,92px)', fontWeight:800, lineHeight:1, fontVariantNumeric:'tabular-nums',
                color: timer >= 45 ? ACCENT : '#fff', textShadow:`0 0 26px ${ACCENT}77`, transition:'color .3s' }}>{fmt(timer)}</div>
              <div style={{ fontSize:'clamp(8px,1vh,12px)', letterSpacing:'.2em', textTransform:'uppercase', color:'rgba(255,255,255,.4)', fontWeight:700, marginTop:2 }}>κοινό χρονόμετρο · κλικ / βέλη / space = μηδενισμός</div>
            </div>
            <div style={{ flex:1, display:'flex', justifyContent:'flex-end' }}>
              <span style={{ fontFamily:'ui-monospace,monospace', fontSize:'clamp(12px,1.9vh,26px)', fontWeight:700, fontVariantNumeric:'tabular-nums', letterSpacing:'.05em',
                background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.18)', color:'#fff', borderRadius:10, padding:'.32em .85em' }}>{wall}</span>
            </div>
          </div>

          {/* λίστες προπονήσεων δίπλα-δίπλα */}
          <div style={{ display:'flex', flex:1, alignItems:'stretch', minHeight:0 }}>
            {plans.map((p, i) => (
              <Fragment key={i}>
                {i > 0 && <div style={{ width:1, background:'linear-gradient(180deg, transparent, rgba(224,69,123,.5), rgba(139,92,246,.5), transparent)', flexShrink:0 }}/>}
                <Column i={i}/>
              </Fragment>
            ))}
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
      `}</style>
    </div>
    </>
  );
}
