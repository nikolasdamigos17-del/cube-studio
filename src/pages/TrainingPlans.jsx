import { useState, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, Trash2, CheckCircle2, Circle, ChevronDown, ChevronUp, X, Dumbbell, Sparkles, Loader2, ChevronRight, Check, AlertCircle, RotateCcw } from 'lucide-react';
import { db, callAI } from '../lib/db';

const EXERCISES = ['Bench Press','Incline Bench Press','Decline Bench Press','Dumbbell Fly','Cable Fly','Push-Up','Chest Dip','Pull-Up','Chin-Up','Lat Pulldown','Seated Cable Row','Bent-Over Row','T-Bar Row','Face Pull','Shrug','Overhead Press','Dumbbell Shoulder Press','Lateral Raise','Front Raise','Arnold Press','Barbell Squat','Front Squat','Leg Press','Hack Squat','Lunge','Bulgarian Split Squat','Step-Up','Leg Extension','Leg Curl','Calf Raise','Deadlift','Romanian Deadlift','Sumo Deadlift','Rack Pull','Good Morning','Hyperextension','Bicep Curl','Hammer Curl','Preacher Curl','Concentration Curl','Cable Curl','Tricep Pushdown','Skull Crusher','Close-Grip Bench Press','Overhead Tricep Extension','Dips','Kickback','Plank','Side Plank','Crunch','Russian Twist','Leg Raise','Mountain Climber','Ab Wheel Rollout','Box Jump','Burpee','Kettlebell Swing','Battle Ropes','Glute Bridge','Hip Thrust','Abductor Machine','Adductor Machine','Donkey Kick','Fire Hydrant','Cable Crunch','Seated Leg Curl','Lying Leg Curl','Smith Machine Squat','Hack Squat Machine','Chest Supported Row','Meadows Row','Single Arm Row'];

const BODY_PARTS = [
  { id:'chest', label:'Chest', emoji:'💪' },
  { id:'back', label:'Back', emoji:'🔙' },
  { id:'shoulders', label:'Shoulders', emoji:'🔝' },
  { id:'biceps', label:'Biceps', emoji:'💪' },
  { id:'triceps', label:'Triceps', emoji:'💪' },
  { id:'legs', label:'Legs', emoji:'🦵' },
  { id:'glutes', label:'Glutes', emoji:'🍑' },
  { id:'core', label:'Core / Abs', emoji:'⚡' },
  { id:'calves', label:'Calves', emoji:'🦵' },
  { id:'fullbody', label:'Full Body', emoji:'🏋️' },
  { id:'upperbody', label:'Upper Body', emoji:'👆' },
  { id:'lowerbody', label:'Lower Body', emoji:'👇' },
];

// ─── Exercise Input with autocomplete ────────────────────────────────────────
function ExerciseInput({ value, onChange }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [show, setShow] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const handle = (v) => {
    setQuery(v); onChange(v);
    if (v.length > 0) { const f = EXERCISES.filter(e => e.toLowerCase().includes(v.toLowerCase())).slice(0, 8); setSuggestions(f); setShow(f.length > 0); }
    else setShow(false);
  };
  const pick = (n) => { setQuery(n); onChange(n); setShow(false); };
  return (
    <div className="relative" ref={ref}>
      <input value={query} onChange={e => handle(e.target.value)} onFocus={() => query && suggestions.length > 0 && setShow(true)} placeholder="Exercise name" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400" />
      {show && <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">{suggestions.map(s => <button key={s} onMouseDown={() => pick(s)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">{s}</button>)}</div>}
    </div>
  );
}

