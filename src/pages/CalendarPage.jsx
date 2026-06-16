import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, parseISO, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { db } from '../lib/db';

function EventModal({ onClose, onSaved, clients, defaultDate }) {
  const [f, setF] = useState({ title:'', client_id:'', client_name:'', client_color:'', type:'training', date:defaultDate||format(new Date(),'yyyy-MM-dd'), start_time:'09:00', duration_minutes:60, status:'scheduled', notes:'' });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const handleClient = (id) => { const c=clients.find(c=>c.id===id); setF(p=>({...p,client_id:id,client_name:c?.name||'',client_color:c?.theme_color||''})); };
  const save = async () => { setSaving(true); await db.Appointment.create(f); setSaving(false); onSaved(); onClose(); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-gray-900">New Event</h2><button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button></div>
        <div className="space-y-3">
          <div><label className="text-xs font-medium text-gray-500 uppercase">Title *</label><input value={f.title} onChange={e=>set('title',e.target.value)} className="input-base mt-1" /></div>
          <div><label className="text-xs font-medium text-gray-500 uppercase">Client</label><select value={f.client_id} onChange={e=>handleClient(e.target.value)} className="input-base mt-1"><option value="">Select client</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-500 uppercase">Type</label><select value={f.type} onChange={e=>set('type',e.target.value)} className="input-base mt-1"><option value="training">Training</option><option value="nutrition">Nutrition</option><option value="other">Other</option></select></div>
            <div><label className="text-xs font-medium text-gray-500 uppercase">Duration (min)</label><input type="number" step="15" value={f.duration_minutes} onChange={e=>set('duration_minutes',parseInt(e.target.value))} className="input-base mt-1" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-500 uppercase">Date *</label><input type="date" value={f.date} onChange={e=>set('date',e.target.value)} className="input-base mt-1" /></div>
            <div><label className="text-xs font-medium text-gray-500 uppercase">Time *</label><input type="time" value={f.start_time} onChange={e=>set('start_time',e.target.value)} className="input-base mt-1" /></div>
          </div>
          <div><label className="text-xs font-medium text-gray-500 uppercase">Status</label><select value={f.status} onChange={e=>set('status',e.target.value)} className="input-base mt-1"><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
          <div><label className="text-xs font-medium text-gray-500 uppercase">Notes</label><textarea value={f.notes} onChange={e=>set('notes',e.target.value)} rows={2} className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none resize-none" /></div>
        </div>
        <div className="flex gap-2 mt-4"><button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button><button onClick={save} disabled={saving||!f.title||!f.date} className="btn btn-primary flex-1">{saving?'Saving…':'Save'}</button></div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [defaultDate, setDefaultDate] = useState('');

  const load = async () => {
    const [a, c] = await Promise.all([db.Appointment.list('date', 300), db.Client.list('name')]);
    setAppointments(a); setClients(c);
  };
  useEffect(() => { load(); }, []);

  const nav = (dir) => {
    if (view === 'month') setCurrentDate(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
    else setCurrentDate(d => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1));
  };

  const getAppts = (day) => appointments.filter(a => { try { return isSameDay(parseISO(a.date), day); } catch { return false; } });

  // Month view
  const monthStart = startOfMonth(currentDate);
  const days = [];
  let d = startOfWeek(monthStart);
  while (d <= endOfWeek(endOfMonth(currentDate))) { days.push(d); d = addDays(d, 1); }

  const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);
  const weekStart2 = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart2, i));

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-subtitle">{view==='month'?format(currentDate,'MMMM yyyy'):`Week of ${format(weekStart2,'MMM d')}`}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-0.5"><button onClick={()=>setView('month')} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${view==='month'?'bg-white shadow text-gray-900':'text-gray-500'}`}>Month</button><button onClick={()=>setView('week')} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${view==='week'?'bg-white shadow text-gray-900':'text-gray-500'}`}>Week</button></div>
          <div className="flex items-center gap-1"><button onClick={()=>nav(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-4 h-4 text-gray-600" /></button><button onClick={()=>setCurrentDate(new Date())} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Today</button><button onClick={()=>nav(1)} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight className="w-4 h-4 text-gray-600" /></button></div>
          <button onClick={()=>{setDefaultDate(format(new Date(),'yyyy-MM-dd'));setShowModal(true);}} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800"><Plus className="w-4 h-4" /> New Event</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {view === 'month' && (
          <>
            <div className="grid grid-cols-7 border-b border-gray-100">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d} className="py-2 text-center text-xs font-medium text-gray-400">{d}</div>)}</div>
            <div className="grid grid-cols-7">
              {days.map(day => {
                const appts = getAppts(day);
                const inMonth = isSameMonth(day, currentDate);
                const isTod = isSameDay(day, new Date());
                return (
                  <div key={day.toISOString()} className={`min-h-[90px] border-b border-r border-gray-50 p-1.5 cursor-pointer hover:bg-gray-50 ${!inMonth?'opacity-30':''}`} onClick={()=>{setDefaultDate(format(day,'yyyy-MM-dd'));setShowModal(true);}}>
                    <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isTod?'bg-gray-900 text-white':'text-gray-500'}`}>{format(day,'d')}</div>
                    <div className="space-y-0.5">
                      {appts.slice(0,3).map(a=><div key={a.id} className="text-xs px-1.5 py-0.5 rounded-md truncate" style={{backgroundColor:(a.client_color||'#6366f1')+'22',color:a.client_color||'#6366f1',borderLeft:`2px solid ${a.client_color||'#6366f1'}`}}>{a.title}</div>)}
                      {appts.length>3 && <div className="text-xs text-gray-400 pl-1">+{appts.length-3}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {view === 'week' && (
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-8 border-b border-gray-100">
                <div className="py-3 text-xs text-gray-400 text-center" />
                {weekDays.map(day=><div key={day.toISOString()} className="py-3 text-center"><p className="text-xs text-gray-400">{format(day,'EEE')}</p><p className={`text-sm font-medium mt-0.5 w-7 h-7 flex items-center justify-center rounded-full mx-auto ${isSameDay(day,new Date())?'bg-gray-900 text-white':'text-gray-700'}`}>{format(day,'d')}</p></div>)}
              </div>
              <div className="grid grid-cols-8">
                <div>{HOURS.map(h=><div key={h} className="h-14 border-b border-gray-50 flex items-start pt-1 pr-2"><span className="text-xs text-gray-300 text-right w-full">{h}:00</span></div>)}</div>
                {weekDays.map(day=>{
                  const dayAppts = getAppts(day);
                  return (
                    <div key={day.toISOString()} className="relative border-l border-gray-50">
                      {HOURS.map(h=><div key={h} className="h-14 border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={()=>{setDefaultDate(format(day,'yyyy-MM-dd'));setShowModal(true);}} />)}
                      {dayAppts.map(a=>{
                        const [hh,mm]=(a.start_time||'09:00').split(':').map(Number);
                        const top=(hh-7)*56+(mm/60)*56;
                        const height=Math.max(((a.duration_minutes||60)/60)*56,24);
                        const color=a.client_color||'#6366f1';
                        return <div key={a.id} className="absolute left-0.5 right-0.5 rounded-lg px-1.5 py-1 cursor-pointer hover:opacity-90 z-10 overflow-hidden" style={{top,height,backgroundColor:color+'22',borderLeft:`3px solid ${color}`}}><p className="text-xs font-medium truncate" style={{color}}>{a.title}</p><p className="text-xs truncate" style={{color:color+'aa'}}>{a.start_time}</p></div>;
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && <EventModal onClose={()=>setShowModal(false)} onSaved={load} clients={clients} defaultDate={defaultDate} />}
    </div>
  );
}
