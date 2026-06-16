import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Trash2, X, Sparkles, ChevronRight, ChevronDown, ExternalLink, Loader2, Check, AlertCircle, Pencil, RotateCcw } from 'lucide-react';
import { db, callAI } from '../lib/db';

const MEAL_TYPES = [
  { id:'breakfast', label:'Breakfast', emoji:'🌅', time:'08:00' },
  { id:'snack1', label:'Morning Snack', emoji:'🍎', time:'10:30' },
  { id:'lunch', label:'Lunch', emoji:'☀️', time:'13:00' },
  { id:'snack2', label:'Afternoon Snack', emoji:'🥜', time:'16:00' },
  { id:'dinner', label:'Dinner', emoji:'🌙', time:'19:30' },
];

// ── AI Wizard ─────────────────────────────────────────────────────────────────
function AIWizard({ clients, onPlanCreated, onClose }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [answers, setAnswers] = useState({
    clientId:'', clientName:'', calories:'', protein:'',
    selectedMeals:['breakfast','lunch','dinner'],
    proteins:[], breakfastFoods:[], supplements:'',
    preWorkout:false, postWorkout:false, notes:''
  });
  const [suggestedFoods, setSuggestedFoods] = useState([]);
  const [rejectedFoods, setRejectedFoods] = useState([]);
  const [editingFood, setEditingFood] = useState(null); // {name, instruction}
  const [pendingEdits, setPendingEdits] = useState({}); // {foodName: instruction}
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [err, setErr] = useState('');

  const set = (k,v) => setAnswers(p=>({...p,[k]:v}));
  const toggle = (k,val) => setAnswers(p=>({...p,[k]:p[k].includes(val)?p[k].filter(x=>x!==val):[...p[k],val]}));
  const STEPS = ['Client & Goals','Meal Types','Proteins & Foods','Supplements','Review Foods','Final Plan'];

  const parseJSON = (text) => {
    let clean = text.trim();
    clean = clean.replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim();
    const arrStart = clean.indexOf('[');
    const objStart = clean.indexOf('{');
    if (arrStart !== -1 && (objStart === -1 || arrStart < objStart)) {
      clean = clean.slice(arrStart, clean.lastIndexOf(']')+1);
    } else if (objStart !== -1) {
      clean = clean.slice(objStart, clean.lastIndexOf('}')+1);
    }
    return JSON.parse(clean);
  };

  const handleErr = (result) => {
    if (!result || result.startsWith('__ERROR__')) {
      setErr('AI request failed. Check your internet connection and try again. ' + (result||''));
      return false;
    }
    return true;
  };

  // Count how many options per meal type
  const mealCounts = { breakfast:5, snack1:3, lunch:7, snack2:3, dinner:7 };

  const generateFoodSuggestions = async () => {
    setLoading(true); setErr('');
    setLoadingMsg('Generating creative meal suggestions...');

    const totalNeeded = answers.selectedMeals.reduce((s,m) => s + (mealCounts[m]||4), 0);

    const prompt = `You are a creative nutrition expert. Generate ${totalNeeded} diverse, specific, appetizing meal options.

Client details:
- Daily calories: ${answers.calories} kcal
- Daily protein: ${answers.protein}g
- Meals needed: ${answers.selectedMeals.map(m => `${m} (need ${mealCounts[m]||4} options)`).join(', ')}
- Preferred proteins: ${answers.proteins.length ? answers.proteins.join(', ') : 'any'}
- Breakfast preferences: ${answers.breakfastFoods.length ? answers.breakfastFoods.join(', ') : 'any'}
- Supplements: ${answers.supplements || 'none'}
- Pre-workout meal: ${answers.preWorkout ? 'yes - include one' : 'no'}
- Post-workout: ${answers.postWorkout ? 'yes - include one' : 'no'}
- Notes: ${answers.notes || 'none'}

IMPORTANT RULES:
1. Be VERY CREATIVE - if chicken is selected, suggest: Chicken Burrito Bowl, Roasted Chicken with Potatoes, Chicken Strips with Sweet Potato Fries, Honey Garlic Chicken with Rice, Chicken Souvlaki Bowl, Chicken Caesar Wrap, Spicy Chicken Stir Fry
2. ONLY use the preferred proteins listed. Do NOT include proteins not in the list.
3. Each option must be a complete, named dish - not just "chicken and rice"
4. Spread options evenly across the requested meal types
5. Calories must be realistic for the meal type

Return ONLY a JSON array, no markdown:
[
  {"name":"Honey Garlic Chicken with Brown Rice","meal_type":"lunch","ingredients":"200g chicken breast, 150g brown rice, 2 tbsp honey, 3 cloves garlic, soy sauce, broccoli 150g","calories":580},
  {"name":"Greek Yogurt Berry Power Bowl","meal_type":"breakfast","ingredients":"300g Greek yogurt, 60g granola, 100g mixed berries, 1 tbsp honey, 20g almonds","calories":420}
]`;

    const result = await callAI(prompt, 'Return ONLY a valid JSON array. No markdown. No explanation. Start with [');
    if (!handleErr(result)) { setLoading(false); return; }

    try {
      const parsed = parseJSON(result);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('empty');
      setSuggestedFoods(parsed);
      setStep(4);
    } catch(e) {
      console.error('Parse error:', e, result.slice(0,300));
      setErr('Could not parse AI response. Please try again.');
    }
    setLoading(false);
  };

  const applyFoodEdit = async (food, instruction) => {
    setLoading(true);
    setLoadingMsg(`Updating "${food.name}"...`);
    const prompt = `You are a nutrition expert. Modify this recipe based on the instruction.

Original recipe:
Name: ${food.name}
Ingredients: ${food.ingredients}
Calories: ${food.calories}
Meal type: ${food.meal_type}

Modification instruction: "${instruction}"

Return ONLY a JSON object with the updated recipe (same format, adjust calories/ingredients accordingly):
{"name":"updated name if needed","meal_type":"${food.meal_type}","ingredients":"updated ingredient list with quantities","calories":number}`;

    const result = await callAI(prompt, 'Return ONLY valid JSON object. No markdown.');
    if (!handleErr(result)) { setLoading(false); return; }

    try {
      const updated = parseJSON(result);
      setSuggestedFoods(prev => prev.map(f => f.name === food.name ? { ...f, ...updated } : f));
      setPendingEdits(prev => { const n={...prev}; delete n[food.name]; return n; });
      setEditingFood(null);
    } catch(e) {
      setErr('Could not apply edit. Try again.');
    }
    setLoading(false);
  };

  const generateFinalPlan = async () => {
    setLoading(true); setErr('');
    setLoadingMsg('Building your complete nutrition plan...');
    const approved = suggestedFoods.filter(f => !rejectedFoods.includes(f.name));

    // Group foods by meal type
    const mealGroups = {};
    answers.selectedMeals.forEach(m => { mealGroups[m] = []; });
    approved.forEach(f => {
      const mt = (f.meal_type||'').toLowerCase().replace(/\s+/g,'');
      const match = answers.selectedMeals.find(m =>
        mt.includes(m.replace(/\d/,'')) || m.replace(/\d/,'').includes(mt) || mt === m
      );
      const key = match || answers.selectedMeals[0];
      if (mealGroups[key]) mealGroups[key].push(f);
      else mealGroups[answers.selectedMeals[0]].push(f);
    });

    // Build the plan directly from approved foods without asking AI to restructure
    // AI only needs to fill in: description, protein, carbs, fat, recipe_url
    const mealSectionsInput = answers.selectedMeals.map(m => {
      const mt = MEAL_TYPES.find(x => x.id === m);
      const foods = mealGroups[m] || [];
      return { id: m, label: mt?.label || m, time: mt?.time || '12:00', foods };
    }).filter(s => s.foods.length > 0);

    const foodListForAI = mealSectionsInput.map(s =>
      `${s.label}: ${s.foods.map(f => f.name).join(', ')}`
    ).join(' | ');

    const prompt = `For each meal option listed, provide: description (1 sentence), protein_g, carbs_g, fat_g, and a recipe_url from allrecipes.com.

Total daily targets: ${answers.calories} kcal, ${answers.protein}g protein

Meal options: ${foodListForAI}

Return ONLY a JSON array — one object per dish:
[{"name":"Spicy Grilled Chicken Burrito Bowl","description":"Juicy grilled chicken with rice, black beans and fresh salsa","protein_g":48,"carbs_g":65,"fat_g":12,"recipe_url":"https://www.allrecipes.com/search?q=chicken+burrito+bowl"}]

Rules:
- name must match EXACTLY as provided
- recipe_url: use https://www.allrecipes.com/search?q=DISH+NAME+HERE (URL-encode spaces as +)
- Estimate realistic macros based on the ingredients already known`;

    setLoadingMsg('Calculating macros...');
    const result = await callAI(prompt, 'Return ONLY a valid JSON array. No markdown. No explanation. Start with [');
    if (!handleErr(result)) { setLoading(false); return; }

    try {
      let macroData = [];
      try {
        macroData = parseJSON(result);
      } catch(e) {
        // If AI still returns bad JSON, build plan without macros
        console.warn('Macro fetch failed, building without:', e);
      }

      // Build final plan structure entirely from local data
      const clientName = answers.clientName || clients.find(c => c.id === answers.clientId)?.name || 'Client';
      const plan = {
        title: clientName + ' — Nutrition Plan (' + answers.calories + ' kcal)',
        calories: parseInt(answers.calories),
        protein: parseInt(answers.protein),
        carbs: Math.round(answers.calories * 0.4 / 4),
        fat: Math.round(answers.calories * 0.25 / 9),
        notes: 'Plan based on ' + answers.calories + ' kcal/day with ' + answers.protein + 'g protein target. ' + (answers.supplements ? 'Supplements: ' + answers.supplements + '.' : ''),
        meal_sections: mealSectionsInput.map(section => ({
          section_name: section.label,
          time: section.time,
          options: section.foods.map(food => {
            const macro = macroData.find(m => m.name === food.name || m.name?.toLowerCase().includes(food.name.toLowerCase().slice(0,10)));
            const q = encodeURIComponent(food.name.replace(/\s+/g, '+'));
            return {
              name: food.name,
              description: macro?.description || food.name + ' — a nutritious and delicious meal option.',
              ingredients: food.ingredients || '',
              calories: food.calories || 400,
              protein: macro?.protein_g || Math.round(food.calories * 0.25 / 4),
              carbs: macro?.carbs_g || Math.round(food.calories * 0.45 / 4),
              fat: macro?.fat_g || Math.round(food.calories * 0.3 / 9),
              recipe_url: macro?.recipe_url || 'https://www.allrecipes.com/search?q=' + q,
            };
          }),
        })),
      };

      setGeneratedPlan(plan);
      setStep(5);
    } catch(e) {
      console.error('Plan build error:', e);
      setErr('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const savePlan = async () => {
    if (!generatedPlan) return;
    const client = clients.find(c => c.id === answers.clientId);
    await db.NutritionPlan.create({
      ...generatedPlan,
      client_id: answers.clientId,
      client_name: answers.clientName || client?.name || '',
      date: format(new Date(), 'yyyy-MM-dd'),
    });
    onPlanCreated(); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center"><Sparkles className="w-5 h-5 text-amber-600"/></div>
            <div><h1 className="font-bold text-gray-900">AI Nutrition Wizard</h1><p className="text-xs text-gray-400">Step {step+1} of {STEPS.length} — {STEPS[step]}</p></div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg"><X className="w-5 h-5 text-gray-500"/></button>
        </div>

        {/* Progress */}
        <div className="flex gap-1 mb-8">
          {STEPS.map((_,i) => <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i<=step?'bg-amber-500':'bg-gray-200'}`}/>)}
        </div>

        {err && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5 flex items-start gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5"/>
            <div className="flex-1">{err}</div>
            <button onClick={()=>setErr('')} className="text-xs underline flex-shrink-0">Dismiss</button>
          </div>
        )}

        {/* STEP 0 */}
        {step===0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 text-lg mb-5">Client & Nutrition Goals</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Client *</label>
                <select value={answers.clientId} onChange={e=>{const c=clients.find(c=>c.id===e.target.value);setAnswers(p=>({...p,clientId:e.target.value,clientName:c?.name||''}));}} className="w-full mt-1.5 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-400">
                  <option value="">Choose a client...</option>
                  {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value="custom">Other / Custom</option>
                </select>
                {answers.clientId==='custom'&&<input className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none" placeholder="Client name" value={answers.clientName} onChange={e=>set('clientName',e.target.value)}/>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-gray-500 uppercase">Daily Calories *</label><input type="number" value={answers.calories} onChange={e=>set('calories',e.target.value)} placeholder="e.g. 2200" className="w-full mt-1.5 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-400"/></div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase">Daily Protein (g) *</label><input type="number" value={answers.protein} onChange={e=>set('protein',e.target.value)} placeholder="e.g. 160" className="w-full mt-1.5 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-400"/></div>
              </div>
            </div>
            <button disabled={!answers.calories||!answers.protein||!answers.clientId} onClick={()=>setStep(1)} className="w-full mt-6 bg-amber-500 text-white rounded-xl py-3 font-semibold hover:bg-amber-600 disabled:opacity-40 flex items-center justify-center gap-2">Continue <ChevronRight className="w-4 h-4"/></button>
          </div>
        )}

        {/* STEP 1 */}
        {step===1 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 text-lg mb-2">Which meals to include?</h2>
            <p className="text-sm text-gray-500 mb-5">Select all that apply</p>
            <div className="space-y-2">
              {MEAL_TYPES.map(m=>(
                <button key={m.id} onClick={()=>toggle('selectedMeals',m.id)} className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${answers.selectedMeals.includes(m.id)?'border-amber-400 bg-amber-50':'border-gray-100 hover:border-gray-200'}`}>
                  <div className="flex items-center gap-3"><span className="text-2xl">{m.emoji}</span><div className="text-left"><p className="font-medium text-gray-900">{m.label}</p><p className="text-xs text-gray-400">{m.time} · {mealCounts[m.id]||4} options generated</p></div></div>
                  {answers.selectedMeals.includes(m.id)&&<Check className="w-5 h-5 text-amber-500"/>}
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={()=>setStep(0)} className="flex-1 border border-gray-200 rounded-xl py-3 text-sm text-gray-600">Back</button>
              <button disabled={answers.selectedMeals.length===0} onClick={()=>setStep(2)} className="flex-1 bg-amber-500 text-white rounded-xl py-3 font-semibold hover:bg-amber-600 disabled:opacity-40 flex items-center justify-center gap-2">Continue <ChevronRight className="w-4 h-4"/></button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step===2 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 text-lg mb-5">Food Preferences</h2>
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Preferred protein sources</p>
                <p className="text-xs text-gray-400 mb-2">The AI will ONLY use proteins you select</p>
                <div className="flex flex-wrap gap-2">
                  {['Chicken','Beef','Pork','Fish','Salmon','Tuna','Turkey','Eggs','Shrimp','Lamb','Tofu','Legumes'].map(p=>(
                    <button key={p} onClick={()=>toggle('proteins',p)} className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${answers.proteins.includes(p)?'bg-amber-500 text-white border-amber-500':'border-gray-200 text-gray-600 hover:border-amber-300'}`}>{p}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Breakfast & snack favorites</p>
                <div className="flex flex-wrap gap-2">
                  {['Eggs','Oatmeal','Greek Yogurt','Toast','Smoothie','Avocado','Granola','Fruit','Cottage Cheese','Pancakes','Nuts','Rice Cakes','Cereal'].map(f=>(
                    <button key={f} onClick={()=>toggle('breakfastFoods',f)} className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${answers.breakfastFoods.includes(f)?'bg-amber-500 text-white border-amber-500':'border-gray-200 text-gray-600 hover:border-amber-300'}`}>{f}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={()=>setStep(1)} className="flex-1 border border-gray-200 rounded-xl py-3 text-sm">Back</button>
              <button onClick={()=>setStep(3)} className="flex-1 bg-amber-500 text-white rounded-xl py-3 font-semibold hover:bg-amber-600 flex items-center justify-center gap-2">Continue <ChevronRight className="w-4 h-4"/></button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step===3 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 text-lg mb-5">Supplements & Meal Timing</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Supplements</label>
                <input value={answers.supplements} onChange={e=>set('supplements',e.target.value)} placeholder="e.g. 30g whey protein post-workout, creatine 5g daily" className="w-full mt-1.5 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-400"/>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase">Workout nutrition</p>
                {[['preWorkout','🏃 Pre-workout meal (1 hour before training)'],['postWorkout','💪 Post-workout meal / recovery']].map(([k,l])=>(
                  <button key={k} onClick={()=>set(k,!answers[k])} className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${answers[k]?'border-amber-400 bg-amber-50':'border-gray-100 hover:border-gray-200'}`}>
                    <span className="text-sm text-gray-800">{l}</span>
                    {answers[k]&&<Check className="w-4 h-4 text-amber-500"/>}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Notes / Dislikes / Allergies</label>
                <textarea value={answers.notes} onChange={e=>set('notes',e.target.value)} rows={3} placeholder="e.g. No dairy, allergic to nuts, loves Greek cuisine, no spicy food..." className="w-full mt-1.5 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none resize-none focus:border-amber-400"/>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={()=>setStep(2)} className="flex-1 border border-gray-200 rounded-xl py-3 text-sm">Back</button>
              <button onClick={generateFoodSuggestions} disabled={loading} className="flex-1 bg-amber-500 text-white rounded-xl py-3 font-semibold hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading?<><Loader2 className="w-4 h-4 animate-spin"/>{loadingMsg}</>:<>Generate Food List <ChevronRight className="w-4 h-4"/></>}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 — Review Foods with edit */}
        {step===4 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 text-lg mb-1">Review Suggested Foods</h2>
            <p className="text-sm text-gray-500 mb-4">
              <span className="text-red-500 font-medium">Tap</span> to reject · <span className="text-blue-500 font-medium">✏️</span> to request changes
            </p>

            {/* Edit panel */}
            {editingFood && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <p className="text-xs font-semibold text-blue-800 mb-1">Editing: <span className="font-bold">{editingFood.name}</span></p>
                <textarea
                  autoFocus
                  value={pendingEdits[editingFood.name]||''}
                  onChange={e=>setPendingEdits(p=>({...p,[editingFood.name]:e.target.value}))}
                  rows={2}
                  placeholder="e.g. Remove the potatoes, add more chicken but keep the same calories. No dairy."
                  className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm outline-none resize-none bg-white"
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={()=>{setEditingFood(null);}} className="flex-1 border border-gray-200 rounded-lg py-1.5 text-xs text-gray-600">Cancel</button>
                  <button onClick={()=>applyFoodEdit(editingFood, pendingEdits[editingFood.name]||'')} disabled={loading||!pendingEdits[editingFood.name]?.trim()} className="flex-1 bg-blue-500 text-white rounded-lg py-1.5 text-xs font-medium disabled:opacity-40">
                    {loading?<Loader2 className="w-3 h-3 animate-spin mx-auto"/>:'Apply Change'}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-1">
              {suggestedFoods.map(food=>{
                const rejected = rejectedFoods.includes(food.name);
                const hasEdit = pendingEdits[food.name];
                return (
                  <div key={food.name} className={`relative rounded-xl border-2 transition-all ${rejected?'border-red-200 bg-red-50 opacity-60':'border-gray-100 bg-white hover:border-gray-200'} ${editingFood?.name===food.name?'border-blue-300':''}`}>
                    <div className="flex items-start gap-2 p-3" onClick={()=>{ if(!rejected) setRejectedFoods(p=>p.includes(food.name)?p.filter(x=>x!==food.name):[...p,food.name]); else setRejectedFoods(p=>p.filter(x=>x!==food.name)); }} style={{cursor:'pointer'}}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize flex-shrink-0">{food.meal_type}</span>
                          <span className={`text-sm font-semibold ${rejected?'line-through text-gray-400':'text-gray-900'}`}>{food.name}</span>
                          {rejected && <span className="text-xs text-red-500 font-medium">✗ Excluded</span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{food.ingredients}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-gray-700">{food.calories} kcal</p>
                      </div>
                    </div>
                    {/* Edit button */}
                    {!rejected && (
                      <button
                        onClick={e=>{e.stopPropagation();setEditingFood(food);}}
                        className={`absolute top-2 right-2 p-1.5 rounded-lg transition-colors ${editingFood?.name===food.name?'bg-blue-100 text-blue-600':'bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-500'}`}
                        title="Request changes to this recipe"
                      >
                        <Pencil className="w-3.5 h-3.5"/>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-3 mb-4">
              <p className="text-xs text-gray-400">{rejectedFoods.length} excluded · {suggestedFoods.length-rejectedFoods.length} approved</p>
              {rejectedFoods.length>0&&<button onClick={()=>setRejectedFoods([])} className="text-xs text-amber-600 underline flex items-center gap-1"><RotateCcw className="w-3 h-3"/>Restore all</button>}
            </div>
            <div className="flex gap-3">
              <button onClick={()=>setStep(3)} className="flex-1 border border-gray-200 rounded-xl py-3 text-sm">Back</button>
              <button onClick={generateFinalPlan} disabled={loading||suggestedFoods.length-rejectedFoods.length<2} className="flex-1 bg-amber-500 text-white rounded-xl py-3 font-semibold hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading?<><Loader2 className="w-4 h-4 animate-spin"/>{loadingMsg}</>:<>Build Plan <ChevronRight className="w-4 h-4"/></>}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5 */}
        {step===5&&generatedPlan&&(
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4"><span className="text-3xl">🎉</span><div><h2 className="font-bold text-gray-900 text-lg">Plan Ready!</h2><p className="text-sm text-gray-500">{generatedPlan.title}</p></div></div>
            <div className="flex gap-2 flex-wrap mb-5">
              {[['🔥',generatedPlan.calories,'kcal','bg-amber-50 text-amber-700'],['💪',generatedPlan.protein,'g P','bg-green-50 text-green-700'],['🌾',generatedPlan.carbs,'g C','bg-blue-50 text-blue-700'],['🥑',generatedPlan.fat,'g F','bg-red-50 text-red-700']].map(([e,v,l,cls])=>v&&<span key={l} className={`text-xs px-3 py-1.5 rounded-full font-semibold ${cls}`}>{e} {v}{l}</span>)}
            </div>
            {generatedPlan.notes&&<p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 mb-4">{generatedPlan.notes}</p>}
            <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
              {generatedPlan.meal_sections?.map(section=>(
                <div key={section.section_name} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="bg-amber-50 px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2"><span className="font-semibold text-gray-900 text-sm">{section.section_name}</span><span className="text-xs text-gray-400">{section.time}</span></div>
                    <span className="text-xs text-amber-700 font-medium">{section.options?.length} options</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {section.options?.map(opt=>(
                      <div key={opt.name} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1"><p className="text-sm font-semibold text-gray-900">{opt.name}</p><p className="text-xs text-gray-500 mt-0.5">{opt.description}</p><p className="text-xs text-gray-400 mt-1 italic">{opt.ingredients}</p></div>
                          <div className="text-right text-xs flex-shrink-0">
                            <p className="font-bold text-gray-800">{opt.calories} kcal</p>
                            <p className="text-gray-400">P:{opt.protein}g C:{opt.carbs}g F:{opt.fat}g</p>
                            <RecipeLink opt={opt} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={()=>setStep(4)} className="flex-1 border border-gray-200 rounded-xl py-3 text-sm text-gray-600">← Revise</button>
              <button onClick={savePlan} className="flex-1 bg-gray-900 text-white rounded-xl py-3 font-semibold hover:bg-gray-800">Save to Client ✓</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function RecipeLink({ opt }) {
  const params = new URLSearchParams({
    name: opt.name || '',
    ingredients: opt.ingredients || '',
    calories: opt.calories || '',
    protein: opt.protein || '',
    carbs: opt.carbs || '',
    fat: opt.fat || '',
  });
  return (
    <a href={`/recipe?${params.toString()}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-600 mt-1 text-xs">
      <ExternalLink className="w-3 h-3"/>Full Recipe
    </a>
  );
}

function PlanCard({ plan, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow">
      <div className="p-5 cursor-pointer" onClick={()=>setExpanded(v=>!v)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{plan.title}</p>
            <p className="text-sm text-gray-400 mt-0.5">{plan.client_name||'—'} · {plan.date}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {plan.protein&&<span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">P: {plan.protein}g</span>}
              {plan.carbs&&<span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">C: {plan.carbs}g</span>}
              {plan.fat&&<span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium">F: {plan.fat}g</span>}
              {plan.calories&&<span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">🔥 {plan.calories} kcal</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={e=>{e.stopPropagation();onDelete(plan.id);}} className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg"><Trash2 className="w-4 h-4"/></button>
            {expanded?<ChevronDown className="w-4 h-4 text-gray-400"/>:<ChevronRight className="w-4 h-4 text-gray-400"/>}
          </div>
        </div>
      </div>
      {expanded&&plan.meal_sections?.length>0&&(
        <div className="border-t border-gray-50">
          {plan.meal_sections.map(section=>(
            <div key={section.section_name}>
              <div className="px-5 py-2 bg-gray-50 flex items-center gap-2"><span className="text-sm font-semibold text-gray-700">{section.section_name}</span><span className="text-xs text-gray-400">{section.time}</span></div>
              <div className="divide-y divide-gray-50">
                {section.options?.map(opt=>(
                  <div key={opt.name} className="px-5 py-3 flex items-start justify-between gap-3">
                    <div className="flex-1"><p className="text-sm font-medium text-gray-900">{opt.name}</p><p className="text-xs text-gray-500 mt-0.5">{opt.description}</p><p className="text-xs text-gray-400 mt-1 italic">{opt.ingredients}</p></div>
                    <div className="text-right text-xs flex-shrink-0">
                      <p className="font-semibold text-gray-800">{opt.calories} kcal</p>
                      <p className="text-gray-400">P:{opt.protein}g C:{opt.carbs}g F:{opt.fat}g</p>
                      <RecipeLink opt={opt} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Nutrition() {
  const [plans, setPlans] = useState([]);
  const [clients, setClients] = useState([]);
  const [filterClient, setFilterClient] = useState('');
  const [showWizard, setShowWizard] = useState(false);

  const load = async () => {
    const [p,c] = await Promise.all([db.NutritionPlan.list('-date',100), db.Client.list('name')]);
    setPlans(p); setClients(c);
  };
  useEffect(()=>{load();},[]);

  if (showWizard) return <AIWizard clients={clients} onPlanCreated={load} onClose={()=>setShowWizard(false)}/>;

  const filtered = filterClient?plans.filter(p=>p.client_id===filterClient):plans;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Nutrition Plans</h1><p className="text-gray-400 text-sm mt-1">{plans.length} plans</p></div>
        <button onClick={()=>setShowWizard(true)} className="flex items-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-600 shadow-sm">
          <Sparkles className="w-4 h-4"/> AI Wizard — Create Plan
        </button>
      </div>
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={()=>setFilterClient('')} className={`px-3 py-1.5 rounded-xl text-sm font-medium ${!filterClient?'bg-gray-900 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All</button>
        {clients.map(c=><button key={c.id} onClick={()=>setFilterClient(c.id)} className={`px-3 py-1.5 rounded-xl text-sm font-medium ${filterClient===c.id?'bg-gray-900 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{c.name}</button>)}
      </div>
      <div className="space-y-4">
        {filtered.map(p=><PlanCard key={p.id} plan={p} onDelete={async id=>{await db.NutritionPlan.delete(id);load();}}/>)}
        {filtered.length===0&&<div className="text-center py-20 text-gray-400"><Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30"/><p className="font-medium">No nutrition plans yet</p><p className="text-sm mt-1">Click AI Wizard to create your first plan</p></div>}
      </div>
    </div>
  );
}
