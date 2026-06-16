import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, ShoppingCart, X, Salad, Check, Share2, Trash2 } from 'lucide-react';
import ClientLayout from '../components/client-portal/ClientLayout';
import { useAppContext } from '../lib/AppContext';
import { db } from '../lib/db';

function GroceryListModal({ plan, onClose }) {
  // Parse all ingredients from the plan
  const allItems = [];
  plan?.meal_sections?.forEach(section => {
    section.options?.forEach(opt => {
      const parts = (opt.ingredients || '').split(',').map(s => s.trim()).filter(Boolean);
      parts.forEach(p => { if (p && !allItems.find(i => i.text.toLowerCase() === p.toLowerCase())) allItems.push({ text: p }); });
    });
  });

  const [items, setItems] = useState(allItems.map((it, i) => ({ id: i, text: it.text, checked: false, deleted: false })));

  const toggle = (id) => setItems(prev => prev.map(it => it.id === id ? { ...it, checked: !it.checked } : it));
  const del = (id) => setItems(prev => prev.map(it => it.id === id ? { ...it, deleted: true } : it));
  const restore = (id) => setItems(prev => prev.map(it => it.id === id ? { ...it, deleted: false } : it));

  const shareList = async () => {
    const text = `🛒 Grocery List — ${plan.title}\n\n${items.filter(i => !i.deleted).map(i => `${i.checked ? '✓' : '○'} ${i.text}`).join('\n')}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Grocery List', text }); return; } catch {}
    }
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(text);
      alert('Grocery list copied to clipboard! You can paste it anywhere.');
    } catch {
      alert(text);
    }
  };

  const visible = items.filter(i => !i.deleted);
  const hidden = items.filter(i => i.deleted);
  const checkedCount = visible.filter(i => i.checked).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative rounded-2xl shadow-2xl w-full max-w-md flex flex-col" style={{ backgroundColor: 'var(--cp-card-bg)', maxHeight: '85vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" style={{ color: 'var(--cp-accent)' }} />
            <h2 className="font-bold" style={{ color: 'var(--cp-text)' }}>Grocery List</h2>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--cp-bg)', color: 'var(--cp-text-dim)' }}>{checkedCount}/{visible.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={shareList} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium" style={{ backgroundColor: 'var(--cp-accent)', color: 'white' }}>
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70"><X className="w-4 h-4" style={{ color: 'var(--cp-text-dim)' }} /></button>
          </div>
        </div>

        <p className="px-5 pb-3 text-xs flex-shrink-0" style={{ color: 'var(--cp-text-dim)' }}>Tap to check off · 🗑 to hide items you already have</p>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
          {visible.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl group" style={{ backgroundColor: item.checked ? 'var(--cp-bg)' : 'transparent', border: '1px solid var(--cp-border)' }}>
              <button onClick={() => toggle(item.id)} className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all" style={{ borderColor: item.checked ? 'var(--cp-accent)' : 'var(--cp-border)', backgroundColor: item.checked ? 'var(--cp-accent)' : 'transparent' }}>
                {item.checked && <Check className="w-3 h-3 text-white" />}
              </button>
              <span className={`flex-1 text-sm ${item.checked ? 'line-through opacity-50' : ''}`} style={{ color: 'var(--cp-text)' }}>{item.text}</span>
              <button onClick={() => del(item.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:opacity-70" title="Hide (already have it)">
                <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--cp-text-dim)' }} />
              </button>
            </div>
          ))}

          {/* Hidden / deleted items */}
          {hidden.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium mb-2 px-1" style={{ color: 'var(--cp-text-dim)' }}>Already have ({hidden.length})</p>
              {hidden.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-xl opacity-40" style={{ border: '1px dashed var(--cp-border)' }}>
                  <span className="flex-1 text-sm line-through" style={{ color: 'var(--cp-text-dim)' }}>{item.text}</span>
                  <button onClick={() => restore(item.id)} className="text-xs px-2 py-0.5 rounded-lg" style={{ backgroundColor: 'var(--cp-bg)', color: 'var(--cp-text-dim)' }}>Restore</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-4 flex-shrink-0">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cp-border)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${visible.length ? (checkedCount / visible.length) * 100 : 0}%`, backgroundColor: 'var(--cp-accent)' }} />
          </div>
          <p className="text-xs text-center mt-1.5" style={{ color: 'var(--cp-text-dim)' }}>{checkedCount} of {visible.length} items checked</p>
        </div>
      </div>
    </div>
  );
}

