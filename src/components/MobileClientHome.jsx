import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, subDays, eachDayOfInterval, differenceInMonths, addMinutes } from 'date-fns';
import { el } from 'date-fns/locale';
import { Salad, TrendingUp, Droplet, Clock, Activity, Settings2, Check, X, Maximize2 } from 'lucide-react';
import { db } from '../lib/db';
import { useAppContext } from '../lib/AppContext';
import { useLang } from '../lib/LangContext';
import { useBarColors } from './BarbellNav';
import ClientLayout from './client-portal/ClientLayout';

const QUOTES = [
  'Strength doesn’t come from what you can do. It comes from overcoming what you couldn’t.',
  'Your only competition is who you were yesterday.',
  'Discipline is choosing what you want most over what you want now.',
  'Progress, not perfection.',
  'One session at a time. That is the whole secret.',
];

const WIDGETS = {
  next_session: { label:'Next Session',  icon:Clock,      color:'#06b6d4', sizes:[1,4] },
  weight:       { label:'Weight Trend',  icon:TrendingUp, color:'#22c55e', sizes:[1,2,4] },
  water:        { label:'Water Intake',  icon:Droplet,    color:'#38bdf8', sizes:[1,2]   },
  nutrition:    { label:'Nutrition',     icon:Salad,      color:'#84cc16', sizes:[4]     },
  consistency:  { label:'Consistency',   icon:Activity,   color:'#8b5cf6', sizes:[2,4]   },
};

const DEFAULT_SLOTS = [
  { w:'next_session', size:1 },
  { w:'water',        size:1 },
  { w:'weight',       size:2 },
  { w:'nutrition',    size:4 },
  { w:'consistency',  size:2 },
];
const STORAGE_KEY = 'cp_home_widgets_v3';
const ROW = 118;

// tint helper: '#rrggbb' → rgba(r,g,b,a)
const tint = (hex, a) => {
  const h = (hex || '').replace('#', '');
  if (h.length !== 6) return `rgba(255,255,255,${a})`;
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const pad    = { position:'absolute', inset:0, padding:13, display:'flex', flexDirection:'column' };
const lbl    = { fontSize:10.5, color:'var(--cp-text-dim)', fontWeight:600 };
const tick   = { fontSize:9, color:'var(--cp-text-dim)', fontWeight:600, letterSpacing:'.04em' };
const big    = { fontFamily:'var(--cp-font)', fontWeight:900, letterSpacing:'-.035em',
                 lineHeight:.9, color:'var(--cp-text)', fontVariantNumeric:'tabular-nums' };
const center = { display:'flex', alignItems:'center', justifyContent:'center' };
const ctrlBtn= { width:24, height:24, borderRadius:7, border:'none', cursor:'pointer',
                 background:'rgba(0,0,0,.62)', color:'#fff', display:'flex',
                 alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' };

function Ring({ pct, color, size = 66, stroke = 7, children }) {
  const r = (size - stroke * 2) / 2, C = 2 * Math.PI * r;
  return (
    <div style={{ position:'relative', width:size, height:size, flex:'0 0 auto' }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--cp-border)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct/100)}
          style={{ transition:'stroke-dashoffset .5s' }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, ...center }}>{children}</div>
    </div>
  );
}

function MiniBars({ data, color, height = 40, labels }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:3, height, width:'100%' }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center',
          gap:2, height:'100%', justifyContent:'flex-end' }}>
          <div style={{ width:'100%', height:`${Math.max(4,(v/max)*100)}%`, background:color,
            borderRadius:'3px 3px 0 0', opacity:i===data.length-1?1:0.5 }}/>
          {labels && <span style={{ fontSize:7, color:'var(--cp-text-dim)', fontWeight:600 }}>{labels[i]}</span>}
        </div>
      ))}
    </div>
  );
}

function Head({ color, icon:Icon, title, sub, right }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:9 }}>
      <div style={{ width:30, height:30, borderRadius:9, background:`${color}24`, ...center, flex:'0 0 auto' }}>
        <Icon style={{ width:16, height:16, color }}/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--cp-text)' }}>{title}</div>
        {sub ? <div style={tick}>{sub}</div> : null}
      </div>
      {right}
    </div>
  );
}

