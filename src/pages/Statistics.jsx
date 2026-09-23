import { useState, useEffect, useRef } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { BarChart2, Plus, Trash2, X, Loader2 } from 'lucide-react';
import { db } from '../lib/db';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const METRICS = [
  { key:'weight_kg',     label:'Weight',       unit:'kg',   color:'#6366f1', icon:'⚖️' },
  { key:'body_fat_pct',  label:'Body Fat',     unit:'%',    color:'#ef4444', icon:'🔥' },
  { key:'muscle_mass_kg',label:'Muscle Mass',  unit:'kg',   color:'#10b981', icon:'💪' },
  { key:'body_water_pct',label:'Body Water',   unit:'%',    color:'#3b82f6', icon:'💧' },
  { key:'bone_mass_kg',  label:'Bone Mass',    unit:'kg',   color:'#8b5cf6', icon:'🦴' },
  { key:'bmr',           label:'BMR',          unit:'kcal', color:'#f59e0b', icon:'⚡' },
  { key:'bmi',           label:'BMI',          unit:'',     color:'#ec4899', icon:'📊' },
  { key:'visceral_fat',  label:'Visceral Fat', unit:'',     color:'#f97316', icon:'🫀' },
  { key:'steps',         label:'Steps',        unit:'',     color:'#22c55e', icon:'👟' },
  { key:'sleep_hours',   label:'Sleep',        unit:'h',    color:'#a78bfa', icon:'🌙' },
  { key:'water_liters',  label:'Water',        unit:'L',    color:'#06b6d4', icon:'🥤' },
];

function AddRecordModal({ clientId, clientName, onClose, onSaved }) {
  const [f, setF] = useState({ date:format(new Date(),'yyyy-MM-dd'), weight_kg:'', body_fat_pct:'', muscle_mass_kg:'', body_water_pct:'', bone_mass_kg:'', bmr:'', bmi:'', visceral_fat:'', steps:'', sleep_hours:'', water_liters:'', notes:'' });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const save = async () => {
    setSaving(true);
    const payload = { ...f, client_id:clientId };
    METRICS.forEach(m => { if (payload[m.key] !== '' && payload[m.key] !== undefined) payload[m.key] = parseFloat(payload[m.key]); else delete payload[m.key]; });
    await db.ClientProgress.create(payload);
    setSaving(false); onSaved(); onClose();
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-2xl p-6 w-full" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-foreground text-lg" style={{fontFamily:'var(--font-display)'}}>Add Record — {clientName}</h2>
          <button onClick={onClose} className="btn-ghost btn-icon"><X className="w-5 h-5"/></button>
        </div>
        <div className="mb-4"><label className="section-label">Date</label><input type="date" value={f.date} onChange={e=>set('date',e.target.value)} className="input-base mt-1"/></div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {METRICS.map(m=><div key={m.key}><label className="section-label">{m.icon} {m.label}{m.unit?` (${m.unit})`:''}</label><input type="number" step="0.1" value={f[m.key]} onChange={e=>set(m.key,e.target.value)} placeholder="—" className="input-base mt-1"/></div>)}
        </div>
        <div className="mb-4"><label className="section-label">Notes</label><textarea value={f.notes} onChange={e=>set('notes',e.target.value)} rows={2} className="input-base mt-1 resize-none"/></div>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn btn-primary flex-1">{saving?'Saving…':'Save Record'}</button>
        </div>
      </div>
    </div>
  );
}