// ─── Exercise Row (editable) ─────────────────────────────────────────────────
function ExerciseRow({ ex, onChange, onRemove, idx }) {
  const [expanded, setExpanded] = useState(true);
  const set = (k, v) => onChange({ ...ex, [k]: v });
  const setCount = (n) => {
    const count = Math.max(1, parseInt(n) || 1);
    const current = ex.set_details || [];
    const updated = Array.from({ length: count }, (_, i) => current[i] || { reps: ex.reps || '10', weight_kg: ex.weight_kg || 0, rest_sec: ex.rest_between_sets || 60 });
    onChange({ ...ex, sets: count, set_details: updated });
  };
  const updateSet = (i, k, v) => { const d = [...(ex.set_details || [])]; d[i] = { ...d[i], [k]: v }; onChange({ ...ex, set_details: d }); };
  const setDetails = ex.set_details?.length ? ex.set_details : Array.from({ length: ex.sets || 3 }, () => ({ reps: ex.reps || '10', weight_kg: ex.weight_kg || 0, rest_sec: ex.rest_between_sets || 60 }));

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
      <div className="p-2.5">
        <div className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-5">
            {idx === 0 && <label className="text-xs text-gray-400 px-1 mb-1 block">Exercise</label>}
            <ExerciseInput value={ex.name} onChange={v => set('name', v)} />
          </div>
          <div className="col-span-2">
            {idx === 0 && <label className="text-xs text-gray-400 px-1 mb-1 block">Sets</label>}
            <input type="number" min="1" max="20" value={ex.sets || 3} onChange={e => setCount(e.target.value)} className="w-full border border-gray-200 rounded-xl px-2 py-2 text-sm outline-none h-9 text-center" />
          </div>
          <div className="col-span-2">
            {idx === 0 && <label className="text-xs text-gray-400 px-1 mb-1 block">Reps</label>}
            <input value={ex.reps || ''} onChange={e => set('reps', e.target.value)} placeholder="10" className="w-full border border-gray-200 rounded-xl px-2 py-2 text-sm outline-none h-9 text-center" />
          </div>
          <div className="col-span-2">
            {idx === 0 && <label className="text-xs text-gray-400 px-1 mb-1 block">kg</label>}
            <input type="number" step="0.5" value={ex.weight_kg || ''} onChange={e => set('weight_kg', parseFloat(e.target.value) || 0)} placeholder="0" className="w-full border border-gray-200 rounded-xl px-2 py-2 text-sm outline-none h-9 text-center" />
          </div>
          <div className="col-span-1 flex gap-1 items-end pb-0.5">
            <button onClick={() => setExpanded(v => !v)} className="p-1.5 rounded-lg hover:bg-gray-200">{expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}</button>
            <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-200 p-3 space-y-3">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-500 w-36 flex-shrink-0">Rest between sets</span>
            <input type="number" className="w-16 h-7 border border-gray-200 rounded-lg px-2 text-xs outline-none text-center" value={ex.rest_between_sets || 60} onChange={e => set('rest_between_sets', parseInt(e.target.value))} />
            <span className="text-gray-400">sec</span>
            <span className="text-gray-500 ml-4 w-36 flex-shrink-0">Rest after exercise</span>
            <input type="number" className="w-16 h-7 border border-gray-200 rounded-lg px-2 text-xs outline-none text-center" value={ex.rest_after_exercise || 90} onChange={e => set('rest_after_exercise', parseInt(e.target.value))} />
            <span className="text-gray-400">sec</span>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Per-Set Detail</p>
            <div className="space-y-1.5">
              {setDetails.map((s, si) => (
                <div key={si} className="flex items-center gap-2 text-xs">
                  <span className="w-10 text-gray-400 flex-shrink-0">Set {si + 1}</span>
                  <span className="text-gray-400">Reps</span><input className="w-14 h-7 border border-gray-200 rounded-lg px-2 text-xs outline-none text-center" value={s.reps || ''} onChange={e => updateSet(si, 'reps', e.target.value)} />
                  <span className="text-gray-400">kg</span><input type="number" step="0.5" className="w-14 h-7 border border-gray-200 rounded-lg px-2 text-xs outline-none text-center" value={s.weight_kg || ''} onChange={e => updateSet(si, 'weight_kg', parseFloat(e.target.value) || 0)} />
                  <span className="text-gray-400">Rest</span><input type="number" className="w-14 h-7 border border-gray-200 rounded-lg px-2 text-xs outline-none text-center" value={s.rest_sec || 60} onChange={e => updateSet(si, 'rest_sec', parseInt(e.target.value))} /><span className="text-gray-400">s</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">Notes</label>
            <input className="w-full h-7 mt-1 border border-gray-200 rounded-lg px-2 text-xs outline-none" placeholder="e.g. Focus on slow eccentric, pause at bottom" value={ex.notes || ''} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AI Training Wizard ───────────────────────────────────────────────────────
function AITrainingWizard({ clients, onSaved, onClose }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [err, setErr] = useState('');
  const [answers, setAnswers] = useState({ clientId: '', clientName: '', bodyParts: [], duration: 60, date: format(new Date(), 'yyyy-MM-dd') });
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [previewExercises, setPreviewExercises] = useState([]); // exercise names to preview before full plan

  const set = (k, v) => setAnswers(p => ({ ...p, [k]: v }));
  const toggle = (k, val) => setAnswers(p => ({ ...p, [k]: p[k].includes(val) ? p[k].filter(x => x !== val) : [...p[k], val] }));
  const STEPS = ['Client', 'Focus Areas', 'Duration', 'Preview Exercises', 'Review & Edit'];

  const parseJSON = (text) => {
    let clean = text.trim().replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
    const s = clean.indexOf('{'); const e = clean.lastIndexOf('}');
    return JSON.parse(clean.slice(s, e + 1));
  };

  const generateExercisePreview = async () => {
    setLoading(true); setErr('');
    setLoadingMsg('Reading client profile...');

    const client = clients.find(c => c.id === answers.clientId);
    let clientContext = '';
    if (client) {
      const [notes, prevPlans] = await Promise.all([
        db.ClientNote.filter({ client_id: client.id }, '-created_date', 10),
        db.TrainingPlan.filter({ client_id: client.id }, '-date', 5),
      ]);
      const injuries = notes.filter(n => n.category === 'medical' || n.content?.toLowerCase().includes('injur')).map(n => n.content).join('; ');
      const prevEx = [...new Set(prevPlans.flatMap(p => p.exercises?.map(e => e.name) || []))].slice(0, 15).join(', ');
      clientContext = `Client: ${client.name}. ${injuries ? `AVOID (injuries): ${injuries}.` : ''} Recent exercises: ${prevEx || 'none yet'}.`;
    } else {
      clientContext = `Client: ${answers.clientName}. No history.`;
    }

    setLoadingMsg('Selecting exercises...');
    const numEx = Math.max(4, Math.floor(answers.duration / 14));
    const prompt = `You are a personal trainer. Select ${numEx} exercises for a ${answers.duration}-minute session.
Focus: ${answers.bodyParts.join(', ')}
${clientContext}
Rules: ONLY exercises for the focus areas. Avoid any exercises that could trigger injuries. Vary the exercises well.
Return ONLY a JSON array of exercise names:
["Bench Press","Incline Dumbbell Press","Pull-Up","Overhead Press","Bicep Curl"]`;

    const result = await callAI(prompt, 'Return ONLY a JSON array of exercise name strings. No markdown. Start with [');
    if (!result || result.startsWith('__ERROR__')) {
      setErr('Could not get exercise suggestions. Please try again.'); setLoading(false); return;
    }
    try {
      let clean = result.trim().replace(/^```json?\s*/i,'').replace(/\s*```$/,'').trim();
      const s = clean.indexOf('['); const e = clean.lastIndexOf(']');
      clean = clean.slice(s, e+1);
      const parsed = JSON.parse(clean);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('empty');
      setPreviewExercises(parsed.map(name => ({ name, keep: true })));
      setStep(3);
    } catch(e) {
      setErr('Could not parse exercises. Please try again.');
    }
    setLoading(false);
  };

  const generatePlan = async () => {
    setLoading(true); setErr('');
    setLoadingMsg('Reading client profile...');

    const client = clients.find(c => c.id === answers.clientId);
    let clientContext = '';

    if (client) {
      const [notes, prevPlans, progress] = await Promise.all([
        db.ClientNote.filter({ client_id: client.id }, '-created_date', 10),
        db.TrainingPlan.filter({ client_id: client.id }, '-date', 5),
        db.ClientProgress.filter({ client_id: client.id }, '-date', 3),
      ]);

      const injuries = notes.filter(n => n.category === 'medical' || n.content?.toLowerCase().includes('injur') || n.content?.toLowerCase().includes('pain')).map(n => n.content).join('; ');
      const prevExercises = prevPlans.flatMap(p => p.exercises?.map(e => `${e.name}: ${e.sets}x${e.reps} @ ${e.weight_kg}kg`) || []).slice(0, 20).join(', ');
      const latestProgress = progress[0];

      clientContext = `
Client: ${client.name}, ${client.gender || ''}, Goals: ${client.goals || 'general fitness'}
${injuries ? `⚠️ INJURIES/RESTRICTIONS (MUST AVOID triggers): ${injuries}` : 'No known injuries'}
Recent training weights: ${prevExercises || 'No history — start conservative'}
${latestProgress ? `Body stats: ${latestProgress.weight_kg}kg, ${latestProgress.body_fat_pct}% body fat, ${latestProgress.muscle_mass_kg}kg muscle` : ''}`;
    } else {
      clientContext = `Client: ${answers.clientName} (custom). No injury history available. Use moderate weights.`;
    }

    setLoadingMsg('Creating your training plan...');

    const prompt = `You are an expert personal trainer. Create a training plan based on:

${clientContext}

Training focus: ${answers.bodyParts.join(', ')}
Session duration: ${answers.duration} minutes
Date: ${answers.date}

CRITICAL RULES:
1. AVOID any exercises that could trigger the injuries/restrictions listed above
2. Base weights on previous training history — if history shows heavier weights, progress slightly
3. Choose exercises appropriate for the focus areas ONLY
4. Fit the number of exercises within ${answers.duration} minutes (roughly 3-4 min per set including rest)
5. Be specific with weights — not "moderate weight" but actual kg values

Return ONLY this JSON (no markdown):
{
  "title": "${answers.clientName || client?.name || 'Training'} — ${answers.bodyParts.join(' & ')} (${answers.date})",
  "notes": "2-3 sentences: training focus, key cues, any injury precautions",
  "exercises": [
    {
      "name": "Bench Press",
      "sets": 4,
      "reps": "8-10",
      "weight_kg": 80,
      "rest_between_sets": 90,
      "rest_after_exercise": 120,
      "notes": "control the eccentric",
      "set_details": [
        {"reps": "10", "weight_kg": 75, "rest_sec": 90},
        {"reps": "10", "weight_kg": 80, "rest_sec": 90},
        {"reps": "8", "weight_kg": 82.5, "rest_sec": 90},
        {"reps": "8", "weight_kg": 85, "rest_sec": 90}
      ]
    }
  ]
}`;

    const result = await callAI(prompt, 'Return ONLY valid JSON. No markdown. Start with {');
    if (!result || result.startsWith('__ERROR__')) {
      setErr('AI request failed. Please try again.');
      setLoading(false);
      return;
    }

    try {
      const parsed = parseJSON(result);
      if (!parsed.exercises?.length) throw new Error('No exercises');
      setGeneratedPlan(parsed);
      setStep(3);
    } catch (e) {
      console.error(e, result.slice(0, 300));
      setErr('Could not generate plan. Please try again.');
    }
    setLoading(false);
  };

  const savePlan = async () => {
    if (!generatedPlan) return;
    const client = clients.find(c => c.id === answers.clientId);
    await db.TrainingPlan.create({
      ...generatedPlan,
      client_id: answers.clientId || '',
      client_name: answers.clientName || client?.name || '',
      date: answers.date,
      completed: false,
    });
    onSaved();
    onClose();
  };

  const updateExercise = (i, updated) => {
    setGeneratedPlan(p => ({ ...p, exercises: p.exercises.map((ex, idx) => idx === i ? updated : ex) }));
  };
  const removeExercise = (i) => setGeneratedPlan(p => ({ ...p, exercises: p.exercises.filter((_, idx) => idx !== i) }));
  const addExercise = () => setGeneratedPlan(p => ({ ...p, exercises: [...p.exercises, { name: '', sets: 3, reps: '10', weight_kg: 0, rest_between_sets: 60, rest_after_exercise: 90, notes: '', set_details: [] }] }));

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center"><Sparkles className="w-5 h-5 text-purple-600" /></div>
            <div><h1 className="font-bold text-gray-900">AI Training Wizard</h1><p className="text-xs text-gray-400">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p></div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        {/* Progress */}
        <div className="flex gap-1 mb-8">
          {STEPS.map((_, i) => <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? 'bg-purple-500' : 'bg-gray-200'}`} />)}
        </div>

        {err && <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5 flex items-start gap-2 text-sm text-red-700"><AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><div className="flex-1">{err}</div><button onClick={() => setErr('')} className="text-xs underline">Dismiss</button></div>}

        {/* STEP 0 — Client */}
        {step === 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 text-lg mb-5">Who is this plan for?</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Select Client</label>
                <select value={answers.clientId} onChange={e => { const c = clients.find(c => c.id === e.target.value); setAnswers(p => ({ ...p, clientId: e.target.value, clientName: c?.name || '' })); }} className="w-full mt-1.5 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400">
                  <option value="">Choose from your clients...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value="custom">Someone else (enter name below)</option>
                </select>
              </div>
              {answers.clientId === 'custom' && (
                <div><label className="text-xs font-semibold text-gray-500 uppercase">Name</label><input className="w-full mt-1.5 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none" placeholder="e.g. John (friend)" value={answers.clientName} onChange={e => set('clientName', e.target.value)} /></div>
              )}
              {answers.clientId && answers.clientId !== 'custom' && (() => {
                const c = clients.find(c => c.id === answers.clientId);
                return c ? <div className="bg-purple-50 rounded-xl p-3 text-xs text-purple-800"><p className="font-medium mb-1">✅ Will scan client file for:</p><p>• Previous training weights · Injury history · Body stats · Goals</p></div> : null;
              })()}
              <div><label className="text-xs font-semibold text-gray-500 uppercase">Training Date</label><input type="date" value={answers.date} onChange={e => set('date', e.target.value)} className="w-full mt-1.5 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400" /></div>
            </div>
            <button disabled={!answers.clientId && !answers.clientName} onClick={() => setStep(1)} className="w-full mt-6 bg-purple-500 text-white rounded-xl py-3 font-semibold hover:bg-purple-600 disabled:opacity-40 flex items-center justify-center gap-2">Continue <ChevronRight className="w-4 h-4" /></button>
          </div>
        )}

        {/* STEP 1 — Body Parts */}
        {step === 1 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 text-lg mb-2">Training Focus</h2>
            <p className="text-sm text-gray-500 mb-5">Select one or more muscle groups</p>
            <div className="grid grid-cols-2 gap-2">
              {BODY_PARTS.map(bp => (
                <button key={bp.id} onClick={() => toggle('bodyParts', bp.id)} className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${answers.bodyParts.includes(bp.id) ? 'border-purple-400 bg-purple-50' : 'border-gray-100 hover:border-gray-200'}`}>
                  <span className="text-xl">{bp.emoji}</span>
                  <span className="font-medium text-gray-900 text-sm">{bp.label}</span>
                  {answers.bodyParts.includes(bp.id) && <Check className="w-4 h-4 text-purple-500 ml-auto" />}
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(0)} className="flex-1 border border-gray-200 rounded-xl py-3 text-sm">Back</button>
              <button disabled={answers.bodyParts.length === 0} onClick={() => setStep(2)} className="flex-1 bg-purple-500 text-white rounded-xl py-3 font-semibold hover:bg-purple-600 disabled:opacity-40 flex items-center justify-center gap-2">Continue <ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {/* STEP 2 — Duration */}
        {step === 2 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 text-lg mb-5">Session Duration</h2>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[30, 45, 60, 75, 90, 120].map(d => (
                <button key={d} onClick={() => set('duration', d)} className={`py-4 rounded-xl border-2 font-semibold transition-all ${answers.duration === d ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-100 text-gray-600 hover:border-gray-200'}`}>
                  {d} min
                </button>
              ))}
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-sm text-purple-800 mb-6">
              <p className="font-medium">What the AI will create for {answers.duration} min:</p>
              <p className="mt-1 text-purple-700">~{Math.floor(answers.duration / 15)} exercises · Personalized weights · Rest times optimized · Injury-safe</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 border border-gray-200 rounded-xl py-3 text-sm">Back</button>
              <button onClick={generateExercisePreview} disabled={loading} className="flex-1 bg-purple-500 text-white rounded-xl py-3 font-semibold hover:bg-purple-600 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{loadingMsg}</> : <>Preview Exercises <ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — Exercise Preview */}
        {step === 3 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 text-lg mb-2">Exercise Preview</h2>
            <p className="text-sm text-gray-500 mb-5">These are the exercises the AI selected. Remove any you don't want, re-roll individual ones, or add your own. Then click <strong>Build Plan</strong>.</p>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 mb-4">
              {previewExercises.map((ex, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${ex.keep ? 'border-gray-100 bg-gray-50' : 'border-red-100 bg-red-50 opacity-50'}`}>
                  <button onClick={() => setPreviewExercises(prev => prev.map((e,idx) => idx===i ? {...e, keep:!e.keep} : e))} className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 ${ex.keep ? 'bg-purple-500 border-purple-500' : 'border-gray-300 bg-white'}`}>
                    {ex.keep && <Check className="w-3 h-3 text-white"/>}
                  </button>
                  <ExerciseInput value={ex.name} onChange={v => setPreviewExercises(prev => prev.map((e,idx) => idx===i ? {...e, name:v} : e))} />
                  <button onClick={async () => {
                    const newEx = [...previewExercises];
                    newEx[i] = { ...newEx[i], name: '⏳ Re-rolling...' };
                    setPreviewExercises(newEx);
                    const existing = previewExercises.filter((_,idx)=>idx!==i).map(e=>e.name).join(', ');
                    const { callAI: ai } = await import('../lib/db');
                    const r = await ai(`Suggest ONE alternative exercise for ${answers.bodyParts.join('/')} training (${answers.duration}min session). Already using: ${existing}. Return ONLY the exercise name, nothing else.`);
                    setPreviewExercises(prev => prev.map((e,idx) => idx===i ? {...e, name: r?.trim().replace(/^["']|["']$/g,'') || e.name} : e));
                  }} className="p-1.5 text-gray-400 hover:text-purple-500 rounded-lg hover:bg-purple-50 flex-shrink-0" title="Re-roll this exercise">
                    <RotateCcw className="w-3.5 h-3.5"/>
                  </button>
                  <button onClick={() => setPreviewExercises(prev => prev.filter((_,idx) => idx!==i))} className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-50 flex-shrink-0"><Trash2 className="w-3.5 h-3.5"/></button>
                </div>
              ))}
            </div>
            <button onClick={() => setPreviewExercises(prev => [...prev, { name: '', keep: true }])} className="w-full border-2 border-dashed border-gray-200 rounded-xl py-2.5 text-sm text-gray-400 hover:border-gray-300 hover:text-gray-600 flex items-center justify-center gap-2 mb-5">
              <Plus className="w-4 h-4"/> Add Exercise
            </button>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 border border-gray-200 rounded-xl py-3 text-sm text-gray-600">Back</button>
              <button onClick={generatePlan} disabled={loading || previewExercises.filter(e=>e.keep).length === 0} className="flex-1 bg-purple-500 text-white rounded-xl py-3 font-semibold hover:bg-purple-600 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin"/>{loadingMsg}</> : <>Build Full Plan <Sparkles className="w-4 h-4"/></>}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 — Review & Edit */}
        {step === 4 && generatedPlan && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2"><span className="text-2xl">💪</span><div><h2 className="font-bold text-gray-900 text-lg">Training Plan Ready</h2><p className="text-sm text-gray-500">{generatedPlan.exercises?.length} exercises · {answers.duration} min</p></div></div>
            {generatedPlan.notes && <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 mb-4 text-sm text-purple-800">{generatedPlan.notes}</div>}

            <div className="mb-3"><label className="text-xs font-semibold text-gray-500 uppercase">Plan Title</label><input value={generatedPlan.title} onChange={e => setGeneratedPlan(p => ({ ...p, title: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" /></div>

            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              {generatedPlan.exercises?.map((ex, i) => (
                <ExerciseRow key={i} ex={ex} idx={i} onChange={u => updateExercise(i, u)} onRemove={() => removeExercise(i)} />
              ))}
            </div>

            <button onClick={addExercise} className="w-full mt-3 border-2 border-dashed border-gray-200 rounded-xl py-2.5 text-sm text-gray-400 hover:border-gray-300 hover:text-gray-600 flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Add Exercise
            </button>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setStep(3)} className="flex-1 border border-gray-200 rounded-xl py-3 text-sm text-gray-600">← Back</button>
              <button onClick={savePlan} className="flex-1 bg-gray-900 text-white rounded-xl py-3 font-semibold hover:bg-gray-800">Save Plan ✓</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Manual Plan Modal ────────────────────────────────────────────────────────
function PlanModal({ clients, plan, onClose, onSaved }) {
  const [f, setF] = useState(plan || { client_id: '', client_name: '', date: format(new Date(), 'yyyy-MM-dd'), title: '', exercises: [], notes: '', completed: false });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const handleClient = (id) => { const c = clients.find(c => c.id === id); setF(p => ({ ...p, client_id: id, client_name: c?.name || '' })); };
  const addEx = () => set('exercises', [...(f.exercises || []), { name: '', sets: 3, reps: '10', weight_kg: 0, rest_between_sets: 60, rest_after_exercise: 90, notes: '', set_details: [] }]);
  const updateEx = (i, u) => { const exs = [...(f.exercises || [])]; exs[i] = u; set('exercises', exs); };
  const removeEx = (i) => set('exercises', f.exercises.filter((_, idx) => idx !== i));
  const save = async () => { setSaving(true); if (plan?.id) await db.TrainingPlan.update(plan.id, f); else await db.TrainingPlan.create(f); setSaving(false); onSaved(); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-gray-900 text-lg">{plan ? 'Edit Plan' : 'New Plan (Manual)'}</h2><button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button></div>
        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-500 uppercase">Client</label><select value={f.client_id} onChange={e => handleClient(e.target.value)} className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"><option value="">Select</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="text-xs font-medium text-gray-500 uppercase">Date</label><input type="date" value={f.date} onChange={e => set('date', e.target.value)} className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" /></div>
          </div>
          <div><label className="text-xs font-medium text-gray-500 uppercase">Title *</label><input value={f.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Upper Body Hypertrophy" className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" /></div>
          <div><label className="text-xs font-medium text-gray-500 uppercase">Notes</label><textarea value={f.notes || ''} onChange={e => set('notes', e.target.value)} rows={2} className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none resize-none" /></div>
        </div>
        <div className="flex items-center justify-between mb-2"><label className="text-xs font-medium text-gray-500 uppercase">Exercises</label><button onClick={addEx} className="flex items-center gap-1 text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg"><Plus className="w-3 h-3" />Add Exercise</button></div>
        <div className="space-y-2 max-h-[40vh] overflow-y-auto">
          {(f.exercises || []).map((ex, i) => <ExerciseRow key={i} ex={ex} idx={i} onChange={u => updateEx(i, u)} onRemove={() => removeEx(i)} />)}
          {!f.exercises?.length && <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">Add exercises above</div>}
        </div>
        <div className="flex gap-2 mt-4"><button onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm">Cancel</button><button onClick={save} disabled={saving || !f.title} className="flex-1 bg-gray-900 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50">{saving ? 'Saving…' : 'Save Plan'}</button></div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TrainingPlans() {
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
  const toggle = async (p) => { await db.TrainingPlan.update(p.id, { completed: !p.completed }); load(); };
  const del = async (id) => { await db.TrainingPlan.delete(id); load(); };

  if (showWizard) return <AITrainingWizard clients={clients} onSaved={load} onClose={() => setShowWizard(false)} />;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Training Plans</h1><p className="text-gray-400 text-sm mt-1">{plans.length} plans</p></div>
        <div className="flex gap-2">
          <button onClick={() => setShowManual(true)} className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200">
            <Plus className="w-4 h-4" /> Manual
          </button>
          <button onClick={() => setShowWizard(true)} className="flex items-center gap-2 bg-purple-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-600 shadow-sm">
            <Sparkles className="w-4 h-4" /> AI Wizard
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setFilterClient('')} className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${!filterClient ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All</button>
        {clients.map(c => <button key={c.id} onClick={() => setFilterClient(c.id)} className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${filterClient === c.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{c.name}</button>)}
      </div>

      <div className="space-y-3">
        {filtered.map(plan => (
          <div key={plan.id} className={`bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-all ${plan.completed ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3 flex-1 min-w-0">
                <button onClick={() => toggle(plan)} className="flex-shrink-0 mt-0.5">{plan.completed ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-gray-300" />}</button>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-gray-900 ${plan.completed ? 'line-through' : ''}`}>{plan.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{plan.client_name || '—'} · {plan.date ? format(parseISO(plan.date), 'MMM d, yyyy') : ''} · {plan.exercises?.length || 0} exercises</p>
                  {plan.exercises?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {plan.exercises.slice(0, 5).map((ex, i) => <span key={i} className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">{ex.name} {ex.sets}×{ex.reps} {ex.weight_kg ? `@ ${ex.weight_kg}kg` : ''}</span>)}
                      {plan.exercises.length > 5 && <span className="text-xs text-gray-400">+{plan.exercises.length - 5} more</span>}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => { setEditing(plan); setShowManual(true); }} className="p-1.5 text-gray-300 hover:text-gray-600 rounded-lg hover:bg-gray-50"><Plus className="w-4 h-4 rotate-45" /></button>
                <button onClick={() => del(plan.id)} className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg hover:bg-gray-50"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No training plans yet</p>
            <p className="text-sm mt-1">Use the AI Wizard for personalized plans</p>
          </div>
        )}
      </div>

      {(showManual || editing) && <PlanModal clients={clients} plan={editing} onClose={() => { setShowManual(false); setEditing(null); }} onSaved={load} />}
    </div>
  );
}
