import { useState, useEffect, useRef } from 'react';
import { isTvMode, setTvMode, getTvRotation, setTvRotation,
         enableKeepAwake, disableKeepAwake } from '../lib/tvMode';

/* ── TvFrame ─────────────────────────────────────────────────────────────
   Τυλίγει το Live/Group Training. Όταν το TV mode είναι ενεργό (?tv=1):
   • περιστρέφει όλη τη σελίδα 90° ώστε κάθετα κρεμασμένη TV να δείχνει
     όρθιο portrait περιεχόμενο (κατεύθυνση εναλλάξιμη ↻)
   • δίνει --lt-vh/--lt-vw ώστε τα layouts να γεμίζουν το νέο "ύψος"
   • toolbar: ⛶ fullscreen · ↻ αναστροφή · ⌨ key test · ✕ έξοδος
   • keep-awake ώστε να μην πέφτει screensaver στη μέση του σετ
   Χωρίς TV mode επιστρέφει τα children ανέγγιχτα.                        */

const ACCENT = '#e0457b';

export default function TvFrame({ children }) {
  const [tvOn, setTvOn] = useState(isTvMode);
  const [rot, setRot] = useState(getTvRotation);
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [keyTest, setKeyTest] = useState(false);
  const [fs, setFs] = useState(false);

  useEffect(() => {
    if (!tvOn) return;
    const onR = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    const onF = () => setFs(!!document.fullscreenElement);
    window.addEventListener('resize', onR);
    document.addEventListener('fullscreenchange', onF);
    enableKeepAwake();
    return () => {
      window.removeEventListener('resize', onR);
      document.removeEventListener('fullscreenchange', onF);
      disableKeepAwake();
    };
  }, [tvOn]);

  if (!tvOn) return children;

  const { w, h } = vp;
  const transform = rot === 'cw'
    ? `rotate(90deg) translateY(-${w}px)`
    : `rotate(-90deg) translateX(-${h}px)`;

  const flip = () => { const nr = rot === 'cw' ? 'ccw' : 'cw'; setTvRotation(nr); setRot(nr); };
  const exitTv = () => { setTvMode(false); setTvOn(false); try { document.exitFullscreen?.(); } catch {} };
  const toggleFs = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {}
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0,
      width: h, height: w,
      transform, transformOrigin: 'top left',
      overflow: 'hidden',
      background: '#0b0714', zIndex: 5,
      '--lt-vh': `${w}px`, '--lt-vw': `${h}px`,
    }}>
      <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        {children}
      </div>

      {/* ── TV toolbar (όρθιο για τον θεατή) ── */}
      <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 60,
        display: 'flex', gap: 6, opacity: .45, transition: 'opacity .25s' }}
        onMouseEnter={e => { e.currentTarget.style.opacity = 1; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = .45; }}>
        <TvBtn title={fs ? 'Έξοδος fullscreen' : 'Fullscreen'} onClick={toggleFs}>⛶</TvBtn>
        <TvBtn title="Αναστροφή περιστροφής" onClick={flip}>↻</TvBtn>
        <TvBtn title="Δοκιμή clicker" active={keyTest} onClick={() => setKeyTest(v => !v)}>⌨</TvBtn>
        <TvBtn title="Έξοδος TV mode" onClick={exitTv}>✕</TvBtn>
      </div>

      {keyTest && <KeyTest onClose={() => setKeyTest(false)} />}
    </div>
  );
}

function TvBtn({ children, onClick, title, active }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 38, height: 38, borderRadius: 11, cursor: 'pointer',
      border: `1px solid ${active ? ACCENT : 'rgba(255,255,255,.22)'}`,
      background: active ? 'rgba(224,69,123,.28)' : 'rgba(10,6,18,.72)',
      color: '#fff', fontSize: 16, lineHeight: 1,
      display: 'grid', placeItems: 'center' }}>{children}</button>
  );
}

/* ── Key test: δείχνει τι στέλνει το clicker (keys + mouse buttons) ──────
   Όσο είναι ανοιχτό, "καταπίνει" τα events (capture) ώστε να μη μετρήσουν
   επαναλήψεις στο Live Training από κάτω.                                */
function KeyTest({ onClose }) {
  const [last, setLast] = useState(null);
  const [hist, setHist] = useState([]);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const push = (entry) => {
      setLast(entry);
      setHist(hh => [entry, ...hh].slice(0, 6));
    };
    const onKey = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (e.key === 'Escape') { closeRef.current(); return; }
      push({ big: e.key === ' ' ? 'Space' : e.key, small: `code: ${e.code || '—'} · keyCode: ${e.keyCode}` });
    };
    const onMouse = (e) => {
      if (e.target.closest?.('[data-kt-close]')) return;
      e.preventDefault(); e.stopPropagation();
      const names = { 0: 'Αριστερό κλικ', 1: 'Μεσαίο κλικ', 2: 'Δεξί κλικ' };
      push({ big: names[e.button] || `Mouse ${e.button}`, small: 'mouse button (σαν ποντίκι)' });
    };
    const onCtx = (e) => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('mousedown', onMouse, true);
    window.addEventListener('contextmenu', onCtx, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('mousedown', onMouse, true);
      window.removeEventListener('contextmenu', onCtx, true);
    };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 55, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(8,5,15,.93)', textAlign: 'center', padding: 24 }}>
      <p style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase',
        color: 'rgba(224,69,123,.9)', fontWeight: 800, margin: '0 0 6px' }}>Δοκιμή clicker</p>
      <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,.55)', margin: '0 0 26px', maxWidth: 380 }}>
        Πάτησε τα κουμπιά του clicker (ή του χειριστηρίου) — θα δεις εδώ τι στέλνει το καθένα.
      </p>

      <div style={{ minWidth: 240, padding: '26px 34px', borderRadius: 22,
        border: '1px solid rgba(224,69,123,.4)', background: 'rgba(224,69,123,.08)',
        boxShadow: '0 0 50px rgba(224,69,123,.18)' }}>
        <div style={{ fontSize: 'clamp(38px,8vw,58px)', fontWeight: 900, color: '#fff',
          fontFamily: 'var(--cp-font)', lineHeight: 1.1, wordBreak: 'break-all' }}>
          {last ? last.big : '···'}
        </div>
        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.5)', marginTop: 8 }}>
          {last ? last.small : 'περιμένω πάτημα…'}
        </div>
      </div>

      {hist.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center',
          marginTop: 18, maxWidth: 420 }}>
          {hist.slice(1).map((e, i) => (
            <span key={i} style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,.65)',
              border: '1px solid rgba(255,255,255,.15)', borderRadius: 999, padding: '4px 10px' }}>
              {e.big}
            </span>
          ))}
        </div>
      )}

      <button data-kt-close onClick={onClose} style={{ marginTop: 30, padding: '11px 30px',
        borderRadius: 12, border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 800,
        fontSize: 14, background: 'linear-gradient(180deg,#e0457b,#b52f78)',
        boxShadow: '0 4px 20px rgba(224,69,123,.4)' }}>Τέλος δοκιμής</button>
    </div>
  );
}
