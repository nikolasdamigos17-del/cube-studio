import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import { addCredit, getBalance, addGroupCredit, getGroupTrainingBalance } from '../lib/credits';

/* ══ PERSONAL LIVE — ίδιο στήσιμο με το Group Live ═══════════════════════════
   Χωρίς βίντεο/gifs: η προπόνηση σαν απλή λίστα ασκήσεων, ένα χρονόμετρο που
   μηδενίζει με το κλίκερ, ψηφιακό ρολόι στην κορυφή. Στο τέλος: σημειώσεις
   προπονητή (+ προαιρετική διόρθωση αποτελεσμάτων) και ερώτηση χρέωσης token. */

const ACCENT = '#e0457b';
const PULSE_BG = 'radial-gradient(130% 90% at 50% 118%, #2a1140 0%, #140a24 46%, #0b0714 100%)';

const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
/* κεφαλαία χωρίς τόνους (ΑΣΚΗΣΗ, όχι ΆΣΚΗΣΗ) */
const upEl = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;
const setRows = (ex) => ex.set_details?.length
  ? ex.set_details.map(d => ({ reps: d?.reps ?? ex.reps ?? '10', weight_kg: d?.weight_kg ?? ex.weight_kg ?? 0, rest_sec: d?.rest_sec ?? ex.rest_between_sets ?? 60 }))
  : Array.from({ length: Math.max(1, parseInt(ex.sets) || 3) }, () => ({ reps: ex.reps ?? '10', weight_kg: ex.weight_kg ?? 0, rest_sec: ex.rest_between_sets ?? 60 }));
const repTarget = (r) => { const m = String(r ?? '10').match(/\d+/g); return m ? parseInt(m[m.length - 1], 10) : 0; };
/* τα σετ διαφέρουν μεταξύ τους; (τότε δείχνουμε και τη γραμμή ανά σετ) */
const setsVary = (ex) => { const r = setRows(ex); return r.some(x => String(x.reps) !== String(r[0].reps) || num(x.weight_kg) !== num(r[0].weight_kg)); };

