import { useState, useEffect } from 'react';
import { format, parseISO, isToday, isTomorrow, subDays } from 'date-fns';
import { Plus, X, Trash2, Clock, ChevronRight, ChevronDown, Settings, Check, Droplets, Pill, ChevronLeft, Calendar, ExternalLink } from 'lucide-react';
import ClientLayout from '../components/client-portal/ClientLayout';
import { useAppContext } from '../lib/AppContext';
import { db } from '../lib/db';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const QUOTES = [
  "The only bad workout is the one that didn't happen.",
  "Push harder than yesterday if you want a different tomorrow.",
  "Discipline equals freedom.",
  "Champions are made from something deep inside.",
  "Pain is temporary. Quitting lasts forever.",
  "Don't stop when you're tired. Stop when you're done.",
  "Success isn't given. It's earned in the gym.",
  "Every rep, every set, every session counts.",
  "You don't get what you wish for. You get what you work for.",
  "Make yourself proud.",
];

const ALL_WIDGETS = [
  { id:'quote',        label:'Motivational Quote' },
  { id:'next_session', label:'Next Session' },
  { id:'body_stats',   label:'Body Stats' },
  { id:'weight',       label:'Weight Progress Chart' },
  { id:'muscle',       label:'Muscle Progress' },
  { id:'last_training',label:'Last Training' },
  { id:'upcoming',     label:'Upcoming Sessions' },
  { id:'nutrition',    label:'Nutrition Plan' },
  { id:'water',        label:'Water Intake Tracker' },
  { id:'supplements',  label:'Supplement Checklist' },
  { id:'reminders',    label:'My Reminders' },
];

const DEFAULT_WIDGETS = ['quote','next_session','body_stats','weight','upcoming','nutrition','water','supplements','reminders'];

