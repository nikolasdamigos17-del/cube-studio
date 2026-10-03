import { useState, useEffect, useRef } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { BarChart2, Plus, Trash2, X, Loader2, Dumbbell, TrendingUp } from 'lucide-react';
import { db } from '../lib/db';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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


// ── Στατιστικά προπόνησης — από τα πραγματικά Live Training sessions ──────────
const TR_TYPES = {
  upper:     { label:'Upper Body', emoji:'💪', color:'#818cf8' },
  lower:     { label:'Lower Body', emoji:'🦵', color:'#34d399' },
  legs:      { label:'Legs',       emoji:'🦿', color:'#60a5fa' },
  glutes:    { label:'Glutes',     emoji:'🍑', color:'#f472b6' },
  full_body: { label:'Full Body',  emoji:'🏋️', color:'#f59e0b' },
  other:     { label:'Custom',     emoji:'📝', color:'#9ca3af' },
};
const trTypeOf = (p) => p.session_type
  || (/(glute|γλουτ)/i.test(p.title||'') ? 'glutes'
    : /(upper|άνω|πάνω κορμ|push|pull|στήθος|πλάτη|ώμ|χέρι|δικέφαλ|τρικέφαλ)/i.test(p.title||'') ? 'upper'
    : /(leg|πόδι|τετρακέφαλ|μηριαί|γάμπ|quad|hamstring|calf|calves)/i.test(p.title||'') ? 'legs'
    : /(lower|κάτω)/i.test(p.title||'') ? 'lower'
    : /(full|ολόσωμ)/i.test(p.title||'') ? 'full_body' : 'other');
const parseReps = (r) => { const m = String(r ?? '').match(/\d+/g); if (!m) return 0; return m.length > 1 ? (parseInt(m[0]) + parseInt(m[1])) / 2 : parseInt(m[0]); };
const planVolume = (p) => {
  if (p.session_results?.length) {
    return p.session_results.reduce((sum, ex) => sum + (ex.sets || []).reduce((a, st) => a + (parseInt(st.reps_done) || 0) * (parseFloat(st.weight_kg) || 0), 0), 0);
  }
  return (p.exercises || []).reduce((sum, ex) => {
    if (ex.set_details?.length) return sum + ex.set_details.reduce((a, r) => a + parseReps(r.reps) * (parseFloat(r.weight_kg) || 0), 0);
    return sum + (parseInt(ex.sets) || 3) * parseReps(ex.reps) * (parseFloat(ex.weight_kg) || 0);
  }, 0);
};
const fmtKg = (v) => v >= 1000 ? `${(v / 1000).toFixed(1).replace('.', ',')} τόνοι` : `${Math.round(v)} kg`;

