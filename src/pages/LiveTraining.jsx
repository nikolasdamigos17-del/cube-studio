import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/db';
import { addCredit, getBalance, addGroupCredit, getGroupTrainingBalance } from '../lib/credits';
import { useLocation, useNavigate } from 'react-router-dom';
import { EQUIPMENT } from '../lib/gymEquipment';
import CubeBackground from '../components/CubeBackground';
import ExerciseMedia, { ExerciseVideoOverlay } from '../components/ExerciseMedia';
import { exerciseVideoUrl } from '../lib/exerciseApi';

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
const ACCENT = '#e0457b';           /* Παλμός: φούξια */
const ACCENT2 = '#8b5cf6';          /* βιολετί */
const DONE   = '#e0457b';
const PULSE_BG = 'radial-gradient(130% 90% at 50% 118%, #2a1140 0%, #140a24 46%, #0b0714 100%)';

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
                color: isNow ? ACCENT : i < current ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.4)',
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

/* ── ο παλμός: δαχτυλίδι επαναλήψεων που "χτυπάει" σε κάθε rep ─────────── */
function RepRing({ target, done, pulseKey }) {
  const size = 'min(74vw, 340px)';
  const R = 132, C = 2 * Math.PI * R;
  const frac = target ? Math.min(1, done / target) : 0;
  const boxSet = target > 0 && done >= target;
  return (
    <div style={{ position:'relative', width:size, height:size, margin:'0 auto',
      display:'grid', placeItems:'center' }}>
      {/* παλμικό δαχτυλίδι που σκάει σε κάθε επανάληψη */}
      <span key={pulseKey} style={{ position:'absolute', width:'86%', height:'86%', borderRadius:'50%',
        border:`1.5px solid ${ACCENT}66`, animation: pulseKey ? 'ltPulse .62s cubic-bezier(.2,.8,.3,1)' : 'none',
        pointerEvents:'none' }}/>
      <svg viewBox="0 0 300 300" style={{ width:'100%', height:'100%', transform:'rotate(-90deg)' }}>
        <circle cx="150" cy="150" r={R} fill="none" stroke="rgba(224,69,123,.14)" strokeWidth="11"/>
        <circle cx="150" cy="150" r={R} fill="none" stroke="url(#ltgrad)" strokeWidth="11" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - frac)}
          style={{ transition:'stroke-dashoffset .28s cubic-bezier(.22,1,.36,1)',
            filter:`drop-shadow(0 0 13px ${ACCENT}aa)` }}/>
        <defs>
          <linearGradient id="ltgrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={ACCENT}/><stop offset="100%" stopColor={ACCENT2}/>
          </linearGradient>
        </defs>
      </svg>
      <div style={{ position:'absolute', textAlign:'center' }}>
        <div key={'n'+done} style={{ fontSize:'clamp(72px,20vw,120px)', fontWeight:800, lineHeight:1,
          fontFamily:'var(--cp-font)', fontVariantNumeric:'tabular-nums',
          background:`linear-gradient(180deg,#fff, #f0d9ec)`, WebkitBackgroundClip:'text',
          backgroundClip:'text', color:'transparent',
          animation: boxSet ? 'none' : (pulseKey ? 'ltBump .18s ease' : 'none') }}>
          {done}
        </div>
        <div style={{ fontSize:13, letterSpacing:'.22em', color:'rgba(224,69,123,.85)',
          fontWeight:700, marginTop:6 }}>ΑΠΟ {target}</div>
      </div>
    </div>
  );
}

/* ── λευκός κύκλος επαναλήψεων — όταν η άσκηση δεν έχει βίντεο ─────────── */
function RepRingLight({ target, done, pulseKey, kg }) {
  const R = 90, C = 2 * Math.PI * R;
  const frac = target ? Math.min(1, done / target) : 0;
  return (
    <div style={{ position:'relative', width:'min(58vw, 34vh, 470px)', aspectRatio:'1', margin:'0 auto', display:'grid', placeItems:'center' }}>
      <span key={pulseKey} style={{ position:'absolute', width:'86%', height:'86%', borderRadius:'50%',
        border:`1.5px solid ${ACCENT}55`, animation: pulseKey ? 'ltPulse .62s cubic-bezier(.2,.8,.3,1)' : 'none', pointerEvents:'none' }}/>
      <svg viewBox="0 0 206 206" style={{ width:'100%', height:'100%', transform:'rotate(-90deg)' }}>
        <circle cx="103" cy="103" r={R} fill="none" stroke="#eceef1" strokeWidth="13"/>
        <circle cx="103" cy="103" r={R} fill="none" stroke="url(#ltgradL)" strokeWidth="13" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - frac)}
          style={{ transition:'stroke-dashoffset .28s cubic-bezier(.22,1,.36,1)' }}/>
        <defs><linearGradient id="ltgradL" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={ACCENT}/><stop offset="100%" stopColor={ACCENT2}/>
        </linearGradient></defs>
      </svg>
      <div style={{ position:'absolute', textAlign:'center' }}>
        <div key={'n'+done} style={{ fontFamily:'ui-monospace,monospace', fontWeight:700, letterSpacing:'-.04em',
          fontSize:'clamp(48px,15vw,64px)', lineHeight:1, color:'#0e1116', fontVariantNumeric:'tabular-nums',
          animation: pulseKey ? 'ltBump .18s ease' : 'none' }}>
          {done}<span style={{ fontSize:'.4em', color:'#a1a1aa' }}>/{target}</span>
        </div>
        <div style={{ fontSize:9, letterSpacing:'.22em', fontWeight:800, color:'#a1a1aa', marginTop:5 }}>ΕΠΑΝΑΛΗΨΕΙΣ · {kg ? kg + ' KG' : 'BW'}</div>
      </div>
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

