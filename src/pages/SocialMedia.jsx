import { useState, useEffect, useRef, useMemo } from 'react';
import { Instagram, Lock, LockOpen } from 'lucide-react';

/* ── Social Media — πιστή μεταφορά του Social module από το SLOT PRO backend ──
   Widgets: KPI×4 με sparklines 7ημ, ακτινικός δίσκος «Προβολές μήνα»,
   περιστρεφόμενη υδρόγειος «Κοινό ανά χώρα» (drag / lock / hover / spinTo),
   «Δημοσιεύσεις» με ταξινόμηση, canvas thumbnails και μπάρες μετρικών.
   Demo δεδομένα (seeded, σταθερά ανά μήνα) — με Instagram token στις
   Ρυθμίσεις εμφανίζεται κατάσταση σύνδεσης (τα ζωντανά θέλουν Graph API).   */

const AMBER = '#E8A34A';
const pad = n => String(n).padStart(2, '0');

/* ---------- demo δεδομένα v2 (ίδιος αλγόριθμος με SLOT PRO, fitness captions) ---------- */
function demoData() {
  const now = new Date(), Y = now.getFullYear(), M = now.getMonth();
  const monthKey = Y + '-' + pad(M + 1);
  try {
    const c = JSON.parse(localStorage.getItem('cube_social_v2') || 'null');
    if (c && c.v === 2 && c.month === monthKey) return c;
  } catch { /* noop */ }
  let r = 11; const rnd = () => ((r = (r * 48271) % 2147483647) / 2147483647);
  const dim = new Date(Y, M + 1, 0).getDate();
  const dayViews = [];
  for (let d = 1; d <= dim; d++) {
    const wd = new Date(Y, M, d).getDay();
    const base = wd === 0 ? 260 : wd === 6 ? 680 : 420 + wd * 40;
    dayViews.push(Math.round(base * (0.75 + rnd() * 0.6)));
  }
  const mk7 = base => Array.from({ length: 7 }, () => Math.round(base * (0.8 + rnd() * 0.5)));
  const kpi = {
    reach:     { total: Math.round(38000 + rnd() * 9000), s: mk7(1400) },
    followers: { total: Math.round(2800 + rnd() * 300),   s: mk7(9) },
    visits:    { total: Math.round(690 + rnd() * 160),    s: mk7(26) },
    clicks:    { total: Math.round(150 + rnd() * 70),     s: mk7(6) },
  };
  const countries = [
    { name: 'Ελλάδα', lat: 38.5, lon: 23.7, pct: 46 }, { name: 'Γερμανία', lat: 51.1, lon: 10.4, pct: 11 },
    { name: 'Ην. Βασίλειο', lat: 53.5, lon: -2.3, pct: 9 }, { name: 'ΗΠΑ', lat: 39.8, lon: -98.5, pct: 8 },
    { name: 'Ιταλία', lat: 42.5, lon: 12.5, pct: 7 }, { name: 'Γαλλία', lat: 46.6, lon: 2.2, pct: 6 },
    { name: 'Ολλανδία', lat: 52.2, lon: 5.3, pct: 4 }, { name: 'Σουηδία', lat: 62, lon: 15, pct: 3 },
    { name: 'Αυστραλία', lat: -25.3, lon: 133.8, pct: 2 },
  ];
  const caps = [
    ['Πρωινό HIIT group', 'reel'], ['Πριν / Μετά πελάτη', 'carousel'], ['Backstage στο studio', 'reel'],
    ['Νέο πρόγραμμα δύναμης', 'photo'], ['Ο χώρος μας', 'photo'], ['Τεχνική στο squat', 'reel'],
    ['Λεπτομέρεια εξοπλισμού', 'photo'], ['Ομαδική φωτό μελών', 'carousel'],
  ];
  const posts = caps.map((c, i) => {
    const views = Math.round(1200 + rnd() * 7800);
    const dt = new Date(now.getTime() - (i * 3 + 2) * 86400e3);
    return {
      cap: c[0], type: c[1], date: pad(dt.getDate()) + '/' + pad(dt.getMonth() + 1),
      views, reach: Math.round(views * (0.62 + rnd() * 0.25)),
      likes: Math.round(views * (0.05 + rnd() * 0.06)), com: Math.round(2 + rnd() * 26),
      saves: Math.round(2 + rnd() * 34), shares: Math.round(1 + rnd() * 18),
      seed: i * 7 + 3, warm: i % 2 === 0,
    };
  });
  const S = { v: 2, month: monthKey, dayViews, kpi, countries, posts };
  try { localStorage.setItem('cube_social_v2', JSON.stringify(S)); } catch { /* noop */ }
  return S;
}

