import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, differenceInDays, subDays, eachDayOfInterval } from 'date-fns';
import { Calendar, Users, Dumbbell, Salad, CreditCard, Bell, CheckSquare, Sparkles,
  TrendingUp, Clock, Settings2, Check, X, Maximize2, ArrowRight } from 'lucide-react';
import { db } from '../lib/db';
import { useLang } from '../lib/LangContext';
import { useBarColors } from './BarbellNav';

const QUOTES = [
  "The only bad workout is the one that didn't happen.",
  "Push harder than yesterday for a different tomorrow.",
  "Discipline equals freedom.",
  "Don't stop when you're tired. Stop when you're done.",
  "Pain is temporary. Quitting lasts forever.",
];

// size: 1 = 1x1, 2 = 2x1 (wide), 4 = 2x2 (big)
const WIDGETS = {
  today_sessions: { label:"Today's Sessions", icon:Calendar,   color:'#3b82f6', sizes:[1,2] },
  clients_stat:   { label:'Clients Overview', icon:Users,      color:'#8b5cf6', sizes:[1,2,4] },
  revenue_chart:  { label:'Revenue Trend',    icon:CreditCard, color:'#22c55e', sizes:[2,4] },
  todos:          { label:'To-Do List',       icon:CheckSquare,color:'#f59e0b', sizes:[1,2,4] },
  next_appt:      { label:'Next Appointment', icon:Clock,      color:'#06b6d4', sizes:[1,2] },
  week_activity:  { label:'Weekly Activity',  icon:TrendingUp, color:'#14b8a6', sizes:[2,4] },
  notifications:  { label:'Notifications',    icon:Bell,       color:'#ef4444', sizes:[1,2,4] },
  active_plans:   { label:'Active Plans',     icon:Dumbbell,   color:'#ec4899', sizes:[1,2] },
  motivation:     { label:'Motivation',       icon:Sparkles,   color:'#a855f7', sizes:[2,4] },
};

// slot = { w: widgetKey, size: 1|2|4 }
const DEFAULT_SLOTS = [
  { w:'today_sessions', size:1 },
  { w:'clients_stat',   size:1 },
  { w:'revenue_chart',  size:2 },
  { w:'week_activity',  size:2 },
  { w:'todos',          size:1 },
  { w:'next_appt',      size:1 },
];
const STORAGE_KEY = 'cube_home_widgets_v2';