/* ── ξεκούραση: λευκή σελίδα διαλείμματος (Cinema) ─────────────────────── */
function RestTakeover({ seconds, onDone, onSkip, isExChange, nextSub, nextKg, nextReps, contName, clientName, clockLabel }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) { sStart(); onDone(); return; }
    if (left <= 3) beep(660, .07, .18);
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const frac = seconds ? (seconds - left) / seconds : 0;
  const R = 90, C = 2 * Math.PI * R;
  const vurl = contName ? exerciseVideoUrl(contName) : null;
  const [vOk, setVOk] = useState(true);
  const mm = Math.floor(left / 60), ss = String(left % 60).padStart(2, '0');
  return (
    <div onClick={onSkip} style={{ position:'fixed', inset:0, zIndex:20, cursor:'pointer',
      background:'#fcfcfd', color:'#0e1116', fontFamily:'var(--cp-font)',
      display:'flex', flexDirection:'column', padding:'calc(14px + env(safe-area-inset-top)) 16px calc(14px + env(safe-area-inset-bottom))',
      animation:'ltFade .3s ease' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontWeight:900, letterSpacing:'.16em', fontSize:11 }}>THE <span style={{ color:ACCENT }}>CUBE</span> · LIVE</span>
        <span style={{ fontFamily:'ui-monospace,monospace', fontSize:11, color:'#6b7280', fontWeight:600 }}>{clockLabel || ''}</span>
        <span style={{ fontSize:10, fontWeight:800, padding:'4px 10px', borderRadius:99, letterSpacing:'.06em', background:'#eef2ff', color:'#4f46e5' }}>{(clientName || 'ATHLETE').toUpperCase()}</span>
      </div>
      <p style={{ margin:'12px 0 0', textAlign:'center', fontSize:11, letterSpacing:'.3em', fontWeight:800, color:ACCENT }}>
        {isExChange ? 'ΑΛΛΑΓΗ ΑΣΚΗΣΗΣ' : 'ΔΙΑΛΕΙΜΜΑ'}
      </p>
      <div style={{ position:'relative', width:'min(62vw, 30vh, 440px)', aspectRatio:'1', margin:'10px auto 0' }}>
        <svg viewBox="0 0 206 206" style={{ width:'100%', height:'100%', transform:'rotate(-90deg)', display:'block' }}>
          <circle cx="103" cy="103" r={R} fill="none" stroke="#eceef1" strokeWidth="13"/>
          <circle cx="103" cy="103" r={R} fill="none" stroke="url(#ltrest)" strokeWidth="13" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * frac}
            style={{ transition:'stroke-dashoffset .95s linear' }}/>
          <defs><linearGradient id="ltrest" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e0457b"/><stop offset="100%" stopColor="#8b5cf6"/>
          </linearGradient></defs>
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontFamily:'ui-monospace,monospace', fontWeight:700, fontSize:'clamp(40px,9vh,120px)', letterSpacing:'-.04em', lineHeight:1, color: left <= 3 ? ACCENT : '#0e1116', fontVariantNumeric:'tabular-nums' }}>{mm}:{ss}</span>
          <span style={{ fontSize:9, letterSpacing:'.22em', fontWeight:800, color:'#a1a1aa', marginTop:5 }}>ΑΠΟ {seconds}″</span>
        </div>
      </div>
      <div style={{ textAlign:'center', marginTop:10 }}>
        <p style={{ margin:0, fontSize:10, letterSpacing:'.22em', fontWeight:800, color:'#a1a1aa' }}>{nextSub}</p>
        {(nextReps != null) && (
          <p style={{ margin:'6px 0 0', fontFamily:'ui-monospace,monospace', fontWeight:700, letterSpacing:'-.04em', fontSize:'clamp(34px,6.5vh,90px)', lineHeight:1 }}>
            {nextKg || 0}<span style={{ fontSize:'.42em' }}>kg</span> <span style={{ fontSize:'.55em', color:'#6b7280' }}>× {nextReps}</span>
          </p>
        )}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:12, justifyContent:'center', marginTop:'auto', paddingTop:10 }}>
        {vurl && vOk && (
          <video key={vurl} src={vurl} autoPlay loop muted playsInline preload="metadata"
            onError={() => setVOk(false)}
            style={{ width:'clamp(72px,10vh,190px)', height:'clamp(72px,10vh,190px)', objectFit:'contain', background:'#fcfcfd', mixBlendMode:'multiply', borderRadius:14 }}/>
        )}
        <div style={{ textAlign:'left' }}>
          <p style={{ margin:0, fontSize:9, color:'#a1a1aa', letterSpacing:'.16em', fontWeight:800 }}>{isExChange ? 'ΕΠΟΜΕΝΗ' : 'ΣΥΝΕΧΙΖΟΥΜΕ'}</p>
          <p style={{ margin:'2px 0 0', fontSize:'clamp(16px,2.2vh,30px)', fontWeight:900, letterSpacing:'-.01em' }}>{contName || '—'}</p>
        </div>
      </div>
      <div style={{ marginTop:14, background:'#0e1116', color:'#fff', borderRadius:14, padding:'clamp(13px,1.8vh,24px)', textAlign:'center', fontSize:'clamp(11px,1.5vh,20px)', fontWeight:800, letterSpacing:'.14em' }}>
        ΠΑΡΑΛΕΙΨΗ ΔΙΑΛΕΙΜΜΑΤΟΣ →
      </div>
    </div>
  );
}

