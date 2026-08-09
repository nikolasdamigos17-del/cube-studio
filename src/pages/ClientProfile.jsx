import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Edit3, Plus, Trash2, X, BarChart2, Dumbbell, Salad, CreditCard, StickyNote, Pin } from 'lucide-react';
import { db } from '../lib/db';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const METRICS = [{key:'weight_kg',label:'Weight',unit:'kg',color:'#6366f1'},{key:'body_fat_pct',label:'Body Fat',unit:'%',color:'#ef4444'},{key:'muscle_mass_kg',label:'Muscle',unit:'kg',color:'#10b981'},{key:'body_water_pct',label:'Water',unit:'%',color:'#3b82f6'},{key:'bone_mass_kg',label:'Bone',unit:'kg',color:'#8b5cf6'},{key:'bmr',label:'BMR',unit:'kcal',color:'#f59e0b'},{key:'bmi',label:'BMI',unit:'',color:'#ec4899'},{key:'visceral_fat',label:'Visceral Fat',unit:'',color:'#f97316'},{key:'steps',label:'Steps',unit:'',color:'#22c55e'},{key:'sleep_hours',label:'Sleep',unit:'h',color:'#a78bfa'},{key:'water_liters',label:'Water Intake',unit:'L',color:'#06b6d4'}];

