import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, differenceInDays, differenceInMinutes } from 'date-fns';
import { Calendar, Users, Dumbbell, CreditCard, Bell, CheckSquare, Sparkles,
  TrendingUp, Clock, Plus, X, Settings2, Check } from 'lucide-react';
import { db } from '../lib/db';
import { useLang } from '../lib/LangContext';

const QUOTES = [
  "The only bad workout is the one that didn't happen.",
  "Push harder than yesterday for a different tomorrow.",
  "Discipline equals freedom.",
  "Don't stop when you're tired. Stop when you're done.",
  "Pain is temporary. Quitting lasts forever.",
];

// ── All available widgets the user can place in a box ──
const WIDGETS = {
  today_sessions:  { icon:Calendar,   label:'Today\'s Sessions',  color:'#3b82f6' },
  total_clients:   { icon:Users,      label:'Total Clients',      color:'#8b5cf6' },
  week_revenue:    { icon:CreditCard, label:'Revenue (Month)',    color:'#22c55e' },
  todos:           { icon:CheckSquare,label:'To-Do List',         color:'#f59e0b' },
  next_appt:       { icon:Clock,      label:'Next Appointment',   color:'#06b6d4' },
  unread_msgs:     { icon:Bell,       label:'Notifications',      color:'#ef4444' },
  active_plans:    { icon:Dumbbell,   label:'Active Plans',       color:'#ec4899' },
  motivation:      { icon:Sparkles,   label:'Daily Motivation',   color:'#a855f7' },
  week_sessions:   { icon:TrendingUp, label:'Sessions This Week', color:'#14b8a6' },
};

const DEFAULT_SLOTS = ['today_sessions','total_clients','next_appt','week_revenue','todos','motivation'];
const STORAGE_KEY = 'cube_home_widgets';

