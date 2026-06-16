import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Printer, Share2 } from 'lucide-react';
import { callAI } from '../lib/db';

export default function RecipePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const name = params.get('name') || '';
  const ingredients = params.get('ingredients') || '';
  const calories = params.get('calories') || '';
  const protein = params.get('protein') || '';
  const carbs = params.get('carbs') || '';
  const fat = params.get('fat') || '';

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!name) return;
    generateRecipe();
  }, [name]);

  const generateRecipe = async () => {
    setLoading(true);
    const prompt = `You are a professional chef and nutritionist. Write a complete, detailed recipe for: "${name}"

The dish must use EXACTLY these ingredients with EXACTLY these quantities:
${ingredients}

Nutritional targets:
- Calories: ${calories} kcal
- Protein: ${protein}g
- Carbs: ${carbs}g
- Fat: ${fat}g

Return ONLY a JSON object:
{
  "name": "${name}",
  "description": "2-sentence appetizing description",
  "prep_time": "10 min",
  "cook_time": "20 min",
  "servings": 1,
  "difficulty": "Easy",
  "calories": ${calories||400},
  "protein": ${protein||30},
  "carbs": ${carbs||40},
  "fat": ${fat||12},
  "ingredients": [
    {"amount": "200g", "item": "chicken breast", "note": "boneless, skinless"},
    {"amount": "150g", "item": "brown rice", "note": "dry weight"}
  ],
  "instructions": [
    {"step": 1, "title": "Prepare the chicken", "detail": "Season the chicken breast with salt, pepper and olive oil. Let it rest for 5 minutes."},
    {"step": 2, "title": "Cook the rice", "detail": "Rinse the rice under cold water. Cook in 300ml water for 18 minutes until fluffy."}
  ],
  "tips": ["Tip 1 for best results", "Tip 2 for meal prep"],
  "tags": ["High Protein", "Meal Prep"]
}`;

    const result = await callAI(prompt, 'Return ONLY valid JSON. No markdown. Start with {');
    try {
      let clean = result.trim().replace(/^```json?\s*/i,'').replace(/\s*```$/,'').trim();
      const start = clean.indexOf('{'); const end = clean.lastIndexOf('}');
      clean = clean.slice(start, end+1);
      setRecipe(JSON.parse(clean));
    } catch(e) {
      // Fallback: build recipe from ingredients
      setRecipe({
        name, description: `A delicious and nutritious ${name} prepared with fresh ingredients.`,
        prep_time:'10 min', cook_time:'20 min', servings:1, difficulty:'Easy',
        calories: parseInt(calories)||400, protein: parseInt(protein)||30,
        carbs: parseInt(carbs)||40, fat: parseInt(fat)||12,
        ingredients: (ingredients||'').split(',').map(i=>({ amount:'', item:i.trim(), note:'' })),
        instructions:[{step:1,title:'Prepare ingredients',detail:'Gather and measure all ingredients as listed.'},{step:2,title:'Cook',detail:`Follow standard preparation for ${name}.`},{step:3,title:'Serve',detail:'Plate and serve immediately while hot.'}],
        tips:['Meal prep friendly — store in airtight container for up to 3 days','Adjust seasoning to taste'],
        tags:['High Protein','Nutritious']
      });
    }
    setLoading(false);
  };

  const share = async () => {
    const text = recipe ? `${recipe.name}\n\nIngredients:\n${recipe.ingredients?.map(i=>`• ${i.amount} ${i.item}`).join('\n')}\n\nInstructions:\n${recipe.instructions?.map(i=>`${i.step}. ${i.title}: ${i.detail}`).join('\n')}` : name;
    if (navigator.share) { try { await navigator.share({title: recipe?.name, text}); return; } catch {} }
    await navigator.clipboard.writeText(text);
    alert('Recipe copied to clipboard!');
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4"/>
        <p className="text-gray-600 font-medium">Generating your recipe...</p>
        <p className="text-gray-400 text-sm mt-1">Calculating exact quantities and steps</p>
      </div>
    </div>
  );

  if (!recipe) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={()=>navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4"/><span className="text-sm">Back</span>
          </button>
          <div className="flex gap-2">
            <button onClick={share} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              <Share2 className="w-3.5 h-3.5"/>Share
            </button>
            <button onClick={()=>window.print()} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              <Printer className="w-3.5 h-3.5"/>Print
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {recipe.tags?.map(t=><span key={t} className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-medium">{t}</span>)}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{recipe.name}</h1>
          <p className="text-gray-500 text-sm leading-relaxed">{recipe.description}</p>
          <div className="flex gap-4 mt-4 pt-4 border-t border-gray-50 flex-wrap">
            {[['⏱ Prep',recipe.prep_time],['🍳 Cook',recipe.cook_time],['👤 Serves',recipe.servings],['📊 Level',recipe.difficulty]].map(([l,v])=>(
              <div key={l} className="text-center"><p className="text-xs text-gray-400">{l}</p><p className="text-sm font-semibold text-gray-900 mt-0.5">{v}</p></div>
            ))}
          </div>
        </div>

        {/* Macros */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[['🔥',recipe.calories,'kcal','bg-amber-50 text-amber-700'],['💪',recipe.protein+'g','Protein','bg-green-50 text-green-700'],['🌾',recipe.carbs+'g','Carbs','bg-blue-50 text-blue-700'],['🥑',recipe.fat+'g','Fat','bg-red-50 text-red-700']].map(([e,v,l,cls])=>(
            <div key={l} className={`${cls} rounded-2xl p-3 text-center`}>
              <p className="text-lg">{e}</p>
              <p className="font-bold text-sm mt-0.5">{v}</p>
              <p className="text-xs opacity-70">{l}</p>
            </div>
          ))}
        </div>

        {/* Ingredients */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><span>🧾</span> Ingredients</h2>
          <div className="space-y-2">
            {recipe.ingredients?.map((ing, i)=>(
              <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-1.5"/>
                <div className="flex-1">
                  <span className="font-semibold text-gray-900 text-sm">{ing.amount} {ing.item}</span>
                  {ing.note&&<span className="text-gray-400 text-xs ml-1.5">({ing.note})</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><span>👨‍🍳</span> Instructions</h2>
          <div className="space-y-4">
            {recipe.instructions?.map((step)=>(
              <div key={step.step} className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">{step.step}</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">{step.title}</p>
                  <p className="text-gray-500 text-sm mt-1 leading-relaxed">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        {recipe.tips?.length>0&&(
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
            <h2 className="font-bold text-amber-900 mb-3 flex items-center gap-2"><span>💡</span> Chef's Tips</h2>
            <div className="space-y-2">
              {recipe.tips.map((tip,i)=><div key={i} className="flex items-start gap-2"><span className="text-amber-500 text-sm">•</span><p className="text-amber-800 text-sm">{tip}</p></div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