function WeightHoverWidget({ progress }) {
  const data = progress.filter(p=>p.weight_kg).map(p=>({ date:p.date?format(parseISO(p.date),'MMM d'):'', weight:p.weight_kg }));
  if (!data.length) return null;
  const latest = progress[progress.length-1];
  return (
    <div className="group relative inline-block">
      <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 cursor-default hover:shadow-md transition-shadow">
        <p className="text-xs text-gray-400 uppercase font-medium">Weight</p>
        <p className="text-3xl font-bold text-indigo-600 mt-1">{latest?.weight_kg} <span className="text-base font-normal text-gray-400">kg</span></p>
      </div>
      <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 hidden group-hover:block z-20">
        <p className="text-xs font-medium text-gray-500 mb-2">Weight Progress</p>
        <ResponsiveContainer width="100%" height={100}>
          <LineChart data={data}><Line type="monotone" dataKey="weight" stroke="#6366f1" strokeWidth={2} dot={{r:2}} /><XAxis dataKey="date" tick={{fontSize:9}} /><YAxis domain={['auto','auto']} tick={{fontSize:9}} /><Tooltip /></LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AddRecordModal({ clientId, clientName, onClose, onSaved }) {
  const [f, setF] = useState({ date:format(new Date(),'yyyy-MM-dd') });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const save = async () => {
    setSaving(true);
    const payload = { ...f, client_id:clientId };
    METRICS.forEach(m => { if (payload[m.key]!==''&&payload[m.key]!==undefined) payload[m.key]=parseFloat(payload[m.key]); else delete payload[m.key]; });
    await db.ClientProgress.create(payload);
    setSaving(false); onSaved(); onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-gray-900">Add Record — {clientName}</h2><button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button></div>
        <div className="mb-4"><label className="text-xs font-medium text-gray-500 uppercase">Date</label><input type="date" value={f.date} onChange={e=>set('date',e.target.value)} className="input-base mt-1" /></div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {METRICS.map(m=><div key={m.key}><label className="text-xs font-medium text-gray-500 uppercase">{m.label}{m.unit?` (${m.unit})`:''}</label><input type="number" step="0.1" value={f[m.key]||''} onChange={e=>set(m.key,e.target.value)} placeholder="—" className="input-base mt-1" /></div>)}
        </div>
        <div className="flex gap-2"><button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button><button onClick={save} disabled={saving} className="btn btn-primary flex-1">{saving?'Saving…':'Save Record'}</button></div>
      </div>
    </div>
  );
}

const SERVICE_LABELS = { personal_training:'Personal Training', personal_training_nutrition:'PT + Nutrition', nutrition_only:'Nutrition Only', group_training:'Group Training' };

export default function ClientProfile() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const clientId = params.get('id');
  const [client, setClient] = useState(null);
  const [tab, setTab] = useState('overview');
  const [progress, setProgress] = useState([]);
  const [plans, setPlans] = useState([]);
  const [nutrition, setNutrition] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [showRecord, setShowRecord] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [activeMetric, setActiveMetric] = useState('weight_kg');

  const load = async () => {
    if (!clientId) return;
    const [c,prog,tp,np,pay,n,appts] = await Promise.all([
      db.Client.get(clientId), db.ClientProgress.filter({client_id:clientId},'date'), db.TrainingPlan.filter({client_id:clientId},'-date'), db.NutritionPlan.filter({client_id:clientId},'-date'), db.Payment.filter({client_id:clientId},'-paid_date'), db.ClientNote.filter({client_id:clientId},'-created_date'), db.Appointment.filter({client_id:clientId},'-date'),
    ]);
    setClient(c); setProgress(prog); setPlans(tp); setNutrition(np); setPayments(pay); setNotes(n); setAppointments(appts);
  };
  useEffect(() => { load(); }, [clientId]);

  if (!client) return <div className="p-8 text-gray-400">Loading...</div>;

  const latest = progress[progress.length - 1];
  const chartData = progress.filter(r=>r[activeMetric]).map(r=>({ date:r.date?format(parseISO(r.date),'MMM d'):'', value:parseFloat(r[activeMetric])||0 }));
  const metric = METRICS.find(m=>m.key===activeMetric);

  const TABS = [
    { key:'overview', label:'Overview', icon:BarChart2 },
    { key:'training', label:'Training', icon:Dumbbell },
    { key:'nutrition', label:'Nutrition', icon:Salad },
    { key:'records', label:'Records', icon:BarChart2 },
    { key:'logistics', label:'Logistics', icon:CreditCard },
    { key:'notes', label:'Notes', icon:StickyNote },
  ];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <button onClick={()=>navigate('/Clients')} className="p-2 hover:bg-gray-100 rounded-xl mt-1"><ArrowLeft className="w-4 h-4 text-gray-600" /></button>
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl" style={{backgroundColor:client.theme_color||'#6366f1'}}>{client.name?.charAt(0)}</div>
            <div>
              <h1 className="page-title">{client.name}</h1>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{SERVICE_LABELS[client.services]||'—'}</span>
                {client.monthly_price && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">€{client.monthly_price}/mo</span>}
                {client.sessions_per_week && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{client.sessions_per_week}×/wk</span>}
              </div>
            </div>
          </div>
        </div>
        <button onClick={()=>setShowRecord(true)} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800"><Plus className="w-4 h-4" /> Add Record</button>
      </div>

      {/* Quick Stats */}
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <WeightHoverWidget progress={progress} />
          {[['body_fat_pct','Body Fat','%','text-red-600'],['muscle_mass_kg','Muscle','kg','text-green-600'],['bmi','BMI','','text-amber-600']].map(([k,lbl,u,tc])=>(
            <div key={k} className="bg-white border border-gray-100 rounded-2xl px-5 py-4">
              <p className="text-xs text-gray-400 uppercase font-medium">{lbl}</p>
              <p className={`text-3xl font-bold mt-1 ${tc}`}>{latest[k]||'—'}<span className="text-base font-normal text-gray-400">{u&&` ${u}`}</span></p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={()=>setTab(key)} className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg whitespace-nowrap transition-colors font-medium ${tab===key?'bg-white text-gray-900 shadow':'text-gray-500 hover:text-gray-700'}`}>
            <Icon className="w-3 h-3" />{label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-5"><h3 className="font-semibold text-gray-900 mb-3">Personal Info</h3><div className="space-y-2 text-sm">{[['Email',client.email],['Phone',client.phone],['Gender',client.gender],['DOB',client.date_of_birth],['Height',client.height?client.height+' cm':null],['Goal',client.goals]].map(([k,v])=>v&&<div key={k} className="flex justify-between"><span className="text-gray-400">{k}</span><span className="text-gray-700 text-right">{v}</span></div>)}</div></div>
            <div className="card p-5"><h3 className="font-semibold text-gray-900 mb-3">Upcoming Sessions</h3>
              {appointments.filter(a=>a.date>=format(new Date(),'yyyy-MM-dd')).slice(0,4).map(a=><div key={a.id} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0"><div className="w-1.5 h-6 rounded-full" style={{backgroundColor:client.theme_color||'#6366f1'}}/><div className="flex-1"><p className="text-sm font-medium text-gray-900">{a.title}</p><p className="text-xs text-gray-400">{a.date} at {a.start_time}</p></div></div>)}
              {!appointments.filter(a=>a.date>=format(new Date(),'yyyy-MM-dd')).length && <p className="text-sm text-gray-400">No upcoming sessions</p>}
            </div>
          </div>
          {notes.filter(n=>n.pinned).length>0&&<div className="bg-yellow-50 rounded-2xl border border-yellow-100 p-4"><p className="text-xs font-medium text-yellow-700 mb-2">📌 Pinned Notes</p>{notes.filter(n=>n.pinned).map(n=><div key={n.id} className="mb-2"><p className="text-sm font-medium text-gray-900">{n.title}</p><p className="text-xs text-gray-600">{n.content}</p></div>)}</div>}
        </div>
      )}

      {/* TRAINING */}
      {tab === 'training' && (
        <div className="space-y-3">
          {plans.map(plan=>(
            <div key={plan.id} className="card p-4">
              <div className="flex items-start justify-between"><div><p className="font-medium text-gray-900">{plan.title}</p><p className="text-xs text-gray-400 mt-0.5">{plan.date} · {plan.exercises?.length||0} exercises{plan.completed?' · ✅ Completed':''}</p>{plan.exercises?.length>0&&<div className="flex flex-wrap gap-1 mt-2">{plan.exercises.slice(0,4).map((ex,i)=><span key={i} className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">{ex.name} {ex.sets}×{ex.reps}</span>)}</div>}</div><button onClick={async()=>{await db.TrainingPlan.delete(plan.id);load();}} className="text-gray-300 hover:text-red-400"><Trash2 className="w-4 h-4" /></button></div>
            </div>
          ))}
          {!plans.length&&<div className="text-center py-12 text-gray-400 text-sm"><Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-30"/><p>No training plans yet</p></div>}
        </div>
      )}

      {/* NUTRITION */}
      {tab === 'nutrition' && (
        <div className="space-y-3">
          {nutrition.map(np=>(
            <div key={np.id} className="card p-4">
              <p className="font-medium text-gray-900">{np.title}</p>
              <div className="flex gap-2 mt-1 flex-wrap">
                {np.protein&&<span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">P: {np.protein}g</span>}
                {np.carbs&&<span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">C: {np.carbs}g</span>}
                {np.fat&&<span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700">F: {np.fat}g</span>}
                {np.calories&&<span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{np.calories} kcal</span>}
              </div>
              <p className="text-xs text-gray-400 mt-1">{np.date} · {np.meal_sections?.length} meal sections</p>
            </div>
          ))}
          {!nutrition.length&&<div className="text-center py-12 text-gray-400 text-sm"><Salad className="w-8 h-8 mx-auto mb-2 opacity-30"/><p>No nutrition plans yet</p></div>}
        </div>
      )}

      {/* RECORDS */}
      {tab === 'records' && (
        <div>
          {progress.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                {METRICS.map(m=><button key={m.key} onClick={()=>setActiveMetric(m.key)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${activeMetric===m.key?'text-white border-transparent':'text-gray-500 border-gray-200'}`} style={activeMetric===m.key?{backgroundColor:m.color}:{}}>{m.label}</button>)}
              </div>
              {chartData.length>0&&<div className="card p-5 mb-4"><p className="text-sm font-medium text-gray-700 mb-3">{metric?.label} Over Time</p><ResponsiveContainer width="100%" height={180}><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/><XAxis dataKey="date" tick={{fontSize:10}}/><YAxis domain={['auto','auto']} tick={{fontSize:10}}/><Tooltip formatter={v=>[`${v} ${metric?.unit}`,metric?.label]}/><Line type="monotone" dataKey="value" stroke={metric?.color||'#6366f1'} strokeWidth={2} dot={{r:3}}/></LineChart></ResponsiveContainer></div>}
            </>
          )}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between"><p className="font-medium text-gray-900 text-sm">All Records ({progress.length})</p><button onClick={()=>setShowRecord(true)} className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-800">+ Add</button></div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-gray-50 text-gray-400"><th className="text-left px-4 py-2">Date</th>{METRICS.slice(0,6).map(m=><th key={m.key} className="text-right px-3 py-2">{m.label}</th>)}<th className="px-3"/></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {[...progress].reverse().map(r=>(
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-700 whitespace-nowrap">{r.date?format(parseISO(r.date),'MMM d, yyyy'):''}</td>
                      {METRICS.slice(0,6).map(m=><td key={m.key} className="px-3 py-2 text-right text-gray-600">{r[m.key]!=null?`${r[m.key]}${m.unit?' '+m.unit:''}`:'—'}</td>)}
                      <td className="px-3 py-2"><button onClick={async()=>{await db.ClientProgress.delete(r.id);load();}} className="text-gray-300 hover:text-red-400"><Trash2 className="w-3 h-3"/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!progress.length&&<div className="text-center py-8 text-gray-400 text-sm">No records yet</div>}
            </div>
          </div>
        </div>
      )}

      {/* LOGISTICS */}
      {tab === 'logistics' && (
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Service Plan</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Service</span><span className="font-medium text-gray-900">{SERVICE_LABELS[client.services]||'—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Sessions / week</span><span className="font-medium text-gray-900">{client.sessions_per_week}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Session duration</span><span className="font-medium text-gray-900">{client.session_duration_hours}h</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Monthly price</span><span className="font-bold text-gray-900">€{client.monthly_price}</span></div>
            </div>
          </div>
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-50"><p className="font-medium text-gray-900 text-sm">Payment History ({payments.length})</p></div>
            {payments.map(p=><div key={p.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-0"><div><p className="text-sm font-medium text-gray-900">{p.description||'Payment'}</p><p className="text-xs text-gray-400">{p.paid_date?format(parseISO(p.paid_date),'MMM d, yyyy'):''} · {p.method}</p>{p.period_to&&<p className="text-xs text-gray-400">Coverage until {format(parseISO(p.period_to),'MMM d, yyyy')}</p>}</div><span className="font-bold text-gray-900">€{p.amount}</span></div>)}
            {!payments.length&&<div className="text-center py-8 text-gray-400 text-sm">No payments recorded</div>}
          </div>
        </div>
      )}

      {/* NOTES */}
      {tab === 'notes' && (
        <div>
          <button onClick={()=>setAddingNote(true)} className="mb-4 flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800"><Plus className="w-4 h-4"/>Add Note</button>
          {addingNote&&(
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-4">
              <input value={noteTitle} onChange={e=>setNoteTitle(e.target.value)} placeholder="Note title..." className="w-full border border-yellow-200 rounded-xl px-3 py-2 text-sm outline-none mb-2 bg-white"/>
              <textarea value={newNote} onChange={e=>setNewNote(e.target.value)} rows={3} placeholder="Note content..." className="w-full border border-yellow-200 rounded-xl px-3 py-2 text-sm outline-none resize-none bg-white"/>
              <div className="flex gap-2 mt-2"><button onClick={()=>setAddingNote(false)} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm">Cancel</button><button onClick={async()=>{if(!noteTitle.trim())return;await db.ClientNote.create({client_id:clientId,title:noteTitle.trim(),content:newNote.trim(),pinned:false,type:'note',category:'general'});setNoteTitle('');setNewNote('');setAddingNote(false);load();}} className="flex-1 bg-gray-900 text-white rounded-xl py-2 text-sm">Save</button></div>
            </div>
          )}
          <div className="space-y-3">
            {notes.map(n=>(
              <div key={n.id} className={`bg-white rounded-2xl border border-gray-100 p-4 ${n.pinned?'border-yellow-200 bg-yellow-50':''}`}>
                <div className="flex items-start justify-between"><div className="flex-1"><div className="flex items-center gap-2"><p className="font-medium text-gray-900 text-sm">{n.title}</p>{n.pinned&&<Pin className="w-3 h-3 text-yellow-500"/>}</div><p className="text-sm text-gray-600 mt-1">{n.content}</p><p className="text-xs text-gray-400 mt-2">{n.category} · {n.created_date?format(parseISO(n.created_date),'MMM d, yyyy'):''}</p></div>
                  <div className="flex gap-1">
                    <button onClick={async()=>{await db.ClientNote.update(n.id,{pinned:!n.pinned});load();}} className="p-1.5 rounded-lg hover:bg-gray-100"><Pin className={`w-3.5 h-3.5 ${n.pinned?'text-yellow-500':'text-gray-300'}`}/></button>
                    <button onClick={async()=>{await db.ClientNote.delete(n.id);load();}} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-gray-300 hover:text-red-400"/></button>
                  </div>
                </div>
              </div>
            ))}
            {!notes.length&&<div className="text-center py-8 text-gray-400 text-sm"><StickyNote className="w-8 h-8 mx-auto mb-2 opacity-30"/><p>No notes yet</p></div>}
          </div>
        </div>
      )}

      {showRecord&&<AddRecordModal clientId={clientId} clientName={client.name} onClose={()=>setShowRecord(false)} onSaved={load}/>}
    </div>
  );
}