export default function ClientNutrition() {
  const { clientUser } = useAppContext();
  const [plans, setPlans] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [expandedSection, setExpandedSection] = useState({});
  const [groceryPlan, setGroceryPlan] = useState(null);

  useEffect(() => {
    if (!clientUser?.clientId) return;
    db.NutritionPlan.filter({ client_id: clientUser.clientId }, '-date').then(setPlans);
  }, [clientUser]);

  return (
    <ClientLayout title="Nutrition">
      <div className="p-5 space-y-4">
        {plans.map(plan => (
          <div key={plan.id} className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--cp-card-bg)', border: '1px solid var(--cp-border)' }}>
            <button onClick={() => setExpanded(expanded === plan.id ? null : plan.id)} className="w-full p-5 text-left">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-bold" style={{ color: 'var(--cp-text)' }}>{plan.title}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {[['🔥', plan.calories, 'kcal'], ['💪', plan.protein, 'g P'], ['🌾', plan.carbs, 'g C'], ['🥑', plan.fat, 'g F']].map(([e, v, l]) => v && (
                      <span key={l} className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--cp-bg)', color: 'var(--cp-text)' }}>{e} {v}{l}</span>
                    ))}
                  </div>
                  {plan.notes && <p className="text-xs mt-2" style={{ color: 'var(--cp-text-dim)' }}>{plan.notes}</p>}
                </div>
                {expanded === plan.id ? <ChevronDown className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--cp-text-dim)' }} /> : <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--cp-text-dim)' }} />}
              </div>
              <button onClick={e => { e.stopPropagation(); setGroceryPlan(plan); }} className="mt-3 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium" style={{ backgroundColor: 'var(--cp-accent)', color: 'white' }}>
                <ShoppingCart className="w-3 h-3" /> Grocery List
              </button>
            </button>

            {expanded === plan.id && plan.meal_sections?.map(section => (
              <div key={section.section_name} className="border-t" style={{ borderColor: 'var(--cp-border)' }}>
                <button onClick={() => setExpandedSection(p => ({ ...p, [section.section_name]: !p[section.section_name] }))} className="w-full flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm" style={{ color: 'var(--cp-text)' }}>{section.section_name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--cp-bg)', color: 'var(--cp-text-dim)' }}>{section.time} · {section.options?.length} options</span>
                  </div>
                  {expandedSection[section.section_name] ? <ChevronDown className="w-4 h-4" style={{ color: 'var(--cp-text-dim)' }} /> : <ChevronRight className="w-4 h-4" style={{ color: 'var(--cp-text-dim)' }} />}
                </button>
                {expandedSection[section.section_name] && section.options?.map(opt => (
                  <div key={opt.name} className="mx-4 mb-3 rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--cp-bg)', border: '1px solid var(--cp-border)' }}>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-semibold text-sm" style={{ color: 'var(--cp-text)' }}>{opt.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--cp-text-dim)' }}>{opt.description}</p>
                        </div>
                        <div className="text-right text-xs flex-shrink-0">
                          <p className="font-bold" style={{ color: 'var(--cp-accent)' }}>{opt.calories} kcal</p>
                          <p style={{ color: 'var(--cp-text-dim)' }}>P: {opt.protein}g</p>
                        </div>
                      </div>
                      <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--cp-card-bg)' }}>
                        <p className="text-xs font-medium mb-1" style={{ color: 'var(--cp-text-dim)' }}>🧾 Ingredients</p>
                        <p className="text-xs" style={{ color: 'var(--cp-text)' }}>{opt.ingredients}</p>
                      </div>
                      <a
                        href={`/recipe?name=${encodeURIComponent(opt.name||'')}&ingredients=${encodeURIComponent(opt.ingredients||'')}&calories=${opt.calories||''}&protein=${opt.protein||''}&carbs=${opt.carbs||''}&fat=${opt.fat||''}`}
                        target="_blank" rel="noreferrer"
                        className="mt-2 flex items-center gap-1.5 text-xs font-medium"
                        style={{ color: 'var(--cp-accent)' }}
                      >
                        <ExternalLink className="w-3 h-3" /> View Full Recipe
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}

        {!plans.length && (
          <div className="text-center py-12" style={{ color: 'var(--cp-text-dim)' }}>
            <Salad className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No nutrition plan assigned yet</p>
            <p className="text-xs mt-1 opacity-70">Your trainer will add a plan for you</p>
          </div>
        )}
      </div>

      {groceryPlan && <GroceryListModal plan={groceryPlan} onClose={() => setGroceryPlan(null)} />}
    </ClientLayout>
  );
}