/* ── welcome — λευκή οθόνη υποδοχής (Cinema) ──────────────────────────── */
function Welcome({ plan, clientName, onStart }) {
  const exs = plan.exercises || [];
  const sets = exs.reduce((s2, e) => s2 + setsOf(e).length, 0);
  const reps = exs.reduce((s2, e) => s2 + setsOf(e).reduce((x, d) => x + repTargetOf(d), 0), 0);
  const eq = [...new Set(exs.map(e => e.eq).filter(Boolean))];
  return (
    <div style={{ minHeight:'var(--lt-vh, 100vh)', display:'flex', flexDirection:'column',
      padding:'calc(14px + env(safe-area-inset-top)) 18px calc(18px + env(safe-area-inset-bottom))',
      background:'#fcfcfd', color:'#0e1116' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontWeight:900, letterSpacing:'.16em', fontSize:'clamp(11px,1.4vh,20px)' }}>THE <span style={{ color:ACCENT }}>CUBE</span> · LIVE</span>
        <span style={{ fontSize:'clamp(10px,1.3vh,18px)', fontWeight:800, padding:'.4em 1em', borderRadius:99, letterSpacing:'.06em', background:'#eef2ff', color:'#4f46e5' }}>{(clientName || 'ATHLETE').toUpperCase()}</span>
      </div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', textAlign:'center', maxWidth:560, width:'100%', margin:'0 auto' }}>
        <p style={{ fontSize:'clamp(10px,1.3vh,17px)', letterSpacing:'.3em', fontWeight:800, color:ACCENT, margin:0 }}>ΑΤΟΜΙΚΗ ΠΡΟΠΟΝΗΣΗ</p>
        <h1 style={{ fontSize:'clamp(34px,6vh,72px)', fontWeight:900, letterSpacing:'-.03em', lineHeight:1.06, margin:'10px 0 6px' }}>
          Έτοιμος,<br/>
          <span style={{ background:'linear-gradient(135deg,#e0457b,#8b5cf6)', WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent' }}>{clientName || 'Athlete'}</span>;
        </h1>
        <p style={{ fontSize:'clamp(13px,1.8vh,22px)', color:'#6b7280', margin:'0 0 24px' }}>{plan.title}</p>
        <div style={{ display:'flex', gap:10, marginBottom:16 }}>
          {[[exs.length, 'ΑΣΚΗΣΕΙΣ'], [sets, 'ΣΕΤ'], [reps, 'ΕΠΑΝΑΛΗΨΕΙΣ']].map(([v, k]) => (
            <div key={k} style={{ flex:1, background:'#fff', border:'1px solid rgba(14,17,22,.09)', borderRadius:16, padding:'clamp(13px,2vh,24px) 8px' }}>
              <div style={{ fontSize:'clamp(22px,3.4vh,44px)', fontWeight:900, fontFamily:'ui-monospace,monospace', letterSpacing:'-.03em' }}>{v}</div>
              <div style={{ fontSize:'clamp(8.5px,1.1vh,14px)', letterSpacing:'.14em', color:'#a1a1aa', fontWeight:800, marginTop:4 }}>{k}</div>
            </div>
          ))}
        </div>
        {eq.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center', marginBottom:18 }}>
            {eq.map(k => EQUIPMENT[k] && (
              <span key={k} style={{ fontSize:'clamp(10px,1.3vh,16px)', fontWeight:700, padding:'.35em 1em', borderRadius:20,
                color:EQUIPMENT[k].color, background:EQUIPMENT[k].bg, border:`1px solid ${EQUIPMENT[k].color}44` }}>{EQUIPMENT[k].label}</span>
            ))}
          </div>
        )}
        <button onClick={onStart} style={{ width:'100%', padding:'clamp(16px,2.2vh,30px)', borderRadius:16, border:'none',
          cursor:'pointer', color:'#fff', fontSize:'clamp(15px,2vh,26px)', fontWeight:800, fontFamily:'inherit', letterSpacing:'.02em',
          background:'linear-gradient(135deg,#e0457b,#8b5cf6)', boxShadow:'0 8px 30px rgba(224,69,123,.35)' }}>
          ▶ ΕΝΑΡΞΗ ΠΡΟΠΟΝΗΣΗΣ
        </button>
        <p style={{ fontSize:'clamp(10px,1.3vh,16px)', color:'#a1a1aa', marginTop:10 }}>Πάτα το κουμπί του clicker για να ξεκινήσεις</p>
      </div>
    </div>
  );
}

/* ── results preview — λευκό (Cinema) ─────────────────────────────────── */
function ResultsReview({ draft, onEdit, onConfirm, saving }) {
  const inp = { width:'100%', background:'#fcfcfd', border:'1px solid rgba(14,17,22,.14)', borderRadius:9,
    color:'#0e1116', padding:'7px 6px', fontSize:'clamp(14px,1.8vh,22px)', fontWeight:700, textAlign:'center', fontFamily:'inherit', outline:'none' };
  return (
    <div style={{ minHeight:'var(--lt-vh, 100vh)', background:'#fcfcfd', color:'#0e1116', padding:'30px 16px 44px', maxWidth:680, margin:'0 auto' }}>
      <p style={{ fontSize:'clamp(10px,1.3vh,17px)', letterSpacing:'.3em', color:ACCENT, fontWeight:800, textTransform:'uppercase', margin:'0 0 8px' }}>Αποτελέσματα προπόνησης</p>
      <h1 style={{ fontSize:'clamp(23px,3.2vh,40px)', fontWeight:900, letterSpacing:'-.02em', margin:'0 0 6px' }}>Έλεγχος πριν την αποθήκευση</h1>
      <p style={{ fontSize:'clamp(12.5px,1.7vh,20px)', color:'#6b7280', margin:'0 0 20px' }}>Αν κάτι δεν ισχύει, διόρθωσε επαναλήψεις ή κιλά — μετά πάτησε Επιβεβαίωση.</p>
      {draft.map((exd, i) => (
        <div key={i} style={{ background:'#fff', border:'1px solid rgba(14,17,22,.09)', borderRadius:16, padding:'14px 14px 10px', marginBottom:12 }}>
          <p style={{ margin:'0 0 10px', fontSize:'clamp(14.5px,2vh,24px)', fontWeight:900 }}>{i+1}. {exd.name}</p>
          <div style={{ display:'grid', gridTemplateColumns:'44px 1fr 64px 1fr 40px', gap:8, marginBottom:6 }}>
            {['ΣΕΤ','ΕΠΑΝ.','ΣΤΟΧΟΣ','ΚΙΛΑ',''].map(h=>(
              <span key={h} style={{ fontSize:'clamp(8.5px,1.1vh,14px)', letterSpacing:'.12em', color:'#a1a1aa', fontWeight:800, textAlign:'center' }}>{h}</span>
            ))}
          </div>
          {exd.rows.map((r, si) => {
            const rd = parseInt(r.reps_done) || 0;
            const hit = r.target ? rd >= r.target : rd > 0;
            const badge = rd === 0 ? ['✗','#dc2626'] : hit ? ['✓','#16a34a'] : ['↓','#d97706'];
            return (
              <div key={si} style={{ display:'grid', gridTemplateColumns:'44px 1fr 64px 1fr 40px', gap:8, alignItems:'center', marginBottom:7 }}>
                <span style={{ fontSize:'clamp(12.5px,1.7vh,20px)', color:'#6b7280', fontWeight:800, textAlign:'center' }}>{si+1}</span>
                <input style={inp} type="number" value={r.reps_done} onChange={e=>onEdit(i, si, 'reps_done', e.target.value)}/>
                <span style={{ fontSize:'clamp(12.5px,1.7vh,20px)', color:'#a1a1aa', textAlign:'center' }}>/ {r.target || '—'}</span>
                <input style={inp} type="number" step="0.5" value={r.weight_kg} onChange={e=>onEdit(i, si, 'weight_kg', e.target.value)}/>
                <span style={{ fontSize:'clamp(15px,2vh,24px)', fontWeight:900, color:badge[1], textAlign:'center' }}>{badge[0]}</span>
              </div>
            );
          })}
        </div>
      ))}
      <button onClick={onConfirm} disabled={saving} style={{ width:'100%', padding:'clamp(15px,2vh,26px)', borderRadius:15, border:'none', cursor:'pointer',
        background:'linear-gradient(135deg,#e0457b,#8b5cf6)', color:'#fff', fontSize:'clamp(14.5px,1.9vh,24px)', fontWeight:800, opacity:saving?0.6:1, fontFamily:'inherit',
        boxShadow:'0 8px 26px rgba(224,69,123,.3)' }}>
        {saving ? 'Αποθήκευση…' : 'Επιβεβαίωση'}
      </button>
    </div>
  );
}

/* ── finish — λευκό (Cinema) ──────────────────────────────────────────── */
function Finish({ plan, clientName, totals, deduction, onClose }) {
  return (
    <div style={{ minHeight:'var(--lt-vh, 100vh)', display:'flex', flexDirection:'column', justifyContent:'center',
      alignItems:'center', padding:'40px 20px', background:'#fcfcfd', color:'#0e1116', textAlign:'center' }}>
      <div style={{ maxWidth:480, width:'100%' }}>
        <div style={{ fontSize:'clamp(56px,7vh,110px)', marginBottom:10 }}>🏆</div>
        <h1 style={{ fontSize:'clamp(27px,4vh,52px)', fontWeight:900, letterSpacing:'-.02em', margin:'0 0 6px' }}>Ολοκληρώθηκε!</h1>
        <p style={{ fontSize:'clamp(14px,1.9vh,24px)', color:'#6b7280', margin:'0 0 24px' }}>
          Τέλεια δουλειά, <strong style={{ background:'linear-gradient(135deg,#e0457b,#8b5cf6)', WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent' }}>{clientName || 'Athlete'}</strong>.
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:24 }}>
          {[['💪', totals.exercises, 'ΑΣΚΗΣΕΙΣ'], ['📊', totals.sets, 'ΣΕΤ'],
            ['🔁', totals.reps, 'ΕΠΑΝΑΛΗΨΕΙΣ'],
            ['⚖️', totals.volume ? `${Math.round(totals.volume).toLocaleString()}kg` : '—', 'ΟΓΚΟΣ']].map(([e, v, k]) => (
            <div key={k} style={{ background:'#fff', border:'1px solid rgba(14,17,22,.09)', borderRadius:16, padding:'clamp(15px,2vh,26px) 10px' }}>
              <div style={{ fontSize:'clamp(20px,2.6vh,34px)' }}>{e}</div>
              <div style={{ fontSize:'clamp(19px,2.8vh,38px)', fontWeight:900, fontFamily:'ui-monospace,monospace', letterSpacing:'-.03em', margin:'3px 0 2px' }}>{v}</div>
              <div style={{ fontSize:'clamp(8.5px,1.1vh,14px)', letterSpacing:'.14em', color:'#a1a1aa', fontWeight:800 }}>{k}</div>
            </div>
          ))}
        </div>
        <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:15, padding:'14px 16px', marginBottom:18, textAlign:'left' }}>
          <p style={{ margin:0, fontSize:'clamp(12.5px,1.7vh,20px)', color:'#166534', lineHeight:1.55 }}>✅ Τα δεδομένα της προπόνησης αποθηκεύτηκαν στην καρτέλα του πελάτη για μελλοντικά πλάνα.</p>
          {deduction && (
            <p style={{ margin:'8px 0 0', fontSize:'clamp(12.5px,1.7vh,20px)', color:'#166534', lineHeight:1.55 }}>🏋️ Αφαιρέθηκε <b>1 προπόνηση</b> — Νέο υπόλοιπο{deduction.group?' group':''}: <b style={{ color:ACCENT }}>{deduction.left} προπονήσεις</b></p>
          )}
        </div>
        <button onClick={onClose} style={{ width:'100%', padding:'clamp(14px,2vh,26px)', borderRadius:15, border:'none',
          cursor:'pointer', background:'linear-gradient(135deg,#e0457b,#8b5cf6)', color:'#fff', fontSize:'clamp(14px,1.9vh,24px)', fontWeight:800,
          boxShadow:'0 8px 26px rgba(224,69,123,.3)' }}>
          Τέλος
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
  const [showVid, setShowVid] = useState(false);
  const [exIdx, setExIdx] = useState(0);
  const [setIdx, setSetIdx] = useState(0);
  const [rep, setRep] = useState(0);
  const [phase, setPhase] = useState('ready');       // ready | active | rest | restEx
  const [logged, setLogged] = useState({});          // `${ex}-${set}` -> reps done
  const [resultsDraft, setResultsDraft] = useState([]);
  const [deduction, setDeduction] = useState(null);
  const [savingRes, setSavingRes] = useState(false);
  const [vidOk, setVidOk] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [t0] = useState(() => Date.now());
  useEffect(() => { setVidOk(true); }, [exIdx]);
  useEffect(() => {
    if (screen !== 'run') return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [screen]);
  const clockLabel = (() => {
    const d = new Date(nowMs);
    const el = Math.floor((nowMs - t0) / 60000);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} · ${el}′`;
  })();

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
  /* ── αποτελέσματα live: preview → επιβεβαίωση → αποθήκευση + αφαίρεση 1 προπόνησης ── */
  const buildDraft = () => exercises.map((ex2, i) => {
    const sd = setsOf(ex2);
    return { name: ex2.name, rows: sd.map((d, sn) => ({
      reps_done: logged[`${i}-${sn}`] ?? 0,
      target: repTargetOf(d) || 0,
      weight_kg: d.weight_kg ?? ex2.weight_kg ?? 0,
    })) };
  });
  const openResults = () => { setResultsDraft(buildDraft()); setScreen('results'); };
  const editDraft = (i, si, field, val) => setResultsDraft(p => p.map((exd, j) => j !== i ? exd : {
    ...exd, rows: exd.rows.map((r, k) => k !== si ? r : { ...r, [field]: val }),
  }));
  const confirmResults = async () => {
    if (savingRes) return;
    setSavingRes(true);
    const session_results = resultsDraft.map(exd => ({
      name: exd.name,
      sets_planned: exd.rows.length,
      sets_done: exd.rows.filter(r => (parseInt(r.reps_done) || 0) > 0).length,
      sets: exd.rows.map((r, si) => { const rd = parseInt(r.reps_done) || 0; return {
        set: si + 1, reps_done: rd, target_reps: r.target || 0, weight_kg: parseFloat(r.weight_kg) || 0,
        completed: rd > 0, hit_target: r.target ? rd >= r.target : rd > 0 }; }),
    }));
    try {
      if (plan?.id) await db.TrainingPlan.update(plan.id, { completed: true, completed_date: new Date().toISOString(), session_results });
      if (plan?.client_id) {
        const c = await db.Client.get(plan.client_id);
        if (c?.group_id) {
          // Μέλος group → η προπόνηση αφαιρείται από το ΚΟΙΝΟ υπόλοιπο του group
          const g = await db.Group.get(c.group_id);
          await addGroupCredit(c.group_id, -1, 'session', plan.id, plan.title || '');
          const left = g ? await getGroupTrainingBalance(g) : 0;
          setDeduction({ left, group: true });
        } else {
          await addCredit(plan.client_id, 'training', -1, 'session', plan.id, plan.title || '');
          const b = await getBalance(plan.client_id);
          setDeduction({ left: b.training });
        }
      }
    } catch {}
    setSavingRes(false);
    setScreen('finish');
  };

  const afterExRest = () => {
    if (exIdx + 1 >= exercises.length) { openResults(); return; }
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
      if (['ArrowDown', 'ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); undoRep(); }
      if (['Enter', 'PageDown'].includes(e.key)) { e.preventDefault(); endSet(); }
      if (e.key === 'Escape') nav(-1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [screen, addRep, undoRep, endSet, nav]);

  if (!plan) return (
    <>
    <div style={{ minHeight:'var(--lt-vh, 100vh)', display:'flex', flexDirection:'column', gap:16,
      alignItems:'center', justifyContent:'center', position:'relative', zIndex:1 }}>
      <p style={{ color:'#0e1116', fontWeight:700 }}>Δεν επιλέχθηκε πλάνο.</p>
      <button onClick={() => nav(-1)} style={{ padding:'10px 24px', borderRadius:10, border:'none',
        background:'linear-gradient(135deg,#e0457b,#8b5cf6)', color:'#fff', cursor:'pointer', fontWeight:700 }}>Πίσω</button>
    </div>
    </>
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
    <>
    <div style={{ minHeight:'var(--lt-vh, 100vh)', position:'relative', overflowX:'hidden', background:'#fcfcfd', color:'#0e1116', fontFamily:'var(--cp-font)' }}>

      {screen === 'welcome' && (
        <Welcome plan={plan} clientName={clientName} onStart={() => setScreen('run')}/>
      )}

      {screen === 'results' && (
        <ResultsReview draft={resultsDraft} onEdit={editDraft} onConfirm={confirmResults} saving={savingRes}/>
      )}
      {screen === 'finish' && (
        <Finish plan={plan} clientName={clientName} totals={totals} deduction={deduction} onClose={() => nav(-1)}/>
      )}

      {screen === 'run' && ex && (
        <div style={{ position:'relative', zIndex:1, minHeight:'var(--lt-vh, 100vh)', display:'flex',
          flexDirection:'column', padding:'calc(12px + env(safe-area-inset-top)) 16px 0',
          background:'#fcfcfd', color:'#0e1116', fontFamily:'var(--cp-font)' }}>

          {/* ── 1. top bar ── */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontWeight:900, letterSpacing:'.16em', fontSize:'clamp(11px,1.4vh,20px)' }}>THE <span style={{ color:ACCENT }}>CUBE</span> · LIVE</span>
            <span style={{ fontFamily:'ui-monospace,monospace', fontSize:'clamp(11px,1.4vh,20px)', color:'#6b7280', fontWeight:600 }}>{clockLabel}</span>
            <span style={{ fontSize:'clamp(10px,1.3vh,18px)', fontWeight:800, padding:'.4em 1em', borderRadius:99, letterSpacing:'.06em', background:'#eef2ff', color:'#4f46e5', maxWidth:'22vw', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{(clientName || 'ATHLETE').toUpperCase()}</span>
          </div>

          {/* ── 2. άσκηση ── */}
          <p style={{ margin:'10px 0 0', fontSize:'clamp(10px,1.3vh,18px)', letterSpacing:'.22em', fontWeight:800, color:'#a1a1aa' }}>ΑΣΚΗΣΗ {exIdx + 1}/{exercises.length}</p>
          <p style={{ margin:'1px 0 2px', fontSize:'clamp(24px,6.6vw,32px)', fontWeight:900, letterSpacing:'-.03em', lineHeight:1.08 }}>{ex.name}</p>

          {/* ── 3. media: βίντεο ή rep-ring όταν δεν υπάρχει ── */}
          {vidOk && exerciseVideoUrl(ex.name) ? (
            <video key={`${exIdx}-${exerciseVideoUrl(ex.name)}`} src={exerciseVideoUrl(ex.name)}
              autoPlay loop muted playsInline preload="metadata"
              onError={() => setVidOk(false)} onClick={() => setShowVid(true)}
              style={{ width:'100%', height:'clamp(220px,34vh,720px)', objectFit:'contain',
                background:'#fcfcfd', mixBlendMode:'multiply', cursor:'zoom-in' }}/>
          ) : (
            <div style={{ padding:'6px 0 2px' }}>
              <RepRingLight target={target} done={phase === 'active' ? rep : (logged[`${exIdx}-${setIdx}`] ?? 0)}
                pulseKey={rep} kg={cur?.weight_kg || 0}/>
            </div>
          )}

          {/* ── 4. πίνακας σετ: κιλά · επαν. · διάλειμμα ── */}
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'clamp(12.5px,1.9vh,25px)', marginTop:4 }}>
            <thead><tr>
              {['ΣΕΤ','ΚΙΛΑ','ΕΠΑΝ.','ΔΙΑΛΕΙΜΜΑ'].map((h, hi) => (
                <th key={h} style={{ fontSize:'clamp(9px,1.2vh,16px)', letterSpacing:'.18em', color:'#a1a1aa', fontWeight:800,
                  textAlign: hi === 3 ? 'right' : 'left', padding:'0 6px 5px' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {sets.map((sd, i) => {
                const isDone = logged[`${exIdx}-${i}`] !== undefined;
                const isNow = i === setIdx && phase !== 'restEx';
                const tdBase = { padding:'clamp(7px,1.1vh,16px) 6px', borderTop:'1px solid rgba(14,17,22,.09)', fontWeight:600,
                  fontFamily:'ui-monospace,monospace', fontVariantNumeric:'tabular-nums' };
                const col = isNow ? '#fff' : isDone ? '#9ca3af' : i > setIdx ? '#b6bcc6' : '#0e1116';
                const rowBg = isNow ? { background:'linear-gradient(135deg,#e0457b,#8b5cf6)' } : {};
                return (
                  <tr key={i}>
                    <td style={{ ...tdBase, ...rowBg, color: isNow ? '#fff' : isDone ? '#16a34a' : col, fontWeight:800,
                      borderRadius: isNow ? '9px 0 0 9px' : 0, fontFamily:'inherit' }}>{isDone ? '✓ ' : isNow ? '▶ ' : ''}{i + 1}</td>
                    <td style={{ ...tdBase, ...rowBg, color:col }}>{sd.weight_kg || 0} kg</td>
                    <td style={{ ...tdBase, ...rowBg, color:col }}>{isDone ? `${logged[`${exIdx}-${i}`]}/${repTargetOf(sd)}` : repTargetOf(sd)}</td>
                    <td style={{ ...tdBase, ...rowBg, color:col, textAlign:'right', borderRadius: isNow ? '0 9px 9px 0' : 0 }}>{parseInt(sd.rest_sec ?? ex.rest_between_sets ?? 60, 10)}″</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* ── 5. μεγάλοι αριθμοί: επαναλήψεις + φορτίο ── */}
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', margin:'12px 2px 8px' }}>
            <div>
              <p style={{ margin:0, fontSize:'clamp(9.5px,1.3vh,17px)', letterSpacing:'.2em', fontWeight:800, color:'#a1a1aa' }}>ΣΕΤ {Math.min(setIdx + 1, sets.length)} · ΕΠΑΝΑΛΗΨΕΙΣ</p>
              <p key={'bn' + rep} style={{ margin:'2px 0 0', fontFamily:'ui-monospace,monospace', fontWeight:700, letterSpacing:'-.04em',
                fontSize:'clamp(44px,9vh,120px)', lineHeight:.95, fontVariantNumeric:'tabular-nums',
                animation: phase === 'active' && rep ? 'ltBump .18s ease' : 'none' }}>
                {phase === 'active' ? rep : (logged[`${exIdx}-${setIdx}`] ?? 0)}<span style={{ fontSize:'.42em', color:'#a1a1aa' }}>/{target}</span>
              </p>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ margin:0, fontSize:'clamp(9.5px,1.3vh,17px)', letterSpacing:'.2em', fontWeight:800, color:'#a1a1aa' }}>ΦΟΡΤΙΟ</p>
              <p style={{ margin:'2px 0 0', fontFamily:'ui-monospace,monospace', fontWeight:700, letterSpacing:'-.04em',
                fontSize:'clamp(28px,5.5vh,72px)', lineHeight:1, color:ACCENT, fontVariantNumeric:'tabular-nums' }}>
                {cur?.weight_kg || 0}<span style={{ fontSize:'.5em' }}>kg</span>
              </p>
            </div>
          </div>

          {/* ── 6. controls + επόμενη άσκηση ── */}
          <div style={{ marginTop:'auto', paddingBottom:'calc(14px + env(safe-area-inset-bottom))' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              {phase === 'ready' && (
                <button onClick={addRep} style={{ flex:1, padding:'clamp(15px,2vh,28px) 0', borderRadius:15,
                  border:'none', cursor:'pointer', color:'#fff', fontSize:'clamp(14.5px,1.9vh,26px)', fontWeight:800, fontFamily:'inherit',
                  background:'linear-gradient(135deg,#e0457b,#8b5cf6)', boxShadow:'0 6px 22px rgba(224,69,123,.35)' }}>
                  ▶ ΕΝΑΡΞΗ ΣΕΤ {setIdx + 1}
                </button>
              )}
              {phase === 'active' && (
                <>
                  <button onClick={undoRep} aria-label="Undo"
                    style={{ width:48, height:48, borderRadius:13, cursor:'pointer',
                      border:'1px solid rgba(14,17,22,.14)', background:'#fff', color:'#0e1116', fontSize:17 }}>◀</button>
                  <button onClick={endSet}
                    style={{ height:48, padding:'0 14px', borderRadius:13, cursor:'pointer',
                      border:'1px solid rgba(234,140,8,.4)', background:'rgba(251,191,36,.14)',
                      color:'#b45309', fontSize:10.5, fontWeight:800, whiteSpace:'nowrap' }}>ΤΕΛΟΣ ΣΕΤ</button>
                  <button onClick={addRep} aria-label="Rep"
                    style={{ flex:1, height:48, borderRadius:13, border:'none', cursor:'pointer',
                      background:'linear-gradient(135deg,#e0457b,#8b5cf6)', color:'#fff', fontSize:19, fontWeight:800,
                      boxShadow:'0 4px 18px rgba(224,69,123,.4)' }}>▲ ΕΠΑΝΑΛΗΨΗ</button>
                </>
              )}
              {(phase === 'rest' || phase === 'restEx') && (
                <div style={{ flex:1, color:'#a1a1aa', fontSize:12.5, fontWeight:700 }}>Σε διάλειμμα…</div>
              )}
            </div>
            {exercises[exIdx + 1] && (
              <div style={{ display:'flex', alignItems:'center', gap:9, borderTop:'1px solid rgba(14,17,22,.09)', paddingTop:9 }}>
                <ExerciseMedia name={exercises[exIdx + 1].name} rounded={10}
                  style={{ width:'clamp(40px,6vh,120px)', height:'clamp(40px,6vh,120px)', mixBlendMode:'multiply', background:'#fcfcfd' }}/>
                <div>
                  <p style={{ margin:0, fontSize:'clamp(9.5px,1.2vh,16px)', color:'#a1a1aa', fontWeight:700 }}>Επόμενη άσκηση</p>
                  <p style={{ margin:0, fontSize:'clamp(12.5px,1.7vh,24px)', fontWeight:800 }}>{exercises[exIdx + 1].name} · {setsOf(exercises[exIdx + 1]).length} σετ</p>
                </div>
                <span style={{ marginLeft:'auto', fontFamily:'ui-monospace,monospace', fontSize:10, color:'#a1a1aa' }}>{exIdx + 2}/{exercises.length}</span>
              </div>
            )}
          </div>

          {phase === 'rest' && (() => {
            const n = sets[setIdx + 1];
            return <RestTakeover key={`r${exIdx}-${setIdx}`} seconds={rest}
              onDone={afterRest} onSkip={afterRest} isExChange={false}
              nextSub={`ΕΠΟΜΕΝΟ · ΣΕΤ ${setIdx + 2} ΑΠΟ ${sets.length}`}
              nextKg={n?.weight_kg || 0} nextReps={repTargetOf(n)}
              contName={ex.name} clientName={clientName} clockLabel={clockLabel}/>;
          })()}
          {phase === 'restEx' && (() => {
            const nx = exercises[exIdx + 1];
            const ns = nx ? setsOf(nx)[0] : null;
            return <RestTakeover key={`re${exIdx}`} seconds={restEx}
              onDone={afterExRest} onSkip={afterExRest} isExChange={true}
              nextSub={nx ? `ΕΠΟΜΕΝΗ ΑΣΚΗΣΗ · ${exIdx + 2}/${exercises.length}` : 'ΤΕΛΟΣ ΠΡΟΠΟΝΗΣΗΣ 🏁'}
              nextKg={ns ? (ns.weight_kg || 0) : null} nextReps={ns ? repTargetOf(ns) : null}
              contName={nx ? nx.name : ex.name} clientName={clientName} clockLabel={clockLabel}/>;
          })()}
          {showVid && <ExerciseVideoOverlay name={ex.name} onClose={() => setShowVid(false)}/>}
        </div>
      )}

      <style>{`
        @keyframes ltPulse{0%{transform:scale(.9);opacity:.85}100%{transform:scale(1.5);opacity:0}}
        @keyframes ltBump{0%{transform:scale(1)}40%{transform:scale(1.12)}100%{transform:scale(1)}}
        @keyframes ltFade{from{opacity:0}to{opacity:1}}
      `}</style>
    </div>
    </>
  );
}