/* ---------- υδρόγειος: στεριά, projection ---------- */
const LAND = [
  [[-168,66],[-140,70],[-90,70],[-60,60],[-55,48],[-65,44],[-75,35],[-81,25],[-97,26],[-105,20],[-117,32],[-125,40],[-130,55],[-168,60]],
  [[-81,10],[-60,5],[-50,0],[-35,-8],[-40,-22],[-53,-34],[-70,-52],[-72,-40],[-70,-18],[-77,-5]],
  [[-52,60],[-30,68],[-20,76],[-30,82],[-55,80],[-58,70]],
  [[-10,36],[-8,43],[-2,48],[2,51],[8,54],[15,55],[22,55],[28,50],[28,42],[26.5,39],[24,36],[21.5,36.5],[20.5,39],[16,38.5],[12,38],[3,43],[-6,37]],
  [[5,58],[12,66],[20,70],[28,71],[30,65],[20,60],[12,56]],
  [[-5,50],[-2,58],[1,52]],
  [[-17,15],[-5,35],[10,37],[32,31],[43,11],[51,10],[40,-5],[35,-25],[20,-35],[12,-18],[-8,5]],
  [[27,36],[35,37],[45,40],[60,45],[75,40],[70,25],[78,8],[88,22],[92,26],[98,8],[105,12],[110,20],[122,30],[122,40],[135,48],[142,54],[155,60],[178,65],[178,70],[140,73],[100,76],[70,72],[55,68],[40,66],[30,60],[25,50]],
  [[35,30],[48,30],[58,23],[55,17],[43,12]],
  [[130,31],[142,43],[145,44],[140,35]],
  [[114,-22],[130,-12],[142,-11],[153,-27],[146,-39],[129,-32],[115,-33]],
];
function inLand(lon, lat) {
  for (const poly of LAND) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
    }
    if (inside) return true;
  }
  return false;
}
let _dots = null;
function landDots() {
  if (_dots) return _dots;
  const D = [], N = 7000, ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, lat = Math.asin(y) * 180 / Math.PI, lon = ((i * ga * 180 / Math.PI) % 360) - 180;
    if (lat < -60) continue;
    if (inLand(lon, lat)) D.push([lon, lat]);
  }
  _dots = D; return D;
}
function proj(lon, lat, phi, R, cx, cy) {
  const la = lat * Math.PI / 180, lo = (lon - phi) * Math.PI / 180, tilt = 0.42;
  const x = Math.cos(la) * Math.sin(lo), y = Math.sin(la), z = Math.cos(la) * Math.cos(lo);
  const y2 = y * Math.cos(tilt) - z * Math.sin(tilt), z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
  return { x: cx + R * x, y: cy - R * y2, z: z2 };
}

