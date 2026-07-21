import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Calendar, Dumbbell, Salad, TrendingUp, Droplet, Bell,
  Clock, Sparkles, Activity, Settings2, Check, Plus } from 'lucide-react';
import { db } from '../lib/db';
import { useAppContext } from '../lib/AppContext';
import { useLang } from '../lib/LangContext';
import ClientLayout from './client-portal/ClientLayout';

const QUOTES = [
  "Every rep counts. Show up for yourself today.",
  "Progress, not perfection.",
  "Your only competition is who you were yesterday.",
  "Strong is earned, never given.",
  "One session at a time.",
];

// Widgets available to a CLIENT
const WIDGETS = {
  next_session:  { icon:Clock,      label:'Next Session',      color:'#06b6d4' },
  weight:        { icon:TrendingUp, label:'Current Weight',    color:'#22c55e' },
  water:         { icon:Droplet,    label:'Water Today',       color:'#3b82f6' },
  training_plan: { icon:Dumbbell,   label:'Training Plan',     color:'#ec4899' },
  nutrition:     { icon:Salad,      label:'Nutrition Plan',    color:'#84cc16' },
  reminders:     { icon:Bell,       label:'Reminders',         color:'#f59e0b' },
  sessions_done: { icon:Activity,   label:'Sessions Done',     color:'#8b5cf6' },
  motivation:    { icon:Sparkles,   label:'Motivation',        color:'#a855f7' },
  upcoming:      { icon:Calendar,   label:'Upcoming Count',    color:'#14b8a6' },
};

const DEFAULT_SLOTS = ['next_session','weight','water','training_plan','reminders','motivation'];
const STORAGE_KEY = 'cp_home_widgets';

