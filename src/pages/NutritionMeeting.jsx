import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, X, Minus, ArrowLeft, ArrowRight, Loader2, Scale, RotateCcw, Pencil, Plus, CalendarDays, Clock } from 'lucide-react';
import { db, callAI } from '../lib/db';

/* ═══════════════ Σταθερά ═══════════════ */

const PAIRS = [
  ['#22d3ee','#f59e0b'], ['#a78bfa','#34d399'], ['#f472b6','#38bdf8'], ['#fb923c','#818cf8'],
  ['#4ade80','#e879f9'], ['#fbbf24','#60a5fa'], ['#f87171','#2dd4bf'], ['#c084fc','#facc15'],
  ['#38bdf8','#fb7185'], ['#a3e635','#818cf8'],
];

const QUOTES = [
  'Η συνέπεια χτίζει αυτό που το κίνητρο ξεκινά.',
  'Κάθε γεύμα είναι μια ψήφος για το σώμα που θέλεις.',
  'Δεν χρειάζεται να είσαι τέλειος — μόνο σταθερός.',
  'Τα μικρά βήματα κάθε μέρα γίνονται μεγάλα αποτελέσματα.',
  'Το σώμα σου ακούει ό,τι του λες. Μίλα του με πράξεις.',
  'Η πρόοδος δεν είναι γραμμή — είναι πορεία.',
  'Πειθαρχία σημαίνει να διαλέγεις αυτό που θέλεις περισσότερο, όχι αυτό που θέλεις τώρα.',
  'Ο καλύτερος χρόνος ήταν χθες. Ο δεύτερος καλύτερος είναι σήμερα.',
  'Δύναμη δεν είναι μόνο τα κιλά — είναι η συνήθεια.',
  'Τρέφεσαι για τον στόχο σου, όχι για τη στιγμή.',
  'Κάθε μέτρηση είναι πληροφορία, όχι κριτική.',
  'Συνέχισε. Το μέλλον σου προπονείται μαζί σου.',
];

const SLOT_META = {
  breakfast:   { label:'Πρωινό', emoji:'🌅' },
  snack1:      { label:'Δεκατιανό', emoji:'🍎' },
  lunch:       { label:'Μεσημεριανό', emoji:'☀️' },
  snack2:      { label:'Απογευματινό σνακ', emoji:'🥜' },
  dinner:      { label:'Βραδινό', emoji:'🌙' },
  preworkout:  { label:'Προ-προπονητικό', emoji:'⚡' },
  postworkout: { label:'Μετα-προπονητικό', emoji:'🥤' },
};

const GOAL_LABELS = { fat_loss:'Απώλεια λίπους', muscle_gain:'Μυϊκή ανάπτυξη', recomp:'Ανασύνθεση', maintain:'Συντήρηση', performance:'Απόδοση' };

const FALLBACK = {
  breakfast: [
    { name:'Γιαούρτι με βρώμη & μέλι', main_ingredients:['Γιαούρτι στραγγιστό','Βρώμη','Μέλι','Μύρτιλα'], calories:420, protein:28 },
    { name:'Ομελέτα λαχανικών', main_ingredients:['Αυγά','Πιπεριά','Ντομάτα','Φέτα'], calories:380, protein:26 },
    { name:'Τοστ ολικής με αβοκάντο & αυγό', main_ingredients:['Ψωμί ολικής','Αβοκάντο','Αυγά'], calories:410, protein:20 },
    { name:'Porridge βρώμης με μπανάνα', main_ingredients:['Βρώμη','Γάλα','Μπανάνα','Κανέλα'], calories:390, protein:16 },
    { name:'Pancakes βρώμης με φρούτα', main_ingredients:['Βρώμη','Αυγά','Μπανάνα','Φράουλες'], calories:450, protein:24 },
    { name:'Smoothie πρωτεΐνης με φρούτα', main_ingredients:['Πρωτεΐνη','Μπανάνα','Φράουλες','Γάλα'], calories:350, protein:32 },
    { name:'Αυγά scrambled με ψωμί ολικής', main_ingredients:['Αυγά','Ψωμί ολικής','Ελαιόλαδο'], calories:400, protein:24 },
    { name:'Cottage με φρούτα & καρύδια', main_ingredients:['Cottage','Ροδάκινο','Καρύδια'], calories:360, protein:27 },
    { name:'Τορτίγια πρωινού με γαλοπούλα', main_ingredients:['Αραβική πίτα','Γαλοπούλα','Αυγά','Ντομάτα'], calories:430, protein:30 },
    { name:'Ρυζογκοφρέτες με φυστικοβούτυρο & μπανάνα', main_ingredients:['Ρυζογκοφρέτες','Φυστικοβούτυρο','Μπανάνα'], calories:340, protein:12 },
  ],
  snack: [
    { name:'Γιαούρτι με μέλι', main_ingredients:['Γιαούρτι στραγγιστό','Μέλι'], calories:220, protein:18 },
    { name:'Φρούτο με ξηρούς καρπούς', main_ingredients:['Μήλο','Αμύγδαλα'], calories:230, protein:6 },
    { name:'Protein bar σπιτικό', main_ingredients:['Βρώμη','Πρωτεΐνη','Φυστικοβούτυρο'], calories:260, protein:20 },
    { name:'Τοστ με γαλοπούλα', main_ingredients:['Ψωμί ολικής','Γαλοπούλα','Τυρί'], calories:280, protein:19 },
    { name:'Smoothie φρούτων', main_ingredients:['Μπανάνα','Φράουλες','Γάλα'], calories:210, protein:8 },
    { name:'Αυγά βραστά με κράκερς', main_ingredients:['Αυγά','Κράκερς ολικής'], calories:240, protein:15 },
    { name:'Cottage με ντομάτα', main_ingredients:['Cottage','Ντομάτα','Ρίγανη'], calories:180, protein:20 },
    { name:'Χούμους με λαχανικά', main_ingredients:['Ρεβίθια','Καρότο','Αγγούρι'], calories:200, protein:9 },
  ],
  lunch: [
    { name:'Κοτόπουλο σχάρας με ρύζι', main_ingredients:['Κοτόπουλο στήθος','Ρύζι','Μπρόκολο'], calories:620, protein:48 },
    { name:'Μοσχαρίσιος κιμάς με ζυμαρικά ολικής', main_ingredients:['Κιμάς μοσχαρίσιος','Ζυμαρικά','Σάλτσα ντομάτας'], calories:680, protein:45 },
    { name:'Σολομός με γλυκοπατάτα', main_ingredients:['Σολομός','Γλυκοπατάτα','Σπαράγγια'], calories:640, protein:42 },
    { name:'Μπολ κοτόπουλο-κινόα', main_ingredients:['Κοτόπουλο','Κινόα','Αβοκάντο','Λαχανικά'], calories:600, protein:44 },
    { name:'Γεμιστά με κιμά', main_ingredients:['Πιπεριές','Ρύζι','Κιμάς'], calories:560, protein:32 },
    { name:'Φακές σαλάτα με τόνο', main_ingredients:['Φακές','Τόνος','Ντομάτα','Κρεμμύδι'], calories:520, protein:38 },
    { name:'Σουβλάκι κοτόπουλο με πίτα', main_ingredients:['Κοτόπουλο','Αραβική πίτα','Γιαούρτι','Ντομάτα'], calories:640, protein:46 },
    { name:'Μπριζόλα χοιρινή με πατάτες φούρνου', main_ingredients:['Χοιρινό','Πατάτα','Λεμόνι'], calories:700, protein:44 },
    { name:'Ρεβιθάδα με ψωμί ολικής', main_ingredients:['Ρεβίθια','Κρεμμύδι','Ψωμί ολικής'], calories:540, protein:24 },
    { name:'Γαλοπούλα stir-fry με ρύζι', main_ingredients:['Γαλοπούλα','Ρύζι','Πιπεριά','Σόγια sauce'], calories:590, protein:46 },
  ],
  dinner: [
    { name:'Ψητό κοτόπουλο με σαλάτα', main_ingredients:['Κοτόπουλο','Μαρούλι','Ντομάτα','Φέτα'], calories:480, protein:42 },
    { name:'Τσιπούρα σχάρας με χόρτα', main_ingredients:['Τσιπούρα','Χόρτα','Λεμόνι'], calories:450, protein:38 },
    { name:'Ομελέτα με μανιτάρια', main_ingredients:['Αυγά','Μανιτάρια','Τυρί'], calories:420, protein:28 },
    { name:'Γαρίδες σωτέ με κολοκυθάκια', main_ingredients:['Γαρίδες','Κολοκύθι','Σκόρδο'], calories:400, protein:34 },
    { name:'Μπιφτέκια γαλοπούλας με σαλάτα', main_ingredients:['Γαλοπούλα','Μαρούλι','Ντομάτα'], calories:470, protein:40 },
    { name:'Τόνος με φασολάκια', main_ingredients:['Τόνος','Φασολάκια','Ελαιόλαδο'], calories:430, protein:36 },
    { name:'Κοτόσουπα με λαχανικά', main_ingredients:['Κοτόπουλο','Καρότο','Κολοκύθι'], calories:390, protein:32 },
    { name:'Σαλάτα με αυγά & αβοκάντο', main_ingredients:['Αυγά','Αβοκάντο','Σπανάκι'], calories:410, protein:22 },
    { name:'Λαβράκι φούρνου με λαχανικά', main_ingredients:['Λαβράκι','Πιπεριά','Κρεμμύδι'], calories:460, protein:38 },
    { name:'Μανιτάρια γεμιστά με cottage', main_ingredients:['Μανιτάρια','Cottage','Σπανάκι'], calories:340, protein:26 },
  ],
  preworkout: [
    { name:'Μπανάνα με φυστικοβούτυρο', main_ingredients:['Μπανάνα','Φυστικοβούτυρο'], calories:250, protein:7 },
    { name:'Τοστ με μέλι', main_ingredients:['Ψωμί ολικής','Μέλι'], calories:220, protein:6 },
    { name:'Βρώμη με μπανάνα', main_ingredients:['Βρώμη','Μπανάνα'], calories:280, protein:9 },
    { name:'Ρυζογκοφρέτες με μαρμελάδα', main_ingredients:['Ρυζογκοφρέτες','Μαρμελάδα'], calories:180, protein:3 },
    { name:'Smoothie μπανάνα-βρώμη', main_ingredients:['Μπανάνα','Βρώμη','Γάλα'], calories:290, protein:11 },
    { name:'Χουρμάδες με αμύγδαλα', main_ingredients:['Χουρμάδες','Αμύγδαλα'], calories:230, protein:5 },
  ],
  postworkout: [
    { name:'Protein shake με μπανάνα', main_ingredients:['Πρωτεΐνη','Μπανάνα','Γάλα'], calories:320, protein:34 },
    { name:'Γιαούρτι με μέλι & βρώμη', main_ingredients:['Γιαούρτι στραγγιστό','Μέλι','Βρώμη'], calories:340, protein:26 },
    { name:'Αυγά με ρύζι', main_ingredients:['Αυγά','Ρύζι'], calories:380, protein:22 },
    { name:'Smoothie πρωτεΐνης με φρούτα', main_ingredients:['Πρωτεΐνη','Φράουλες','Γάλα'], calories:300, protein:32 },
    { name:'Τορτίγια με κοτόπουλο', main_ingredients:['Αραβική πίτα','Κοτόπουλο','Λαχανικά'], calories:420, protein:36 },
    { name:'Cottage με φρούτα', main_ingredients:['Cottage','Ροδάκινο'], calories:250, protein:24 },
  ],
};
const slotFallback = (k) => FALLBACK[k] || (k==='snack1'||k==='snack2' ? FALLBACK.snack : FALLBACK.lunch);