/* ---------- «φωτογραφία» δημοσίευσης σε canvas (seeded) ---------- */
function drawPhoto(cv, seed, warm) {
  const ctx = cv.getContext && cv.getContext('2d'); if (!ctx) return;
  const W = cv.width = 116, H = cv.height = 116;
  let r = seed; const rnd = () => ((r = (r * 48271) % 2147483647) / 2147483647);
  const base = warm ? ['#3a2a1c', '#7a4a22', '#c98a3e'] : ['#16222c', '#25506a', '#4a8faf'];
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, base[0]); g.addColorStop(1, base[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 7; i++) {
    const x = rnd() * W, y = rnd() * H, rr = 14 + rnd() * 34;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, rr);
    rg.addColorStop(0, (warm ? 'rgba(240,190,110,' : 'rgba(140,200,235,') + (0.16 + rnd() * 0.2) + ')');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill();
  }
  const hl = ctx.createRadialGradient(W * 0.35, H * 0.3, 6, W * 0.35, H * 0.3, W * 0.75);
  hl.addColorStop(0, warm ? 'rgba(255,220,160,.35)' : 'rgba(190,230,255,.3)'); hl.addColorStop(1, 'rgba(0,0,0,.28)');
  ctx.fillStyle = hl; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = 'rgba(' + (rnd() < 0.5 ? '255,255,255' : '0,0,0') + ',' + (rnd() * 0.05) + ')';
    ctx.fillRect(rnd() * W, rnd() * H, 1, 1);
  }
}

/* ---------- KPI tile με sparkline 7 ημερών ---------- */
function KpiTile({ label, k }) {
  const s = k.s, d = s[6] - s[5], up = d >= 0, mx = Math.max(1, ...s);
  return (
    <div className="card p-4">
      <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-0.5" style={{ fontVariantNumeric: 'tabular-nums' }}>{k.total.toLocaleString('el-GR')}</p>
      <p className={`text-xs font-semibold mt-0.5 ${up ? 'text-emerald-600' : 'text-rose-500'}`}>{(up ? '▲ +' : '▼ ') + Math.abs(d).toLocaleString('el-GR')} · 7ημ</p>
      <div className="flex items-end gap-1 mt-2" style={{ height: 34 }}>
        {s.map((v, i) => (
          <i key={i} className="flex-1 rounded-sm" style={{
            height: Math.max(6, Math.round(v / mx * 100)) + '%',
            background: i === 6 ? AMBER : 'rgba(232,163,74,.35)',
          }} />
        ))}
      </div>
    </div>
  );
}

/* ---------- ακτινικός δίσκος «Προβολές μήνα» ---------- */
function MonthDial({ S }) {
  const dv = S.dayViews, dim = dv.length, mx = Math.max(...dv), tot = dv.reduce((a, b) => a + b, 0);
  const today = new Date().getDate();
  const MONTHS = ['Ιανουάριος','Φεβρουάριος','Μάρτιος','Απρίλιος','Μάιος','Ιούνιος','Ιούλιος','Αύγουστος','Σεπτέμβριος','Οκτώβριος','Νοέμβριος','Δεκέμβριος'];
  const C = 160, r0 = 52, r1 = 140;
  return (
    <div className="relative flex justify-center">
      <span className="absolute top-0 right-0 text-[11px] font-mono text-gray-400">{MONTHS[new Date().getMonth()]} {new Date().getFullYear()}</span>
      <svg viewBox="0 0 320 320" style={{ width: '100%', maxWidth: 330 }}>
        {[0.33, 0.66, 1].map(f => {
          const rr = r0 + (r1 - r0) * f;
          return (
            <g key={f}>
              <circle cx={C} cy={C} r={rr} fill="none" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2 4" />
              <text x={C} y={C - rr - 3} textAnchor="middle" fontSize="7.5" fill="#9ca3af" fontFamily="ui-monospace,monospace">{Math.round(mx * f).toLocaleString('el-GR')}</text>
            </g>
          );
        })}
        {dv.map((v, i) => {
          const a = (-90 + i / dim * 360) * Math.PI / 180;
          const rr = r0 + (v / mx) * (r1 - r0 - 8);
          const x0 = C + Math.cos(a) * r0, y0 = C + Math.sin(a) * r0, x1 = C + Math.cos(a) * rr, y1 = C + Math.sin(a) * rr;
          const isT = (i + 1) === today;
          const lx = C + Math.cos(a) * (r1 + 9), ly = C + Math.sin(a) * (r1 + 9);
          return (
            <g key={i}>
              <line x1={x0.toFixed(1)} y1={y0.toFixed(1)} x2={x1.toFixed(1)} y2={y1.toFixed(1)}
                stroke={isT ? AMBER : 'rgba(232,163,74,.45)'} strokeWidth={isT ? 5 : 3.6} strokeLinecap="round">
                <title>{(i + 1) + '/' + (new Date().getMonth() + 1) + ' — ' + v.toLocaleString('el-GR') + ' προβολές'}</title>
              </line>
              {((i + 1) % 5 === 0 || i === 0) && (
                <text x={lx.toFixed(1)} y={ly.toFixed(1)} textAnchor="middle" dominantBaseline="middle" fontSize="7.5" fill="#9ca3af" fontFamily="ui-monospace,monospace">{i + 1}</text>
              )}
            </g>
          );
        })}
        <text x={C} y={C - 6} textAnchor="middle" fontSize="22" fontWeight="600" fill="#111827" fontFamily="ui-monospace,monospace">{tot.toLocaleString('el-GR')}</text>
        <text x={C} y={C + 14} textAnchor="middle" fontSize="8.5" letterSpacing="2" fill="#6b7280">ΠΡΟΒΟΛΕΣ</text>
      </svg>
    </div>
  );
}

