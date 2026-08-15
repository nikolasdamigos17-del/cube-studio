import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { Trash2, X, Sparkles, ChevronRight, ChevronDown, ExternalLink, Loader2, Check, AlertCircle, Pencil, RotateCcw, Plus, Minus, ArrowLeft, Users, ClipboardList, CalendarClock, Lock, Search } from 'lucide-react';
import { db, callAI } from '../lib/db';
import { addCredit, getBalance } from '../lib/credits';

const MEAL_TYPES = [
  { id:'breakfast', label:'Breakfast', emoji:'🌅', time:'08:00' },
  { id:'snack1',    label:'Morning Snack', emoji:'🍎', time:'10:30' },
  { id:'lunch',     label:'Lunch', emoji:'☀️', time:'13:00' },
  { id:'snack2',    label:'Afternoon Snack', emoji:'🥜', time:'16:00' },
  { id:'dinner',    label:'Dinner', emoji:'🌙', time:'19:30' },
];

const COMMON_SUPPLEMENTS = [
  'Whey Protein','Creatine Monohydrate','Omega-3 Fish Oil','Vitamin D3','Magnesium','Zinc',
  'Multivitamin','BCAAs','Caffeine','Beta-Alanine','Glutamine','Collagen','Vitamin C','B12',
];

const TIMINGS = ['Morning (fasted)','With breakfast','Pre-workout','Post-workout','With lunch','With dinner','Before bed'];

