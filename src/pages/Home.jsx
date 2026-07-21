import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isToday, isTomorrow, differenceInDays, differenceInMinutes } from 'date-fns';
import { Plus, Calendar, Users, Dumbbell, Salad, BarChart2, Bell, CheckSquare, Square, Trash2, X, ChevronLeft, ChevronRight, Clock, CreditCard, Sparkles, Search, Loader2, Check } from 'lucide-react';
import { db } from '../lib/db';
import MobileHome from '../components/MobileHome';

const QUOTES = [
  "The only bad workout is the one that didn't happen.",
  "Push harder than yesterday if you want a different tomorrow.",
  "Discipline equals freedom. — Jocko Willink",
  "Don't stop when you're tired. Stop when you're done.",
  "Champions are made from something deep inside — a desire, a dream, a vision.",
  "The last three or four reps is what makes the muscle grow. — Arnold Schwarzenegger",
  "Today I will do what others won't, so tomorrow I can do what others can't.",
  "Success isn't given. It's earned in the gym, on the road, and in the kitchen.",
  "Pain is temporary. Quitting lasts forever.",
  "No one is coming to save you. Get up and do the work.",
];

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(()=>{ const t=setInterval(()=>setNow(new Date()),1000); return()=>clearInterval(t); },[]);
  return (
    <div className="text-right">
      <p className="text-2xl font-bold text-foreground tabular-nums" style={{fontFamily:'var(--font-display)',letterSpacing:'-0.03em'}}>{format(now,'HH:mm')}<span className="text-muted-foreground text-lg">:{format(now,'ss')}</span></p>
      <p className="text-xs text-muted-foreground mt-0.5">{format(now,'EEEE, MMMM d')}</p>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(() => typeof window!=='undefined' ? window.innerWidth<768 : false);
  useEffect(()=>{ const h=()=>setIsMobile(window.innerWidth<768); window.addEventListener('resize',h); return()=>window.removeEventListener('resize',h); },[]);
  const [quote] = useState(()=>QUOTES[Math.floor(Math.random()*QUOTES.length)]);
  const [clients, setClients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [todos, setTodos] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [newTodo, setNewTodo] = useState('');
  const [addingTodo, setAddingTodo] = useState(false);
  const notifRef = useRef(null);
  const quickRef = useRef(null);

  const load = async () => {
    const [c,a,t,p] = await Promise.all([db.Client.list('name'), db.Appointment.list('date',200), db.TodoItem.list('-created_date',50), db.Payment.list('-paid_date',50)]);
    setClients(c); setAppointments(a); setTodos(t); setPayments(p);
  };
  useEffect(()=>{ load(); },[]);
  useEffect(()=>{
    const h=(e)=>{
      if (notifRef.current&&!notifRef.current.contains(e.target)) setNotifOpen(false);
      if (quickRef.current&&!quickRef.current.contains(e.target)) setQuickOpen(false);
    };
    document.addEventListener('mousedown',h);
    return()=>document.removeEventListener('mousedown',h);
  },[]);

  const todayStr = format(new Date(),'yyyy-MM-dd');
  const upcoming = appointments.filter(a=>a.date>=todayStr).sort((a,b)=>a.date===b.date?a.start_time?.localeCompare(b.start_time):a.date.localeCompare(b.date)).slice(0,20);
  const todayAppts = appointments.filter(a=>a.date===todayStr).sort((a,b)=>a.start_time?.localeCompare(b.start_time));

  useEffect(()=>{
    if (upcoming.length<2) return;
    const t=setInterval(()=>setCarouselIdx(i=>(i+1)%upcoming.length),25000);
    return()=>clearInterval(t);
  },[upcoming.length]);

  const now2 = new Date();
  const notifs = [];
  todayAppts.forEach(a=>{
    notifs.push({ id:`a-${a.id}`, icon:'📅', text:`${a.start_time} — ${a.title}`, sub:`${a.duration_minutes}min session`, type:'blue' });
    if (a.start_time) {
      const [h,m]=a.start_time.split(':').map(Number);
      const at=new Date(); at.setHours(h,m,0);
      const diff=differenceInMinutes(at,now2);
      if (diff>0&&diff<=60) notifs.unshift({ id:`soon-${a.id}`, icon:'⚠️', text:`In ${diff} min: ${a.client_name}`, sub:'Starting soon', type:'orange' });
    }
  });
  payments.forEach(p=>{
    if (!p.period_to) return;
    const dl=differenceInDays(parseISO(p.period_to),now2);
    if (dl>=0&&dl<=7) notifs.push({ id:`pay-${p.id}`, icon:'💳', text:`${p.client_name}'s plan ends in ${dl}d`, sub:'Remind at next session', type:'red' });
  });
  todos.filter(t=>!t.completed&&t.due_date).forEach(t=>{
    const dl=differenceInDays(now2,parseISO(t.due_date));
    if (dl>=0) notifs.push({ id:`td-${t.id}`, icon:'☑️', text:`Overdue: ${t.title}`, sub:`Was due ${format(parseISO(t.due_date),'MMM d')}`, type:'purple' });
  });

  const NOTIF_COLORS = { blue:'bg-blue-50 text-blue-700', orange:'bg-orange-50 text-orange-700', red:'bg-red-50 text-red-700', purple:'bg-purple-50 text-purple-700' };

  const toggleTodo = async (t) => { await db.TodoItem.update(t.id,{completed:!t.completed}); load(); };
  const delTodo = async (id) => { await db.TodoItem.delete(id); load(); };
  const addTodo = async () => {
    if (!newTodo.trim()) return;
    await db.TodoItem.create({title:newTodo.trim(),completed:false,priority:'medium'});
    setNewTodo(''); setAddingTodo(false); load();
  };
  const handleAction = (a) => {
    setQuickOpen(false);
    if (a==='event') setModal('event');
    else if (a==='client') navigate('/Clients');
    else if (a==='record') navigate('/Statistics');
    else if (a==='training') navigate('/TrainingPlans');
    else if (a==='nutrition') navigate('/Nutrition');
    else if (a==='payment') setModal('payment');
    else if (a==='assistant') setModal('assistant');
  };

  const ca = upcoming[carouselIdx];
  const getDay = (ds) => { try { const d=parseISO(ds); return isToday(d)?'Today':isTomorrow(d)?'Tomorrow':format(d,'EEE, MMM d'); } catch { return ds; } };
  const pending = todos.filter(t=>!t.completed);
  const done = todos.filter(t=>t.completed);

  const QUICK_ITEMS = [
    {a:'event',l:'New Event',I:Calendar,c:'text-blue-600'},
    {a:'client',l:'New Client',I:Users,c:'text-indigo-600'},
    {a:'record',l:'Add Record',I:BarChart2,c:'text-green-600'},
    {a:'training',l:'Training Plan',I:Dumbbell,c:'text-purple-600'},
    {a:'nutrition',l:'Nutrition Plan',I:Salad,c:'text-amber-600'},
    {a:'payment',l:'Log Payment',I:CreditCard,c:'text-rose-600'},
  ];


  if (isMobile) return <MobileHome/>;

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header row */}
      <div className="flex items-start justify-between gap-6 mb-10">
        <div className="flex-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Daily Motivation</p>
          <h1 className="text-xl font-medium text-foreground leading-snug max-w-lg italic" style={{fontFamily:'var(--font-display)',color:'hsl(var(--foreground)/0.8)'}}>
            "{quote}"
          </h1>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <LiveClock/>
          {/* Bell */}
          <div className="relative" ref={notifRef}>
            <button onClick={()=>setNotifOpen(o=>!o)}
              className="relative w-10 h-10 rounded-xl border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors"
              style={{boxShadow:'var(--shadow-xs)'}}>
              <Bell className="w-4 h-4 text-muted-foreground"/>
              {notifs.length>0&&<span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">{notifs.length>9?'9+':notifs.length}</span>}
            </button>
            {notifOpen&&(
              <div className="absolute right-0 top-12 w-80 bg-card rounded-2xl border border-border z-50 overflow-hidden animate-scale-in" style={{boxShadow:'var(--shadow-xl)'}}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="font-semibold text-foreground text-sm">Notifications</span>
                  <button onClick={()=>setNotifOpen(false)} className="p-1 hover:bg-muted rounded-lg"><X className="w-3.5 h-3.5 text-muted-foreground"/></button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifs.length===0?<div className="text-center py-8 text-muted-foreground text-sm">All clear ✓</div>
                    :notifs.map(n=><div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 ${NOTIF_COLORS[n.type]||''}`}><span className="text-base flex-shrink-0">{n.icon}</span><div><p className="text-sm font-medium">{n.text}</p>{n.sub&&<p className="text-xs opacity-70 mt-0.5">{n.sub}</p>}</div></div>)}
                </div>
              </div>
            )}
          </div>
          {/* Quick add */}
          <div className="relative" ref={quickRef}>
            <button onClick={()=>setQuickOpen(o=>!o)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-background font-bold"
              style={{
                backgroundColor:'hsl(var(--foreground))',
                boxShadow:'var(--shadow-md)',
                transition:'all 0.2s ease',
                transform: quickOpen?'rotate(45deg)':'none',
              }}>
              <Plus className="w-5 h-5"/>
            </button>
            {quickOpen&&(
              <div className="absolute right-0 top-12 bg-card rounded-2xl border border-border py-1.5 w-44 z-50 animate-scale-in" style={{boxShadow:'var(--shadow-xl)'}}>
                {QUICK_ITEMS.map(({a,l,I,c})=>(
                  <button key={a} onClick={()=>handleAction(a)} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors ${c}`}>
                    <I className="w-4 h-4"/><span className="text-foreground font-medium">{l}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 stagger">
        {[
          [clients.length,'Total Clients',Users,'text-blue-600 bg-blue-50','/Clients'],
          [todayAppts.length,"Today's Sessions",Calendar,'text-green-600 bg-green-50','/CalendarPage'],
          [appointments.filter(a=>a.type==='training').length,'Training Plans',Dumbbell,'text-purple-600 bg-purple-50','/TrainingPlans'],
          [clients.filter(c=>c.services?.includes('nutrition')).length,'Nutrition Clients',Salad,'text-amber-600 bg-amber-50','/Nutrition'],
        ].map(([val,lbl,Icon,cls,path])=>(
          <button key={lbl} onClick={()=>navigate(path)}
            className="card-interactive p-5 text-left animate-slide-up"
            style={{boxShadow:'var(--shadow-sm)'}}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${cls}`}><Icon className="w-5 h-5"/></div>
            <p className="text-3xl font-bold text-foreground" style={{fontFamily:'var(--font-display)'}}>{val}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{lbl}</p>
          </button>
        ))}
      </div>

      {/* Carousel + Todo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Appointment Carousel */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Next Appointments</p>
            {upcoming.length>1&&(
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground mr-1">{carouselIdx+1}/{upcoming.length}</span>
                <button onClick={()=>setCarouselIdx(i=>(i-1+upcoming.length)%upcoming.length)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"><ChevronLeft className="w-3.5 h-3.5 text-muted-foreground"/></button>
                <button onClick={()=>setCarouselIdx(i=>(i+1)%upcoming.length)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"><ChevronRight className="w-3.5 h-3.5 text-muted-foreground"/></button>
              </div>
            )}
          </div>
          {ca ? (
            <div>
              <div className="flex items-start gap-4">
                <div className="text-3xl">{ca.type==='nutrition'?'🥗':'🏋️'}</div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{ca.title}</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-3.5 h-3.5"/><span className="font-medium text-foreground">{ca.start_time}</span>
                      <span className="text-border">·</span><Calendar className="w-3.5 h-3.5"/><span>{getDay(ca.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-3.5 h-3.5"/><span>{ca.client_name}</span>
                      <span className="text-border">·</span><span>{ca.duration_minutes} min</span>
                    </div>
                  </div>
                </div>
                <div className="w-1.5 h-14 rounded-full flex-shrink-0" style={{backgroundColor:ca.client_color||'#6366f1'}}/>
              </div>
              <div className="flex gap-1 mt-4">
                {upcoming.slice(0,12).map((_,i)=>(
                  <button key={i} onClick={()=>setCarouselIdx(i)} className="h-1 rounded-full transition-all duration-300" style={{width:i===carouselIdx?24:6,backgroundColor:i===carouselIdx?'hsl(var(--foreground))':'hsl(var(--border))'}}/>
                ))}
              </div>
            </div>
          ) : <p className="text-muted-foreground text-sm text-center py-8">No upcoming appointments</p>}
        </div>

        {/* Todo */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-muted-foreground"/>
              <span className="font-semibold text-foreground text-sm">To-Do</span>
              {pending.length>0&&<span className="w-5 h-5 bg-foreground text-background rounded-full text-xs flex items-center justify-center font-bold">{pending.length}</span>}
            </div>
            <button onClick={()=>setAddingTodo(true)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-border transition-colors">
              <Plus className="w-3.5 h-3.5 text-muted-foreground"/>
            </button>
          </div>
          <div className="p-3 space-y-1 max-h-64 overflow-y-auto">
            {addingTodo&&(
              <div className="flex gap-2 mb-2 p-1">
                <input autoFocus value={newTodo} onChange={e=>setNewTodo(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter')addTodo(); if(e.key==='Escape')setAddingTodo(false); }}
                  placeholder="Add a task..." className="flex-1 border border-border rounded-xl px-3 py-1.5 text-sm outline-none focus:border-foreground/30 bg-background text-foreground transition-colors"/>
                <button onClick={addTodo} className="px-3 py-1.5 bg-foreground text-background rounded-xl text-xs font-medium hover:opacity-80 transition-opacity">Add</button>
                <button onClick={()=>setAddingTodo(false)} className="p-1.5 hover:bg-muted rounded-lg"><X className="w-4 h-4 text-muted-foreground"/></button>
              </div>
            )}
            {pending.map(t=>(
              <div key={t.id} className="flex items-center gap-2.5 group py-1.5 px-2 rounded-xl hover:bg-muted transition-colors">
                <button onClick={()=>toggleTodo(t)} className="flex-shrink-0 w-4 h-4 rounded border border-border flex items-center justify-center hover:border-foreground/40 transition-colors"><Square className="w-2.5 h-2.5 text-border"/></button>
                <span className="text-sm text-foreground flex-1">{t.title}</span>
                {t.priority==='high'&&<span className="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full font-semibold">!</span>}
                <button onClick={()=>delTodo(t.id)} className="opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3 text-red-400"/></button>
              </div>
            ))}
            {done.slice(0,3).map(t=>(
              <div key={t.id} className="flex items-center gap-2.5 group py-1.5 px-2 rounded-xl opacity-35">
                <button onClick={()=>toggleTodo(t)} className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center bg-foreground/20"><Check className="w-2.5 h-2.5 text-foreground"/></button>
                <span className="text-sm text-muted-foreground line-through flex-1">{t.title}</span>
                <button onClick={()=>delTodo(t.id)} className="opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3 text-red-400"/></button>
              </div>
            ))}
            {todos.length===0&&<p className="text-center text-muted-foreground text-xs py-6">No tasks yet</p>}
          </div>
        </div>
      </div>

      {/* Today + Week */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div><p className="font-semibold text-foreground text-sm">Today</p><p className="text-xs text-muted-foreground mt-0.5">{format(new Date(),'EEEE, MMMM d')}</p></div>
            <span className="badge-gray">{todayAppts.length}</span>
          </div>
          <div className="p-3 max-h-56 overflow-y-auto">
            {todayAppts.length===0?<p className="text-center text-muted-foreground text-xs py-8">No sessions today</p>
              :todayAppts.map(a=>(
                <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors">
                  <div className="w-1 h-10 rounded-full flex-shrink-0" style={{backgroundColor:a.client_color||'#6366f1'}}/>
                  <div className="flex-1 min-w-0"><p className="font-medium text-sm text-foreground truncate">{a.title}</p><p className="text-xs text-muted-foreground">{a.start_time} · {a.duration_minutes} min</p></div>
                </div>
              ))}
          </div>
        </div>
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div><p className="font-semibold text-foreground text-sm">This Week</p><p className="text-xs text-muted-foreground mt-0.5">{format(new Date(),'MMM d')} – {format(new Date(Date.now()+6*86400000),'MMM d, yyyy')}</p></div>
          </div>
          <div className="p-3 overflow-x-auto">
            <div className="min-w-[500px] grid grid-cols-7 gap-1.5">
              {Array.from({length:7},(_,i)=>{
                const day=new Date(); day.setDate(day.getDate()+i);
                const ds=format(day,'yyyy-MM-dd');
                const da=appointments.filter(a=>a.date===ds).sort((a,b)=>a.start_time?.localeCompare(b.start_time));
                const isT=i===0;
                return (
                  <div key={i} className={`rounded-xl p-2 min-h-[100px] transition-colors ${isT?'bg-foreground':'bg-muted/40 hover:bg-muted'}`}>
                    <div className="text-center mb-2">
                      <p className={`text-xs font-medium ${isT?'text-background/60':'text-muted-foreground'}`}>{format(day,'EEE')}</p>
                      <p className={`text-sm font-bold mt-0.5 ${isT?'text-background':'text-foreground'}`}>{format(day,'d')}</p>
                    </div>
                    <div className="space-y-1">
                      {da.map(a=>(
                        <div key={a.id} className="rounded-lg p-1 text-xs font-medium truncate" style={{backgroundColor:isT?'rgba(255,255,255,0.12)':(a.client_color||'#6366f1')+'20',color:isT?'rgba(255,255,255,0.8)':(a.client_color||'#6366f1')}}>
                          {a.start_time?.slice(0,5)}
                        </div>
                      ))}
                      {da.length===0&&<p className={`text-center text-xs mt-2 ${isT?'text-background/30':'text-border'}`}>—</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal==='event'&&<SimpleModal title="New Event" onClose={()=>setModal(null)}><EventForm clients={clients} onSave={async d=>{await db.Appointment.create(d);load();setModal(null);}}/></SimpleModal>}
      {modal==='payment'&&<SimpleModal title="Log Payment" onClose={()=>setModal(null)}><PaymentForm clients={clients} onSave={async d=>{await db.Payment.create(d);load();setModal(null);}}/></SimpleModal>}
    </div>
  );
}

function SimpleModal({title,onClose,children}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-md p-6 w-full" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground" style={{fontFamily:'var(--font-display)'}}>{title}</h2>
          <button onClick={onClose} className="btn-ghost btn-icon"><X className="w-4 h-4"/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EventForm({clients,onSave}) {
  const [f,setF]=useState({title:'',client_id:'',client_name:'',client_color:'',type:'training',date:format(new Date(),'yyyy-MM-dd'),start_time:'09:00',duration_minutes:60,status:'scheduled'});
  const [saving,setSaving]=useState(false);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const hc=(id)=>{ const c=clients.find(c=>c.id===id); setF(p=>({...p,client_id:id,client_name:c?.name||'',client_color:c?.theme_color||''})); };
  const save=async()=>{ setSaving(true); await onSave(f); setSaving(false); };
  return (
    <div className="space-y-3">
      <div><label className="section-label">Title</label><input value={f.title} onChange={e=>set('title',e.target.value)} className="input-base mt-1"/></div>
      <div><label className="section-label">Client</label><select value={f.client_id} onChange={e=>hc(e.target.value)} className="input-base mt-1"><option value="">Select client</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="section-label">Type</label><select value={f.type} onChange={e=>set('type',e.target.value)} className="input-base mt-1"><option value="training">Training</option><option value="nutrition">Nutrition</option><option value="other">Other</option></select></div>
        <div><label className="section-label">Duration (min)</label><input type="number" step="15" value={f.duration_minutes} onChange={e=>set('duration_minutes',parseInt(e.target.value))} className="input-base mt-1"/></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="section-label">Date</label><input type="date" value={f.date} onChange={e=>set('date',e.target.value)} className="input-base mt-1"/></div>
        <div><label className="section-label">Time</label><input type="time" value={f.start_time} onChange={e=>set('start_time',e.target.value)} className="input-base mt-1"/></div>
      </div>
      <button onClick={save} disabled={saving||!f.title} className="btn btn-primary w-full mt-2">{saving?<><Loader2 className="w-4 h-4 animate-spin"/>Saving…</>:'Save Event'}</button>
    </div>
  );
}

function PaymentForm({clients,onSave}) {
  const [f,setF]=useState({client_id:'',client_name:'',amount:'',currency:'EUR',description:'',paid_date:format(new Date(),'yyyy-MM-dd'),period_from:'',period_to:'',method:'cash'});
  const [saving,setSaving]=useState(false);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const hc=(id)=>{ const c=clients.find(c=>c.id===id); setF(p=>({...p,client_id:id,client_name:c?.name||''})); };
  const save=async()=>{ setSaving(true); await onSave({...f,amount:parseFloat(f.amount)}); setSaving(false); };
  return (
    <div className="space-y-3">
      <div><label className="section-label">Client</label><select value={f.client_id} onChange={e=>hc(e.target.value)} className="input-base mt-1"><option value="">Select</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="section-label">Amount (€)</label><input type="number" value={f.amount} onChange={e=>set('amount',e.target.value)} placeholder="0.00" className="input-base mt-1"/></div>
        <div><label className="section-label">Method</label><select value={f.method} onChange={e=>set('method',e.target.value)} className="input-base mt-1"><option value="cash">Cash</option><option value="card">Card</option><option value="transfer">Transfer</option></select></div>
      </div>
      <div><label className="section-label">Description</label><input value={f.description} onChange={e=>set('description',e.target.value)} placeholder="e.g. Monthly PT — June" className="input-base mt-1"/></div>
      <div><label className="section-label">Date Paid</label><input type="date" value={f.paid_date} onChange={e=>set('paid_date',e.target.value)} className="input-base mt-1"/></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="section-label">Period From</label><input type="date" value={f.period_from} onChange={e=>set('period_from',e.target.value)} className="input-base mt-1"/></div>
        <div><label className="section-label">Period To</label><input type="date" value={f.period_to} onChange={e=>set('period_to',e.target.value)} className="input-base mt-1"/></div>
      </div>
      <button onClick={save} disabled={saving||!f.client_id||!f.amount} className="btn btn-primary w-full mt-2">{saving?<><Loader2 className="w-4 h-4 animate-spin"/>Saving…</>:'Log Payment'}</button>
    </div>
  );
}