export default function MobileHome() {
  const navigate = useNavigate();
  const { tr } = useLang();
  const [clients, setClients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [todos, setTodos] = useState([]);
  const [payments, setPayments] = useState([]);
  const [plans, setPlans] = useState([]);
  const [messages, setMessages] = useState([]);
  const [quote] = useState(()=>QUOTES[Math.floor(Math.random()*QUOTES.length)]);
  const [editSlot, setEditSlot] = useState(null); // index being customized
  const [slots, setSlots] = useState(()=>{
    try { const s=JSON.parse(localStorage.getItem(STORAGE_KEY)); if(Array.isArray(s)&&s.length===6) return s; } catch(e){}
    return DEFAULT_SLOTS;
  });

  const load = async () => {
    const [c,a,t,p,pl,m] = await Promise.all([
      db.Client.list('name'), db.Appointment.list('date',200),
      db.TodoItem.list('-created_date',50), db.Payment.list('-paid_date',50),
      db.TrainingPlan?.list?.('name').catch(()=>[]) || [],
      db.Message?.filter?.({sender:'client',read:false}).catch(()=>[]) || [],
    ]);
    setClients(c); setAppointments(a); setTodos(t); setPayments(p);
    setPlans(pl||[]); setMessages(m||[]);
  };
  useEffect(()=>{ load(); },[]);

  const saveSlots = (next) => { setSlots(next); try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch(e){} };
  const setSlotWidget = (idx, key) => { const n=[...slots]; n[idx]=key; saveSlots(n); setEditSlot(null); };

  // ── Derived data ──
  const todayStr = format(new Date(),'yyyy-MM-dd');
  const todayAppts = appointments.filter(a=>a.date===todayStr).sort((a,b)=>a.start_time?.localeCompare(b.start_time));
  const upcoming = appointments.filter(a=>a.date>=todayStr)
    .sort((a,b)=>a.date===b.date?(a.start_time||'').localeCompare(b.start_time||''):a.date.localeCompare(b.date));
  const nextAppt = upcoming[0];
  const monthStart = format(new Date(new Date().getFullYear(),new Date().getMonth(),1),'yyyy-MM-dd');
  const monthRevenue = payments.filter(p=>p.paid_date>=monthStart).reduce((s,p)=>s+(p.amount||0),0);
  const openTodos = todos.filter(t=>!t.completed);
  const weekAgo = format(new Date(Date.now()-7*864e5),'yyyy-MM-dd');
  const weekSessions = appointments.filter(a=>a.date>=weekAgo&&a.date<=todayStr).length;

  const toggleTodo = async (t) => { await db.TodoItem.update(t.id,{completed:!t.completed}); load(); };

  // ── Widget renderer ──
  const renderWidget = (key) => {
    const w = WIDGETS[key];
    if (!w) return null;
    const Icon = w.icon;
    const iconBox = (
      <div style={{width:34,height:34,borderRadius:10,background:`${w.color}1f`,
        display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        <Icon style={{width:18,height:18,color:w.color}}/>
      </div>
    );

    switch(key){
      case 'today_sessions':
        return (
          <div onClick={()=>navigate('/CalendarPage')} style={boxInner}>
            {iconBox}
            <div style={{marginTop:8}}>
              <div style={bigNum}>{todayAppts.length}</div>
              <div style={lbl}>{tr('nav_calendar')==='Ημερολόγιο'?'Σήμερα':'Today'}</div>
            </div>
            {todayAppts[0] && <div style={subLine}>{todayAppts[0].start_time} · {todayAppts[0].client_name}</div>}
          </div>
        );
      case 'total_clients':
        return (
          <div onClick={()=>navigate('/Clients')} style={boxInner}>
            {iconBox}
            <div style={{marginTop:8}}>
              <div style={bigNum}>{clients.length}</div>
              <div style={lbl}>{tr('nav_clients')}</div>
            </div>
          </div>
        );
      case 'week_revenue':
        return (
          <div onClick={()=>navigate('/Logistics')} style={boxInner}>
            {iconBox}
            <div style={{marginTop:8}}>
              <div style={bigNum}>€{Math.round(monthRevenue).toLocaleString()}</div>
              <div style={lbl}>{tr('nav_calendar')==='Ημερολόγιο'?'Έσοδα μήνα':'This month'}</div>
            </div>
          </div>
        );
      case 'todos':
        return (
          <div style={{...boxInner, cursor:'default'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              {iconBox}
              <span style={{fontSize:20,fontWeight:800,color:w.color}}>{openTodos.length}</span>
            </div>
            <div style={{marginTop:6,display:'flex',flexDirection:'column',gap:4,overflow:'hidden'}}>
              {openTodos.slice(0,3).map(t=>(
                <div key={t.id} onClick={()=>toggleTodo(t)}
                  style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
                  <div style={{width:14,height:14,borderRadius:4,border:`1.5px solid ${w.color}`,flexShrink:0}}/>
                  <span style={{fontSize:11,color:'hsl(var(--foreground))',overflow:'hidden',
                    textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.title}</span>
                </div>
              ))}
              {openTodos.length===0 && <span style={{fontSize:11,color:'hsl(var(--muted-foreground))'}}>All done ✓</span>}
            </div>
          </div>
        );
      case 'next_appt':
        return (
          <div onClick={()=>navigate('/CalendarPage')} style={boxInner}>
            {iconBox}
            {nextAppt ? (
              <div style={{marginTop:8}}>
                <div style={{fontSize:15,fontWeight:800,color:'hsl(var(--foreground))',lineHeight:1.2}}>{nextAppt.client_name}</div>
                <div style={subLine}>{nextAppt.date===todayStr?'Today':format(parseISO(nextAppt.date),'MMM d')} · {nextAppt.start_time}</div>
              </div>
            ) : <div style={{marginTop:8,fontSize:12,color:'hsl(var(--muted-foreground))'}}>No upcoming</div>}
          </div>
        );
      case 'unread_msgs':
        return (
          <div onClick={()=>navigate('/Messages')} style={boxInner}>
            {iconBox}
            <div style={{marginTop:8}}>
              <div style={bigNum}>{messages.length}</div>
              <div style={lbl}>{tr('nav_messages')}</div>
            </div>
          </div>
        );
      case 'active_plans':
        return (
          <div onClick={()=>navigate('/TrainingPlans')} style={boxInner}>
            {iconBox}
            <div style={{marginTop:8}}>
              <div style={bigNum}>{plans.length}</div>
              <div style={lbl}>{tr('nav_training')}</div>
            </div>
          </div>
        );
      case 'week_sessions':
        return (
          <div onClick={()=>navigate('/Statistics')} style={boxInner}>
            {iconBox}
            <div style={{marginTop:8}}>
              <div style={bigNum}>{weekSessions}</div>
              <div style={lbl}>{tr('nav_calendar')==='Ημερολόγιο'?'Αυτή την εβδομάδα':'This week'}</div>
            </div>
          </div>
        );
      case 'motivation':
        return (
          <div style={{...boxInner,cursor:'default',justifyContent:'center'}}>
            {iconBox}
            <p style={{marginTop:8,fontSize:12,lineHeight:1.45,color:'hsl(var(--foreground))',
              fontStyle:'italic',fontWeight:500}}>"{quote}"</p>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div style={{padding:'16px 14px', minHeight:'100vh'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <div>
          <p style={{fontSize:11,color:'hsl(var(--muted-foreground))',letterSpacing:'0.04em',margin:0}}>
            {format(new Date(),'EEEE, MMMM d')}
          </p>
          <h1 style={{fontSize:24,fontWeight:800,color:'hsl(var(--foreground))',margin:'2px 0 0',
            fontFamily:'var(--font-display)',letterSpacing:'-0.02em'}}>
            {(() => { const h=new Date().getHours(); return h<12?'Good morning':h<18?'Good afternoon':'Good evening'; })()}
          </h1>
        </div>
        <div style={{textAlign:'right'}}>
          <LiveClock/>
        </div>
      </div>

      {/* Widget grid — 2 columns */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        {slots.map((key,idx)=>(
          <div key={idx} style={{position:'relative',aspectRatio:'1 / 1',
            background:'hsl(var(--card))',border:'1px solid hsl(var(--border))',
            borderRadius:18,overflow:'hidden'}}>
            {renderWidget(key)}
            {/* Customize button */}
            <button onClick={(e)=>{e.stopPropagation();setEditSlot(idx);}}
              style={{position:'absolute',top:6,right:6,width:24,height:24,borderRadius:8,
                border:'none',background:'hsl(var(--muted)/0.7)',cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',zIndex:2}}>
              <Settings2 style={{width:12,height:12,color:'hsl(var(--muted-foreground))'}}/>
            </button>
          </div>
        ))}
      </div>

      {/* Widget picker sheet */}
      {editSlot!==null && (
        <>
          <div onClick={()=>setEditSlot(null)}
            style={{position:'fixed',inset:0,zIndex:80,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(3px)'}}/>
          <div style={{position:'fixed',left:0,right:0,bottom:0,zIndex:81,background:'hsl(var(--card))',
            borderTopLeftRadius:24,borderTopRightRadius:24,borderTop:'1px solid hsl(var(--border))',
            padding:'10px 16px calc(20px + env(safe-area-inset-bottom))',
            boxShadow:'0 -8px 40px rgba(0,0,0,0.5)',animation:'sheetUp 0.26s cubic-bezier(0.22,1,0.36,1)',
            maxHeight:'75vh',overflowY:'auto'}}>
            <style>{`@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
            <div style={{width:38,height:4,borderRadius:4,background:'hsl(var(--muted-foreground)/0.3)',margin:'4px auto 14px'}}/>
            <p style={{fontSize:13,fontWeight:700,color:'hsl(var(--foreground))',marginBottom:4,textAlign:'center'}}>
              Choose a widget
            </p>
            <p style={{fontSize:11,color:'hsl(var(--muted-foreground))',marginBottom:14,textAlign:'center'}}>
              Pick what this box shows
            </p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {Object.entries(WIDGETS).map(([key,w])=>{
                const Icon=w.icon;
                const isCur=slots[editSlot]===key;
                const usedElsewhere=slots.includes(key)&&!isCur;
                return (
                  <button key={key} onClick={()=>setSlotWidget(editSlot,key)}
                    disabled={usedElsewhere}
                    style={{display:'flex',alignItems:'center',gap:10,padding:'12px 12px',borderRadius:14,
                      border:isCur?`2px solid ${w.color}`:'1px solid hsl(var(--border))',
                      background:isCur?`${w.color}14`:'hsl(var(--muted)/0.4)',
                      cursor:usedElsewhere?'not-allowed':'pointer',opacity:usedElsewhere?0.4:1,
                      textAlign:'left'}}>
                    <div style={{width:32,height:32,borderRadius:9,background:`${w.color}1f`,
                      display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <Icon style={{width:17,height:17,color:w.color}}/>
                    </div>
                    <span style={{fontSize:11.5,fontWeight:600,color:'hsl(var(--foreground))',lineHeight:1.2}}>
                      {w.label}
                    </span>
                    {isCur && <Check style={{width:14,height:14,color:w.color,marginLeft:'auto',flexShrink:0}}/>}
                  </button>
                );
              })}
            </div>
            <button onClick={()=>setEditSlot(null)}
              style={{width:'100%',marginTop:14,padding:'12px',borderRadius:14,border:'none',
                background:'hsl(var(--muted)/0.5)',color:'hsl(var(--muted-foreground))',
                fontSize:14,fontWeight:600,cursor:'pointer'}}>
              Done
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(()=>{ const t=setInterval(()=>setNow(new Date()),1000); return()=>clearInterval(t); },[]);
  return (
    <p style={{fontSize:20,fontWeight:800,color:'hsl(var(--foreground))',margin:0,
      fontFamily:'var(--font-display)',letterSpacing:'-0.03em',fontVariantNumeric:'tabular-nums'}}>
      {format(now,'HH:mm')}
    </p>
  );
}

// Shared styles
const boxInner = { position:'absolute',inset:0,padding:'12px',display:'flex',flexDirection:'column',cursor:'pointer' };
const bigNum = { fontSize:26,fontWeight:900,color:'hsl(var(--foreground))',lineHeight:1,fontFamily:'var(--font-display)',letterSpacing:'-0.02em' };
const lbl = { fontSize:10.5,color:'hsl(var(--muted-foreground))',marginTop:3,fontWeight:600 };
const subLine = { fontSize:10,color:'hsl(var(--muted-foreground))',marginTop:'auto',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' };
