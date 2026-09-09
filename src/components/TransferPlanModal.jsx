import { useState } from 'react';
import { X, Users, Loader2, Check, AlertCircle, Sparkles } from 'lucide-react';
import { db, callAI } from '../lib/db';
import { hasNutrition } from '../lib/groups';
import { ageFromDob } from '../lib/bodyCalc';

/* ── Μεταφορά διατροφής σε άλλον πελάτη ──────────────────────────────────────
   Ίδια πιάτα/γεύματα (π.χ. οικογένεια που τρώει μαζί), αλλά ο «εγκέφαλος»
   προσαρμόζει ΜΟΝΟ τις ποσότητες και τους αριθμούς στις ανάγκες του παραλήπτη. */

const strip = (t) => {
  let c = String(t || '').trim().replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
  const a = c.indexOf('{'), z = c.lastIndexOf('}');
  if (a === -1 || z === -1) throw new Error('Μη έγκυρη απάντηση AI');
  return JSON.parse(c.slice(a, z + 1));
};

export default function TransferPlanModal({ plan, sourceClient, clients, onClose, onDone }) {
  const targets = (clients || []).filter(c => hasNutrition(c) && c.id !== plan.client_id);
  const [targetId, setTargetId] = useState('');
  const [phase, setPhase] = useState('pick'); // pick | working | done | error
  const [err, setErr] = useState('');
  const target = targets.find(c => c.id === targetId);

  const run = async () => {
    if (!target) return;
    setPhase('working'); setErr('');
    try {
      /* στοιχεία παραλήπτη */
      let prof = null, weight = null;
      try { prof = (await db.NutritionProfile.filter({ client_id: target.id }, '-created_date', 1))[0] || null; } catch {}
      try { weight = (await db.ClientProgress.filter({ client_id: target.id }, '-date', 1))[0]?.weight_kg ?? null; } catch {}
      const age = ageFromDob(target.date_of_birth);
      const height = target.height_cm || target.height || null;

      /* καθαρό αντίγραφο του πλάνου (χωρίς ids/ημερομηνίες) */
      const src = { ...plan };
      ['id','client_id','client_name','created_date','updated_date','date','transferred_from'].forEach(k => delete src[k]);

      const profBits = prof ? {
        goal_type: prof.goal_type, target_weight: prof.target_weight,
        excluded_ingredients: prof.excluded_ingredients, excluded_auto: prof.excluded_auto,
        meals_per_day: prof.meals_per_day, notes: prof.goal_notes,
      } : null;

      const prompt = `Είσαι έμπειρος διατροφολόγος. Παρακάτω είναι ένα υπάρχον πλάνο διατροφής (JSON) που φτιάχτηκε για άλλο άτομο. Θα το προσαρμόσεις για ΝΕΟ άτομο που τρώει τα ΙΔΙΑ πιάτα (μένουν μαζί/οικογένεια).

ΚΑΝΟΝΕΣ (αυστηροί):
- ΚΡΑΤΑΣ ακριβώς την ίδια δομή JSON: ίδια κλειδιά, ίδια γεύματα, ίδια πιάτα με τα ίδια ονόματα, ίδια σειρά, ίδιο πλήθος. ΔΕΝ προσθέτεις, ΔΕΝ αφαιρείς, ΔΕΝ μετονομάζεις τίποτα.
- ΑΛΛΑΖΕΙΣ ΜΟΝΟ: (α) τις ποσότητες μέσα στα κείμενα υλικών/συνταγών (π.χ. "200g κοτόπουλο" → "150g κοτόπουλο"), (β) τα αριθμητικά διατροφικά πεδία όπου υπάρχουν (calories, protein, carbs, fat, ημερήσιοι στόχοι, water_liters_daily), ώστε να ταιριάζουν στις ανάγκες του νέου ατόμου.
- Υπολόγισε τις ανάγκες του νέου ατόμου (Mifflin-St Jeor + στόχος) και κλιμάκωσε τις ποσότητες αναλογικά και ρεαλιστικά (στρογγυλά νούμερα κουζίνας).
- Αν κάποιο υλικό συγκρούεται με αποκλεισμένα υλικά του νέου ατόμου, αντικατέστησέ το με το πλησιέστερο ισοδύναμο ΜΟΝΟ σε εκείνο το σημείο.

ΝΕΟ ΑΤΟΜΟ:
- Φύλο: ${target.gender === 'female' ? 'γυναίκα' : 'άνδρας'}
- Ηλικία: ${age ?? 'άγνωστη'}
- Ύψος: ${height ? height + ' cm' : 'άγνωστο'}
- Βάρος: ${weight ? weight + ' kg' : 'άγνωστο'}
${profBits ? '- Προφίλ/στόχος: ' + JSON.stringify(profBits) : ''}

ΠΛΑΝΟ ΠΡΟΣ ΠΡΟΣΑΡΜΟΓΗ:
${JSON.stringify(src)}

Επίστρεψε ΜΟΝΟ το προσαρμοσμένο JSON object, με τα ίδια κλειδιά. Χωρίς markdown, χωρίς σχόλια.`;

      const out = await callAI(prompt, 'Return ONLY a valid JSON object. No markdown. Start with {');
      if (typeof out === 'string' && out.startsWith('__ERROR__')) throw new Error(out.replace('__ERROR__', '').trim() || 'Σφάλμα AI');
      const adapted = strip(out);

      await db.NutritionPlan.create({
        ...adapted,
        client_id: target.id,
        client_name: target.name || '',
        date: new Date().toISOString().split('T')[0],
        transferred_from: sourceClient?.name || plan.client_name || '',
      });
      setPhase('done');
    } catch (e) { setErr(String(e?.message || e)); setPhase('error'); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-5" onClick={phase==='working'?undefined:onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center"><Users className="w-5 h-5 text-indigo-500"/></div>
            <div>
              <p className="font-bold text-gray-900">Μεταφορά διατροφής</p>
              <p className="text-xs text-gray-400">«{plan.title || 'Πλάνο'}» · από {sourceClient?.name || plan.client_name}</p>
            </div>
          </div>
          {phase !== 'working' && <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-400"/></button>}
        </div>

        {phase === 'pick' && (
          <>
            <p className="text-sm text-gray-500 mt-3 mb-3">Ίδια γεύματα και πιάτα — ο εγκέφαλος θα προσαρμόσει <b>μόνο τις ποσότητες</b> στις ανάγκες του παραλήπτη.</p>
            <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
              {targets.map(c => (
                <button key={c.id} onClick={() => setTargetId(c.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${targetId===c.id?'border-gray-900 bg-gray-50':'border-gray-100 hover:border-gray-300'}`}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold" style={{backgroundColor:c.theme_color||'#6366f1'}}>{c.name?.charAt(0)}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                    <p className="text-[11px] text-gray-400 truncate">{c.email || '—'}</p>
                  </div>
                </button>
              ))}
              {targets.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Δεν υπάρχει άλλος πελάτης με διατροφή.</p>}
            </div>
            <button onClick={run} disabled={!target}
              className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40">
              <Sparkles className="w-4 h-4"/> Προσαρμογή & Μεταφορά{target ? ` σε ${target.name?.split(' ')[0]}` : ''}
            </button>
          </>
        )}

        {phase === 'working' && (
          <div className="text-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4"/>
            <p className="text-sm font-semibold text-gray-900">Ο εγκέφαλος προσαρμόζει τις ποσότητες…</p>
            <p className="text-xs text-gray-400 mt-1">Ίδια πιάτα, μερίδες για {target?.name?.split(' ')[0]}.</p>
          </div>
        )}

        {phase === 'done' && (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3"><Check className="w-6 h-6 text-emerald-500"/></div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Έγινε!</p>
            <p className="text-xs text-gray-500 mb-5">Η διατροφή μεταφέρθηκε στον/στην {target?.name} με προσαρμοσμένες ποσότητες.</p>
            <button onClick={() => { onDone?.(); onClose(); }} className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold">Εντάξει</button>
          </div>
        )}

        {phase === 'error' && (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-3"><AlertCircle className="w-6 h-6 text-red-500"/></div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Κάτι πήγε στραβά</p>
            <p className="text-xs text-red-500 mb-5 break-words">{err}</p>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-3 text-sm font-semibold">Άκυρο</button>
              <button onClick={run} className="flex-1 bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold">Δοκίμασε ξανά</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