const num = v => { const n = parseFloat(v); return isNaN(n) ? null : n; };
const dlt = (a,b,k) => { const x=num(a?.[k]), y=num(b?.[k]); if(x==null||y==null) return null; return parseFloat((x-y).toFixed(1)); };
const todayStr = () => new Date().toISOString().split('T')[0];

/* ═══════════════ Διπλό κυνήγι — περιμετρικές δέσμες ═══════════════ */

function DualChaseBorder({ pairIdx }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    let raf, t = 0, last = performance.now(), run = true;
    const resize = () => { cv.width = window.innerWidth * DPR; cv.height = window.innerHeight * DPR; };
    resize(); window.addEventListener('resize', resize);
    const P = PAIRS[pairIdx % PAIRS.length];
    const draw = (now) => {
      if (!run) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      t = (t + dt * 0.085) % 1;
      const W = cv.width, H = cv.height, m = 5 * DPR;
      const w = W - 2 * m, h = H - 2 * m, per = 2 * (w + h);
      const pt = (u) => {
        let d = ((u % 1) + 1) % 1 * per;
        if (d < w) return [m + d, m];
        d -= w; if (d < h) return [W - m, m + d];
        d -= h; if (d < w) return [W - m - d, H - m];
        d -= w; return [m, H - m - d];
      };
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';
      const TAIL = 0.09, SEG = 24;
      [0, 0.5].forEach((off, bi) => {
        for (let i = 0; i < SEG; i++) {
          const [x1, y1] = pt(t + off - i * (TAIL / SEG));
          const [x2, y2] = pt(t + off - (i + 1) * (TAIL / SEG));
          if (Math.hypot(x2 - x1, y2 - y1) > 90 * DPR) continue;
          const f = i / SEG;
          ctx.strokeStyle = P[bi]; ctx.globalAlpha = (1 - f) * 0.85;
          ctx.lineWidth = (3.4 - 2.4 * f) * DPR;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
        const [hx, hy] = pt(t + off);
        ctx.globalAlpha = 0.95; ctx.fillStyle = P[bi];
        ctx.shadowColor = P[bi]; ctx.shadowBlur = 14 * DPR;
        ctx.beginPath(); ctx.arc(hx, hy, 2.8 * DPR, 0, 7); ctx.fill();
        ctx.shadowBlur = 0;
      });
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { run = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [pairIdx]);
  return <canvas ref={ref} style={{ position:'fixed', inset:0, width:'100vw', height:'100vh', pointerEvents:'none', zIndex:6 }}/>;
}

/* ═══════════════ Κύβος χαιρετισμού (μόνο πρώτη οθόνη) ═══════════════ */

function GreetCube({ colors }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    const S = 520; cv.width = S * DPR; cv.height = S * DPR;
    let raf, rx = 0.5, ry = 0.7, last = performance.now(), run = true;
    const V = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
    const E = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
    const draw = (now) => {
      if (!run) return;
      const dt = Math.min(0.05,(now-last)/1000); last = now;
      rx += dt * 0.22; ry += dt * 0.31;
      ctx.clearRect(0,0,cv.width,cv.height);
      const proj = (v, s) => {
        let [x,y,z] = v.map(c=>c*s);
        let y1 = y*Math.cos(rx)-z*Math.sin(rx), z1 = y*Math.sin(rx)+z*Math.cos(rx);
        let x2 = x*Math.cos(ry)+z1*Math.sin(ry), z2 = -x*Math.sin(ry)+z1*Math.cos(ry);
        const f = 3.6 / (3.6 + z2);
        return [cv.width/2 + x2*f*cv.width*0.30, cv.height/2 + y1*f*cv.height*0.30];
      };
      [[1,0.75],[0.55,0.35]].forEach(([s,al],ci)=>{
        const P2 = V.map(v=>proj(v,s));
        E.forEach(([a,b],ei)=>{
          ctx.strokeStyle = colors[ei%2===0?0:1];
          ctx.globalAlpha = al * 0.8; ctx.lineWidth = ci===0?1.7*DPR:1.1*DPR;
          ctx.shadowColor = colors[ei%2===0?0:1]; ctx.shadowBlur = 9*DPR;
          ctx.beginPath(); ctx.moveTo(P2[a][0],P2[a][1]); ctx.lineTo(P2[b][0],P2[b][1]); ctx.stroke();
        });
      });
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { run = false; cancelAnimationFrame(raf); };
  }, [colors]);
  return <canvas ref={ref} style={{ position:'fixed', left:'50%', top:'50%', transform:'translate(-50%,-50%)', width:'min(70vmin,520px)', height:'min(70vmin,520px)', opacity:0.5, pointerEvents:'none', zIndex:1 }}/>;
}

/* ═══════════════ AI συνταγές ═══════════════ */

function parseJsonArr(txt) {
  if (!txt || txt.startsWith('__ERROR__')) return null;
  try {
    const s = txt.indexOf('['), e = txt.lastIndexOf(']');
    if (s === -1 || e === -1) return null;
    const arr = JSON.parse(txt.slice(s, e + 1));
    if (!Array.isArray(arr)) return null;
    return arr.filter(x => x && x.name).map(x => ({
      name: String(x.name),
      main_ingredients: Array.isArray(x.main_ingredients) ? x.main_ingredients.map(String).slice(0,5) : [],
      calories: num(x.calories), protein: num(x.protein),
    }));
  } catch { return null; }
}

async function genForSlot(slotKey, ctxData, avoid) {
  const { profile, client } = ctxData;
  const banned = [
    ...(profile.excluded_auto || []), ...(profile.excluded_ingredients || []),
    ...(profile.disliked || []), ...(profile.never_meals || []),
  ];
  const flagsOn = Object.entries(profile.flags || {}).filter(([,v]) => v).map(([k]) => k).join(', ') || 'κανένα';
  const prompt = `Πρότεινε ΑΚΡΙΒΩΣ 10 διαφορετικές συνταγές/γεύματα για: ${SLOT_META[slotKey]?.label || slotKey}.
Πελάτης: στόχος ${GOAL_LABELS[profile.goal_type] || 'γενική υγεία'}${client?.gender ? ', φύλο ' + client.gender : ''}.
Διατροφικό προφίλ (flags): ${flagsOn}.
ΑΠΑΓΟΡΕΥΜΕΝΑ υλικά/γεύματα (ΜΗΝ τα χρησιμοποιήσεις ΠΟΥΘΕΝΑ, ούτε παράγωγά τους): ${banned.join(', ') || 'κανένα'}.
Προτιμήσεις που αρέσουν (δώσε τους προτεραιότητα όπου ταιριάζει): ${(profile.liked || []).join(', ') || '—'}.
ΜΗΝ επαναλάβεις αυτά τα γεύματα: ${avoid.join(', ') || '—'}.
Κάθε γεύμα: ελληνικό όνομα, 3-5 ΧΑΡΑΚΤΗΡΙΣΤΙΚΑ υλικά (ΟΧΙ αλάτι, πιπέρι, νερό ή αυτονόητα), θερμίδες, πρωτεΐνη σε γραμμάρια.
Απάντησε ΜΟΝΟ με JSON array, χωρίς markdown, χωρίς κείμενο πριν ή μετά:
[{"name":"...","main_ingredients":["...","..."],"calories":500,"protein":40}]`;
  const r = await callAI(prompt, 'You are a sports nutrition expert. Return ONLY a valid JSON array. No markdown. Start with [');
  const parsed = parseJsonArr(r);
  if (parsed && parsed.length >= 5) return parsed.slice(0, 10);
  /* fallback: τοπική βάση φιλτραρισμένη από αποκλεισμούς */
  const ban = banned.map(b => b.toLowerCase());
  const ok = slotFallback(slotKey).filter(m =>
    !ban.some(b => m.name.toLowerCase().includes(b) || m.main_ingredients.some(i => i.toLowerCase().includes(b))) &&
    !avoid.includes(m.name)
  );
  return ok.slice(0, 10);
}

/* ═══════════════ Μικρο-συστατικά UI ═══════════════ */

const goodDir = (key, goal) => {
  if (key === 'body_fat_pct') return -1;
  if (key === 'muscle_mass_kg' || key === 'body_water_pct') return 1;
  if (key === 'weight_kg') return goal === 'fat_loss' ? -1 : goal === 'muscle_gain' ? 1 : 0;
  return 0;
};

function DeltaChip({ d, dir }) {
  if (d == null) return <span style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>πρώτη μέτρηση</span>;
  const good = dir !== 0 && Math.sign(d) === dir;
  const bad = dir !== 0 && d !== 0 && Math.sign(d) !== dir;
  const col = d === 0 ? 'rgba(255,255,255,0.5)' : good ? '#4ade80' : bad ? '#f87171' : '#e2e8f0';
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:12.5, fontWeight:800, color:col,
      background:'rgba(255,255,255,0.05)', border:`1px solid ${col}33`, padding:'3px 9px', borderRadius:999 }}>
      {d > 0 ? '▲' : d < 0 ? '▼' : '—'} {Math.abs(d)}
    </span>
  );
}

