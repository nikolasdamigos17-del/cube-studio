import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, X, Loader2, Brain, Flame, Beef, Droplets, Pill, Plus, ArrowLeft, Dumbbell, TrendingDown, Utensils, Sparkles, Pencil } from 'lucide-react';
import { db, callAI } from '../lib/db';

/* ═══════════ βοηθητικά ═══════════ */

const num = v => { const n = parseFloat(v); return isNaN(n) ? null : n; };
const todayStr = () => new Date().toISOString().split('T')[0];
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; };

const SLOT_META = {
  breakfast:   { label:'Πρωινό', time:'08:00' },
  snack1:      { label:'Δεκατιανό', time:'10:30' },
  lunch:       { label:'Μεσημεριανό', time:'13:30' },
  snack2:      { label:'Απογευματινό σνακ', time:'17:00' },
  dinner:      { label:'Βραδινό', time:'20:30' },
  preworkout:  { label:'Προ-προπονητικό', time:'' },
  postworkout: { label:'Μετα-προπονητικό', time:'' },
};
const GOAL_LABELS = { fat_loss:'Απώλεια λίπους', muscle_gain:'Μυϊκή ανάπτυξη', recomp:'Ανασύνθεση', maintain:'Συντήρηση', performance:'Απόδοση' };
const TAG_COLORS = { 'ΠΟΡΕΙΑ':'#38bdf8', 'ΔΙΑΤΡΟΦΗ':'#f59e0b', 'ΠΡΟΠΟΝΗΣΗ':'#a78bfa', 'ΠΡΟΤΑΣΗ':'#22c55e' };
const TAG_ICONS = { 'ΠΟΡΕΙΑ':TrendingDown, 'ΔΙΑΤΡΟΦΗ':Utensils, 'ΠΡΟΠΟΝΗΣΗ':Dumbbell, 'ΠΡΟΤΑΣΗ':Sparkles };

function parseJsonObj(txt) {
  if (!txt || txt.startsWith('__ERROR__')) return null;
  try {
    const s = txt.indexOf('{'), e = txt.lastIndexOf('}');
    if (s === -1 || e === -1) return null;
    return JSON.parse(txt.slice(s, e + 1));
  } catch { return null; }
}

/* συλλογή & σύνοψη ΟΛΩΝ των δεδομένων του πελάτη για τον εγκέφαλο */
function buildClientBrief({ client, profile, meeting, progress, plans, tplans, appts, feedback }) {
  const lines = [];
  lines.push(`ΠΕΛΑΤΗΣ: ${client.name}${client.gender ? ', ' + client.gender : ''}${client.height_cm ? ', ύψος ' + client.height_cm + 'cm' : ''}. Πρόγραμμα: ${client.services}.`);
  lines.push(`ΣΤΟΧΟΣ: ${GOAL_LABELS[profile.goal_type] || profile.goal_type || 'γενική υγεία'}${profile.target_weight ? `, στόχος βάρους ${profile.target_weight}kg` : ''}.${profile.goal_notes ? ' Σημειώσεις: ' + profile.goal_notes : ''}`);

  const ms = [...progress].sort((a,b)=>(a.date||'').localeCompare(b.date||'')).slice(-6);
  if (ms.length) {
    lines.push('ΜΕΤΡΗΣΕΙΣ (παλιά → νέα): ' + ms.map(m =>
      `${m.date}: ${num(m.weight_kg) ?? '?'}kg${num(m.body_fat_pct)!=null ? ', λίπος ' + m.body_fat_pct + '%' : ''}${num(m.muscle_mass_kg)!=null ? ', μυς ' + m.muscle_mass_kg + 'kg' : ''}${num(m.bmr)!=null ? ', BMR ' + m.bmr : ''}`
    ).join(' | '));
  } else lines.push('ΜΕΤΡΗΣΕΙΣ: καμία καταγεγραμμένη.');

  const prevPlans = plans.slice(0, 3);
  if (prevPlans.length) {
    lines.push('ΠΡΟΗΓΟΥΜΕΝΕΣ ΔΙΑΤΡΟΦΕΣ: ' + prevPlans.map(p => `${p.date}: ${p.calories || '?'} kcal, ${p.protein || '?'}g πρωτεΐνη`).join(' | '));
  } else lines.push('ΠΡΟΗΓΟΥΜΕΝΕΣ ΔΙΑΤΡΟΦΕΣ: καμία — αυτή είναι η πρώτη.');

  /* προπονητικά δεδομένα — ΟΛΑ in-app (Live Training) */
  const hasTraining = (client.services || '').includes('training');
  if (hasTraining) {
    const cutoff = daysAgo(21);
    const recent = tplans.filter(t => (t.date || '') >= cutoff);
    const done = recent.filter(t => t.completed);
    const apptsRecent = appts.filter(a => a.type === 'training' && (a.date || '') >= cutoff && a.status !== 'cancelled').length;
    let setsPlanned = 0, setsDone = 0, missedTargets = [];
    done.forEach(t => (t.session_results || []).forEach(ex => {
      setsPlanned += ex.sets_planned || 0; setsDone += ex.sets_done || 0;
      const miss = (ex.sets || []).filter(s => s.completed && s.target_reps && !s.hit_target).length;
      const skip = (ex.sets_planned || 0) - (ex.sets_done || 0);
      if (miss + skip > 0) missedTargets.push(`${ex.name} (${miss + skip} σετ κάτω από στόχο/ημιτελή)`);
    }));
    lines.push(`ΠΡΟΠΟΝΗΣΗ (τελευταίες 3 εβδομάδες, δεδομένα Live Training): ${recent.length} προγράμματα ανατέθηκαν, ${done.length} ολοκληρώθηκαν live, ${apptsRecent} προπονητικά ραντεβού.` +
      (setsPlanned ? ` Σετ: ${setsDone}/${setsPlanned} ολοκληρωμένα.` : '') +
      (missedTargets.length ? ` Δυσκολίες: ${missedTargets.slice(0, 4).join(', ')}.` : (setsPlanned ? ' Χωρίς σημαντικές αποτυχίες σετ.' : '')));
    const plannedPerWeek = client.sessions_per_month ? Math.round(client.sessions_per_month / 4.3 * 10) / 10 : (client.sessions_per_week || null);
    if (plannedPerWeek) lines.push(`Συμφωνημένη συχνότητα: ~${plannedPerWeek} προπονήσεις/εβδομάδα.`);
  } else {
    lines.push('ΠΡΟΠΟΝΗΣΗ: ο πελάτης έχει μόνο διατροφή (χωρίς προπονητικά δεδομένα).');
  }
  if (feedback && feedback.length) {
    lines.push('ΣΗΜΕΙΩΣΕΙΣ ΠΡΟΠΟΝΗΤΗ (από πρόσφατες προπονήσεις): ' + feedback.map(f=>`«${f.content}»`).join(' | '));
  }

  const flagsOn = Object.entries(profile.flags || {}).filter(([,v]) => v).map(([k]) => k).join(', ');
  if (flagsOn) lines.push('ΔΙΑΤΡΟΦΙΚΟ ΠΡΟΦΙΛ: ' + flagsOn + '.');
  lines.push(`ΠΑΡΑΓΓΕΛΙΑ (${meeting.date}): ${ (meeting.selected_meals || []).length } επιλεγμένα γεύματα από το meeting.`);
  return lines.join('\n');
}