// ── helpers ───────────────────────────────────────────────────────────────────
function Card({ children, style={} }) {
  return <div style={{ backgroundColor:'var(--cp-card-bg)', border:'1px solid var(--cp-border)', borderRadius:14, overflow:'hidden', ...style }}>{children}</div>;
}
function Label({ children }) {
  return <p style={{ fontSize:10, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--cp-text-dim)', margin:'0 0 8px' }}>{children}</p>;
}
function getDayLabel(ds) {
  try { const d=parseISO(ds); return isToday(d)?'Today':isTomorrow(d)?'Tomorrow':format(d,'EEE, MMM d'); } catch { return ds; }
}

// ── NutritionWidget ───────────────────────────────────────────────────────────
function NutritionWidget({ plan }) {
  const [expanded, setExpanded] = useState({});
  const [meal, setMeal] = useState(null);
  const EMOJI = { breakfast:'🌅','morning snack':'🍎',lunch:'☀️','afternoon snack':'🥜',dinner:'🌙',snack:'🍎','pre-workout':'🏃','post-workout':'💪' };
  const emoji = (n) => EMOJI[(n||'').toLowerCase()] || '🍽️';
  const toggle = (k) => setExpanded(p=>({...p,[k]:!p[k]}));

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:2 }}>
        {[['🔥',plan.calories,'kcal'],['💪',plan.protein,'g P'],['🌾',plan.carbs,'g C']].map(([e,v,l])=>v&&(
          <span key={l} style={{ fontSize:11, padding:'3px 9px', borderRadius:8, backgroundColor:'var(--cp-bg)', border:'1px solid var(--cp-border)', color:'var(--cp-text-dim)' }}>{e} {v}{l}</span>
        ))}
      </div>
      {plan.meal_sections?.map(section=>(
        <Card key={section.section_name}>
          <button onClick={()=>toggle(section.section_name)} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 14px', border:'none', backgroundColor:'transparent', cursor:'pointer' }}>
            <span style={{ fontSize:20 }}>{emoji(section.section_name)}</span>
            <span style={{ flex:1, fontSize:14, fontWeight:700, fontFamily:'var(--cp-font)', color:'var(--cp-text)', textAlign:'left' }}>{section.section_name}</span>
            <span style={{ fontSize:11, color:'var(--cp-text-dim)' }}>{section.time}</span>
            {expanded[section.section_name] ? <ChevronDown style={{ width:14, height:14, color:'var(--cp-text-dim)' }}/> : <ChevronRight style={{ width:14, height:14, color:'var(--cp-text-dim)' }}/>}
          </button>
          {expanded[section.section_name] && section.options?.map((opt,i)=>(
            <button key={i} onClick={()=>setMeal(opt)} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px', border:'none', backgroundColor:'transparent', borderTop:'1px solid var(--cp-border)', cursor:'pointer', textAlign:'left' }}>
              <div style={{ width:3, height:28, borderRadius:2, backgroundColor:'var(--cp-accent)', flexShrink:0 }}/>
              <span style={{ flex:1, fontSize:13, fontWeight:600, color:'var(--cp-text)' }}>{opt.name}</span>
              <span style={{ fontSize:11, color:'var(--cp-text-dim)', flexShrink:0 }}>{opt.calories} kcal</span>
              <ChevronRight style={{ width:12, height:12, color:'var(--cp-border)', flexShrink:0 }}/>
            </button>
          ))}
        </Card>
      ))}
      {meal && (
        <div style={{ position:'fixed', inset:0, zIndex:60, display:'flex', alignItems:'flex-end', justifyContent:'center', backgroundColor:'rgba(0,0,0,0.5)' }}>
          <div style={{ backgroundColor:'var(--cp-card-bg)', border:'1px solid var(--cp-border)', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:500, maxHeight:'88vh', display:'flex', flexDirection:'column' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 20px 12px', borderBottom:'1px solid var(--cp-border)', flexShrink:0 }}>
              <h3 style={{ margin:0, fontSize:17, fontWeight:700, fontFamily:'var(--cp-font)', color:'var(--cp-text)' }}>{meal.name}</h3>
              <button onClick={()=>setMeal(null)} style={{ background:'none', border:'none', cursor:'pointer', padding:4 }}><X style={{ width:18, height:18, color:'var(--cp-text-dim)' }}/></button>
            </div>
            <div style={{ overflowY:'auto', padding:'16px 20px 28px', display:'flex', flexDirection:'column', gap:14 }}>
              {meal.description && <p style={{ margin:0, fontSize:14, lineHeight:1.6, color:'var(--cp-text-dim)' }}>{meal.description}</p>}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8 }}>
                {[['🔥',meal.calories,'kcal'],['💪',meal.protein,'g P'],['🌾',meal.carbs,'g C'],['🥑',meal.fat,'g F']].map(([e,v,l])=>v&&(
                  <div key={l} style={{ backgroundColor:'var(--cp-bg)', borderRadius:10, padding:'10px 6px', textAlign:'center' }}>
                    <div style={{ fontSize:18, marginBottom:4 }}>{e}</div>
                    <div style={{ fontSize:16, fontWeight:700, color:'var(--cp-text)' }}>{v}</div>
                    <div style={{ fontSize:10, color:'var(--cp-text-dim)' }}>{l}</div>
                  </div>
                ))}
              </div>
              {meal.ingredients && (
                <div>
                  <p style={{ fontSize:10, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--cp-text-dim)', margin:'0 0 8px' }}>Ingredients</p>
                  <Card style={{ padding:'12px 14px' }}>
                    {meal.ingredients.split(',').map((ing,i)=>(
                      <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:i<meal.ingredients.split(',').length-1?5:0 }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', backgroundColor:'var(--cp-accent)', flexShrink:0, marginTop:5 }}/>
                        <span style={{ fontSize:13, color:'var(--cp-text)' }}>{ing.trim()}</span>
                      </div>
                    ))}
                  </Card>
                </div>
              )}
              {meal.recipe_url && (
                <a href={`/recipe?name=${encodeURIComponent(meal.name)}&ingredients=${encodeURIComponent(meal.ingredients||'')}&calories=${meal.calories||''}&protein=${meal.protein||''}&carbs=${meal.carbs||''}&fat=${meal.fat||''}`}
                  target="_blank" rel="noreferrer"
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'13px 18px', borderRadius:13, backgroundColor:'var(--cp-accent)', color:'#fff', textDecoration:'none', fontSize:14, fontWeight:600 }}>
                  <ExternalLink style={{ width:16, height:16 }}/>View Full Recipe
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── WaterWidget ───────────────────────────────────────────────────────────────
function WaterWidget({ targetLiters=2.5, clientId }) {
  const today = format(new Date(),'yyyy-MM-dd');
  const [log, setLog] = useState(null);
  const load = async () => { const l=await db.WaterLog.filter({client_id:clientId,date:today}); setLog(l[0]||null); };
  useEffect(()=>{ if(clientId) load(); },[clientId]);
  const current = log?.amount_liters||0;
  const pct = Math.min(1, current/(targetLiters||2.5));
  const add = async (ml) => {
    const addL = ml/1000;
    if (log?.id) { const u=await db.WaterLog.update(log.id,{amount_liters:parseFloat((current+addL).toFixed(2))}); setLog(u); }
    else { const c=await db.WaterLog.create({client_id:clientId,date:today,amount_liters:addL}); setLog(c); }
  };
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}><Droplets style={{ width:16, height:16, color:'#3b82f6' }}/><span style={{ fontSize:13, fontWeight:600, color:'var(--cp-text)' }}>Water</span></div>
        <span style={{ fontSize:13, fontWeight:700, color:pct>=1?'#22c55e':'#3b82f6' }}>{current.toFixed(2)}L / {targetLiters}L</span>
      </div>
      <div style={{ height:8, borderRadius:4, backgroundColor:'var(--cp-bg)', overflow:'hidden' }}>
        <div style={{ height:'100%', borderRadius:4, background:pct>=1?'#22c55e':'linear-gradient(90deg,#3b82f6,#60a5fa)', width:`${pct*100}%`, transition:'width 0.4s ease' }}/>
      </div>
      <div style={{ display:'flex', gap:5 }}>
        {[150,250,330,500].map(ml=>(
          <button key={ml} onClick={()=>add(ml)} style={{ flex:1, padding:'8px 2px', borderRadius:10, border:'1px solid var(--cp-border)', backgroundColor:'var(--cp-bg)', color:'var(--cp-text)', fontSize:10, fontWeight:500, cursor:'pointer' }}>+{ml}ml</button>
        ))}
      </div>
      {pct>=1&&<p style={{ fontSize:12, color:'#22c55e', textAlign:'center', fontWeight:600, margin:0 }}>🎉 Daily goal reached!</p>}
    </div>
  );
}

