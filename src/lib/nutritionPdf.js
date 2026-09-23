import { callAI } from './db';

/* ── Εκτυπώσιμο PDF διατροφής ────────────────────────────────────────────────
   Με το πάτημα: γρήγορο AI request που κανονικοποιεί ΚΑΘΕ γεύμα σε συνοπτικά
   γραμμάρια («Γιαούρτι 150g, Βρώμη 30g, …») → ανοίγει παράθυρο εκτύπωσης →
   Αποθήκευση ως PDF. Αν το AI αποτύχει, τυπώνεται ό,τι υπάρχει στο πλάνο.     */

const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function fallbackBreakdown(plan) {
  const sections = [];
  if (Array.isArray(plan.meal_sections)) {
    for (const s of plan.meal_sections) {
      sections.push({
        name: s.section_name || 'Γεύμα', time: s.time || '',
        options: (s.options || []).map(o => ({
          name: o.name || '',
          items: String(o.ingredients || o.description || '').split(/[,·;]+/).map(x => x.trim()).filter(Boolean),
          calories: o.calories ?? null,
        })),
      });
    }
  } else if (Array.isArray(plan.meals)) {
    for (const m of plan.meals) {
      const items = Array.isArray(m.foods)
        ? m.foods.map(f => typeof f === 'string' ? f : [f.name, f.quantity].filter(Boolean).join(' ')).filter(Boolean)
        : String(m.ingredients || '').split(/[,·;]+/).map(x => x.trim()).filter(Boolean);
      sections.push({ name: m.name || m.meal_type || 'Γεύμα', time: m.time || '', options: [{ name: m.name || '', items, calories: m.calories ?? null }] });
    }
  }
  return { sections, daily_calories: plan.calories ?? null, daily_protein: plan.protein ?? null };
}

async function buildGramBreakdown(plan) {
  const src = { ...plan };
  ['id', 'client_id', 'created_date', 'updated_date'].forEach(k => delete src[k]);
  const prompt = `Δίνεται πλάνο διατροφής (JSON). Για ΚΑΘΕ γεύμα/επιλογή φτιάξε ΣΥΝΟΠΤΙΚΗ λίστα υλικών με ποσότητες σε γραμμάρια (ή ml/τεμ. όπου ταιριάζει), ώστε να ετοιμάζεται το γεύμα με μια ματιά. Παράδειγμα: "Acai bowl" → ["Γιαούρτι 150g","Βρώμη 30g","Μούρα 15g","Μέλι 5g","Πρωτεΐνη 30g"].
- Αν αναφέρονται ήδη ποσότητες, χρησιμοποίησέ τες ως έχουν. Αλλιώς όρισε ρεαλιστικές που να βγάζουν περίπου τις θερμίδες της επιλογής.
- Κράτα ΙΔΙΑ ονόματα γευμάτων/επιλογών, ΙΔΙΑ σειρά, ΙΔΙΟ πλήθος. Σύντομα items, χωρίς οδηγίες μαγειρικής.
Επίστρεψε ΜΟΝΟ JSON ακριβώς σε αυτή τη μορφή: {"sections":[{"name":"","time":"","options":[{"name":"","items":["Υλικό 100g"],"calories":0}]}],"daily_calories":0,"daily_protein":0}
ΠΛΑΝΟ: ${JSON.stringify(src)}`;
  try {
    const out = await callAI(prompt, 'Return ONLY valid JSON. No markdown. Start with {');
    if (typeof out === 'string' && out.startsWith('__ERROR__')) throw new Error('ai');
    let c = String(out).trim().replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
    const a = c.indexOf('{'), z = c.lastIndexOf('}');
    const j = JSON.parse(c.slice(a, z + 1));
    if (!Array.isArray(j.sections) || !j.sections.length) throw new Error('shape');
    return j;
  } catch { return fallbackBreakdown(plan); }
}

