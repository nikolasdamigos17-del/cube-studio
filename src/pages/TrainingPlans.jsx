import { useState, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, Trash2, CheckCircle2, Circle, X, Dumbbell, Sparkles, Loader2, ChevronRight, Check, AlertCircle, RotateCcw, Edit2, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, callAI } from '../lib/db';
import { EQUIPMENT, EXERCISE_DB, getExercisesFor, sortBySessionOrder } from '../lib/gymEquipment';

// ── Equipment Label Badge ─────────────────────────────────────────────────────
function EqBadge({ eqKey, small = false }) {
  const eq = EQUIPMENT[eqKey];
  if (!eq) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: small ? '2px 7px' : '3px 9px',
      borderRadius: 20, fontSize: small ? 9 : 10, fontWeight: 700,
      color: eq.color, backgroundColor: eq.bg,
      border: `1px solid ${eq.color}44`,
      letterSpacing: '0.04em', flexShrink: 0,
    }}>
      {small ? eq.short : eq.label}
    </span>
  );
}

// ── Exercise autocomplete (from our DB + custom) ──────────────────────────────
function ExerciseInput({ value, onChange, showBadge = true }) {
  const [q, setQ] = useState(value?.name || '');
  const [sugg, setSugg] = useState([]);
  const [show, setShow] = useState(false);
  const ref = useRef();
  useEffect(() => { const h = e => { if (ref.current && !ref.current.contains(e.target)) setShow(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  useEffect(() => { setQ(value?.name || ''); }, [value?.name]);

  const handle = v => {
    setQ(v);
    if (v.length > 0) {
      const f = EXERCISE_DB.filter(e => e.name.toLowerCase().includes(v.toLowerCase())).slice(0, 8);
      setSugg(f); setShow(true);
    } else setShow(false);
    onChange({ ...value, name: v });
  };
  const pick = ex => { setQ(ex.name); onChange({ ...value, name: ex.name, eq: ex.eq }); setShow(false); };

  return (
    <div className="relative flex-1" ref={ref}>
      <input value={q} onChange={e => handle(e.target.value)} onFocus={() => q && sugg.length > 0 && setShow(true)}
        placeholder="Exercise name" className="input-base text-sm py-2 w-full" />
      {show && (
        <div className="absolute top-full left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-lg mt-1 max-h-56 overflow-y-auto" style={{ boxShadow: 'var(--shadow-lg)' }}>
          {sugg.map(ex => (
            <button key={ex.name} onMouseDown={() => pick(ex)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between gap-2">
              <span className="text-foreground">{ex.name}</span>
              <EqBadge eqKey={ex.eq} small />
            </button>
          ))}
          {!sugg.find(s => s.name.toLowerCase() === q.toLowerCase()) && q.length > 2 && (
            <button onMouseDown={() => { onChange({ ...value, name: q }); setShow(false); }}
              className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-muted italic">
              + Add "{q}" as custom
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Exercise Row (full plan editor) ──────────────────────────────────────────
function ExerciseRow({ ex, onChange, onRemove, showLabels }) {
  const [exp, setExp] = useState(false);
  const set = (k, v) => onChange({ ...ex, [k]: v });
  const updateCount = n => {
    const count = Math.max(1, parseInt(n) || 1);
    const cur = ex.set_details || [];
    onChange({ ...ex, sets: count, set_details: Array.from({ length: count }, (_, i) => cur[i] || { reps: ex.reps || '10', weight_kg: ex.weight_kg || 0, rest_sec: 60 }) });
  };
  const updateSet = (i, k, v) => { const d = [...(ex.set_details || [])]; d[i] = { ...d[i], [k]: v }; onChange({ ...ex, set_details: d }); };
  const details = ex.set_details?.length ? ex.set_details : Array.from({ length: ex.sets || 3 }, () => ({ reps: ex.reps || '10', weight_kg: ex.weight_kg || 0, rest_sec: 60 }));
  const eq = EQUIPMENT[ex.eq];

  return (
    <div className="bg-muted/40 rounded-xl border border-border overflow-hidden">
      <div className="p-2.5">
        <div className="flex items-end gap-2">
          <ExerciseInput value={ex} onChange={updated => onChange({ ...ex, ...updated })} />
          <div className="w-14">
            {showLabels && <label className="section-label px-1 mb-1 block">Sets</label>}
            <input type="number" min="1" max="20" value={ex.sets || 3} onChange={e => updateCount(e.target.value)} className="input-base text-sm py-2 text-center w-full" />
          </div>
          <div className="w-14">
            {showLabels && <label className="section-label px-1 mb-1 block">Reps</label>}
            <input value={ex.reps || ''} onChange={e => set('reps', e.target.value)} placeholder="10" className="input-base text-sm py-2 text-center w-full" />
          </div>
          <div className="w-14">
            {showLabels && <label className="section-label px-1 mb-1 block">kg</label>}
            <input type="number" step="0.5" value={ex.weight_kg || ''} onChange={e => set('weight_kg', parseFloat(e.target.value) || 0)} placeholder="0" className="input-base text-sm py-2 text-center w-full" />
          </div>
          {eq && <EqBadge eqKey={ex.eq} small />}
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={() => setExp(v => !v)} className="btn-ghost btn-icon" style={{ width: 32, height: 32 }}>
              {exp ? '▲' : '▼'}
            </button>
            <button onClick={onRemove} className="btn-ghost btn-icon hover:text-red-500" style={{ width: 32, height: 32 }}><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>
      {exp && (
        <div className="border-t border-border p-3 space-y-3">
          <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
            <label className="flex items-center gap-2">Rest between sets: <input type="number" value={ex.rest_between_sets || 60} onChange={e => set('rest_between_sets', parseInt(e.target.value))} className="w-16 input-base text-xs py-1 ml-1" /> sec</label>
          </div>
          <div>
            <p className="section-label mb-1.5">Per-Set Detail</p>
            <div className="space-y-1.5">
              {details.map((s, si) => (
                <div key={si} className="flex items-center gap-2 text-xs">
                  <span className="w-10 text-muted-foreground flex-shrink-0">Set {si + 1}</span>
                  <span className="text-muted-foreground">Reps</span><input className="w-14 input-base text-xs py-1" value={s.reps || ''} onChange={e => updateSet(si, 'reps', e.target.value)} />
                  <span className="text-muted-foreground">kg</span><input type="number" step="0.5" className="w-14 input-base text-xs py-1" value={s.weight_kg || ''} onChange={e => updateSet(si, 'weight_kg', parseFloat(e.target.value) || 0)} />
                  <span className="text-muted-foreground">Rest</span><input type="number" className="w-14 input-base text-xs py-1" value={s.rest_sec || 60} onChange={e => updateSet(si, 'rest_sec', parseInt(e.target.value))} /><span className="text-muted-foreground">s</span>
                </div>
              ))}
            </div>
          </div>
          <div><label className="section-label">Notes</label><input className="w-full input-base text-xs py-1.5 mt-1" placeholder="e.g. Slow eccentric, pause at bottom" value={ex.notes || ''} onChange={e => set('notes', e.target.value)} /></div>
        </div>
      )}
    </div>
  );
}

// ── AI Training Wizard ────────────────────────────────────────────────────────
const BODY_PARTS = [
  { id:'chest', label:'Chest', emoji:'💪' }, { id:'back', label:'Back', emoji:'🔙' },
  { id:'shoulders', label:'Shoulders', emoji:'🔝' }, { id:'biceps', label:'Biceps', emoji:'💪' },
  { id:'triceps', label:'Triceps', emoji:'💪' }, { id:'legs', label:'Legs', emoji:'🦵' },
  { id:'glutes', label:'Glutes', emoji:'🍑' }, { id:'core', label:'Core', emoji:'⚡' },
  { id:'calves', label:'Calves', emoji:'🦵' }, { id:'fullbody', label:'Full Body', emoji:'🏋️' },
];

function AITrainingWizard({ clients, onSaved, onClose }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [err, setErr] = useState('');
  const [answers, setAnswers] = useState({ clientId: '', clientName: '', bodyParts: [], duration: 60, date: format(new Date(), 'yyyy-MM-dd') });
  const [preview, setPreview] = useState([]); // {id, name, eq, cat, rerolling, keep}
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const STEPS = ['Client', 'Focus', 'Duration', 'Preview Exercises', 'Edit & Save'];

  const setA = (k, v) => setAnswers(p => ({ ...p, [k]: v }));
  const togglePart = val => setAnswers(p => ({ ...p, bodyParts: p.bodyParts.includes(val) ? p.bodyParts.filter(x => x !== val) : [...p.bodyParts, val] }));

  const parseJSON = text => {
    let c = text.trim().replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
    const a1 = c.indexOf('['), z1 = c.lastIndexOf(']');
    const a2 = c.indexOf('{'), z2 = c.lastIndexOf('}');
    if (a1 !== -1 && (a2 === -1 || a1 < a2)) return JSON.parse(c.slice(a1, z1 + 1));
    return JSON.parse(c.slice(a2, z2 + 1));
  };

  // Step 3 → Generate exercise preview from our DB
  const generatePreview = async () => {
    setLoading(true); setErr('');
    setLoadingMsg('Scanning client profile...');
    const client = clients.find(c => c.id === answers.clientId);
    let injuryNote = '';
    if (client) {
      const notes = await db.ClientNote.filter({ client_id: client.id }, '-created_date', 10);
      const injuries = notes.filter(n => n.content?.toLowerCase().includes('injur') || n.category === 'medical').map(n => n.content).join('; ');
      if (injuries) injuryNote = `AVOID exercises that could trigger: ${injuries}`;
    }

    // Get exercises from our DB that match selected muscle groups
    const candidates = getExercisesFor(answers.bodyParts);
    const numEx = Math.max(4, Math.round(answers.duration / 13));

    setLoadingMsg(`Selecting ${numEx} exercises from your equipment...`);

    // Ask AI to pick from our candidate list
    const candidateNames = candidates.map(e => `${e.name} (${e.eq})`).join(', ');
    const prompt = `You are a personal trainer. Pick exactly ${numEx} exercises from this list for a ${answers.duration}-minute ${answers.bodyParts.join(' & ')} session.
Available exercises (name + equipment): ${candidateNames}
${injuryNote}
Return ONLY a JSON array of exercise names (exact spelling from the list above):
["Cable Chest Press","Dumbbell Row","Box Jump"]`;

    const result = await callAI(prompt, 'Return ONLY a valid JSON array of exercise name strings. No markdown.');
    if (!result || result.startsWith('__ERROR__')) { setErr('AI failed. Please try again.'); setLoading(false); return; }

    try {
      const parsed = parseJSON(result);
      if (!Array.isArray(parsed) || !parsed.length) throw new Error('empty');

      // Match back to our DB to get equipment info, then sort by optimal session order
      const matched = parsed.map(name => {
        const dbEx = EXERCISE_DB.find(e => e.name.toLowerCase() === name.toLowerCase().trim()) || { name, eq: 'bodyweight', cat: 'push' };
        return { id: Math.random().toString(36).slice(2), name: dbEx.name, eq: dbEx.eq, cat: dbEx.cat, keep: true, rerolling: false };
      });
      const sorted = sortBySessionOrder(matched);
      setPreview(sorted);
      setStep(3);
    } catch (e) { setErr('Could not parse exercises. Try again.'); }
    setLoading(false);
  };

  // Reroll one exercise
  const reroll = async id => {
    setPreview(p => p.map(ex => ex.id === id ? { ...ex, rerolling: true } : ex));
    const existing = preview.filter(ex => ex.id !== id).map(ex => ex.name).join(', ');
    const candidates = getExercisesFor(answers.bodyParts).filter(e => !existing.toLowerCase().includes(e.name.toLowerCase()));
    const candidateNames = candidates.map(e => `${e.name} (${e.eq})`).slice(0, 30).join(', ');
    const r = await callAI(`Pick ONE different exercise for ${answers.bodyParts.join('/')} from: ${candidateNames}. Return ONLY the exercise name.`, 'Return ONLY the exercise name string.');
    const name = r?.trim().replace(/^["'\-\d\.\s]+|["']+$/g, '').trim() || 'Cable Row';
    const dbEx = EXERCISE_DB.find(e => e.name.toLowerCase() === name.toLowerCase()) || { name, eq: 'bodyweight', cat: 'push' };
    setPreview(p => p.map(ex => ex.id === id ? { ...ex, name: dbEx.name, eq: dbEx.eq, cat: dbEx.cat, rerolling: false } : ex));
  };

  const toggleKeep = id => setPreview(p => p.map(ex => ex.id === id ? { ...ex, keep: !ex.keep } : ex));
  const removeEx = id => setPreview(p => p.filter(ex => ex.id !== id));
  const addBlankEx = () => setPreview(p => [...p, { id: Math.random().toString(36).slice(2), name: '', eq: 'bodyweight', cat: 'push', keep: true, rerolling: false }]);
  const updatePreviewName = (id, name) => {
    const dbEx = EXERCISE_DB.find(e => e.name.toLowerCase() === name.toLowerCase());
    setPreview(p => p.map(ex => ex.id === id ? { ...ex, name, eq: dbEx?.eq || ex.eq, cat: dbEx?.cat || ex.cat } : ex));
  };

  // Re-sort kept exercises into optimal order
  const reSort = () => setPreview(p => {
    const kept = sortBySessionOrder(p.filter(ex => ex.keep));
    const removed = p.filter(ex => !ex.keep);
    return [...kept, ...removed];
  });

  // Step 4 → Build full plan
  const generatePlan = async () => {
    setLoading(true); setErr('');
    setLoadingMsg('Reading client history...');
    const client = clients.find(c => c.id === answers.clientId);
    let ctx = '';
    if (client) {
      const [notes, prevPlans, progress] = await Promise.all([
        db.ClientNote.filter({ client_id: client.id }, '-created_date', 10),
        db.TrainingPlan.filter({ client_id: client.id }, '-date', 5),
        db.ClientProgress.filter({ client_id: client.id }, '-date', 3),
      ]);
      const injuries = notes.filter(n => n.content?.toLowerCase().includes('injur') || n.category === 'medical').map(n => n.content).join('; ');
      const prevWeights = prevPlans.flatMap(p => p.exercises?.map(e => `${e.name}: ${e.sets}×${e.reps} @ ${e.weight_kg}kg`) || []).slice(0, 20).join(', ');
      const latest = progress[0];
      ctx = `Client: ${client.name}, Goal: ${client.goals || 'general fitness'}. ${injuries ? `AVOID: ${injuries}.` : ''} Previous weights: ${prevWeights || 'no history, use conservative weights'}. ${latest ? `Body: ${latest.weight_kg}kg, ${latest.body_fat_pct}% fat` : ''}`;
    } else {
      ctx = `Client: ${answers.clientName}. No history. Use moderate weights.`;
    }

    const keptExercises = preview.filter(ex => ex.keep && ex.name.trim());
    const orderedNames = keptExercises.map(ex => ex.name).join(', ');

    setLoadingMsg('Building plan with optimal session order...');
    const prompt = `Expert personal trainer. Create a complete training plan.
${ctx}
Session: ${answers.duration} min | Date: ${answers.date}
EXERCISES (already in optimal order — keep this order): ${orderedNames}

Return ONLY this JSON:
{"title":"${answers.clientName || client?.name || 'Training'} — ${answers.bodyParts.join(' & ')} Session","notes":"2-3 sentence coaching focus","exercises":[{"name":"Cable Chest Press","sets":4,"reps":"8-10","weight_kg":0,"rest_between_sets":90,"rest_after_exercise":120,"notes":"control the eccentric","set_details":[{"reps":"10","weight_kg":60,"rest_sec":90}]}]}
Rules: use ONLY the exercises listed in the given order. Assign realistic kg based on history. One set_details entry per set.`;

    const result = await callAI(prompt, 'Return ONLY valid JSON. No markdown. Start with {');
    if (!result || result.startsWith('__ERROR__')) { setErr('AI failed. Try again.'); setLoading(false); return; }
    try {
      const parsed = parseJSON(result);
      if (!parsed.exercises?.length) throw new Error();
      // Re-attach equipment info from our DB
      const enriched = parsed.exercises.map(ex => {
        const dbEx = EXERCISE_DB.find(e => e.name.toLowerCase() === ex.name.toLowerCase());
        return { ...ex, eq: dbEx?.eq || keptExercises.find(k => k.name === ex.name)?.eq || 'bodyweight', set_details: ex.set_details || [] };
      });
      setGeneratedPlan({ ...parsed, exercises: enriched });
      setStep(4);
    } catch (e) { setErr('Could not parse plan. Try again.'); }
    setLoading(false);
  };

  const updateExercise = (i, u) => setGeneratedPlan(p => ({ ...p, exercises: p.exercises.map((ex, idx) => idx === i ? u : ex) }));
  const removeExercise = i => setGeneratedPlan(p => ({ ...p, exercises: p.exercises.filter((_, idx) => idx !== i) }));
  const addExercise = () => setGeneratedPlan(p => ({ ...p, exercises: [...p.exercises, { name: '', sets: 3, reps: '10', weight_kg: 0, rest_between_sets: 60, eq: 'bodyweight', set_details: [] }] }));

  const savePlan = async () => {
    const client = clients.find(c => c.id === answers.clientId);
    await db.TrainingPlan.create({ ...generatedPlan, client_id: answers.clientId || '', client_name: answers.clientName || client?.name || '', date: answers.date, completed: false });
    onSaved(); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center"><Sparkles className="w-5 h-5 text-purple-600" /></div>
            <div><h1 className="font-bold text-foreground">AI Training Wizard</h1><p className="text-xs text-muted-foreground">Step {step+1} of {STEPS.length} — {STEPS[step]}</p></div>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon"><X className="w-5 h-5" /></button>
        </div>

        {/* Equipment legend */}
        <div className="flex flex-wrap gap-2 mb-6 p-3 bg-muted/40 rounded-xl">
          <span className="text-xs font-semibold text-muted-foreground mr-1 self-center">Your equipment:</span>
          {Object.entries(EQUIPMENT).map(([k, eq]) => (
            <span key={k} style={{ padding:'3px 9px', borderRadius:20, fontSize:10, fontWeight:700, color:eq.color, backgroundColor:eq.bg, border:`1px solid ${eq.color}44` }}>{eq.label}</span>
          ))}
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mb-8">
          {STEPS.map((_, i) => <div key={i} className="h-1.5 flex-1 rounded-full transition-all" style={{ backgroundColor: i <= step ? '#a855f7' : 'hsl(var(--border))' }}/>)}
        </div>

        {err && <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 rounded-xl p-3 mb-5 flex items-start gap-2 text-sm text-red-700"><AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5"/><div className="flex-1">{err}</div><button onClick={()=>setErr('')} className="text-xs underline">Dismiss</button></div>}

        {/* STEP 0 — Client */}
        {step===0 && (
          <div className="card p-6">
            <h2 className="text-lg font-bold text-foreground mb-5">Who is this plan for?</h2>
            <div className="space-y-3">
              <div><label className="section-label">Select Client</label>
                <select value={answers.clientId} onChange={e=>{const c=clients.find(c=>c.id===e.target.value);setAnswers(p=>({...p,clientId:e.target.value,clientName:c?.name||''}));}} className="input-base mt-1">
                  <option value="">Choose...</option>
                  {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value="custom">Custom name</option>
                </select>
              </div>
              {answers.clientId==='custom'&&<div><label className="section-label">Name</label><input className="input-base mt-1" value={answers.clientName} onChange={e=>setA('clientName',e.target.value)}/></div>}
              <div><label className="section-label">Date</label><input type="date" value={answers.date} onChange={e=>setA('date',e.target.value)} className="input-base mt-1"/></div>
            </div>
            <button disabled={!answers.clientId&&!answers.clientName} onClick={()=>setStep(1)} className="btn btn-primary w-full mt-6 py-3">Continue <ChevronRight className="w-4 h-4"/></button>
          </div>
        )}

        {/* STEP 1 — Focus */}
        {step===1 && (
          <div className="card p-6">
            <h2 className="text-lg font-bold text-foreground mb-5">Training Focus</h2>
            <div className="grid grid-cols-2 gap-2">
              {BODY_PARTS.map(bp=>(
                <button key={bp.id} onClick={()=>togglePart(bp.id)} className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${answers.bodyParts.includes(bp.id)?'border-purple-500 bg-purple-50 dark:bg-purple-950/30':'border-border hover:border-purple-300'}`}>
                  <span className="text-xl">{bp.emoji}</span><span className="font-medium text-foreground text-sm flex-1">{bp.label}</span>
                  {answers.bodyParts.includes(bp.id)&&<Check className="w-4 h-4 text-purple-500"/>}
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={()=>setStep(0)} className="btn btn-secondary flex-1">Back</button>
              <button disabled={!answers.bodyParts.length} onClick={()=>setStep(2)} className="btn btn-primary flex-1 py-3">Continue</button>
            </div>
          </div>
        )}

        {/* STEP 2 — Duration */}
        {step===2 && (
          <div className="card p-6">
            <h2 className="text-lg font-bold text-foreground mb-5">Session Duration</h2>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[30,45,60,75,90,120].map(d=>(
                <button key={d} onClick={()=>setA('duration',d)} className={`py-4 rounded-xl border-2 font-semibold transition-all ${answers.duration===d?'border-purple-500 bg-purple-50 dark:bg-purple-950/30 text-purple-700':'border-border text-muted-foreground hover:border-purple-300'}`}>{d} min</button>
              ))}
            </div>
            <div className="bg-muted rounded-xl p-4 text-sm text-muted-foreground mb-6">
              ~{Math.round(answers.duration/13)} exercises · Selected from your gym equipment · Optimal session order applied
            </div>
            <div className="flex gap-3">
              <button onClick={()=>setStep(1)} className="btn btn-secondary flex-1">Back</button>
              <button onClick={generatePreview} disabled={loading} className="btn btn-primary flex-1 py-3">
                {loading?<><Loader2 className="w-4 h-4 animate-spin"/>{loadingMsg}</>:<>Preview Exercises <Sparkles className="w-4 h-4"/></>}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — Exercise Preview */}
        {step===3 && (
          <div className="card p-6">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h2 className="text-lg font-bold text-foreground">Exercise Preview</h2>
                <p className="text-sm text-muted-foreground mt-1">Remove ✗ or reroll 🔄 any exercise. Add your own. Order is optimized for max performance.</p>
              </div>
              <button onClick={reSort} className="btn btn-sm btn-secondary ml-4 whitespace-nowrap">
                ↕ Re-sort order
              </button>
            </div>

            {/* Equipment legend */}
            <div className="flex flex-wrap gap-1.5 mb-4 mt-3">
              {Object.entries(EQUIPMENT).map(([k,eq])=>(
                <span key={k} style={{padding:'2px 8px',borderRadius:20,fontSize:9,fontWeight:700,color:eq.color,backgroundColor:eq.bg,border:`1px solid ${eq.color}33`}}>{eq.short} = {eq.label}</span>
              ))}
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 mb-4">
              {preview.map((ex, i) => (
                <div key={ex.id} className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all ${ex.keep?'border-border bg-muted/20':'border-red-200 bg-red-50 dark:bg-red-950/20 opacity-50'}`}>
                  {/* Order number */}
                  <span className="text-xs font-bold text-muted-foreground w-5 text-center flex-shrink-0">{i+1}</span>

                  {/* Keep toggle */}
                  <button onClick={()=>toggleKeep(ex.id)} className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${ex.keep?'bg-purple-500 border-purple-500':'border-border bg-background'}`}>
                    {ex.keep&&<Check className="w-3 h-3 text-white"/>}
                  </button>

                  {/* Exercise name input */}
                  <div className="flex-1 min-w-0">
                    <ExerciseInput value={ex} onChange={u=>updatePreviewName(ex.id, u.name)} showBadge={false}/>
                  </div>

                  {/* Equipment badge */}
                  <EqBadge eqKey={ex.eq} small/>

                  {/* Reroll */}
                  {ex.rerolling
                    ? <Loader2 className="w-4 h-4 animate-spin text-purple-500 flex-shrink-0"/>
                    : <button onClick={()=>reroll(ex.id)} className="p-1.5 rounded-lg hover:bg-muted hover:text-purple-500 transition-colors flex-shrink-0" title="Get alternative"><RotateCcw className="w-3.5 h-3.5 text-muted-foreground"/></button>
                  }
                  <button onClick={()=>removeEx(ex.id)} className="p-1.5 rounded-lg hover:bg-muted hover:text-red-500 transition-colors flex-shrink-0"><Trash2 className="w-3.5 h-3.5 text-muted-foreground"/></button>
                </div>
              ))}
            </div>

            <button onClick={addBlankEx} className="w-full border-2 border-dashed border-border rounded-xl py-2.5 text-sm text-muted-foreground hover:border-purple-300 hover:text-foreground flex items-center justify-center gap-2 mb-5 transition-colors">
              <Plus className="w-4 h-4"/>Add Exercise
            </button>
            <div className="flex gap-3">
              <button onClick={()=>setStep(2)} className="btn btn-secondary flex-1">Back</button>
              <button onClick={generatePlan} disabled={loading||!preview.filter(e=>e.keep&&e.name.trim()).length} className="btn btn-primary flex-1 py-3">
                {loading?<><Loader2 className="w-4 h-4 animate-spin"/>{loadingMsg}</>:<>Build Full Plan <Sparkles className="w-4 h-4"/></>}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 — Edit & Save */}
        {step===4 && generatedPlan && (
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">💪</span>
              <div><h2 className="font-bold text-foreground text-lg">Plan Ready</h2><p className="text-sm text-muted-foreground">{generatedPlan.exercises?.length} exercises · {answers.duration} min · Optimized order</p></div>
            </div>
            {generatedPlan.notes&&<div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-100 rounded-xl p-3 mb-4 text-sm text-purple-800 dark:text-purple-300">{generatedPlan.notes}</div>}
            <div className="mb-3"><label className="section-label">Plan Title</label><input value={generatedPlan.title} onChange={e=>setGeneratedPlan(p=>({...p,title:e.target.value}))} className="input-base mt-1"/></div>

            {/* Equipment usage summary */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {[...new Set(generatedPlan.exercises?.map(e=>e.eq)||[])].map(eq=><EqBadge key={eq} eqKey={eq}/>)}
            </div>

            <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
              {generatedPlan.exercises?.map((ex, i)=>(
                <ExerciseRow key={i} ex={ex} idx={i} showLabels={i===0} onChange={u=>updateExercise(i,u)} onRemove={()=>removeExercise(i)}/>
              ))}
            </div>
            <button onClick={addExercise} className="w-full mt-3 border-2 border-dashed border-border rounded-xl py-2.5 text-sm text-muted-foreground hover:border-foreground/30 flex items-center justify-center gap-2 mb-5 transition-colors">
              <Plus className="w-4 h-4"/>Add Exercise
            </button>
            <div className="flex gap-3">
              <button onClick={()=>setStep(3)} className="btn btn-secondary flex-1">← Back</button>
              <button onClick={savePlan} className="btn btn-primary flex-1 py-3">Save Plan ✓</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Manual Plan Modal ─────────────────────────────────────────────────────────
function PlanModal({ clients, plan, onClose, onSaved }) {
  const [f, setF] = useState(plan || { client_id:'', client_name:'', date:format(new Date(),'yyyy-MM-dd'), title:'', exercises:[], notes:'', completed:false });
  const [saving, setSaving] = useState(false);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const hc=id=>{const c=clients.find(c=>c.id===id);setF(p=>({...p,client_id:id,client_name:c?.name||''}));};
  const addEx=()=>set('exercises',[...(f.exercises||[]),{name:'',sets:3,reps:'10',weight_kg:0,rest_between_sets:60,eq:'bodyweight',set_details:[]}]);
  const updEx=(i,u)=>{const e=[...(f.exercises||[])];e[i]=u;set('exercises',e);};
  const remEx=i=>set('exercises',f.exercises.filter((_,idx)=>idx!==i));
  const save=async()=>{setSaving(true);if(plan?.id)await db.TrainingPlan.update(plan.id,f);else await db.TrainingPlan.create(f);setSaving(false);onSaved();onClose();};
  return(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-3xl w-full p-0 overflow-hidden" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-foreground text-lg">Manual Plan</h2>
          <button onClick={onClose} className="btn-ghost btn-icon"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[75vh]">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div><label className="section-label">Client</label><select value={f.client_id} onChange={e=>hc(e.target.value)} className="input-base mt-1"><option value="">Select</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="section-label">Date</label><input type="date" value={f.date} onChange={e=>set('date',e.target.value)} className="input-base mt-1"/></div>
          </div>
          <div className="mb-3"><label className="section-label">Title *</label><input value={f.title} onChange={e=>set('title',e.target.value)} className="input-base mt-1"/></div>
          <div className="mb-4"><label className="section-label">Notes</label><textarea value={f.notes||''} onChange={e=>set('notes',e.target.value)} rows={2} className="input-base mt-1 resize-none"/></div>
          <div className="flex items-center justify-between mb-2"><label className="section-label">Exercises</label><button onClick={addEx} className="btn btn-sm btn-primary"><Plus className="w-3 h-3"/>Add</button></div>
          <div className="space-y-2 max-h-[35vh] overflow-y-auto">
            {(f.exercises||[]).map((ex,i)=><ExerciseRow key={i} ex={ex} idx={i} showLabels={i===0} onChange={u=>updEx(i,u)} onRemove={()=>remEx(i)}/>)}
            {!f.exercises?.length&&<div className="text-center py-6 text-muted-foreground text-sm border-2 border-dashed border-border rounded-xl">Click Add to add exercises</div>}
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
          <button onClick={save} disabled={saving||!f.title} className="btn btn-primary flex-1">{saving?'Saving…':'Save Plan'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TrainingPlans() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [clients, setClients] = useState([]);
  const [filterClient, setFilterClient] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const [p, c] = await Promise.all([db.TrainingPlan.list('-date', 200), db.Client.list('name')]);
    setPlans(p); setClients(c);
  };
  useEffect(() => { load(); }, []);

  const filtered = filterClient ? plans.filter(p => p.client_id === filterClient) : plans;
  const toggle = async p => { await db.TrainingPlan.update(p.id, { completed: !p.completed }); load(); };
  const del = async id => { await db.TrainingPlan.delete(id); load(); };

  if (showWizard) return <AITrainingWizard clients={clients} onSaved={load} onClose={()=>setShowWizard(false)}/>;

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="page-title">Training Plans</h1><p className="page-subtitle">{plans.length} plans</p></div>
        <div className="flex gap-2">
          <button onClick={()=>setShowManual(true)} className="btn btn-secondary"><Plus className="w-4 h-4"/>Manual</button>
          <button onClick={()=>setShowWizard(true)} className="btn px-4 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2" style={{background:'linear-gradient(135deg,#9333ea,#7c3aed)',boxShadow:'0 4px 14px rgba(147,51,234,0.35)'}}>
            <Sparkles className="w-4 h-4"/>AI Wizard
          </button>
        </div>
      </div>

      {/* Client filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={()=>setFilterClient('')} className={`tab-btn px-4 ${!filterClient?'active':''}`}>All</button>
        {clients.map(c=><button key={c.id} onClick={()=>setFilterClient(c.id)} className={`tab-btn px-4 ${filterClient===c.id?'active':''}`}>{c.name}</button>)}
      </div>

      {/* Plans list */}
      <div className="space-y-3">
        {filtered.map(plan=>(
          <div key={plan.id} className={`card p-4 transition-all hover:shadow-md ${plan.completed?'opacity-55':''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3 flex-1 min-w-0">
                <button onClick={()=>toggle(plan)} className="flex-shrink-0 mt-0.5">
                  {plan.completed?<CheckCircle2 className="w-5 h-5 text-green-500"/>:<Circle className="w-5 h-5 text-border"/>}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-foreground ${plan.completed?'line-through':''}`}>{plan.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{plan.client_name||'—'} · {plan.date?format(parseISO(plan.date),'MMM d, yyyy'):''} · {plan.exercises?.length||0} exercises</p>
                  {/* Equipment badges used */}
                  {plan.exercises?.length>0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {[...new Set(plan.exercises.map(e=>e.eq).filter(Boolean))].map(eq=><EqBadge key={eq} eqKey={eq} small/>)}
                    </div>
                  )}
                  {/* Exercise chips */}
                  {plan.exercises?.length>0&&(
                    <div className="flex flex-wrap gap-1 mt-2">
                      {plan.exercises.slice(0,5).map((ex,i)=>(
                        <span key={i} className="badge badge-gray text-xs">{ex.name} {ex.sets}×{ex.reps}{ex.weight_kg?` @ ${ex.weight_kg}kg`:''}</span>
                      ))}
                      {plan.exercises.length>5&&<span className="text-xs text-muted-foreground">+{plan.exercises.length-5} more</span>}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={()=>navigate('/live-training',{state:{plan,clientName:plan.client_name||''}})}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold text-white"
                  style={{background:'linear-gradient(135deg,#059669,#047857)',boxShadow:'0 2px 10px rgba(5,150,105,0.4)'}}>
                  <Play className="w-3.5 h-3.5"/>Start
                </button>
                <button onClick={()=>{setEditing(plan);setShowManual(true);}} className="btn-ghost btn-icon"><Edit2 className="w-4 h-4"/></button>
                <button onClick={()=>del(plan.id)} className="btn-ghost btn-icon hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length===0&&(
          <div className="text-center py-16 text-muted-foreground">
            <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-30"/>
            <p className="font-medium">No training plans yet</p>
            <p className="text-sm mt-1">Use the AI Wizard — it selects exercises from your gym equipment</p>
          </div>
        )}
      </div>

      {(showManual||editing)&&<PlanModal clients={clients} plan={editing} onClose={()=>{setShowManual(false);setEditing(null);}} onSaved={load}/>}
    </div>
  );
}