/* ντετερμινιστικό δίχτυ ασφαλείας αν το AI αποτύχει */
function fallbackAnalysis({ profile, progress, plans, client }) {
  const ms = [...progress].sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const last = ms[ms.length - 1], prevM = ms[ms.length - 2];
  const w = num(last?.weight_kg) || 75;
  const bmr = num(last?.bmr) || Math.round(22 * w);
  let cal = Math.round(bmr * 1.45 / 10) * 10;
  const goal = profile.goal_type;
  if (goal === 'fat_loss') cal = Math.round(cal * 0.85 / 10) * 10;
  if (goal === 'muscle_gain') cal = Math.round(cal * 1.1 / 10) * 10;
  const protein = Math.round(w * (goal === 'muscle_gain' ? 2.2 : 2.0));
  const water = Math.round(w * 0.035 * 10) / 10;
  const points = [];
  if (last && prevM) {
    const d = (num(last.weight_kg) - num(prevM.weight_kg));
    points.push({ tag:'ΠΟΡΕΙΑ', text:`Βάρος ${prevM.weight_kg}→${last.weight_kg}kg (${d > 0 ? '+' : ''}${d?.toFixed(1)}kg) μεταξύ ${prevM.date} και ${last.date}.` });
  }
  const pp = plans[0];
  if (pp?.calories) points.push({ tag:'ΔΙΑΤΡΟΦΗ', text:`Η προηγούμενη διατροφή (${pp.date}) ήταν ${pp.calories} kcal / ${pp.protein || '?'}g πρωτεΐνη.` });
  points.push({ tag:'ΠΡΟΤΑΣΗ', text:`Με βάση BMR ~${bmr} και στόχο «${GOAL_LABELS[goal] || 'υγεία'}», πρόταση ${cal} kcal και ${protein}g πρωτεΐνης/ημέρα.` });
  return { points, calories: cal, protein_g: protein, water_l: water, supplements: [], add_postworkout: false };
}

/* κλιμάκωση ποσοτήτων συνταγής σε νέο στόχο θερμίδων — τοπικά, επί τόπου */
const scaleQuantities = (txt, ratio) => (txt || '').replace(/(\d+(?:[.,]\d+)?)(\s*%)?/g, (m, numStr, pct) => {
  if (pct) return m;                                  // ποσοστά (π.χ. γάλα 1.5%, σοκολάτα 70%) δεν αγγίζονται
  const v = parseFloat(numStr.replace(',', '.'));
  if (isNaN(v)) return m;
  let nv = v * ratio;
  nv = v >= 20 ? Math.round(nv / 5) * 5 : v >= 5 ? Math.round(nv) : Math.round(nv * 10) / 10;
  if (nv <= 0) nv = v >= 5 ? 1 : 0.5;
  return String(nv);
});

/* ═══════════ Component ═══════════ */

