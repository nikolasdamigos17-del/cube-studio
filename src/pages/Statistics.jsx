import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { BarChart2, Plus, Trash2, X } from 'lucide-react';
import { db } from '../lib/db';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const METRICS = [
  { key:'weight_kg', label:'Weight', unit:'kg', color:'#6366f1' },
  { key:'body_fat_pct', label:'Body Fat', unit:'%', color:'#ef4444' },
  { key:'muscle_mass_kg', label:'Muscle Mass', unit:'kg', color:'#10b981' },
  { key:'body_water_pct', label:'Body Water', unit:'%', color:'#3b82f6' },
  { key:'bone_mass_kg', label:'Bone Mass', unit:'kg', color:'#8b5cf6' },
  { key:'bmr', label:'BMR', unit:'kcal', color:'#f59e0b' },
  { key:'bmi', label:'BMI', unit:'', color:'#ec4899' },
  { key:'visceral_fat', label:'Visceral Fat', unit:'', color:'#f97316' },
  { key:'steps', label:'Steps', unit:'', color:'#22c55e' },
  { key:'sleep_hours', label:'Sleep', unit:'h', color:'#a78bfa' },
  { key:'water_liters', label:'Water', unit:'L', color:'#06b6d4' },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-gray-900">Add Record — {clientName}</h2><button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button></div>
        <div className="mb-4"><label className="text-xs font-medium text-gray-500 uppercase">Date</label><input type="date" value={f.date} onChange={e=>set('date',e.target.value)} className="input-base mt-1" /></div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {METRICS.map(m => <div key={m.key}><label className="text-xs font-medium text-gray-500 uppercase">{m.label}{m.unit?` (${m.unit})`:''}</label><input type="number" step="0.1" value={f[m.key]} onChange={e=>set(m.key,e.target.value)} placeholder="—" className="input-base mt-1" /></div>)}
        </div>
        <div className="mb-4"><label className="text-xs font-medium text-gray-500 uppercase">Notes</label><textarea value={f.notes} onChange={e=>set('notes',e.target.value)} rows={2} className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none resize-none" /></div>
        <div className="flex gap-2"><button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button><button onClick={save} disabled={saving} className="btn btn-primary flex-1">{saving?'Saving…':'Save Record'}</button></div>
      </div>
    </div>
  );
}

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
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="page-title">Statistics</h1><p className="page-subtitle">Track and analyze client progress</p></div>
        {selectedClient && <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800"><Plus className="w-4 h-4" /> Add Record</button>}
      </div>

      <div className="mb-6">
        <select value={selectedClient} onChange={e=>setSelectedClient(e.target.value)} className="w-56 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400">
          <option value="">Select a client</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {!selectedClient && <div className="text-center py-20 text-gray-400"><BarChart2 className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Select a client to view statistics</p></div>}

      {selectedClient && progress.length === 0 && <div className="text-center py-20 text-gray-400"><p>No records yet. Add the first record!</p></div>}

      {selectedClient && progress.length > 0 && (
        <>
          {/* Latest stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[['weight_kg','Weight','kg','text-indigo-600','bg-indigo-50'],['body_fat_pct','Body Fat','%','text-red-600','bg-red-50'],['muscle_mass_kg','Muscle','kg','text-green-600','bg-green-50'],['bmi','BMI','','text-amber-600','bg-amber-50']].map(([k,lbl,u,tc,bg]) => (
              <div key={k} className="card p-4">
                <p className="text-xs text-gray-400 uppercase font-medium mb-1">{lbl}</p>
                <p className={`text-2xl font-bold ${tc}`}>{latest[k]?`${latest[k]}${u&&' '+u}`:'—'}</p>
                {first[k] && latest[k] && <p className="text-xs text-gray-400 mt-1">{parseFloat(latest[k])>parseFloat(first[k])?'▲':'▼'} {Math.abs(parseFloat(latest[k])-parseFloat(first[k])).toFixed(1)}{u} vs start</p>}
              </div>
            ))}
          </div>

          {/* Metric selector */}
          <div className="flex flex-wrap gap-2 mb-4">
            {METRICS.map(m => (
              <button key={m.key} onClick={() => setActiveMetric(m.key)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${activeMetric===m.key?'text-white border-transparent':'text-gray-500 border-gray-200 hover:border-gray-300'}`} style={activeMetric===m.key?{backgroundColor:m.color,borderColor:m.color}:{}}>{m.label}</button>
            ))}
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="card p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">{metric?.label} Progress</h3>
                {delta !== null && <span className={`text-sm font-semibold px-2 py-1 rounded-lg ${parseFloat(delta)<0?'bg-green-50 text-green-600':'bg-red-50 text-red-600'}`}>{delta>0?'+':''}{delta} {metric?.unit}</span>}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{fontSize:11}} />
                  <YAxis tick={{fontSize:11}} domain={['auto','auto']} />
                  <Tooltip formatter={v=>[`${v} ${metric?.unit}`,metric?.label]} />
                  <Line type="monotone" dataKey="value" stroke={metric?.color||'#6366f1'} strokeWidth={2} dot={{r:3}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Records table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-50"><p className="font-medium text-gray-900 text-sm">All Records ({progress.length})</p></div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-gray-50 text-gray-400"><th className="text-left px-4 py-2">Date</th>{METRICS.map(m=><th key={m.key} className="text-right px-3 py-2 whitespace-nowrap">{m.label}</th>)}<th className="px-3 py-2" /></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {[...progress].reverse().map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-700 whitespace-nowrap">{r.date?format(parseISO(r.date),'MMM d, yyyy'):''}</td>
                      {METRICS.map(m=><td key={m.key} className="px-3 py-2 text-right text-gray-600">{r[m.key]!=null?`${r[m.key]}${m.unit?' '+m.unit:''}`:'—'}</td>)}
                      <td className="px-3 py-2"><button onClick={async()=>{await db.ClientProgress.delete(r.id);loadProgress(selectedClient);}} className="text-gray-300 hover:text-red-400"><Trash2 className="w-3 h-3" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showAdd && <AddRecordModal clientId={selectedClient} clientName={client?.name} onClose={() => setShowAdd(false)} onSaved={() => loadProgress(selectedClient)} />}
    </div>
  );
}