function useCountUp(target, dur = 1150) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t0 = performance.now(); let raf;
    const tick = (now) => {
      const pr = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - pr, 3);
      setV((target || 0) * e);
      if (pr < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return v;
}

function BigNum({ value, decimals = 1, size = 66, color = '#fff' }) {
  const v = useCountUp(num(value) || 0);
  return (
    <span style={{ fontSize:size, fontWeight:800, letterSpacing:'-.035em', color, lineHeight:1, fontVariantNumeric:'tabular-nums' }}>
      {num(value) == null ? '—' : v.toFixed(decimals)}
    </span>
  );
}

function RadialGauge({ label, value, max, unit, color, delta, dir, delay = 0 }) {
  const R = 62, C = 2 * Math.PI * R, span = 0.78 * C;
  const frac = Math.max(0, Math.min(1, (num(value) || 0) / max));
  const [off, setOff] = useState(span);
  useEffect(() => { const t = setTimeout(() => setOff(span * (1 - frac)), 150 + delay * 1000); return () => clearTimeout(t); }, [frac, delay, span]);
  const v = useCountUp(num(value) || 0);
  return (
    <div style={{ textAlign:'center' }}>
      <svg viewBox="0 0 160 150" style={{ width:'100%', maxWidth:185, display:'block', margin:'0 auto' }}>
        <g transform="rotate(130 80 80)">
          <circle cx="80" cy="80" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="11" strokeDasharray={`${span} ${C}`} strokeLinecap="round"/>
          <circle cx="80" cy="80" r={R} fill="none" stroke={color} strokeWidth="11" strokeDasharray={`${span} ${C}`} strokeDashoffset={off} strokeLinecap="round"
            style={{ transition:'stroke-dashoffset 1.35s cubic-bezier(.22,1,.36,1)', filter:`drop-shadow(0 0 9px ${color}66)` }}/>
        </g>
        <text x="80" y="78" textAnchor="middle" fill="#fff" style={{ fontSize:30, fontWeight:800, fontVariantNumeric:'tabular-nums', fontFamily:'inherit' }}>{num(value) == null ? '—' : v.toFixed(1)}</text>
        <text x="80" y="98" textAnchor="middle" fill="rgba(255,255,255,0.45)" style={{ fontSize:11, fontFamily:'inherit' }}>{unit}</text>
      </svg>
      <p style={{ margin:'0 0 7px', fontSize:10.5, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.45)', fontWeight:700 }}>{label}</p>
      <DeltaChip d={delta} dir={dir}/>
    </div>
  );
}

function BarsCompare({ label, unit, prev, now, color, delta, dir, delay = 0 }) {
  const mx = Math.max(num(prev) || 0, num(now) || 0, 1);
  const [grow, setGrow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGrow(true), 200 + delay * 1000); return () => clearTimeout(t); }, [delay]);
  const H = 118;
  const bar = (v, dim, lbl) => (
    <div key={lbl} style={{ textAlign:'center', flex:1 }}>
      <div style={{ height:H, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
        <div style={{ width:36, borderRadius:'10px 10px 4px 4px', minHeight:5,
          height: grow ? `${Math.max(4, (num(v) || 0) / mx * 100)}%` : '4%',
          background: dim ? 'rgba(255,255,255,0.14)' : `linear-gradient(180deg, ${color}, ${color}77)`,
          boxShadow: dim ? 'none' : `0 0 18px ${color}55`,
          transition:'height 1.15s cubic-bezier(.22,1,.36,1)' }}/>
      </div>
      <p style={{ margin:'8px 0 0', fontSize:16, fontWeight:800, fontVariantNumeric:'tabular-nums' }}>{num(v) == null ? '—' : v}<span style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}> {unit}</span></p>
      <p style={{ margin:0, fontSize:10, color:'rgba(255,255,255,0.4)' }}>{lbl}</p>
    </div>
  );
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
        <p style={{ margin:0, fontSize:10.5, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.45)', fontWeight:700 }}>{label}</p>
        <DeltaChip d={delta} dir={dir}/>
      </div>
      <div style={{ display:'flex', gap:14, alignItems:'flex-end' }}>
        {bar(prev, true, 'Προηγούμενη')}
        {bar(now, false, 'Τώρα')}
      </div>
    </div>
  );
}