export default function PlanCreator() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const clientId = params.get('client') || '';
  const meetingId = params.get('meeting') || '';

  const [data, setData] = useState(null);       // {client, profile, meeting, progress, plans, tplans, appts}
  const [screen, setScreen] = useState('analyzing'); // analyzing | brief | building | review
  const [analysis, setAnalysis] = useState(null);
  const [aiUsed, setAiUsed] = useState(true);
  const [checkStep, setCheckStep] = useState(0);

  /* επεξεργάσιμοι στόχοι */
  const [calories, setCalories] = useState('');
  const [proteinG, setProteinG] = useState('');
  const [waterL, setWaterL] = useState('');
  const [sups, setSups] = useState([]);
  const [supInput, setSupInput] = useState('');
  const [addPost, setAddPost] = useState(false);

  /* πλάνο υπό επεξεργασία */
  const [title, setTitle] = useState('');
  const [sections, setSections] = useState([]);
  const [notes, setNotes] = useState('');
  const [buildPhase, setBuildPhase] = useState(0);
  const [saving, setSaving] = useState(false);

  const ACC = data?.client?.theme_color || '#e0a355';

  /* ── φόρτωση ΟΛΩΝ αυτόματα — καμία ερώτηση ── */
  useEffect(() => { (async () => {
    if (!clientId || !meetingId) return;
    const [client, profs, meeting, progress, plans, tplans, apptsAll, notesAll] = await Promise.all([
      db.Client.get(clientId),
      db.NutritionProfile.filter({ client_id: clientId }),
      db.NutritionMeeting.get(meetingId),
      db.ClientProgress.filter({ client_id: clientId }, '-date', 12),
      db.NutritionPlan.filter({ client_id: clientId }, '-date', 5),
      db.TrainingPlan.filter({ client_id: clientId }, '-date', 15),
      db.Appointment.filter({ client_id: clientId }),
      db.ClientNote.filter({ client_id: clientId }),
    ]);
    const feedback = (notesAll || []).filter(n => n.type === 'training_feedback').sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,3);
    setData({ client, profile: profs[0] || {}, meeting, progress, plans, tplans, appts: apptsAll, feedback });
  })(); }, [clientId, meetingId]);

  /* θεατρικά τικ της ανάλυσης */
  useEffect(() => {
    if (screen !== 'analyzing') return;
    const t = setInterval(() => setCheckStep(s => Math.min(s + 1, 4)), 1400);
    return () => clearInterval(t);
  }, [screen]);

  /* ── ο εγκέφαλος ── */
  useEffect(() => { (async () => {
    if (!data || screen !== 'analyzing') return;
    const brief = buildClientBrief(data);
    const prompt = `Είσαι ο προπονητικός-διατροφικός εγκέφαλος ενός personal training studio. Ανάλυσε ΣΥΝΟΛΙΚΑ τα δεδομένα και τεκμηρίωσε με ΑΡΙΘΜΟΥΣ.

${brief}

Δώσε:
1) 3-6 σημεία ανάλυσης στα ελληνικά. Κάθε σημείο πρέπει να αναφέρει συγκεκριμένα νούμερα από τα δεδομένα και το συμπέρασμα. Παραδείγματα ύφους: "Βάρος σταθερό 84.2→84.1kg στις 2 τελευταίες μετρήσεις ενώ οι διατροφές ήταν 2500 kcal → μείωση στις 2250" ή "Ολοκλήρωσε 5/5 προπονήσεις με 3 σετ κάτω από στόχο στο Bench → αύξηση πρωτεΐνης και μετα-προπονητικό για recovery".
2) Τελική πρόταση ημερήσιων στόχων.
Tags επιτρεπτά: ΠΟΡΕΙΑ, ΔΙΑΤΡΟΦΗ, ΠΡΟΠΟΝΗΣΗ, ΠΡΟΤΑΣΗ.

Απάντησε ΜΟΝΟ με JSON (χωρίς markdown):
{"points":[{"tag":"ΠΟΡΕΙΑ","text":"..."}],"calories":2250,"protein_g":170,"water_l":3.0,"supplements":[{"name":"...","reason":"..."}],"add_postworkout":false,"postworkout_reason":""}`;
    const r = await callAI(prompt, 'You are an expert sports nutrition and strength coach. Return ONLY valid JSON. Start with {');
    let a = parseJsonObj(r);
    if (!a || !a.calories) { a = fallbackAnalysis(data); setAiUsed(false); }
    setAnalysis(a);
    setCalories(String(a.calories || '')); setProteinG(String(a.protein_g || ''));
    setWaterL(String(a.water_l || '')); setSups((a.supplements || []).map(s => typeof s === 'string' ? { name:s, reason:'' } : s));
    setAddPost(!!a.add_postworkout);
    setScreen('brief');
  })(); }, [data, screen]);

  /* ── δημιουργία πλάνου ── */
  const buildPlan = async () => {
    setScreen('building'); setBuildPhase(0);
    const ph = setInterval(() => setBuildPhase(p => (p + 1) % 3), 3200);
    const { profile, meeting, client } = data;

    /* κατηγορίες: slots προφίλ (+ postworkout αν ζητήθηκε) + τυχόν κατηγορίες της παραγγελίας που δεν ταιριάζουν */
    let slotKeys = [...(profile.meal_slots?.length ? profile.meal_slots : ['breakfast','lunch','snack2','dinner'])];
    if (addPost && !slotKeys.includes('postworkout')) slotKeys.push('postworkout');
    const secMap = new Map(slotKeys.map(k => [SLOT_META[k]?.label || k, { section_name: SLOT_META[k]?.label || k, time: SLOT_META[k]?.time || '', must: [] }]));
    (meeting.selected_meals || []).forEach(m => {
      const label = m.slot || 'Γεύμα';
      if (!secMap.has(label)) secMap.set(label, { section_name: label, time:'', must: [] });
      secMap.get(label).must.push(m);
    });
    const secList = Array.from(secMap.values());

    const banned = [
      ...(profile.excluded_auto || []), ...(profile.excluded_ingredients || []),
      ...(profile.disliked || []), ...(profile.never_meals || []),
    ];
    const secTxt = secList.map(s =>
      `- ${s.section_name}${s.time ? ' (' + s.time + ')' : ''}: ` +
      (s.must.length ? 'ΥΠΟΧΡΕΩΤΙΚΑ τα γεύματα: ' + s.must.map(m => `"${m.name}"${m.main_ingredients?.length ? ' [' + m.main_ingredients.join(', ') + ']' : ''}${m.source === 'monthly_recipe' ? ' {ΣΥΝΤΑΓΗ ΣΤΟΥΝΤΙΟ — σταθερά υλικά}' : ''}`).join('; ') : 'χωρίς προεπιλογή — πρότεινε εσύ')
    ).join('\n');

    const prompt = `Φτιάξε πλήρη ημερήσια διατροφή για: ${client.name}. Στόχος: ${GOAL_LABELS[profile.goal_type] || 'υγεία'}.
ΗΜΕΡΗΣΙΟΙ ΣΤΟΧΟΙ: ${calories} kcal, ${proteinG}g πρωτεΐνη, ${waterL}L νερό.
ΚΑΤΗΓΟΡΙΕΣ ΓΕΥΜΑΤΩΝ:
${secTxt}
ΚΑΝΟΝΕΣ:
- Τα ΥΠΟΧΡΕΩΤΙΚΑ γεύματα μπαίνουν ΠΡΩΤΑ στην κατηγορία τους, με πλήρεις ΠΟΣΟΤΗΤΕΣ σε γραμμάρια στο ingredients.
- Γεύματα με σήμανση {ΣΥΝΤΑΓΗ ΣΤΟΥΝΤΙΟ}: ΚΡΑΤΑ ΑΚΡΙΒΩΣ τα υλικά της συνταγής (μην προσθέσεις/αφαιρέσεις υλικά) και ΠΡΟΣΑΡΜΟΣΕ ΜΟΝΟ τις ποσότητες αναλογικά ώστε το γεύμα να ταιριάζει στις θερμίδες που του αναλογούν στη μέρα του πελάτη.
- Κάθε κατηγορία να έχει 2 επιλογές (options) — συμπλήρωσε εναλλακτική όπου λείπει.
- Το ημερήσιο σύνολο με την 1η επιλογή κάθε κατηγορίας = ${calories} kcal ±5% και πρωτεΐνη ≥ ${proteinG}g.
- ΑΠΑΓΟΡΕΥΜΕΝΑ υλικά (πουθενά, ούτε παράγωγα): ${banned.join(', ') || 'κανένα'}.
- Προτιμήσεις: ${(profile.liked || []).join(', ') || '—'}.
- ingredients: μορφή "υλικό ποσότητα, υλικό ποσότητα" (π.χ. "Κοτόπουλο στήθος 180g, Ρύζι 90g (άβραστο), Ελαιόλαδο 10g").
- description: έως 8 λέξεις.
- Ονόματα γευμάτων: ΦΥΣΙΚΑ ελληνικά, όπως σε ελληνικό μενού· καθιερωμένοι διεθνείς όροι μένουν αυτούσιοι (pancakes, smoothie, toast, wrap, bowl)· ΟΧΙ κατά λέξη μεταφράσεις.
Απάντησε ΜΟΝΟ με JSON (χωρίς markdown):
{"title":"...","meal_sections":[{"section_name":"...","time":"...","options":[{"name":"...","description":"...","ingredients":"...","calories":600,"protein":45,"carbs":55,"fat":18}]}],"notes":"..."}`;
    const r = await callAI(prompt, 'You are an expert dietitian. Return ONLY valid JSON. Start with {');
    clearInterval(ph);
    let p = parseJsonObj(r);
    if (!p || !Array.isArray(p.meal_sections)) {
      /* μηχανικό δίχτυ: κατανομή στόχων στα υποχρεωτικά */
      const per = Math.round((num(calories) || 2000) / secList.length);
      p = { title: `${client.name} — Διατροφή ${todayStr()}`,
        meal_sections: secList.map(s => ({ section_name: s.section_name, time: s.time,
          options: (s.must.length ? s.must : [{ name:'Επιλογή γεύματος', main_ingredients:[] }]).map(m => ({
            name: m.name, description:'', ingredients:(m.main_ingredients || []).join(', '), calories: per, protein: Math.round((num(proteinG) || 150) / secList.length), carbs:null, fat:null })) })),
        notes:'Το AI δεν ήταν διαθέσιμο — οι ποσότητες χρειάζονται χειροκίνητο έλεγχο.' };
    }
    setTitle(p.title || `${client.name} — Διατροφή`);
    setSections((p.meal_sections || []).map((s, si) => ({ ...s, _id: 's' + si,
      options: (s.options || []).map((o, oi) => ({ ...o, _id: 's' + si + 'o' + oi })) })));
    setNotes(p.notes || '');
    setScreen('review');
  };

  /* σύνολα με την 1η επιλογή κάθε κατηγορίας */
  const totals = useMemo(() => {
    let c = 0, pr = 0;
    sections.forEach(s => { const o = s.options[0]; if (o) { c += num(o.calories) || 0; pr += num(o.protein) || 0; } });
    return { c: Math.round(c), p: Math.round(pr) };
  }, [sections]);

  const editOpt = (sid, oid, k, v) => setSections(p => p.map(s => s._id !== sid ? s : { ...s, options: s.options.map(o => o._id !== oid ? o : { ...o, [k]: v }) }));
  const delOpt = (sid, oid) => setSections(p => p.map(s => s._id !== sid ? s : { ...s, options: s.options.filter(o => o._id !== oid) }));
  const addOpt = (sid) => setSections(p => p.map(s => s._id !== sid ? s : { ...s, options: [...s.options, { _id: sid + 'o' + Date.now(), name:'', description:'', ingredients:'', calories:'', protein:'', carbs:'', fat:'', _edit:true }] }));

  const applyCal = (sid, oid) => setSections(p => p.map(s => s._id !== sid ? s : { ...s, options: s.options.map(o => {
    if (o._id !== oid) return o;
    const target = num(o._calDraft);
    if (target == null || target <= 0) return o;
    const base = num(o.calories);
    if (!base) return { ...o, calories: target, _calDraft: String(target) };
    const r = target / base;
    return { ...o, calories: target, _calDraft: String(target),
      ingredients: scaleQuantities(o.ingredients, r),
      protein: num(o.protein) != null ? Math.round(num(o.protein) * r) : o.protein,
      carbs:   num(o.carbs)   != null ? Math.round(num(o.carbs)   * r) : o.carbs,
      fat:     num(o.fat)     != null ? Math.round(num(o.fat)     * r) : o.fat };
  }) }));

  const approve = async () => {
    setSaving(true);
    const { client, meeting } = data;
    const plan = await db.NutritionPlan.create({
      client_id: clientId, client_name: client.name, date: todayStr(), title,
      calories: num(calories), protein: num(proteinG), water_liters_daily: num(waterL),
      supplements: sups, notes,
      meal_sections: sections.map(({ _id, options, ...s }) => ({ ...s, options: options.map(({ _id: oid, _edit, _calDraft, ...o }) => ({ ...o, calories: num(o.calories), protein: num(o.protein), carbs: num(o.carbs), fat: num(o.fat) })) })),
    });
    await db.NutritionMeeting.update(meeting.id, { status:'plan_created', plan_id: plan.id });
    navigate('/Nutrition');
  };

  /* ── στυλ ── */
  const S = {
    page:{ minHeight:'100vh', background:'#07070c', color:'#eef0f6', fontFamily:'var(--font-display, "Space Grotesk", sans-serif)',
      backgroundImage:`radial-gradient(900px 460px at 10% -6%, ${ACC}14, transparent 60%), radial-gradient(760px 400px at 100% 0%, ${ACC}0b, transparent 55%)` },
    wrap:{ maxWidth:1120, margin:'0 auto', padding:'26px 22px 90px' },
    kicker:{ fontSize:10.5, letterSpacing:'.32em', textTransform:'uppercase', color:ACC, fontWeight:700 },
    card:{ background:'rgba(255,255,255,0.035)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:18, padding:'18px 20px' },
    lbl:{ fontSize:10.5, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.42)', fontWeight:700 },
    dim:{ color:'rgba(255,255,255,0.45)' },
    inp:{ background:'rgba(0,0,0,0.38)', border:'1px solid rgba(255,255,255,0.13)', borderRadius:11, color:'#eef0f6', padding:'10px 12px', fontSize:14, outline:'none', width:'100%', fontFamily:'inherit' },
    btn:(primary)=>({ border:'none', borderRadius:12, padding:'13px 24px', fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'inherit',
      background: primary ? ACC : 'transparent', color: primary ? '#07070b' : 'rgba(255,255,255,0.7)', outline: primary ? 'none' : '1px solid rgba(255,255,255,0.17)' }),
  };

  if (!data) return (
    <div style={{ ...S.page, display:'grid', placeItems:'center' }}>
      <Loader2 style={{ width:28, height:28, color:'#fff', animation:'pcspin 1s linear infinite' }}/>
      <style>{`@keyframes pcspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const { client, profile, meeting } = data;

  return (
    <div style={S.page}>
      <div style={S.wrap}>

        {/* header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:22 }}>
          <div>
            <span style={S.kicker}>The Cube · Δημιουργία διατροφής</span>
            <h1 style={{ fontSize:25, fontWeight:800, letterSpacing:'-.02em', margin:'6px 0 3px' }}>{client.name}</h1>
            <p style={{ ...S.dim, fontSize:12.5, margin:0 }}>
              Παραγγελία {meeting?.date} · {(meeting?.selected_meals || []).length} επιλεγμένα γεύματα · {GOAL_LABELS[profile.goal_type] || '—'}
            </p>
          </div>
          <button onClick={() => navigate('/Nutrition')} style={{ ...S.btn(false), display:'inline-flex', alignItems:'center', gap:7 }}>
            <ArrowLeft style={{ width:14, height:14 }}/> Nutrition Center
          </button>
        </div>

        {/* ═══ ΑΝΑΛΥΣΗ (loading) ═══ */}
        {screen === 'analyzing' && (
          <div style={{ ...S.card, maxWidth:560, margin:'8vh auto 0', textAlign:'center', padding:'42px 28px' }}>
            <div style={{ width:66, height:66, margin:'0 auto 18px', borderRadius:'50%', border:`2px solid ${ACC}55`, display:'grid', placeItems:'center', animation:'pcpulse 1.7s ease-in-out infinite' }}>
              <Brain style={{ width:28, height:28, color:ACC }}/>
            </div>
            <p style={{ fontSize:17.5, fontWeight:800, margin:'0 0 18px' }}>Ο εγκέφαλος αναλύει τον πελάτη…</p>
            <div style={{ textAlign:'left', maxWidth:340, margin:'0 auto' }}>
              {['Μετρήσεις & πορεία βάρους','Ιστορικό διατροφών & θερμίδων','Προπονητικά δεδομένα (Live Training)','Στόχος & διατροφικό προφίλ'].map((t, i) => (
                <div key={t} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', opacity: checkStep > i ? 1 : 0.35, transition:'opacity .4s' }}>
                  <span style={{ width:20, height:20, borderRadius:'50%', display:'grid', placeItems:'center', background: checkStep > i ? '#22c55e' : 'rgba(255,255,255,0.1)' }}>
                    {checkStep > i ? <Check style={{ width:12, height:12, color:'#06060b' }}/> : <Loader2 style={{ width:11, height:11, color:'rgba(255,255,255,0.5)', animation:'pcspin 1s linear infinite' }}/>}
                  </span>
                  <span style={{ fontSize:13, fontWeight:600 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ BRIEF — ανάλυση + επεξεργάσιμοι στόχοι ═══ */}
        {screen === 'brief' && analysis && (
          <div style={{ display:'grid', gridTemplateColumns:'1.35fr 1fr', gap:16, alignItems:'start' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <p style={{ ...S.lbl, margin:'0 0 2px' }}>Διατροφικό-προπονητικό brief{!aiUsed && ' (τοπικός υπολογισμός — AI μη διαθέσιμο)'}</p>
              {(analysis.points || []).map((pt, i) => {
                const col = TAG_COLORS[pt.tag] || ACC;
                const Icon = TAG_ICONS[pt.tag] || Sparkles;
                return (
                  <div key={i} style={{ ...S.card, padding:'14px 16px', borderLeft:`3px solid ${col}`, animation:`pcin .5s ${i * 0.09}s ease both` }}>
                    <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                      <span style={{ width:30, height:30, borderRadius:9, flexShrink:0, display:'grid', placeItems:'center', background: col + '1c' }}>
                        <Icon style={{ width:15, height:15, color: col }}/>
                      </span>
                      <div>
                        <span style={{ fontSize:9.5, letterSpacing:'.16em', fontWeight:800, color: col }}>{pt.tag}</span>
                        <p style={{ margin:'3px 0 0', fontSize:13.5, lineHeight:1.55 }}>{pt.text}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {analysis.add_postworkout && analysis.postworkout_reason && (
                <p style={{ ...S.dim, fontSize:12, margin:'2px 0 0 4px' }}>💡 {analysis.postworkout_reason}</p>
              )}
            </div>

            <div style={{ ...S.card, position:'sticky', top:20 }}>
              <p style={{ ...S.lbl, margin:'0 0 14px' }}>Ημερήσιοι στόχοι — επεξεργάσιμοι</p>
              {[[Flame, 'Θερμίδες', calories, setCalories, 'kcal', '#f59e0b'],
                [Beef, 'Πρωτεΐνη', proteinG, setProteinG, 'g', '#f87171'],
                [Droplets, 'Νερό', waterL, setWaterL, 'L', '#38bdf8']].map(([Icon, l, v, set, u, col]) => (
                <div key={l} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:11 }}>
                  <span style={{ width:36, height:36, borderRadius:11, display:'grid', placeItems:'center', background: col + '1a', flexShrink:0 }}>
                    <Icon style={{ width:17, height:17, color: col }}/>
                  </span>
                  <div style={{ flex:1 }}>
                    <p style={{ ...S.lbl, fontSize:9.5, margin:'0 0 3px' }}>{l}</p>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <input style={{ ...S.inp, padding:'8px 11px', fontSize:17, fontWeight:800 }} type="number" step={l === 'Νερό' ? '0.1' : '1'} value={v} onChange={e => set(e.target.value)}/>
                      <span style={{ ...S.dim, fontSize:12, fontWeight:700 }}>{u}</span>
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ display:'flex', alignItems:'center', gap:10, margin:'14px 0', padding:'10px 12px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)' }}>
                <Pill style={{ width:15, height:15, color:'#a78bfa', flexShrink:0 }}/>
                <span style={{ fontSize:12.5, fontWeight:700, flex:1 }}>Μετα-προπονητικό γεύμα</span>
                <button onClick={() => setAddPost(v => !v)}
                  style={{ width:42, height:24, borderRadius:999, border:'none', cursor:'pointer', position:'relative', background: addPost ? '#22c55e' : 'rgba(255,255,255,0.15)', transition:'background .2s' }}>
                  <span style={{ position:'absolute', top:3, left: addPost ? 21 : 3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left .2s' }}/>
                </button>
              </div>

              <p style={{ ...S.lbl, margin:'0 0 8px' }}>Συμπληρώματα</p>
              <div style={{ display:'flex', gap:7, marginBottom:9 }}>
                <input style={S.inp} value={supInput} onChange={e => setSupInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && supInput.trim()) { setSups(p => [...p, { name: supInput.trim(), reason:'' }]); setSupInput(''); } }}
                  placeholder="π.χ. Κρεατίνη 5g ↵"/>
                <button onClick={() => { if (supInput.trim()) { setSups(p => [...p, { name: supInput.trim(), reason:'' }]); setSupInput(''); } }} style={{ ...S.btn(false), padding:'0 13px' }}><Plus style={{ width:15, height:15 }}/></button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:16 }}>
                {sups.map((s, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'8px 11px', borderRadius:11, background:'rgba(167,139,250,0.1)', border:'1px solid rgba(167,139,250,0.3)' }}>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:0, fontSize:12.5, fontWeight:800 }}>{s.name}</p>
                      {s.reason && <p style={{ ...S.dim, fontSize:11, margin:'2px 0 0' }}>{s.reason}</p>}
                    </div>
                    <button onClick={() => setSups(p => p.filter((_, j) => j !== i))} style={{ background:'transparent', border:'none', cursor:'pointer', padding:2 }}><X style={{ width:13, height:13, color:'rgba(255,255,255,0.5)' }}/></button>
                  </div>
                ))}
                {!sups.length && <span style={{ ...S.dim, fontSize:12 }}>Κανένα.</span>}
              </div>

              <button onClick={buildPlan} style={{ ...S.btn(true), width:'100%', padding:'15px', boxShadow:`0 0 26px ${ACC}44` }}>
                Δημιουργία διατροφής
              </button>
            </div>
          </div>
        )}

        {/* ═══ BUILDING ═══ */}
        {screen === 'building' && (
          <div style={{ minHeight:'56vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
            <Loader2 style={{ width:32, height:32, color:ACC, animation:'pcspin 1s linear infinite', marginBottom:20 }}/>
            <p style={{ fontSize:16.5, fontWeight:800, margin:0 }}>
              {['Σύνθεση δομής με τα επιλεγμένα γεύματα…','Υπολογισμός ποσοτήτων & μακροθρεπτικών…','Τελικός έλεγχος στόχων ημέρας…'][buildPhase]}
            </p>
          </div>
        )}

        {/* ═══ REVIEW ═══ */}
        {screen === 'review' && (
          <div>
            <div style={{ ...S.card, display:'flex', alignItems:'center', gap:18, flexWrap:'wrap', marginBottom:14, position:'sticky', top:12, zIndex:5, background:'rgba(10,10,17,0.95)' }}>
              <input style={{ ...S.inp, flex:'1 1 240px', fontWeight:800 }} value={title} onChange={e => setTitle(e.target.value)}/>
              {(() => {
                const dc = totals.c - (num(calories) || 0), dp = totals.p - (num(proteinG) || 0);
                const okC = Math.abs(dc) <= (num(calories) || 0) * 0.05, okP = dp >= 0;
                return (
                  <div style={{ display:'flex', gap:14 }}>
                    <div><p style={{ ...S.lbl, fontSize:9, margin:'0 0 2px' }}>Θερμίδες ημέρας</p>
                      <p style={{ margin:0, fontWeight:800, fontSize:16, color: okC ? '#4ade80' : '#fbbf24' }}>{totals.c} <span style={{ ...S.dim, fontSize:11 }}>/ {calories} kcal</span></p></div>
                    <div><p style={{ ...S.lbl, fontSize:9, margin:'0 0 2px' }}>Πρωτεΐνη</p>
                      <p style={{ margin:0, fontWeight:800, fontSize:16, color: okP ? '#4ade80' : '#fbbf24' }}>{totals.p} <span style={{ ...S.dim, fontSize:11 }}>/ {proteinG} g</span></p></div>
                  </div>
                );
              })()}
              <div style={{ display:'flex', gap:8, marginLeft:'auto' }}>
                <button onClick={() => setScreen('brief')} style={S.btn(false)}>Πίσω στην ανάλυση</button>
                <button onClick={() => !saving && approve()} style={{ ...S.btn(true), opacity: saving ? 0.6 : 1 }}>{saving ? 'Αποθήκευση…' : 'Έγκριση & Αποστολή'}</button>
              </div>
            </div>
            <p style={{ ...S.dim, fontSize:11.5, margin:'0 0 14px' }}>Το ημερήσιο σύνολο υπολογίζεται με την 1η επιλογή κάθε κατηγορίας. Άλλαξε ΜΟΝΟ το κουτάκι kcal ενός γεύματος και πάτα το ✓ — οι ποσότητες των υλικών προσαρμόζονται αυτόματα επί τόπου.</p>

            {sections.map(sec => (
              <div key={sec._id} style={{ ...S.card, marginBottom:12 }}>
                <p style={{ ...S.lbl, color:ACC, margin:'0 0 6px' }}>{sec.section_name}{sec.time ? ` · ${sec.time}` : ''}</p>
                {sec.options.map((o, oi) => (
                  <div key={o._id} style={{ padding:'12px 0', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                    {o._edit ? (
                      <div>
                        <div style={{ display:'flex', gap:9, alignItems:'center', marginBottom:7 }}>
                          <input style={{ ...S.inp, padding:'7px 10px', fontWeight:800 }} value={o.name || ''} onChange={e => editOpt(sec._id, o._id, 'name', e.target.value)} placeholder="Όνομα γεύματος"/>
                          <button onClick={() => delOpt(sec._id, o._id)} style={{ background:'transparent', border:'none', cursor:'pointer', padding:4, flexShrink:0 }}><X style={{ width:15, height:15, color:'rgba(255,255,255,0.4)' }}/></button>
                        </div>
                        <input style={{ ...S.inp, padding:'7px 10px', fontSize:12.5, marginBottom:7 }} value={o.ingredients || ''} onChange={e => editOpt(sec._id, o._id, 'ingredients', e.target.value)} placeholder="Υλικά με ποσότητες (π.χ. Κοτόπουλο 180g, Ρύζι 90g)"/>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:7, marginBottom:9 }}>
                          {[['calories','kcal'],['protein','Πρωτ. g'],['carbs','Υδατ. g'],['fat','Λίπη g']].map(([k, l]) => (
                            <div key={k}>
                              <p style={{ ...S.lbl, fontSize:8.5, margin:'0 0 3px' }}>{l}</p>
                              <input style={{ ...S.inp, padding:'6px 9px', fontSize:13 }} type="number" value={o[k] ?? ''} onChange={e => editOpt(sec._id, o._id, k, e.target.value)}/>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => { editOpt(sec._id, o._id, '_edit', false); editOpt(sec._id, o._id, '_calDraft', String(o.calories ?? '')); }} style={{ ...S.btn(false), padding:'7px 14px', fontSize:12 }}>Έτοιμο</button>
                      </div>
                    ) : (
                      <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:7 }}>
                            <span style={{ ...S.lbl, fontSize:9, flexShrink:0 }}>{oi === 0 ? '★ Επιλογή 1' : `Επιλογή ${oi + 1}`}</span>
                            <p style={{ margin:0, fontSize:14.5, fontWeight:800, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.name || '—'}</p>
                            <div style={{ marginLeft:'auto', display:'flex', gap:2, flexShrink:0 }}>
                              <button onClick={() => editOpt(sec._id, o._id, '_edit', true)} title="Επεξεργασία γεύματος" style={{ background:'transparent', border:'none', cursor:'pointer', padding:4, opacity:.45 }}><Pencil style={{ width:13, height:13, color:'#fff' }}/></button>
                              <button onClick={() => delOpt(sec._id, o._id)} title="Αφαίρεση" style={{ background:'transparent', border:'none', cursor:'pointer', padding:4, opacity:.45 }}><X style={{ width:14, height:14, color:'#fff' }}/></button>
                            </div>
                          </div>
                          <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                            {(o.ingredients || '').split(',').map(x => x.trim()).filter(Boolean).map((ing, ii) => (
                              <span key={ii} style={{ fontSize:12.5, color:'rgba(255,255,255,0.75)' }}>•&nbsp; {ing}</span>
                            ))}
                            {!o.ingredients && <span style={{ ...S.dim, fontSize:12 }}>Χωρίς υλικά — πάτα το μολύβι για επεξεργασία.</span>}
                          </div>
                          <p style={{ ...S.dim, fontSize:10.5, margin:'8px 0 0' }}>Πρωτεΐνη {num(o.protein) ?? '—'}g · Υδατ. {num(o.carbs) ?? '—'}g · Λίπη {num(o.fat) ?? '—'}g</p>
                        </div>
                        <div style={{ width:132, flexShrink:0, textAlign:'center' }}>
                          <p style={{ ...S.lbl, fontSize:8.5, margin:'0 0 5px' }}>Θερμίδες γεύματος</p>
                          <div style={{ display:'flex', gap:6, alignItems:'center', justifyContent:'center' }}>
                            <input style={{ ...S.inp, padding:'8px 6px', fontSize:15.5, fontWeight:800, textAlign:'center', width:80 }} type="number"
                              value={o._calDraft ?? o.calories ?? ''} onChange={e => editOpt(sec._id, o._id, '_calDraft', e.target.value)}/>
                            {num(o._calDraft) != null && num(o._calDraft) !== num(o.calories) ? (
                              <button onClick={() => applyCal(sec._id, o._id)} title="Προσαρμογή ποσοτήτων στις νέες θερμίδες"
                                style={{ width:34, height:34, borderRadius:10, border:'none', cursor:'pointer', flexShrink:0, display:'grid', placeItems:'center', background:'#22c55e', boxShadow:'0 0 12px rgba(34,197,94,0.45)' }}>
                                <Check style={{ width:17, height:17, color:'#06110a' }}/>
                              </button>
                            ) : <span style={{ width:34, flexShrink:0 }}/>}
                          </div>
                          <p style={{ ...S.dim, fontSize:9.5, margin:'6px 0 0' }}>kcal — άλλαξέ το & πάτα ✓</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <button onClick={() => addOpt(sec._id)} style={{ ...S.btn(false), marginTop:10, padding:'8px 14px', fontSize:12 }}><Plus style={{ width:13, height:13, verticalAlign:'-2px' }}/> Προσθήκη επιλογής</button>
              </div>
            ))}

            <div style={S.card}>
              <p style={{ ...S.lbl, margin:'0 0 8px' }}>Σημειώσεις πλάνου</p>
              <textarea style={{ ...S.inp, minHeight:70, resize:'vertical' }} value={notes} onChange={e => setNotes(e.target.value)}/>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pcspin{to{transform:rotate(360deg)}}
        @keyframes pcpulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.07);opacity:.7}}
        @keyframes pcin{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
      `}</style>
    </div>
  );
}