/* ---------- υδρόγειος + λίστα χωρών ---------- */
function AudienceGlobe({ S }) {
  const cvRef = useRef(null), tipRef = useRef(null);
  const phiRef = useRef(20), dragRef = useRef(null), spinRef = useRef(null), lockRef = useRef(false);
  const [lock, setLock] = useState(false);
  useEffect(() => { lockRef.current = lock; if (lock && tipRef.current) tipRef.current.hidden = true; }, [lock]);

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext && cv.getContext('2d'); if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = 260 * dpr; cv.height = 260 * dpr; cv.style.width = '260px'; cv.style.height = '260px';
    const R = 118 * dpr, cx = 130 * dpr, cy = 130 * dpr, dots = landDots();

    cv.onpointerdown = e => {
      if (lockRef.current) return;
      dragRef.current = { x: e.clientX, phi: phiRef.current }; spinRef.current = null;
      try { cv.setPointerCapture(e.pointerId); } catch { /* noop */ }
    };
    cv.onpointermove = e => {
      if (dragRef.current) { phiRef.current = dragRef.current.phi + (e.clientX - dragRef.current.x) * 0.45; return; }
      if (lockRef.current) return;
      const r = cv.getBoundingClientRect(), mx = (e.clientX - r.left) * dpr, my = (e.clientY - r.top) * dpr;
      let hit = null;
      S.countries.forEach(c => {
        const p = proj(c.lon, c.lat, phiRef.current, R, cx, cy);
        if (p.z > 0 && Math.hypot(p.x - mx, p.y - my) < 11 * dpr) hit = c;
      });
      const tip = tipRef.current; if (!tip) return;
      if (hit) {
        tip.hidden = false;
        tip.style.left = (e.clientX - r.left + 12) + 'px'; tip.style.top = (e.clientY - r.top - 6) + 'px';
        tip.innerHTML = '<b>' + hit.name + '</b> · ' + hit.pct + '% του κοινού';
      } else tip.hidden = true;
    };
    cv.onpointerup = () => { dragRef.current = null; };
    cv.onpointerleave = () => { if (tipRef.current) tipRef.current.hidden = true; };

    let raf = null, last = performance.now();
    const frame = t => {
      const dt = (t - last) / 1000; last = t;
      if (!dragRef.current && spinRef.current == null) phiRef.current += dt * (360 / 40); /* 40s / περιστροφή */
      if (spinRef.current != null) {
        let d = ((spinRef.current - phiRef.current + 540) % 360) - 180;
        if (Math.abs(d) < 0.4) { phiRef.current = spinRef.current; spinRef.current = null; }
        else phiRef.current += d * Math.min(1, dt * 4);
      }
      const phi = phiRef.current;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.beginPath(); ctx.arc(cx, cy, R + 2 * dpr, 0, 7);
      ctx.strokeStyle = 'rgba(150,150,150,.3)'; ctx.lineWidth = 1 * dpr; ctx.stroke();
      ctx.strokeStyle = 'rgba(150,150,150,.15)'; ctx.lineWidth = 0.7 * dpr;
      for (let lo = -150; lo <= 180; lo += 30) {
        ctx.beginPath(); let started = false;
        for (let la = -85; la <= 85; la += 4) {
          const p = proj(lo, la, phi, R, cx, cy);
          if (p.z > 0) { started ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); started = true; } else started = false;
        }
        ctx.stroke();
      }
      for (let la = -60; la <= 60; la += 30) {
        ctx.beginPath(); let started = false;
        for (let lo = -180; lo <= 180; lo += 4) {
          const p = proj(lo, la, phi, R, cx, cy);
          if (p.z > 0) { started ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); started = true; } else started = false;
        }
        ctx.stroke();
      }
      dots.forEach(d => {
        const p = proj(d[0], d[1], phi, R, cx, cy);
        if (p.z <= 0) return;
        ctx.globalAlpha = 0.25 + p.z * 0.65;
        ctx.fillStyle = '#8B857A';
        ctx.fillRect(p.x, p.y, 1.4 * dpr, 1.4 * dpr);
      });
      ctx.globalAlpha = 1;
      S.countries.forEach(c => {
        const p = proj(c.lon, c.lat, phi, R, cx, cy);
        if (p.z <= 0) return;
        const rr = (2 + Math.sqrt(c.pct) * 0.78) * dpr;
        ctx.shadowColor = 'rgba(232,163,74,.85)'; ctx.shadowBlur = 6 * dpr;
        ctx.fillStyle = AMBER; ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, 7); ctx.fill();
        ctx.shadowBlur = 0;
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { if (raf) cancelAnimationFrame(raf); cv.onpointerdown = cv.onpointermove = cv.onpointerup = cv.onpointerleave = null; };
  }, [S]);

  const mx = Math.max(...S.countries.map(c => c.pct));
  const spinTo = i => { if (lockRef.current) return; const c = S.countries[i]; if (c) spinRef.current = c.lon; };

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative select-none" style={{ width: 260, height: 260 }}>
        <canvas ref={cvRef} style={{ cursor: 'grab', touchAction: 'none' }} />
        <button onClick={() => setLock(l => !l)} title="Κλείδωμα υδρογείου"
          className={`absolute top-1 right-1 w-8 h-8 rounded-lg flex items-center justify-center border ${lock ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'}`}>
          {lock ? <Lock className="w-4 h-4" /> : <LockOpen className="w-4 h-4" />}
        </button>
        <div ref={tipRef} hidden className="absolute z-10 px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-xs pointer-events-none whitespace-nowrap shadow-lg" />
      </div>
      <div className="flex-1 min-w-[220px] space-y-1.5">
        {S.countries.map((c, i) => (
          <div key={c.name} onClick={() => spinTo(i)}
            className="grid items-center gap-2 cursor-pointer group" style={{ gridTemplateColumns: '90px 1fr 44px' }}>
            <span className="text-xs text-gray-600 truncate group-hover:text-gray-900">{c.name}</span>
            <span className="h-[7px] rounded-full bg-gray-100 overflow-hidden">
              <i className="block h-full rounded-full" style={{ width: (c.pct / mx * 100) + '%', background: `linear-gradient(90deg, ${AMBER}, #F5C36B)` }} />
            </span>
            <span className="text-xs font-mono text-gray-500 text-right">{c.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- δημοσιεύσεις με ταξινόμηση & ανάλυση ---------- */
const SORT_KEYS = [['views', 'Προβολές'], ['reach', 'Προσέγγιση'], ['likes', 'Likes'], ['saves', 'Αποθηκ.'], ['shares', 'Κοιν.']];
const TYPE_BADGE = { reel: 'REEL', carousel: 'ΚΑΡΟΥΖΕΛ', photo: 'ΦΩΤΟ' };

function PostsPanel({ S }) {
  const [sort, setSort] = useState('views');
  const P = S.posts.slice().sort((a, b) => b[sort] - a[sort]);
  const mx = Math.max(...P.map(p => p[sort]));
  const Met = ({ k, icon, val }) => (
    <span className={sort === k ? 'text-amber-600 font-semibold' : 'text-gray-500'}>{icon} <b className="font-semibold">{val}</b></span>
  );
  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-4">
        {SORT_KEYS.map(([k, l]) => (
          <button key={k} onClick={() => setSort(k)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${sort === k ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>{l}</button>
        ))}
      </div>
      <div className="space-y-3">
        {P.map(p => (
          <div key={p.cap} className="grid gap-3 items-start" style={{ gridTemplateColumns: '58px 1fr' }}>
            <div className="relative w-[58px] h-[58px] rounded-xl overflow-hidden border border-gray-100">
              <canvas width={116} height={116} style={{ width: 58, height: 58, display: 'block' }}
                ref={el => { if (el && el.dataset.drawn !== '1') { el.dataset.drawn = '1'; drawPhoto(el, p.seed, p.warm); } }} />
              <span className="absolute bottom-0.5 left-0.5 px-1 rounded text-[8px] font-bold tracking-wide bg-black/60 text-white">{TYPE_BADGE[p.type]}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900 truncate">{p.cap}</span>
                <span className="text-xs text-gray-400 font-mono">{p.date}</span>
              </div>
              <div className="flex gap-3 flex-wrap text-xs mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <Met k="views" icon="▶" val={p.views.toLocaleString('el-GR')} />
                <Met k="reach" icon="👁" val={p.reach.toLocaleString('el-GR')} />
                <Met k="likes" icon="♥" val={p.likes.toLocaleString('el-GR')} />
                <span className="text-gray-500">💬 <b className="font-semibold">{p.com}</b></span>
                <Met k="saves" icon="🔖" val={p.saves} />
                <Met k="shares" icon="↗" val={p.shares} />
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mt-1.5">
                <i className="block h-full rounded-full" style={{ width: Math.round(p[sort] / mx * 100) + '%', background: `linear-gradient(90deg, ${AMBER}, #F5C36B)` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- σελίδα ---------- */
export default function SocialMedia() {
  const S = useMemo(() => demoData(), []);
  const [igKey, setIgKey] = useState(() => { try { return (localStorage.getItem('studio_insta_key') || '').trim(); } catch { return ''; } });
  useEffect(() => {
    const onFocus = () => { try { setIgKey((localStorage.getItem('studio_insta_key') || '').trim()); } catch { /* noop */ } };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: 'linear-gradient(145deg,#f58529,#dd2a7b 55%,#8134af)' }}>
            <Instagram className="w-5 h-5" />
          </div>
          <div>
            <h1 className="page-title">Social Media</h1>
            <p className="page-subtitle">Στατιστικά, αναφορές &amp; ανάλυση δημοσιεύσεων</p>
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-6">
        {igKey
          ? 'Συνδεδεμένο Instagram token — τα ζωντανά δεδομένα απαιτούν το Graph API (ενεργοποιείται με το backend).'
          : 'Demo δεδομένα. Πρόσθεσε Instagram token στις Ρυθμίσεις → Ενσωματώσεις & API για ζωντανή σύνδεση.'}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiTile label="Προσέγγιση" k={S.kpi.reach} />
        <KpiTile label="Ακόλουθοι" k={S.kpi.followers} />
        <KpiTile label="Επισκέψεις προφίλ" k={S.kpi.visits} />
        <KpiTile label="Κλικ σε σύνδεσμο" k={S.kpi.clicks} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Προβολές μήνα</h3>
          <MonthDial S={S} />
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Κοινό ανά χώρα</h3>
          <AudienceGlobe S={S} />
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Δημοσιεύσεις</h3>
        <PostsPanel S={S} />
      </div>
    </div>
  );
}