function renderHtml(plan, br, clientName) {
  const date = plan.date || new Date().toISOString().split('T')[0];
  const kcal = br.daily_calories ?? plan.calories;
  const prot = br.daily_protein ?? plan.protein;
  const supplements = plan.supplements ? (Array.isArray(plan.supplements) ? plan.supplements.join(', ') : String(plan.supplements)) : '';
  const secs = (br.sections || []).map(s => `
    <div class="sec">
      <div class="sech"><span>${esc(s.name)}</span>${s.time ? `<span class="time">${esc(s.time)}</span>` : ''}</div>
      ${(s.options || []).map((o, i) => `
        <div class="opt">
          <div class="opth"><b>${(s.options.length > 1 ? (i + 1) + '. ' : '')}${esc(o.name)}</b>${o.calories ? `<span class="kc">${esc(o.calories)} kcal</span>` : ''}</div>
          <div class="items">${(o.items || []).map(it => `<span>${esc(it)}</span>`).join('')}</div>
        </div>`).join('')}
    </div>`).join('');

  return `<!doctype html><html lang="el"><head><meta charset="utf-8"><title>Διατροφή — ${esc(clientName || plan.client_name || '')}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;color:#111;padding:34px 40px;max-width:800px;margin:0 auto}
  .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #111;padding-bottom:14px;margin-bottom:18px}
  .brand{font-weight:900;font-size:20px;letter-spacing:-0.5px}
  .brand small{display:block;font-weight:600;font-size:10px;color:#888;letter-spacing:2px;text-transform:uppercase;margin-top:2px}
  .meta{text-align:right;font-size:12px;color:#555;line-height:1.6}
  h1{font-size:17px;margin:0 0 4px}
  .chips{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 18px}
  .chips span{font-size:11.5px;font-weight:700;border:1.4px solid #111;border-radius:99px;padding:4px 12px}
  .sec{margin-bottom:16px;break-inside:avoid}
  .sech{display:flex;justify-content:space-between;align-items:center;background:#111;color:#fff;border-radius:8px 8px 0 0;padding:7px 12px;font-weight:800;font-size:13px}
  .sech .time{font-weight:600;font-size:11px;opacity:.75}
  .opt{border:1.4px solid #ddd;border-top:none;padding:9px 12px}
  .opt:last-child{border-radius:0 0 8px 8px}
  .opth{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;margin-bottom:5px}
  .opth .kc{color:#666;font-weight:700;font-size:11px;white-space:nowrap}
  .items{display:flex;flex-wrap:wrap;gap:5px}
  .items span{font-size:11px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:6px;padding:3px 8px}
  .foot{margin-top:18px;font-size:11.5px;color:#444;line-height:1.7;border-top:1.4px solid #ddd;padding-top:10px}
  @media print{ body{padding:10mm 12mm} .noprint{display:none} }
  .noprint{position:fixed;top:12px;right:12px}
  .noprint button{font-size:13px;font-weight:700;padding:9px 16px;border-radius:9px;border:none;background:#111;color:#fff;cursor:pointer}
</style></head><body>
  <div class="noprint"><button onclick="window.print()">🖨 Εκτύπωση / PDF</button></div>
  <div class="top">
    <div class="brand">THE CUBE<small>Personal Training Studio</small></div>
    <div class="meta">${esc(clientName || plan.client_name || '')}<br>${esc(date)}</div>
  </div>
  <h1>${esc(plan.title || 'Διατροφικό πλάνο')}</h1>
  <div class="chips">
    ${kcal ? `<span>🔥 ${esc(kcal)} kcal/ημέρα</span>` : ''}
    ${prot ? `<span>💪 ${esc(prot)}g πρωτεΐνη</span>` : ''}
    ${plan.water_liters_daily ? `<span>💧 ${esc(plan.water_liters_daily)}L νερό</span>` : ''}
  </div>
  ${secs}
  ${(supplements || plan.notes) ? `<div class="foot">${supplements ? `<b>Συμπληρώματα:</b> ${esc(supplements)}<br>` : ''}${plan.notes ? `<b>Σημειώσεις:</b> ${esc(plan.notes)}` : ''}</div>` : ''}
  <script>window.onload = () => setTimeout(() => window.print(), 400);</script>
</body></html>`;
}

export async function printNutritionPlanPdf(plan, clientName) {
  /* Το παράθυρο ανοίγει ΑΜΕΣΩΣ στο click (αλλιώς το μπλοκάρει ο browser),
     και γεμίζει μόλις απαντήσει το AI. */
  const w = window.open('', '_blank');
  if (w) {
    w.document.write('<body style="font-family:sans-serif;display:grid;place-items:center;height:90vh;color:#555"><div style="text-align:center"><p style="font-size:26px;margin:0 0 8px">🍽️</p><p><b>Προετοιμασία PDF…</b></p><p style="font-size:13px">Ο εγκέφαλος υπολογίζει τα γραμμάρια κάθε γεύματος.</p></div></body>');
  }
  const br = await buildGramBreakdown(plan);
  const html = renderHtml(plan, br, clientName);
  if (!w || w.closed) { alert('Ο browser μπλόκαρε το παράθυρο εκτύπωσης — επίτρεψε τα αναδυόμενα παράθυρα και ξαναδοκίμασε.'); return; }
  w.document.open(); w.document.write(html); w.document.close();
}