export default function MobileClientHome() {
  const { clientUser } = useAppContext();
  const navigate = useNavigate();
  const { tr } = useLang();
  const [client, setClient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [progress, setProgress] = useState([]);
  const [plans, setPlans] = useState([]);
  const [nutritionPlans, setNutritionPlans] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [water, setWater] = useState(null);
  const [quote] = useState(()=>QUOTES[Math.floor(Math.random()*QUOTES.length)]);
  const [editSlot, setEditSlot] = useState(null);
  const [slots, setSlots] = useState(()=>{
    try { const s=JSON.parse(localStorage.getItem(STORAGE_KEY)); if(Array.isArray(s)&&s.length===6) return s; } catch(e){}
    return DEFAULT_SLOTS;
  });

  const today = format(new Date(),'yyyy-MM-dd');
  const load = async () => {
    if (!clientUser?.clientId) return;
    const cid = clientUser.clientId;
    const [c,a,prog,tp,np,rem,wl] = await Promise.all([
      db.Client.get(cid),
      db.Appointment.filter({client_id:cid},'date'),
      db.ClientProgress.filter({client_id:cid},'date'),
      db.TrainingPlan.filter({client_id:cid},'-date',5),
      db.NutritionPlan.filter({client_id:cid},'-date',1),
      db.ClientReminder.filter({client_id:cid},'-created_date'),
      db.WaterLog.filter({client_id:cid,date:today}),
    ]);
    setClient(c); setAppointments(a); setProgress(prog);
    setPlans(tp); setNutritionPlans(np); setReminders(rem); setWater(wl[0]||null);
  };
  useEffect(()=>{ load(); },[clientUser]);

  const saveSlots = (n)=>{ setSlots(n); try{localStorage.setItem(STORAGE_KEY,JSON.stringify(n));}catch(e){} };
  const setSlotWidget = (idx,key)=>{ const n=[...slots]; n[idx]=key; saveSlots(n); setEditSlot(null); };

  // Derived
  const upcoming = appointments.filter(a=>a.date>=today)
    .sort((a,b)=>a.date===b.date?(a.start_time||'').localeCompare(b.start_time||''):a.date.localeCompare(b.date));
  const next = upcoming[0];
  const latest = progress[progress.length-1];
  const prevProg = progress.length>1?progress[progress.length-2]:null;
  const weightDelta = latest&&prevProg&&latest.weight_kg&&prevProg.weight_kg ? (latest.weight_kg-prevProg.weight_kg) : null;
  const waterL = water?.amount_liters||0;
  const waterGoal = client?.water_goal_liters||2.5;
  const openRem = reminders.filter(r=>!r.completed);
  const monthStart = format(new Date(new Date().getFullYear(),new Date().getMonth(),1),'yyyy-MM-dd');
  const sessionsDone = appointments.filter(a=>a.date>=monthStart&&a.date<=today&&a.status==='scheduled').length;

  const toggleRem = async (r)=>{ await db.ClientReminder.update(r.id,{completed:!r.completed}); load(); };
  const addWater = async (amt)=>{
    const cur=waterL;
    if(water?.id) await db.WaterLog.update(water.id,{amount_liters:parseFloat((cur+amt).toFixed(2))});
    else await db.WaterLog.create({client_id:clientUser.clientId,date:today,amount_liters:amt});
    load();
  };

  const renderWidget = (key) => {
    const w = WIDGETS[key]; if(!w) return null;
    const Icon = w.icon;
    const iconBox = (
      <div style={{width:34,height:34,borderRadius:10,background:`${w.color}1f`,
        display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        <Icon style={{width:18,height:18,color:w.color}}/>
      </div>
    );

    switch(key){
      case 'next_session':
        return (
          <div style={boxInner}>
            {iconBox}
            {next ? (
              <div style={{marginTop:8}}>
                <div style={{fontSize:15,fontWeight:800,color:'var(--cp-text)',lineHeight:1.15}}>
                  {next.date===today?'Today':format(parseISO(next.date),'MMM d')}
                </div>
                <div style={subLine}>{next.start_time} · {next.title||'Session'}</div>
              </div>
            ) : <div style={{marginTop:8,fontSize:12,color:'var(--cp-text-dim)'}}>None booked</div>}
          </div>
        );
      case 'weight':
        return (
          <div style={boxInner}>
            {iconBox}
            <div style={{marginTop:8}}>
              <div style={bigNum}>{latest?.weight_kg?`${latest.weight_kg}`:'—'}<span style={{fontSize:13,fontWeight:600}}>kg</span></div>
              {weightDelta!==null && (
                <div style={{fontSize:11,fontWeight:600,marginTop:2,color:weightDelta<0?'#22c55e':weightDelta>0?'#f59e0b':'var(--cp-text-dim)'}}>
                  {weightDelta>0?'+':''}{weightDelta.toFixed(1)}kg
                </div>
              )}
            </div>
          </div>
        );
      case 'water':
        return (
          <div style={{...boxInner,cursor:'default'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              {iconBox}
              <span style={{fontSize:13,fontWeight:700,color:w.color}}>{waterL.toFixed(1)}/{waterGoal}L</span>
            </div>
            <div style={{marginTop:8}}>
              <div style={{height:6,borderRadius:6,background:'var(--cp-border)',overflow:'hidden'}}>
                <div style={{height:'100%',width:`${Math.min(100,(waterL/waterGoal)*100)}%`,
                  background:w.color,borderRadius:6,transition:'width 0.3s'}}/>
              </div>
              <div style={{display:'flex',gap:5,marginTop:8}}>
                {[0.25,0.5].map(amt=>(
                  <button key={amt} onClick={()=>addWater(amt)}
                    style={{flex:1,padding:'6px 0',borderRadius:8,border:`1px solid ${w.color}55`,
                      background:`${w.color}14`,color:w.color,fontSize:10,fontWeight:700,cursor:'pointer'}}>
                    +{amt*1000}ml
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 'training_plan':
        return (
          <div onClick={()=>navigate('/client-training')} style={boxInner}>
            {iconBox}
            <div style={{marginTop:8}}>
              {plans[0] ? (
                <>
                  <div style={{fontSize:13,fontWeight:800,color:'var(--cp-text)',lineHeight:1.2,
                    overflow:'hidden',textOverflow:'ellipsis',display:'-webkit-box',
                    WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{plans[0].title}</div>
                  <div style={subLine}>{plans[0].exercises?.length||0} exercises</div>
                </>
              ) : <div style={{fontSize:12,color:'var(--cp-text-dim)'}}>No plan yet</div>}
            </div>
          </div>
        );
      case 'nutrition':
        return (
          <div onClick={()=>navigate('/client-nutrition')} style={boxInner}>
            {iconBox}
            <div style={{marginTop:8}}>
              {nutritionPlans[0] ? (
                <>
                  <div style={{fontSize:13,fontWeight:800,color:'var(--cp-text)',lineHeight:1.2}}>
                    {nutritionPlans[0].daily_calories||'—'} kcal
                  </div>
                  <div style={subLine}>Daily target</div>
                </>
              ) : <div style={{fontSize:12,color:'var(--cp-text-dim)'}}>No plan yet</div>}
            </div>
          </div>
        );
      case 'reminders':
        return (
          <div style={{...boxInner,cursor:'default'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              {iconBox}
              <span style={{fontSize:20,fontWeight:800,color:w.color}}>{openRem.length}</span>
            </div>
            <div style={{marginTop:6,display:'flex',flexDirection:'column',gap:4,overflow:'hidden'}}>
              {openRem.slice(0,3).map(r=>(
                <div key={r.id} onClick={()=>toggleRem(r)} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
                  <div style={{width:14,height:14,borderRadius:4,border:`1.5px solid ${w.color}`,flexShrink:0}}/>
                  <span style={{fontSize:11,color:'var(--cp-text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.text||r.title}</span>
                </div>
              ))}
              {openRem.length===0 && <span style={{fontSize:11,color:'var(--cp-text-dim)'}}>All clear ✓</span>}
            </div>
          </div>
        );
      case 'sessions_done':
        return (
          <div style={boxInner}>
            {iconBox}
            <div style={{marginTop:8}}>
              <div style={bigNum}>{sessionsDone}</div>
              <div style={lbl}>This month</div>
            </div>
          </div>
        );
      case 'upcoming':
        return (
          <div onClick={()=>navigate('/client-training')} style={boxInner}>
            {iconBox}
            <div style={{marginTop:8}}>
              <div style={bigNum}>{upcoming.length}</div>
              <div style={lbl}>Upcoming</div>
            </div>
          </div>
        );
      case 'motivation':
        return (
          <div style={{...boxInner,cursor:'default',justifyContent:'center'}}>
            {iconBox}
            <p style={{marginTop:8,fontSize:12,lineHeight:1.45,color:'var(--cp-text)',fontStyle:'italic',fontWeight:500}}>"{quote}"</p>
          </div>
        );
      default: return null;
    }
  };

  return (
    <ClientLayout title="">
      <div style={{padding:'16px 14px',minHeight:'100vh'}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <div>
            <p style={{fontSize:11,color:'var(--cp-text-dim)',letterSpacing:'0.04em',margin:0,textTransform:'uppercase'}}>
              {format(new Date(),'EEEE, d MMMM')}
            </p>
            <h1 style={{fontSize:23,fontWeight:800,color:'var(--cp-text)',margin:'2px 0 0',
              fontFamily:'var(--cp-font)',letterSpacing:'-0.02em'}}>
              Hello, {client?.name?.split(' ')[0]||'Athlete'}
            </h1>
          </div>
        </div>

        {/* Widget grid */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {slots.map((key,idx)=>(
            <div key={idx} style={{position:'relative',aspectRatio:'1 / 1',
              background:'var(--cp-card-bg)',border:'1px solid var(--cp-border)',
              borderRadius:18,overflow:'hidden'}}>
              {renderWidget(key)}
              <button onClick={(e)=>{e.stopPropagation();setEditSlot(idx);}}
                style={{position:'absolute',top:6,right:6,width:24,height:24,borderRadius:8,
                  border:'none',background:'var(--cp-card-alt)',cursor:'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',zIndex:2}}>
                <Settings2 style={{width:12,height:12,color:'var(--cp-text-dim)'}}/>
              </button>
            </div>
          ))}
        </div>

        {/* Picker sheet */}
        {editSlot!==null && (
          <>
            <div onClick={()=>setEditSlot(null)}
              style={{position:'fixed',inset:0,zIndex:80,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(3px)'}}/>
            <div style={{position:'fixed',left:0,right:0,bottom:0,zIndex:81,background:'var(--cp-card-bg)',
              borderTopLeftRadius:24,borderTopRightRadius:24,borderTop:'1px solid var(--cp-border)',
              padding:'10px 16px calc(20px + env(safe-area-inset-bottom))',
              boxShadow:'0 -8px 40px rgba(0,0,0,0.5)',animation:'sheetUp 0.26s cubic-bezier(0.22,1,0.36,1)',
              maxHeight:'75vh',overflowY:'auto'}}>
              <style>{`@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
              <div style={{width:38,height:4,borderRadius:4,background:'var(--cp-text-dim)',opacity:0.4,margin:'4px auto 14px'}}/>
              <p style={{fontSize:13,fontWeight:700,color:'var(--cp-text)',marginBottom:4,textAlign:'center'}}>Choose a widget</p>
              <p style={{fontSize:11,color:'var(--cp-text-dim)',marginBottom:14,textAlign:'center'}}>Pick what this box shows</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {Object.entries(WIDGETS).map(([key,w])=>{
                  const Icon=w.icon;
                  const isCur=slots[editSlot]===key;
                  const usedElsewhere=slots.includes(key)&&!isCur;
                  return (
                    <button key={key} onClick={()=>setSlotWidget(editSlot,key)} disabled={usedElsewhere}
                      style={{display:'flex',alignItems:'center',gap:10,padding:'12px',borderRadius:14,
                        border:isCur?`2px solid ${w.color}`:'1px solid var(--cp-border)',
                        background:isCur?`${w.color}14`:'var(--cp-card-alt)',
                        cursor:usedElsewhere?'not-allowed':'pointer',opacity:usedElsewhere?0.4:1,textAlign:'left'}}>
                      <div style={{width:32,height:32,borderRadius:9,background:`${w.color}1f`,
                        display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <Icon style={{width:17,height:17,color:w.color}}/>
                      </div>
                      <span style={{fontSize:11.5,fontWeight:600,color:'var(--cp-text)',lineHeight:1.2}}>{w.label}</span>
                      {isCur && <Check style={{width:14,height:14,color:w.color,marginLeft:'auto',flexShrink:0}}/>}
                    </button>
                  );
                })}
              </div>
              <button onClick={()=>setEditSlot(null)}
                style={{width:'100%',marginTop:14,padding:'12px',borderRadius:14,border:'none',
                  background:'var(--cp-card-alt)',color:'var(--cp-text-dim)',fontSize:14,fontWeight:600,cursor:'pointer'}}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </ClientLayout>
  );
}

const boxInner = { position:'absolute',inset:0,padding:'12px',display:'flex',flexDirection:'column',cursor:'pointer' };
const bigNum = { fontSize:26,fontWeight:900,color:'var(--cp-text)',lineHeight:1,fontFamily:'var(--cp-font)',letterSpacing:'-0.02em' };
const lbl = { fontSize:10.5,color:'var(--cp-text-dim)',marginTop:3,fontWeight:600 };
const subLine = { fontSize:10,color:'var(--cp-text-dim)',marginTop:'auto',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' };