// ── Mini sparkline (pure SVG, no deps) ──
function Sparkline({ data, color, height=32 }) {
  if (!data || data.length<2) return <div style={{height}}/>;
  const max=Math.max(...data), min=Math.min(...data), range=max-min||1;
  const w=100, pts=data.map((v,i)=>`${(i/(data.length-1))*w},${height-((v-min)/range)*height}`).join(' ');
  const area=`0,${height} ${pts} ${w},${height}`;
  const gid = 'sg'+color.replace('#','');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{width:'100%',height,display:'block'}}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={color} stopOpacity="0.35"/><stop offset="1" stopColor={color} stopOpacity="0"/>
      </linearGradient></defs>
      <polygon points={area} fill={`url(#${gid})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
    </svg>
  );
}

// ── Mini bar chart ──
function MiniBars({ data, color, height=40, labels }) {
  const max=Math.max(...data,1);
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:3,height,width:'100%'}}>
      {data.map((v,i)=>(
        <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,height:'100%',justifyContent:'flex-end'}}>
          <div style={{width:'100%',height:`${Math.max(4,(v/max)*100)}%`,background:color,borderRadius:'3px 3px 0 0',
            opacity:i===data.length-1?1:0.55,transition:'height 0.4s'}}/>
          {labels && <span style={{fontSize:7,color:'var(--muted-foreground,#888)',fontWeight:600}}>{labels[i]}</span>}
        </div>
      ))}
    </div>
  );
}

// ── Progress ring ──
function Ring({ pct, color, size=54, stroke=5, children }) {
  const r=(size-stroke*2)/2, C=2*Math.PI*r;
  return (
    <div style={{position:'relative',width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(var(--muted)/0.4)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C*(1-pct/100)} style={{transition:'stroke-dashoffset 0.5s'}}/>
      </svg>
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>{children}</div>
    </div>
  );
}

export default function MobileHome() {
  const navigate = useNavigate();
  const { tr } = useLang();
  const { accent } = useBarColors();
  const [data, setData] = useState({ clients:[], appts:[], todos:[], payments:[], plans:[], msgs:[] });
  const [quote] = useState(()=>QUOTES[Math.floor(Math.random()*QUOTES.length)]);
  const [editMode, setEditMode] = useState(false);
  const [editSlot, setEditSlot] = useState(null);
  const [slots, setSlots] = useState(()=>{
    try { const s=JSON.parse(localStorage.getItem(STORAGE_KEY)); if(Array.isArray(s)&&s.length) return s; } catch(e){}
    return DEFAULT_SLOTS;
  });

  const load = async () => {
    const [c,a,t,p,pl,m] = await Promise.all([
      db.Client.list('name'), db.Appointment.list('date',300),
      db.TodoItem.list('-created_date',50), db.Payment.list('-paid_date',80),
      db.TrainingPlan?.list?.('name').catch(()=>[])||[],
      db.Message?.filter?.({sender:'client',read:false}).catch(()=>[])||[],
    ]);
    setData({ clients:c, appts:a, todos:t, payments:p, plans:pl||[], msgs:m||[] });
  };
  useEffect(()=>{ load(); },[]);

  const saveSlots = (n)=>{ setSlots(n); try{localStorage.setItem(STORAGE_KEY,JSON.stringify(n));}catch(e){} };
  const setSlotWidget = (idx,key)=>{ const n=[...slots]; const allowed=WIDGETS[key].sizes; const cur=n[idx].size; n[idx]={w:key,size:allowed.includes(cur)?cur:allowed[0]}; saveSlots(n); setEditSlot(null); };
  const cycleSize = (idx)=>{ const n=[...slots]; const s=n[idx]; const sizes=WIDGETS[s.w].sizes; const ci=sizes.indexOf(s.size); n[idx]={...s,size:sizes[(ci+1)%sizes.length]}; saveSlots(n); };
  const removeSlot = (idx)=>{ const n=slots.filter((_,i)=>i!==idx); saveSlots(n.length?n:DEFAULT_SLOTS); };
  const addSlot = ()=>{ saveSlots([...slots,{w:'motivation',size:2}]); };

  const today = format(new Date(),'yyyy-MM-dd');
  const todayAppts = data.appts.filter(a=>a.date===today).sort((a,b)=>(a.start_time||'').localeCompare(b.start_time||''));
  const upcoming = data.appts.filter(a=>a.date>=today).sort((a,b)=>a.date===b.date?(a.start_time||'').localeCompare(b.start_time||''):a.date.localeCompare(b.date));
  const nextAppt = upcoming[0];
  const openTodos = data.todos.filter(t=>!t.completed);
  const monthStart = format(new Date(new Date().getFullYear(),new Date().getMonth(),1),'yyyy-MM-dd');
  const monthRevenue = data.payments.filter(p=>p.paid_date>=monthStart).reduce((s,p)=>s+(p.amount||0),0);

  // Last 6 months revenue for chart
  const revByMonth = (()=>{
    const arr=[];
    for(let i=5;i>=0;i--){
      const d=new Date(); d.setMonth(d.getMonth()-i);
      const ms=format(new Date(d.getFullYear(),d.getMonth(),1),'yyyy-MM-dd');
      const me=format(new Date(d.getFullYear(),d.getMonth()+1,0),'yyyy-MM-dd');
      const sum=data.payments.filter(p=>p.paid_date>=ms&&p.paid_date<=me).reduce((s,p)=>s+(p.amount||0),0);
      arr.push({v:sum,label:format(d,'MMM')[0]});
    }
    return arr;
  })();

  // Last 7 days session counts
  const weekActivity = (()=>{
    const days=eachDayOfInterval({start:subDays(new Date(),6),end:new Date()});
    return days.map(d=>{
      const ds=format(d,'yyyy-MM-dd');
      return { v:data.appts.filter(a=>a.date===ds).length, label:format(d,'EEEEE') };
    });
  })();

  const toggleTodo = async (t)=>{ await db.TodoItem.update(t.id,{completed:!t.completed}); load(); };

  // ── Widget content by key + size ──
  const renderWidget = (key, size) => {
    const W = WIDGETS[key]; if(!W) return null;
    const Icon = W.icon; const c = W.color;
    const head = (extra) => (
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:size===1?6:8}}>
        <div style={{width:32,height:32,borderRadius:9,background:`${c}1f`,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <Icon style={{width:17,height:17,color:c}}/>
        </div>
        {extra}
      </div>
    );

    switch(key){
      case 'today_sessions': {
        return (
          <div onClick={()=>!editMode&&navigate('/CalendarPage')} style={pad}>
            {head(<span style={{fontSize:size===1?24:30,fontWeight:900,color:c,fontFamily:'var(--font-display)'}}>{todayAppts.length}</span>)}
            <div style={{marginTop:'auto'}}>
              <div style={lbl}>{tr('nav_calendar')==='Ημερολόγιο'?'Σήμερα':"Today's sessions"}</div>
              {size===2 && todayAppts.slice(0,2).map((a,i)=>(
                <div key={i} style={{fontSize:11,color:'hsl(var(--foreground))',marginTop:4,display:'flex',gap:6}}>
                  <span style={{color:c,fontWeight:700}}>{a.start_time}</span><span style={{opacity:0.7,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.client_name}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }
      case 'clients_stat': {
        const active=data.clients.filter(c=>c.status!=='inactive').length;
        if(size===4) return (
          <div style={pad}>
            {head()}
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:12}}>
              <Ring pct={data.clients.length?Math.round(active/data.clients.length*100):0} color={c} size={68} stroke={6}>
                <span style={{fontSize:18,fontWeight:900,color:'hsl(var(--foreground))'}}>{data.clients.length}</span>
              </Ring>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:'hsl(var(--foreground))'}}>{active} active</div>
                <div style={{fontSize:11,color:'hsl(var(--muted-foreground))',marginTop:2}}>{data.clients.length-active} inactive</div>
              </div>
            </div>
            <div style={{...lbl,marginTop:'auto'}}>Total clients</div>
          </div>
        );
        return (
          <div onClick={()=>!editMode&&navigate('/Clients')} style={pad}>
            {head(<span style={{fontSize:size===1?24:30,fontWeight:900,color:c,fontFamily:'var(--font-display)'}}>{data.clients.length}</span>)}
            <div style={{...lbl,marginTop:'auto'}}>{tr('nav_clients')}{size===2?` · ${active} active`:''}</div>
          </div>
        );
      }
      case 'revenue_chart': {
        return (
          <div onClick={()=>!editMode&&navigate('/Logistics')} style={pad}>
            {head(<div style={{textAlign:'right'}}>
              <div style={{fontSize:size===4?22:18,fontWeight:900,color:'hsl(var(--foreground))',fontFamily:'var(--font-display)'}}>€{Math.round(monthRevenue).toLocaleString()}</div>
              <div style={{fontSize:9,color:'hsl(var(--muted-foreground))'}}>this month</div>
            </div>)}
            <div style={{marginTop:'auto'}}>
              <MiniBars data={revByMonth.map(r=>r.v)} color={c} height={size===4?70:42} labels={revByMonth.map(r=>r.label)}/>
            </div>
          </div>
        );
      }
      case 'week_activity': {
        const total=weekActivity.reduce((s,d)=>s+d.v,0);
        return (
          <div onClick={()=>!editMode&&navigate('/Statistics')} style={pad}>
            {head(<div style={{textAlign:'right'}}>
              <div style={{fontSize:size===4?22:18,fontWeight:900,color:'hsl(var(--foreground))',fontFamily:'var(--font-display)'}}>{total}</div>
              <div style={{fontSize:9,color:'hsl(var(--muted-foreground))'}}>sessions/wk</div>
            </div>)}
            <div style={{marginTop:'auto'}}>
              <MiniBars data={weekActivity.map(d=>d.v)} color={c} height={size===4?68:40} labels={weekActivity.map(d=>d.label)}/>
            </div>
          </div>
        );
      }
      case 'revenue_sparkline':
        return null;
      case 'todos': {
        const show = size===4?6:size===2?3:2;
        return (
          <div style={pad}>
            {head(<span style={{fontSize:20,fontWeight:900,color:c}}>{openTodos.length}</span>)}
            <div style={{display:'flex',flexDirection:'column',gap:5,overflow:'hidden',marginTop:2}}>
              {openTodos.slice(0,show).map(t=>(
                <div key={t.id} onClick={()=>!editMode&&toggleTodo(t)} style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer'}}>
                  <div style={{width:15,height:15,borderRadius:5,border:`2px solid ${c}`,flexShrink:0}}/>
                  <span style={{fontSize:12,color:'hsl(var(--foreground))',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.title}</span>
                </div>
              ))}
              {openTodos.length===0 && <span style={{fontSize:12,color:'hsl(var(--muted-foreground))'}}>All done ✓</span>}
            </div>
            {size===1 && openTodos.length>2 && <div style={{fontSize:10,color:c,marginTop:'auto',fontWeight:600}}>+{openTodos.length-2} more</div>}
          </div>
        );
      }
      case 'next_appt':
        return (
          <div onClick={()=>!editMode&&navigate('/CalendarPage')} style={pad}>
            {head()}
            {nextAppt?(
              <div style={{marginTop:'auto'}}>
                <div style={{fontSize:size===2?16:14,fontWeight:800,color:'hsl(var(--foreground))',lineHeight:1.15}}>{nextAppt.client_name}</div>
                <div style={{fontSize:11,color:c,fontWeight:700,marginTop:3}}>{nextAppt.date===today?'Today':format(parseISO(nextAppt.date),'EEE, MMM d')} · {nextAppt.start_time}</div>
                {size===2 && nextAppt.title && <div style={{fontSize:11,color:'hsl(var(--muted-foreground))',marginTop:2}}>{nextAppt.title}</div>}
              </div>
            ):<div style={{...lbl,marginTop:'auto'}}>No upcoming</div>}
          </div>
        );
      case 'notifications': {
        const notifs=[];
        todayAppts.forEach(a=>notifs.push({t:`${a.start_time} · ${a.client_name}`,s:'session today'}));
        data.payments.forEach(p=>{ if(p.period_to){const d=differenceInDays(parseISO(p.period_to),new Date()); if(d>=0&&d<=7)notifs.push({t:`${p.client_name}`,s:`plan ends in ${d}d`});}});
        const show=size===4?5:size===2?2:1;
        return (
          <div onClick={()=>!editMode&&navigate('/CalendarPage')} style={pad}>
            {head(<span style={{fontSize:20,fontWeight:900,color:c}}>{notifs.length}</span>)}
            <div style={{display:'flex',flexDirection:'column',gap:5,marginTop:2,overflow:'hidden'}}>
              {notifs.slice(0,show).map((n,i)=>(
                <div key={i} style={{fontSize:11,lineHeight:1.25}}>
                  <span style={{color:'hsl(var(--foreground))',fontWeight:600}}>{n.t}</span>
                  <span style={{color:'hsl(var(--muted-foreground))'}}> · {n.s}</span>
                </div>
              ))}
              {notifs.length===0 && <span style={{fontSize:12,color:'hsl(var(--muted-foreground))'}}>All clear ✓</span>}
            </div>
          </div>
        );
      }
      case 'active_plans':
        return (
          <div onClick={()=>!editMode&&navigate('/TrainingPlans')} style={pad}>
            {head(<span style={{fontSize:size===1?24:30,fontWeight:900,color:c,fontFamily:'var(--font-display)'}}>{data.plans.length}</span>)}
            <div style={{...lbl,marginTop:'auto'}}>{tr('nav_training')}</div>
          </div>
        );
      case 'motivation':
        return (
          <div style={{...pad,justifyContent:'center'}}>
            {head()}
            <p style={{fontSize:size===4?16:13,lineHeight:1.5,color:'hsl(var(--foreground))',fontStyle:'italic',fontWeight:500,margin:0}}>"{quote}"</p>
          </div>
        );
      default: return null;
    }
  };

  const spanStyle = (size)=>{
    if(size===2) return { gridColumn:'span 2' };
    if(size===4) return { gridColumn:'span 2', gridRow:'span 2' };
    return {};
  };

  return (
    <div style={{padding:'16px 14px',minHeight:'100vh'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <div>
          <p style={{fontSize:11,color:'hsl(var(--muted-foreground))',letterSpacing:'0.04em',margin:0}}>{format(new Date(),'EEEE, MMMM d')}</p>
          <h1 style={{fontSize:24,fontWeight:800,color:'hsl(var(--foreground))',margin:'2px 0 0',fontFamily:'var(--font-display)',letterSpacing:'-0.02em'}}>
            {(()=>{ const h=new Date().getHours(); return h<12?'Good morning':h<18?'Good afternoon':'Good evening'; })()}
          </h1>
        </div>
        <button onClick={()=>setEditMode(v=>!v)}
          style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:12,border:'none',cursor:'pointer',
            background:editMode?accent:'hsl(var(--muted)/0.6)',color:editMode?'#fff':'hsl(var(--foreground))',
            fontSize:12,fontWeight:700,transition:'all 0.2s'}}>
          {editMode?<><Check style={{width:14,height:14}}/>Done</>:<><Settings2 style={{width:14,height:14}}/>Edit</>}
        </button>
      </div>

      {/* Widget grid */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gridAutoRows:'minmax(96px, auto)',gap:10,gridAutoFlow:'dense'}}>
        {slots.map((slot,idx)=>{
          const isBig = slot.size===4;
          return (
            <div key={idx} style={{position:'relative',...spanStyle(slot.size),
              minHeight: slot.size===4?202:96,
              background:'hsl(var(--card))',border:'1px solid hsl(var(--border))',borderRadius:18,overflow:'hidden',
              boxShadow: editMode?'0 0 0 2px hsl(var(--primary)/0.3)':'none',
              animation: editMode?'wiggle 0.3s ease-in-out infinite alternate':'none'}}>
              {renderWidget(slot.w, slot.size)}

              {/* Edit controls */}
              {editMode && (
                <div style={{position:'absolute',top:6,right:6,display:'flex',gap:4,zIndex:3}}>
                  {WIDGETS[slot.w].sizes.length>1 && (
                    <button onClick={(e)=>{e.stopPropagation();cycleSize(idx);}}
                      style={ctrlBtn}><Maximize2 style={{width:12,height:12}}/></button>
                  )}
                  <button onClick={(e)=>{e.stopPropagation();setEditSlot(idx);}}
                    style={ctrlBtn}><Settings2 style={{width:12,height:12}}/></button>
                  <button onClick={(e)=>{e.stopPropagation();removeSlot(idx);}}
                    style={{...ctrlBtn,background:'rgba(239,68,68,0.9)'}}><X style={{width:12,height:12}}/></button>
                </div>
              )}
            </div>
          );
        })}

        {/* Add widget button (edit mode) */}
        {editMode && (
          <button onClick={addSlot}
            style={{minHeight:96,borderRadius:18,border:'2px dashed hsl(var(--border))',background:'hsl(var(--muted)/0.3)',
              cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,
              color:'hsl(var(--muted-foreground))'}}>
            <div style={{width:32,height:32,borderRadius:'50%',background:'hsl(var(--muted)/0.6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>+</div>
            <span style={{fontSize:11,fontWeight:600}}>Add widget</span>
          </button>
        )}
      </div>

      <style>{`@keyframes wiggle{from{transform:rotate(-0.5deg)}to{transform:rotate(0.5deg)}}
        @keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

      {/* Widget picker */}
      {editSlot!==null && (
        <>
          <div onClick={()=>setEditSlot(null)} style={{position:'fixed',inset:0,zIndex:80,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(3px)'}}/>
          <div style={{position:'fixed',left:0,right:0,bottom:0,zIndex:81,background:'hsl(var(--card))',
            borderTopLeftRadius:24,borderTopRightRadius:24,borderTop:'1px solid hsl(var(--border))',
            padding:'10px 16px calc(20px + env(safe-area-inset-bottom))',boxShadow:'0 -8px 40px rgba(0,0,0,0.5)',
            animation:'sheetUp 0.26s cubic-bezier(0.22,1,0.36,1)',maxHeight:'75vh',overflowY:'auto'}}>
            <div style={{width:38,height:4,borderRadius:4,background:'hsl(var(--muted-foreground)/0.3)',margin:'4px auto 14px'}}/>
            <p style={{fontSize:13,fontWeight:700,color:'hsl(var(--foreground))',marginBottom:4,textAlign:'center'}}>Choose a widget</p>
            <p style={{fontSize:11,color:'hsl(var(--muted-foreground))',marginBottom:14,textAlign:'center'}}>Tap ⤢ afterwards to resize</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {Object.entries(WIDGETS).map(([key,w])=>{
                const Icon=w.icon; const isCur=slots[editSlot]?.w===key;
                return (
                  <button key={key} onClick={()=>setSlotWidget(editSlot,key)}
                    style={{display:'flex',alignItems:'center',gap:10,padding:'12px',borderRadius:14,
                      border:isCur?`2px solid ${w.color}`:'1px solid hsl(var(--border))',
                      background:isCur?`${w.color}14`:'hsl(var(--muted)/0.4)',cursor:'pointer',textAlign:'left'}}>
                    <div style={{width:32,height:32,borderRadius:9,background:`${w.color}1f`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <Icon style={{width:17,height:17,color:w.color}}/>
                    </div>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:11.5,fontWeight:600,color:'hsl(var(--foreground))',lineHeight:1.2}}>{w.label}</div>
                      <div style={{fontSize:9,color:'hsl(var(--muted-foreground))',marginTop:1}}>{w.sizes.map(s=>s===1?'S':s===2?'M':'L').join(' · ')}</div>
                    </div>
                    {isCur && <Check style={{width:14,height:14,color:w.color,marginLeft:'auto',flexShrink:0}}/>}
                  </button>
                );
              })}
            </div>
            <button onClick={()=>setEditSlot(null)} style={{width:'100%',marginTop:14,padding:'12px',borderRadius:14,border:'none',
              background:'hsl(var(--muted)/0.5)',color:'hsl(var(--muted-foreground))',fontSize:14,fontWeight:600,cursor:'pointer'}}>Done</button>
          </div>
        </>
      )}
    </div>
  );
}

const pad = { position:'absolute',inset:0,padding:'13px',display:'flex',flexDirection:'column' };
const lbl = { fontSize:11,color:'hsl(var(--muted-foreground))',fontWeight:600 };
const ctrlBtn = { width:24,height:24,borderRadius:7,border:'none',cursor:'pointer',background:'rgba(0,0,0,0.6)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)' };
