import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, differenceInDays, subDays, addMinutes,
         startOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, getDay } from 'date-fns';
import { el } from 'date-fns/locale';
import { Clock, CalendarDays, CalendarRange, LayoutGrid, CheckSquare, CreditCard,
         AlertTriangle, MessageCircle, Users, Inbox, Timer,
 } from 'lucide-react';
import { db } from '../lib/db';
import { groupDisplayName } from '../lib/groups';
import { useLang } from '../lib/LangContext';
import WidgetBoard, { useSlots } from './WidgetBoard';

/* ── Λειτουργικά κουμπιά widgets: πραγματική έναρξη & στοχευμένο μήνυμα ── */
async function launchNextWorkout(navigate, next, nextPlan) {
  try {
    if (nextPlan?.group_session_id && nextPlan.group_id) {
      const g = await db.Group.get(nextPlan.group_id);
      const mem = [];
      for (const id of g?.member_ids || []) { const c = await db.Client.get(id); if (c) mem.push(c); }
      const ps = await db.TrainingPlan.filter({ group_session_id: nextPlan.group_session_id });
      const ordered = mem.map(m => ps.find(x => x.client_id === m.id)).filter(Boolean);
      const extra = ps.filter(x => !mem.find(m => m.id === x.client_id));
      navigate('/group-training', { state: { plans: [...ordered, ...extra], members: mem, groupName: groupDisplayName(g, mem) } });
      return;
    }
    if (nextPlan) { navigate('/live-training', { state: { plan: nextPlan, clientName: nextPlan.client_name || next?.client_name || '' } }); return; }
    if (next?.group_id) { navigate('/TrainingPlans', { state: { openGroup: next.group_id } }); return; }
    if (next?.client_id) { navigate('/TrainingPlans', { state: { openClient: next.client_id } }); return; }
    navigate('/TrainingPlans');
  } catch (e) { navigate('/TrainingPlans'); }
}
const msgStateFor = (apptOrMsg) => apptOrMsg?.group_id
  ? { openThread: { type:'group', id: apptOrMsg.group_id } }
  : (apptOrMsg?.thread_type === 'group'
      ? { openThread: { type:'group', id: apptOrMsg.thread_id } }
      : { openThread: { type:'client', id: apptOrMsg?.client_id } });

import { useBarColors } from './BarbellNav';

const WIDGETS = {
  next_appt: { label:'Επόμενο ραντεβού', icon:Clock,        color:'#06b6d4', sizes:[1,4]   },
  agenda:    { label:'Ατζέντα ημέρας',   icon:CalendarDays, color:'#3b82f6', sizes:[2,4]   },
  day_load:  { label:'Φόρτος ημέρας',    icon:Timer,        color:'#0ea5e9', sizes:[2]     },
  week:      { label:'Εβδομάδα',         icon:CalendarRange,color:'#3b82f6', sizes:[2,4]   },
  month:     { label:'Μήνας',            icon:LayoutGrid,   color:'#6366f1', sizes:[4]     },
  todo:      { label:'Εκκρεμότητες',     icon:CheckSquare,  color:'#f59e0b', sizes:[1,2,4] },
  revenue:   { label:'Οικονομικά',       icon:CreditCard,   color:'#22c55e', sizes:[2,4]   },
  attention: { label:'Χρειάζονται προσοχή', icon:AlertTriangle, color:'#ef4444', sizes:[2,4] },
  messages:  { label:'Μηνύματα',         icon:MessageCircle,color:'#a855f7', sizes:[1,2]   },
  roster:    { label:'Πελατολόγιο',      icon:Users,        color:'#8b5cf6', sizes:[1]     },
  requests:  { label:'Αιτήματα',         icon:Inbox,        color:'#3b82f6', sizes:[1,2]   },
  hours:     { label:'Ώρες εβδομάδας',   icon:Timer,        color:'#06b6d4', sizes:[1]     },
};

const DEFAULT_SLOTS = [
  { w:'next_appt', size:1 },
  { w:'todo',      size:1 },
  { w:'agenda',    size:4 },
  { w:'attention', size:2 },
  { w:'revenue',   size:2 },
];
const STORAGE_KEY = 'cube_home_widgets_v3';
const ROW = 118;

const pad    = { position:'absolute', inset:0, padding:13, display:'flex', flexDirection:'column' };
const lbl    = { fontSize:10.5, color:'hsl(var(--muted-foreground))', fontWeight:600 };
const tick   = { fontSize:9, color:'hsl(var(--muted-foreground))', fontWeight:600, letterSpacing:'.04em' };
const big    = { fontFamily:'var(--font-display)', fontWeight:900, letterSpacing:'-.035em',
                 lineHeight:.9, color:'hsl(var(--foreground))', fontVariantNumeric:'tabular-nums' };
const center = { display:'flex', alignItems:'center', justifyContent:'center' };

const initials = (n) => (n || '?').trim().charAt(0).toUpperCase();
const avStyle = (size, c) => ({ width:size, height:size, borderRadius:'50%', ...center, flex:'0 0 auto',
  fontFamily:'var(--font-display)', fontWeight:800, fontSize:size * .42, color:'#fff',
  background:`linear-gradient(135deg,${c},#1e293b)` });

function Head({ color, icon:Icon, title, sub, right }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:9 }}>
      <div style={{ width:30, height:30, borderRadius:9, background:`${color}26`, ...center, flex:'0 0 auto' }}>
        <Icon style={{ width:16, height:16, color }}/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'hsl(var(--foreground))' }}>{title}</div>
        {sub ? <div style={tick}>{sub}</div> : null}
      </div>
      {right}
    </div>
  );
}