// ── SupplementWidget ──────────────────────────────────────────────────────────
function SupplementWidget({ supplements, clientId }) {
  const [offset, setOffset] = useState(0);
  const date = format(offset===0?new Date():subDays(new Date(),-offset),'yyyy-MM-dd');
  const label = offset===0?'Today':format(subDays(new Date(),-offset),'MMM d');
  const [logs, setLogs] = useState([]);
  const load = async () => { const l=await db.SupplementLog.filter({client_id:clientId,date}); setLogs(l); };
  useEffect(()=>{ if(clientId&&supplements?.length) load(); },[clientId,date,supplements?.length]);
  const toggle = async (name) => {
    const ex=logs.find(l=>l.supplement_name===name);
    if(ex) await db.SupplementLog.delete(ex.id);
    else await db.SupplementLog.create({client_id:clientId,date,supplement_name:name,taken_at:new Date().toISOString()});
    load();
  };
  if(!supplements?.length) return <p style={{ fontSize:13, color:'var(--cp-text-dim)', textAlign:'center', padding:'10px 0' }}>No supplements assigned</p>;
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}><Pill style={{ width:15, height:15, color:'var(--cp-accent)' }}/><span style={{ fontSize:13, fontWeight:600, color:'var(--cp-text)' }}>Supplements</span></div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <button onClick={()=>setOffset(d=>d-1)} style={{ background:'none', border:'none', cursor:'pointer', padding:2 }}><ChevronLeft style={{ width:14, height:14, color:'var(--cp-text-dim)' }}/></button>
          <span style={{ fontSize:11, color:'var(--cp-text-dim)', minWidth:52, textAlign:'center' }}>{label}</span>
          <button onClick={()=>setOffset(d=>Math.min(0,d+1))} disabled={offset===0} style={{ background:'none', border:'none', cursor:'pointer', padding:2, opacity:offset===0?0.3:1 }}><ChevronRight style={{ width:14, height:14, color:'var(--cp-text-dim)' }}/></button>
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {supplements.map((s,i)=>{
          const taken=logs.some(l=>l.supplement_name===s.name);
          return (
            <button key={i} onClick={()=>toggle(s.name)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:12, border:`1px solid ${taken?'var(--cp-accent)':'var(--cp-border)'}`, backgroundColor:taken?'var(--cp-accent-light)':'var(--cp-card-bg)', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
              <div style={{ width:20, height:20, borderRadius:'50%', border:`2px solid ${taken?'var(--cp-accent)':'var(--cp-border)'}`, backgroundColor:taken?'var(--cp-accent)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {taken&&<Check style={{ width:11, height:11, color:'#fff' }}/>}
              </div>
              <span style={{ flex:1, fontSize:13, fontWeight:600, color:'var(--cp-text)', textDecoration:taken?'line-through':'none', opacity:taken?0.6:1 }}>{s.name}</span>
              <span style={{ fontSize:11, color:'var(--cp-text-dim)' }}>{s.quantity}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── RequestModal (new session request) ────────────────────────────────────────
function RequestModal({ clientId, clientName, clientColor, onClose, onSaved }) {
  const [type, setType] = useState('training');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const today = format(new Date(),'yyyy-MM-dd');
  const save = async () => {
    if (!date) return;
    setSaving(true);
    await db.AppointmentRequest.create({ client_id:clientId, client_name:clientName, client_color:clientColor||'#6366f1', type, requested_date:date, note, status:'pending' });
    setSaving(false); onSaved(); onClose();
  };
  return (
    <div style={{ position:'fixed', inset:0, zIndex:60, display:'flex', alignItems:'flex-end', justifyContent:'center', padding:16, backgroundColor:'rgba(0,0,0,0.5)' }}>
      <div style={{ backgroundColor:'var(--cp-card-bg)', border:'1px solid var(--cp-border)', borderRadius:20, padding:22, width:'100%', maxWidth:420 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:700, fontFamily:'var(--cp-font)', color:'var(--cp-text)' }}>Request Session</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer' }}><X style={{ width:18, height:18, color:'var(--cp-text-dim)' }}/></button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--cp-text-dim)', marginBottom:8 }}>Type</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[['training','🏋️ Training'],['nutrition','🥗 Nutrition']].map(([v,l])=>(
                <button key={v} onClick={()=>setType(v)} style={{ padding:'12px 8px', borderRadius:12, border:`2px solid ${type===v?'var(--cp-accent)':'var(--cp-border)'}`, backgroundColor:type===v?'var(--cp-accent-light)':'transparent', color:'var(--cp-text)', fontSize:13, fontWeight:type===v?600:400, cursor:'pointer' }}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--cp-text-dim)', marginBottom:6 }}>Preferred Date *</p>
            <input type="date" min={today} value={date} onChange={e=>setDate(e.target.value)} style={{ width:'100%', border:'1px solid var(--cp-border)', borderRadius:10, padding:'10px 12px', fontSize:14, backgroundColor:'var(--cp-bg)', color:'var(--cp-text)', outline:'none', boxSizing:'border-box' }}/>
          </div>
          <div>
            <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--cp-text-dim)', marginBottom:6 }}>Note to trainer</p>
            <textarea value={note} onChange={e=>setNote(e.target.value)} rows={2} placeholder="e.g. Prefer morning, around 9–10am" style={{ width:'100%', border:'1px solid var(--cp-border)', borderRadius:10, padding:'10px 12px', fontSize:14, backgroundColor:'var(--cp-bg)', color:'var(--cp-text)', outline:'none', resize:'none', boxSizing:'border-box', fontFamily:'var(--cp-font-body)' }}/>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, marginTop:18 }}>
          <button onClick={onClose} style={{ flex:1, padding:11, border:'1px solid var(--cp-border)', borderRadius:12, backgroundColor:'transparent', color:'var(--cp-text-dim)', fontSize:14, cursor:'pointer' }}>Cancel</button>
          <button onClick={save} disabled={saving||!date} style={{ flex:1, padding:11, border:'none', borderRadius:12, backgroundColor:'var(--cp-accent)', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer', opacity:saving||!date?0.5:1 }}>{saving?'Sending…':'Send Request'}</button>
        </div>
      </div>
    </div>
  );
}

// ── MyRequestsPanel ───────────────────────────────────────────────────────────
function MyRequestsPanel({ clientId, onClose }) {
  const [requests, setRequests] = useState([]);
  const [counterNote, setCounterNote] = useState('');
  const [counteringId, setCounteringId] = useState(null);
  const [saving, setSaving] = useState(false);
  const load = async () => { const r=await db.AppointmentRequest.filter({client_id:clientId},'-created_date',30); setRequests(r); };
  useEffect(()=>{ if(clientId) load(); },[clientId]);

  const confirm = async (req) => {
    setSaving(true);
    if (req.appointment_id) await db.Appointment.update(req.appointment_id,{status:'scheduled'});
    await db.AppointmentRequest.update(req.id,{status:'confirmed'});
    setSaving(false); load();
  };
  const counter = async (req) => {
    if (!counterNote.trim()) return;
    setSaving(true);
    if (req.appointment_id) await db.Appointment.delete(req.appointment_id).catch(()=>{});
    await db.AppointmentRequest.update(req.id,{status:'client_countered',client_counter_note:counterNote,appointment_id:null});
    setSaving(false); setCounteringId(null); setCounterNote(''); load();
  };
  const cancel = async (req) => {
    if (req.appointment_id) await db.Appointment.delete(req.appointment_id).catch(()=>{});
    await db.AppointmentRequest.update(req.id,{status:'cancelled'}); load();
  };

  const STATUS = { pending:'⏳ Waiting for trainer', proposed:'📤 Trainer proposed a time', confirmed:'✅ Confirmed', declined:'❌ Declined', cancelled:'🚫 Cancelled', client_countered:'💬 You replied' };
  const SCOLOR = { pending:'#f59e0b', proposed:'#8b5cf6', confirmed:'#22c55e', declined:'#ef4444', cancelled:'#9ca3af', client_countered:'#3b82f6' };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:60, display:'flex', alignItems:'flex-end', justifyContent:'center', backgroundColor:'rgba(0,0,0,0.5)' }}>
      <div style={{ backgroundColor:'var(--cp-card-bg)', border:'1px solid var(--cp-border)', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:500, maxHeight:'88vh', display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 20px 14px', borderBottom:'1px solid var(--cp-border)', flexShrink:0 }}>
          <h3 style={{ margin:0, fontSize:17, fontWeight:700, fontFamily:'var(--cp-font)', color:'var(--cp-text)' }}>My Session Requests</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer' }}><X style={{ width:18, height:18, color:'var(--cp-text-dim)' }}/></button>
        </div>
        <div style={{ overflowY:'auto', padding:'12px 16px 24px', display:'flex', flexDirection:'column', gap:10 }}>
          {requests.length===0&&<p style={{ textAlign:'center', padding:'30px 0', fontSize:14, color:'var(--cp-text-dim)' }}>No requests yet</p>}
          {requests.map(req=>(
            <div key={req.id} style={{ backgroundColor:'var(--cp-bg)', border:'1px solid var(--cp-border)', borderRadius:14, overflow:'hidden' }}>
              <div style={{ padding:'13px 14px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:'var(--cp-text)' }}>{req.type==='nutrition'?'🥗':'🏋️'} {req.type} · {req.requested_date}</span>
                  <span style={{ fontSize:11, fontWeight:600, color:SCOLOR[req.status] }}>{STATUS[req.status]||req.status}</span>
                </div>
                {req.note&&<p style={{ margin:'0 0 6px', fontSize:12, color:'var(--cp-text-dim)', fontStyle:'italic' }}>"{req.note}"</p>}
                {req.status==='proposed'&&req.proposed_time&&(
                  <div style={{ backgroundColor:'var(--cp-accent-light)', border:'1px solid var(--cp-border)', borderRadius:10, padding:'10px 12px', marginTop:8 }}>
                    <p style={{ margin:'0 0 3px', fontSize:12, fontWeight:700, color:'var(--cp-accent)' }}>Trainer proposes:</p>
                    <p style={{ margin:'0 0 8px', fontSize:14, fontWeight:600, color:'var(--cp-text)' }}>{req.requested_date} at {req.proposed_time} · {req.proposed_duration} min</p>
                    {req.proposed_note&&<p style={{ margin:'0 0 10px', fontSize:12, color:'var(--cp-text-dim)', fontStyle:'italic' }}>"{req.proposed_note}"</p>}
                    {counteringId===req.id ? (
                      <div>
                        <textarea value={counterNote} onChange={e=>setCounterNote(e.target.value)} rows={2} placeholder="e.g. Can we do 10am instead?" style={{ width:'100%', border:'1px solid var(--cp-border)', borderRadius:10, padding:'8px 10px', fontSize:13, backgroundColor:'var(--cp-card-bg)', color:'var(--cp-text)', outline:'none', resize:'none', boxSizing:'border-box', fontFamily:'var(--cp-font-body)', marginBottom:8 }}/>
                        <div style={{ display:'flex', gap:8 }}>
                          <button onClick={()=>{setCounteringId(null);setCounterNote('');}} style={{ flex:1, padding:'9px', border:'1px solid var(--cp-border)', borderRadius:10, backgroundColor:'transparent', color:'var(--cp-text-dim)', fontSize:13, cursor:'pointer' }}>Cancel</button>
                          <button onClick={()=>counter(req)} disabled={saving||!counterNote.trim()} style={{ flex:1, padding:'9px', border:'none', borderRadius:10, backgroundColor:'var(--cp-accent)', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', opacity:saving||!counterNote.trim()?0.5:1 }}>Send Counter</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={()=>setCounteringId(req.id)} style={{ flex:1, padding:'9px', border:'1px solid var(--cp-border)', borderRadius:10, backgroundColor:'transparent', color:'var(--cp-text)', fontSize:13, cursor:'pointer' }}>💬 Suggest different time</button>
                        <button onClick={()=>confirm(req)} disabled={saving} style={{ flex:1, padding:'9px', border:'none', borderRadius:10, backgroundColor:'var(--cp-accent)', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', opacity:saving?0.5:1 }}>✓ Confirm</button>
                      </div>
                    )}
                  </div>
                )}
                {(req.status==='pending'||req.status==='client_countered')&&(
                  <button onClick={()=>cancel(req)} style={{ marginTop:8, padding:'7px 14px', border:'1px solid var(--cp-border)', borderRadius:9, backgroundColor:'transparent', color:'var(--cp-text-dim)', fontSize:12, cursor:'pointer' }}>Cancel Request</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── WidgetSettings ────────────────────────────────────────────────────────────
function WidgetSettings({ enabled, onSave, onClose }) {
  const [sel, setSel] = useState(enabled);
  const toggle = (id) => setSel(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  return (
    <div style={{ position:'fixed', inset:0, zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backgroundColor:'rgba(0,0,0,0.5)' }}>
      <div style={{ backgroundColor:'var(--cp-card-bg)', border:'1px solid var(--cp-border)', borderRadius:20, padding:22, width:'100%', maxWidth:380, maxHeight:'85vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:700, fontFamily:'var(--cp-font)', color:'var(--cp-text)' }}>Customize Home</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer' }}><X style={{ width:18, height:18, color:'var(--cp-text-dim)' }}/></button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          {ALL_WIDGETS.map(w=>(
            <button key={w.id} onClick={()=>toggle(w.id)} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:12, border:`2px solid ${sel.includes(w.id)?'var(--cp-accent)':'var(--cp-border)'}`, backgroundColor:sel.includes(w.id)?'var(--cp-accent-light)':'transparent', cursor:'pointer', textAlign:'left' }}>
              <div style={{ width:20, height:20, borderRadius:'50%', border:`2px solid ${sel.includes(w.id)?'var(--cp-accent)':'var(--cp-border)'}`, backgroundColor:sel.includes(w.id)?'var(--cp-accent)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {sel.includes(w.id)&&<Check style={{ width:12, height:12, color:'#fff' }}/>}
              </div>
              <span style={{ fontSize:14, color:'var(--cp-text)', fontWeight:sel.includes(w.id)?600:400 }}>{w.label}</span>
            </button>
          ))}
        </div>
        <div style={{ display:'flex', gap:10, marginTop:18 }}>
          <button onClick={onClose} style={{ flex:1, padding:11, border:'1px solid var(--cp-border)', borderRadius:12, backgroundColor:'transparent', color:'var(--cp-text-dim)', fontSize:14, cursor:'pointer' }}>Cancel</button>
          <button onClick={()=>{onSave(sel);onClose();}} style={{ flex:1, padding:11, border:'none', borderRadius:12, backgroundColor:'var(--cp-accent)', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer' }}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Main ClientHome ───────────────────────────────────────────────────────────
export default function ClientHome() {
  const { clientUser } = useAppContext();
  const [client, setClient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [progress, setProgress] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [plans, setPlans] = useState([]);
  const [nutritionPlans, setNutritionPlans] = useState([]);
  const [showRequest, setShowRequest] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingProposal, setPendingProposal] = useState(0);
  const [quote] = useState(()=>QUOTES[Math.floor(Math.random()*QUOTES.length)]);
  const [enabledWidgets, setEnabledWidgets] = useState(()=>{
    try { return JSON.parse(localStorage.getItem('cp_widgets')||'null')||DEFAULT_WIDGETS; } catch { return DEFAULT_WIDGETS; }
  });
  const saveWidgets = (w) => { setEnabledWidgets(w); localStorage.setItem('cp_widgets',JSON.stringify(w)); };
  const show = (id) => enabledWidgets.includes(id);

  const load = async () => {
    if (!clientUser?.clientId) return;
    const [c,a,prog,rem,tp,np,reqs] = await Promise.all([
      db.Client.get(clientUser.clientId),
      db.Appointment.filter({client_id:clientUser.clientId},'date'),
      db.ClientProgress.filter({client_id:clientUser.clientId},'date'),
      db.ClientReminder.filter({client_id:clientUser.clientId},'-created_date'),
      db.TrainingPlan.filter({client_id:clientUser.clientId},'-date',5),
      db.NutritionPlan.filter({client_id:clientUser.clientId},'-date',1),
      db.AppointmentRequest.filter({client_id:clientUser.clientId,status:'proposed'}),
    ]);
    setClient(c); setAppointments(a); setProgress(prog); setReminders(rem);
    setPlans(tp); setNutritionPlans(np); setPendingProposal(reqs.length);
  };
  useEffect(()=>{ load(); },[clientUser]);

  const today = format(new Date(),'yyyy-MM-dd');
  const upcoming = appointments.filter(a=>a.date>=today).sort((a,b)=>a.date===b.date?a.start_time?.localeCompare(b.start_time):a.date.localeCompare(b.date)).slice(0,5);
  const next = upcoming[0];
  const latest = progress[progress.length-1];
  const weightData = progress.filter(p=>p.weight_kg).slice(-10).map(p=>({d:p.date?format(parseISO(p.date),'MMM d'):'',w:p.weight_kg}));
  const pendingRem = reminders.filter(r=>!r.completed);

  const toggleRem = async (r) => { await db.ClientReminder.update(r.id,{completed:!r.completed}); load(); };
  const delRem = async (id) => { await db.ClientReminder.delete(id); load(); };

  const gap = 18;

  return (
    <ClientLayout title="">
      <div style={{ padding:`20px ${gap}px`, display:'flex', flexDirection:'column', gap:20 }}>

        {/* Header row: greeting + quote */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, alignItems:'flex-start' }}>
          <div>
            <p style={{ margin:'0 0 2px', fontSize:11, color:'var(--cp-text-dim)', letterSpacing:'0.08em', textTransform:'uppercase' }}>{format(new Date(),'EEEE, d MMMM')}</p>
            <h1 style={{ margin:'0 0 10px', fontSize:26, fontWeight:700, fontFamily:'var(--cp-font)', color:'var(--cp-text)', letterSpacing:'-0.02em', lineHeight:1.1 }}>Hello,<br/>{client?.name?.split(' ')[0]||'Athlete'}</h1>
            <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
              <button onClick={()=>setShowRequest(true)} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:9, border:'1px solid var(--cp-accent)', backgroundColor:'var(--cp-accent-light)', color:'var(--cp-accent)', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                <Plus style={{ width:12, height:12 }}/>Request
              </button>
              <button onClick={()=>setShowRequests(true)} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:9, border:'1px solid var(--cp-border)', backgroundColor:'transparent', color:pendingProposal>0?'var(--cp-accent)':'var(--cp-text-dim)', fontSize:11, fontWeight:pendingProposal>0?700:400, cursor:'pointer' }}>
                <Calendar style={{ width:12, height:12 }}/>{pendingProposal>0?`${pendingProposal} to confirm`:'My requests'}
              </button>
            </div>
          </div>
          {show('quote') && (
            <p style={{ margin:0, fontSize:24, fontWeight:900, color:'var(--cp-accent)', fontFamily:'var(--cp-font)', lineHeight:1.25, fontStyle:'italic', letterSpacing:'-0.02em' }}>
              "{quote}"
            </p>
          )}
        </div>

        {/* Customize button */}
        <div style={{ display:'flex', justifyContent:'flex-end' }}>
          <button onClick={()=>setShowSettings(true)} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px', borderRadius:8, border:'1px solid var(--cp-border)', backgroundColor:'transparent', color:'var(--cp-text-dim)', fontSize:11, cursor:'pointer' }}>
            <Settings style={{ width:11, height:11 }}/>Customize
          </button>
        </div>

        {/* Next Session */}
        {show('next_session') && next && (
          <div>
            <Label>Next Session</Label>
            <div style={{ backgroundColor:'var(--cp-accent)', borderRadius:14, padding:'16px 18px', display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:46, height:46, backgroundColor:'rgba(255,255,255,0.15)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span style={{ fontSize:22 }}>{next.type==='nutrition'?'🥗':'🏋️'}</span>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ margin:'0 0 3px', fontSize:15, fontWeight:700, color:'#fff', fontFamily:'var(--cp-font)' }}>{getDayLabel(next.date)}</p>
                <p style={{ margin:0, fontSize:12, color:'rgba(255,255,255,0.7)' }}>{next.start_time} · {next.duration_minutes} min · {next.type}</p>
              </div>
            </div>
          </div>
        )}

        {/* Body Stats */}
        {show('body_stats') && latest && (
          <div>
            <Label>Body Stats</Label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {[['Weight',latest.weight_kg,'kg',false],['Body Fat',latest.body_fat_pct,'%',false],['Muscle',latest.muscle_mass_kg,'kg',true]].map(([lbl,val,unit,accent])=>(
                <Card key={lbl} style={{ padding:'12px 10px', textAlign:'center' }}>
                  <p style={{ margin:'0 0 4px', fontSize:9, color:'var(--cp-text-dim)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{lbl}</p>
                  <p style={{ margin:0, fontSize:20, fontWeight:700, color:accent?'var(--cp-accent)':'var(--cp-text)', fontFamily:'var(--cp-font)' }}>{val??'—'}<span style={{ fontSize:10, fontWeight:400, color:'var(--cp-text-dim)' }}> {unit}</span></p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Weight chart */}
        {show('weight') && weightData.length>2 && (
          <div>
            <Label>Weight Progress</Label>
            <Card>
              <div style={{ padding:'12px 14px 4px' }}>
                <p style={{ margin:'0 0 1px', fontSize:13, fontWeight:600, fontFamily:'var(--cp-font)', color:'var(--cp-text)' }}>Weight over time</p>
              </div>
              <div style={{ padding:'4px 4px 10px' }}>
                <ResponsiveContainer width="100%" height={100}>
                  <LineChart data={weightData}>
                    <XAxis dataKey="d" tick={{ fontSize:9, fill:'var(--cp-text-dim)' }} axisLine={false} tickLine={false}/>
                    <YAxis domain={['auto','auto']} tick={{ fontSize:9, fill:'var(--cp-text-dim)' }} axisLine={false} tickLine={false} width={24}/>
                    <Tooltip contentStyle={{ backgroundColor:'var(--cp-card-bg)', border:'1px solid var(--cp-border)', borderRadius:10, fontSize:12 }} formatter={v=>[`${v} kg`,'Weight']}/>
                    <Line type="monotone" dataKey="w" stroke="var(--cp-accent)" strokeWidth={2} dot={{ r:3, fill:'var(--cp-accent)' }}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}

        {/* Muscle */}
        {show('muscle') && latest?.muscle_mass_kg && (
          <div>
            <Label>Muscle Mass</Label>
            <Card style={{ padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <p style={{ margin:0, fontSize:26, fontWeight:700, fontFamily:'var(--cp-font)', color:'var(--cp-accent)' }}>{latest.muscle_mass_kg}<span style={{ fontSize:13, fontWeight:400, color:'var(--cp-text-dim)' }}> kg</span></p>
                <p style={{ margin:'2px 0 0', fontSize:12, color:'var(--cp-text-dim)' }}>Current muscle mass</p>
              </div>
              {progress.length>1&&progress[0].muscle_mass_kg&&(()=>{
                const delta=(parseFloat(latest.muscle_mass_kg)-parseFloat(progress[0].muscle_mass_kg)).toFixed(1);
                return <span style={{ fontSize:14, fontWeight:700, color:parseFloat(delta)>0?'#22c55e':'#ef4444' }}>{parseFloat(delta)>0?'+':''}{delta} kg</span>;
              })()}
            </Card>
          </div>
        )}

        {/* Last training */}
        {show('last_training') && plans[0] && (
          <div>
            <Label>Last Training</Label>
            <Card style={{ padding:'14px 16px' }}>
              <p style={{ margin:'0 0 4px', fontSize:14, fontWeight:700, fontFamily:'var(--cp-font)', color:'var(--cp-text)' }}>{plans[0].title}</p>
              <p style={{ margin:'0 0 8px', fontSize:11, color:'var(--cp-text-dim)' }}>{plans[0].date} · {plans[0].exercises?.length||0} exercises</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {plans[0].exercises?.slice(0,4).map((ex,i)=>(
                  <span key={i} style={{ fontSize:11, padding:'3px 8px', borderRadius:7, backgroundColor:'var(--cp-bg)', border:'1px solid var(--cp-border)', color:'var(--cp-text-dim)' }}>{ex.name}</span>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Upcoming */}
        {show('upcoming') && upcoming.length>0 && (
          <div>
            <Label>Upcoming Sessions</Label>
            <Card>
              {upcoming.map((a,i)=>(
                <div key={a.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderBottom:i<upcoming.length-1?'1px solid var(--cp-border)':'none' }}>
                  <div style={{ width:3, height:30, borderRadius:2, backgroundColor:a.client_color||'var(--cp-accent)', flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <p style={{ margin:'0 0 1px', fontSize:13, fontWeight:600, color:'var(--cp-text)' }}>{getDayLabel(a.date)}</p>
                    <p style={{ margin:0, fontSize:11, color:'var(--cp-text-dim)' }}>{a.start_time} · {a.duration_minutes} min · {a.type}</p>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* Nutrition widget */}
        {show('nutrition') && nutritionPlans[0] && (
          <div>
            <Label>Today's Nutrition</Label>
            <NutritionWidget plan={nutritionPlans[0]}/>
          </div>
        )}

        {/* Water */}
        {show('water') && (
          <div>
            <Label>Water Intake</Label>
            <Card style={{ padding:'14px 16px' }}>
              <WaterWidget targetLiters={nutritionPlans[0]?.water_liters_daily||2.5} clientId={clientUser?.clientId}/>
            </Card>
          </div>
        )}

        {/* Supplements */}
        {show('supplements') && nutritionPlans[0]?.supplements?.length>0 && (
          <div>
            <Label>Supplements</Label>
            <Card style={{ padding:'14px 16px' }}>
              <SupplementWidget supplements={nutritionPlans[0]?.supplements} clientId={clientUser?.clientId}/>
            </Card>
          </div>
        )}

        {/* Reminders */}
        {show('reminders') && (
          <div>
            <Label>Reminders</Label>
            {pendingRem.length===0
              ? <p style={{ fontSize:13, color:'var(--cp-text-dim)', textAlign:'center', padding:'10px 0' }}>No reminders</p>
              : <Card>
                  {pendingRem.map((r,i)=>(
                    <div key={r.id} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 14px', borderBottom:i<pendingRem.length-1?'1px solid var(--cp-border)':'none' }}>
                      <button onClick={()=>toggleRem(r)} style={{ width:18, height:18, borderRadius:'50%', border:`1.5px solid var(--cp-accent)`, backgroundColor:'transparent', flexShrink:0, marginTop:2, cursor:'pointer' }}/>
                      <div style={{ flex:1 }}>
                        <p style={{ margin:'0 0 1px', fontSize:13, fontWeight:500, color:'var(--cp-text)' }}>{r.title}</p>
                        {r.datetime&&<p style={{ margin:0, fontSize:11, color:'var(--cp-text-dim)' }}>{format(parseISO(r.datetime),'EEE, MMM d · HH:mm')}</p>}
                      </div>
                      <button onClick={()=>delRem(r.id)} style={{ background:'none', border:'none', cursor:'pointer', padding:2 }}><Trash2 style={{ width:12, height:12, color:'var(--cp-text-dim)' }}/></button>
                    </div>
                  ))}
                </Card>
            }
          </div>
        )}

        <div style={{ height:12 }}/>
      </div>

      {showRequest&&<RequestModal clientId={clientUser?.clientId} clientName={clientUser?.name||''} clientColor={client?.theme_color} onClose={()=>setShowRequest(false)} onSaved={load}/>}
      {showRequests&&<MyRequestsPanel clientId={clientUser?.clientId} onClose={()=>{setShowRequests(false);load();}}/>}
      {showSettings&&<WidgetSettings enabled={enabledWidgets} onSave={saveWidgets} onClose={()=>setShowSettings(false)}/>}
    </ClientLayout>
  );
}
