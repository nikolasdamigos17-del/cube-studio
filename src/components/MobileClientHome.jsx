import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, subDays, eachDayOfInterval } from 'date-fns';
import { Calendar, Dumbbell, Salad, TrendingUp, Droplet, Bell,
  Clock, Sparkles, Activity, Settings2, Check, X, Maximize2 } from 'lucide-react';
import { db } from '../lib/db';
import { useAppContext } from '../lib/AppContext';
import { useLang } from '../lib/LangContext';
import { useBarColors } from './BarbellNav';
import ClientLayout from './client-portal/ClientLayout';

const QUOTES = [
  "Every rep counts. Show up for yourself today.",
  "Progress, not perfection.",
  "Your only competition is who you were yesterday.",
  "Strong is earned, never given.",
  "One session at a time.",
];

const WIDGETS = {
  next_session:  { label:'Next Session',   icon:Clock,      color:'#06b6d4', sizes:[1,2] },
  weight_chart:  { label:'Weight Trend',   icon:TrendingUp, color:'#22c55e', sizes:[2,4] },
  water:         { label:'Water Intake',   icon:Droplet,    color:'#3b82f6', sizes:[1,2,4] },
  training_plan: { label:'Training Plan',  icon:Dumbbell,   color:'#ec4899', sizes:[1,2] },
  nutrition:     { label:'Nutrition',      icon:Salad,      color:'#84cc16', sizes:[1,2] },
  reminders:     { label:'Reminders',      icon:Bell,       color:'#f59e0b', sizes:[1,2,4] },
  consistency:   { label:'Consistency',    icon:Activity,   color:'#8b5cf6', sizes:[2,4] },
  motivation:    { label:'Motivation',     icon:Sparkles,   color:'#a855f7', sizes:[2,4] },
};

const DEFAULT_SLOTS = [
  { w:'next_session', size:1 },
  { w:'water',        size:1 },
  { w:'weight_chart', size:2 },
  { w:'consistency',  size:2 },
  { w:'training_plan',size:1 },
  { w:'reminders',    size:1 },
];
const STORAGE_KEY = 'cp_home_widgets_v2';

function Sparkline({ data, color, height=32 }) {
  if(!data||data.length<2) return <div style={{height}}/>;
  const max=Math.max(...data),min=Math.min(...data),range=max-min||1,w=100;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${height-((v-min)/range)*height}`).join(' ');
  const gid='cs'+color.replace('#','');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{width:'100%',height,display:'block'}}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={color} stopOpacity="0.35"/><stop offset="1" stopColor={color} stopOpacity="0"/>
      </linearGradient></defs>
      <polygon points={`0,${height} ${pts} ${w},${height}`} fill={`url(#${gid})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
    </svg>
  );
}
function MiniBars({ data, color, height=40, labels }) {
  const max=Math.max(...data,1);
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:3,height,width:'100%'}}>
      {data.map((v,i)=>(
        <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,height:'100%',justifyContent:'flex-end'}}>
          <div style={{width:'100%',height:`${Math.max(4,(v/max)*100)}%`,background:color,borderRadius:'3px 3px 0 0',opacity:i===data.length-1?1:0.5}}/>
          {labels&&<span style={{fontSize:7,color:'var(--cp-text-dim)',fontWeight:600}}>{labels[i]}</span>}
        </div>
      ))}
    </div>
  );
}
function Ring({ pct, color, size=54, stroke=5, children }) {
  const r=(size-stroke*2)/2,C=2*Math.PI*r;
  return (
    <div style={{position:'relative',width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--cp-border)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C*(1-pct/100)} style={{transition:'stroke-dashoffset 0.5s'}}/>
      </svg>
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>{children}</div>
    </div>
  );
}