// ── AI Wizard ──────────────────────────────────────────────────────────────────
function AIWizard({ clients, onPlanCreated, onClose }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [answers, setAnswers] = useState({
    clientId:'', clientName:'', calories:'', protein:'',
    selectedMeals:['breakfast','lunch','dinner'],
    proteins:[], breakfastFoods:[], notes:''
  });
  const [waterLiters, setWaterLiters] = useState(2.5);
  const [supplements, setSupplements] = useState([]);
  const [suppSearch, setSuppSearch] = useState('');
  const [suggestedFoods, setSuggestedFoods] = useState([]);
  const [rejectedFoods, setRejectedFoods] = useState([]);
  const [editingFood, setEditingFood] = useState(null);
  const [editInstruction, setEditInstruction] = useState('');
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [err, setErr] = useState('');

  const STEPS = ['Client','Meals','Foods','Water & Supps','Review','Final Plan'];
  const set = (k,v) => setAnswers(p=>({...p,[k]:v}));
  const toggle = (k,val) => setAnswers(p=>({...p,[k]:p[k].includes(val)?p[k].filter(x=>x!==val):[...p[k],val]}));
  const mealCounts = { breakfast:5, snack1:3, lunch:7, snack2:3, dinner:7 };

  const addSupplement = (name) => {
    if (supplements.find(s=>s.name===name)) return;
    setSupplements(p=>[...p,{ name, quantity:'', timing:'Morning (fasted)' }]);
    setSuppSearch('');
  };
  const updateSupp = (i,k,v) => setSupplements(p=>p.map((s,idx)=>idx===i?{...s,[k]:v}:s));
  const removeSupp = (i) => setSupplements(p=>p.filter((_,idx)=>idx!==i));

  const parseJSON = (text) => {
    let c = text.trim().replace(/^```json?\s*/i,'').replace(/\s*```$/,'').trim();
    const a1=c.indexOf('['),z1=c.lastIndexOf(']');
    const a2=c.indexOf('{'),z2=c.lastIndexOf('}');
    if (a1!==-1&&(a2===-1||a1<a2)) return JSON.parse(c.slice(a1,z1+1));
    return JSON.parse(c.slice(a2,z2+1));
  };

  const handleErr = (result) => {
    if (!result||result.startsWith('__ERROR__')||!result.trim()) {
      setErr('AI request failed. Please check your internet and try again.'); return false;
    }
    return true;
  };

  const generateFoodSuggestions = async () => {
    setLoading(true); setErr('');
    setLoadingMsg('Generating meal suggestions...');
    const suppSummary = supplements.map(s=>`${s.name} ${s.quantity} (${s.timing})`).join(', ');
    const total = answers.selectedMeals.reduce((s,m)=>s+(mealCounts[m]||4),0);
    const prompt = `You are a creative nutrition expert. Generate ${total} specific, appetizing meal options.
Daily targets: ${answers.calories} kcal, ${answers.protein}g protein
Meals needed: ${answers.selectedMeals.map(m=>`${m} (${mealCounts[m]||4} options)`).join(', ')}
Preferred proteins: ${answers.proteins.length?answers.proteins.join(', '):'any'}
Breakfast preferences: ${answers.breakfastFoods.length?answers.breakfastFoods.join(', '):'any'}
Supplements (adjust calories accordingly): ${suppSummary||'none'}
Notes/restrictions: ${answers.notes||'none'}
RULES: Be creative. Only use preferred proteins. Each dish must be a complete, named meal.
Return ONLY a JSON array:
[{"name":"Honey Garlic Chicken Bowl","meal_type":"lunch","ingredients":"200g chicken breast, 150g rice, broccoli, honey, garlic","calories":560}]`;
    const result = await callAI(prompt,'Return ONLY a valid JSON array. No markdown. Start with [');
    if (!handleErr(result)){setLoading(false);return;}
    try {
      const parsed = parseJSON(result);
      if (!Array.isArray(parsed)||!parsed.length) throw new Error('empty');
      setSuggestedFoods(parsed); setStep(4);
    } catch(e){ setErr('Could not parse response. Please try again.'); }
    setLoading(false);
  };

  const applyEdit = async (food, instruction) => {
    setLoading(true); setLoadingMsg(`Updating "${food.name}"...`);
    const r = await callAI(
      `Modify this recipe: Name: ${food.name}, Ingredients: ${food.ingredients}, Calories: ${food.calories}kcal, Meal type: ${food.meal_type}. Instruction: "${instruction}". Return ONLY JSON: {"name":"...","meal_type":"...","ingredients":"...","calories":number}`,
      'Return ONLY valid JSON object. No markdown.'
    );
    if (handleErr(r)) {
      try { const u=parseJSON(r); setSuggestedFoods(p=>p.map(f=>f.name===food.name?{...f,...u}:f)); setEditingFood(null); setEditInstruction(''); } catch{}
    }
    setLoading(false);
  };

  const generateFinalPlan = async () => {
    setLoading(true); setErr('');
    setLoadingMsg('Building your nutrition plan...');
    const approved = suggestedFoods.filter(f=>!rejectedFoods.includes(f.name));
    const mealGroups = {};
    answers.selectedMeals.forEach(m=>{mealGroups[m]=[];});
    approved.forEach(f=>{
      const mt=(f.meal_type||'').toLowerCase().replace(/\s+/g,'');
      const match=answers.selectedMeals.find(m=>mt.includes(m.replace(/\d/,''))||m.replace(/\d/,'').includes(mt)||mt===m);
      const key=match||answers.selectedMeals[0];
      if(mealGroups[key]) mealGroups[key].push(f);
      else mealGroups[answers.selectedMeals[0]].push(f);
    });

    const suppSummary = supplements.map(s=>`${s.name} ${s.quantity} (${s.timing})`).join(', ');
    const clientName = answers.clientName || clients.find(c=>c.id===answers.clientId)?.name || 'Client';

    // Build plan directly from approved foods - only ask AI for macros/descriptions
    const foodList = approved.map(f=>`${f.name} (${f.meal_type}): ${f.ingredients}`).join(' | ');
    const prompt = `For each meal listed, provide: description (1 sentence), protein_g, carbs_g, fat_g, and a recipe_url (use https://www.allrecipes.com/search?q=FOOD+NAME format).
Meals: ${foodList}
Daily targets: ${answers.calories}kcal, ${answers.protein}g protein
Return ONLY a JSON array - one object per meal:
[{"name":"exact dish name","description":"one sentence","protein_g":45,"carbs_g":60,"fat_g":12,"recipe_url":"https://www.allrecipes.com/search?q=chicken+rice+bowl"}]`;

    setLoadingMsg('Calculating macros...');
    const result = await callAI(prompt,'Return ONLY a valid JSON array. No markdown. Start with [');
    
    let macroData = [];
    if (handleErr(result)) {
      try { macroData = parseJSON(result); } catch(e) { console.warn('macro parse failed',e); }
    }

    // Build plan locally — never fails even if AI parse fails
    const plan = {
      title: `${clientName} — Nutrition Plan (${answers.calories} kcal)`,
      calories: parseInt(answers.calories)||2000,
      protein: parseInt(answers.protein)||150,
      carbs: Math.round((parseInt(answers.calories)||2000)*0.4/4),
      fat: Math.round((parseInt(answers.calories)||2000)*0.25/9),
      notes: `${answers.calories} kcal/day · ${answers.protein}g protein target${suppSummary?` · Supplements: ${suppSummary}`:''}`,
      water_liters_daily: waterLiters,
      supplements: supplements.filter(s=>s.name),
      meal_sections: answers.selectedMeals.map(m=>{
        const mt = MEAL_TYPES.find(x=>x.id===m);
        const foods = mealGroups[m]||[];
        return {
          section_name: mt?.label||m,
          time: mt?.time||'12:00',
          options: foods.map(food=>{
            const macro = macroData.find(md=>md.name===food.name||md.name?.toLowerCase().includes(food.name.toLowerCase().slice(0,10)));
            const q = food.name.replace(/\s+/g,'+');
            return {
              name: food.name,
              description: macro?.description||`${food.name} — a nutritious and delicious option.`,
              ingredients: food.ingredients||'',
              calories: food.calories||400,
              protein: macro?.protein_g||Math.round((food.calories||400)*0.25/4),
              carbs: macro?.carbs_g||Math.round((food.calories||400)*0.45/4),
              fat: macro?.fat_g||Math.round((food.calories||400)*0.3/9),
              recipe_url: macro?.recipe_url||`https://www.allrecipes.com/search?q=${q}`,
            };
          }),
        };
      }).filter(s=>s.options.length>0),
    };

    setGeneratedPlan(plan);
    setStep(5);
    setLoading(false);
  };

  const savePlan = async () => {
    if (!generatedPlan) return;
    const client = clients.find(c=>c.id===answers.clientId);
    await db.NutritionPlan.create({
      ...generatedPlan,
      client_id: answers.clientId||'',
      client_name: answers.clientName||client?.name||'',
      date: format(new Date(),'yyyy-MM-dd'),
    });
    onPlanCreated(); onClose();
  };

  const filteredSupps = COMMON_SUPPLEMENTS.filter(s=>
    s.toLowerCase().includes(suppSearch.toLowerCase())&&!supplements.find(x=>x.name===s)
  );

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
        <div className="flex gap-1 mb-8">{STEPS.map((_,i)=><div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i<=step?'bg-amber-500':'bg-gray-200'}`}/>)}</div>
        {err&&<div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5 flex items-start gap-2 text-sm text-red-700"><AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5"/><div className="flex-1">{err}</div><button onClick={()=>setErr('')} className="text-xs underline">Dismiss</button></div>}

        {/* STEP 0 — Client */}
        {step===0&&(
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 text-lg mb-5">Client & Goals</h2>
            <div className="space-y-4">
              <div><label className="section-label">Client *</label>
                <select value={answers.clientId} onChange={e=>{const c=clients.find(c=>c.id===e.target.value);setAnswers(p=>({...p,clientId:e.target.value,clientName:c?.name||''}));}} className="input-base mt-1">
                  <option value="">Choose a client...</option>
                  {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value="custom">Other / Custom</option>
                </select>
                {answers.clientId==='custom'&&<input className="input-base mt-2" placeholder="Client name" value={answers.clientName} onChange={e=>set('clientName',e.target.value)}/>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="section-label">Daily Calories *</label><input type="number" value={answers.calories} onChange={e=>set('calories',e.target.value)} placeholder="e.g. 2200" className="input-base mt-1"/></div>
                <div><label className="section-label">Daily Protein (g) *</label><input type="number" value={answers.protein} onChange={e=>set('protein',e.target.value)} placeholder="e.g. 160" className="input-base mt-1"/></div>
              </div>
            </div>
            <button disabled={!answers.calories||!answers.protein||!answers.clientId} onClick={()=>setStep(1)} className="btn btn-primary w-full mt-6 py-3">Continue <ChevronRight className="w-4 h-4"/></button>
          </div>
        )}

        {/* STEP 1 — Meal Types */}
        {step===1&&(
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 text-lg mb-5">Meal Types</h2>
            <div className="space-y-2">
              {MEAL_TYPES.map(m=>(
                <button key={m.id} onClick={()=>toggle('selectedMeals',m.id)} className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${answers.selectedMeals.includes(m.id)?'border-amber-400 bg-amber-50':'border-gray-100 hover:border-gray-200'}`}>
                  <div className="flex items-center gap-3"><span className="text-2xl">{m.emoji}</span><div className="text-left"><p className="font-medium text-gray-900">{m.label}</p><p className="text-xs text-gray-400">{m.time} · {mealCounts[m.id]||4} options generated</p></div></div>
                  {answers.selectedMeals.includes(m.id)&&<Check className="w-5 h-5 text-amber-500"/>}
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={()=>setStep(0)} className="btn btn-secondary flex-1">Back</button>
              <button disabled={!answers.selectedMeals.length} onClick={()=>setStep(2)} className="btn btn-primary flex-1 py-3">Continue <ChevronRight className="w-4 h-4"/></button>
            </div>
          </div>
        )}

        {/* STEP 2 — Food Preferences */}
        {step===2&&(
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 text-lg mb-5">Food Preferences</h2>
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Preferred proteins</p>
                <p className="text-xs text-gray-400 mb-2">AI will ONLY use proteins you select</p>
                <div className="flex flex-wrap gap-2">
                  {['Chicken','Beef','Pork','Fish','Salmon','Tuna','Turkey','Eggs','Shrimp','Lamb','Tofu','Legumes'].map(p=>(
                    <button key={p} onClick={()=>toggle('proteins',p)} className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${answers.proteins.includes(p)?'bg-amber-500 text-white border-amber-500':'border-gray-200 text-gray-600 hover:border-amber-300'}`}>{p}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Breakfast & snack favorites</p>
                <div className="flex flex-wrap gap-2">
                  {['Eggs','Oatmeal','Greek Yogurt','Toast','Smoothie','Avocado','Granola','Fruit','Cottage Cheese','Pancakes','Nuts','Rice Cakes'].map(f=>(
                    <button key={f} onClick={()=>toggle('breakfastFoods',f)} className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${answers.breakfastFoods.includes(f)?'bg-amber-500 text-white border-amber-500':'border-gray-200 text-gray-600 hover:border-amber-300'}`}>{f}</button>
                  ))}
                </div>
              </div>
              <div><label className="section-label">Notes / Dislikes / Allergies</label><textarea value={answers.notes} onChange={e=>set('notes',e.target.value)} rows={2} placeholder="e.g. No dairy, allergic to nuts..." className="input-base mt-1 resize-none"/></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={()=>setStep(1)} className="btn btn-secondary flex-1">Back</button>
              <button onClick={()=>setStep(3)} className="btn btn-primary flex-1 py-3">Continue <ChevronRight className="w-4 h-4"/></button>
            </div>
          </div>
        )}

        {/* STEP 3 — Water & Supplements */}
        {step===3&&(
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 text-lg mb-5">💧 Water & 💊 Supplements</h2>
            <div className="space-y-6">
              {/* Water */}
              <div>
                <label className="section-label">Daily Water Target</label>
                <div className="flex items-center gap-4 mt-2">
                  <button onClick={()=>setWaterLiters(v=>Math.max(0.5,parseFloat((v-0.25).toFixed(2))))} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50"><Minus className="w-4 h-4"/></button>
                  <div className="flex-1 text-center">
                    <p className="text-3xl font-bold text-blue-500" style={{fontFamily:'var(--font-display)'}}>{waterLiters}L</p>
                    <p className="text-xs text-gray-400">per day</p>
                  </div>
                  <button onClick={()=>setWaterLiters(v=>Math.min(6,parseFloat((v+0.25).toFixed(2))))} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50"><Plus className="w-4 h-4"/></button>
                </div>
                <input type="range" min="0.5" max="6" step="0.25" value={waterLiters} onChange={e=>setWaterLiters(parseFloat(e.target.value))} className="w-full mt-3 accent-blue-500"/>
                <p className="text-xs text-gray-400 mt-1 text-center">Standard: 2–3L · Active training: 3–4L · Intense: 4–5L</p>
              </div>
              {/* Supplements */}
              <div>
                <label className="section-label">Supplements</label>
                {/* Search & add */}
                <div className="relative mb-3">
                  <input value={suppSearch} onChange={e=>setSuppSearch(e.target.value)} placeholder="Search or type supplement name..." className="input-base mt-1"/>
                  {suppSearch&&(
                    <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {filteredSupps.slice(0,8).map(s=><button key={s} onMouseDown={()=>addSupplement(s)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">{s}</button>)}
                      {!filteredSupps.find(s=>s.toLowerCase()===suppSearch.toLowerCase())&&(
                        <button onMouseDown={()=>addSupplement(suppSearch)} className="w-full text-left px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 font-medium">+ Add "{suppSearch}" as custom</button>
                      )}
                    </div>
                  )}
                </div>
                {/* Quick picks */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {['Whey Protein','Creatine','Omega-3','Vitamin D3','Magnesium'].filter(s=>!supplements.find(x=>x.name===s)).map(s=>(
                    <button key={s} onClick={()=>addSupplement(s)} className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:border-amber-400 hover:text-amber-600 transition-colors">+ {s}</button>
                  ))}
                </div>
                {/* Added supplements */}
                {supplements.length>0&&(
                  <div className="space-y-2">
                    {supplements.map((s,i)=>(
                      <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-900">💊 {s.name}</span>
                          <button onClick={()=>removeSupp(i)} className="text-red-400 hover:text-red-500"><X className="w-4 h-4"/></button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><label className="text-xs text-gray-400">Quantity</label><input value={s.quantity} onChange={e=>updateSupp(i,'quantity',e.target.value)} placeholder="e.g. 30g, 5g, 1 cap" className="input-base text-xs py-1.5 mt-0.5"/></div>
                          <div><label className="text-xs text-gray-400">Timing</label>
                            <select value={s.timing} onChange={e=>updateSupp(i,'timing',e.target.value)} className="input-base text-xs py-1.5 mt-0.5">
                              {TIMINGS.map(t=><option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!supplements.length&&<p className="text-sm text-gray-400 text-center py-3">No supplements added. Search above or click quick picks.</p>}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={()=>setStep(2)} className="btn btn-secondary flex-1">Back</button>
              <button onClick={generateFoodSuggestions} disabled={loading} className="btn btn-primary flex-1 py-3 bg-amber-500 hover:bg-amber-600">
                {loading?<><Loader2 className="w-4 h-4 animate-spin"/>{loadingMsg}</>:<>Generate Food List <ChevronRight className="w-4 h-4"/></>}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 — Review Foods */}
        {step===4&&(
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 text-lg mb-1">Review Foods</h2>
            <p className="text-sm text-gray-500 mb-4"><span className="text-red-500 font-medium">Tap</span> to reject · <span className="text-blue-500 font-medium">✏️</span> to edit</p>
            {editingFood&&(
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
                <p className="text-xs font-semibold text-blue-800 mb-1">Editing: <strong>{editingFood.name}</strong></p>
                <textarea autoFocus value={editInstruction} onChange={e=>setEditInstruction(e.target.value)} rows={2} placeholder="e.g. Remove potatoes, add more chicken, keep same calories" className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm outline-none resize-none bg-white"/>
                <div className="flex gap-2 mt-2">
                  <button onClick={()=>{setEditingFood(null);setEditInstruction('');}} className="flex-1 border border-gray-200 rounded-lg py-1.5 text-xs text-gray-600">Cancel</button>
                  <button onClick={()=>applyEdit(editingFood,editInstruction)} disabled={loading||!editInstruction.trim()} className="flex-1 bg-blue-500 text-white rounded-lg py-1.5 text-xs font-medium disabled:opacity-40">{loading?<Loader2 className="w-3 h-3 animate-spin mx-auto"/>:'Apply'}</button>
                </div>
              </div>
            )}
            <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-1 mb-4">
              {suggestedFoods.map(food=>{
                const rejected=rejectedFoods.includes(food.name);
                return (
                  <div key={food.name} className={`relative rounded-xl border-2 transition-all ${rejected?'border-red-200 bg-red-50 opacity-50':'border-gray-100 bg-gray-50'} ${editingFood?.name===food.name?'border-blue-300':''}`}>
                    <div className="flex items-start gap-2 p-3 cursor-pointer" onClick={()=>setRejectedFoods(p=>p.includes(food.name)?p.filter(x=>x!==food.name):[...p,food.name])}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap"><span className="badge badge-gray text-[10px] capitalize">{food.meal_type}</span><span className={`text-sm font-semibold ${rejected?'line-through text-gray-400':'text-gray-900'}`}>{food.name}</span>{rejected&&<span className="text-xs text-red-500 font-medium">✗</span>}</div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{food.ingredients}</p>
                      </div>
                      <span className="text-xs font-semibold text-gray-600 flex-shrink-0">{food.calories} kcal</span>
                    </div>
                    {!rejected&&<button onClick={e=>{e.stopPropagation();setEditingFood(food);setEditInstruction('');}} className={`absolute top-2 right-10 p-1.5 rounded-lg ${editingFood?.name===food.name?'bg-blue-100 text-blue-600':'text-gray-400 hover:text-blue-500 hover:bg-blue-50'}`}><Pencil className="w-3 h-3"/></button>}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-400">{rejectedFoods.length} excluded · {suggestedFoods.length-rejectedFoods.length} approved</p>
              {rejectedFoods.length>0&&<button onClick={()=>setRejectedFoods([])} className="text-xs text-amber-600 underline flex items-center gap-1"><RotateCcw className="w-3 h-3"/>Restore all</button>}
            </div>
            <div className="flex gap-3">
              <button onClick={()=>setStep(3)} className="btn btn-secondary flex-1">Back</button>
              <button onClick={generateFinalPlan} disabled={loading||suggestedFoods.length-rejectedFoods.length<1} className="btn btn-primary flex-1 py-3 bg-amber-500 hover:bg-amber-600">
                {loading?<><Loader2 className="w-4 h-4 animate-spin"/>{loadingMsg}</>:<>Build Plan <ChevronRight className="w-4 h-4"/></>}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5 — Final Plan */}
        {step===5&&generatedPlan&&(
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4"><span className="text-3xl">🎉</span><div><h2 className="font-bold text-gray-900 text-lg">Plan Ready!</h2><p className="text-sm text-gray-500">{generatedPlan.title}</p></div></div>
            <div className="flex gap-2 flex-wrap mb-5">
              {[['🔥',generatedPlan.calories,'kcal','bg-amber-50 text-amber-700'],['💪',generatedPlan.protein,'g P','bg-green-50 text-green-700'],['🌾',generatedPlan.carbs,'g C','bg-blue-50 text-blue-700'],['🥑',generatedPlan.fat,'g F','bg-red-50 text-red-700'],['💧',generatedPlan.water_liters_daily,'L water','bg-sky-50 text-sky-700']].map(([e,v,l,cls])=>v&&<span key={l} className={`text-xs px-3 py-1.5 rounded-full font-semibold ${cls}`}>{e} {v}{l}</span>)}
            </div>
            {generatedPlan.supplements?.length>0&&(
              <div className="mb-4 bg-purple-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-purple-700 mb-2">💊 Supplements</p>
                <div className="flex flex-wrap gap-1.5">{generatedPlan.supplements.map((s,i)=><span key={i} className="text-xs bg-white text-purple-700 border border-purple-200 px-2.5 py-1 rounded-full">{s.name} {s.quantity} · {s.timing}</span>)}</div>
              </div>
            )}
            <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
              {generatedPlan.meal_sections?.map(section=>(
                <div key={section.section_name} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="bg-amber-50 px-4 py-2.5 flex items-center justify-between"><div className="flex items-center gap-2"><span className="font-semibold text-gray-900 text-sm">{section.section_name}</span><span className="text-xs text-gray-400">{section.time}</span></div><span className="text-xs text-amber-700 font-medium">{section.options?.length} options</span></div>
                  {section.options?.map(opt=>(
                    <div key={opt.name} className="px-4 py-3 border-t border-gray-50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1"><p className="text-sm font-semibold text-gray-900">{opt.name}</p><p className="text-xs text-gray-500 mt-0.5">{opt.description}</p><p className="text-xs text-gray-400 mt-1 italic">{opt.ingredients}</p></div>
                        <div className="text-right text-xs flex-shrink-0"><p className="font-bold text-gray-800">{opt.calories} kcal</p><p className="text-gray-400">P:{opt.protein}g C:{opt.carbs}g F:{opt.fat}g</p>{opt.recipe_url&&<a href={opt.recipe_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-500 mt-1"><ExternalLink className="w-3 h-3"/>Recipe</a>}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={()=>setStep(4)} className="btn btn-secondary flex-1">← Revise</button>
              <button onClick={savePlan} className="btn btn-primary flex-1 py-3">Save to Client ✓</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Plan Card ────────────────────────────────────────────────────────────────
function PlanCard({ plan, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="card hover:shadow-sm transition-shadow">
      <div className="p-5 cursor-pointer" onClick={()=>setExpanded(v=>!v)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="font-semibold text-foreground">{plan.title}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{plan.client_name||'—'} · {plan.date}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {plan.protein&&<span className="badge badge-green">P: {plan.protein}g</span>}
              {plan.carbs&&<span className="badge badge-blue">C: {plan.carbs}g</span>}
              {plan.fat&&<span className="badge badge-red">F: {plan.fat}g</span>}
              {plan.calories&&<span className="badge badge-amber">🔥 {plan.calories} kcal</span>}
              {plan.water_liters_daily&&<span className="badge" style={{background:'#e0f2fe',color:'#0369a1'}}>💧 {plan.water_liters_daily}L</span>}
            </div>
            {plan.supplements?.length>0&&<div className="flex flex-wrap gap-1 mt-2">{plan.supplements.map((s,i)=><span key={i} className="badge" style={{background:'#f3e8ff',color:'#7c3aed'}}>💊 {s.name}</span>)}</div>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={e=>{e.stopPropagation();onDelete(plan.id);}} className="btn-ghost btn-icon hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
            {expanded?<ChevronDown className="w-4 h-4 text-muted-foreground"/>:<ChevronRight className="w-4 h-4 text-muted-foreground"/>}
          </div>
        </div>
      </div>
      {expanded&&plan.meal_sections?.length>0&&(
        <div className="border-t border-border">
          {plan.meal_sections.map(section=>(
            <div key={section.section_name}>
              <div className="px-5 py-2 bg-muted/40 flex items-center gap-2"><span className="text-sm font-semibold text-foreground">{section.section_name}</span><span className="text-xs text-muted-foreground">{section.time}</span></div>
              {section.options?.map(opt=>(
                <div key={opt.name} className="px-5 py-3 border-t border-border flex items-start justify-between gap-3">
                  <div className="flex-1"><p className="text-sm font-medium text-foreground">{opt.name}</p><p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p><p className="text-xs text-muted-foreground mt-1 italic">{opt.ingredients}</p></div>
                  <div className="text-right text-xs flex-shrink-0"><p className="font-semibold text-foreground">{opt.calories} kcal</p><p className="text-muted-foreground">P:{opt.protein}g C:{opt.carbs}g F:{opt.fat}g</p>{opt.recipe_url&&<a href={opt.recipe_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-500 mt-1 text-xs"><ExternalLink className="w-3 h-3"/>Recipe</a>}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
/* ═══════════════ NUTRITION CENTER ═══════════════ */

const hasNutritionSvc = (c) => c.services==='nutrition_only' || c.services==='personal_training_nutrition' || c.services==='group_training_nutrition';
const GOAL_LABELS = { fat_loss:'Απώλεια λίπους', muscle_gain:'Μυϊκή ανάπτυξη', recomp:'Ανασύνθεση', maintain:'Συντήρηση / Υγεία', performance:'Απόδοση' };
const FLAG_LABELS = { vegetarian:'Vegetarian', vegan:'Vegan', lactose_free:'Lactose-free', nut_allergy:'Χωρίς ξηρούς καρπούς' };
const SLOT_LABELS = { breakfast:'Πρωινό', snack1:'Δεκατιανό', lunch:'Μεσημεριανό', snack2:'Απογ. σνακ', dinner:'Βραδινό', preworkout:'Pre-workout', postworkout:'Post-workout' };

/* ── Επιβεβαίωση χρέωσης μετά από nutrition meeting ── */
function DeductModal({ fm, onDone }) {
  const [phase, setPhase] = useState('ask'); // ask | done
  const [left, setLeft] = useState(null);
  const yes = async () => {
    await addCredit(fm.client_id, 'nutrition', -1, 'meeting', fm.meeting_id, '');
    const b = await getBalance(fm.client_id);
    setLeft(b.nutrition); setPhase('done');
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-5">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
        {phase === 'ask' ? (
          <>
            <div className="text-3xl mb-2">🥗</div>
            <p className="font-bold text-foreground mb-1">Ολοκληρώθηκε διατροφική συνάντηση με {fm.client_name}</p>
            <p className="text-sm text-muted-foreground mb-5">Αφαίρεση 1 διατροφικής από το υπόλοιπό του;</p>
            <div className="flex gap-2">
              <button onClick={onDone} className="flex-1 btn btn-secondary">Όχι</button>
              <button onClick={yes} className="flex-1 btn btn-primary">Ναι, αφαίρεση</button>
            </div>
          </>
        ) : (
          <>
            <div className="w-11 h-11 mx-auto mb-3 rounded-full bg-green-500 flex items-center justify-center text-white text-xl">✓</div>
            <p className="font-bold text-foreground mb-1">Αφαιρέθηκε.</p>
            <p className="text-sm text-muted-foreground mb-5">Νέο υπόλοιπο: <b className="text-foreground">{left} διατροφικές συναντήσεις</b></p>
            <button onClick={onDone} className="btn btn-primary w-full">Εντάξει</button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Nutrition() {
  const navigate = useNavigate();
  const location = useLocation();
  const [finMtg, setFinMtg] = useState(null);
  useEffect(() => {
    const fm = location.state?.finishedMeeting;
    if (fm) { setFinMtg(fm); navigate('/Nutrition', { replace: true }); }
  }, [location.state]); // eslint-disable-line
  const [plans, setPlans] = useState([]);
  const [clients, setClients] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [sel, setSel] = useState(null);
  const [search, setSearch] = useState('');
  const [showWizard, setShowWizard] = useState(false);

  const load = async () => {
    const [p, c, pr, m] = await Promise.all([
      db.NutritionPlan.list('-date', 200),
      db.Client.list('name'),
      db.NutritionProfile.list('-updated_date', 300),
      db.NutritionMeeting.list('-date', 300),
    ]);
    setPlans(p); setClients(c); setProfiles(pr); setMeetings(m);
  };
  useEffect(()=>{ load(); },[]);

  const nutriClients = clients.filter(hasNutritionSvc);
  const profOf   = (id) => profiles.find(p=>p.client_id===id);
  const ordersOf = (id) => meetings.filter(m=>m.client_id===id && m.status==='ordered');
  const plansOf  = (id) => plans.filter(p=>p.client_id===id);

  if (showWizard) return <AIWizard clients={nutriClients} onPlanCreated={load} onClose={()=>setShowWizard(false)}/>;

  const client = sel ? clients.find(c=>c.id===sel) : null;

  /* ─────────── ΦΑΚΕΛΟΣ ΠΕΛΑΤΗ ─────────── */
  if (client) {
    const prof = profOf(client.id);
    const setupDone = !!prof?.setup_completed;
    const orders = ordersOf(client.id);
    const cPlans = plansOf(client.id);
    const excludedTotal = (prof?.excluded_ingredients?.length||0) + (prof?.excluded_auto?.length||0);
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto animate-fade-in">
        {finMtg && <DeductModal fm={finMtg} onDone={()=>setFinMtg(null)}/>}
        <button onClick={()=>setSel(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5"><ArrowLeft className="w-4 h-4"/> Nutrition Center</button>

        <div className="flex items-center gap-4 mb-7">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl" style={{backgroundColor:client.theme_color||'#6366f1'}}>{client.name?.charAt(0)}</div>
          <div className="flex-1">
            <h1 className="page-title">{client.name}</h1>
            <p className="page-subtitle">{client.nutrition_meetings_per_month||'—'} διατροφικές συναντήσεις / μήνα{client.monthly_price?` · €${client.monthly_price}/μήνα`:''}</p>
          </div>
          {setupDone
            ? <span className="badge badge-green">Course Planning ✓</span>
            : <span className="badge" style={{background:'rgba(245,158,11,0.12)',color:'#d97706'}}>Εκκρεμεί Course Planning</span>}
        </div>

        {/* Προφίλ / Course Planning */}
        <div className="card p-5 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center"><ClipboardList className="w-4.5 h-4.5 text-amber-500" style={{width:18,height:18}}/></div>
              <div>
                <p className="font-semibold text-foreground">Πλάνο πορείας & διατροφικό προφίλ</p>
                <p className="text-sm text-muted-foreground">Στόχος, αποκλεισμοί υλικών, δομή γευμάτων</p>
              </div>
            </div>
            <button onClick={()=>navigate(`/course-planning?client=${client.id}`)} className="btn btn-primary">{setupDone?'Επεξεργασία προφίλ':'Έναρξη Course Planning'}</button>
          </div>
          {setupDone&&(
            <div className="mt-4 pt-4 border-t border-border/60 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Στόχος</p><p className="text-sm font-medium text-foreground">{GOAL_LABELS[prof.goal_type]||'—'}{prof.target_weight?` → ${prof.target_weight}kg`:''}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Προφίλ</p><div className="flex gap-1.5 flex-wrap">{Object.entries(prof.flags||{}).filter(([,v])=>v).map(([k])=><span key={k} className="badge badge-blue">{FLAG_LABELS[k]}</span>)}{!Object.values(prof.flags||{}).some(Boolean)&&<span className="text-sm text-muted-foreground">Χωρίς περιορισμούς</span>}</div></div>
              <div><p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Αποκλεισμένα υλικά</p><p className="text-sm font-medium text-foreground">{excludedTotal}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Γεύματα</p><p className="text-sm font-medium text-foreground">{(prof.meal_slots||[]).map(k=>SLOT_LABELS[k]||k).join(' · ')||'—'}</p></div>
            </div>
          )}
        </div>

        {/* Nutrition Meeting */}
        <div className="card p-5 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center"><Sparkles style={{width:18,height:18}} className="text-indigo-500"/></div>
              <div>
                <p className="font-semibold text-foreground">Nutrition Meeting</p>
                <p className="text-sm text-muted-foreground">Fullscreen συνάντηση: μέτρηση → σύγκριση → επιλογή γευμάτων → επόμενο ραντεβού</p>
              </div>
            </div>
            {setupDone
              ? <button onClick={()=>navigate(`/nutrition-meeting?client=${client.id}`)} className="btn btn-primary">Έναρξη Meeting</button>
              : <button disabled className="btn btn-secondary opacity-50 cursor-not-allowed" title="Χρειάζεται πρώτα Course Planning">Έναρξη Meeting</button>}
          </div>
        </div>

        {/* Εκκρεμείς παραγγελίες διατροφής */}
        <div className="card p-5 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center"><CalendarClock style={{width:18,height:18}} className="text-rose-500"/></div>
            <div>
              <p className="font-semibold text-foreground">Παραγγελίες διατροφής</p>
              <p className="text-sm text-muted-foreground">Meetings που περιμένουν δημιουργία διατροφής</p>
            </div>
          </div>
          {(() => {
            const allOrders = meetings.filter(m => m.client_id===client.id && (m.status==='ordered' || m.status==='plan_created'));
            if (!allOrders.length) return <p className="text-sm text-muted-foreground pl-12">Καμία εκκρεμής παραγγελία.</p>;
            return allOrders.map(o => (
              <div key={o.id} className="flex items-center justify-between gap-3 pl-12 py-2 border-t border-border/50 first:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{o.date} {o.status==='plan_created' && <span className="badge badge-green ml-1">Διατροφή ✓</span>}</p>
                  <p className="text-xs text-muted-foreground">{(o.selected_meals||[]).length} επιλεγμένα γεύματα</p>
                </div>
                {o.status==='ordered'
                  ? <button onClick={()=>navigate(`/plan-creator?client=${client.id}&meeting=${o.id}`)} className="btn btn-primary">Δημιουργία διατροφής</button>
                  : <button onClick={async()=>{ await db.NutritionMeeting.delete(o.id); load(); }} className="btn btn-secondary flex items-center gap-1.5" title="Διαγραφή γευματικών επιλογών (η διατροφή έχει σταλεί)"><Trash2 style={{width:14,height:14}}/> Διαγραφή</button>}
              </div>
            ));
          })()}
        </div>

        {/* Διατροφές */}
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-foreground">Διατροφές ({cPlans.length})</p>
          <button onClick={()=>setShowWizard(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors"><Sparkles className="w-4 h-4"/> Νέα διατροφή (AI Wizard)</button>
        </div>
        <div className="space-y-4">
          {cPlans.map(p=><PlanCard key={p.id} plan={p} onDelete={async id=>{await db.NutritionPlan.delete(id);load();}}/>)}
          {!cPlans.length&&<div className="text-center py-10 text-muted-foreground text-sm">Καμία διατροφή ακόμα.</div>}
        </div>
      </div>
    );
  }

  /* ─────────── ΚΕΝΤΡΙΚΗ ΟΨΗ ─────────── */
  const shown = nutriClients.filter(c=>!search||c.name?.toLowerCase().includes(search.toLowerCase()));
  const pendingSetup  = nutriClients.filter(c=>!profOf(c.id)?.setup_completed).length;
  const pendingOrders = meetings.filter(m=>m.status==='ordered').length;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto animate-fade-in">
        {finMtg && <DeductModal fm={finMtg} onDone={()=>setFinMtg(null)}/>}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <div><h1 className="page-title">Nutrition Center</h1><p className="page-subtitle">{nutriClients.length} πελάτες διατροφής · {pendingSetup} χωρίς Course Planning · {pendingOrders} εκκρεμείς διατροφές</p></div>
      </div>

      <div className="relative my-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Αναζήτηση πελάτη…" className="input-base pl-9"/>
      </div>

      {shown.length===0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30"/>
          <p className="font-medium">Κανένας πελάτης διατροφής</p>
          <p className="text-sm mt-1">Οι πελάτες με πρόγραμμα «Διατροφή» ή «Προπόνηση + Διατροφή» εμφανίζονται εδώ.</p>
        </div>
      ):(
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map(c=>{
            const prof = profOf(c.id);
            const done = !!prof?.setup_completed;
            const ord = ordersOf(c.id).length;
            return (
              <div key={c.id} onClick={()=>setSel(c.id)} className="card p-5 hover:shadow-md transition-all cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0" style={{backgroundColor:c.theme_color||'#6366f1'}}>{c.name?.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{c.nutrition_meetings_per_month||'—'} συναντήσεις / μήνα</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-40 group-hover:opacity-100 flex-shrink-0"/>
                </div>
                <div className="mt-3 flex gap-2 flex-wrap">
                  {!done&&<span className="badge" style={{background:'rgba(245,158,11,0.12)',color:'#d97706'}}>Course Planning εκκρεμεί</span>}
                  {done&&<span className="badge badge-green">Έτοιμος</span>}
                  {ord>0&&<span className="badge" style={{background:'rgba(244,63,94,0.1)',color:'#e11d48'}}>{ord} εκκρεμής διατροφή</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