function WeightJourney({ data, color, color2 }) {
  const pts = (data || []).map(d => ({ d: d.date, v: num(d.weight_kg) })).filter(x => x.v != null);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDrawn(true), 250); return () => clearTimeout(t); }, []);
  if (pts.length < 2) return <p style={{ color:'rgba(255,255,255,0.4)', fontSize:12.5, margin:0 }}>Χρειάζονται ≥2 μετρήσεις για την πορεία.</p>;
  const W = 640, H = 172, PX = 40, PY = 24;
  const vals = pts.map(x => x.v);
  const mn = Math.min(...vals), mx = Math.max(...vals), rng = (mx - mn) || 1;
  const X = i => PX + i * (W - 2 * PX) / (pts.length - 1);
  const Y = v => H - PY - (v - mn) / rng * (H - 2 * PY);
  let dd = `M ${X(0)} ${Y(vals[0])}`;
  for (let i = 1; i < pts.length; i++) {
    const px = X(i - 1), py = Y(vals[i - 1]), cx = X(i), cy = Y(vals[i]);
    dd += ` Q ${px} ${py}, ${(px + cx) / 2} ${(py + cy) / 2}`;
  }
  dd += ` L ${X(pts.length - 1)} ${Y(vals[vals.length - 1])}`;
  const area = dd + ` L ${X(pts.length - 1)} ${H - PY} L ${X(0)} ${H - PY} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', display:'block' }}>
      <defs>
        <linearGradient id="wjfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="wjline" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color}/>
          <stop offset="100%" stopColor={color2 || color}/>
        </linearGradient>
      </defs>
      {[mn, mx].map((g, i) => (
        <g key={i}>
          <line x1={PX} x2={W - PX} y1={Y(g)} y2={Y(g)} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 5"/>
          <text x={PX - 7} y={Y(g) + 4} textAnchor="end" fill="rgba(255,255,255,0.35)" style={{ fontSize:10.5, fontFamily:'inherit', fontVariantNumeric:'tabular-nums' }}>{g.toFixed(1)}</text>
        </g>
      ))}
      <path d={area} fill="url(#wjfill)" style={{ opacity: drawn ? 1 : 0, transition:'opacity 1.2s .4s' }}/>
      <path d={dd} fill="none" stroke="url(#wjline)" strokeWidth="3" strokeLinecap="round"
        pathLength="1" strokeDasharray="1" strokeDashoffset={drawn ? 0 : 1}
        style={{ transition:'stroke-dashoffset 1.5s cubic-bezier(.4,0,.2,1)', filter:`drop-shadow(0 0 7px ${color}66)` }}/>
      {pts.map((x, i) => i === pts.length - 1 ? null : (
        <circle key={i} cx={X(i)} cy={Y(x.v)} r="3" fill="#0b0b12" stroke={color} strokeWidth="1.6" style={{ opacity: drawn ? 1 : 0, transition:`opacity .4s ${0.3 + i * 0.07}s` }}/>
      ))}
      <circle cx={X(pts.length - 1)} cy={Y(vals[vals.length - 1])} r="5" fill={color2 || color} style={{ filter:`drop-shadow(0 0 8px ${color2 || color})` }}/>
      <circle cx={X(pts.length - 1)} cy={Y(vals[vals.length - 1])} r="5" fill="none" stroke={color2 || color} strokeWidth="2" className="nmping"/>
      <text x={X(0)} y={H - 6} textAnchor="start" fill="rgba(255,255,255,0.35)" style={{ fontSize:10, fontFamily:'inherit' }}>{pts[0].d}</text>
      <text x={X(pts.length - 1)} y={H - 6} textAnchor="end" fill="rgba(255,255,255,0.35)" style={{ fontSize:10, fontFamily:'inherit' }}>{pts[pts.length - 1].d}</text>
    </svg>
  );
}

function CompositionDonut({ weight, fatPct, muscleKg, delay = 0 }) {
  const w = num(weight);
  const fat = (w != null && num(fatPct) != null) ? w * num(fatPct) / 100 : null;
  const mus = num(muscleKg);
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 200 + delay * 1000); return () => clearTimeout(t); }, [delay]);
  if (w == null || (fat == null && mus == null)) return <p style={{ color:'rgba(255,255,255,0.4)', fontSize:12.5, margin:0, textAlign:'center' }}>Χωρίς δεδομένα σύνθεσης.</p>;
  const f = fat || 0, m = mus || 0, rest = Math.max(0, w - f - m);
  const R = 56, C = 2 * Math.PI * R;
  const segs = [[f, '#f87171', 'Λίπος'], [m, '#34d399', 'Μυς'], [rest, 'rgba(255,255,255,0.14)', 'Λοιπά']];
  let acc = 0;
  return (
    <div style={{ textAlign:'center' }}>
      <svg viewBox="0 0 150 150" style={{ width:'100%', maxWidth:172, display:'block', margin:'0 auto' }}>
        <g transform="rotate(-90 75 75)">
          {segs.map(([val, col], i) => {
            const len = on ? (val / w) * C : 0;
            const offAcc = acc; acc += val;
            return <circle key={i} cx="75" cy="75" r={R} fill="none" stroke={col} strokeWidth="14"
              strokeDasharray={`${len} ${C}`} strokeDashoffset={-(offAcc / w) * C}
              style={{ transition:'stroke-dasharray 1.25s cubic-bezier(.22,1,.36,1)' }}/>;
          })}
        </g>
        <text x="75" y="71" textAnchor="middle" fill="#fff" style={{ fontSize:24, fontWeight:800, fontVariantNumeric:'tabular-nums', fontFamily:'inherit' }}>{w.toFixed(1)}</text>
        <text x="75" y="90" textAnchor="middle" fill="rgba(255,255,255,0.45)" style={{ fontSize:10.5, fontFamily:'inherit' }}>kg σύνολο</text>
      </svg>
      <p style={{ margin:'0 0 8px', fontSize:10.5, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.45)', fontWeight:700 }}>Σύνθεση σώματος</p>
      <div style={{ display:'flex', justifyContent:'center', gap:12, flexWrap:'wrap' }}>
        {segs.map(([val, col, lbl]) => (
          <span key={lbl} style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, color:'rgba(255,255,255,0.65)' }}>
            <span style={{ width:8, height:8, borderRadius:2, background:col, display:'inline-block' }}/>{lbl} {val ? val.toFixed(1) : '0'}kg
          </span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ Κύρια σελίδα ═══════════════ */

export default function NutritionMeeting() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const clientId = params.get('client') || '';

  const [client, setClient] = useState(null);
  const [profile, setProfile] = useState(null);
  const [lastPlan, setLastPlan] = useState(null);
  const [history, setHistory] = useState([]);
  const [screen, setScreen] = useState('greet'); // greet | measure | lastplan | loading | picker | summary
  const [pairIdx, setPairIdx] = useState(() => Math.floor(Math.random() * PAIRS.length));

  /* έξοδος */
  const [exitPanel, setExitPanel] = useState(false);
  const [exitConfirm, setExitConfirm] = useState(false);

  /* μέτρηση */
  const startRef = useRef(new Date().toISOString());
  const [current, setCurrent] = useState(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ weight_kg:'', body_fat_pct:'', muscle_mass_kg:'', body_water_pct:'' });

  /* αποφάσεις τελευταίας διατροφής + cart */
  const [decisions, setDecisions] = useState({});
  const [cart, setCart] = useState([]);

  /* προτιμήσεις modal */
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [likedInput, setLikedInput] = useState('');
  const [dislikedInput, setDislikedInput] = useState('');
  const [recipesStale, setRecipesStale] = useState(false);

  /* συνταγές */
  const [suggestions, setSuggestions] = useState({});
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [activeSlot, setActiveSlot] = useState('');
  const [rerolling, setRerolling] = useState({});
  const shownRef = useRef({});

  /* σύνοψη / ραντεβού */
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selDay, setSelDay] = useState('');
  const [dayAppts, setDayAppts] = useState([]);
  const [freeSlots, setFreeSlots] = useState([]);
  const [manualTime, setManualTime] = useState('');
  const [timeCheck, setTimeCheck] = useState(null); // {time, ok}
  const [confirmTime, setConfirmTime] = useState('');
  const [booked, setBooked] = useState(null);
  const [finishing, setFinishing] = useState(false);

  const P = PAIRS[pairIdx % PAIRS.length];
  const ACC = P[0];

  /* φόρτωση δεδομένων */
  useEffect(() => { (async () => {
    if (!clientId) return;
    const [c, profs, plans, prog] = await Promise.all([
      db.Client.get(clientId),
      db.NutritionProfile.filter({ client_id: clientId }),
      db.NutritionPlan.filter({ client_id: clientId }, '-date', 3),
      db.ClientProgress.filter({ client_id: clientId }, '-date', 30),
    ]);
    setClient(c); setProfile(profs[0] || null); setLastPlan(plans[0] || null);
    setHistory([...prog].reverse());
  })(); }, [clientId]);

  /* εναλλαγή χρωματικού ζεύγους */
  useEffect(() => {
    const t = setInterval(() => setPairIdx(i => (i + 1) % PAIRS.length), 13000);
    return () => clearInterval(t);
  }, []);

  /* αναμονή μέτρησης */
  useEffect(() => {
    if (screen !== 'measure' || current) return;
    const t = setInterval(async () => {
      const rows = await db.ClientProgress.filter({ client_id: clientId }, '-created_date', 1);
      const r = rows[0];
      if (r && r.created_date > startRef.current) { setCurrent(r); setHistory(h => [...h.filter(x => x.id !== r.id), r]); }
    }, 4000);
    return () => clearInterval(t);
  }, [screen, current, clientId]);

  const prev = useMemo(() => {
    if (!current) return null;
    const rest = history.filter(h => h.id !== current.id && (h.date || '') <= (current.date || '9999'));
    return rest.length ? rest[rest.length - 1] : null;
  }, [current, history]);

  const slots = profile?.meal_slots?.length ? profile.meal_slots : ['breakfast','lunch','snack2','dinner'];
  useEffect(() => { if (!activeSlot && slots.length) setActiveSlot(slots[0]); }, [slots, activeSlot]);

  /* ── ενέργειες ── */

  const saveManual = async () => {
    const w = num(manual.weight_kg); if (!w) return;
    const rec = await db.ClientProgress.create({
      client_id: clientId, date: todayStr(), weight_kg: w,
      body_fat_pct: num(manual.body_fat_pct), muscle_mass_kg: num(manual.muscle_mass_kg), body_water_pct: num(manual.body_water_pct),
      source: 'nutrition_meeting_manual',
    });
    setCurrent(rec); setHistory(h => [...h, rec]); setManualOpen(false);
  };

  const useLatest = () => { if (history.length) setCurrent(history[history.length - 1]); };

  const setDecision = (key, item, sectionName, v) => {
    setDecisions(p => ({ ...p, [key]: v }));
    setCart(p => {
      const rest = p.filter(x => x.id !== key);
      if (v === 'keep') return [...rest, { id: key, slot: sectionName, name: item.name, main_ingredients: item.ingredients ? String(item.ingredients).split(',').map(s=>s.trim()).slice(0,5) : [], calories: num(item.calories), protein: num(item.protein), source: 'previous' }];
      return rest;
    });
  };

  const updateProfile = async (patch) => {
    if (!profile) return;
    const next = { ...profile, ...patch };
    setProfile(next); setRecipesStale(true);
    await db.NutritionProfile.update(profile.id, patch);
  };

  const loadRecipes = async () => {
    setScreen('loading'); setLoadingPhase(0);
    const t1 = 5000 + Math.random() * 2000;
    const t2 = 4000 + Math.random() * 2000;
    setTimeout(() => setLoadingPhase(1), t1);
    const timing = new Promise(res => setTimeout(res, t1 + t2));
    const ctxData = { profile, client };
    const gen = Promise.all(slots.map(async s => {
      const avoid = cart.filter(c => c.slot === (SLOT_META[s]?.label || s)).map(c => c.name);
      const list = await genForSlot(s, ctxData, avoid);
      return [s, list];
    }));
    const [pairs] = await Promise.all([gen, timing]);
    const map = {}; pairs.forEach(([s, list]) => { map[s] = list; shownRef.current[s] = list.map(m => m.name); });
    setSuggestions(map); setRecipesStale(false); setScreen('picker');
  };

  const reroll = async (slotKey) => {
    setRerolling(p => ({ ...p, [slotKey]: true }));
    const avoid = [ ...(shownRef.current[slotKey] || []), ...cart.map(c => c.name) ];
    const list = await genForSlot(slotKey, { profile, client }, avoid);
    shownRef.current[slotKey] = [ ...(shownRef.current[slotKey] || []), ...list.map(m => m.name) ];
    setSuggestions(p => ({ ...p, [slotKey]: list }));
    setRerolling(p => ({ ...p, [slotKey]: false }));
  };

  const togglePick = (slotKey, meal) => {
    const label = SLOT_META[slotKey]?.label || slotKey;
    const id = `ai::${slotKey}::${meal.name}`;
    setCart(p => p.find(x => x.id === id)
      ? p.filter(x => x.id !== id)
      : [...p, { id, slot: label, name: meal.name, main_ingredients: meal.main_ingredients || [], calories: meal.calories, protein: meal.protein, source: 'ai' }]);
  };

  /* ημερολόγιο */
  const pickDay = async (ds) => {
    setSelDay(ds); setTimeCheck(null); setConfirmTime(''); setManualTime('');
    const appts = (await db.Appointment.filter({ date: ds })).filter(a => a.status !== 'cancelled');
    setDayAppts(appts);
    const toMin = (t) => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
    const busy = appts.map(a => [toMin(a.start_time), toMin(a.start_time) + (a.duration_minutes || 60)]);
    const isFree = (m) => busy.every(([s, e]) => m + 40 <= s || m >= e);
    const out = [];
    for (let m = 9 * 60; m <= 20 * 60 + 20 && out.length < 5; m += 15) {
      if (isFree(m)) { out.push(`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`); m += 75; }
    }
    setFreeSlots(out);
  };
  const checkTime = (t) => {
    if (!t) return;
    const toMin = (x) => { const [h, m] = x.split(':').map(Number); return h * 60 + (m || 0); };
    const mm = toMin(t);
    const busy = dayAppts.map(a => [toMin(a.start_time || '0:0'), toMin(a.start_time || '0:0') + (a.duration_minutes || 60)]);
    const ok = busy.every(([s, e]) => mm + 40 <= s || mm >= e);
    setTimeCheck({ time: t, ok });
    if (ok) setConfirmTime(t);
  };
  const book = async () => {
    const appt = await db.Appointment.create({
      title: `${client.name} - Διατροφική συνάντηση`, client_id: clientId, client_name: client.name,
      client_color: client.theme_color || ACC, type: 'nutrition', date: selDay, start_time: confirmTime,
      duration_minutes: 40, status: 'scheduled',
    });
    setBooked(appt); setConfirmTime(''); setTimeCheck(null);
  };

  const finish = async () => {
    setFinishing(true);
    const never = Object.entries(decisions).filter(([,v]) => v === 'never').map(([k]) => k.split('::').pop());
    const maybe = Object.entries(decisions).filter(([,v]) => v === 'maybe').map(([k]) => k.split('::').pop());
    if (never.length && profile) {
      const merged = Array.from(new Set([...(profile.never_meals || []), ...never]));
      await db.NutritionProfile.update(profile.id, { never_meals: merged });
    }
    await db.NutritionMeeting.create({
      client_id: clientId, client_name: client.name, date: todayStr(),
      progress_id: current?.id || null, prev_progress_id: prev?.id || null,
      measurement: current ? { weight_kg: current.weight_kg, body_fat_pct: current.body_fat_pct, muscle_mass_kg: current.muscle_mass_kg, body_water_pct: current.body_water_pct } : null,
      decisions, maybe_meals: maybe,
      selected_meals: cart.map(({ slot, name, main_ingredients, calories, protein, source }) => ({ slot, name, main_ingredients, calories, protein, source })),
      next_appointment_id: booked?.id || null, status: 'ordered',
    });
    navigate('/Nutrition');
  };

  /* ── στυλ ── */
  const S = {
    page:{ minHeight:'100vh', background:'#06060b', color:'#eef0f6', fontFamily:'var(--font-display, "Space Grotesk", sans-serif)', position:'relative', overflow:'hidden' },
    wash:{ position:'fixed', inset:0, zIndex:0, background:`radial-gradient(1000px 500px at 15% -8%, ${P[0]}12, transparent 60%), radial-gradient(800px 460px at 100% 4%, ${P[1]}10, transparent 55%)`, transition:'background 1.2s ease' },
    kicker:{ fontSize:10.5, letterSpacing:'.34em', textTransform:'uppercase', color:ACC, fontWeight:700 },
    card:{ background:'rgba(255,255,255,0.035)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:18, padding:'18px 20px', backdropFilter:'blur(6px)' },
    lbl:{ fontSize:10.5, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.42)', fontWeight:700 },
    dim:{ color:'rgba(255,255,255,0.45)' },
    inp:{ background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.14)', borderRadius:11, color:'#eef0f6', padding:'10px 13px', fontSize:14, outline:'none', width:'100%', fontFamily:'inherit' },
    btn:(primary, col)=>({ border:'none', borderRadius:12, padding:'12px 22px', fontSize:13.5, fontWeight:800, cursor:'pointer', fontFamily:'inherit',
      background: primary ? (col || ACC) : 'transparent', color: primary ? '#07070b' : 'rgba(255,255,255,0.7)',
      outline: primary ? 'none' : '1px solid rgba(255,255,255,0.18)' }),
    next:{ position:'fixed', top:16, right:18, zIndex:20, display:'flex', gap:8, alignItems:'center' },
    navBtn:{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:999, fontSize:12, fontWeight:800, cursor:'pointer',
      background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.75)', fontFamily:'inherit' },
  };
  const initials = (n)=> (n||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();

  if (!client) return (
    <div style={{ ...S.page, display:'grid', placeItems:'center' }}>
      <Loader2 style={{ width:28, height:28, color:'#fff', animation:'nmspin 1s linear infinite' }}/>
      <style>{`@keyframes nmspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const ORDER = ['measure','lastplan','picker','summary'];
  const goNext = () => {
    if (screen === 'measure') setScreen('lastplan');
    else if (screen === 'lastplan') { (Object.keys(suggestions).length && !recipesStale) ? setScreen('picker') : loadRecipes(); }
    else if (screen === 'picker') setScreen('summary');
  };
  const goPrev = () => {
    const i = ORDER.indexOf(screen);
    if (i > 0) setScreen(ORDER[i - 1]);
  };
  const stepLabel = { measure:'Μετρήσεις', lastplan:'Τελευταία διατροφή', picker:'Επιλογή γευμάτων', summary:'Σύνοψη' }[screen];

  return (
    <div style={S.page}>
      <div style={S.wash}/>
      <DualChaseBorder pairIdx={pairIdx}/>
      {screen === 'greet' && <GreetCube colors={P}/>}

      {/* logo / έξοδος — πάνω αριστερά, όπως στο Cube Offers αλλά χωρίς PIN */}
      <div style={{ position:'fixed', top:16, left:18, zIndex:30 }}>
        <button onClick={() => { setExitPanel(v => !v); }} style={{ display:'flex', alignItems:'center', gap:10, background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit', padding:0 }}>
          <span style={{ width:34, height:34, borderRadius:9, border:`1.6px solid ${ACC}`, display:'grid', placeItems:'center', boxShadow:`0 0 14px ${ACC}44` }}>
            <span style={{ width:15, height:15, border:`1.4px solid ${P[1]}`, transform:'rotate(45deg)', display:'block' }}/>
          </span>
          <span style={{ textAlign:'left' }}>
            <b style={{ display:'block', fontSize:13.5, letterSpacing:'.06em', color:'#fff' }}>THE CUBE</b>
            <small style={{ fontSize:9.5, letterSpacing:'.22em', color:'rgba(255,255,255,0.45)', textTransform:'uppercase' }}>Nutrition Meeting</small>
          </span>
        </button>
        {exitPanel && (
          <button onClick={() => { setExitPanel(false); setExitConfirm(true); }}
            style={{ marginTop:10, display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderRadius:12, cursor:'pointer', fontFamily:'inherit',
              background:'rgba(10,10,17,0.96)', border:'1px solid rgba(255,255,255,0.16)', color:'#fff', fontSize:13, fontWeight:700,
              boxShadow:'0 20px 60px -20px rgba(0,0,0,0.8)', animation:'nmfade .18s ease both' }}>
            <X style={{ width:14, height:14 }}/> Έξοδος
          </button>
        )}
      </div>

      {/* βήμα + πλοήγηση — πάνω δεξιά, μικρό & διακριτικό */}
      {screen !== 'greet' && screen !== 'loading' && (
        <div style={S.next}>
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)', letterSpacing:'.08em', textTransform:'uppercase', fontWeight:700 }}>{stepLabel}</span>
          {ORDER.indexOf(screen) > 0 && (
            <button onClick={goPrev} style={S.navBtn}><ArrowLeft style={{ width:13, height:13 }}/></button>
          )}
          {screen !== 'summary' && (
            <button onClick={goNext} style={{ ...S.navBtn, borderColor:`${ACC}66`, color:'#fff' }}>Next <ArrowRight style={{ width:13, height:13 }}/></button>
          )}
        </div>
      )}

      <div style={{ position:'relative', zIndex:10, maxWidth:1180, margin:'0 auto', padding:'84px 26px 60px' }}>

        {/* ═══ ΧΑΙΡΕΤΙΣΜΟΣ ═══ */}
        {screen === 'greet' && (
          <div style={{ minHeight:'78vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
            <span style={S.kicker}>The Cube · Διατροφική συνάντηση</span>
            <h1 style={{ fontSize:'clamp(30px,5vw,52px)', fontWeight:800, letterSpacing:'-.02em', margin:'14px 0 8px', textShadow:'0 4px 40px rgba(0,0,0,0.6)' }}>
              Καλώς ήρθες, {client.name?.split(' ')[0]}
            </h1>
            <p style={{ ...S.dim, fontSize:15, maxWidth:460, margin:'0 0 34px' }}>
              Σήμερα θα δούμε την πρόοδό σου και θα διαμορφώσουμε μαζί την επόμενη διατροφή σου.
            </p>
            {profile ? (
              <button onClick={() => setScreen('measure')} style={{ ...S.btn(true), padding:'16px 38px', fontSize:15, boxShadow:`0 0 34px ${ACC}55` }}>
                Έναρξη meeting
              </button>
            ) : (
              <div style={{ ...S.card, maxWidth:420 }}>
                <p style={{ margin:'0 0 12px', fontWeight:700 }}>Δεν έχει γίνει ακόμα Course Planning.</p>
                <button onClick={() => navigate(`/course-planning?client=${clientId}`)} style={S.btn(true)}>Μετάβαση στο Course Planning</button>
              </div>
            )}
          </div>
        )}

        {/* ═══ ΜΕΤΡΗΣΕΙΣ ═══ */}
        {screen === 'measure' && (
          !current ? (
            <div style={{ ...S.card, textAlign:'center', padding:'52px 24px', maxWidth:620, margin:'6vh auto 0' }}>
              <div style={{ width:70, height:70, margin:'0 auto 18px', borderRadius:'50%', border:`2px solid ${ACC}55`, display:'grid', placeItems:'center', animation:'nmpulse 1.8s ease-in-out infinite' }}>
                <Scale style={{ width:28, height:28, color:ACC }}/>
              </div>
              <p style={{ fontSize:18, fontWeight:800, margin:'0 0 6px' }}>Αναμονή μέτρησης από τη ζυγαριά…</p>
              <p style={{ ...S.dim, fontSize:13.5, maxWidth:420, margin:'0 auto' }}>Κάνε τη ζύγιση στο IMBODY — μόλις καταχωρηθεί, τα αποτελέσματα θα εμφανιστούν εδώ αυτόματα.</p>
              <div style={{ display:'flex', gap:10, justifyContent:'center', marginTop:24, flexWrap:'wrap' }}>
                {history.length > 0 && (
                  <button onClick={useLatest} style={S.btn(false)}>Χρήση τελευταίας μέτρησης ({history[history.length-1].date})</button>
                )}
                <button onClick={() => setManualOpen(v => !v)} style={S.btn(false)}>Χειροκίνητη καταχώρηση</button>
              </div>
              {manualOpen && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginTop:20, textAlign:'left' }}>
                  {[['weight_kg','Βάρος (kg)'],['body_fat_pct','Λίπος %'],['muscle_mass_kg','Μυς (kg)'],['body_water_pct','Νερό %']].map(([k,l]) => (
                    <div key={k}><p style={{ ...S.lbl, marginBottom:6 }}>{l}</p><input style={S.inp} type="number" step="0.1" value={manual[k]} onChange={e => setManual(p => ({ ...p, [k]: e.target.value }))}/></div>
                  ))}
                  <button onClick={saveManual} disabled={!num(manual.weight_kg)} style={{ ...S.btn(true), gridColumn:'1/5', opacity:num(manual.weight_kg)?1:.4 }}>Καταχώρηση</button>
                </div>
              )}
            </div>
          ) : (
            <div key={current.id}>
              <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', flexWrap:'wrap', gap:8, marginBottom:16 }}>
                <div>
                  <span style={S.kicker}>Αποτελέσματα μέτρησης</span>
                  <h2 style={{ fontSize:25, fontWeight:800, margin:'6px 0 0', letterSpacing:'-.02em' }}>{client.name}</h2>
                </div>
                <span style={{ ...S.dim, fontSize:12.5 }}>{current.date}{prev ? ` · σύγκριση με ${prev.date}` : ''}</span>
              </div>

              {/* hero: βάρος */}
              <div className="nmreveal" style={{ ...S.card, textAlign:'center', padding:'28px 22px 24px', marginBottom:14, position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', inset:'-40% -20%', background:`radial-gradient(closest-side, ${P[0]}18, transparent 70%)`, pointerEvents:'none' }}/>
                <p style={{ ...S.lbl, margin:'0 0 10px', position:'relative' }}>Βάρος</p>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:16, position:'relative', flexWrap:'wrap' }}>
                  <div>
                    <BigNum value={current.weight_kg} size={72}/>
                    <span style={{ fontSize:17, color:'rgba(255,255,255,0.4)', fontWeight:700, marginLeft:6 }}>kg</span>
                  </div>
                  <DeltaChip d={dlt(current, prev, 'weight_kg')} dir={goodDir('weight_kg', profile?.goal_type)}/>
                </div>
                {(() => {
                  const firstW = num(history[0]?.weight_kg), curW = num(current.weight_kg), tgt = num(profile?.target_weight);
                  if (firstW == null || curW == null || tgt == null || firstW === tgt) return null;
                  const prog = Math.max(0, Math.min(1, (firstW - curW) / (firstW - tgt)));
                  return (
                    <div style={{ maxWidth:520, margin:'20px auto 0', position:'relative' }}>
                      <div style={{ height:9, borderRadius:999, background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${prog*100}%`, borderRadius:999, background:`linear-gradient(90deg, ${P[0]}, ${P[1]})`, boxShadow:`0 0 14px ${P[1]}66`, transition:'width 1.4s cubic-bezier(.22,1,.36,1)' }}/>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginTop:7, fontSize:10.5, color:'rgba(255,255,255,0.42)' }}>
                        <span>Αφετηρία {firstW}kg</span>
                        <span style={{ color:'#fff', fontWeight:800 }}>{Math.round(prog*100)}% προς τον στόχο</span>
                        <span>Στόχος {tgt}kg</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* gauges + σύνθεση */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(215px,1fr))', gap:14, marginBottom:14 }}>
                <div className="nmreveal" style={{ ...S.card, animationDelay:'.1s' }}>
                  <RadialGauge label="Λίπος" value={current.body_fat_pct} max={45} unit="%" color="#f87171" delta={dlt(current, prev, 'body_fat_pct')} dir={-1} delay={0.15}/>
                </div>
                <div className="nmreveal" style={{ ...S.card, animationDelay:'.2s' }}>
                  <CompositionDonut weight={current.weight_kg} fatPct={current.body_fat_pct} muscleKg={current.muscle_mass_kg} delay={0.25}/>
                </div>
                <div className="nmreveal" style={{ ...S.card, animationDelay:'.3s' }}>
                  <RadialGauge label="Νερό" value={current.body_water_pct} max={70} unit="%" color="#38bdf8" delta={dlt(current, prev, 'body_water_pct')} dir={1} delay={0.35}/>
                </div>
              </div>

              {/* μυς + πορεία */}
              <div style={{ display:'grid', gridTemplateColumns:'minmax(230px,1fr) 2fr', gap:14, marginBottom:14 }}>
                <div className="nmreveal" style={{ ...S.card, animationDelay:'.38s' }}>
                  <BarsCompare label="Μυϊκή μάζα" unit="kg" prev={prev?.muscle_mass_kg} now={current.muscle_mass_kg} color="#34d399" delta={dlt(current, prev, 'muscle_mass_kg')} dir={1} delay={0.4}/>
                </div>
                <div className="nmreveal" style={{ ...S.card, animationDelay:'.46s' }}>
                  <p style={{ ...S.lbl, margin:'0 0 10px' }}>Πορεία βάρους</p>
                  <WeightJourney data={[...history.filter(h => h.id !== current.id), current].slice(-12)} color={P[0]} color2={P[1]}/>
                </div>
              </div>

              {/* δευτερεύοντες δείκτες */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12 }}>
                {[['bmi','BMI'],['bmr','BMR'],['visceral_fat','Σπλαχνικό λίπος'],['bone_mass_kg','Οστική μάζα kg']].map(([k,l], i) => (
                  <div key={k} className="nmreveal" style={{ ...S.card, padding:'13px 15px', animationDelay:`${0.52 + i*0.07}s` }}>
                    <p style={{ ...S.lbl, fontSize:9.5, margin:'0 0 6px' }}>{l}</p>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
                      <span style={{ fontSize:21, fontWeight:800, fontVariantNumeric:'tabular-nums' }}>{num(current[k]) ?? '—'}</span>
                      <DeltaChip d={dlt(current, prev, k)} dir={0}/>
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ ...S.dim, fontSize:12, textAlign:'center', marginTop:18 }}>Όταν ολοκληρώσετε τη συζήτηση, πάτησε το διακριτικό Next πάνω δεξιά.</p>
            </div>
          )
        )}

        {/* ═══ ΤΕΛΕΥΤΑΙΑ ΔΙΑΤΡΟΦΗ ═══ */}
        {screen === 'lastplan' && (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10, marginBottom:16 }}>
              <div>
                <span style={S.kicker}>Ανασκόπηση</span>
                <h2 style={{ fontSize:24, fontWeight:800, margin:'6px 0 2px', letterSpacing:'-.02em' }}>Τελευταία διατροφή</h2>
                <p style={{ ...S.dim, fontSize:13, margin:0 }}>✓ θέλει και στην επόμενη · – ίσως μελλοντικά · ✗ να μην ξαναπροταθεί</p>
              </div>
              <button onClick={() => setPrefsOpen(true)} style={{ ...S.btn(false), display:'inline-flex', alignItems:'center', gap:8 }}>
                <Pencil style={{ width:14, height:14 }}/> Επεξεργασία διατροφικών προτιμήσεων
              </button>
            </div>

            {!lastPlan ? (
              <div style={{ ...S.card, textAlign:'center', padding:'40px 20px' }}>
                <p style={{ fontWeight:700, margin:'0 0 6px' }}>Δεν υπάρχει προηγούμενη διατροφή.</p>
                <p style={{ ...S.dim, fontSize:13, margin:0 }}>Πάτησε Next για να δεις προτεινόμενα γεύματα για την πρώτη του διατροφή.</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <p style={{ ...S.dim, fontSize:12.5, margin:0 }}>{lastPlan.title} · {lastPlan.date}</p>
                {(lastPlan.meal_sections || []).map(sec => (
                  <div key={sec.section_name} style={S.card}>
                    <p style={{ ...S.lbl, margin:'0 0 10px', color:ACC }}>{sec.section_name}{sec.time ? ` · ${sec.time}` : ''}</p>
                    {(sec.options || []).map(opt => {
                      const key = `${sec.section_name}::${opt.name}`;
                      const v = decisions[key] || 'maybe';
                      return (
                        <div key={key} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 0', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ margin:0, fontSize:14, fontWeight:700, opacity: v==='never'?0.45:1, textDecoration: v==='never'?'line-through':'none' }}>{opt.name}</p>
                            {opt.ingredients && <p style={{ ...S.dim, fontSize:11.5, margin:'2px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{opt.ingredients}</p>}
                          </div>
                          {[['keep',Check,'#22c55e'],['maybe',Minus,'#94a3b8'],['never',X,'#ef4444']].map(([val,Icon,col]) => (
                            <button key={val} onClick={() => setDecision(key, opt, sec.section_name, val)}
                              style={{ width:34, height:34, borderRadius:10, cursor:'pointer', display:'grid', placeItems:'center',
                                border:`1.6px solid ${v===val?col:'rgba(255,255,255,0.14)'}`,
                                background: v===val ? col+'26' : 'transparent' }}>
                              <Icon style={{ width:16, height:16, color: v===val?col:'rgba(255,255,255,0.4)' }}/>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ LOADING ═══ */}
        {screen === 'loading' && (
          <div style={{ minHeight:'62vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
            <Loader2 style={{ width:34, height:34, color:ACC, animation:'nmspin 1s linear infinite', marginBottom:22 }}/>
            <p style={{ fontSize:17, fontWeight:800, margin:'0 0 26px' }}>
              {loadingPhase === 0 ? 'Φόρτωση συνταγών από τη βάση δεδομένων…' : 'Φιλτράρισμα σύμφωνα με τις προσωπικές σας προτιμήσεις…'}
            </p>
            <div style={{ width:340, maxWidth:'80vw' }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ height:12, borderRadius:6, marginBottom:10, background:'rgba(255,255,255,0.06)', overflow:'hidden', position:'relative' }}>
                  <div style={{ position:'absolute', inset:0, background:`linear-gradient(90deg, transparent, ${ACC}33, transparent)`, animation:`nmshimmer 1.4s ${i*0.15}s ease-in-out infinite` }}/>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ ΕΠΙΛΟΓΗ ΓΕΥΜΑΤΩΝ ═══ */}
        {screen === 'picker' && (
          <div style={{ display:'grid', gridTemplateColumns:'290px 1fr', gap:16, alignItems:'start' }}>
            {/* cart */}
            <div style={{ ...S.card, position:'sticky', top:78, maxHeight:'78vh', overflowY:'auto' }}>
              <p style={{ ...S.lbl, margin:'0 0 4px' }}>Επιλεγμένα γεύματα</p>
              <p style={{ fontSize:22, fontWeight:800, margin:'0 0 12px' }}>{cart.length}</p>
              {cart.length === 0 && <p style={{ ...S.dim, fontSize:12.5, margin:0 }}>Κανένα ακόμα — διάλεξε από τη λίστα.</p>}
              {Object.entries(cart.reduce((acc, it) => { (acc[it.slot] = acc[it.slot] || []).push(it); return acc; }, {})).map(([slot, items]) => (
                <div key={slot} style={{ marginBottom:12 }}>
                  <p style={{ ...S.lbl, fontSize:9.5, color:ACC, margin:'0 0 6px' }}>{slot}</p>
                  {items.map(it => (
                    <div key={it.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px', borderRadius:10, background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.25)', marginBottom:6 }}>
                      <span style={{ flex:1, fontSize:12.5, fontWeight:600, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{it.name}</span>
                      <button onClick={() => setCart(p => p.filter(x => x.id !== it.id))} style={{ background:'transparent', border:'none', cursor:'pointer', padding:2 }}>
                        <X style={{ width:13, height:13, color:'rgba(255,255,255,0.5)' }}/>
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* δεκάδες */}
            <div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
                {slots.map(s => (
                  <button key={s} onClick={() => setActiveSlot(s)}
                    style={{ padding:'9px 15px', borderRadius:999, fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                      border:`1.5px solid ${activeSlot===s?ACC:'rgba(255,255,255,0.14)'}`,
                      background: activeSlot===s ? ACC+'22' : 'transparent', color: activeSlot===s ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                    {SLOT_META[s]?.emoji} {SLOT_META[s]?.label || s}
                    <span style={{ marginLeft:6, opacity:.6 }}>{cart.filter(c => c.slot === (SLOT_META[s]?.label || s)).length || ''}</span>
                  </button>
                ))}
                <button onClick={() => reroll(activeSlot)} disabled={rerolling[activeSlot]}
                  style={{ ...S.navBtn, marginLeft:'auto', opacity: rerolling[activeSlot] ? 0.6 : 1 }}>
                  {rerolling[activeSlot] ? <Loader2 style={{ width:13, height:13, animation:'nmspin 1s linear infinite' }}/> : <RotateCcw style={{ width:13, height:13 }}/>} Reroll δεκάδας
                </button>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:12, opacity: rerolling[activeSlot] ? 0.45 : 1, transition:'opacity .25s' }}>
                {(suggestions[activeSlot] || []).map(meal => {
                  const id = `ai::${activeSlot}::${meal.name}`;
                  const on = !!cart.find(x => x.id === id);
                  return (
                    <div key={id} style={{ ...S.card, padding:'14px 16px', borderColor: on ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.09)' }}>
                      <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ margin:0, fontSize:14.5, fontWeight:800 }}>{meal.name}</p>
                          <p style={{ ...S.dim, fontSize:12, margin:'5px 0 0', lineHeight:1.5 }}>{(meal.main_ingredients || []).join(' · ')}</p>
                          {(meal.calories || meal.protein) && (
                            <p style={{ fontSize:11, margin:'7px 0 0', color:'rgba(255,255,255,0.4)' }}>
                              {meal.calories ? `${meal.calories} kcal` : ''}{meal.calories && meal.protein ? ' · ' : ''}{meal.protein ? `${meal.protein}g πρωτεΐνη` : ''}
                            </p>
                          )}
                        </div>
                        <button onClick={() => togglePick(activeSlot, meal)}
                          style={{ width:38, height:38, borderRadius:'50%', cursor:'pointer', flexShrink:0, display:'grid', placeItems:'center', transition:'all .15s',
                            border:`1.8px solid ${on?'#22c55e':'rgba(255,255,255,0.25)'}`, background: on ? '#22c55e' : 'transparent' }}>
                          {on ? <Check style={{ width:18, height:18, color:'#06060b' }}/> : <Plus style={{ width:17, height:17, color:'rgba(255,255,255,0.6)' }}/>}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {!(suggestions[activeSlot] || []).length && (
                  <p style={{ ...S.dim, fontSize:13 }}>Καμία πρόταση για αυτή την κατηγορία — δοκίμασε Reroll.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ ΣΥΝΟΨΗ ═══ */}
        {screen === 'summary' && (
          <div>
            <span style={S.kicker}>Σύνοψη ραντεβού</span>
            <h2 style={{ fontSize:26, fontWeight:800, margin:'8px 0 18px', letterSpacing:'-.02em' }}>Ωραία δουλειά, {client.name?.split(' ')[0]} 💪</h2>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, alignItems:'start' }}>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={S.card}>
                  <p style={{ ...S.lbl, margin:'0 0 12px' }}>Σημερινές μετρήσεις</p>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
                    {[['weight_kg','Βάρος','kg'],['muscle_mass_kg','Μυς','kg'],['body_fat_pct','Λίπος','%'],['body_water_pct','Νερό','%']].map(([k,l,u]) => (
                      <div key={k} style={{ background:'rgba(0,0,0,0.3)', borderRadius:12, padding:'10px 13px', border:'1px solid rgba(255,255,255,0.07)' }}>
                        <p style={{ ...S.lbl, fontSize:9.5, margin:'0 0 4px' }}>{l}</p>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <span style={{ fontSize:21, fontWeight:800 }}>{num(current?.[k]) ?? '—'}<span style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}> {u}</span></span>
                          <DeltaChip d={dlt(current, prev, k)} dir={goodDir(k, profile?.goal_type)}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={S.card}>
                  <p style={{ ...S.lbl, margin:'0 0 10px' }}>Γεύματα για την επόμενη διατροφή ({cart.length})</p>
                  {cart.length === 0 && <p style={{ ...S.dim, fontSize:12.5, margin:0 }}>Δεν επιλέχθηκαν γεύματα.</p>}
                  {Object.entries(cart.reduce((acc, it) => { (acc[it.slot] = acc[it.slot] || []).push(it); return acc; }, {})).map(([slot, items]) => (
                    <div key={slot} style={{ marginBottom:8 }}>
                      <p style={{ ...S.lbl, fontSize:9.5, color:ACC, margin:'0 0 5px' }}>{slot}</p>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        {items.map(it => <span key={it.id} style={{ fontSize:12, padding:'5px 10px', borderRadius:999, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)' }}>{it.name}</span>)}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ ...S.card, borderColor:`${ACC}44`, textAlign:'center', padding:'22px 20px' }}>
                  <p style={{ fontSize:15.5, fontWeight:700, fontStyle:'italic', margin:0, lineHeight:1.6, color:'#fff' }}>“{quote}”</p>
                </div>
              </div>

              {/* ραντεβού */}
              <div style={S.card}>
                <p style={{ ...S.lbl, margin:'0 0 10px', display:'flex', alignItems:'center', gap:7 }}><CalendarDays style={{ width:14, height:14, color:ACC }}/> Επόμενη διατροφική συνάντηση</p>
                {booked ? (
                  <div style={{ textAlign:'center', padding:'26px 10px' }}>
                    <span style={{ width:44, height:44, margin:'0 auto 12px', borderRadius:'50%', background:'#22c55e', display:'grid', placeItems:'center' }}><Check style={{ width:22, height:22, color:'#06060b' }}/></span>
                    <p style={{ fontWeight:800, fontSize:16, margin:'0 0 4px' }}>Κλείστηκε!</p>
                    <p style={{ ...S.dim, fontSize:13.5, margin:0 }}>{booked.date} · {booked.start_time} ({booked.duration_minutes}′)</p>
                    <p style={{ ...S.dim, fontSize:11.5, margin:'8px 0 0' }}>Αποθηκεύτηκε στο ημερολόγιό σου και στο ημερολόγιο του πελάτη.</p>
                  </div>
                ) : (
                  <div>
                    {/* μηνιαίο ημερολόγιο */}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                      <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} style={{ ...S.navBtn, padding:'5px 10px' }}>‹</button>
                      <span style={{ fontSize:13, fontWeight:800, letterSpacing:'.04em' }}>{calMonth.toLocaleDateString('el-GR', { month:'long', year:'numeric' })}</span>
                      <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} style={{ ...S.navBtn, padding:'5px 10px' }}>›</button>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:12 }}>
                      {['Δε','Τρ','Τε','Πε','Πα','Σα','Κυ'].map(d => <span key={d} style={{ ...S.lbl, fontSize:9, textAlign:'center' }}>{d}</span>)}
                      {(() => {
                        const first = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
                        const off = (first.getDay() + 6) % 7;
                        const dim = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
                        const cells = [];
                        for (let i = 0; i < off; i++) cells.push(<span key={'e'+i}/>);
                        for (let d = 1; d <= dim; d++) {
                          const ds = `${calMonth.getFullYear()}-${String(calMonth.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                          const isToday = ds === todayStr();
                          const past = ds < todayStr();
                          const sel = ds === selDay;
                          cells.push(
                            <button key={ds} disabled={past} onClick={() => pickDay(ds)}
                              style={{ aspectRatio:'1', borderRadius:9, fontSize:12, fontWeight:700, cursor: past?'default':'pointer', fontFamily:'inherit',
                                border: sel ? `1.6px solid ${ACC}` : isToday ? `1.4px dashed ${ACC}88` : '1px solid rgba(255,255,255,0.07)',
                                background: sel ? ACC+'2a' : 'transparent',
                                color: past ? 'rgba(255,255,255,0.2)' : '#fff' }}>
                              {d}
                            </button>
                          );
                        }
                        return cells;
                      })()}
                    </div>

                    {selDay && (
                      <div>
                        <p style={{ ...S.lbl, margin:'0 0 8px', display:'flex', alignItems:'center', gap:6 }}><Clock style={{ width:12, height:12 }}/> Προτεινόμενες ελεύθερες ώρες · {selDay}</p>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom:12 }}>
                          {freeSlots.length ? freeSlots.map(t => (
                            <button key={t} onClick={() => { setTimeCheck({ time:t, ok:true }); setConfirmTime(t); }}
                              style={{ padding:'8px 14px', borderRadius:999, fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit',
                                border:`1.5px solid ${confirmTime===t?ACC:'rgba(255,255,255,0.16)'}`, background: confirmTime===t?ACC+'22':'transparent', color:'#fff' }}>
                              {t}
                            </button>
                          )) : <span style={{ ...S.dim, fontSize:12.5 }}>Δεν βρέθηκαν ελεύθερες ώρες — δοκίμασε άλλη μέρα.</span>}
                        </div>
                        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                          <input type="time" value={manualTime} onChange={e => setManualTime(e.target.value)} style={{ ...S.inp, width:130 }}/>
                          <button onClick={() => checkTime(manualTime)} style={S.btn(false)}>Έλεγχος διαθεσιμότητας</button>
                        </div>
                        {timeCheck && !timeCheck.ok && (
                          <p style={{ color:'#f87171', fontSize:12.5, fontWeight:700, margin:'10px 0 0' }}>Η ώρα {timeCheck.time} ΔΕΝ είναι διαθέσιμη — υπάρχει ραντεβού που συγκρούεται (διάρκεια ~40′).</p>
                        )}
                        {confirmTime && (
                          <div style={{ marginTop:14, padding:'14px 16px', borderRadius:14, background:ACC+'14', border:`1px solid ${ACC}55` }}>
                            <p style={{ margin:'0 0 10px', fontSize:13.5, fontWeight:700 }}>Η ώρα {confirmTime} είναι ελεύθερη. Κλείσιμο ραντεβού {selDay} στις {confirmTime};</p>
                            <div style={{ display:'flex', gap:8 }}>
                              <button onClick={() => setConfirmTime('')} style={{ ...S.btn(false), flex:1 }}>Άκυρο</button>
                              <button onClick={book} style={{ ...S.btn(true), flex:1 }}>Ναι, κλείσε το</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={{ textAlign:'center', marginTop:26 }}>
              <button onClick={() => !finishing && finish()} style={{ ...S.btn(true), padding:'16px 44px', fontSize:15, boxShadow:`0 0 30px ${ACC}44`, opacity: finishing?0.6:1 }}>
                {finishing ? 'Αποθήκευση…' : 'Ολοκλήρωση'}
              </button>
              <p style={{ ...S.dim, fontSize:11.5, marginTop:10 }}>Οι επιλογές αποθηκεύονται στον φάκελο του πελάτη ως παραγγελία διατροφής.</p>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Modal προτιμήσεων ═══ */}
      {prefsOpen && profile && (
        <div style={{ position:'fixed', inset:0, zIndex:40, display:'grid', placeItems:'center', background:'rgba(0,0,0,0.65)', padding:20 }} onClick={() => setPrefsOpen(false)}>
          <div style={{ ...S.card, width:640, maxWidth:'94vw', maxHeight:'86vh', overflowY:'auto', background:'rgba(12,12,20,0.98)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <p style={{ fontSize:16, fontWeight:800, margin:0 }}>Διατροφικές προτιμήσεις — core επιλογές</p>
              <button onClick={() => setPrefsOpen(false)} style={{ background:'transparent', border:'none', cursor:'pointer' }}><X style={{ width:17, height:17, color:'rgba(255,255,255,0.6)' }}/></button>
            </div>
            <p style={{ ...S.dim, fontSize:12, margin:'0 0 14px' }}>Οι αλλαγές αποθηκεύονται αμέσως στην καρτέλα του πελάτη και θα καθορίσουν τις προτάσεις του επόμενου βήματος.</p>

            <p style={{ ...S.lbl, margin:'0 0 8px' }}>Γεύματα που τρώει</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
              {Object.keys(SLOT_META).map(k => {
                const on = (profile.meal_slots || []).includes(k);
                return (
                  <button key={k} onClick={() => updateProfile({ meal_slots: on ? profile.meal_slots.filter(x => x !== k) : [ ...(profile.meal_slots || []), k ] })}
                    style={{ padding:'8px 13px', borderRadius:999, fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                      border:`1.5px solid ${on?ACC:'rgba(255,255,255,0.15)'}`, background: on?ACC+'22':'transparent', color: on?'#fff':'rgba(255,255,255,0.55)' }}>
                    {SLOT_META[k].emoji} {SLOT_META[k].label}
                  </button>
                );
              })}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div>
                <p style={{ ...S.lbl, margin:'0 0 8px' }}>Του αρέσουν</p>
                <div style={{ display:'flex', gap:6 }}>
                  <input style={S.inp} value={likedInput} onChange={e => setLikedInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && likedInput.trim()) { updateProfile({ liked: Array.from(new Set([...(profile.liked||[]), likedInput.trim()])) }); setLikedInput(''); } }}
                    placeholder="γράψε και Enter"/>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:9 }}>
                  {(profile.liked || []).map(t => (
                    <span key={t} onClick={() => updateProfile({ liked: profile.liked.filter(x => x !== t) })}
                      style={{ padding:'5px 10px', borderRadius:999, fontSize:12, cursor:'pointer', background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.4)', color:'#86efac' }}>{t} ×</span>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ ...S.lbl, margin:'0 0 8px' }}>Δεν του αρέσουν</p>
                <input style={S.inp} value={dislikedInput} onChange={e => setDislikedInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && dislikedInput.trim()) { updateProfile({ disliked: Array.from(new Set([...(profile.disliked||[]), dislikedInput.trim()])) }); setDislikedInput(''); } }}
                  placeholder="γράψε και Enter"/>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:9 }}>
                  {(profile.disliked || []).map(t => (
                    <span key={t} onClick={() => updateProfile({ disliked: profile.disliked.filter(x => x !== t) })}
                      style={{ padding:'5px 10px', borderRadius:999, fontSize:12, cursor:'pointer', background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.4)', color:'#fca5a5' }}>{t} ×</span>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={() => setPrefsOpen(false)} style={{ ...S.btn(true), width:'100%', marginTop:18 }}>Έτοιμο</button>
          </div>
        </div>
      )}

      {/* ═══ Επιβεβαίωση εξόδου ═══ */}
      {exitConfirm && (
        <div style={{ position:'fixed', inset:0, zIndex:50, display:'grid', placeItems:'center', background:'rgba(0,0,0,0.7)' }} onClick={() => setExitConfirm(false)}>
          <div style={{ ...S.card, width:360, textAlign:'center', background:'rgba(12,12,20,0.98)' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize:17, fontWeight:800, margin:'0 0 6px' }}>Είστε σίγουροι;</p>
            <p style={{ ...S.dim, fontSize:13, margin:'0 0 18px' }}>Το meeting θα κλείσει χωρίς αποθήκευση.</p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setExitConfirm(false)} style={{ ...S.btn(false), flex:1 }}>Ακύρωση</button>
              <button onClick={() => navigate('/Nutrition')} style={{ ...S.btn(true), flex:1 }}>Ναι, έξοδος</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes nmspin{to{transform:rotate(360deg)}}
        @keyframes nmpulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.07);opacity:.7}}
        @keyframes nmfade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes nmshimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        .nmreveal{animation:nmrev .75s cubic-bezier(.22,1,.36,1) both}
        @keyframes nmrev{from{opacity:0;transform:translateY(16px) scale(.985)}to{opacity:1;transform:none}}
        .nmping{animation:nmping 1.8s ease-out infinite;transform-origin:center;transform-box:fill-box}
        @keyframes nmping{0%{transform:scale(1);opacity:.9}75%,100%{transform:scale(2.4);opacity:0}}
        @media (max-width: 900px){ [style*="grid-template-columns: 290px 1fr"]{ grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
