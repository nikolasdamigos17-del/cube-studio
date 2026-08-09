import { useState, useEffect, useRef } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { BarChart2, Plus, Trash2, X, Watch, Sparkles, Loader2 } from 'lucide-react';
import SessionPresentation from './SessionPresentation';
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

// ── Withings Import Modal ─────────────────────────────────────────────────────
function WithingsModal({ clientId, clientName, onClose, onSaved }) {
  const [step, setStep] = useState('connect'); // connect | manual | parsing | done
  const [csvText, setCsvText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const parseWithingsCSV = (text) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g,'').toLowerCase());
    const rows = lines.slice(1).map(l => {
      const vals = l.split(',').map(v => v.trim().replace(/"/g,''));
      return Object.fromEntries(headers.map((h,i) => [h, vals[i]]));
    });
    // Map Withings field names → our field names
    const fieldMap = {
      'weight (kg)':'weight_kg','weight':'weight_kg',
      'fat mass (kg)':'fat_mass_kg','fat mass weight (kg)':'fat_mass_kg',
      'fat mass (%)':'body_fat_pct','fat ratio (%)':'body_fat_pct','fat ratio':'body_fat_pct',
      'muscle mass (kg)':'muscle_mass_kg','muscle mass weight (kg)':'muscle_mass_kg',
      'hydration (%)':'body_water_pct','hydration':'body_water_pct',
      'bone mass (kg)':'bone_mass_kg','bone mass weight (kg)':'bone_mass_kg',
      'basal metabolic rate (kcal)':'bmr','basal metabolic rate':'bmr',
      'bmi':'bmi',
      'visceral fat':'visceral_fat','visceral fat index':'visceral_fat',
    };
    // Find date column
    const dateCol = headers.find(h => h.includes('date') || h.includes('time') || h === 'datetime');
    const results = rows.map(row => {
      const record = {};
      if (dateCol && row[dateCol]) {
        const d = row[dateCol].split(' ')[0];
        try { record.date = format(new Date(d), 'yyyy-MM-dd'); } catch { record.date = d; }
      }
      Object.entries(fieldMap).forEach(([wKey, ourKey]) => {
        if (row[wKey] !== undefined && row[wKey] !== '' && !isNaN(parseFloat(row[wKey]))) {
          record[ourKey] = parseFloat(row[wKey]);
        }
      });
      // Calculate body_fat_pct from fat_mass_kg if needed
      if (!record.body_fat_pct && record.fat_mass_kg && record.weight_kg) {
        record.body_fat_pct = parseFloat(((record.fat_mass_kg / record.weight_kg) * 100).toFixed(1));
      }
      // Calculate muscle_mass_kg from body fat if not present
      if (!record.muscle_mass_kg && record.weight_kg && record.body_fat_pct) {
        const fatKg = record.weight_kg * (record.body_fat_pct / 100);
        record.muscle_mass_kg = parseFloat((record.weight_kg - fatKg).toFixed(1));
      }
      if (!record.bmi && record.weight_kg) {
        // Can't calc BMI without height, leave blank
      }
      return record;
    }).filter(r => r.date && Object.keys(r).length > 1);
    return results;
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setCsvText(text);
      setStep('parsing');
      try {
        const data = parseWithingsCSV(text);
        setParsed(data);
        setStep('preview');
      } catch(err) {
        setStep('error');
      }
    };
    reader.readAsText(file);
  };

  const handleManualPaste = () => {
    setStep('parsing');
    try {
      const data = parseWithingsCSV(csvText);
      setParsed(data);
      setStep('preview');
    } catch { setStep('error'); }
  };

  const save = async () => {
    setSaving(true);
    const existing = await db.ClientProgress.filter({ client_id: clientId });
    const existingDates = new Set(existing.map(r => r.date));
    let imported = 0;
    for (const record of parsed) {
      if (!existingDates.has(record.date)) {
        await db.ClientProgress.create({ ...record, client_id: clientId });
        imported++;
      }
    }
    setSaving(false); onSaved(); onClose();
    alert(`✅ Imported ${imported} new records (${parsed.length - imported} already existed)`);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-xl p-0 overflow-hidden w-full" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center"><Watch className="w-5 h-5 text-blue-600"/></div>
            <div><h2 className="font-bold text-foreground">Withings Import</h2><p className="text-xs text-muted-foreground">Body Smart Scale — {clientName}</p></div>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon"><X className="w-4 h-4"/></button>
        </div>

        <div className="p-6">
          {step === 'connect' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-2xl p-4 text-sm text-blue-800 dark:text-blue-300">
                <p className="font-semibold mb-2">📱 How to export from Withings:</p>
                <ol className="space-y-1 list-decimal list-inside text-xs leading-relaxed">
                  <li>Open the <strong>Withings Health Mate</strong> app</li>
                  <li>Go to <strong>Profile → Export Data</strong></li>
                  <li>Select <strong>Weight measurements</strong></li>
                  <li>Choose the date range and export as <strong>CSV</strong></li>
                  <li>Email or AirDrop the CSV file to this computer</li>
                  <li>Import it below</li>
                </ol>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={()=>fileRef.current?.click()} className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-border rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer">
                  <span className="text-2xl">📁</span>
                  <span className="text-sm font-medium text-foreground">Upload CSV File</span>
                  <span className="text-xs text-muted-foreground">from Withings export</span>
                </button>
                <button onClick={()=>setStep('paste')} className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-border rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer">
                  <span className="text-2xl">📋</span>
                  <span className="text-sm font-medium text-foreground">Paste CSV Text</span>
                  <span className="text-xs text-muted-foreground">copy-paste the data</span>
                </button>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile}/>
              <p className="text-center text-xs text-muted-foreground">Supports Withings Health Mate CSV export format</p>
            </div>
          )}

          {step === 'paste' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Paste your Withings CSV export below:</p>
              <textarea value={csvText} onChange={e=>setCsvText(e.target.value)} rows={8} placeholder={'Date,Weight (kg),Fat ratio (%),Muscle mass (kg),...\n2024-01-15,82.3,18.5,65.2,...'} className="input-base resize-none font-mono text-xs w-full"/>
              <div className="flex gap-2">
                <button onClick={()=>setStep('connect')} className="btn btn-secondary flex-1">Back</button>
                <button onClick={handleManualPaste} disabled={!csvText.trim()} className="btn btn-primary flex-1">Parse Data</button>
              </div>
            </div>
          )}

          {step === 'parsing' && (
            <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500"/><p className="mt-2 text-muted-foreground">Parsing Withings data…</p></div>
          )}

          {step === 'error' && (
            <div className="text-center py-8">
              <p className="text-red-500 font-medium">Could not parse this file</p>
              <p className="text-sm text-muted-foreground mt-1">Make sure it's a Withings CSV export</p>
              <button onClick={()=>setStep('connect')} className="btn btn-secondary mt-4">Try Again</button>
            </div>
          )}

          {step === 'preview' && parsed && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-3 text-sm text-green-700 dark:text-green-400">
                ✅ Found <strong>{parsed.length} records</strong> from {parsed[0]?.date} to {parsed[parsed.length-1]?.date}
              </div>
              <div className="max-h-48 overflow-y-auto border border-border rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0"><tr>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Date</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Weight</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Fat%</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Muscle</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">BMR</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {parsed.slice(0,20).map((r,i)=>(
                      <tr key={i} className="hover:bg-muted/40">
                        <td className="px-3 py-1.5 font-medium text-foreground">{r.date}</td>
                        <td className="px-3 py-1.5 text-right">{r.weight_kg||'—'}</td>
                        <td className="px-3 py-1.5 text-right">{r.body_fat_pct||'—'}</td>
                        <td className="px-3 py-1.5 text-right">{r.muscle_mass_kg||'—'}</td>
                        <td className="px-3 py-1.5 text-right">{r.bmr||'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.length > 20 && <p className="text-xs text-muted-foreground text-center">Showing first 20 of {parsed.length}</p>}
              <div className="flex gap-2">
                <button onClick={()=>setStep('connect')} className="btn btn-secondary flex-1">Back</button>
                <button onClick={save} disabled={saving} className="btn btn-primary flex-1">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin"/>Importing…</> : `Import ${parsed.length} Records`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add Record Modal ──────────────────────────────────────────────────────────
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
  const [showWithings, setShowWithings] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

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

  if (showSummary) return <SessionPresentation client={client} allProgress={progress} onBack={()=>setShowSummary(false)}/>;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div><h1 className="page-title">Statistics</h1><p className="page-subtitle">Track and analyze client progress</p></div>
        {selectedClient && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={()=>setShowWithings(true)} className="flex items-center gap-2 border border-border bg-card px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors">
              <Watch className="w-4 h-4 text-blue-500"/>Withings Import
            </button>
            <button onClick={()=>setShowAdd(true)} className="flex items-center gap-2 border border-border bg-card px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors">
              <Plus className="w-4 h-4"/>Add Record
            </button>
            {progress.length > 0 && (
              <button onClick={()=>setShowSummary(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',boxShadow:'0 4px 14px rgba(99,102,241,0.4)'}}>
                <Sparkles className="w-4 h-4"/>Session Summary
              </button>
            )}
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
          <p className="text-sm mb-4">Import from Withings or add manually</p>
          <div className="flex gap-3 justify-center">
            <button onClick={()=>setShowWithings(true)} className="flex items-center gap-2 btn btn-primary"><Watch className="w-4 h-4"/>Import from Withings</button>
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
      {showWithings && <WithingsModal clientId={selectedClient} clientName={client?.name} onClose={()=>setShowWithings(false)} onSaved={()=>loadProgress(selectedClient)}/>}
    </div>
  );
}
