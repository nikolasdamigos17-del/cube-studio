import { useState, useEffect, useRef } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, parseISO, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns';
import { el } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, X, Clock, Check, AlertCircle, Loader2 } from 'lucide-react';
import { db } from '../lib/db';
import { groupDisplayName, unorphanClients } from '../lib/groups';

// ── Event Modal ───────────────────────────────────────────────────────────────
function EventModal({ onClose, onSaved, clients, groups=[], defaultDate, defaultTime, event=null }) {
  const [f, setF] = useState(() => ({
    title:'', client_id:'', group_id:'', client_name:'', client_color:'', type:'training',
    date:defaultDate||format(new Date(),'yyyy-MM-dd'), start_time:defaultTime||'09:00', duration_minutes:60, status:'scheduled', notes:'',
    ...(event || {}),
  }));
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const hc = (val) => {
    if (val && val.startsWith('group:')) {
      const g = groups.find(x=>x.id===val.slice(6));
      setF(p=>({...p, client_id:'', group_id:g?.id||'', client_name:g?groupDisplayName(g,clients):'', client_color:'#8b5cf6'}));
    } else {
      const c = clients.find(c=>c.id===val);
      setF(p=>({...p, client_id:val, group_id:'', client_name:c?.name||'', client_color:c?.theme_color||''}));
    }
  };
  const selVal = f.group_id ? 'group:'+f.group_id : f.client_id;
  const save = async () => {
    setSaving(true);
    try {
      if (event?.id) await db.Appointment.update(event.id, f);
      else await db.Appointment.create(f);
      setSaving(false); onSaved(); onClose();
    } catch (e) { setSaving(false); alert('Αποτυχία αποθήκευσης: ' + String(e?.message||e)); }
  };
  const del = async () => {
    if (!event?.id || !confirm('Διαγραφή αυτού του event;')) return;
    try { await db.Appointment.delete(event.id); onSaved(); onClose(); }
    catch (e) { alert('Αποτυχία διαγραφής: ' + String(e?.message||e)); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-md p-6 w-full" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-foreground text-lg" style={{fontFamily:'var(--font-display)'}}>{event?.id ? 'Επεξεργασία event' : 'New Event'}</h2><button onClick={onClose} className="btn-ghost btn-icon"><X className="w-4 h-4"/></button></div>
        <div className="space-y-3">
          <div><label className="section-label">Title *</label><input value={f.title} onChange={e=>set('title',e.target.value)} className="input-base mt-1"/></div>
          <div><label className="section-label">Πελάτης ή group</label><select value={selVal} onChange={e=>hc(e.target.value)} className="input-base mt-1"><option value="">Διάλεξε πελάτη ή group</option><optgroup label="Άτομα">{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>{groups.length>0 && <optgroup label="Groups">{groups.map(g=><option key={g.id} value={"group:"+g.id}>👥 {groupDisplayName(g, clients)}</option>)}</optgroup>}</select></div>
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
          {event?.id && <button onClick={del} title="Διαγραφή" className="btn btn-secondary px-3 text-red-500">🗑</button>}
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

// ── Today Bar — μακρόστενη γρήγορη ματιά στη σημερινή μέρα ──────────────────────
function TodayBar({ appointments, onEdit, onNew }) {
  const [, tick] = useState(0);
  useEffect(() => { const iv = setInterval(() => tick(t => t + 1), 60000); return () => clearInterval(iv); }, []);
  const today = new Date();
  const appts = appointments
    .filter(a => { try { return isSameDay(parseISO(a.date), today) && a.status !== 'cancelled'; } catch { return false; } })
    .map(a => {
      const [hh, mm] = (a.start_time || '09:00').split(':').map(Number);
      const start = hh * 60 + (mm || 0);
      const end = start + (a.duration_minutes || 60);
      const endStr = `${String(Math.floor(end / 60) % 24).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
      return { ...a, _start: start, _end: end, _endStr: endStr };
    })
    .sort((x, y) => x._start - y._start);

  const rangeStart = Math.min(7, ...appts.map(a => Math.floor(a._start / 60))) * 60;
  const rangeEnd = Math.max(22, ...appts.map(a => Math.ceil(a._end / 60))) * 60;
  const span = rangeEnd - rangeStart || 1;
  const pct = (m) => ((m - rangeStart) / span) * 100;

  /* λωρίδες για επικαλυπτόμενα ραντεβού */
  const lanes = [];
  for (const a of appts) {
    let li = lanes.findIndex(endAt => endAt <= a._start);
    if (li === -1) { li = lanes.length; lanes.push(0); }
    lanes[li] = a._end; a._lane = li;
  }
  const laneCount = Math.max(1, lanes.length);
  const ROW = 34;

  const nowMin = today.getHours() * 60 + today.getMinutes();
  const hours = []; for (let h = rangeStart / 60; h <= rangeEnd / 60; h++) hours.push(h);

  return (
    <div className="card mb-4 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3 pb-1 flex-wrap gap-2">
        <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
          <span style={{ color:'#e0457b' }}>●</span> ΣΗΜΕΡΑ · {format(today, 'EEEE d MMM')}
        </p>
        <p className="text-xs text-muted-foreground font-medium">{appts.length ? `${appts.length} ραντεβού` : 'Κανένα ραντεβού σήμερα'}</p>
      </div>
      <div className="overflow-x-auto">
        <div className="relative mx-4 mb-3 mt-1 cursor-pointer" style={{ minWidth: 620, height: laneCount * ROW + 22 }} onClick={onNew}>
          {/* ώρες */}
          {hours.map(h => (
            <div key={h} className="absolute top-0 bottom-0" style={{ left: `${pct(h * 60)}%` }}>
              <div className="absolute top-4 bottom-0 border-l border-border" style={{ opacity:.7 }}/>
              <span className="absolute top-0 -translate-x-1/2 text-[10px] text-muted-foreground font-medium">{h}:00</span>
            </div>
          ))}
          {/* δείκτης τώρα */}
          {nowMin > rangeStart && nowMin < rangeEnd && (
            <div className="absolute z-20 pointer-events-none" style={{ left:`${pct(nowMin)}%`, top:14, bottom:0 }}>
              <div style={{ width:2, height:'100%', background:'#e0457b', boxShadow:'0 0 8px rgba(224,69,123,.8)' }}/>
              <div style={{ position:'absolute', top:-5, left:-3, width:8, height:8, borderRadius:99, background:'#e0457b' }}/>
            </div>
          )}
          {/* ραντεβού πάνω στην μπάρα, με έναρξη–λήξη */}
          {appts.map(a => {
            const color = a.client_color || '#6366f1';
            return (
              <div key={a.id} title={`${a.title} · ${a.start_time}–${a._endStr}`}
                onClick={(e) => { e.stopPropagation(); onEdit(a); }}
                className="absolute rounded-lg px-2 z-10 overflow-hidden cursor-pointer hover:opacity-80 flex flex-col justify-center"
                style={{ left:`${pct(a._start)}%`, width:`max(${(pct(a._end) - pct(a._start)).toFixed(3)}%, 56px)`, top: 18 + a._lane * ROW, height: ROW - 5,
                  backgroundColor: color + '22', borderLeft: `3px solid ${color}`, outline: a.status === 'proposed' ? '2px solid #a855f7' : 'none' }}>
                <p className="text-[11px] font-bold leading-tight truncate" style={{ color }}>{a.status === 'proposed' ? '📤 ' : ''}{a.start_time}–{a._endStr}</p>
                <p className="text-[10px] leading-tight truncate" style={{ color: color + 'bb' }}>{a.client_name || a.title}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* κεφαλαία χωρίς τόνους (ΔΕΥΤΕΡΑ, όχι ΔΕΥΤΈΡΑ) */
const upEl = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

// ── Day Panel — η μέρα που διάλεξες, ακριβώς δίπλα στον μήνα ───────────────────
function DayPanel({ day, appointments, onClose, onShift, onEdit, onNewAt, stacked }) {
  const ROW = 54;                                   // ύψος μίας ώρας σε px
  const bodyRef = useRef(null);
  const [, tick] = useState(0);
  useEffect(() => { const iv = setInterval(() => tick(t => t + 1), 60000); return () => clearInterval(iv); }, []);

  const appts = appointments
    .filter(a => { try { return isSameDay(parseISO(a.date), day); } catch { return false; } })
    .map(a => {
      const [hh, mm] = (a.start_time || '09:00').split(':').map(Number);
      const start = (hh || 0) * 60 + (mm || 0);
      const end = start + (a.duration_minutes || 60);
      const endStr = `${String(Math.floor(end / 60) % 24).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
      return { ...a, _start: start, _end: end, _endStr: endStr };
    })
    .sort((x, y) => x._start - y._start);
  const live = appts.filter(a => a.status !== 'cancelled');

  const firstH = Math.min(7, ...appts.map(a => Math.floor(a._start / 60)));
  const lastH = Math.max(22, ...appts.map(a => Math.ceil(a._end / 60)));
  const hours = []; for (let h = firstH; h < lastH; h++) hours.push(h);

  /* επικαλυπτόμενα ραντεβού → δίπλα-δίπλα σε λωρίδες */
  const lanes = [];
  for (const a of appts) {
    let li = lanes.findIndex(endAt => endAt <= a._start);
    if (li === -1) { li = lanes.length; lanes.push(0); }
    lanes[li] = a._end; a._lane = li;
  }
  const laneCount = Math.max(1, lanes.length);

  const now = new Date();
  const isToday = isSameDay(day, now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const y = (m) => ((m - firstH * 60) / 60) * ROW;

  /* άνοιγμα: κύλιση στο πρώτο ραντεβού (ή στην τρέχουσα ώρα αν είναι σήμερα) */
  const dayKey = format(day, 'yyyy-MM-dd');
  useEffect(() => {
    const el2 = bodyRef.current; if (!el2) return;
    const target = appts.length ? appts[0]._start : (isToday ? nowMin : 9 * 60);
    el2.scrollTop = Math.max(0, y(target) - ROW * 0.6);
  }, [dayKey]); // eslint-disable-line

  const totalMin = live.reduce((s2, a) => s2 + (a.duration_minutes || 60), 0);
  return (
    <div className="card overflow-hidden flex flex-col" style={{ flex: stacked ? '1 1 auto' : '1 1 0', width: stacked ? '100%' : undefined, minWidth: 0, animation: 'calDayIn .28s cubic-bezier(.22,1,.36,1)' }}>
      <style>{`@keyframes calDayIn{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}`}</style>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold tracking-widest" style={{ color: isToday ? '#e0457b' : 'hsl(var(--muted-foreground))' }}>{upEl(format(day, 'EEEE', { locale: el }))}{isToday ? ' · ΣΗΜΕΡΑ' : ''}</p>
          <p className="font-bold text-foreground text-lg leading-tight truncate" style={{ fontFamily: 'var(--font-display)' }}>{format(day, 'd MMMM yyyy', { locale: el })}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {live.length ? `${live.length} ραντεβού · ${(totalMin / 60).toFixed(totalMin % 60 ? 1 : 0)} ώρες` : 'Κενή μέρα'}
          </p>
        </div>
        <button onClick={() => onShift(-1)} title="Προηγούμενη μέρα" className="btn-ghost btn-icon"><ChevronLeft className="w-4 h-4"/></button>
        <button onClick={() => onShift(1)} title="Επόμενη μέρα" className="btn-ghost btn-icon"><ChevronRight className="w-4 h-4"/></button>
        <button onClick={() => onNewAt('')} className="btn btn-sm btn-primary"><Plus className="w-3.5 h-3.5"/>Νέο</button>
        <button onClick={onClose} title="Κλείσιμο ημέρας" className="btn-ghost btn-icon"><X className="w-4 h-4"/></button>
      </div>

      <div ref={bodyRef} className="overflow-y-auto" style={{ maxHeight: stacked ? 460 : 'max(340px, calc(100vh - 376px))' }}>
        <div className="relative" style={{ height: hours.length * ROW, marginLeft: 52, marginRight: 10 }}>
          {hours.map((h, i) => (
            <div key={h} onClick={() => onNewAt(`${String(h).padStart(2, '0')}:00`)}
              className="absolute left-0 right-0 border-b border-border hover:bg-muted/30 cursor-pointer" style={{ top: i * ROW, height: ROW }}>
              <span className="absolute text-xs text-muted-foreground tabular-nums" style={{ left: -46, top: -8, width: 40, textAlign: 'right' }}>{i === 0 ? '' : `${String(h).padStart(2, '0')}:00`}</span>
            </div>
          ))}
          {isToday && nowMin > firstH * 60 && nowMin < lastH * 60 && (
            <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: y(nowMin) }}>
              <div style={{ height: 2, background: '#e0457b', boxShadow: '0 0 8px rgba(224,69,123,.7)' }}/>
              <div style={{ position: 'absolute', left: -4, top: -3, width: 8, height: 8, borderRadius: 99, background: '#e0457b' }}/>
            </div>
          )}
          {appts.map(a => {
            const color = a.client_color || '#6366f1';
            const h2 = Math.max(((a._end - a._start) / 60) * ROW - 3, 26);
            const w = 100 / laneCount;
            return (
              <div key={a.id} onClick={(e) => { e.stopPropagation(); onEdit(a); }}
                title={`${a.title || ''} · ${a.start_time}–${a._endStr}`}
                className="absolute rounded-lg px-2.5 py-1.5 z-10 overflow-hidden cursor-pointer hover:opacity-80"
                style={{ top: y(a._start) + 1, height: h2, left: `calc(${a._lane * w}% + 2px)`, width: `calc(${w}% - 4px)`,
                  backgroundColor: color + '22', borderLeft: `3px solid ${color}`,
                  outline: a.status === 'proposed' ? '2px solid #a855f7' : 'none',
                  opacity: a.status === 'cancelled' ? 0.4 : a.status === 'completed' ? 0.65 : 1,
                  textDecoration: a.status === 'cancelled' ? 'line-through' : 'none' }}>
                <p className="text-xs font-bold leading-tight tabular-nums" style={{ color }}>{a.status === 'proposed' ? '📤 ' : ''}{a.start_time}–{a._endStr}</p>
                {h2 > 34 && <p className="text-sm font-semibold leading-tight truncate text-foreground mt-0.5">{a.client_name || a.title}</p>}
                {h2 > 56 && a.title && a.title !== a.client_name && <p className="text-[11px] leading-tight truncate text-muted-foreground mt-0.5">{a.title}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main CalendarPage ─────────────────────────────────────────────────────────
export default function CalendarPage() {
  const [view, setView] = useState('month');   // προεπιλογή: μηνιαία όψη
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [groups, setGroups] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [showRequests, setShowRequests] = useState(false);
  const [defaultDate, setDefaultDate] = useState('');
  const [defaultTime, setDefaultTime] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [selDay, setSelDay] = useState(null);          // η μέρα που είναι ανοιχτή δίπλα στον μήνα
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  useEffect(() => { const h = () => setNarrow(window.innerWidth < 1024); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);
  const split = view === 'month' && !!selDay;           // μήνας + μέρα δίπλα-δίπλα
  const openDay = (day) => {
    if (selDay && isSameDay(day, selDay)) { setSelDay(null); return; }   // δεύτερο κλικ στην ίδια μέρα = κλείσιμο
    setSelDay(day);
    if (!isSameMonth(day, currentDate)) setCurrentDate(day);
  };
  const shiftDay = (n) => { const d2 = addDays(selDay, n); setSelDay(d2); if (!isSameMonth(d2, currentDate)) setCurrentDate(d2); };
  const newEvent = (dateStr, time = '') => { setEditEvent(null); setDefaultDate(dateStr); setDefaultTime(time); setShowModal(true); };

  const load = async () => {
    const [a, c, req, g] = await Promise.all([
      db.Appointment.list('date', 300),
      db.Client.list('name'),
      db.AppointmentRequest.filter({ status: 'pending' }),
      db.Group.list('name'),
    ]);
    const countered = await db.AppointmentRequest.filter({ status: 'client_countered' });
    setAppointments(a); setClients(unorphanClients(c, g).filter(x => !x.is_trial)); setGroups(g.filter(x => !x.is_trial));
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
            <button onClick={()=>{ setView('week'); setSelDay(null); }} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${view==='week'?'bg-card shadow text-foreground font-medium':'text-muted-foreground'}`}>Week</button>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={()=>nav(-1)} className="btn-ghost btn-icon"><ChevronLeft className="w-4 h-4"/></button>
            <button onClick={()=>{ setCurrentDate(new Date()); if (selDay) setSelDay(new Date()); }} className="btn btn-sm btn-secondary">Today</button>
            <button onClick={()=>nav(1)} className="btn-ghost btn-icon"><ChevronRight className="w-4 h-4"/></button>
          </div>
          {pendingCount > 0 && (
            <button onClick={()=>setShowRequests(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors">
              Requests <span className="w-5 h-5 bg-white text-amber-600 rounded-full text-xs font-bold flex items-center justify-center">{pendingCount}</span>
            </button>
          )}
          <button onClick={()=>setShowRequests(true)} className="btn btn-secondary text-sm">All Requests</button>
          <button onClick={()=>newEvent(format(selDay || new Date(),'yyyy-MM-dd'))} className="btn btn-primary">
            <Plus className="w-4 h-4"/>New Event
          </button>
        </div>
      </div>

      <TodayBar appointments={appointments}
        onEdit={(a)=>{ setEditEvent(a); setShowModal(true); }}
        onNew={()=>newEvent(format(new Date(),'yyyy-MM-dd'))}/>

      {/* Μήνας (μικραίνει) + η επιλεγμένη μέρα ακριβώς δίπλα */}
      <div style={{ display:'flex', alignItems:'flex-start', gap: split ? 16 : 0, flexDirection: narrow ? 'column' : 'row' }}>
      <div className="card overflow-hidden" style={{ flex: split && !narrow ? '0 0 54%' : '1 1 100%', width: narrow ? '100%' : undefined, minWidth: 0, transition: 'flex-basis .3s cubic-bezier(.22,1,.36,1)' }}>
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
                const isSel = selDay && isSameDay(day, selDay);
                return (
                  <div key={day.toISOString()} onClick={()=>openDay(day)}
                    className={`${split ? 'min-h-[66px]' : 'min-h-[90px]'} border-b border-r border-border p-1.5 cursor-pointer hover:bg-muted/30 transition-colors ${!inMonth?'opacity-30':''}`}
                    style={isSel ? { background:'hsl(var(--primary)/0.10)', boxShadow:'inset 0 0 0 2px hsl(var(--primary))' } : undefined}>
                    <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday?'bg-foreground text-background':isSel?'text-foreground':'text-muted-foreground'}`}>{format(day,'d')}</div>
                    {split ? (
                      /* μικρός μήνας: κουκκίδες αντί για ετικέτες */
                      <div className="flex flex-wrap items-center gap-1 px-0.5">
                        {appts.slice(0,5).map(a=>(
                          <span key={a.id} title={`${a.start_time || ''} ${a.title || ''}`} className={statusColor[a.status]||''}
                            style={{ width:7, height:7, borderRadius:99, background:a.client_color||'#6366f1', display:'inline-block' }}/>
                        ))}
                        {appts.length>5&&<span className="text-[10px] text-muted-foreground leading-none">+{appts.length-5}</span>}
                      </div>
                    ) : (
                    <div className="space-y-0.5">
                      {appts.slice(0,3).map(a=>(
                        <div key={a.id} className={`text-xs px-1.5 py-0.5 rounded-md truncate cursor-pointer hover:opacity-80 ${statusColor[a.status]||''}`}
                          onClick={(e)=>{ e.stopPropagation(); setEditEvent(a); setShowModal(true); }}
                          style={{backgroundColor:(a.client_color||'#6366f1')+'22',color:a.client_color||'#6366f1',borderLeft:`2px solid ${a.client_color||'#6366f1'}`}}>
                          {a.status==='proposed'?'📤 ':''}{a.title}
                        </div>
                      ))}
                      {appts.length>3&&<div className="text-xs text-muted-foreground pl-1">+{appts.length-3}</div>}
                    </div>
                    )}
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
                      {HOURS.map(h=><div key={h} className="h-14 border-b border-border hover:bg-muted/20 cursor-pointer" onClick={()=>newEvent(format(day,'yyyy-MM-dd'), `${String(h).padStart(2,'0')}:00`)}/>)}
                      {dayAppts.map(a=>{
                        const [hh,mm]=(a.start_time||'09:00').split(':').map(Number);
                        const top=(hh-7)*56+(mm/60)*56;
                        const height=Math.max(((a.duration_minutes||60)/60)*56,24);
                        const color=a.client_color||'#6366f1';
                        return (
                          <div key={a.id} className="absolute left-0.5 right-0.5 rounded-lg px-1.5 py-1 z-10 overflow-hidden cursor-pointer hover:opacity-80"
                            onClick={(e)=>{ e.stopPropagation(); setEditEvent(a); setShowModal(true); }}
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
      {split && (
        <DayPanel day={selDay} appointments={appointments} stacked={narrow}
          onClose={()=>setSelDay(null)} onShift={shiftDay}
          onEdit={(a)=>{ setEditEvent(a); setShowModal(true); }}
          onNewAt={(t)=>newEvent(format(selDay,'yyyy-MM-dd'), t)}/>
      )}
      </div>

      {showModal && <EventModal onClose={()=>{setShowModal(false); setEditEvent(null); setDefaultTime('');}} onSaved={load} clients={clients} groups={groups} defaultDate={defaultDate} defaultTime={defaultTime} event={editEvent}/>}
      {showRequests && <RequestsPanel onClose={()=>setShowRequests(false)} onUpdated={load}/>}
    </div>
  );
}