// ── Main Statistics Page ──────────────────────────────────────────────────────
export default function Statistics() {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [progress, setProgress] = useState([]);
  const [activeMetric, setActiveMetric] = useState('weight_kg');
  const [showAdd, setShowAdd] = useState(false);

  const loadClients = () => db.Client.list('name').then(setClients);
  const loadProgress = (cid) => db.ClientProgress.filter({ client_id:cid }, 'date').then(setProgress);

  useEffect(() => { loadClients(); }, []);
  useEffect(() => { if (selectedClient) loadProgress(selectedClient); else setProgress([]); }, [selectedClient]);

  const client = clients.find(c => c.id === selectedClient);
  const chartData = progress.filter(r => r[activeMetric]).map(r => ({ date:r.date?format(parseISO(r.date),'MMM d'):'', value:parseFloat(r[activeMetric])||0 }));
  const metric = METRICS.find(m => m.key === activeMetric);
  const latest = progress[progress.length - 1];
  const first = progress[0];
  const delta = latest && first && latest[activeMetric] && first[activeMetric] ? (parseFloat(latest[activeMetric]) - parseFloat(first[activeMetric])).toFixed(1) : null;


  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div><h1 className="page-title">Statistics</h1><p className="page-subtitle">Track and analyze client progress</p></div>
        {selectedClient && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={()=>setShowAdd(true)} className="flex items-center gap-2 border border-border bg-card px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors">
              <Plus className="w-4 h-4"/>Add Record
            </button>
          </div>
        )}
      </div>

      <div className="mb-6">
        <select value={selectedClient} onChange={e=>setSelectedClient(e.target.value)} className="w-56 input-base">
          <option value="">Select a client</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {!selectedClient && <div className="text-center py-20 text-muted-foreground"><BarChart2 className="w-10 h-10 mx-auto mb-2 opacity-30"/><p>Select a client to view statistics</p></div>}
      {selectedClient && progress.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="font-medium mb-2">No records yet</p>
          <div className="flex gap-3 justify-center">
            <button onClick={()=>setShowAdd(true)} className="btn btn-secondary">Add Manually</button>
          </div>
        </div>
      )}

      {selectedClient && progress.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[['weight_kg','Weight','kg','text-indigo-600','bg-indigo-50'],['body_fat_pct','Body Fat','%','text-red-600','bg-red-50'],['muscle_mass_kg','Muscle','kg','text-green-600','bg-green-50'],['bmi','BMI','','text-amber-600','bg-amber-50']].map(([k,lbl,u,tc,bg])=>(
              <div key={k} className="stat-card">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}><span className="text-lg">{METRICS.find(m=>m.key===k)?.icon}</span></div>
                <p className={`stat-card-value ${tc}`}>{latest[k]?latest[k] + (u ? ' '+u : ''):'—'}</p>
                <p className="stat-card-label">{lbl}</p>
                {first[k] && latest[k] && <p className="text-xs text-muted-foreground mt-1">{parseFloat(latest[k])>parseFloat(first[k])?'▲':'▼'} {Math.abs(parseFloat(latest[k])-parseFloat(first[k])).toFixed(1)}{u} vs start</p>}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {METRICS.map(m=>(
              <button key={m.key} onClick={()=>setActiveMetric(m.key)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${activeMetric===m.key?'text-white border-transparent':'text-muted-foreground border-border hover:border-foreground/30'}`} style={activeMetric===m.key?{backgroundColor:m.color,borderColor:m.color}:{}}>
                {m.icon} {m.label}
              </button>
            ))}
          </div>
          {chartData.length > 0 && (
            <div className="card p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">{metric?.label} Progress</h3>
                {delta !== null && <span className={`text-sm font-semibold px-2.5 py-1 rounded-lg ${parseFloat(delta)<0?'bg-green-50 text-green-600':'bg-red-50 text-red-600'}`}>{delta>0?'+':''}{delta} {metric?.unit}</span>}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={metric?.color} stopOpacity={0.15}/><stop offset="95%" stopColor={metric?.color} stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                  <XAxis dataKey="date" tick={{fontSize:11}}/>
                  <YAxis tick={{fontSize:11}} domain={['auto','auto']}/>
                  <Tooltip contentStyle={{backgroundColor:'hsl(var(--card))',border:'1px solid hsl(var(--border))',borderRadius:12,fontSize:12}} formatter={v=>[`${v} ${metric?.unit}`,metric?.label]}/>
                  <Area type="monotone" dataKey="value" stroke={metric?.color||'#6366f1'} fill="url(#cg)" strokeWidth={2.5} dot={{r:3}}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-border"><p className="font-semibold text-foreground text-sm">All Records ({progress.length})</p></div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border text-muted-foreground bg-muted/40"><th className="text-left px-4 py-2.5">Date</th>{METRICS.map(m=><th key={m.key} className="text-right px-3 py-2.5 whitespace-nowrap">{m.icon} {m.label}</th>)}<th className="px-3 py-2.5"/></tr></thead>
                <tbody className="divide-y divide-border">
                  {[...progress].reverse().map(r=>(
                    <tr key={r.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap">{r.date?format(parseISO(r.date),'MMM d, yyyy'):''}</td>
                      {METRICS.map(m=><td key={m.key} className="px-3 py-2.5 text-right text-muted-foreground">{r[m.key]!=null?`${r[m.key]}${m.unit?' '+m.unit:''}`:'—'}</td>)}
                      <td className="px-3 py-2.5"><button onClick={async()=>{await db.ClientProgress.delete(r.id);loadProgress(selectedClient);}} className="text-border hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showAdd && <AddRecordModal clientId={selectedClient} clientName={client?.name} onClose={()=>setShowAdd(false)} onSaved={()=>loadProgress(selectedClient)}/>}
    </div>
  );
}