function TrainingStats({ plans }) {
  const done = plans
    .filter(p => p.completed || p.completed_date)
    .map(p => ({ ...p, _when: (p.completed_date || p.date || '').slice(0, 10), _type: trTypeOf(p), _vol: planVolume(p) }))
    .filter(p => p._when)
    .sort((a, b) => a._when.localeCompare(b._when));

  if (!done.length) return (
    <div className="text-center py-20 text-muted-foreground">
      <Dumbbell className="w-10 h-10 mx-auto mb-2 opacity-30"/>
      <p className="font-medium mb-1">Καμία ολοκληρωμένη προπόνηση ακόμα</p>
      <p className="text-sm">Τα στατιστικά γεμίζουν αυτόματα με κάθε Live Training που ολοκληρώνεται.</p>
    </div>
  );

  const now = new Date();
  const monthKey = now.toISOString().slice(0, 7);
  const thisMonth = done.filter(p => p._when.startsWith(monthKey)).length;
  const totalVol = done.reduce((a, p) => a + p._vol, 0);
  const avgVol = totalVol / done.length;
  const best = done.reduce((m, p) => p._vol > m._vol ? p : m, done[0]);

  /* κατανομή τύπων */
  const byType = {};
  done.forEach(p => { byType[p._type] = (byType[p._type] || 0) + 1; });
  const typeRows = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  const favType = TR_TYPES[typeRows[0]?.[0]] || TR_TYPES.other;

  /* προπονήσεις ανά εβδομάδα — τελευταίες 12 */
  const weekStart = (d) => { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); return x.toISOString().slice(0, 10); };
  const weeks = [];
  for (let i = 11; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i * 7); weeks.push(weekStart(d)); }
  const perWeek = weeks.map(w => ({ w, label: format(parseISO(w), 'd/M'), sessions: done.filter(p => weekStart(p._when) === w).length }));

  /* όγκος ανά προπόνηση */
  const volData = done.slice(-30).map(p => ({ date: format(parseISO(p._when), 'd MMM'), vol: Math.round(p._vol), type: TR_TYPES[p._type]?.label }));

  /* ασκήσεις: συχνότητα + κιλά (πρώτη → τελευταία εμφάνιση) */
  const exMap = {};
  done.forEach(p => {
    const seen = new Set();
    const list = p.session_results?.length
      ? p.session_results.map(ex => ({ name: ex.name, w: Math.max(0, ...(ex.sets || []).filter(st => (parseInt(st.reps_done) || 0) > 0).map(st => parseFloat(st.weight_kg) || 0)) }))
      : (p.exercises || []).map(ex => ({ name: ex.name, w: parseFloat(ex.weight_kg) || 0 }));
    list.forEach(({ name, w }) => {
      if (!name || seen.has(name)) return; seen.add(name);
      (exMap[name] ||= { count: 0, series: [] });
      exMap[name].count += 1;
      if (w > 0) exMap[name].series.push(w);
    });
  });
  const topEx = Object.entries(exMap).sort((a, b) => b[1].count - a[1].count).slice(0, 8);
  const maxCount = topEx[0]?.[1].count || 1;
  const progressEx = Object.entries(exMap)
    .filter(([, v]) => v.series.length >= 2)
    .sort((a, b) => b[1].count - a[1].count).slice(0, 6)
    .map(([name, v]) => ({ name, from: v.series[0], to: v.series[v.series.length - 1], delta: v.series[v.series.length - 1] - v.series[0] }));

  const PINK = '#e0457b';
  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card"><div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center mb-3"><span className="text-lg">🏋️</span></div>
          <p className="stat-card-value text-pink-600">{done.length}</p><p className="stat-card-label">Προπονήσεις σύνολο</p>
          <p className="text-xs text-muted-foreground mt-1">{thisMonth} αυτόν τον μήνα</p></div>
        <div className="stat-card"><div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center mb-3"><span className="text-lg">⚖️</span></div>
          <p className="stat-card-value text-violet-600">{fmtKg(avgVol)}</p><p className="stat-card-label">Μ.Ο. όγκος / προπόνηση</p>
          <p className="text-xs text-muted-foreground mt-1">σύνολο {fmtKg(totalVol)}</p></div>
        <div className="stat-card"><div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3"><span className="text-lg">🔥</span></div>
          <p className="stat-card-value text-amber-600">{fmtKg(best._vol)}</p><p className="stat-card-label">Καλύτερη προπόνηση</p>
          <p className="text-xs text-muted-foreground mt-1">{best._when ? format(parseISO(best._when), 'd MMM yyyy') : ''}</p></div>
        <div className="stat-card"><div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-3"><span className="text-lg">{favType.emoji}</span></div>
          <p className="stat-card-value text-indigo-600">{favType.label}</p><p className="stat-card-label">Αγαπημένος τύπος</p>
          <p className="text-xs text-muted-foreground mt-1">{typeRows[0]?.[1] || 0} φορές</p></div>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-6">
        {/* Συνέπεια ανά εβδομάδα */}
        <div className="card p-5">
          <h3 className="font-semibold text-foreground mb-4">Προπονήσεις ανά εβδομάδα <span className="text-xs text-muted-foreground font-normal">· 12 εβδομάδες</span></h3>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={perWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/>
              <XAxis dataKey="label" tick={{ fontSize: 10.5 }}/>
              <YAxis tick={{ fontSize: 10.5 }} allowDecimals={false}/>
              <Tooltip contentStyle={{ backgroundColor:'hsl(var(--card))', border:'1px solid hsl(var(--border))', borderRadius:12, fontSize:12 }} formatter={v => [`${v}`, 'προπονήσεις']}/>
              <Bar dataKey="sessions" radius={[6, 6, 0, 0]}>
                {perWeek.map((e, i) => <Cell key={i} fill={e.sessions ? PINK : 'rgba(224,69,123,0.15)'}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Κατανομή τύπων */}
        <div className="card p-5">
          <h3 className="font-semibold text-foreground mb-4">Τι προπονήσεις κάνει</h3>
          <div className="space-y-3">
            {typeRows.map(([k, n]) => { const t = TR_TYPES[k] || TR_TYPES.other; const pct = Math.round(n / done.length * 100); return (
              <div key={k}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-foreground">{t.emoji} {t.label}</span>
                  <span className="text-muted-foreground text-xs font-semibold">{n} · {pct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full" style={{ width:`${pct}%`, background:t.color }}/></div>
              </div>
            ); })}
          </div>
        </div>
      </div>

      {/* Όγκος ανά προπόνηση */}
      <div className="card p-5 mb-6">
        <h3 className="font-semibold text-foreground mb-4">Κιλά που σηκώνει ανά προπόνηση <span className="text-xs text-muted-foreground font-normal">· συνολικός όγκος (σετ × επαναλήψεις × κιλά)</span></h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={volData}>
            <defs><linearGradient id="tvol" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={PINK} stopOpacity={0.18}/><stop offset="95%" stopColor={PINK} stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
            <XAxis dataKey="date" tick={{ fontSize: 10.5 }}/>
            <YAxis tick={{ fontSize: 10.5 }}/>
            <Tooltip contentStyle={{ backgroundColor:'hsl(var(--card))', border:'1px solid hsl(var(--border))', borderRadius:12, fontSize:12 }} formatter={(v, n, pr) => [`${v} kg`, pr?.payload?.type || 'όγκος']}/>
            <Area type="monotone" dataKey="vol" stroke={PINK} fill="url(#tvol)" strokeWidth={2.5} dot={{ r: 3 }}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-6">
        {/* Top ασκήσεις */}
        <div className="card p-5">
          <h3 className="font-semibold text-foreground mb-4">Οι ασκήσεις του <span className="text-xs text-muted-foreground font-normal">· πόσες προπονήσεις περιλαμβάνουν την καθεμία</span></h3>
          <div className="space-y-2.5">
            {topEx.map(([name, v]) => { const last = v.series[v.series.length - 1]; return (
              <div key={name} className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground w-44 truncate" title={name}>{name}</span>
                <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full" style={{ width:`${v.count / maxCount * 100}%`, background:'linear-gradient(90deg,#e0457b,#8b5cf6)' }}/></div>
                <span className="text-xs text-muted-foreground font-semibold w-16 text-right">{v.count}× {last ? `· ${last}kg` : ''}</span>
              </div>
            ); })}
          </div>
        </div>
        {/* Πρόοδος κιλών */}
        <div className="card p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-pink-500"/> Πρόοδος κιλών <span className="text-xs text-muted-foreground font-normal">· πρώτη → τελευταία φορά</span></h3>
          {!progressEx.length && <p className="text-sm text-muted-foreground">Χρειάζονται τουλάχιστον 2 προπονήσεις με την ίδια άσκηση με κιλά.</p>}
          <div className="space-y-2.5">
            {progressEx.map(e => (
              <div key={e.name} className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground flex-1 truncate" title={e.name}>{e.name}</span>
                <span className="text-xs text-muted-foreground font-semibold whitespace-nowrap">{e.from}kg → <b className="text-foreground">{e.to}kg</b></span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-lg whitespace-nowrap ${e.delta > 0 ? 'bg-green-50 text-green-600' : e.delta < 0 ? 'bg-red-50 text-red-500' : 'bg-muted text-muted-foreground'}`}>
                  {e.delta > 0 ? `▲ +${+e.delta.toFixed(1)}` : e.delta < 0 ? `▼ ${+e.delta.toFixed(1)}` : '='} kg
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ιστορικό sessions */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-border"><p className="font-semibold text-foreground text-sm">Ιστορικό προπονήσεων ({done.length})</p></div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border text-muted-foreground bg-muted/40">
              <th className="text-left px-4 py-2.5">Ημ/νία</th><th className="text-left px-3 py-2.5">Προπόνηση</th><th className="text-left px-3 py-2.5">Τύπος</th>
              <th className="text-right px-3 py-2.5">Ασκήσεις</th><th className="text-right px-3 py-2.5">Σετ</th><th className="text-right px-4 py-2.5">Όγκος</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {[...done].reverse().map(p => { const t = TR_TYPES[p._type] || TR_TYPES.other;
                const sets = p.session_results?.length ? p.session_results.reduce((a, ex) => a + (ex.sets_done ?? (ex.sets || []).length), 0) : (p.exercises || []).reduce((a, ex) => a + (parseInt(ex.sets) || 3), 0);
                return (
                <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap">{format(parseISO(p._when), 'd MMM yyyy')}</td>
                  <td className="px-3 py-2.5 text-foreground truncate max-w-[220px]">{p.title || '—'}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap"><span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background:`${t.color}22`, color:t.color }}>{t.emoji} {t.label}</span></td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{(p.session_results || p.exercises || []).length}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{sets}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-foreground whitespace-nowrap">{fmtKg(p._vol)}</td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ── Main Statistics Page ──────────────────────────────────────────────────────
export default function Statistics() {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [progress, setProgress] = useState([]);
  const [activeMetric, setActiveMetric] = useState('weight_kg');
  const [showAdd, setShowAdd] = useState(false);
  const [tplans, setTplans] = useState([]);
  const [mode, setMode] = useState('training');   // training | body

  const loadClients = () => db.Client.list('name').then(setClients);
  const loadProgress = (cid) => db.ClientProgress.filter({ client_id:cid }, 'date').then(setProgress);
  const loadTplans = (cid) => db.TrainingPlan.filter({ client_id:cid }).then(r => setTplans(r || [])).catch(() => setTplans([]));

  useEffect(() => { loadClients(); }, []);
  useEffect(() => {
    if (selectedClient) { loadProgress(selectedClient); loadTplans(selectedClient); }
    else { setProgress([]); setTplans([]); }
  }, [selectedClient]);

  const client = clients.find(c => c.id === selectedClient);
  const hasNutri = ['nutrition_only', 'personal_training_nutrition', 'group_training_nutrition'].includes(client?.services);
  const hasTraining = !!client && client.services !== 'nutrition_only';
  useEffect(() => { setMode(hasTraining ? 'training' : 'body'); }, [selectedClient, hasTraining]);
  const view = hasTraining && hasNutri ? mode : hasTraining ? 'training' : 'body';
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
          <div className="flex gap-2 flex-wrap items-center">
            {hasTraining && hasNutri && (
              <div className="flex rounded-xl border border-border bg-card p-1">
                <button onClick={()=>setMode('training')} className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={view==='training' ? { background:'linear-gradient(135deg,#e0457b,#8b5cf6)', color:'#fff' } : { color:'hsl(var(--muted-foreground))' }}>
                  🏋️ Προπόνηση
                </button>
                <button onClick={()=>setMode('body')} className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={view==='body' ? { background:'linear-gradient(135deg,#34d399,#059669)', color:'#fff' } : { color:'hsl(var(--muted-foreground))' }}>
                  🥗 Διατροφή
                </button>
              </div>
            )}
            {view === 'body' && (
              <button onClick={()=>setShowAdd(true)} className="flex items-center gap-2 border border-border bg-card px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors">
                <Plus className="w-4 h-4"/>Add Record
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
      {selectedClient && view === 'training' && <TrainingStats plans={tplans}/>}

      {selectedClient && view === 'body' && progress.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="font-medium mb-2">No records yet</p>
          <div className="flex gap-3 justify-center">
            <button onClick={()=>setShowAdd(true)} className="btn btn-secondary">Add Manually</button>
          </div>
        </div>
      )}

      {selectedClient && view === 'body' && progress.length > 0 && (
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
