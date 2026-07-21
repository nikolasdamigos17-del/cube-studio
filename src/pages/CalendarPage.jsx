import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, parseISO, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, X, Clock, Check, AlertCircle, Loader2 } from 'lucide-react';
import { db } from '../lib/db';

// ── Event Modal ───────────────────────────────────────────────────────────────
function EventModal({ onClose, onSaved, clients, defaultDate }) {
  const [f, setF] = useState({ title:'', client_id:'', client_name:'', client_color:'', type:'training', date:defaultDate||format(new Date(),'yyyy-MM-dd'), start_time:'09:00', duration_minutes:60, status:'scheduled', notes:'' });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const hc = (id) => { const c=clients.find(c=>c.id===id); setF(p=>({...p,client_id:id,client_name:c?.name||'',client_color:c?.theme_color||''})); };
  const save = async () => { setSaving(true); await db.Appointment.create(f); setSaving(false); onSaved(); onClose(); };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-md p-6 w-full" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-foreground text-lg" style={{fontFamily:'var(--font-display)'}}>New Event</h2><button onClick={onClose} className="btn-ghost btn-icon"><X className="w-4 h-4"/></button></div>
        <div className="space-y-3">
          <div><label className="section-label">Title *</label><input value={f.title} onChange={e=>set('title',e.target.value)} className="input-base mt-1"/></div>
          <div><label className="section-label">Client</label><select value={f.client_id} onChange={e=>hc(e.target.value)} className="input-base mt-1"><option value="">Select client</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="section-label">Type</label><select value={f.type} onChange={e=>set('type',e.target.value)} className="input-base mt-1"><option value="training">Training</option><option value="nutrition">Nutrition</option><option value="other">Other</option></select></div>
            <div><label className="section-label">Duration (min)</label><input type="number" step="15" value={f.duration_minutes} onChange={e=>set('duration_minutes',parseInt(e.target.value))} className="input-base mt-1"/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="section-label">Date *</label><input type="date" value={f.date} onChange={e=>set('date',e.target.value)} className="input-base mt-1"/></div>
            <div><label className="section-label">Time *</label><input type="time" value={f.start_time} onChange={e=>set('start_time',e.target.value)} className="input-base mt-1"/></div>
          </div>
          <div><label className="section-label">Notes</label><textarea value={f.notes} onChange={e=>set('notes',e.target.value)} rows={2} className="input-base mt-1 resize-none"/></div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
          <button onClick={save} disabled={saving||!f.title||!f.date} className="btn btn-primary flex-1">{saving?'Saving…':'Save'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Requests Panel ────────────────────────────────────────────────────────────
function RequestsPanel({ onClose, onUpdated }) {
  const [requests, setRequests] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState(60);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [r, a] = await Promise.all([
      db.AppointmentRequest.list('-created_date', 100),
      db.Appointment.list('date', 300),
    ]);
    setRequests(r); setAllAppointments(a);
  };
  useEffect(() => { load(); }, []);

  const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'client_countered');
  const proposedRequests = requests.filter(r => r.status === 'proposed');

  const getDayAppts = (date) => allAppointments.filter(a => a.date === date).sort((a,b) => a.start_time?.localeCompare(b.start_time));

  const propose = async (req) => {
    if (!selected) return;
    setSaving(true);
    // Remove old proposed appointment if re-proposing
    if (req.appointment_id) {
      await db.Appointment.delete(req.appointment_id).catch(() => {});
    }
    // Create appointment with status=proposed so client can confirm
    const appt = await db.Appointment.create({
      title: `${req.client_name} - ${req.type}`,
      client_id: req.client_id, client_name: req.client_name,
      client_color: req.client_color || '#6366f1',
      type: req.type, date: req.requested_date,
      start_time: time, duration_minutes: duration,
      status: 'proposed', notes: note,
    });
    await db.AppointmentRequest.update(req.id, {
      status: 'proposed',
      proposed_time: time,
      proposed_duration: duration,
      proposed_note: note,
      appointment_id: appt.id,
    });
    setSaving(false); setSelected(null); setNote(''); load(); onUpdated();
  };

  const acceptCounter = async (req) => {
    // Trainer accepts client's counter — creates a new appointment at the requested date/time
    // In this flow, the counter note tells us their preferred time, trainer proposes again
    setSelected(req);
    setNote(`Following your counter-proposal: "${req.client_counter_note}"`);
  };

  const declineRequest = async (req) => {
    if (req.appointment_id) await db.Appointment.delete(req.appointment_id).catch(() => {});
    await db.AppointmentRequest.update(req.id, { status: 'declined' });
    setSelected(null); load(); onUpdated();
  };

  const decline = async (id) => {
    await db.AppointmentRequest.update(id, { status: 'declined' });
    load(); onUpdated();
  };
  // declineRequest is defined after propose

  const cancel = async (req) => {
    if (req.appointment_id) await db.Appointment.delete(req.appointment_id).catch(()=>{});
    await db.AppointmentRequest.update(req.id, { status: 'cancelled' });
    load(); onUpdated();
  };

  const statusBadge = (s) => {
    const m = { pending:'⏳ Pending', client_countered:'💬 Client countered', proposed:'📤 Proposed to client', confirmed:'✅ Confirmed', declined:'❌ Declined', cancelled:'🚫 Cancelled' };
    const c = { pending:'bg-amber-50 text-amber-700', client_countered:'bg-blue-50 text-blue-700', proposed:'bg-purple-50 text-purple-700', confirmed:'bg-green-50 text-green-700', declined:'bg-red-50 text-red-700', cancelled:'bg-gray-100 text-gray-500' };
    return <span className={`badge text-xs ${c[s]||'badge-gray'}`}>{m[s]||s}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex" style={{background:'rgba(0,0,0,0.45)',backdropFilter:'blur(4px)'}}>
      <div className="absolute inset-0" onClick={onClose}/>
      <div className="relative ml-auto h-full bg-card border-l border-border w-full max-w-lg flex flex-col animate-slide-right" style={{boxShadow:'var(--shadow-2xl)'}}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="font-bold text-foreground text-lg" style={{fontFamily:'var(--font-display)'}}>Appointment Requests</h2>
          <button onClick={onClose} className="btn-ghost btn-icon"><X className="w-5 h-5"/></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Pending / needs response */}
          {pendingRequests.length > 0 && (
            <div>
              <p className="px-5 pt-4 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Needs Your Response ({pendingRequests.length})</p>
              {pendingRequests.map(req => {
                const dayAppts = getDayAppts(req.requested_date);
                const isOpen = selected?.id === req.id;
                return (
                  <div key={req.id} className={`border-b border-border ${isOpen?'bg-muted/40':''}`}>
                    <button className="w-full flex items-start gap-4 p-5 text-left hover:bg-muted/30 transition-colors" onClick={() => { setSelected(isOpen ? null : req); setTime('09:00'); setDuration(60); setNote(''); }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{backgroundColor:req.client_color||'#6366f1'}}>{req.client_name?.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground text-sm">{req.client_name}</p>
                          {statusBadge(req.status)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{req.type==='nutrition'?'🥗 Nutrition':'🏋️ Training'} · {req.requested_date ? format(parseISO(req.requested_date),'EEE, MMM d, yyyy') : ''}</p>
                        {req.note && <p className="text-xs text-muted-foreground mt-1 italic">"{req.note}"</p>}
                        {req.status==='client_countered' && req.client_counter_note && <p className="text-xs text-blue-600 mt-1 font-medium">Client says: "{req.client_counter_note}"</p>}
                      </div>
                      <ChevronRight className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${isOpen?'rotate-90':''}`}/>
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 space-y-3" onClick={e=>e.stopPropagation()}>
                        {/* Day schedule preview */}
                        <div className="bg-muted/50 rounded-xl p-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            Schedule on {req.requested_date ? format(parseISO(req.requested_date),'EEE, MMM d') : ''}
                          </p>
                          {dayAppts.length === 0
                            ? <p className="text-xs text-muted-foreground">No other appointments — day is free ✓</p>
                            : dayAppts.map(a => (
                              <div key={a.id} className="flex items-center gap-2 text-xs py-1">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:a.client_color||'#6366f1'}}/>
                                <span className="font-medium text-foreground">{a.start_time}</span>
                                <span className="text-muted-foreground">— {a.title} ({a.duration_minutes}min)</span>
                              </div>
                            ))
                          }
                        </div>
                        {/* Time picker */}
                        <div className="grid grid-cols-2 gap-3">
                          <div><label className="section-label">Propose Time</label><input type="time" value={time} onChange={e=>setTime(e.target.value)} className="input-base mt-1"/></div>
                          <div><label className="section-label">Duration (min)</label><input type="number" step="15" value={duration} onChange={e=>setDuration(parseInt(e.target.value))} className="input-base mt-1"/></div>
                        </div>
                        <div><label className="section-label">Note to client</label><textarea value={note} onChange={e=>setNote(e.target.value)} rows={2} placeholder="e.g. See you then! Bring your gym gear." className="input-base mt-1 resize-none"/></div>
                        {req.client_counter_note && (
                          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl p-3 mb-3">
                            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-0.5">Client says:</p>
                            <p className="text-sm text-blue-800 dark:text-blue-300 italic">"{req.client_counter_note}"</p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button onClick={() => declineRequest(req)} className="btn btn-secondary flex-1 text-sm text-red-500 hover:text-red-600">Decline</button>
                          <button onClick={() => propose(req)} disabled={saving} className="btn btn-primary flex-1 text-sm">
                            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/>Sending…</> : req.client_counter_note ? 'Re-propose Time →' : 'Propose Time →'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Proposed — waiting for client */}
          {proposedRequests.length > 0 && (
            <div>
              <p className="px-5 pt-4 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Awaiting Client Confirmation ({proposedRequests.length})</p>
              {proposedRequests.map(req => (
                <div key={req.id} className="flex items-center gap-4 px-5 py-4 border-b border-border">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{backgroundColor:req.client_color||'#6366f1'}}>{req.client_name?.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{req.client_name}</p>
                    <p className="text-xs text-muted-foreground">{req.requested_date ? format(parseISO(req.requested_date),'MMM d') : ''} at {req.proposed_time} · {req.proposed_duration}min</p>
                    <p className="text-xs text-purple-600 mt-0.5">Waiting for client to confirm…</p>
                  </div>
                  <button onClick={() => cancel(req)} className="btn btn-sm btn-secondary text-xs text-red-500 hover:text-red-600">Cancel</button>
                </div>
              ))}
            </div>
          )}

          {pendingRequests.length === 0 && proposedRequests.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="font-medium">No pending requests</p>
              <p className="text-sm mt-1">Client requests will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main CalendarPage ─────────────────────────────────────────────────────────
export default function CalendarPage() {
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [defaultDate, setDefaultDate] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  const load = async () => {
    const [a, c, req] = await Promise.all([
      db.Appointment.list('date', 300),
      db.Client.list('name'),
      db.AppointmentRequest.filter({ status: 'pending' }),
    ]);
    const countered = await db.AppointmentRequest.filter({ status: 'client_countered' });
    setAppointments(a); setClients(c);
    setPendingCount(req.length + countered.length);
  };
  useEffect(() => { load(); const iv = setInterval(load, 10000); return () => clearInterval(iv); }, []);

  const nav = (dir) => {
    if (view==='month') setCurrentDate(d=>dir>0?addMonths(d,1):subMonths(d,1));
    else setCurrentDate(d=>dir>0?addWeeks(d,1):subWeeks(d,1));
  };

  const getAppts = (day) => appointments.filter(a => { try { return isSameDay(parseISO(a.date), day); } catch { return false; } });

  const monthStart = startOfMonth(currentDate);
  const days = [];
  let d = startOfWeek(monthStart);
  while (d <= endOfWeek(endOfMonth(currentDate))) { days.push(d); d = addDays(d, 1); }

  const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);
  const weekStart = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const statusColor = { scheduled:'', completed:'opacity-60', proposed:'ring-2 ring-purple-400', cancelled:'opacity-40 line-through' };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-subtitle">{view==='month'?format(currentDate,'MMMM yyyy'):`Week of ${format(weekStart,'MMM d, yyyy')}`}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-muted rounded-xl p-0.5">
            <button onClick={()=>setView('month')} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${view==='month'?'bg-card shadow text-foreground font-medium':'text-muted-foreground'}`}>Month</button>
            <button onClick={()=>setView('week')} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${view==='week'?'bg-card shadow text-foreground font-medium':'text-muted-foreground'}`}>Week</button>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={()=>nav(-1)} className="btn-ghost btn-icon"><ChevronLeft className="w-4 h-4"/></button>
            <button onClick={()=>setCurrentDate(new Date())} className="btn btn-sm btn-secondary">Today</button>
            <button onClick={()=>nav(1)} className="btn-ghost btn-icon"><ChevronRight className="w-4 h-4"/></button>
          </div>
          {pendingCount > 0 && (
            <button onClick={()=>setShowRequests(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors">
              Requests <span className="w-5 h-5 bg-white text-amber-600 rounded-full text-xs font-bold flex items-center justify-center">{pendingCount}</span>
            </button>
          )}
          <button onClick={()=>setShowRequests(true)} className="btn btn-secondary text-sm">All Requests</button>
          <button onClick={()=>{setDefaultDate(format(new Date(),'yyyy-MM-dd'));setShowModal(true);}} className="btn btn-primary">
            <Plus className="w-4 h-4"/>New Event
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {/* Month view */}
        {view==='month' && (
          <>
            <div className="grid grid-cols-7 border-b border-border">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d} className="py-3 text-center text-xs font-semibold text-muted-foreground">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {days.map(day=>{
                const appts = getAppts(day);
                const inMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());
                return (
                  <div key={day.toISOString()} onClick={()=>{setDefaultDate(format(day,'yyyy-MM-dd'));setShowModal(true);}}
                    className={`min-h-[90px] border-b border-r border-border p-1.5 cursor-pointer hover:bg-muted/30 transition-colors ${!inMonth?'opacity-30':''}`}>
                    <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday?'bg-foreground text-background':'text-muted-foreground'}`}>{format(day,'d')}</div>
                    <div className="space-y-0.5">
                      {appts.slice(0,3).map(a=>(
                        <div key={a.id} className={`text-xs px-1.5 py-0.5 rounded-md truncate ${statusColor[a.status]||''}`}
                          style={{backgroundColor:(a.client_color||'#6366f1')+'22',color:a.client_color||'#6366f1',borderLeft:`2px solid ${a.client_color||'#6366f1'}`}}>
                          {a.status==='proposed'?'📤 ':''}{a.title}
                        </div>
                      ))}
                      {appts.length>3&&<div className="text-xs text-muted-foreground pl-1">+{appts.length-3}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Week view */}
        {view==='week' && (
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-8 border-b border-border">
                <div className="py-3"/>
                {weekDays.map(day=>(
                  <div key={day.toISOString()} className="py-3 text-center">
                    <p className="text-xs text-muted-foreground">{format(day,'EEE')}</p>
                    <p className={`text-sm font-semibold mt-0.5 w-7 h-7 flex items-center justify-center rounded-full mx-auto ${isSameDay(day,new Date())?'bg-foreground text-background':'text-foreground'}`}>{format(day,'d')}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-8">
                <div>{HOURS.map(h=><div key={h} className="h-14 border-b border-border flex items-start pt-1 pr-2"><span className="text-xs text-muted-foreground text-right w-full">{h}:00</span></div>)}</div>
                {weekDays.map(day=>{
                  const dayAppts = getAppts(day);
                  return (
                    <div key={day.toISOString()} className="relative border-l border-border">
                      {HOURS.map(h=><div key={h} className="h-14 border-b border-border hover:bg-muted/20 cursor-pointer" onClick={()=>{setDefaultDate(format(day,'yyyy-MM-dd'));setShowModal(true);}}/>)}
                      {dayAppts.map(a=>{
                        const [hh,mm]=(a.start_time||'09:00').split(':').map(Number);
                        const top=(hh-7)*56+(mm/60)*56;
                        const height=Math.max(((a.duration_minutes||60)/60)*56,24);
                        const color=a.client_color||'#6366f1';
                        return (
                          <div key={a.id} className="absolute left-0.5 right-0.5 rounded-lg px-1.5 py-1 z-10 overflow-hidden"
                            style={{top,height,backgroundColor:color+'22',borderLeft:`3px solid ${color}`,outline:a.status==='proposed'?`2px solid #a855f7`:'none'}}>
                            <p className="text-xs font-semibold truncate" style={{color}}>{a.status==='proposed'?'📤 ':''}{a.title}</p>
                            <p className="text-xs truncate" style={{color:color+'99'}}>{a.start_time}</p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && <EventModal onClose={()=>setShowModal(false)} onSaved={load} clients={clients} defaultDate={defaultDate}/>}
      {showRequests && <RequestsPanel onClose={()=>setShowRequests(false)} onUpdated={load}/>}
    </div>
  );
}