export default function LiveTraining() {
  const nav = useNavigate();
  const { state } = useLocation();
  const plan = state?.plan;
  const exercises = plan?.exercises || [];

  const [screen, setScreen] = useState('greet');     // greet | run | finish
  const [timer, setTimer] = useState(0);             // χρονόμετρο (sec) — μηδενίζει με το κλίκερ
  const [pulse, setPulse] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [client, setClient] = useState(null);
  const [note, setNote] = useState('');
  const [fixOpen, setFixOpen] = useState(false);     // προαιρετική διόρθωση αποτελεσμάτων
  const [draft, setDraft] = useState(null);          // [{ name, rows:[{reps_done,target,weight_kg}] }]
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [charge, setCharge] = useState(null);        // { group, id, name, left, busy }
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 900 : false);

  const clientName = state?.clientName || plan?.client_name || client?.name || '';
  const col = client?.theme_color || ACCENT;

  useEffect(() => { const h = () => setNarrow(window.innerWidth < 900); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);
  useEffect(() => { if (plan?.client_id) db.Client.get(plan.client_id).then(setClient).catch(() => {}); }, [plan?.client_id]);

  /* χρονόμετρο: μετράει προς τα πάνω όσο τρέχει η προπόνηση */
  useEffect(() => {
    if (screen !== 'run') return;
    const t = setInterval(() => setTimer(v => v + 1), 1000);
    return () => clearInterval(t);
  }, [screen]);

  const resetTimer = useCallback(() => { setTimer(0); setPulse(p => p + 1); }, []);
  const start = useCallback(() => { setTimer(0); setStartedAt(s => s || Date.now()); setScreen('run'); }, []);

  /* κλίκερ: οποιοδήποτε κλικ ή πλήκτρο του → μηδενισμός χρονομέτρου */
  const onMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('textarea') || e.target.closest('input')) return;
    if (e.button === 2) e.preventDefault();
    resetTimer();
  };
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')) return;
      if (screen === 'greet') {
        if ([' ', 'Enter', 'ArrowUp', 'ArrowRight', 'PageDown'].includes(e.key)) { e.preventDefault(); start(); }
        else if (e.key === 'Escape') nav(-1);
        return;
      }
      if (screen === 'run') {
        if ([' ', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown'].includes(e.key)) { e.preventDefault(); resetTimer(); }
        else if (e.key === 'Escape') nav(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, resetTimer, start, nav]);

  /* ── ολοκλήρωση ── */
  const buildDraft = () => exercises.map(ex => ({
    name: ex.name,
    rows: setRows(ex).map(r => ({ reps_done: repTarget(r.reps) || '', target: repTarget(r.reps), weight_kg: num(r.weight_kg) })),
  }));
  const openFix = () => { if (!draft) setDraft(buildDraft()); setFixOpen(v => !v); };
  const editDraft = (i, si, field, val) => setDraft(p => p.map((exd, j) => j !== i ? exd : {
    ...exd, rows: exd.rows.map((r, k) => k !== si ? r : { ...r, [field]: val }),
  }));

  const leave = (msg) => { setSavedMsg(msg); setTimeout(() => nav(-1), 1600); };

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    const stamp = new Date().toISOString();
    const fb = note.trim();
    const patch = { completed: true, completed_date: stamp, trainer_feedback: fb };
    /* αποτελέσματα αποθηκεύονται μόνο αν ο προπονητής τα άνοιξε και τα έλεγξε */
    if (draft) {
      patch.session_results = draft.map(exd => ({
        name: exd.name,
        sets_planned: exd.rows.length,
        sets_done: exd.rows.filter(r => (parseInt(r.reps_done) || 0) > 0).length,
        sets: exd.rows.map((r, si) => { const rd = parseInt(r.reps_done) || 0; return {
          set: si + 1, reps_done: rd, target_reps: r.target || 0, weight_kg: num(r.weight_kg),
          completed: rd > 0, hit_target: r.target ? rd >= r.target : rd > 0 }; }),
      }));
    }
    try {
      if (plan?.id) await db.TrainingPlan.update(plan.id, patch);
      if (fb && plan?.client_id) await db.ClientNote.create({ client_id: plan.client_id, type: 'training_feedback', content: fb, date: stamp.split('T')[0], source: 'live_training' });
    } catch (e) {}
    /* Χρέωση session: ρωτάμε ΠΡΙΝ αφαιρεθεί το token */
    try {
      if (plan?.client_id) {
        const c = client || await db.Client.get(plan.client_id);
        if (c?.group_id) {
          const g = await db.Group.get(c.group_id);
          const left = g ? await getGroupTrainingBalance(g) : 0;
          setSaving(false); setCharge({ group: true, id: c.group_id, name: g?.name || '', left, busy: false });
          return;
        }
        const b = await getBalance(plan.client_id);
        setSaving(false); setCharge({ group: false, id: plan.client_id, name: c?.name || clientName, left: b.training, busy: false });
        return;
      }
    } catch (e) {}
    setSaving(false);
    leave('Η προπόνηση αποθηκεύτηκε στην καρτέλα του πελάτη.');
  };

  const answerCharge = async (yes) => {
    if (!charge || charge.busy) return;
    const who = charge.group ? ' group' : '';
    if (!yes) { const left = charge.left; setCharge(null); leave(`Αποθηκεύτηκε — χωρίς χρέωση token. Υπόλοιπο${who}: ${left}.`); return; }
    setCharge(c => ({ ...c, busy: true }));
    let left = charge.left - 1;
    try {
      if (charge.group) {
        await addGroupCredit(charge.id, -1, 'session', plan?.id || null, plan?.title || '');
        const g = await db.Group.get(charge.id);
        if (g) left = await getGroupTrainingBalance(g);
      } else {
        await addCredit(charge.id, 'training', -1, 'session', plan?.id || null, plan?.title || '');
        left = (await getBalance(charge.id)).training;
      }
    } catch (e) {
      setCharge(c => ({ ...c, busy: false }));
      alert('Η χρέωση δεν ολοκληρώθηκε: ' + String(e?.message || e));
      return;
    }
    setCharge(null);
    leave(`Αποθηκεύτηκε ✓ — Αφαιρέθηκε 1 token · Νέο υπόλοιπο${who}: ${left}.`);
  };

  const S = {
    page:{ minHeight:'var(--lt-vh, 100vh)', position:'relative', overflowX:'hidden', color:'#f3ecff', fontFamily:'var(--cp-font, "Space Grotesk", sans-serif)', background:PULSE_BG },
    center:{ minHeight:'var(--lt-vh, 100vh)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 20px', position:'relative', zIndex:1, textAlign:'center' },
    kicker:{ fontSize:10.5, letterSpacing:'.3em', color:'rgba(224,69,123,.9)', fontWeight:700, margin:0 },
    cta:{ border:'none', borderRadius:15, padding:'15px 30px', fontSize:15, fontWeight:800, cursor:'pointer', color:'#fff', fontFamily:'inherit',
      background:'linear-gradient(180deg,#e0457b,#b52f78)', boxShadow:'0 6px 26px rgba(224,69,123,.4)' },
    ghost:{ border:'1px solid rgba(255,255,255,.2)', borderRadius:14, padding:'12px 20px', fontSize:13.5, fontWeight:700, cursor:'pointer', background:'rgba(255,255,255,.05)', color:'#e6dcff', fontFamily:'inherit' },
    inp:{ width:'100%', background:'rgba(0,0,0,.45)', border:'1px solid rgba(255,255,255,.18)', borderRadius:9, color:'#fff', padding:'7px 6px', fontSize:14, fontWeight:700, textAlign:'center', fontFamily:'inherit', outline:'none' },
  };

  if (!plan) {
    return (
      <div style={S.page}>
        <div style={S.center}>
          <p style={{ fontSize:16, marginBottom:16 }}>Δεν επιλέχθηκε προπόνηση.</p>
          <button onClick={() => nav(-1)} style={S.cta}>Πίσω</button>
        </div>
      </div>
    );
  }

  const totalSets = exercises.reduce((s2, e) => s2 + setRows(e).length, 0);
  const Stat = ({ label, value }) => (
    <div style={{ minWidth:0 }}>
      <span style={{ display:'block', fontSize:'clamp(8px,1.05vh,13px)', letterSpacing:'.1em', color:'rgba(255,255,255,.4)', fontWeight:700, whiteSpace:'nowrap' }}>{label}</span>
      <span style={{ fontSize:'clamp(14px,2.1vh,27px)', fontWeight:800, color: value === '—' ? 'rgba(255,255,255,.4)' : '#fff', whiteSpace:'nowrap', fontVariantNumeric:'tabular-nums' }}>{value}</span>
    </div>
  );

  /* ψηφιακό ρολόι — ζωντανεύει από το tick του χρονομέτρου */
  const now = new Date();
  const wall = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const elapsedMin = startedAt ? Math.floor((now.getTime() - startedAt) / 60000) : 0;

  return (
    <div style={S.page}
      onMouseDown={screen === 'run' ? onMouseDown : undefined}
      onContextMenu={screen === 'run' ? (e) => e.preventDefault() : undefined}>

      {/* ── ΧΑΙΡΕΤΙΣΜΟΣ ── */}
      {screen === 'greet' && (
        <div style={S.center}>
          <p style={S.kicker}>THE CUBE · ΑΤΟΜΙΚΗ ΠΡΟΠΟΝΗΣΗ</p>
          <div style={{ fontSize:54, margin:'14px 0 6px' }}>🏋️</div>
          <h1 style={{ fontSize:34, fontWeight:800, color:'#fff', margin:'0 0 8px', fontFamily:'var(--cp-font)' }}>{clientName || 'Προπόνηση'}</h1>
          {plan.title && <p style={{ fontSize:14.5, color:'rgba(240,224,236,.7)', margin:'0 0 4px' }}>{plan.title}</p>}
          <p style={{ fontSize:12.5, color:'rgba(255,255,255,.42)', margin:'6px 0 18px' }}>{exercises.length} ασκήσεις · {totalSets} σετ</p>
          <div style={{ width:'100%', maxWidth:440, background:'rgba(0,0,0,.5)', border:'1px solid rgba(255,255,255,.1)', borderRadius:16, padding:'6px 16px', marginBottom:24, textAlign:'left' }}>
            {exercises.map((ex, k) => (
              <div key={k} style={{ display:'flex', gap:10, padding:'8px 0', borderTop: k ? '1px solid rgba(255,255,255,.06)' : 'none' }}>
                <span style={{ color:col, fontWeight:800, fontSize:13, minWidth:18 }}>{k + 1}</span>
                <span style={{ fontSize:13.5, color:'#eee', fontWeight:600, flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ex.name}</span>
                <span style={{ fontSize:12, color:'rgba(255,255,255,.45)', fontWeight:700, whiteSpace:'nowrap' }}>{setRows(ex).length} × {String(ex.reps ?? '10')}</span>
              </div>
            ))}
            {exercises.length === 0 && <p style={{ color:'rgba(255,255,255,.5)', fontSize:13, margin:'10px 0' }}>Χωρίς ασκήσεις.</p>}
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => nav(-1)} style={S.ghost}>Πίσω</button>
            <button onClick={start} style={S.cta}>▶ Έναρξη</button>
          </div>
          <p style={{ fontSize:11.5, color:'rgba(255,255,255,.35)', marginTop:14 }}>ή πάτα το κουμπί του κλίκερ</p>
        </div>
      )}

      {/* ── RUN — η προπόνηση σε απλή λίστα + χρονόμετρο + ρολόι ── */}
      {screen === 'run' && (
        <div style={{ position:'relative', zIndex:1, minHeight:'var(--lt-vh, 100vh)', display:'flex', flexDirection:'column', userSelect:'none' }}>

          {/* sticky title bar: πελάτης | χρονόμετρο | ψηφιακό ρολόι */}
          <div style={{ position:'sticky', top:0, zIndex:3, display:'flex', alignItems:'center', gap: narrow ? '6px 12px' : 14, flexWrap: narrow ? 'wrap' : 'nowrap',
            padding:'calc(10px + env(safe-area-inset-top)) 16px 10px',
            background:'linear-gradient(180deg, rgba(11,7,20,.97), rgba(11,7,20,.78))', backdropFilter:'blur(6px)' }}>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ margin:0, fontSize:'clamp(9px,1.1vh,14px)', letterSpacing:'.26em', fontWeight:800, color:ACCENT, whiteSpace:'nowrap' }}>THE CUBE · PERSONAL</p>
              <p style={{ margin:'1px 0 0', fontSize:'clamp(13px,1.9vh,26px)', fontWeight:800, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{clientName || 'Προπόνηση'}</p>
            </div>
            <div key={pulse} style={{ textAlign:'center', animation:'ltPulse .5s ease', ...(narrow ? { order:3, flexBasis:'100%' } : {}) }}>
              <div style={{ fontSize:'clamp(36px,7vh,92px)', fontWeight:800, lineHeight:1, fontVariantNumeric:'tabular-nums',
                color: timer >= 45 ? ACCENT : '#fff', textShadow:`0 0 26px ${ACCENT}77`, transition:'color .3s' }}>{fmt(timer)}</div>
              <div style={{ fontSize:'clamp(8px,1vh,12px)', letterSpacing:'.2em', color:'rgba(255,255,255,.4)', fontWeight:700, marginTop:2 }}>
                {narrow ? 'ΧΡΟΝΟΜΕΤΡΟ · ΚΛΙΚ = ΜΗΔΕΝΙΣΜΟΣ' : 'ΧΡΟΝΟΜΕΤΡΟ · ΚΛΙΚ / ΒΕΛΗ / SPACE = ΜΗΔΕΝΙΣΜΟΣ'}
              </div>
            </div>
            <div style={{ flex: narrow ? '0 0 auto' : 1, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3 }}>
              <span style={{ fontFamily:'ui-monospace,monospace', fontSize:'clamp(12px,1.9vh,26px)', fontWeight:700, fontVariantNumeric:'tabular-nums', letterSpacing:'.05em',
                background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.18)', color:'#fff', borderRadius:10, padding:'.32em .85em' }}>{wall}</span>
              <span style={{ fontSize:'clamp(8px,1vh,12px)', letterSpacing:'.14em', color:'rgba(255,255,255,.4)', fontWeight:700, whiteSpace:'nowrap' }}>ΔΙΑΡΚΕΙΑ {elapsedMin}′</span>
            </div>
          </div>

          {/* η λίστα των ασκήσεων */}
          <div style={{ flex:1, width:'100%', maxWidth:1320, margin:'0 auto', padding:'6px 14px 20px' }}>
            {plan.title && <p style={{ fontSize:'clamp(10.5px,1.3vh,15px)', letterSpacing:'.1em', color:col, fontWeight:800, margin:'6px 0 12px', textAlign:'center' }}>{upEl(plan.title)}</p>}
            {exercises.map((ex, k) => {
              const rows = setRows(ex);
              return (
                <div key={k} style={{ background:'rgba(0,0,0,.5)', border:'1px solid rgba(255,255,255,.09)', borderRadius:14,
                  padding: narrow ? '11px 13px' : 'clamp(10px,1.5vh,20px) clamp(14px,1.6vw,26px)', marginBottom:9,
                  display: narrow ? 'block' : 'flex', alignItems:'center', gap:18 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, flex:'1 1 0', minWidth:0, marginBottom: narrow ? 8 : 0 }}>
                    <span style={{ width:'clamp(26px,3.4vh,44px)', height:'clamp(26px,3.4vh,44px)', borderRadius:'50%', background:col, display:'grid', placeItems:'center',
                      color:'#fff', fontWeight:800, fontSize:'clamp(12px,1.6vh,20px)', flexShrink:0 }}>{k + 1}</span>
                    <div style={{ minWidth:0 }}>
                      <p style={{ margin:0, fontSize:'clamp(14.5px,2.4vh,31px)', fontWeight:800, color:'#fff', lineHeight:1.15, overflow:'hidden', textOverflow:'ellipsis', whiteSpace: narrow ? 'normal' : 'nowrap' }}>{ex.name}</p>
                      {setsVary(ex) && (
                        <p style={{ margin:'4px 0 0', fontSize:'clamp(10.5px,1.35vh,16px)', color:'rgba(255,255,255,.55)', fontWeight:600, fontVariantNumeric:'tabular-nums' }}>
                          {rows.map((r, si) => `${si + 1}: ${num(r.weight_kg) > 0 ? num(r.weight_kg) + 'kg' : 'BW'}×${r.reps}`).join('  ·  ')}
                        </p>
                      )}
                      {ex.notes ? <p style={{ margin:'4px 0 0', fontSize:'clamp(10.5px,1.35vh,16px)', color:'rgba(255,255,255,.5)', fontStyle:'italic', overflow:'hidden', textOverflow:'ellipsis', whiteSpace: narrow ? 'normal' : 'nowrap' }}>{ex.notes}</p> : null}
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns: narrow ? '1fr 1fr' : 'clamp(70px,6.5vw,130px) clamp(98px,8.6vw,172px) clamp(104px,9vw,180px) clamp(126px,10.6vw,206px)', gap: narrow ? '6px 12px' : '0 clamp(12px,1.4vw,28px)', flexShrink:0 }}>
                    <Stat label="ΚΙΛΑ" value={num(ex.weight_kg) > 0 ? `${ex.weight_kg} kg` : '—'}/>
                    <Stat label="ΣΕΤ × ΕΠΑΝ." value={`${rows.length} × ${String(ex.reps ?? '10')}`}/>
                    <Stat label="ΔΙΑΛ. ΜΕΤΑ ΣΕΤ" value={`${ex.rest_between_sets || 60}s`}/>
                    <Stat label="ΔΙΑΛ. ΜΕΤΑ ΑΣΚΗΣΗ" value={`${ex.rest_after_exercise || 90}s`}/>
                  </div>
                </div>
              );
            })}
            {exercises.length === 0 && <p style={{ color:'rgba(255,255,255,.5)', textAlign:'center', fontSize:13 }}>Χωρίς ασκήσεις.</p>}
            {plan.notes ? <p style={{ fontSize:'clamp(11.5px,1.5vh,17px)', color:'rgba(255,255,255,.55)', textAlign:'center', margin:'12px auto 0', maxWidth:760, lineHeight:1.5 }}>📝 {plan.notes}</p> : null}
          </div>

          <div style={{ position:'sticky', bottom:0, padding:'12px 16px calc(14px + env(safe-area-inset-bottom))', background:'linear-gradient(0deg, rgba(11,7,20,.96), rgba(11,7,20,.4))', display:'flex', justifyContent:'center', gap:10 }}>
            <button onClick={() => setScreen('finish')} style={S.cta}>Ολοκλήρωση προπόνησης</button>
          </div>
        </div>
      )}

      {/* ── FINISH (σημειώσεις → feedback εγκεφάλου, χρέωση token) ── */}
      {screen === 'finish' && (
        savedMsg ? (
          <div style={S.center}>
            <span style={{ width:52, height:52, borderRadius:'50%', background:'#22c55e', display:'grid', placeItems:'center', marginBottom:14, fontSize:26 }}>✓</span>
            <p style={{ fontSize:16, fontWeight:800, color:'#fff', maxWidth:420 }}>{savedMsg}</p>
          </div>
        ) : charge ? (
          <div style={S.center}>
            <p style={S.kicker}>ΧΡΕΩΣΗ SESSION</p>
            <div style={{ fontSize:46, margin:'12px 0 4px' }}>🎟</div>
            <h1 style={{ fontSize:26, fontWeight:800, color:'#fff', margin:'0 0 6px', fontFamily:'var(--cp-font)' }}>Να αφαιρεθεί 1 token προπόνησης;</h1>
            <p style={{ fontSize:14, color:'rgba(240,224,236,.75)', margin:'0 0 22px' }}>
              {charge.group ? `Κοινό υπόλοιπο group${charge.name ? ` «${charge.name}»` : ''}` : `Υπόλοιπο${charge.name ? ` «${charge.name}»` : ''}`}: <b style={{ color:'#fff' }}>{charge.left}</b> → <b style={{ color:ACCENT }}>{charge.left - 1}</b>
            </p>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center' }}>
              <button disabled={charge.busy} onClick={() => answerCharge(true)} style={{ ...S.cta, opacity: charge.busy ? .6 : 1 }}>{charge.busy ? 'Χρέωση…' : '✓ Ναι, αφαίρεσε −1'}</button>
              <button disabled={charge.busy} onClick={() => answerCharge(false)} style={S.ghost}>Όχι, χωρίς χρέωση</button>
            </div>
          </div>
        ) : (
          <div style={{ position:'relative', zIndex:1, maxWidth:640, margin:'0 auto', padding:'34px 18px 44px' }}>
            <p style={{ ...S.kicker, textAlign:'center' }}>ΟΛΟΚΛΗΡΩΣΗ · {upEl(clientName || 'Προπόνηση')}</p>
            <h1 style={{ fontSize:23, fontWeight:800, color:'#fff', textAlign:'center', margin:'8px 0 6px', fontFamily:'var(--cp-font)' }}>Σημειώσεις προπόνησης</h1>
            <p style={{ fontSize:12.5, color:'rgba(255,255,255,.5)', textAlign:'center', margin:'0 auto 22px', maxWidth:440 }}>π.χ. «απέτυχε στις τελευταίες επαναλήψεις», «αύξηση κιλών την επόμενη φορά». Ο εγκέφαλος θα τις λάβει υπόψη στις μελλοντικές προπονήσεις και διατροφές.</p>
            <div style={{ background:'rgba(0,0,0,.5)', border:'1px solid rgba(255,255,255,.1)', borderRadius:16, padding:'14px 15px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:10 }}>
                <span style={{ width:26, height:26, borderRadius:'50%', background:col, display:'grid', placeItems:'center', color:'#fff', fontWeight:800, fontSize:12 }}>{(clientName || '?').charAt(0)}</span>
                <span style={{ fontSize:15, fontWeight:800, color:'#fff' }}>{clientName || 'Πελάτης'}</span>
                {plan.title && <span style={{ fontSize:11, color:col, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>· {plan.title}</span>}
              </div>
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Παρατηρήσεις προπόνησης…"
                style={{ width:'100%', minHeight:84, resize:'vertical', background:'rgba(0,0,0,.45)', border:'1px solid rgba(255,255,255,.15)', borderRadius:11, color:'#fff', padding:'10px 12px', fontSize:13.5, fontFamily:'inherit', outline:'none' }}/>
            </div>

            {/* προαιρετικά: τι έγινε πραγματικά ανά σετ */}
            <button onClick={openFix} style={{ ...S.ghost, width:'100%', marginTop:12, textAlign:'left', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span>✎ Διόρθωση επαναλήψεων / κιλών <span style={{ color:'rgba(255,255,255,.45)', fontWeight:600 }}>(προαιρετικό)</span></span>
              <span>{fixOpen ? '▴' : '▾'}</span>
            </button>
            {fixOpen && draft && (
              <div style={{ marginTop:10 }}>
                <p style={{ fontSize:11.5, color:'rgba(255,255,255,.45)', margin:'0 0 10px' }}>Είναι προσυμπληρωμένα με το πλάνο — άλλαξε μόνο ό,τι διέφερε. Αυτά μετράνε στα στατιστικά του πελάτη.</p>
                {draft.map((exd, i) => (
                  <div key={i} style={{ background:'rgba(0,0,0,.5)', border:'1px solid rgba(255,255,255,.09)', borderRadius:14, padding:'12px 13px 6px', marginBottom:9 }}>
                    <p style={{ margin:'0 0 8px', fontSize:14, fontWeight:800, color:'#fff' }}>{i + 1}. {exd.name}</p>
                    <div style={{ display:'grid', gridTemplateColumns:'40px 1fr 54px 1fr', gap:8, marginBottom:5 }}>
                      {['ΣΕΤ', 'ΕΠΑΝ.', 'ΣΤΟΧΟΣ', 'ΚΙΛΑ'].map(h => <span key={h} style={{ fontSize:9, letterSpacing:'.12em', color:'rgba(255,255,255,.4)', fontWeight:800, textAlign:'center' }}>{h}</span>)}
                    </div>
                    {exd.rows.map((r, si) => (
                      <div key={si} style={{ display:'grid', gridTemplateColumns:'40px 1fr 54px 1fr', gap:8, alignItems:'center', marginBottom:7 }}>
                        <span style={{ fontSize:13, color:'rgba(255,255,255,.6)', fontWeight:800, textAlign:'center' }}>{si + 1}</span>
                        <input style={S.inp} type="number" inputMode="numeric" value={r.reps_done} onChange={e => editDraft(i, si, 'reps_done', e.target.value)}/>
                        <span style={{ fontSize:12.5, color:'rgba(255,255,255,.4)', textAlign:'center' }}>/ {r.target || '—'}</span>
                        <input style={S.inp} type="number" inputMode="decimal" step="0.5" value={r.weight_kg} onChange={e => editDraft(i, si, 'weight_kg', e.target.value)}/>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display:'flex', gap:10, justifyContent:'center', marginTop:22 }}>
              <button onClick={() => setScreen('run')} style={S.ghost}>Πίσω</button>
              <button onClick={finish} disabled={saving} style={{ ...S.cta, opacity: saving ? .6 : 1 }}>{saving ? 'Αποθήκευση…' : 'Αποθήκευση & τέλος'}</button>
            </div>
          </div>
        )
      )}

      <style>{`
        @keyframes ltPulse { 0%{transform:scale(1)} 45%{transform:scale(1.06)} 100%{transform:scale(1)} }
      `}</style>
    </div>
  );
}