export default function MobileHome({ columns = 2, rowHeight = ROW, wide = false }) {
  const navigate = useNavigate();
  const { lang } = useLang();
  const { accent } = useBarColors();
  const loc = lang === 'el' ? { locale: el } : undefined;

  const [D, setD] = useState({ clients:[], appts:[], todos:[], payments:[], msgs:[], reqs:[], plans:[] });
  const [now, setNow] = useState(new Date());
  const [slots, saveSlots] = useSlots(STORAGE_KEY, DEFAULT_SLOTS, WIDGETS);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);

  const load = useCallback(async () => {
    const [c, a, t, p, m, r, pl] = await Promise.all([
      db.Client.list('name'),
      db.Appointment.list('date', 400),
      db.TodoItem.list('-created_date', 60),
      db.Payment.list('-paid_date', 200),
      db.Message?.filter?.({ sender:'client', read:false }).catch(() => []) || [],
      db.AppointmentRequest?.filter?.({ status:'pending' }).catch(() => []) || [],
      db.TrainingPlan?.list?.('-date', 60).catch(() => []) || [],
    ]);
    setD({ clients:c, appts:a, todos:t, payments:p, msgs:m || [], reqs:r || [], plans:pl || [] });
  }, []);
  useEffect(() => { load(); }, [load]);


  /* ── derived ── */
  const today = format(now, 'yyyy-MM-dd');
  const mins = now.getHours() * 60 + now.getMinutes();
  const toMin = (t) => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };

  const todayAppts = D.appts.filter(a => a.date === today)
    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  const upcoming = D.appts.filter(a => a.date > today || (a.date === today && toMin(a.start_time) >= mins))
    .sort((a, b) => a.date === b.date ? (a.start_time || '').localeCompare(b.start_time || '') : a.date.localeCompare(b.date));
  const next = upcoming[0];
  const nextIn = next ? (next.date === today ? toMin(next.start_time) - mins : null) : null;
  const nextClient = next ? D.clients.find(c => c.id === next.client_id) : null;
  const nextPlan = next ? D.plans.find(p => p.client_id === next.client_id && p.date === next.date)
                       || D.plans.find(p => p.client_id === next.client_id) : null;
  const nextEnd = next?.start_time
    ? format(addMinutes(new Date(2000, 0, 1, ...next.start_time.split(':').map(Number)), next.duration_minutes || 60), 'HH:mm')
    : null;

  const weekStart = startOfWeek(now, { weekStartsOn:1 });
  const weekDays = eachDayOfInterval({ start:weekStart, end:subDays(weekStart, -6) }).map(dd => {
    const ds = format(dd, 'yyyy-MM-dd');
    const list = D.appts.filter(a => a.date === ds);
    return { ds, d:dd, n:list.length, mins:list.reduce((s, a) => s + (a.duration_minutes || 60), 0),
             label:format(dd, 'EEEEE', loc), isToday:ds === today };
  });
  const weekTotal = weekDays.reduce((s, x) => s + x.n, 0);
  const weekHours = weekDays.reduce((s, x) => s + x.mins, 0) / 60;
  const todayHours = todayAppts.reduce((s, a) => s + (a.duration_minutes || 60), 0) / 60;

  const openTodos = D.todos.filter(t => !t.completed);
  const doneTodos = D.todos.length - openTodos.length;
  const dueRank = (t) => {
    if (!t.due_date) return 3;
    const d = differenceInDays(parseISO(t.due_date), now);
    return d < 0 ? 0 : d === 0 ? 1 : d <= 3 ? 2 : 3;
  };
  const sortedTodos = [...openTodos].sort((a, b) => dueRank(a) - dueRank(b));
  const dueText = (t) => {
    if (!t.due_date) return '—';
    const d = differenceInDays(parseISO(t.due_date), now);
    return d < 0 ? 'έληξε' : d === 0 ? 'σήμερα' : d === 1 ? 'αύριο' : format(parseISO(t.due_date), 'd LLL', loc);
  };
  const dueColor = (t) => ['#ef4444', '#f59e0b', '#eab308', 'hsl(var(--muted-foreground))'][dueRank(t)];
  const toggleTodo = async (t) => { if (editMode) return; await db.TodoItem.update(t.id, { completed:!t.completed }); load(); };

  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const prevStart = format(startOfMonth(subDays(startOfMonth(now), 1)), 'yyyy-MM-dd');
  const prevEnd = format(subDays(startOfMonth(now), 1), 'yyyy-MM-dd');
  const paid = (p) => p.status !== 'pending' && p.status !== 'overdue';
  const monthRevenue = D.payments.filter(p => p.paid_date >= monthStart && paid(p)).reduce((s, p) => s + (p.amount || 0), 0);
  const prevRevenue = D.payments.filter(p => p.paid_date >= prevStart && p.paid_date <= prevEnd && paid(p)).reduce((s, p) => s + (p.amount || 0), 0);
  const revDelta = prevRevenue > 0 ? Math.round(((monthRevenue - prevRevenue) / prevRevenue) * 100) : null;
  const outstanding = D.payments.filter(p => !paid(p)).reduce((s, p) => s + (p.amount || 0), 0);
  const debtors = [...new Set(D.payments.filter(p => !paid(p)).map(p => p.client_name).filter(Boolean))];
  const revBars = Array.from({ length:6 }, (_, k) => {
    const dref = new Date(now.getFullYear(), now.getMonth() - (5 - k), 1);
    const s = format(startOfMonth(dref), 'yyyy-MM-dd'), e = format(endOfMonth(dref), 'yyyy-MM-dd');
    return { v:D.payments.filter(p => p.paid_date >= s && p.paid_date <= e && paid(p)).reduce((x, p) => x + (p.amount || 0), 0),
             label:format(dref, 'LLLLL', loc) };
  });

  /* attention queue — assembled from the data, nothing new stored */
  const attention = (() => {
    const out = [];
    D.payments.forEach(p => {
      if (!p.period_to) return;
      const d = differenceInDays(parseISO(p.period_to), now);
      if (d >= 0 && d <= 7) out.push({ k:'exp', name:p.client_name, why:`συνδρομή λήγει σε ${d}${d === 1 ? ' μέρα' : ' μέρες'}`,
        c:'#ef4444', id:p.client_id, rank:d });
    });
    D.clients.forEach(c => {
      const last = D.appts.filter(a => a.client_id === c.id && a.date <= today).sort((a, b) => b.date.localeCompare(a.date))[0];
      const hasNext = D.appts.some(a => a.client_id === c.id && a.date > today);
      if (hasNext) return;
      const gap = last ? differenceInDays(now, parseISO(last.date)) : null;
      if (gap != null && gap >= 10) out.push({ k:'idle', name:c.name, why:`καμία προπόνηση ${gap} μέρες`,
        c:'#f59e0b', id:c.id, rank:100 - gap });
    });
    D.msgs.forEach(m => out.push({ k:'msg', name:m.client_name || 'Πελάτης', why:'αναπάντητο μήνυμα',
      c:'#a855f7', id:m.client_id, rank:50 }));
    D.reqs.forEach(r => out.push({ k:'req', name:r.client_name || 'Πελάτης',
      why:`αίτημα ραντεβού${r.requested_date ? ' · ' + format(parseISO(r.requested_date), 'd LLL', loc) : ''}`,
      c:'#3b82f6', id:r.client_id, rank:20 }));
    return out.sort((a, b) => a.rank - b.rank);
  })();
  const attCounts = ['exp', 'idle', 'msg', 'req'].map(k => attention.filter(a => a.k === k).length);

  const activeClients = D.clients.filter(c => c.status !== 'inactive').length;

  /* ── renderers ── */
  const renderRef = (key, size, editMode) => {
    const W = WIDGETS[key], c = W.color;
    switch (key) {

      case 'next_appt': {
        if (!next) return (
          <div style={pad}><Head color={c} icon={Clock} title="Επόμενο ραντεβού"/>
            <div style={{ ...center, flex:1, ...lbl }}>Κανένα προγραμματισμένο</div></div>
        );
        const inTxt = nextIn == null ? format(parseISO(next.date), 'd LLL', loc).toUpperCase()
                    : nextIn <= 0 ? 'ΤΩΡΑ' : nextIn < 60 ? `ΣΕ ${nextIn}′` : `ΣΕ ${Math.round(nextIn / 60)}ω`;
        const noteTxt = nextClient?.notes || nextClient?.goals || '';

        if (size === 1) return (
          <div onClick={() => !editMode && navigate('/CalendarPage')} style={{ ...pad, cursor:'pointer' }}>
            <div style={{ display:'flex', alignItems:'center' }}>
              <div style={avStyle(30, c)}>{initials(next.client_name)}</div>
              <span style={{ ...tick, marginLeft:'auto' }}>{inTxt}</span>
            </div>
            <div style={{ marginTop:'auto' }}>
              <div style={{ ...big, fontSize:22 }}>{next.start_time}</div>
              <div style={{ fontSize:12, fontWeight:600, marginTop:3, color:'hsl(var(--foreground))',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{next.client_name}</div>
              {nextPlan && <div style={{ ...tick, marginTop:2, overflow:'hidden', textOverflow:'ellipsis',
                whiteSpace:'nowrap' }}>{nextPlan.title.replace(/^[^-–]+[-–]\s*/, '')}</div>}
            </div>
          </div>
        );

        return (
          <div style={pad}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={avStyle(44, c)}>{initials(next.client_name)}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:800,
                  letterSpacing:'-.02em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {next.client_name}
                </div>
                <div style={{ ...tick, marginTop:2 }}>{inTxt}
                  {next.date !== today ? ` · ${format(parseISO(next.date), 'EEEE d LLL', loc)}` : ''}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ ...big, fontSize:20 }}>{next.start_time}</div>
                <div style={tick}>{nextEnd ? `– ${nextEnd}` : ''}</div>
              </div>
            </div>
            <div style={{ height:1, background:'hsl(var(--border))', margin:'11px 0 10px' }}/>
            {noteTxt ? (
              <div style={{ background:`${c}18`, border:`1px solid ${c}40`, borderRadius:12, padding:'9px 11px' }}>
                <div style={{ ...tick, color:c }}>ΣΗΜΕΙΩΣΗ ΠΕΛΑΤΗ</div>
                <p style={{ margin:'4px 0 0', fontSize:12, lineHeight:1.45, color:'hsl(var(--foreground))',
                  display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                  {noteTxt}
                </p>
              </div>
            ) : nextPlan ? (
              <>
                <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:800 }}>
                  {nextPlan.title.replace(/^[^-–]+[-–]\s*/, '')}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5, marginTop:8, overflow:'hidden' }}>
                  {(nextPlan.exercises || []).slice(0, 3).map((e, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ ...tick, width:13 }}>{i + 1}</span>
                      <span style={{ fontSize:12, flex:1, overflow:'hidden', textOverflow:'ellipsis',
                        whiteSpace:'nowrap' }}>{e.name}</span>
                      <span style={tick}>{e.sets}×{e.reps}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
            <div style={{ display:'flex', gap:7, marginTop:'auto', paddingTop:10 }}>
              <button onClick={e => { e.stopPropagation(); if (!editMode) launchNextWorkout(navigate, next, nextPlan); }}
                style={{ flex:1, border:'none', borderRadius:10, padding:'9px 0', cursor:'pointer',
                  background:c, color:'#04222a', fontFamily:'var(--font-display)', fontSize:11, fontWeight:800 }}>
                ▶ ΕΝΑΡΞΗ
              </button>
              <button onClick={e => { e.stopPropagation(); if (!editMode && next) navigate('/Messages', { state: msgStateFor(next) }); }}
                style={{ border:'1px solid hsl(var(--border))', borderRadius:10, padding:'9px 13px',
                  cursor:'pointer', background:'transparent', color:'hsl(var(--muted-foreground))',
                  fontSize:11, fontWeight:700 }}>
                Μήνυμα
              </button>
            </div>
          </div>
        );
      }

      case 'agenda': {
        const shown = size === 4 ? 5 : 2;
        const tomorrow = format(subDays(now, -1), 'yyyy-MM-dd');
        const tomorrowN = D.appts.filter(a => a.date === tomorrow).length;
        return (
          <div onClick={() => !editMode && navigate('/CalendarPage')} style={{ ...pad, cursor:'pointer' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:9 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700 }}>Σήμερα</div>
                <div style={tick}>{format(now, 'EEEE d LLLL', loc)}</div>
              </div>
              <span style={{ ...big, fontSize:12, background:`${c}26`, color:c,
                padding:'4px 9px', borderRadius:999 }}>{todayAppts.length} ραντεβού</span>
            </div>
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:4, overflow:'hidden' }}>
              {todayAppts.length === 0 && <div style={{ ...center, flex:1, ...lbl }}>Κενή μέρα</div>}
              {todayAppts.slice(0, shown).map((a, i) => {
                const past = toMin(a.start_time) + (a.duration_minutes || 60) < mins;
                const live = !past && toMin(a.start_time) <= mins;
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, opacity:past ? .42 : 1,
                    background: live ? `${c}22` : 'transparent',
                    border: live ? `1px solid ${c}52` : '1px solid transparent',
                    borderRadius:9, padding: live ? '6px 8px' : '2px 0' }}>
                    <span style={{ ...tick, width:34, color: live ? c : undefined,
                      fontWeight: live ? 800 : 600 }}>{a.start_time}</span>
                    <div style={avStyle(20, live ? c : '#475569')}>{initials(a.client_name)}</div>
                    <span style={{ fontSize:12, flex:1, fontWeight: live ? 600 : 400,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.client_name}</span>
                    {past ? <span style={tick}>✓</span> : live ? <span style={{ ...tick, color:c }}>ΤΩΡΑ</span> : null}
                  </div>
                );
              })}
            </div>
            {size === 4 && (
              <>
                <div style={{ height:1, background:'hsl(var(--border))', margin:'8px 0 7px' }}/>
                <div style={{ display:'flex', alignItems:'center' }}>
                  <span style={tick}>ΑΥΡΙΟ</span>
                  <span style={{ ...tick, marginLeft:'auto' }}>
                    {tomorrowN ? `${tomorrowN} ραντεβού` : 'κενό'}
                  </span>
                </div>
              </>
            )}
          </div>
        );
      }

      case 'day_load': {
        const S = 8 * 60, E = 21 * 60, SPAN = E - S;
        const pos = (m) => Math.max(0, Math.min(100, ((m - S) / SPAN) * 100));
        return (
          <div onClick={() => !editMode && navigate('/CalendarPage')} style={{ ...pad, cursor:'pointer' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <span style={{ ...big, fontSize:20 }}>{todayAppts.length}</span>
                <span style={lbl}> ραντεβού σήμερα</span>
              </div>
              <span style={{ ...big, fontSize:11, background:`${c}26`, color:c,
                padding:'3px 8px', borderRadius:999 }}>{todayHours.toFixed(1)} ώρες</span>
            </div>
            <div style={{ marginTop:'auto' }}>
              <div style={{ position:'relative', height:22, borderRadius:7, overflow:'hidden',
                background:'hsl(var(--muted)/0.5)', border:'1px solid hsl(var(--border))' }}>
                {todayAppts.map((a, i) => {
                  const l = pos(toMin(a.start_time));
                  const wpc = Math.max(2, ((a.duration_minutes || 60) / SPAN) * 100);
                  return <div key={i} title={a.client_name} style={{ position:'absolute', left:`${l}%`,
                    width:`${wpc}%`, top:0, bottom:0, background:c, opacity:.8 }}/>;
                })}
                {mins >= S && mins <= E && (
                  <div style={{ position:'absolute', left:`${pos(mins)}%`, top:-2, bottom:-2,
                    width:2, background:'#f87171' }}/>
                )}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                <span style={tick}>08:00</span><span style={tick}>14:30</span><span style={tick}>21:00</span>
              </div>
            </div>
          </div>
        );
      }

      case 'week': {
        const maxN = Math.max(...weekDays.map(x => x.n), 1);
        return (
          <div onClick={() => !editMode && navigate('/CalendarPage')} style={{ ...pad, cursor:'pointer' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={tick}>ΑΥΤΗ ΤΗΝ ΕΒΔΟΜΑΔΑ</span>
              <span><span style={{ ...big, fontSize:17 }}>{weekTotal}</span><span style={lbl}> ραντεβού</span></span>
            </div>
            <div style={{ flex:1, display:'flex', alignItems:'flex-end', gap:6, marginTop:8 }}>
              {weekDays.map((d, i) => (
                <div key={i} style={{ flex:1, textAlign:'center' }}>
                  <div style={{ height:`${Math.max(4, (d.n / maxN) * 100)}%`, minHeight:4,
                    borderRadius:'4px 4px 2px 2px',
                    background: d.isToday ? `linear-gradient(180deg,${c},#1d4ed8)` : `${c}73` }}/>
                  <div style={{ ...tick, marginTop:4, color: d.isToday ? c : undefined,
                    fontWeight: d.isToday ? 800 : 600 }}>{d.label}</div>
                  {size === 4 && <div style={{ ...tick, marginTop:1 }}>{d.n || ''}</div>}
                </div>
              ))}
            </div>
            {size === 4 && (
              <>
                <div style={{ height:1, background:'hsl(var(--border))', margin:'9px 0 8px' }}/>
                <div style={{ display:'flex', alignItems:'center' }}>
                  <span style={tick}>ΣΥΝΟΛΟ</span>
                  <span style={{ ...tick, marginLeft:'auto' }}>{weekHours.toFixed(1)} ώρες προπόνησης</span>
                </div>
              </>
            )}
          </div>
        );
      }

      case 'month': {
        const ms = startOfMonth(now), me = endOfMonth(now);
        const lead = (getDay(ms) + 6) % 7;
        const days = eachDayOfInterval({ start:ms, end:me });
        const counts = days.map(dd => D.appts.filter(a => a.date === format(dd, 'yyyy-MM-dd')).length);
        const maxN = Math.max(...counts, 1);
        const total = counts.reduce((s, x) => s + x, 0);
        return (
          <div onClick={() => !editMode && navigate('/CalendarPage')} style={{ ...pad, cursor:'pointer' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:9 }}>
              <div style={{ fontSize:13, fontWeight:700 }}>{format(now, 'LLLL yyyy', loc)}</div>
              <span style={{ ...big, fontSize:11, background:`${c}26`, color:c,
                padding:'3px 8px', borderRadius:999 }}>{total} ραντεβού</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
              {['Δ','Τ','Τ','Π','Π','Σ','Κ'].map((d, i) =>
                <div key={i} style={{ ...tick, textAlign:'center', paddingBottom:2 }}>{d}</div>)}
              {Array.from({ length:lead }).map((_, i) => <div key={`e${i}`}/>)}
              {days.map((dd, i) => {
                const n = counts[i], isToday = format(dd, 'yyyy-MM-dd') === today;
                return (
                  <div key={i} style={{ aspectRatio:'1', borderRadius:5, ...center,
                    fontSize:9, fontWeight:700, fontVariantNumeric:'tabular-nums',
                    background: n ? `${c}${Math.round((0.18 + (n / maxN) * 0.6) * 255).toString(16).padStart(2, '0')}`
                                  : 'hsl(var(--muted)/0.35)',
                    color: isToday ? '#fff' : 'hsl(var(--muted-foreground))',
                    outline: isToday ? `1.5px solid ${c}` : 'none', outlineOffset:-1.5 }}>
                    {format(dd, 'd')}
                  </div>
                );
              })}
            </div>
            <div style={{ height:1, background:'hsl(var(--border))', margin:'auto 0 8px' }}/>
            <div style={{ display:'flex', alignItems:'center' }}>
              <span style={tick}>ΣΗΜΕΡΑ</span>
              <span style={{ ...tick, marginLeft:'auto' }}>
                {todayAppts.length} ραντεβού{next && next.date === today ? ` · επόμενο ${next.start_time}` : ''}
              </span>
            </div>
          </div>
        );
      }

      case 'todo': {
        if (size === 1) return (
          <div onClick={() => !editMode && navigate('/')} style={{ ...pad, cursor:'default' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ width:30, height:30, borderRadius:9, background:`${c}26`, ...center }}>
                <CheckSquare style={{ width:16, height:16, color:c }}/>
              </div>
              <span style={{ ...big, fontSize:24, color:c }}>{openTodos.length}</span>
            </div>
            <div style={{ marginTop:'auto' }}>
              <div style={lbl}>εκκρεμότητες</div>
              {sortedTodos[0] && (
                <div style={{ fontSize:11, marginTop:4, color:'hsl(var(--foreground))',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {sortedTodos[0].title}
                </div>
              )}
            </div>
          </div>
        );
        const shown = size === 4 ? 6 : 2;
        return (
          <div style={pad}>
            <Head color={c} icon={CheckSquare} title="Εκκρεμότητες"
              sub={`${doneTodos} από ${D.todos.length} ολοκληρωμένα`}
              right={<span style={{ ...big, fontSize:20, color:c }}>{openTodos.length}</span>}/>
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:7, overflow:'hidden' }}>
              {sortedTodos.slice(0, shown).map(t => (
                <div key={t.id} onClick={() => toggleTodo(t)}
                  style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer' }}>
                  <span style={{ width:3, alignSelf:'stretch', borderRadius:3, background:dueColor(t) }}/>
                  <span style={{ width:16, height:16, borderRadius:5, border:`2px solid ${c}`, flex:'0 0 auto' }}/>
                  <span style={{ fontSize:12.5, flex:1, lineHeight:1.3, overflow:'hidden',
                    textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</span>
                  <span style={{ ...tick, color:dueColor(t) }}>{dueText(t)}</span>
                </div>
              ))}
              {openTodos.length === 0 && <div style={{ ...center, flex:1, ...lbl }}>Όλα ολοκληρωμένα ✓</div>}
            </div>
            {openTodos.length > shown && <div style={{ ...tick, marginTop:7 }}>+{openTodos.length - shown} ακόμη</div>}
          </div>
        );
      }

      case 'revenue': {
        const maxV = Math.max(...revBars.map(b => b.v), 1);
        if (size === 2) return (
          <div onClick={() => !editMode && navigate('/Logistics')} style={{ ...pad, cursor:'pointer' }}>
            <div>
              <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                <span style={{ ...big, fontSize:25 }}>€{Math.round(monthRevenue).toLocaleString()}</span>
                {revDelta != null && (
                  <span style={{ ...big, fontSize:10, padding:'3px 7px', borderRadius:999,
                    background: revDelta >= 0 ? 'rgba(34,197,94,.18)' : 'rgba(239,68,68,.18)',
                    color: revDelta >= 0 ? '#4ade80' : '#f87171' }}>
                    {revDelta >= 0 ? '+' : ''}{revDelta}%
                  </span>
                )}
              </div>
              <div style={{ ...tick, marginTop:2 }}>
                {format(now, 'LLLL', loc)}{prevRevenue ? ` · έναντι €${Math.round(prevRevenue).toLocaleString()}` : ''}
              </div>
            </div>
            <div style={{ flex:1, display:'flex', alignItems:'flex-end', gap:4, marginTop:8 }}>
              {revBars.map((b, i) => (
                <div key={i} style={{ flex:1, height:`${Math.max(6, (b.v / maxV) * 100)}%`,
                  borderRadius:'3px 3px 0 0',
                  background: i === 5 ? `linear-gradient(180deg,${c},#15803d)` : `${c}59` }}/>
              ))}
            </div>
          </div>
        );
        const collectedPct = (monthRevenue + outstanding) > 0
          ? Math.round((monthRevenue / (monthRevenue + outstanding)) * 100) : 100;
        const r = 34, C = 2 * Math.PI * r;
        return (
          <div onClick={() => !editMode && navigate('/Logistics')} style={{ ...pad, cursor:'pointer' }}>
            <Head color={c} icon={CreditCard} title={format(now, 'LLLL', loc)} sub="μηνιαίος τζίρος"
              right={revDelta != null ? (
                <span style={{ ...big, fontSize:10, padding:'3px 7px', borderRadius:999,
                  background: revDelta >= 0 ? 'rgba(34,197,94,.18)' : 'rgba(239,68,68,.18)',
                  color: revDelta >= 0 ? '#4ade80' : '#f87171' }}>
                  {revDelta >= 0 ? '+' : ''}{revDelta}%
                </span>) : null}/>
            <div style={{ display:'flex', alignItems:'center', gap:15, marginTop:4 }}>
              <div style={{ position:'relative', width:84, height:84, flex:'0 0 auto' }}>
                <svg width="84" height="84" style={{ transform:'rotate(-90deg)' }}>
                  <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(245,158,11,.35)" strokeWidth="9"/>
                  <circle cx="42" cy="42" r={r} fill="none" stroke={c} strokeWidth="9" strokeLinecap="round"
                    strokeDasharray={C} strokeDashoffset={C * (1 - collectedPct / 100)}/>
                </svg>
                <div style={{ position:'absolute', inset:0, ...center, flexDirection:'column' }}>
                  <span style={{ ...big, fontSize:16 }}>{collectedPct}%</span>
                  <span style={tick}>εισπρ.</span>
                </div>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ width:8, height:8, borderRadius:2, background:c }}/>
                    <span style={tick}>ΕΙΣΠΡΑΧΘΗΚΑΝ</span>
                  </div>
                  <div style={{ ...big, fontSize:19, marginTop:2 }}>€{Math.round(monthRevenue).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ width:8, height:8, borderRadius:2, background:'#f59e0b' }}/>
                    <span style={tick}>ΕΚΚΡΕΜΟΥΝ</span>
                  </div>
                  <div style={{ ...big, fontSize:19, marginTop:2, color:'#f59e0b' }}>
                    €{Math.round(outstanding).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ height:1, background:'hsl(var(--border))', margin:'auto 0 8px' }}/>
            <div style={{ display:'flex', alignItems:'center' }}>
              <span style={tick}>{debtors.length ? `${debtors.length} ΜΕ ΟΦΕΙΛΗ` : 'ΚΑΜΙΑ ΟΦΕΙΛΗ'}</span>
              <span style={{ ...tick, marginLeft:'auto', color:'#fbbf24', overflow:'hidden',
                textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'62%' }}>
                {debtors.slice(0, 2).join(' · ')}{debtors.length ? ' →' : ''}
              </span>
            </div>
          </div>
        );
      }

      case 'attention': {
        if (size === 2) return (
          <div onClick={() => !editMode && navigate('/Clients')} style={{ ...pad, cursor:'pointer' }}>
            <Head color={c} icon={AlertTriangle} title="Χρειάζονται προσοχή"
              sub={attention.length ? `${attention.length} θέματα` : 'όλα εντάξει'}
              right={<span style={{ ...big, fontSize:20, color: attention.length ? c : undefined }}>
                {attention.length}</span>}/>
            <div style={{ marginTop:'auto' }}>
              {attention[0] ? (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={avStyle(22, attention[0].c)}>{initials(attention[0].name)}</div>
                  <span style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis',
                    whiteSpace:'nowrap' }}>{attention[0].name}</span>
                  <span style={{ ...tick, color:attention[0].c, marginLeft:'auto', overflow:'hidden',
                    textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'58%' }}>{attention[0].why}</span>
                </div>
              ) : <div style={lbl}>Τίποτα εκκρεμές ✓</div>}
            </div>
          </div>
        );
        return (
          <div onClick={() => !editMode && navigate('/Clients')} style={{ ...pad, cursor:'pointer' }}>
            <Head color={c} icon={AlertTriangle} title="Χρειάζονται προσοχή"
              sub="αυτόματα από τα δεδομένα"
              right={<span style={{ ...big, fontSize:20, color: attention.length ? c : undefined }}>
                {attention.length}</span>}/>
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6, overflow:'hidden' }}>
              {attention.slice(0, 4).map((a, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8,
                  background:`${a.c}17`, border:`1px solid ${a.c}3d`, borderRadius:10, padding:'7px 9px' }}>
                  <div style={avStyle(22, a.c)}>{initials(a.name)}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, overflow:'hidden',
                      textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.name}</div>
                    <div style={{ ...tick, color:a.c, overflow:'hidden', textOverflow:'ellipsis',
                      whiteSpace:'nowrap' }}>{a.why}</div>
                  </div>
                  <span style={{ ...tick, color:a.c }}>→</span>
                </div>
              ))}
              {attention.length === 0 && <div style={{ ...center, flex:1, ...lbl }}>Τίποτα εκκρεμές ✓</div>}
            </div>
            {attention.length > 4 && <div style={{ ...tick, marginTop:7 }}>+{attention.length - 4} ακόμη</div>}
          </div>
        );
      }

      case 'messages': {
        const first = D.msgs[0];
        if (size === 1) return (
          <div onClick={() => !editMode && navigate('/Messages')} style={{ ...pad, cursor:'pointer' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ width:30, height:30, borderRadius:9, background:`${c}26`, ...center }}>
                <MessageCircle style={{ width:16, height:16, color:c }}/>
              </div>
              <span style={{ ...big, fontSize:24, color:c }}>{D.msgs.length}</span>
            </div>
            <div style={{ marginTop:'auto' }}>
              <div style={lbl}>αδιάβαστα</div>
              {first && (
                <div style={{ fontSize:11, marginTop:4, color:'hsl(var(--foreground))',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {first.client_name}: {first.content}
                </div>
              )}
            </div>
          </div>
        );
        return (
          <div onClick={() => !editMode && navigate('/Messages')} style={{ ...pad, cursor:'pointer' }}>
            <Head color={c} icon={MessageCircle} title="Μηνύματα" sub="αδιάβαστα"
              right={<span style={{ ...big, fontSize:20, color:c }}>{D.msgs.length}</span>}/>
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:5, overflow:'hidden' }}>
              {D.msgs.slice(0, 2).map((m, i) => (
                <div key={i} onClick={e => { e.stopPropagation(); if (!editMode) navigate('/Messages', { state: msgStateFor(m) }); }} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                  <div style={avStyle(22, c)}>{initials(m.client_name)}</div>
                  <span style={{ fontSize:12, fontWeight:600 }}>{m.client_name}</span>
                  <span style={{ ...tick, flex:1, overflow:'hidden', textOverflow:'ellipsis',
                    whiteSpace:'nowrap' }}>{m.content}</span>
                </div>
              ))}
              {D.msgs.length === 0 && <div style={{ ...center, flex:1, ...lbl }}>Κανένα αδιάβαστο</div>}
            </div>
          </div>
        );
      }

      case 'roster': {
        const pct = D.clients.length ? (activeClients / D.clients.length) * 100 : 0;
        const r = 25, C = 2 * Math.PI * r;
        return (
          <div onClick={() => !editMode && navigate('/Clients')}
            style={{ ...pad, flexDirection:'row', gap:11, alignItems:'center', cursor:'pointer' }}>
            <div style={{ position:'relative', width:62, height:62, flex:'0 0 auto' }}>
              <svg width="62" height="62" style={{ transform:'rotate(-90deg)' }}>
                <circle cx="31" cy="31" r={r} fill="none" stroke="hsl(var(--muted)/0.6)" strokeWidth="6"/>
                <circle cx="31" cy="31" r={r} fill="none" stroke={c} strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)}/>
              </svg>
              <div style={{ position:'absolute', inset:0, ...center }}>
                <span style={{ ...big, fontSize:17 }}>{D.clients.length}</span>
              </div>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, fontWeight:700, color:c }}>{activeClients} ενεργοί</div>
              <div style={{ ...tick, marginTop:3 }}>{D.clients.length - activeClients} ανενεργοί</div>
            </div>
          </div>
        );
      }

      case 'requests': {
        const first = D.reqs[0];
        // Approving needs a proposed time/duration, so it opens the calendar flow.
        // Declining is a single field change and happens inline.
        const decline = async (r) => {
          if (editMode) return;
          await db.AppointmentRequest.update(r.id, { status:'declined' });
          load();
        };
        const when = (r) => r?.requested_date
          ? format(parseISO(r.requested_date), 'EEE d LLL', loc) : '';

        if (size === 1) return (
          <div style={pad}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ width:30, height:30, borderRadius:9, background:`${c}26`, ...center }}>
                <Inbox style={{ width:16, height:16, color:c }}/>
              </div>
              <span style={{ ...big, fontSize:24, color:c }}>{D.reqs.length}</span>
            </div>
            <div style={{ marginTop:'auto' }}>
              <div style={lbl}>αιτήματα ραντεβού</div>
              {first ? (
                <div style={{ display:'flex', gap:4, marginTop:7 }}>
                  <button onClick={e => { e.stopPropagation(); !editMode && navigate('/CalendarPage'); }}
                    style={{ flex:1, border:'none', borderRadius:7, padding:'5px 0', cursor:'pointer',
                      background:'rgba(34,197,94,.2)', color:'#4ade80',
                      fontFamily:'var(--font-display)', fontSize:9.5, fontWeight:800 }}>ΟΡΙΣΜΟΣ</button>
                  <button onClick={e => { e.stopPropagation(); decline(first); }}
                    style={{ flex:'0 0 auto', border:'none', borderRadius:7, padding:'5px 10px', cursor:'pointer',
                      background:'rgba(239,68,68,.18)', color:'#f87171',
                      fontFamily:'var(--font-display)', fontSize:9.5, fontWeight:800 }}>✕</button>
                </div>
              ) : <div style={{ ...tick, marginTop:5 }}>κανένα εκκρεμές</div>}
            </div>
          </div>
        );
        return (
          <div style={pad}>
            <Head color={c} icon={Inbox} title="Αιτήματα ραντεβού"
              right={<span style={{ ...big, fontSize:20, color:c }}>{D.reqs.length}</span>}/>
            <div style={{ marginTop:'auto' }}>
              {first ? (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={avStyle(24, c)}>{initials(first.client_name)}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, overflow:'hidden',
                      textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{first.client_name}</div>
                    <div style={{ ...tick, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {when(first)}{first.type ? ` · ${first.type}` : ''}
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); !editMode && navigate('/CalendarPage'); }}
                    style={{ border:'none', borderRadius:8, padding:'6px 11px', cursor:'pointer',
                      background:'rgba(34,197,94,.2)', color:'#4ade80',
                      fontFamily:'var(--font-display)', fontSize:10, fontWeight:800 }}>ΟΡΙΣΜΟΣ</button>
                  <button onClick={e => { e.stopPropagation(); decline(first); }}
                    style={{ border:'none', borderRadius:8, padding:'6px 10px', cursor:'pointer',
                      background:'rgba(239,68,68,.18)', color:'#f87171',
                      fontFamily:'var(--font-display)', fontSize:10, fontWeight:800 }}>✕</button>
                </div>
              ) : <div style={lbl}>Κανένα εκκρεμές αίτημα</div>}
            </div>
          </div>
        );
      }

      case 'hours':
        return (
          <div onClick={() => !editMode && navigate('/Statistics')} style={{ ...pad, cursor:'pointer' }}>
            <div style={{ width:30, height:30, borderRadius:9, background:`${c}26`, ...center }}>
              <Timer style={{ width:16, height:16, color:c }}/>
            </div>
            <div style={{ marginTop:'auto' }}>
              <div style={{ display:'flex', alignItems:'baseline', gap:3 }}>
                <span style={{ ...big, fontSize:26 }}>{weekHours.toFixed(weekHours % 1 ? 1 : 0)}</span>
                <span style={lbl}>ώρες</span>
              </div>
              <div style={{ ...tick, marginTop:3 }}>σε {weekTotal} ραντεβού · εβδομάδα</div>
            </div>
          </div>
        );

      default: return null;
    }
  };

  /* ══════════════ DESKTOP: fixed "bento" layout (real data, all themes) ══════════════ */
  if (wide) {
    const hr = now.getHours();
    const greeting = hr < 12 ? 'Καλημέρα' : hr < 18 ? 'Καλό απόγευμα' : 'Καλησπέρα';
    const col = { next:'#06b6d4', agenda:'#3b82f6', load:'#0ea5e9', hours:'#06b6d4',
      month:'#6366f1', todo:'#f59e0b', rev:'#22c55e', att:'#ef4444', msg:'#a855f7',
      roster:'#8b5cf6', req:'#3b82f6' };
    const inTxt = !next ? '' : nextIn == null ? format(parseISO(next.date), 'd LLL', loc).toUpperCase()
      : nextIn <= 0 ? 'ΤΩΡΑ' : nextIn < 60 ? `ΣΕ ${nextIn}′` : `ΣΕ ${Math.round(nextIn / 60)}ω`;
    const ms = startOfMonth(now), me = endOfMonth(now);
    const lead = (getDay(ms) + 6) % 7;
    const mDays = eachDayOfInterval({ start:ms, end:me });
    const mCounts = mDays.map(dd => D.appts.filter(a => a.date === format(dd, 'yyyy-MM-dd')).length);
    const mMax = Math.max(...mCounts, 1), mTotal = mCounts.reduce((s, x) => s + x, 0);
    const revMax = Math.max(...revBars.map(b => b.v), 1);
    const pts = revBars.map((b, i) => [ (i / Math.max(1, revBars.length - 1)) * 260, 56 - (b.v / revMax) * 46 ]);
    const rl = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(0) + ',' + p[1].toFixed(0)).join(' ');
    const wkMax = Math.max(...weekDays.map(x => x.n), 1);
    const wkHMax = Math.max(...weekDays.map(x => x.mins), 1);
    const dS = 8 * 60, dE = 21 * 60, dSpan = dE - dS;
    const dpos = (m) => Math.max(0, Math.min(100, ((m - dS) / dSpan) * 100));
    const declineReq = (r) => db.AppointmentRequest.update(r.id, { status:'declined' }).then(load).catch(() => {});

    const card = (extra) => ({ background:'hsl(var(--card))', border:'1px solid hsl(var(--border))',
      borderRadius:18, padding:'15px 16px', display:'flex', flexDirection:'column',
      minWidth:0, overflow:'hidden', position:'relative', ...extra });
    const go = (path) => () => navigate(path);
    const chip = (txt, color) => (
      <span style={{ fontFamily:'var(--font-display)', fontSize:10.5, fontWeight:800,
        letterSpacing:'.03em', color, background:`${color}20`, padding:'3px 9px', borderRadius:999 }}>{txt}</span>
    );
    const hR = ({ icon:Icon, title, color, right }) => (
      <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:11 }}>
        <span style={{ width:27, height:27, borderRadius:8, background:`${color}22`,
          display:'flex', alignItems:'center', justifyContent:'center', flex:'0 0 auto' }}>
          <Icon style={{ width:14, height:14, color }}/>
        </span>
        <span style={{ ...tick, fontSize:10.5, letterSpacing:'.11em', textTransform:'uppercase' }}>{title}</span>
        {right ? <span style={{ marginLeft:'auto' }}>{right}</span> : null}
      </div>
    );

    return (
      <div style={{ padding:'26px 30px 44px', maxWidth:1340, margin:'0 auto', minHeight:'100%' }}>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <div style={{ ...tick, fontSize:11, letterSpacing:'.28em' }}>{format(now, 'EEEE d LLLL', loc).toUpperCase()}</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:800, letterSpacing:'-.02em', marginTop:6, color:'hsl(var(--foreground))' }}>{greeting}</div>
          </div>
          <div style={{ ...tick, fontSize:12 }}>{format(now, 'HH:mm')}</div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(12,1fr)', gridAutoRows:'156px', gap:16 }}>

          {/* NEXT — hero */}
          <div onClick={go('/CalendarPage')} style={card({ gridColumn:'1/6', gridRow:'1/3', cursor:'pointer' })}>
            {hR({ icon:Clock, title:'Επόμενο ραντεβού', color:col.next, right: next ? chip(inTxt, col.next) : null })}
            {!next ? <div style={{ ...center, flex:1, ...lbl }}>Κανένα προγραμματισμένο</div> : (
              <div style={{ display:'flex', gap:18, flex:1, minHeight:0 }}>
                <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:11, marginBottom:12 }}>
                    <div style={avStyle(46, col.next)}>{initials(next.client_name)}</div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:800, letterSpacing:'-.01em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'hsl(var(--foreground))' }}>{next.client_name}</div>
                      <div style={{ ...tick, marginTop:3 }}>{next.date === today ? 'Σήμερα' : format(parseISO(next.date), 'EEEE d LLL', loc)}</div>
                    </div>
                  </div>
                  <div style={{ ...big, fontSize:34 }}>{next.start_time}</div>
                  <div style={{ ...tick, marginTop:4 }}>{nextEnd ? `– ${nextEnd} · ` : ''}{next.duration_minutes || 60} λεπτά</div>
                  <div style={{ display:'flex', gap:8, marginTop:'auto', paddingTop:12 }}>
                    <button onClick={e => { e.stopPropagation(); launchNextWorkout(navigate, next, nextPlan); }} style={{ flex:1, border:'none', borderRadius:10, padding:'10px 0', cursor:'pointer', background:col.next, color:'#04222a', fontFamily:'var(--font-display)', fontSize:11.5, fontWeight:800 }}>▶ ΕΝΑΡΞΗ</button>
                    <button onClick={e => { e.stopPropagation(); if (next) navigate('/Messages', { state: msgStateFor(next) }); }} style={{ border:'1px solid hsl(var(--border))', borderRadius:10, padding:'10px 16px', cursor:'pointer', background:'transparent', color:'hsl(var(--muted-foreground))', fontSize:11.5, fontWeight:600 }}>Μήνυμα</button>
                  </div>
                </div>
                <div style={{ flex:1, borderLeft:'1px solid hsl(var(--border))', paddingLeft:18, display:'flex', flexDirection:'column', minWidth:0 }}>
                  {nextPlan ? (<>
                    <div style={{ ...tick, color:col.next, marginBottom:7, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{nextPlan.title.replace(/^[^-–]+[-–]\s*/, '').toUpperCase()}</div>
                    {(nextPlan.exercises || []).slice(0, 4).map((e, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:9, fontSize:12.5, padding:'5px 0', borderBottom:'1px solid hsl(var(--border))' }}>
                        <span style={{ ...tick, width:14 }}>{i + 1}</span>
                        <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.name}</span>
                        <span style={tick}>{e.sets}×{e.reps}</span>
                      </div>
                    ))}
                  </>) : (nextClient?.notes || nextClient?.goals) ? (<>
                    <div style={{ ...tick, color:col.next, marginBottom:6 }}>ΣΗΜΕΙΩΣΗ ΠΕΛΑΤΗ</div>
                    <p style={{ margin:0, fontSize:12.5, lineHeight:1.5, color:'hsl(var(--foreground))', display:'-webkit-box', WebkitLineClamp:5, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{nextClient.notes || nextClient.goals}</p>
                  </>) : <div style={{ ...center, flex:1, ...tick }}>Χωρίς πλάνο</div>}
                </div>
              </div>
            )}
          </div>

          {/* REVENUE — wide */}
          <div onClick={go('/Logistics')} style={card({ gridColumn:'6/13', gridRow:'1/2', cursor:'pointer' })}>
            {hR({ icon:CreditCard, title:`Οικονομικά · ${format(now, 'LLLL', loc)}`, color:col.rev })}
            <div style={{ display:'flex', alignItems:'center', gap:22, flex:1, minHeight:0 }}>
              <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', flex:'0 0 auto' }}>
                <div style={{ ...big, fontSize:32 }}>€{Math.round(monthRevenue).toLocaleString()}</div>
                {revDelta != null && <div style={{ fontFamily:'var(--font-display)', fontSize:11.5, fontWeight:700, marginTop:5, color: revDelta >= 0 ? '#4ade80' : '#f87171' }}>{revDelta >= 0 ? '▲ ' : '▼ '}{Math.abs(revDelta)}% vs {format(subDays(startOfMonth(now), 1), 'LLLL', loc)}</div>}
              </div>
              <div style={{ flex:1, height:'100%', display:'flex', alignItems:'center', minWidth:0 }}>
                <svg viewBox="0 0 260 60" preserveAspectRatio="none" style={{ width:'100%', height:60 }}>
                  <defs><linearGradient id="cubeRevG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={col.rev} stopOpacity="0.32"/><stop offset="1" stopColor={col.rev} stopOpacity="0"/></linearGradient></defs>
                  <path d={`${rl} L260,60 L0,60 Z`} fill="url(#cubeRevG)"/>
                  <path d={rl} fill="none" stroke={col.rev} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:11, borderLeft:'1px solid hsl(var(--border))', paddingLeft:20, flex:'0 0 auto' }}>
                <div><div style={tick}>ΕΚΚΡΕΜΗ</div><div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, marginTop:2, color:'#f59e0b' }}>€{Math.round(outstanding).toLocaleString()}</div></div>
                <div><div style={tick}>ΟΦΕΙΛΕΤΕΣ</div><div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, marginTop:2, color:'hsl(var(--foreground))' }}>{debtors.length}</div></div>
              </div>
            </div>
          </div>

          {/* DAY LOAD */}
          <div onClick={go('/CalendarPage')} style={card({ gridColumn:'6/10', gridRow:'2/3', cursor:'pointer' })}>
            {hR({ icon:Timer, title:'Φόρτος ημέρας', color:col.load, right: chip(`${todayHours.toFixed(todayHours % 1 ? 1 : 0)} ώρες`, col.load) })}
            <div style={{ ...big, fontSize:22 }}>{todayAppts.length}<span style={{ ...lbl, fontWeight:600 }}> ραντεβού σήμερα</span></div>
            <div style={{ marginTop:'auto' }}>
              <div style={{ position:'relative', height:20, borderRadius:7, overflow:'hidden', background:'hsl(var(--muted)/0.5)', border:'1px solid hsl(var(--border))' }}>
                {todayAppts.map((a, i) => { const l = dpos(toMin(a.start_time)); const w = Math.max(2, ((a.duration_minutes || 60) / dSpan) * 100); return <div key={i} title={a.client_name} style={{ position:'absolute', left:`${l}%`, width:`${w}%`, top:0, bottom:0, background:col.load, opacity:.82 }}/>; })}
                {mins >= dS && mins <= dE && <div style={{ position:'absolute', left:`${dpos(mins)}%`, top:-2, bottom:-2, width:2, background:'#f87171' }}/>}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:5 }}><span style={tick}>08:00</span><span style={tick}>14:30</span><span style={tick}>21:00</span></div>
            </div>
          </div>

          {/* HOURS */}
          <div onClick={go('/Statistics')} style={card({ gridColumn:'10/13', gridRow:'2/3', cursor:'pointer' })}>
            {hR({ icon:Timer, title:'Ώρες εβδομάδας', color:col.hours })}
            <div style={{ ...big, fontSize:28 }}>{weekHours.toFixed(weekHours % 1 ? 1 : 0)}<span style={{ ...lbl, fontWeight:600, fontSize:13 }}> ω</span></div>
            <div style={{ marginTop:'auto', display:'flex', alignItems:'flex-end', gap:5, height:42 }}>
              {weekDays.map((d, i) => (<div key={i} style={{ flex:1, height:`${Math.max(8, (d.mins / wkHMax) * 100)}%`, borderRadius:'3px 3px 0 0', background: d.isToday ? col.hours : `${col.hours}66` }}/>))}
            </div>
          </div>

          {/* AGENDA — timeline */}
          <div onClick={go('/CalendarPage')} style={card({ gridColumn:'1/9', gridRow:'3/4', cursor:'pointer' })}>
            {hR({ icon:CalendarDays, title:`Ατζέντα ημέρας · ${todayAppts.length} ραντεβού`, color:col.agenda })}
            <div style={{ position:'relative', flex:1, minHeight:0 }}>
              {todayAppts.length === 0 && <div style={{ ...center, position:'absolute', inset:0, ...lbl }}>Κενή μέρα</div>}
              {todayAppts.map((a, i) => { const l = dpos(toMin(a.start_time)); const w = Math.max(9, ((a.duration_minutes || 60) / dSpan) * 100); const past = toMin(a.start_time) + (a.duration_minutes || 60) < mins; const live = !past && toMin(a.start_time) <= mins;
                return <div key={i} style={{ position:'absolute', bottom:22, left:`${l}%`, width:`${w}%`, height:46, borderRadius:9, padding:'7px 9px', overflow:'hidden', opacity:past ? .5 : 1, background:`${col.agenda}1c`, border:`1px solid ${col.agenda}66` }}>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:10, fontWeight:800, color: live ? col.agenda : 'hsl(var(--muted-foreground))' }}>{a.start_time}{live ? ' · ΤΩΡΑ' : ''}</div>
                  <div style={{ fontSize:12, fontWeight:600, marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'hsl(var(--foreground))' }}>{a.client_name}</div>
                </div>; })}
              <div style={{ position:'absolute', left:0, right:0, bottom:16, height:1, background:'hsl(var(--border))' }}/>
              <div style={{ position:'absolute', left:0, right:0, bottom:0, display:'flex', justifyContent:'space-between' }}>
                {['08:00','11:00','14:00','17:00','21:00'].map(h => <span key={h} style={tick}>{h}</span>)}
              </div>
            </div>
          </div>

          {/* MESSAGES */}
          <div onClick={go('/Messages')} style={card({ gridColumn:'9/13', gridRow:'3/4', cursor:'pointer' })}>
            {hR({ icon:MessageCircle, title:'Μηνύματα', color:col.msg, right: D.msgs.length > 0 ? chip(`${D.msgs.length} νέα`, col.msg) : null })}
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:2, minHeight:0 }}>
              {D.msgs.length === 0 && <div style={{ ...center, flex:1, ...lbl }}>Κανένα αδιάβαστο</div>}
              {D.msgs.slice(0, 3).map((m, i) => (
                <div key={i} onClick={e => { e.stopPropagation(); navigate('/Messages', { state: msgStateFor(m) }); }} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'1px solid hsl(var(--border))', cursor:'pointer' }}>
                  <div style={avStyle(30, col.msg)}>{initials(m.client_name)}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12.5, fontWeight:600, color:'hsl(var(--foreground))' }}>{m.client_name}</div>
                    <div style={{ ...tick, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.content}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WEEK strip */}
          <div onClick={go('/CalendarPage')} style={card({ gridColumn:'1/8', gridRow:'4/5', cursor:'pointer' })}>
            {hR({ icon:CalendarRange, title:`Εβδομάδα · ${weekTotal} ραντεβού`, color:col.agenda })}
            <div style={{ display:'flex', gap:8, flex:1, minHeight:0 }}>
              {weekDays.map((d, i) => (
                <div key={i} style={{ flex:1, borderRadius:10, background: d.isToday ? `${col.agenda}18` : 'hsl(var(--muted)/0.3)', border: d.isToday ? `1px solid ${col.agenda}88` : '1px solid transparent', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', padding:'8px 4px 9px', position:'relative' }}>
                  <span style={{ ...tick, position:'absolute', top:7 }}>{d.label}</span>
                  <div style={{ width:9, height:`${Math.max(4, (d.n / wkMax) * 54)}px`, borderRadius:4, background: d.isToday ? col.agenda : `${col.agenda}66`, marginBottom:6 }}/>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:12, fontWeight:800, color:'hsl(var(--foreground))' }}>{d.n}</span>
                </div>
              ))}
            </div>
          </div>

          {/* TODO 2-col */}
          <div style={card({ gridColumn:'8/13', gridRow:'4/5' })}>
            {hR({ icon:CheckSquare, title:'Εκκρεμότητες', color:col.todo, right: chip(String(openTodos.length), col.todo) })}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 18px', flex:1, alignContent:'start', overflow:'hidden' }}>
              {openTodos.length === 0 && <div style={{ ...center, ...lbl, gridColumn:'1/3' }}>Όλα ολοκληρωμένα ✓</div>}
              {sortedTodos.slice(0, 8).map(t => (
                <div key={t.id} onClick={() => toggleTodo(t)} style={{ display:'flex', alignItems:'center', gap:9, fontSize:12.5, padding:'5px 0', cursor:'pointer', minWidth:0 }}>
                  <span style={{ width:16, height:16, borderRadius:5, border:`2px solid ${col.todo}`, flex:'0 0 auto' }}/>
                  <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'hsl(var(--foreground))' }}>{t.title}</span>
                  <span style={{ ...tick, color:dueColor(t) }}>{dueText(t)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* MONTH calendar */}
          <div onClick={go('/CalendarPage')} style={card({ gridColumn:'1/5', gridRow:'5/7', cursor:'pointer' })}>
            {hR({ icon:LayoutGrid, title:format(now, 'LLLL yyyy', loc), color:col.month, right: chip(`${mTotal}`, col.month) })}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:5 }}>
              {['Δ','Τ','Τ','Π','Π','Σ','Κ'].map((d, i) => <div key={i} style={{ ...tick, textAlign:'center' }}>{d}</div>)}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gridAutoRows:'1fr', gap:4, flex:1, minHeight:0 }}>
              {Array.from({ length:lead }).map((_, i) => <div key={`e${i}`}/>)}
              {mDays.map((dd, i) => { const n = mCounts[i]; const isT = format(dd, 'yyyy-MM-dd') === today;
                return <div key={i} style={{ borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11.5, fontWeight:700, position:'relative', fontVariantNumeric:'tabular-nums', background: isT ? col.month : n ? `${col.month}${Math.round((0.14 + (n / mMax) * 0.5) * 255).toString(16).padStart(2, '0')}` : 'hsl(var(--muted)/0.28)', color: isT ? '#fff' : 'hsl(var(--foreground))' }}>{format(dd, 'd')}{n && !isT ? <span style={{ position:'absolute', bottom:4, width:4, height:4, borderRadius:'50%', background:col.month }}/> : null}</div>; })}
            </div>
          </div>

          {/* ATTENTION row */}
          <div onClick={go('/Clients')} style={card({ gridColumn:'5/13', gridRow:'5/6', cursor:'pointer' })}>
            {hR({ icon:AlertTriangle, title:`Χρειάζονται προσοχή · ${attention.length}`, color:col.att })}
            <div style={{ display:'flex', gap:10, flex:1, minHeight:0 }}>
              {attention.length === 0 && <div style={{ ...center, flex:1, ...lbl }}>Τίποτα εκκρεμές ✓</div>}
              {attention.slice(0, 4).map((a, i) => (
                <div key={i} style={{ flex:1, borderRadius:12, background:`${a.c}14`, border:`1px solid ${a.c}3a`, padding:'10px 11px', display:'flex', flexDirection:'column', gap:7, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={avStyle(26, a.c)}>{initials(a.name)}</div>
                    <span style={{ fontSize:12.5, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'hsl(var(--foreground))' }}>{a.name}</span>
                  </div>
                  <span style={{ ...tick, color:a.c, marginTop:'auto', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.why}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ROSTER avatar strip */}
          <div onClick={go('/Clients')} style={card({ gridColumn:'5/10', gridRow:'6/7', cursor:'pointer' })}>
            {hR({ icon:Users, title:'Πελατολόγιο', color:col.roster })}
            <div style={{ display:'flex', alignItems:'center', gap:16, flex:1 }}>
              <div style={{ ...big, fontSize:36 }}>{activeClients}<span style={{ ...tick, display:'block', marginTop:2 }}>ΕΝΕΡΓΟΙ</span></div>
              <div style={{ display:'flex', alignItems:'center' }}>
                {D.clients.slice(0, 6).map((c2, i) => (<div key={i} style={{ ...avStyle(38, ['#06b6d4','#8b5cf6','#22c55e','#f59e0b','#a855f7','#3b82f6'][i % 6]), marginLeft: i ? -10 : 0, border:'2px solid hsl(var(--card))' }}>{initials(c2.name)}</div>))}
                {D.clients.length > 6 && <div style={{ width:38, height:38, borderRadius:'50%', marginLeft:-10, border:'2px solid hsl(var(--card))', background:'hsl(var(--muted)/0.6)', ...center, ...tick }}>+{D.clients.length - 6}</div>}
              </div>
            </div>
          </div>

          {/* REQUESTS */}
          <div style={card({ gridColumn:'10/13', gridRow:'6/7' })}>
            {hR({ icon:Inbox, title:'Αιτήματα', color:col.req, right: D.reqs.length > 0 ? chip(String(D.reqs.length), col.req) : null })}
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:2, minHeight:0 }}>
              {D.reqs.length === 0 && <div style={{ ...center, flex:1, ...lbl }}>Κανένα εκκρεμές</div>}
              {D.reqs.slice(0, 2).map((r, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:9, padding:'7px 0', borderBottom:'1px solid hsl(var(--border))' }}>
                  <div style={avStyle(28, col.req)}>{initials(r.client_name)}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'hsl(var(--foreground))' }}>{r.client_name}</div>
                    <div style={{ ...tick, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.requested_date ? format(parseISO(r.requested_date), 'EEE d LLL', loc) : (r.type || 'ραντεβού')}</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); navigate('/CalendarPage'); }} style={{ border:'none', borderRadius:8, padding:'6px 9px', cursor:'pointer', background:'rgba(34,197,94,.2)', color:'#4ade80', fontFamily:'var(--font-display)', fontSize:10, fontWeight:800 }}>ΟΡΙΣΜΟΣ</button>
                  <button onClick={e => { e.stopPropagation(); declineReq(r); }} style={{ border:'none', borderRadius:8, padding:'6px 8px', cursor:'pointer', background:'rgba(239,68,68,.18)', color:'#f87171', fontFamily:'var(--font-display)', fontSize:10, fontWeight:800 }}>✕</button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    );
  }


  return (
    <div style={{ padding: wide ? '26px 28px 34px' : '14px 14px 16px', minHeight:'100%',
      maxWidth: wide ? 1180 : 'none', margin: wide ? '0 auto' : undefined }}>

      <div style={{ ...tick, marginBottom:8 }}>
        {format(now, 'EEEE d LLLL', loc).toUpperCase()} · {format(now, 'HH:mm')}
      </div>
      <div style={{ display:'flex', gap: wide ? 12 : 8, marginBottom: wide ? 18 : 12,
        maxWidth: wide ? 560 : 'none' }}>
        {[[todayAppts.length, 'ΡΑΝΤΕΒΟΥ'], [todayHours.toFixed(todayHours % 1 ? 1 : 0), 'ΩΡΕΣ'],
          [openTodos.length, 'ΕΚΚΡΕΜΗ']].map(([v, k]) => (
          <div key={k} style={{ flex:1, background:'hsl(var(--card))', border:'1px solid hsl(var(--border))',
            borderRadius:13, padding:'9px 11px' }}>
            <div style={{ ...big, fontSize:19 }}>{v}</div>
            <div style={{ ...tick, marginTop:2 }}>{k}</div>
          </div>
        ))}
      </div>

      <WidgetBoard
        slots={slots} saveSlots={saveSlots} WIDGETS={WIDGETS}
        render={(w, size, edit) => renderRef(w, size, edit)}
        defaults={DEFAULT_SLOTS} rowHeight={rowHeight} columns={columns} square={wide}
        theme={{ card:'hsl(var(--card))', border:'hsl(var(--border))', text:'hsl(var(--foreground))',
                 dim:'hsl(var(--muted-foreground))', accent:accent, muted:'hsl(var(--muted)/0.45)' }}/>
    </div>
  );
}
