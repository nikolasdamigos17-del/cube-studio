import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Printer, Share2, RefreshCw } from 'lucide-react';
import { callAI } from '../lib/db';
import { useLang } from '../lib/LangContext';

export default function RecipePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { lang, tr } = useLang();

  const name        = params.get('name')        || '';
  const ingredients = params.get('ingredients') || '';
  const calories    = params.get('calories')    || '';
  const protein     = params.get('protein')     || '';
  const carbs       = params.get('carbs')       || '';
  const fat         = params.get('fat')         || '';

  const [recipe,  setRecipe]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => { if (name) generateRecipe(); }, [name, lang]);

  const generateRecipe = async () => {
    setLoading(true); setError(false); setRecipe(null);

    const langInstruction = lang === 'el'
      ? 'Write the entire recipe in GREEK (Ελληνικά). All field values must be in Greek.'
      : 'Write the entire recipe in English.';

    const prompt = `You are a professional chef and nutritionist. ${langInstruction}

Write a complete, detailed recipe for: "${name}"
Ingredients available: ${ingredients || 'use common ingredients appropriate for this dish'}
Nutritional targets: ${calories ? `${calories} kcal` : ''} ${protein ? `| ${protein}g protein` : ''} ${carbs ? `| ${carbs}g carbs` : ''} ${fat ? `| ${fat}g fat` : ''}

Return ONLY this JSON (no markdown, no extra text, start with {):
{
  "name": "dish name",
  "description": "2 appetizing sentences about this dish",
  "prep_time": "10 min",
  "cook_time": "20 min",
  "servings": 1,
  "difficulty": "Easy",
  "calories": ${calories || 400},
  "protein": ${protein || 30},
  "carbs": ${carbs || 40},
  "fat": ${fat || 12},
  "ingredients": [
    {"amount": "200g", "item": "chicken breast", "note": "boneless, skinless"}
  ],
  "instructions": [
    {"step": 1, "title": "Step title", "detail": "Detailed instruction for this step."}
  ],
  "tips": ["Tip 1", "Tip 2"],
  "tags": ["High Protein", "Healthy"]
}`;

    const result = await callAI(prompt, 'Return ONLY valid JSON. No markdown. No explanation. Start with {');

    if (!result || result.startsWith('__ERROR__') || !result.trim()) {
      setError(true); setLoading(false); return;
    }

    try {
      let clean = result.trim();
      // Strip markdown code blocks if present
      clean = clean.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
      // Find the JSON object boundaries
      const start = clean.indexOf('{');
      const end   = clean.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('No JSON found');
      clean = clean.slice(start, end + 1);
      const parsed = JSON.parse(clean);
      // Validate minimum structure
      if (!parsed.name || !parsed.ingredients || !parsed.instructions) throw new Error('Incomplete JSON');
      setRecipe(parsed);
    } catch (e) {
      // Fallback recipe
      setRecipe({
        name,
        description: lang === 'el'
          ? `Ένα νόστιμο και θρεπτικό πιάτο ${name} με φρέσκα υλικά.`
          : `A delicious and nutritious ${name} prepared with fresh ingredients.`,
        prep_time: '10 min', cook_time: '20 min', servings: 1, difficulty: lang === 'el' ? 'Εύκολο' : 'Easy',
        calories: parseInt(calories) || 400, protein: parseInt(protein) || 30,
        carbs: parseInt(carbs) || 40, fat: parseInt(fat) || 12,
        ingredients: ingredients
          ? ingredients.split(',').map(i => ({ amount: '', item: i.trim(), note: '' }))
          : [{ amount: '', item: name, note: '' }],
        instructions: [
          { step:1, title: lang==='el'?'Προετοιμασία':'Prepare', detail: lang==='el'?'Μαζέψτε και μετρήστε όλα τα υλικά.':'Gather and measure all ingredients.' },
          { step:2, title: lang==='el'?'Μαγείρεμα':'Cook', detail: lang==='el'?`Ακολουθήστε τυπική προετοιμασία για ${name}.`:`Follow standard preparation for ${name}.` },
          { step:3, title: lang==='el'?'Σερβίρισμα':'Serve', detail: lang==='el'?'Σερβίρετε αμέσως ζεστό.':'Plate and serve immediately while hot.' },
        ],
        tips: lang==='el'
          ? ['Φιλικό για meal prep — αποθηκεύστε έως 3 ημέρες', 'Προσαρμόστε το αλατοπίπερο στη γεύση σας']
          : ['Meal prep friendly — store for up to 3 days', 'Adjust seasoning to taste'],
        tags: lang==='el' ? ['Πλούσιο σε Πρωτεΐνη','Θρεπτικό'] : ['High Protein','Nutritious'],
      });
    }
    setLoading(false);
  };

  const share = async () => {
    const text = recipe
      ? `${recipe.name}\n\n${tr('recipe_ingredients')}:\n${recipe.ingredients?.map(i=>`• ${i.amount} ${i.item}`).join('\n')}\n\n${tr('recipe_instructions')}:\n${recipe.instructions?.map(i=>`${i.step}. ${i.title}: ${i.detail}`).join('\n')}`
      : name;
    if (navigator.share) { try { await navigator.share({ title: recipe?.name, text }); return; } catch {} }
    await navigator.clipboard.writeText(text);
    alert(lang === 'el' ? 'Η συνταγή αντιγράφηκε!' : 'Recipe copied to clipboard!');
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4"/>
        <p className="text-foreground font-medium">{tr('recipe_generating')}</p>
        <p className="text-muted-foreground text-sm mt-1">{tr('recipe_calc')}</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <p className="text-foreground font-medium mb-4">{tr('common_error')}</p>
        <button onClick={generateRecipe} className="btn btn-primary flex items-center gap-2 mx-auto">
          <RefreshCw className="w-4 h-4"/>{tr('common_retry')}
        </button>
      </div>
    </div>
  );

  if (!recipe) return null;

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4"/><span className="text-sm">{tr('recipe_back')}</span>
          </button>
          <div className="flex gap-2">
            <button onClick={generateRecipe} className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
              <RefreshCw className="w-3.5 h-3.5"/>{lang==='el'?'Ανανέωση':'Regenerate'}
            </button>
            <button onClick={share} className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
              <Share2 className="w-3.5 h-3.5"/>{tr('recipe_share')}
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
              <Printer className="w-3.5 h-3.5"/>{tr('recipe_print')}
            </button>
          </div>
        </div>

        {/* Title card */}
        <div className="card p-6 mb-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {recipe.tags?.map(tag => <span key={tag} className="badge badge-amber text-xs">{tag}</span>)}
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2" style={{fontFamily:'var(--font-display)'}}>{recipe.name}</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">{recipe.description}</p>
          <div className="flex gap-4 mt-4 pt-4 border-t border-border flex-wrap">
            {[
              [`⏱ ${tr('recipe_prep')}`, recipe.prep_time],
              [`🍳 ${tr('recipe_cook')}`, recipe.cook_time],
              [`👤 ${tr('recipe_serves')}`, recipe.servings],
              [`📊 ${tr('recipe_level')}`, recipe.difficulty],
            ].map(([l,v]) => (
              <div key={l} className="text-center">
                <p className="text-xs text-muted-foreground">{l}</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Macros */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            ['🔥', recipe.calories, 'kcal', 'bg-amber-50 dark:bg-amber-950/30 text-amber-700'],
            ['💪', `${recipe.protein}g`, lang==='el'?'Πρωτεΐνη':'Protein', 'bg-green-50 dark:bg-green-950/30 text-green-700'],
            ['🌾', `${recipe.carbs}g`, lang==='el'?'Υδατάνθρακες':'Carbs', 'bg-blue-50 dark:bg-blue-950/30 text-blue-700'],
            ['🥑', `${recipe.fat}g`, lang==='el'?'Λίπος':'Fat', 'bg-red-50 dark:bg-red-950/30 text-red-700'],
          ].map(([e,v,l,cls]) => (
            <div key={l} className={`${cls} rounded-2xl p-3 text-center`}>
              <p className="text-lg">{e}</p>
              <p className="font-bold text-sm mt-0.5">{v}</p>
              <p className="text-xs opacity-70">{l}</p>
            </div>
          ))}
        </div>

        {/* Ingredients */}
        <div className="card p-5 mb-4">
          <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <span>🧾</span> {tr('recipe_ingredients')}
          </h2>
          <div className="space-y-2">
            {recipe.ingredients?.map((ing, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-1.5"/>
                <div className="flex-1">
                  <span className="font-semibold text-foreground text-sm">{ing.amount} {ing.item}</span>
                  {ing.note && <span className="text-muted-foreground text-xs ml-1.5">({ing.note})</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="card p-5 mb-4">
          <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <span>👨‍🍳</span> {tr('recipe_instructions')}
          </h2>
          <div className="space-y-4">
            {recipe.instructions?.map(step => (
              <div key={step.step} className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  {step.step}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-sm">{step.title}</p>
                  <p className="text-muted-foreground text-sm mt-1 leading-relaxed">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        {recipe.tips?.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-2xl p-5">
            <h2 className="font-bold text-amber-900 dark:text-amber-400 mb-3 flex items-center gap-2">
              <span>💡</span> {tr('recipe_tips')}
            </h2>
            <div className="space-y-2">
              {recipe.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-amber-500 text-sm">•</span>
                  <p className="text-amber-800 dark:text-amber-300 text-sm">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