/* ── nutrition: persistent pills + swipeable meal cards ── */
function NutritionWidget({ plan, editMode }) {
  const navigate = useNavigate();
  const [sec, setSec] = useState(0);
  const [idx, setIdx] = useState(0);
  const [drag, setDrag] = useState(0);
  const start = useRef(null);
  const sections = plan?.meal_sections || [];
  const items = sections[sec]?.options || [];

  useEffect(() => { setIdx(0); }, [sec]);

  const down = (x) => { if (editMode) return; start.current = x; setDrag(0); };
  const move = (x) => { if (start.current === null) return; setDrag(x - start.current); };
  const up = () => {
    if (start.current === null) return;
    if (drag < -40 && idx < items.length - 1) setIdx(i => i + 1);
    else if (drag > 40 && idx > 0) setIdx(i => i - 1);
    start.current = null; setDrag(0);
  };
  const open = (m) => {
    if (editMode || Math.abs(drag) > 6) return;
    const q = new URLSearchParams({ name:m.name || '', ingredients:m.ingredients || '',
      calories:m.calories || '', protein:m.protein || '', carbs:m.carbs || '', fat:m.fat || '' });
    navigate(`/recipe?${q.toString()}`);
  };

  if (!sections.length) return (
    <div style={pad}>
      <Head color="#84cc16" icon={Salad} title="Πλάνο διατροφής"/>
      <div style={{ ...center, flex:1, ...lbl }}>Δεν έχει ανατεθεί πλάνο ακόμη</div>
    </div>
  );

  return (
    <div style={pad}>
      <Head color="#84cc16" icon={Salad} title="Πλάνο διατροφής"
        sub={plan.calories ? `${plan.calories.toLocaleString()} kcal` : ''}/>

      <div style={{ display:'flex', gap:5, marginBottom:2 }}>
        {sections.map((s, i) => (
          <button key={i} onClick={(e) => { e.stopPropagation(); setSec(i); }}
            style={{ flex:1, border:`1px solid ${i===sec ? 'rgba(132,204,22,.5)' : 'var(--cp-border)'}`,
              background: i===sec ? 'rgba(132,204,22,.16)' : 'rgba(255,255,255,.035)',
              color: i===sec ? '#bef264' : 'var(--cp-text-dim)',
              fontSize:9.5, fontWeight:700, letterSpacing:'.04em', padding:'7px 2px',
              borderRadius:9, cursor:'pointer', overflow:'hidden', textOverflow:'ellipsis',
              whiteSpace:'nowrap', transition:'.15s' }}>
            {(s.section_name || '').toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{ flex:1, position:'relative', overflow:'hidden', marginTop:9, borderRadius:13,
        touchAction:'pan-y' }}
        onTouchStart={e => down(e.touches[0].clientX)}
        onTouchMove={e => move(e.touches[0].clientX)}
        onTouchEnd={up}
        onPointerDown={e => down(e.clientX)}
        onPointerMove={e => start.current !== null && move(e.clientX)}
        onPointerUp={up} onPointerLeave={up}>
        <div style={{ display:'flex', height:'100%',
          transform:`translateX(calc(${-idx * 100}% + ${drag}px))`,
          transition: start.current === null ? 'transform .32s cubic-bezier(.22,1,.36,1)' : 'none' }}>
          {items.map((m, i) => (
            <div key={i} onClick={() => open(m)}
              style={{ flex:'0 0 100%', height:'100%', padding:'12px 13px', display:'flex',
                flexDirection:'column', justifyContent:'space-between', borderRadius:13,
                border:'1px solid var(--cp-border)', cursor:'pointer',
                background:'linear-gradient(140deg,rgba(132,204,22,.13),rgba(132,204,22,.03))' }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, lineHeight:1.3,
                  letterSpacing:'-.01em', color:'var(--cp-text)' }}>{m.name}</div>
                <div style={{ ...tick, marginTop:5 }}>
                  {m.protein ? `Π ${m.protein} · ` : ''}{m.carbs ? `Υ ${m.carbs} · ` : ''}{m.fat ? `Λ ${m.fat}` : ''}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
                <div><span style={{ ...big, fontSize:22 }}>{m.calories || '—'}</span><span style={lbl}> kcal</span></div>
                <span style={{ ...tick, color:'#bef264' }}>Άνοιγμα →</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'flex', gap:5, justifyContent:'center', paddingTop:9 }}>
        {items.map((_, i) => (
          <span key={i} style={{ width:i===idx ? 15 : 5, height:5, borderRadius:3,
            background:i===idx ? '#84cc16' : 'var(--cp-border)', transition:'.2s' }}/>
        ))}
      </div>
    </div>
  );
}

export default function MobileClientHome() {
  const { clientUser } = useAppContext();
  const navigate = useNavigate();
  const { lang } = useLang();
  const { accent } = useBarColors();
  const loc = lang === 'el' ? { locale: el } : undefined;

  const [d, setD] = useState({ client:null, appts:[], progress:[], plans:[], nutrition:[], water:null });
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [editMode, setEditMode] = useState(false);
  const [editSlot, setEditSlot] = useState(null);
  const [slots, setSlots] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(s) && s.length) {
        const ok = s.filter(x => WIDGETS[x?.w]).map(x => ({
          w:x.w, size: WIDGETS[x.w].sizes.includes(x.size) ? x.size : WIDGETS[x.w].sizes[0] }));
        if (ok.length) return ok;
      }
    } catch (e) {}
    return DEFAULT_SLOTS;
  });

  const today = format(new Date(), 'yyyy-MM-dd');

  const load = useCallback(async () => {
    if (!clientUser?.clientId) return;
    const cid = clientUser.clientId;
    const [c, a, prog, tp, np, wl] = await Promise.all([
      db.Client.get(cid),
      db.Appointment.filter({ client_id:cid }, 'date'),
      db.ClientProgress.filter({ client_id:cid }, 'date'),
      db.TrainingPlan.filter({ client_id:cid }, '-date', 10),
      db.NutritionPlan.filter({ client_id:cid }, '-date', 1),
      db.WaterLog.filter({ client_id:cid, date:today }),
    ]);
    setD({ client:c, appts:a, progress:prog, plans:tp, nutrition:np, water:wl[0] || null });
  }, [clientUser, today]);
  useEffect(() => { load(); }, [load]);

  const saveSlots = (n) => { setSlots(n); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); } catch (e) {} };
  const setSlotWidget = (i, key) => {
    const n = [...slots], allowed = WIDGETS[key].sizes;
    n[i] = { w:key, size: allowed.includes(n[i].size) ? n[i].size : allowed[0] };
    saveSlots(n); setEditSlot(null);
  };
  const cycleSize = (i) => {
    const n = [...slots], sizes = WIDGETS[n[i].w].sizes;
    n[i] = { ...n[i], size: sizes[(sizes.indexOf(n[i].size) + 1) % sizes.length] };
    saveSlots(n);
  };
  const removeSlot = (i) => { const n = slots.filter((_, k) => k !== i); saveSlots(n.length ? n : DEFAULT_SLOTS); };
  const addSlot = () => saveSlots([...slots, { w:'weight', size:1 }]);

  /* ── derived data ── */
  const upcoming = d.appts.filter(a => a.date >= today).sort((a, b) =>
    a.date === b.date ? (a.start_time || '').localeCompare(b.start_time || '') : a.date.localeCompare(b.date));
  const next = upcoming[0];
  const planForNext = next ? d.plans.find(p => p.date === next.date) : null;
  const sessName = (planForNext?.title || next?.title || '').replace(/^[^-–]+[-–]\s*/, '') || 'Προπόνηση';
  const endTime = (() => {
    if (!next?.start_time) return null;
    const [h, m] = next.start_time.split(':').map(Number);
    return format(addMinutes(new Date(2000, 0, 1, h, m), next.duration_minutes || 60), 'HH:mm');
  })();
  const exCount  = planForNext?.exercises?.length || 0;
  const setCount = (planForNext?.exercises || []).reduce((s, e) => s + (e.set_details?.length || e.sets || 0), 0);

  const wSeries = d.progress.filter(p => p.weight_kg != null);
  const wNow   = wSeries[wSeries.length - 1];
  const wPrev  = wSeries[wSeries.length - 2];
  const wStart = wSeries[0];
  const wLast3 = wSeries.slice(-3);
  const dLast = wNow && wPrev  ? +(wNow.weight_kg - wPrev.weight_kg).toFixed(1)  : null;
  const dAll  = wNow && wStart ? +(wNow.weight_kg - wStart.weight_kg).toFixed(1) : null;
  const target = d.client?.target_weight_kg ?? d.client?.goal_weight ?? null;
  const dCol = dLast == null ? 'var(--cp-text-dim)' : dLast < 0 ? '#22c55e' : dLast > 0 ? '#f59e0b' : 'var(--cp-text-dim)';

  const waterL    = d.water?.amount_liters || 0;
  const waterGoal = d.client?.water_goal_liters || 2.5;
  const waterPct  = Math.min(100, (waterL / waterGoal) * 100);
  const addWater = async (amt) => {
    if (editMode) return;
    if (d.water?.id) await db.WaterLog.update(d.water.id, { amount_liters:+(waterL + amt).toFixed(2) });
    else await db.WaterLog.create({ client_id:clientUser.clientId, date:today, amount_liters:amt });
    load();
  };

  const consistency = eachDayOfInterval({ start:subDays(new Date(), 6), end:new Date() }).map(dd => {
    const ds = format(dd, 'yyyy-MM-dd');
    return { v: d.appts.filter(a => a.date === ds && a.status === 'scheduled').length,
             label: format(dd, 'EEEEE', loc) };
  });

  /* ── renderers ── */
  const render = (key, size) => {
    switch (key) {

      case 'next_session': {
        const c = '#06b6d4';
        if (!next) return (
          <div style={pad}>
            <Head color={c} icon={Clock} title="Επόμενη προπόνηση"/>
            <div style={{ ...center, flex:1, ...lbl }}>Δεν υπάρχει προγραμματισμένη</div>
          </div>
        );
        const dt = parseISO(next.date);
        const isTomorrow = format(subDays(dt, 1), 'yyyy-MM-dd') === today;

        if (size === 1) return (
          <div onClick={() => !editMode && navigate('/client-training')}
            style={{ ...pad, flexDirection:'row', gap:11, alignItems:'center', cursor:'pointer' }}>
            <div style={{ flex:'0 0 auto', width:52, borderRadius:11, overflow:'hidden', border:`1px solid ${c}4d` }}>
              <div style={{ background:`${c}38`, color:'#67e8f9', fontSize:9, fontWeight:800,
                letterSpacing:'.12em', textAlign:'center', padding:'4px 0' }}>
                {format(dt, 'LLL', loc).toUpperCase()}
              </div>
              <div style={{ ...big, fontSize:24, textAlign:'center', padding:'5px 0 6px' }}>{format(dt, 'd')}</div>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ ...big, fontSize:16 }}>{next.start_time}</div>
              <div style={{ ...lbl, marginTop:1 }}>{format(dt, 'EEEE', loc)}</div>
              <div style={{ ...tick, marginTop:6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {sessName}
              </div>
            </div>
          </div>
        );

        return (
          <div onClick={() => !editMode && navigate('/client-training')} style={{ ...pad, padding:0, cursor:'pointer' }}>
            <div style={{ padding:'14px 15px 12px', display:'flex', gap:13, alignItems:'flex-start' }}>
              <div style={{ flex:'0 0 auto', width:56, borderRadius:12, overflow:'hidden', border:`1px solid ${c}52` }}>
                <div style={{ background:`${c}38`, color:'#67e8f9', fontSize:9, fontWeight:800,
                  letterSpacing:'.12em', textAlign:'center', padding:'4px 0' }}>
                  {format(dt, 'LLL', loc).toUpperCase()}
                </div>
                <div style={{ ...big, fontSize:26, textAlign:'center', padding:'5px 0 7px' }}>{format(dt, 'd')}</div>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={tick}>
                  {next.date === today ? 'ΣΗΜΕΡΑ' : isTomorrow ? 'ΑΥΡΙΟ' : format(dt, 'd LLL', loc).toUpperCase()}
                  {' · '}{format(dt, 'EEEE', loc).toUpperCase()}
                </div>
                <div style={{ fontFamily:'var(--cp-font)', fontSize:17, fontWeight:800, lineHeight:1.2,
                  letterSpacing:'-.02em', marginTop:3, color:'var(--cp-text)', overflow:'hidden',
                  display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{sessName}</div>
                <div style={{ ...big, fontSize:13, color:'#22d3ee', marginTop:4 }}>
                  {next.start_time}{endTime ? ` – ${endTime}` : ''}
                </div>
              </div>
            </div>

            <div style={{ position:'relative', height:1, margin:'2px 0' }}>
              <div style={{ position:'absolute', left:14, right:14, top:0, height:1,
                background:'repeating-linear-gradient(90deg,var(--cp-border) 0 5px,transparent 5px 11px)' }}/>
              <div style={{ position:'absolute', left:-7, top:-7, width:14, height:14, borderRadius:'50%', background:'var(--cp-bg)' }}/>
              <div style={{ position:'absolute', right:-7, top:-7, width:14, height:14, borderRadius:'50%', background:'var(--cp-bg)' }}/>
            </div>

            <div style={{ padding:'13px 15px 14px', display:'flex', flexDirection:'column', flex:1 }}>
              <div style={{ display:'flex', gap:9 }}>
                {[['ΔΙΑΡΚΕΙΑ', `${next.duration_minutes || 60}′`],
                  ['ΑΣΚΗΣΕΙΣ', exCount || '—'],
                  ['ΣΕΤ', setCount || '—']].map(([k, v]) => (
                  <div key={k} style={{ flex:1, background:'rgba(255,255,255,.04)',
                    border:'1px solid var(--cp-border)', borderRadius:11, padding:'9px 10px' }}>
                    <div style={tick}>{k}</div>
                    <div style={{ ...big, fontSize:14, marginTop:2 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:'auto', display:'flex', alignItems:'center', gap:8, paddingTop:12 }}>
                <div style={{ width:24, height:24, borderRadius:'50%', ...center, color:'#fff',
                  background:`linear-gradient(135deg,${c},#1e3a5f)`,
                  fontFamily:'var(--cp-font)', fontSize:10, fontWeight:800 }}>
                  {(d.client?.name || '?').charAt(0)}
                </div>
                <span style={{ ...lbl, flex:1 }}>με τον προπονητή σου</span>
              </div>
            </div>
          </div>
        );
      }

      case 'weight': {
        const c = '#22c55e';
        if (!wNow) return (
          <div style={pad}>
            <Head color={c} icon={TrendingUp} title="Βάρος"/>
            <div style={{ ...center, flex:1, ...lbl }}>Καμία μέτρηση ακόμη</div>
          </div>
        );

        if (size === 1) return (
          <div onClick={() => !editMode && navigate('/client-stats')} style={{ ...pad, cursor:'pointer' }}>
            <span style={tick}>ΠΡΟΗΓΟΥΜΕΝΗ → ΤΩΡΑ</span>
            <div style={{ flex:1, display:'flex', alignItems:'center', gap:9 }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ ...big, fontSize:12, fontWeight:600, color:'var(--cp-text-dim)' }}>
                  {wPrev ? wPrev.weight_kg : '—'}
                </div>
                <div style={{ width:8, height:8, borderRadius:'50%',
                  border:'2px solid var(--cp-text-dim)', margin:'5px auto 0' }}/>
              </div>
              <div style={{ flex:1, height:2, borderRadius:2, marginTop:14,
                background:`linear-gradient(90deg,var(--cp-border),${c})` }}/>
              <div style={{ textAlign:'center' }}>
                <div style={{ ...big, fontSize:15, color:c }}>{wNow.weight_kg}</div>
                <div style={{ width:10, height:10, borderRadius:'50%', background:c,
                  margin:'4px auto 0', boxShadow:`0 0 0 4px ${c}2e` }}/>
              </div>
            </div>
            {dLast != null && (
              <span style={{ alignSelf:'flex-start', ...big, fontSize:11, color:dCol,
                background:`${dCol}22`, padding:'3px 8px', borderRadius:999 }}>
                {dLast > 0 ? '+' : ''}{dLast} kg
              </span>
            )}
          </div>
        );

        if (size === 2) {
          const vals = [wPrev?.weight_kg ?? wNow.weight_kg, wNow.weight_kg];
          const mn = Math.min(...vals), mx = Math.max(...vals), rg = (mx - mn) || 1;
          const y = v => 26 + (1 - (v - mn) / rg) * 36;
          return (
            <div onClick={() => !editMode && navigate('/client-stats')}
              style={{ ...pad, flexDirection:'row', alignItems:'stretch', gap:14, cursor:'pointer' }}>
              <div style={{ display:'flex', flexDirection:'column', justifyContent:'space-between', flex:'0 0 auto' }}>
                <span style={tick}>ΒΑΡΟΣ</span>
                <div>
                  <div style={{ ...big, fontSize:26, color:dCol }}>
                    {dLast > 0 ? '+' : ''}{dLast ?? '—'}<span style={{ fontSize:12, opacity:.7 }}>kg</span>
                  </div>
                  <div style={lbl}>
                    {wPrev ? format(parseISO(wPrev.date), 'd LLL', loc) : '—'} → {format(parseISO(wNow.date), 'd LLL', loc)}
                  </div>
                </div>
              </div>
              <div style={{ flex:1, position:'relative' }}>
                <svg viewBox="0 0 190 94" preserveAspectRatio="none" style={{ width:'100%', height:'100%' }}>
                  <defs><linearGradient id="wsg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={c} stopOpacity=".3"/><stop offset="1" stopColor={c} stopOpacity="0"/>
                  </linearGradient></defs>
                  <line x1="0" y1="86" x2="190" y2="86" stroke="var(--cp-border)"/>
                  <path d={`M16 ${y(vals[0])} L174 ${y(vals[1])} L174 86 L16 86 Z`} fill="url(#wsg)"/>
                  <path d={`M16 ${y(vals[0])} L174 ${y(vals[1])}`} stroke={c} strokeWidth="2.4" strokeLinecap="round" fill="none"/>
                  <circle cx="16" cy={y(vals[0])} r="4" fill="var(--cp-card-bg)" stroke={c} strokeWidth="2.4"/>
                  <circle cx="174" cy={y(vals[1])} r="5" fill={c}/>
                </svg>
                <span style={{ position:'absolute', left:2, top:0, ...big, fontSize:10.5,
                  fontWeight:600, color:'var(--cp-text-dim)' }}>{vals[0]}</span>
                <span style={{ position:'absolute', right:0, top:'36%', ...big, fontSize:12, color:c }}>{vals[1]}</span>
              </div>
            </div>
          );
        }

        const months = wStart ? Math.max(1, differenceInMonths(parseISO(wNow.date), parseISO(wStart.date))) : null;
        const railPct = (target != null && wStart && wStart.weight_kg !== target)
          ? Math.max(0, Math.min(100, ((wStart.weight_kg - wNow.weight_kg) / (wStart.weight_kg - target)) * 100))
          : 100;
        const b3 = wLast3.map(p => p.weight_kg);
        const bmn = Math.min(...b3), bmx = Math.max(...b3), brg = (bmx - bmn) || 1;
        return (
          <div onClick={() => !editMode && navigate('/client-stats')} style={{ ...pad, cursor:'pointer' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
              <div>
                <div style={tick}>ΣΥΝΟΛΙΚΗ ΠΡΟΟΔΟΣ</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:5, marginTop:4 }}>
                  <span style={{ ...big, fontSize:38,
                    color: dAll < 0 ? c : dAll > 0 ? '#f59e0b' : 'var(--cp-text)' }}>
                    {dAll > 0 ? '+' : ''}{dAll ?? '—'}
                  </span>
                  <span style={{ fontFamily:'var(--cp-font)', fontWeight:700, fontSize:14, color:c, opacity:.7 }}>kg</span>
                </div>
                {months && <div style={{ ...lbl, marginTop:2 }}>σε {months} {months === 1 ? 'μήνα' : 'μήνες'}</div>}
              </div>
              {dLast != null && (
                <span style={{ ...big, fontSize:11, color:dCol, background:`${dCol}22`,
                  padding:'3px 8px', borderRadius:999 }}>
                  {dLast > 0 ? '+' : ''}{dLast} τελευταία
                </span>
              )}
            </div>

            <div style={{ margin:'16px 0 4px' }}>
              <div style={{ height:7, borderRadius:7, background:'var(--cp-border)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${railPct}%`, borderRadius:7,
                  background:`linear-gradient(90deg,#15803d,${c})`, transition:'width .5s' }}/>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:7 }}>
                <div>
                  <div style={{ ...big, fontSize:11, fontWeight:700, color:'var(--cp-text-dim)' }}>
                    {wStart?.weight_kg ?? '—'}
                  </div>
                  <div style={tick}>έναρξη</div>
                </div>
                <div style={{ textAlign: target != null ? 'center' : 'right' }}>
                  <div style={{ ...big, fontSize:13, color:c }}>{wNow.weight_kg}</div>
                  <div style={tick}>σήμερα</div>
                </div>
                {target != null && (
                  <div style={{ textAlign:'right' }}>
                    <div style={{ ...big, fontSize:11, fontWeight:700, color:'var(--cp-text-dim)' }}>{target}</div>
                    <div style={tick}>στόχος</div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ height:1, background:'var(--cp-border)', margin:'12px 0 10px' }}/>
            <div style={{ ...tick, marginBottom:8 }}>ΤΕΛΕΥΤΑΙΕΣ {b3.length}</div>
            <div style={{ flex:1, display:'flex', alignItems:'flex-end', gap:8 }}>
              {wLast3.map((p, i) => {
                const isLast = i === wLast3.length - 1;
                return (
                  <div key={i} style={{ flex:1, textAlign:'center' }}>
                    <div style={{ height:22 + ((p.weight_kg - bmn) / brg) * 22, borderRadius:'5px 5px 2px 2px',
                      background: isLast ? `linear-gradient(180deg,${c},#15803d)` : 'rgba(255,255,255,.11)' }}/>
                    <div style={{ ...big, fontSize:9, marginTop:5,
                      color: isLast ? c : 'var(--cp-text-dim)', fontWeight: isLast ? 800 : 600 }}>
                      {p.weight_kg}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'water': {
        const c = '#38bdf8';
        const AddBtns = ({ compact }) => (
          <div style={{ display:'flex', gap:compact ? 4 : 5, marginTop:compact ? 10 : 0 }}>
            {[0.25, 0.5].map(a => (
              <button key={a} onClick={e => { e.stopPropagation(); addWater(a); }}
                style={{ flex:compact ? 1 : 'none', border:`1px solid ${c}66`, background:`${c}1f`,
                  color:'#7dd3fc', fontFamily:'var(--cp-font)', fontSize:10, fontWeight:800,
                  padding:compact ? '5px 0' : '6px 11px', borderRadius:8, cursor:'pointer' }}>
                +{a * 1000}
              </button>
            ))}
          </div>
        );

        if (size === 1) return (
          <div style={{ ...pad, flexDirection:'row', gap:12, alignItems:'center' }}>
            <Ring pct={waterPct} color={c} size={66} stroke={7}>
              <span style={{ ...big, fontSize:15 }}>{Math.round(waterPct)}<span style={{ fontSize:9 }}>%</span></span>
            </Ring>
            <div style={{ flex:1 }}>
              <div style={{ ...big, fontSize:15 }}>
                {waterL.toFixed(1)}<span style={{ fontSize:10, color:'var(--cp-text-dim)' }}> / {waterGoal} L</span>
              </div>
              <AddBtns compact/>
            </div>
          </div>
        );

        return (
          <div style={pad}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
                  <span style={{ ...big, fontSize:25 }}>{waterL.toFixed(1)}</span>
                  <span style={lbl}>/ {waterGoal} L</span>
                </div>
                <div style={{ ...tick, marginTop:2 }}>
                  {waterL >= waterGoal ? 'ο στόχος επιτεύχθηκε' : `μένουν ${(waterGoal - waterL).toFixed(1)} L σήμερα`}
                </div>
              </div>
              <AddBtns/>
            </div>
            <div style={{ marginTop:'auto', position:'relative', height:30, borderRadius:9,
              overflow:'hidden', background:'rgba(255,255,255,.055)', border:'1px solid var(--cp-border)' }}>
              <div style={{ position:'absolute', top:0, bottom:0, left:0, right:`${100 - waterPct}%`,
                overflow:'hidden', transition:'right .45s' }}>
                <svg viewBox="0 0 220 30" preserveAspectRatio="none" style={{ width:'100%', height:'100%' }}>
                  <defs><linearGradient id="wwv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#7dd3fc"/><stop offset="1" stopColor="#0369a1"/>
                  </linearGradient></defs>
                  <path d="M0 8 q14 -6 28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 V30 H0 Z" fill="url(#wwv)"/>
                </svg>
              </div>
              <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                ...big, fontSize:11, fontWeight:800, color:'var(--cp-text-dim)' }}>
                {Math.round(waterPct)}%
              </span>
            </div>
          </div>
        );
      }

      case 'nutrition':
        return <NutritionWidget plan={d.nutrition[0]} editMode={editMode}/>;

      case 'consistency': {
        const c = '#8b5cf6';
        const total = consistency.reduce((s, x) => s + x.v, 0);
        return (
          <div onClick={() => !editMode && navigate('/client-stats')} style={{ ...pad, cursor:'pointer' }}>
            <Head color={c} icon={Activity} title="Συνέπεια" sub="τελευταίες 7 ημέρες"
              right={<div style={{ textAlign:'right' }}>
                <div style={{ ...big, fontSize:size === 4 ? 22 : 18 }}>{total}</div>
                <div style={tick}>προπονήσεις</div>
              </div>}/>
            <div style={{ marginTop:'auto' }}>
              <MiniBars data={consistency.map(x => x.v)} color={c}
                height={size === 4 ? 66 : 40} labels={consistency.map(x => x.label)}/>
            </div>
          </div>
        );
      }

      default: return null;
    }
  };

  const span = (s) => s === 4 ? { gridColumn:'span 2', gridRow:'span 2' }
                    : s === 2 ? { gridColumn:'span 2' } : {};

  return (
    <ClientLayout title="">
      <div style={{ padding:'14px 14px 16px', minHeight:'100%' }}>

        <div style={{ position:'relative', overflow:'hidden', borderRadius:15, padding:'13px 15px',
          marginBottom:10,
          background:`linear-gradient(120deg,${tint(accent,.18)},${tint(accent,.04)})`,
          border:`1px solid ${tint(accent,.28)}` }}>
          <div style={{ position:'absolute', right:-16, top:-30, fontFamily:'Playfair Display,Georgia,serif',
            fontSize:96, lineHeight:1, color:tint(accent,.14), pointerEvents:'none' }}>”</div>
          <p style={{ position:'relative', margin:0, fontSize:14.5, fontWeight:600, lineHeight:1.5,
            letterSpacing:'-.005em', color:'var(--cp-text)', display:'-webkit-box',
            WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
            {quote}
          </p>
        </div>

        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:10 }}>
          <button onClick={() => setEditMode(v => !v)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:10,
              border:'none', cursor:'pointer', fontSize:11, fontWeight:700,
              background: editMode ? accent : 'var(--cp-card-alt)',
              color: editMode ? '#fff' : 'var(--cp-text-dim)' }}>
            {editMode ? <><Check style={{ width:13, height:13 }}/>Τέλος</>
                      : <><Settings2 style={{ width:13, height:13 }}/>Επεξεργασία</>}
          </button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gridAutoRows:`${ROW}px`,
          gap:10, gridAutoFlow:'dense', paddingBottom:4 }}>
          {slots.map((slot, i) => (
            <div key={i} style={{ position:'relative', ...span(slot.size),
              background:'var(--cp-card-bg)', border:'1px solid var(--cp-border)',
              borderRadius:18, overflow:'hidden',
              boxShadow: editMode ? `0 0 0 2px ${accent}55` : 'none',
              animation: editMode ? 'wiggle .3s ease-in-out infinite alternate' : 'none' }}>
              {render(slot.w, slot.size)}
              {editMode && (
                <div style={{ position:'absolute', top:6, right:6, display:'flex', gap:4, zIndex:3 }}>
                  {WIDGETS[slot.w].sizes.length > 1 && (
                    <button onClick={e => { e.stopPropagation(); cycleSize(i); }} style={ctrlBtn}>
                      <Maximize2 style={{ width:12, height:12 }}/>
                    </button>
                  )}
                  <button onClick={e => { e.stopPropagation(); setEditSlot(i); }} style={ctrlBtn}>
                    <Settings2 style={{ width:12, height:12 }}/>
                  </button>
                  <button onClick={e => { e.stopPropagation(); removeSlot(i); }}
                    style={{ ...ctrlBtn, background:'rgba(239,68,68,.9)' }}>
                    <X style={{ width:12, height:12 }}/>
                  </button>
                </div>
              )}
            </div>
          ))}
          {editMode && (
            <button onClick={addSlot}
              style={{ borderRadius:18, border:'2px dashed var(--cp-border)', background:'var(--cp-card-alt)',
                cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center',
                justifyContent:'center', gap:6, color:'var(--cp-text-dim)' }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--cp-border)',
                ...center, fontSize:20 }}>+</div>
              <span style={{ fontSize:11, fontWeight:600 }}>Προσθήκη</span>
            </button>
          )}
        </div>

        <style>{`@keyframes wiggle{from{transform:rotate(-.5deg)}to{transform:rotate(.5deg)}}
          @keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

        {editSlot !== null && (
          <>
            <div onClick={() => setEditSlot(null)}
              style={{ position:'fixed', inset:0, zIndex:80, background:'rgba(0,0,0,.55)', backdropFilter:'blur(3px)' }}/>
            <div style={{ position:'fixed', left:0, right:0, bottom:0, zIndex:81, background:'var(--cp-card-bg)',
              borderTopLeftRadius:24, borderTopRightRadius:24, borderTop:'1px solid var(--cp-border)',
              padding:'10px 16px calc(20px + env(safe-area-inset-bottom))',
              boxShadow:'0 -8px 40px rgba(0,0,0,.5)', animation:'sheetUp .26s cubic-bezier(.22,1,.36,1)',
              maxHeight:'75vh', overflowY:'auto' }}>
              <div style={{ width:38, height:4, borderRadius:4, background:'var(--cp-text-dim)',
                opacity:.4, margin:'4px auto 14px' }}/>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--cp-text)', margin:'0 0 4px', textAlign:'center' }}>
                Διάλεξε widget
              </p>
              <p style={{ fontSize:11, color:'var(--cp-text-dim)', margin:'0 0 14px', textAlign:'center' }}>
                Μετά πάτα ⤢ για μέγεθος
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {Object.entries(WIDGETS).map(([key, w]) => {
                  const Icon = w.icon, isCur = slots[editSlot]?.w === key;
                  return (
                    <button key={key} onClick={() => setSlotWidget(editSlot, key)}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:12, borderRadius:14,
                        border: isCur ? `2px solid ${w.color}` : '1px solid var(--cp-border)',
                        background: isCur ? `${w.color}22` : 'var(--cp-card-alt)',
                        cursor:'pointer', textAlign:'left' }}>
                      <div style={{ width:32, height:32, borderRadius:9, background:`${w.color}2e`,
                        ...center, flex:'0 0 auto' }}>
                        <Icon style={{ width:17, height:17, color:w.color }}/>
                      </div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:11.5, fontWeight:600, lineHeight:1.2, color:'var(--cp-text)' }}>{w.label}</div>
                        <div style={{ fontSize:9, color:'var(--cp-text-dim)', marginTop:1 }}>
                          {w.sizes.map(s => s === 1 ? 'S' : s === 2 ? 'M' : 'L').join(' · ')}
                        </div>
                      </div>
                      {isCur && <Check style={{ width:14, height:14, color:w.color, marginLeft:'auto', flex:'0 0 auto' }}/>}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setEditSlot(null)}
                style={{ width:'100%', marginTop:14, padding:12, borderRadius:14, border:'none',
                  background:'var(--cp-card-alt)', color:'var(--cp-text-dim)',
                  fontSize:14, fontWeight:600, cursor:'pointer' }}>
                Έτοιμο
              </button>
            </div>
          </>
        )}
      </div>
    </ClientLayout>
  );
}