export default function MobileClientHome() {
  const { clientUser } = useAppContext();
  const navigate = useNavigate();
  const { tr } = useLang();
  const { accent } = useBarColors();
  const [d, setD] = useState({ client:null, appts:[], progress:[], plans:[], nutrition:[], reminders:[], water:null });
  const [quote] = useState(()=>QUOTES[Math.floor(Math.random()*QUOTES.length)]);
  const [editMode, setEditMode] = useState(false);
  const [editSlot, setEditSlot] = useState(null);
  const [slots, setSlots] = useState(()=>{
    try { const s=JSON.parse(localStorage.getItem(STORAGE_KEY)); if(Array.isArray(s)&&s.length) return s; } catch(e){}
    return DEFAULT_SLOTS;
  });

  const today = format(new Date(),'yyyy-MM-dd');
  const load = async () => {
    if(!clientUser?.clientId) return;
    const cid=clientUser.clientId;
    const [c,a,prog,tp,np,rem,wl] = await Promise.all([
      db.Client.get(cid), db.Appointment.filter({client_id:cid},'date'),
      db.ClientProgress.filter({client_id:cid},'date'), db.TrainingPlan.filter({client_id:cid},'-date',5),
      db.NutritionPlan.filter({client_id:cid},'-date',1), db.ClientReminder.filter({client_id:cid},'-created_date'),
      db.WaterLog.filter({client_id:cid,date:today}),
    ]);
    setD({ client:c, appts:a, progress:prog, plans:tp, nutrition:np, reminders:rem, water:wl[0]||null });
  };
  useEffect(()=>{ load(); },[clientUser]);

  const saveSlots=(n)=>{ setSlots(n); try{localStorage.setItem(STORAGE_KEY,JSON.stringify(n));}catch(e){} };
  const setSlotWidget=(idx,key)=>{ const n=[...slots]; const allowed=WIDGETS[key].sizes; const cur=n[idx].size; n[idx]={w:key,size:allowed.includes(cur)?cur:allowed[0]}; saveSlots(n); setEditSlot(null); };
  const cycleSize=(idx)=>{ const n=[...slots]; const s=n[idx]; const sizes=WIDGETS[s.w].sizes; const ci=sizes.indexOf(s.size); n[idx]={...s,size:sizes[(ci+1)%sizes.length]}; saveSlots(n); };
  const removeSlot=(idx)=>{ const n=slots.filter((_,i)=>i!==idx); saveSlots(n.length?n:DEFAULT_SLOTS); };
  const addSlot=()=>{ saveSlots([...slots,{w:'motivation',size:2}]); };

  const upcoming=d.appts.filter(a=>a.date>=today).sort((a,b)=>a.date===b.date?(a.start_time||'').localeCompare(b.start_time||''):a.date.localeCompare(b.date));
  const next=upcoming[0];
  const weightSeries=d.progress.filter(p=>p.weight_kg).slice(-8).map(p=>p.weight_kg);
  const latestW=weightSeries[weightSeries.length-1];
  const firstW=weightSeries[0];
  const wDelta=latestW&&firstW?latestW-firstW:null;
  const waterL=d.water?.amount_liters||0;
  const waterGoal=d.client?.water_goal_liters||2.5;
  const openRem=d.reminders.filter(r=>!r.completed);

  const consistency=(()=>{
    const days=eachDayOfInterval({start:subDays(new Date(),6),end:new Date()});
    return days.map(dd=>{ const ds=format(dd,'yyyy-MM-dd'); return { v:d.appts.filter(a=>a.date===ds&&a.status==='scheduled').length, label:format(dd,'EEEEE') }; });
  })();

  const toggleRem=async(r)=>{ await db.ClientReminder.update(r.id,{completed:!r.completed}); load(); };
  const addWater=async(amt)=>{ const cur=waterL; if(d.water?.id) await db.WaterLog.update(d.water.id,{amount_liters:parseFloat((cur+amt).toFixed(2))}); else await db.WaterLog.create({client_id:clientUser.clientId,date:today,amount_liters:amt}); load(); };

  const renderWidget=(key,size)=>{
    const W=WIDGETS[key]; if(!W) return null;
    const Icon=W.icon; const c=W.color;
    const head=(extra)=>(
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:size===1?6:8}}>
        <div style={{width:32,height:32,borderRadius:9,background:`${c}1f`,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <Icon style={{width:17,height:17,color:c}}/>
        </div>
        {extra}
      </div>
    );

    switch(key){
      case 'next_session':
        return (
          <div onClick={()=>!editMode&&navigate('/client-training')} style={pad}>
            {head()}
            {next?(
              <div style={{marginTop:'auto'}}>
                <div style={{fontSize:size===2?16:14,fontWeight:800,color:'var(--cp-text)',lineHeight:1.15}}>{next.date===today?'Today':format(parseISO(next.date),'EEE, MMM d')}</div>
                <div style={{fontSize:11,color:c,fontWeight:700,marginTop:3}}>{next.start_time} · {next.title||'Session'}</div>
              </div>
            ):<div style={{...lbl,marginTop:'auto'}}>None booked</div>}
          </div>
        );
      case 'weight_chart':
        return (
          <div onClick={()=>!editMode&&navigate('/client-stats')} style={pad}>
            {head(<div style={{textAlign:'right'}}>
              <div style={{fontSize:size===4?24:18,fontWeight:900,color:'var(--cp-text)',fontFamily:'var(--cp-font)'}}>{latestW?`${latestW}`:'—'}<span style={{fontSize:12,fontWeight:600}}>kg</span></div>
              {wDelta!==null&&<div style={{fontSize:10,fontWeight:700,color:wDelta<0?'#22c55e':wDelta>0?'#f59e0b':'var(--cp-text-dim)'}}>{wDelta>0?'+':''}{wDelta.toFixed(1)}kg</div>}
            </div>)}
            <div style={{marginTop:'auto'}}>
              {weightSeries.length>1?<Sparkline data={weightSeries} color={c} height={size===4?70:40}/>:<div style={{...lbl}}>Not enough data</div>}
            </div>
          </div>
        );
      case 'water': {
        const pct=Math.min(100,(waterL/waterGoal)*100);
        if(size===4) return (
          <div style={pad}>
            {head()}
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:10}}>
              <Ring pct={pct} color={c} size={72} stroke={7}>
                <div style={{textAlign:'center'}}><div style={{fontSize:15,fontWeight:900,color:'var(--cp-text)'}}>{waterL.toFixed(1)}</div><div style={{fontSize:8,color:'var(--cp-text-dim)'}}>of {waterGoal}L</div></div>
              </Ring>
              <div style={{flex:1}}>
                <div style={{fontSize:12,color:'var(--cp-text-dim)',marginBottom:8}}>Daily hydration</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {[0.25,0.5].map(a=><button key={a} onClick={(e)=>{e.stopPropagation();addWater(a);}} style={{padding:'8px 12px',borderRadius:10,border:`1px solid ${c}55`,background:`${c}14`,color:c,fontSize:11,fontWeight:700,cursor:'pointer'}}>+{a*1000}ml</button>)}
                </div>
              </div>
            </div>
          </div>
        );
        return (
          <div style={{...pad,cursor:'default'}}>
            {head(<span style={{fontSize:13,fontWeight:700,color:c}}>{waterL.toFixed(1)}/{waterGoal}L</span>)}
            <div style={{marginTop:'auto'}}>
              <div style={{height:6,borderRadius:6,background:'var(--cp-border)',overflow:'hidden',marginBottom:8}}>
                <div style={{height:'100%',width:`${pct}%`,background:c,borderRadius:6,transition:'width 0.3s'}}/>
              </div>
              <div style={{display:'flex',gap:5}}>
                {[0.25,0.5].map(a=><button key={a} onClick={(e)=>{e.stopPropagation();addWater(a);}} style={{flex:1,padding:'6px 0',borderRadius:8,border:`1px solid ${c}55`,background:`${c}14`,color:c,fontSize:10,fontWeight:700,cursor:'pointer'}}>+{a*1000}</button>)}
              </div>
            </div>
          </div>
        );
      }
      case 'training_plan':
        return (
          <div onClick={()=>!editMode&&navigate('/client-training')} style={pad}>
            {head()}
            {d.plans[0]?(
              <div style={{marginTop:'auto'}}>
                <div style={{fontSize:13,fontWeight:800,color:'var(--cp-text)',lineHeight:1.2,overflow:'hidden',textOverflow:'ellipsis',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{d.plans[0].title}</div>
                <div style={{fontSize:11,color:c,fontWeight:600,marginTop:3}}>{d.plans[0].exercises?.length||0} exercises</div>
              </div>
            ):<div style={{...lbl,marginTop:'auto'}}>No plan yet</div>}
          </div>
        );
      case 'nutrition':
        return (
          <div onClick={()=>!editMode&&navigate('/client-nutrition')} style={pad}>
            {head()}
            {d.nutrition[0]?(
              <div style={{marginTop:'auto'}}>
                <div style={{fontSize:size===2?20:17,fontWeight:900,color:'var(--cp-text)',fontFamily:'var(--cp-font)'}}>{d.nutrition[0].daily_calories||'—'}</div>
                <div style={{...lbl}}>kcal daily target</div>
              </div>
            ):<div style={{...lbl,marginTop:'auto'}}>No plan yet</div>}
          </div>
        );
      case 'reminders': {
        const show=size===4?6:size===2?3:2;
        return (
          <div style={pad}>
            {head(<span style={{fontSize:20,fontWeight:900,color:c}}>{openRem.length}</span>)}
            <div style={{display:'flex',flexDirection:'column',gap:5,overflow:'hidden',marginTop:2}}>
              {openRem.slice(0,show).map(r=>(
                <div key={r.id} onClick={()=>!editMode&&toggleRem(r)} style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer'}}>
                  <div style={{width:15,height:15,borderRadius:5,border:`2px solid ${c}`,flexShrink:0}}/>
                  <span style={{fontSize:12,color:'var(--cp-text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.text||r.title}</span>
                </div>
              ))}
              {openRem.length===0&&<span style={{fontSize:12,color:'var(--cp-text-dim)'}}>All clear ✓</span>}
            </div>
          </div>
        );
      }
      case 'consistency': {
        const total=consistency.reduce((s,x)=>s+x.v,0);
        return (
          <div onClick={()=>!editMode&&navigate('/client-stats')} style={pad}>
            {head(<div style={{textAlign:'right'}}>
              <div style={{fontSize:size===4?22:18,fontWeight:900,color:'var(--cp-text)',fontFamily:'var(--cp-font)'}}>{total}</div>
              <div style={{fontSize:9,color:'var(--cp-text-dim)'}}>this week</div>
            </div>)}
            <div style={{marginTop:'auto'}}><MiniBars data={consistency.map(x=>x.v)} color={c} height={size===4?66:40} labels={consistency.map(x=>x.label)}/></div>
          </div>
        );
      }
      case 'motivation':
        return (
          <div style={{...pad,justifyContent:'center'}}>
            {head()}
            <p style={{fontSize:size===4?16:13,lineHeight:1.5,color:'var(--cp-text)',fontStyle:'italic',fontWeight:500,margin:0}}>"{quote}"</p>
          </div>
        );
      default: return null;
    }
  };

  const spanStyle=(size)=>{ if(size===2) return {gridColumn:'span 2'}; if(size===4) return {gridColumn:'span 2',gridRow:'span 2'}; return {}; };

  return (
    <ClientLayout title="">
      <div style={{padding:'16px 14px',minHeight:'100vh'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <div>
            <p style={{fontSize:11,color:'var(--cp-text-dim)',letterSpacing:'0.04em',margin:0,textTransform:'uppercase'}}>{format(new Date(),'EEEE, d MMMM')}</p>
            <h1 style={{fontSize:23,fontWeight:800,color:'var(--cp-text)',margin:'2px 0 0',fontFamily:'var(--cp-font)',letterSpacing:'-0.02em'}}>Hello, {d.client?.name?.split(' ')[0]||'Athlete'}</h1>
          </div>
          <button onClick={()=>setEditMode(v=>!v)}
            style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:12,border:'none',cursor:'pointer',
              background:editMode?accent:'var(--cp-card-alt)',color:editMode?'#fff':'var(--cp-text)',fontSize:12,fontWeight:700}}>
            {editMode?<><Check style={{width:14,height:14}}/>Done</>:<><Settings2 style={{width:14,height:14}}/>Edit</>}
          </button>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gridAutoRows:'minmax(96px, auto)',gap:10,gridAutoFlow:'dense'}}>
          {slots.map((slot,idx)=>(
            <div key={idx} style={{position:'relative',...spanStyle(slot.size),minHeight:slot.size===4?202:96,
              background:'var(--cp-card-bg)',border:'1px solid var(--cp-border)',borderRadius:18,overflow:'hidden',
              boxShadow:editMode?`0 0 0 2px ${accent}55`:'none',animation:editMode?'wiggle 0.3s ease-in-out infinite alternate':'none'}}>
              {renderWidget(slot.w,slot.size)}
              {editMode&&(
                <div style={{position:'absolute',top:6,right:6,display:'flex',gap:4,zIndex:3}}>
                  {WIDGETS[slot.w].sizes.length>1&&<button onClick={(e)=>{e.stopPropagation();cycleSize(idx);}} style={ctrlBtn}><Maximize2 style={{width:12,height:12}}/></button>}
                  <button onClick={(e)=>{e.stopPropagation();setEditSlot(idx);}} style={ctrlBtn}><Settings2 style={{width:12,height:12}}/></button>
                  <button onClick={(e)=>{e.stopPropagation();removeSlot(idx);}} style={{...ctrlBtn,background:'rgba(239,68,68,0.9)'}}><X style={{width:12,height:12}}/></button>
                </div>
              )}
            </div>
          ))}
          {editMode&&(
            <button onClick={addSlot} style={{minHeight:96,borderRadius:18,border:'2px dashed var(--cp-border)',background:'var(--cp-card-alt)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,color:'var(--cp-text-dim)'}}>
              <div style={{width:32,height:32,borderRadius:'50%',background:'var(--cp-border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>+</div>
              <span style={{fontSize:11,fontWeight:600}}>Add widget</span>
            </button>
          )}
        </div>

        <style>{`@keyframes wiggle{from{transform:rotate(-0.5deg)}to{transform:rotate(0.5deg)}}@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

        {editSlot!==null&&(
          <>
            <div onClick={()=>setEditSlot(null)} style={{position:'fixed',inset:0,zIndex:80,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(3px)'}}/>
            <div style={{position:'fixed',left:0,right:0,bottom:0,zIndex:81,background:'var(--cp-card-bg)',borderTopLeftRadius:24,borderTopRightRadius:24,borderTop:'1px solid var(--cp-border)',padding:'10px 16px calc(20px + env(safe-area-inset-bottom))',boxShadow:'0 -8px 40px rgba(0,0,0,0.5)',animation:'sheetUp 0.26s cubic-bezier(0.22,1,0.36,1)',maxHeight:'75vh',overflowY:'auto'}}>
              <div style={{width:38,height:4,borderRadius:4,background:'var(--cp-text-dim)',opacity:0.4,margin:'4px auto 14px'}}/>
              <p style={{fontSize:13,fontWeight:700,color:'var(--cp-text)',marginBottom:4,textAlign:'center'}}>Choose a widget</p>
              <p style={{fontSize:11,color:'var(--cp-text-dim)',marginBottom:14,textAlign:'center'}}>Tap ⤢ afterwards to resize</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {Object.entries(WIDGETS).map(([key,w])=>{
                  const Icon=w.icon; const isCur=slots[editSlot]?.w===key;
                  return (
                    <button key={key} onClick={()=>setSlotWidget(editSlot,key)} style={{display:'flex',alignItems:'center',gap:10,padding:'12px',borderRadius:14,border:isCur?`2px solid ${w.color}`:'1px solid var(--cp-border)',background:isCur?`${w.color}14`:'var(--cp-card-alt)',cursor:'pointer',textAlign:'left'}}>
                      <div style={{width:32,height:32,borderRadius:9,background:`${w.color}1f`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Icon style={{width:17,height:17,color:w.color}}/></div>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:11.5,fontWeight:600,color:'var(--cp-text)',lineHeight:1.2}}>{w.label}</div>
                        <div style={{fontSize:9,color:'var(--cp-text-dim)',marginTop:1}}>{w.sizes.map(s=>s===1?'S':s===2?'M':'L').join(' · ')}</div>
                      </div>
                      {isCur&&<Check style={{width:14,height:14,color:w.color,marginLeft:'auto',flexShrink:0}}/>}
                    </button>
                  );
                })}
              </div>
              <button onClick={()=>setEditSlot(null)} style={{width:'100%',marginTop:14,padding:'12px',borderRadius:14,border:'none',background:'var(--cp-card-alt)',color:'var(--cp-text-dim)',fontSize:14,fontWeight:600,cursor:'pointer'}}>Done</button>
            </div>
          </>
        )}
      </div>
    </ClientLayout>
  );
}

const pad={ position:'absolute',inset:0,padding:'13px',display:'flex',flexDirection:'column' };
const lbl={ fontSize:11,color:'var(--cp-text-dim)',fontWeight:600 };
const ctrlBtn={ width:24,height:24,borderRadius:7,border:'none',cursor:'pointer',background:'rgba(0,0,0,0.6)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)' };
