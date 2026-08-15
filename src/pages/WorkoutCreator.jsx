import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, X, Loader2, Brain, ArrowLeft, Dumbbell, TrendingDown, CalendarDays, Clock, Plus, Sparkles, Save, Link2, Pencil } from 'lucide-react';
import { db, callAI } from '../lib/db';
import { EXERCISE_DB, EQUIPMENT, getExercisesFor, sortBySessionOrder } from '../lib/gymEquipment';
import { groupDisplayName, firstName } from '../lib/groups';

/* ═══════════ Σταθερά ═══════════ */

const num = v => { const n = parseFloat(v); return isNaN(n) ? null : n; };
const todayStr = () => new Date().toISOString().split('T')[0];
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; };

const GOAL_LABELS = { fat_loss:'Απώλεια λίπους', muscle_gain:'Μυϊκή ανάπτυξη', recomp:'Ανασύνθεση', maintain:'Συντήρηση', performance:'Απόδοση' };
const TAG_COLORS = { 'ΠΟΡΕΙΑ':'#38bdf8', 'ΕΒΔΟΜΑΔΑ':'#f59e0b', 'ΑΔΥΝΑΜΙΕΣ':'#f87171', 'ΠΡΟΤΑΣΗ':'#22c55e' };
const TAG_ICONS  = { 'ΠΟΡΕΙΑ':TrendingDown, 'ΕΒΔΟΜΑΔΑ':CalendarDays, 'ΑΔΥΝΑΜΙΕΣ':Dumbbell, 'ΠΡΟΤΑΣΗ':Sparkles };

const SESSIONS = {
  male: [
    { key:'upper',     label:'Upper Body',   emoji:'💪', desc:'Στήθος, πλάτη, ώμοι, χέρια' },
    { key:'lower',     label:'Lower Body',   emoji:'🦵', desc:'Πόδια, γλουτοί, γάμπες' },
    { key:'full_body', label:'Full Body',    emoji:'🏋️', desc:'Ολόσωμη προπόνηση' },
  ],
  female: [
    { key:'upper',     label:'Upper Body',   emoji:'💪', desc:'Στήθος, πλάτη, ώμοι, χέρια' },
    { key:'lower',     label:'Lower Body',   emoji:'🦵', desc:'Πόδια, γλουτοί, γάμπες' },
    { key:'glutes',    label:'Glute Focused', emoji:'🍑', desc:'Γλουτοί & οπίσθια αλυσίδα' },
  ],
};
const TYPE_META = { upper:{label:'Upper Body',emoji:'💪'}, lower:{label:'Lower Body',emoji:'🦵'}, full_body:{label:'Full Body',emoji:'🏋️'}, glutes:{label:'Glutes',emoji:'🍑'} };
const TYPE_GROUPS = {
  upper: ['chest','back','shoulders','biceps','triceps'],
  lower: ['legs','glutes','calves'],
  glutes: ['glutes','legs'],
  full_body: ['chest','back','shoulders','legs','glutes','core'],
};
const SCHEMES = {
  fat_loss:    { sets:3, reps:'12-15', rest:50 },
  muscle_gain: { sets:4, reps:'8-12',  rest:90 },
  recomp:      { sets:3, reps:'10-12', rest:75 },
  maintain:    { sets:3, reps:'10-12', rest:60 },
  performance: { sets:5, reps:'5-6',   rest:120 },
};

export const typeOfPlan = (p) => p.session_type
  || (/(glute|γλουτ)/i.test(p.title||'') ? 'glutes'
    : /(upper|πάνω κορμ|άνω)/i.test(p.title||'') ? 'upper'
    : /(lower|κάτω|πόδι)/i.test(p.title||'') ? 'lower'
    : /full/i.test(p.title||'') ? 'full_body' : null);

function parseJsonObj(txt) {
  if (!txt || txt.startsWith('__ERROR__')) return null;
  try {
    const s = txt.indexOf('{'), e = txt.lastIndexOf('}');
    if (s === -1 || e === -1) return null;
    return JSON.parse(txt.slice(s, e + 1));
  } catch { return null; }
}

/* τελευταία γνωστά κιλά ανά άσκηση από το ιστορικό (Live Training) */
function knownLiftsFrom(tplans) {
  const map = {};
  [...tplans].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).forEach(t => {
    (t.exercises || []).forEach(ex => {
      const w = num(ex.weight_kg);
      if (ex.name && w > 0 && map[ex.name] === undefined) map[ex.name] = w;
    });
    (t.session_results || []).forEach(r => {
      const last = (r.sets || []).filter(s2 => num(s2.weight_kg) > 0).pop();
      if (r.name && last && map[r.name] === undefined) map[r.name] = num(last.weight_kg);
    });
  });
  return map;
}

function weekSummary(tplans) {
  const cutoff = daysAgo(7);
  const done = tplans.filter(t => t.completed && ((t.completed_date || t.date || '') >= cutoff));
  const types = done.map(t => typeOfPlan(t)).filter(Boolean);
  let setsPlanned = 0, setsDone = 0; const missed = [];
  done.forEach(t => (t.session_results || []).forEach(exr => {
    setsPlanned += exr.sets_planned || 0; setsDone += exr.sets_done || 0;
    const miss = (exr.sets || []).filter(s2 => s2.completed && s2.target_reps && !s2.hit_target).length + ((exr.sets_planned || 0) - (exr.sets_done || 0));
    if (miss > 0) missed.push(`${exr.name} (${miss})`);
  }));
  return { count: done.length, types, setsPlanned, setsDone, missed };
}

/* ═══════════ Component ═══════════ */

export default function WorkoutCreator() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const clientId = params.get('client') || '';
  const groupId = params.get('group') || '';

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [memberIndex, setMemberIndex] = useState(0);
  const effClientId = groupId ? (members[memberIndex]?.id || '') : clientId;

  const [data, setData] = useState(null);
  const [screen, setScreen] = useState('analyzing'); // analyzing | brief | building | review | finish
  const [checkStep, setCheckStep] = useState(0);
  const [analysis, setAnalysis] = useState(null);
  const [aiUsed, setAiUsed] = useState(true);
  const [chosen, setChosen] = useState('');

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState([]);
  const [buildPhase, setBuildPhase] = useState(0);
  const [addSel, setAddSel] = useState('');

  /* finish */
  const [finishMode, setFinishMode] = useState('');   // '' | schedule | assign
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selDay, setSelDay] = useState('');
  const [freeSlots, setFreeSlots] = useState([]);
  const [dayAppts, setDayAppts] = useState([]);
  const [confirmTime, setConfirmTime] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [timeCheck, setTimeCheck] = useState(null);
  const [openAppts, setOpenAppts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const ACC = data?.client?.theme_color || '#e0a355';
  const gender = (data?.client?.gender === 'female') ? 'female' : 'male';
  const options = SESSIONS[gender];
  const goal = data?.profile?.goal_type || '';
  const scheme = SCHEMES[goal] || SCHEMES.maintain;

  /* ── group mode: φόρτωσε τα μέλη ── */
  useEffect(() => { (async () => {
    if (!groupId) return;
    const g = await db.Group.get(groupId);
    const mem = [];
    for (const id of g?.member_ids || []) { const c = await db.Client.get(id); if (c) mem.push(c); }
    setGroup(g); setMembers(mem); setMemberIndex(0);
  })(); }, [groupId]);

  /* ── αυτόματη φόρτωση του τρέχοντος πελάτη (individual ή τρέχον μέλος group) ── */
  useEffect(() => { (async () => {
    if (!effClientId) return;
    const [client, profs, tplans, progress, appts] = await Promise.all([
      db.Client.get(effClientId),
      db.NutritionProfile.filter({ client_id: effClientId }),
      db.TrainingPlan.filter({ client_id: effClientId }, '-date', 20),
      db.ClientProgress.filter({ client_id: effClientId }, '-date', 8),
      db.Appointment.filter({ client_id: effClientId }),
    ]);
    setData({ client, profile: profs[0] || {}, tplans, progress, appts });
    setScreen('analyzing'); setCheckStep(0); setAnalysis(null); setChosen('');
    setTitle(''); setNotes(''); setExercises([]); setFinishMode(''); setSavedMsg(''); setSaving(false);
  })(); }, [effClientId]);

  useEffect(() => {
    if (screen !== 'analyzing') return;
    const t = setInterval(() => setCheckStep(s => Math.min(s + 1, 4)), 1300);
    return () => clearInterval(t);
  }, [screen]);

  /* ── ο εγκέφαλος: ανάλυση + πρόταση session ── */
  useEffect(() => { (async () => {
    if (!data || screen !== 'analyzing') return;
    const { client, profile, tplans, progress } = data;
    const wk = weekSummary(tplans);
    const ms = [...progress].sort((a,b)=>(a.date||'').localeCompare(b.date||'')).slice(-4);
    const allowed = options.map(o => o.key);
    const freq = client.sessions_per_month ? Math.round(client.sessions_per_month / 4.3 * 10) / 10 : (client.sessions_per_week || null);

    const brief = [
      `ΠΕΛΑΤΗΣ: ${client.name}, φύλο ${gender === 'female' ? 'γυναίκα' : 'άνδρας'}. Στόχος: ${GOAL_LABELS[goal] || client.goals || 'γενική φυσική κατάσταση'}.`,
      ms.length ? 'ΜΕΤΡΗΣΕΙΣ (παλιά → νέα): ' + ms.map(m => `${m.date}: ${num(m.weight_kg) ?? '?'}kg${num(m.body_fat_pct)!=null ? ', λίπος ' + m.body_fat_pct + '%' : ''}${num(m.muscle_mass_kg)!=null ? ', μυς ' + m.muscle_mass_kg + 'kg' : ''}`).join(' | ') : 'ΜΕΤΡΗΣΕΙΣ: καμία.',
      `ΕΒΔΟΜΑΔΑ (τελευταίες 7 ημέρες): ${wk.count} ολοκληρωμένες προπονήσεις` + (wk.types.length ? ` [${wk.types.map(t => TYPE_META[t]?.label || t).join(', ')}]` : '') + (wk.setsPlanned ? `, σετ ${wk.setsDone}/${wk.setsPlanned}` : '') + (freq ? `. Συμφωνημένη συχνότητα ~${freq}/εβδομάδα.` : '.'),
      wk.missed.length ? 'ΔΥΣΚΟΛΙΕΣ (σετ κάτω από στόχο/ημιτελή): ' + wk.missed.slice(0, 5).join(', ') + '.' : 'Χωρίς σημαντικές αποτυχίες σετ την τελευταία εβδομάδα.',
      `ΔΙΑΘΕΣΙΜΑ SESSION TEMPLATES: ${options.map(o => `${o.key} (${o.label} — ${o.desc})`).join(' | ')}.`,
    ].join('\n');

    const prompt = `Είσαι ο προπονητικός εγκέφαλος ενός personal training studio. Ανάλυσε τα δεδομένα και πρότεινε ΠΟΙΟ από τα διαθέσιμα session templates πρέπει να γίνει σήμερα — με τεκμηρίωση σε ΑΡΙΘΜΟΥΣ (τι έγινε μέσα στη βδομάδα, ισορροπία μυϊκών ομάδων, αδυναμίες, στόχος).

${brief}

Δώσε 3-5 σημεία ανάλυσης στα ελληνικά (tags: ΠΟΡΕΙΑ, ΕΒΔΟΜΑΔΑ, ΑΔΥΝΑΜΙΕΣ, ΠΡΟΤΑΣΗ) και την πρόταση session. Το "recommended" ΠΡΕΠΕΙ να είναι ένα από: ${allowed.join(', ')}.
Απάντησε ΜΟΝΟ με JSON:
{"points":[{"tag":"ΕΒΔΟΜΑΔΑ","text":"..."}],"recommended":"${allowed[0]}","reason":"μία σύντομη πρόταση γιατί"}`;
    const r = await callAI(prompt, 'You are an expert strength coach. Return ONLY valid JSON. Start with {');
    let a = parseJsonObj(r);
    if (!a || !allowed.includes(a.recommended)) {
      /* ντετερμινιστικό δίχτυ: πρότεινε ό,τι ΔΕΝ έγινε πιο πρόσφατα */
      const lastDoneAt = {};
      [...tplans].filter(t => t.completed).forEach(t => { const ty = typeOfPlan(t); if (ty && !lastDoneAt[ty]) lastDoneAt[ty] = t.completed_date || t.date || ''; });
      const rec = [...allowed].sort((x, y) => (lastDoneAt[x] || '0').localeCompare(lastDoneAt[y] || '0'))[0];
      a = { points: [
        { tag:'ΕΒΔΟΜΑΔΑ', text:`Ολοκληρώθηκαν ${wk.count} προπονήσεις τις τελευταίες 7 ημέρες${wk.types.length ? ' (' + wk.types.map(t => TYPE_META[t]?.label || t).join(', ') + ')' : ''}.` },
        ...(wk.missed.length ? [{ tag:'ΑΔΥΝΑΜΙΕΣ', text:'Σετ κάτω από στόχο: ' + wk.missed.slice(0,4).join(', ') + '.' }] : []),
        { tag:'ΠΡΟΤΑΣΗ', text:`Με βάση την ισορροπία της εβδομάδας, προτείνεται ${TYPE_META[rec]?.label || rec}.` },
      ], recommended: rec, reason:'Δεν έχει δουλευτεί πρόσφατα σε σχέση με τα υπόλοιπα.' };
      setAiUsed(false);
    }
    setAnalysis(a); setChosen(a.recommended);
    setScreen('brief');
  })(); }, [data, screen]); // eslint-disable-line

  /* ── δημιουργία προπόνησης από τη βάση ασκήσεων ── */
  const buildWorkout = async () => {
    setScreen('building'); setBuildPhase(0);
    const ph = setInterval(() => setBuildPhase(p => (p + 1) % 3), 3000);
    const { client, tplans } = data;
    const groups = TYPE_GROUPS[chosen] || [];
    const candidates = sortBySessionOrder(getExercisesFor(groups));
    const lifts = knownLiftsFrom(tplans);
    const candTxt = candidates.map(e => `- ${e.name} [${(e.muscles || []).join(',')}]${lifts[e.name] ? ` (τελευταίο βάρος: ${lifts[e.name]}kg)` : ''}`).join('\n');
    const sessLabel = TYPE_META[chosen]?.label || chosen;

    const prompt = `Φτιάξε ${sessLabel} προπόνηση για: ${client.name} (${gender === 'female' ? 'γυναίκα' : 'άνδρας'}). Στόχος: ${GOAL_LABELS[goal] || 'γενική φυσική κατάσταση'}.
Σχήμα στόχου: ~${scheme.sets} σετ, ${scheme.reps} επαναλήψεις, διάλειμμα ~${scheme.rest}s (προσαρμόσέ το λογικά ανά άσκηση — σύνθετες: περισσότερο, απομονώσεις: λιγότερο).
ΔΙΑΛΕΞΕ 6-7 ασκήσεις ΑΠΟΚΛΕΙΣΤΙΚΑ από την παρακάτω λίστα (γράψε τα ονόματα ΑΚΡΙΒΩΣ όπως δίνονται), σύνθετες πρώτες, κάλυψε ισορροπημένα τις μυϊκές ομάδες${chosen === 'glutes' ? ' με ΚΥΡΙΑ έμφαση στους γλουτούς (hip hinge, thrust patterns, abductions)' : ''}:
${candTxt}
ΚΙΛΑ: όπου δίνεται "τελευταίο βάρος", ξεκίνα από εκεί (ή ελαφρώς πάνω αν ο στόχος είναι μυϊκή ανάπτυξη). Αλλιώς συντηρητικά αρχικά κιλά· για ασκήσεις σωματικού βάρους βάλε 0.
Απάντησε ΜΟΝΟ με JSON:
{"title":"${sessLabel} — ${client.name.split(' ')[0]}","notes":"1-2 σύντομες οδηγίες","exercises":[{"name":"...","sets":${scheme.sets},"reps":"${scheme.reps}","weight_kg":0,"rest_between_sets":${scheme.rest}}]}`;
    const r = await callAI(prompt, 'You are an expert strength coach. Return ONLY valid JSON. Start with {');
    clearInterval(ph);
    let p = parseJsonObj(r);
    let exs = Array.isArray(p?.exercises) ? p.exercises : [];
    const byName = Object.fromEntries(candidates.map(e => [e.name.toLowerCase(), e]));
    exs = exs.map(e => {
      const dbe = byName[String(e.name || '').toLowerCase().trim()];
      if (!dbe) return null;
      return {
        name: dbe.name, eq: dbe.eq,
        sets: Math.min(6, Math.max(1, parseInt(e.sets) || scheme.sets)),
        reps: String(e.reps || scheme.reps),
        weight_kg: Math.max(0, num(e.weight_kg) ?? (lifts[dbe.name] || 0)),
        rest_between_sets: parseInt(e.rest_between_sets) || scheme.rest,
        set_details: [],
      };
    }).filter(Boolean);
    if (exs.length < 5) {
      /* δίχτυ: χτίσε από τη βάση ντετερμινιστικά */
      const used = new Set(exs.map(e => e.name));
      for (const c of candidates) {
        if (exs.length >= 6) break;
        if (used.has(c.name)) continue;
        exs.push({ name:c.name, eq:c.eq, sets:scheme.sets, reps:scheme.reps, weight_kg: lifts[c.name] || 0, rest_between_sets:scheme.rest, set_details:[] });
        used.add(c.name);
      }
      if (!p) setAiUsed(false);
    }
    setTitle(p?.title || `${sessLabel} — ${client.name.split(' ')[0]}`);
    setNotes(p?.notes || '');
    setExercises(exs);
    setScreen('review');
  };

  const editEx = (i, k, v) => setExercises(p => p.map((e, j) => j !== i ? e : { ...e, [k]: v }));
  const delEx = (i) => setExercises(p => p.filter((_, j) => j !== i));
  const addEx = () => {
    if (!addSel) return;
    const dbe = EXERCISE_DB.find(e => e.name === addSel);
    if (!dbe) return;
    setExercises(p => [...p, { name:dbe.name, eq:dbe.eq, sets:scheme.sets, reps:scheme.reps, weight_kg: knownLiftsFrom(data.tplans)[dbe.name] || 0, rest_between_sets:scheme.rest, set_details:[] }]);
    setAddSel('');
  };

  /* ── αποθήκευση / προγραμματισμός / ανάθεση ── */
  const createPlan = async (extra = {}) => {
    return db.TrainingPlan.create({
      client_id: effClientId, client_name: data.client.name, date: extra.date || todayStr(),
      title, session_type: chosen, notes, exercises, completed: false, created_via: 'brain',
    });
  };
  const afterFinish = (msg) => {
    setSaving(false);
    const nextMem = groupId && memberIndex < members.length - 1 ? members[memberIndex + 1] : null;
    setSavedMsg(msg + (nextMem ? `  Συνεχίζουμε με ${firstName(nextMem.name)}…` : ''));
    setTimeout(() => { if (nextMem) setMemberIndex(i => i + 1); else navigate('/TrainingPlans'); }, 1500);
  };
  const doSave = async () => {
    setSaving(true);
    await createPlan();
    afterFinish('Η προπόνηση αποθηκεύτηκε στον φάκελο του πελάτη.');
  };
  const pickDay = async (ds) => {
    setSelDay(ds); setConfirmTime(''); setTimeCheck(null); setManualTime('');
    const appts = (await db.Appointment.filter({ date: ds })).filter(a => a.status !== 'cancelled');
    setDayAppts(appts);
    const dur = (data.client.session_duration_hours || 1) * 60;
    const toMin = (t) => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
    const busy = appts.map(a => [toMin(a.start_time), toMin(a.start_time) + (a.duration_minutes || 60)]);
    const isFree = (m) => busy.every(([s, e]) => m + dur <= s || m >= e);
    const out = [];
    for (let m = 8 * 60; m <= 21 * 60 - dur && out.length < 5; m += 15) {
      if (isFree(m)) { out.push(`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`); m += 75; }
    }
    setFreeSlots(out);
  };
  const checkTime = (t) => {
    if (!t) return;
    const dur = (data.client.session_duration_hours || 1) * 60;
    const toMin = (x) => { const [h, m] = x.split(':').map(Number); return h * 60 + (m || 0); };
    const mm = toMin(t);
    const busy = dayAppts.map(a => [toMin(a.start_time || '0:0'), toMin(a.start_time || '0:0') + (a.duration_minutes || 60)]);
    const ok = busy.every(([s, e]) => mm + dur <= s || mm >= e);
    setTimeCheck({ time: t, ok });
    if (ok) setConfirmTime(t);
  };
  const doSchedule = async () => {
    setSaving(true);
    const plan = await createPlan({ date: selDay });
    await db.Appointment.create({
      title: `${data.client.name} — ${TYPE_META[chosen]?.label || 'Προπόνηση'}`,
      client_id: effClientId, client_name: data.client.name, client_color: data.client.theme_color || ACC,
      type: 'training', date: selDay, start_time: confirmTime,
      duration_minutes: (data.client.session_duration_hours || 1) * 60, status: 'scheduled', plan_id: plan.id,
    });
    afterFinish(`Προγραμματίστηκε: ${selDay} · ${confirmTime} — αποθηκεύτηκε και στα δύο ημερολόγια.`);
  };
  const openAssign = async () => {
    setFinishMode('assign');
    const list = (data.appts || [])
      .filter(a => (a.date || '') >= todayStr() && a.status !== 'cancelled' && !a.plan_id && (a.type === 'training' || !a.type))
      .sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time))
      .slice(0, 10);
    setOpenAppts(list);
  };
  const doAssign = async (appt) => {
    setSaving(true);
    const plan = await createPlan({ date: appt.date });
    await db.Appointment.update(appt.id, { plan_id: plan.id });
    afterFinish(`Ανατέθηκε στο ραντεβού ${appt.date} · ${appt.start_time}.`);
  };

  /* ── στυλ ── */
  const S = {
    page:{ minHeight:'100vh', background:'#07070c', color:'#eef0f6', fontFamily:'var(--font-display, "Space Grotesk", sans-serif)',
      backgroundImage:`radial-gradient(900px 460px at 10% -6%, ${ACC}14, transparent 60%), radial-gradient(760px 400px at 100% 0%, ${ACC}0b, transparent 55%)` },
    wrap:{ maxWidth:1100, margin:'0 auto', padding:'26px 22px 90px' },
    kicker:{ fontSize:10.5, letterSpacing:'.32em', textTransform:'uppercase', color:ACC, fontWeight:700 },
    card:{ background:'rgba(255,255,255,0.035)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:18, padding:'18px 20px' },
    lbl:{ fontSize:10.5, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.42)', fontWeight:700 },
    dim:{ color:'rgba(255,255,255,0.45)' },
    inp:{ background:'rgba(0,0,0,0.38)', border:'1px solid rgba(255,255,255,0.13)', borderRadius:11, color:'#eef0f6', padding:'9px 11px', fontSize:13.5, outline:'none', width:'100%', fontFamily:'inherit' },
    btn:(primary)=>({ border:'none', borderRadius:12, padding:'13px 24px', fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'inherit',
      background: primary ? ACC : 'transparent', color: primary ? '#07070b' : 'rgba(255,255,255,0.7)', outline: primary ? 'none' : '1px solid rgba(255,255,255,0.17)' }),
    navBtn:{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:999, fontSize:12, fontWeight:800, cursor:'pointer',
      background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.75)', fontFamily:'inherit' },
  };

  if (!data) return (
    <div style={{ ...S.page, display:'grid', placeItems:'center' }}>
      <Loader2 style={{ width:28, height:28, color:'#fff', animation:'wcspin 1s linear infinite' }}/>
      <style>{`@keyframes wcspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const { client } = data;

  return (
    <div style={S.page}>
      <div style={S.wrap}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:22 }}>
          <div>
            <span style={S.kicker}>The Cube · Δημιουργία προπόνησης{groupId ? ' (group)' : ''}</span>
            {groupId && members.length > 0 && (
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, margin:'6px 0 2px', padding:'4px 12px', borderRadius:999, background:`${ACC}1c`, border:`1px solid ${ACC}55` }}>
                <span style={{ fontSize:13 }}>👥</span>
                <span style={{ fontSize:12, fontWeight:800, color:ACC }}>{groupDisplayName(group, members)} · Μέλος {memberIndex + 1}/{members.length}</span>
              </div>
            )}
            <h1 style={{ fontSize:25, fontWeight:800, letterSpacing:'-.02em', margin:'6px 0 3px' }}>{client.name}</h1>
            <p style={{ ...S.dim, fontSize:12.5, margin:0 }}>{gender === 'female' ? 'Γυναικείο' : 'Ανδρικό'} εβδομαδιαίο πλαίσιο · {GOAL_LABELS[goal] || client.goals || '—'}</p>
          </div>
          <button onClick={() => navigate('/TrainingPlans')} style={{ ...S.btn(false), display:'inline-flex', alignItems:'center', gap:7 }}>
            <ArrowLeft style={{ width:14, height:14 }}/> Training Center
          </button>
        </div>

        {/* ═══ ΑΝΑΛΥΣΗ ═══ */}
        {screen === 'analyzing' && (
          <div style={{ ...S.card, maxWidth:560, margin:'8vh auto 0', textAlign:'center', padding:'42px 28px' }}>
            <div style={{ width:66, height:66, margin:'0 auto 18px', borderRadius:'50%', border:`2px solid ${ACC}55`, display:'grid', placeItems:'center', animation:'wcpulse 1.7s ease-in-out infinite' }}>
              <Brain style={{ width:28, height:28, color:ACC }}/>
            </div>
            <p style={{ fontSize:17.5, fontWeight:800, margin:'0 0 18px' }}>Ο εγκέφαλος αναλύει την προπονητική εικόνα…</p>
            <div style={{ textAlign:'left', maxWidth:360, margin:'0 auto' }}>
              {['Πορεία & μετρήσεις','Προπονήσεις εβδομάδας (Live Training)','Σετ κάτω από στόχο / αποτυχίες','Στόχος & πλαίσιο sessions'].map((t, i) => (
                <div key={t} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', opacity: checkStep > i ? 1 : 0.35, transition:'opacity .4s' }}>
                  <span style={{ width:20, height:20, borderRadius:'50%', display:'grid', placeItems:'center', background: checkStep > i ? '#22c55e' : 'rgba(255,255,255,0.1)' }}>
                    {checkStep > i ? <Check style={{ width:12, height:12, color:'#06060b' }}/> : <Loader2 style={{ width:11, height:11, color:'rgba(255,255,255,0.5)', animation:'wcspin 1s linear infinite' }}/>}
                  </span>
                  <span style={{ fontSize:13, fontWeight:600 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ BRIEF + ΕΠΙΛΟΓΗ SESSION ═══ */}
        {screen === 'brief' && analysis && (
          <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:16, alignItems:'start' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <p style={{ ...S.lbl, margin:'0 0 2px' }}>Προπονητικό brief{!aiUsed && ' (τοπικός υπολογισμός — AI μη διαθέσιμο)'}</p>
              {(analysis.points || []).map((pt, i) => {
                const col = TAG_COLORS[pt.tag] || ACC;
                const Icon = TAG_ICONS[pt.tag] || Sparkles;
                return (
                  <div key={i} style={{ ...S.card, padding:'14px 16px', borderLeft:`3px solid ${col}`, animation:`wcin .5s ${i * 0.09}s ease both` }}>
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
            </div>

            <div style={{ ...S.card, position:'sticky', top:20 }}>
              <p style={{ ...S.lbl, margin:'0 0 4px' }}>Session εβδομαδιαίου πλαισίου</p>
              <p style={{ ...S.dim, fontSize:11.5, margin:'0 0 12px' }}>Ο εγκέφαλος προτείνει — εσύ αποφασίζεις.</p>
              <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                {options.map(o => {
                  const on = chosen === o.key;
                  const rec = analysis.recommended === o.key;
                  return (
                    <button key={o.key} onClick={() => setChosen(o.key)}
                      style={{ textAlign:'left', padding:'13px 15px', borderRadius:14, cursor:'pointer', fontFamily:'inherit', position:'relative',
                        border:`1.7px solid ${on ? ACC : 'rgba(255,255,255,0.11)'}`, background: on ? `${ACC}1c` : 'rgba(255,255,255,0.02)', color:'#fff' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                        <span style={{ fontSize:23 }}>{o.emoji}</span>
                        <div style={{ flex:1 }}>
                          <p style={{ margin:0, fontSize:14.5, fontWeight:800 }}>{o.label}</p>
                          <p style={{ ...S.dim, margin:'2px 0 0', fontSize:11.5 }}>{o.desc}</p>
                        </div>
                        {rec && <span style={{ fontSize:9.5, fontWeight:800, letterSpacing:'.08em', padding:'4px 9px', borderRadius:999, background:'#22c55e22', border:'1px solid #22c55e66', color:'#4ade80', flexShrink:0 }}>ΠΡΟΤΑΣΗ ★</span>}
                      </div>
                      {rec && analysis.reason && <p style={{ ...S.dim, fontSize:11, margin:'8px 0 0', paddingLeft:34 }}>{analysis.reason}</p>}
                    </button>
                  );
                })}
              </div>
              <button onClick={buildWorkout} style={{ ...S.btn(true), width:'100%', marginTop:14, padding:'15px', boxShadow:`0 0 26px ${ACC}44` }}>
                Δημιουργία προπόνησης
              </button>
            </div>
          </div>
        )}

        {/* ═══ BUILDING ═══ */}
        {screen === 'building' && (
          <div style={{ minHeight:'56vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
            <Loader2 style={{ width:32, height:32, color:ACC, animation:'wcspin 1s linear infinite', marginBottom:20 }}/>
            <p style={{ fontSize:16.5, fontWeight:800, margin:0 }}>
              {['Επιλογή ασκήσεων από τον εξοπλισμό του studio…','Υπολογισμός σετ, επαναλήψεων & κιλών από το ιστορικό…','Τελική διάταξη προπόνησης…'][buildPhase]}
            </p>
          </div>
        )}

        {/* ═══ REVIEW ═══ */}
        {screen === 'review' && (
          <div>
            <div style={{ ...S.card, display:'flex', alignItems:'center', gap:14, flexWrap:'wrap', marginBottom:14 }}>
              <span style={{ fontSize:22 }}>{TYPE_META[chosen]?.emoji}</span>
              <input style={{ ...S.inp, flex:'1 1 240px', fontWeight:800, fontSize:15 }} value={title} onChange={e => setTitle(e.target.value)}/>
              <button onClick={() => setScreen('brief')} style={S.btn(false)}>Πίσω</button>
              <button onClick={() => setScreen('finish')} style={S.btn(true)}>Έγκριση — Συνέχεια</button>
            </div>

            <div style={S.card}>
              <div style={{ display:'grid', gridTemplateColumns:'2.2fr 64px 84px 84px 84px 30px', gap:8, padding:'0 0 8px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                {['Άσκηση','Σετ','Επαν.','Κιλά','Διάλ. (s)',''].map(h => <span key={h} style={{ ...S.lbl, fontSize:9 }}>{h}</span>)}
              </div>
              {exercises.map((e, i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'2.2fr 64px 84px 84px 84px 30px', gap:8, alignItems:'center', padding:'9px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ minWidth:0 }}>
                    <p style={{ margin:0, fontSize:13.5, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{i + 1}. {e.name}</p>
                    <span style={{ fontSize:9.5, color: (EQUIPMENT[e.eq]?.color) || 'rgba(255,255,255,0.4)' }}>{EQUIPMENT[e.eq]?.label || e.eq || ''}</span>
                  </div>
                  <input style={{ ...S.inp, textAlign:'center', padding:'7px 4px' }} type="number" value={e.sets} onChange={ev => editEx(i, 'sets', parseInt(ev.target.value) || 1)}/>
                  <input style={{ ...S.inp, textAlign:'center', padding:'7px 4px' }} value={e.reps} onChange={ev => editEx(i, 'reps', ev.target.value)}/>
                  <input style={{ ...S.inp, textAlign:'center', padding:'7px 4px' }} type="number" step="0.5" value={e.weight_kg} onChange={ev => editEx(i, 'weight_kg', parseFloat(ev.target.value) || 0)}/>
                  <input style={{ ...S.inp, textAlign:'center', padding:'7px 4px' }} type="number" value={e.rest_between_sets} onChange={ev => editEx(i, 'rest_between_sets', parseInt(ev.target.value) || 60)}/>
                  <button onClick={() => delEx(i)} style={{ background:'transparent', border:'none', cursor:'pointer', padding:3 }}><X style={{ width:15, height:15, color:'rgba(255,255,255,0.4)' }}/></button>
                </div>
              ))}
              <div style={{ display:'flex', gap:8, marginTop:12, alignItems:'center' }}>
                <select value={addSel} onChange={e => setAddSel(e.target.value)} style={{ ...S.inp, flex:1 }}>
                  <option value="">+ Προσθήκη άσκησης από τη βάση…</option>
                  {sortBySessionOrder(getExercisesFor(TYPE_GROUPS[chosen] || [])).filter(c => !exercises.find(x => x.name === c.name)).map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <button onClick={addEx} disabled={!addSel} style={{ ...S.btn(false), opacity: addSel ? 1 : 0.4 }}><Plus style={{ width:14, height:14 }}/></button>
              </div>
            </div>

            <div style={{ ...S.card, marginTop:12 }}>
              <p style={{ ...S.lbl, margin:'0 0 8px' }}>Σημειώσεις προπόνησης</p>
              <textarea style={{ ...S.inp, minHeight:60, resize:'vertical' }} value={notes} onChange={e => setNotes(e.target.value)}/>
            </div>
          </div>
        )}

        {/* ═══ FINISH: αποθήκευση / προγραμματισμός / ανάθεση ═══ */}
        {screen === 'finish' && (
          savedMsg ? (
            <div style={{ ...S.card, maxWidth:480, margin:'10vh auto 0', textAlign:'center', padding:'36px 24px' }}>
              <span style={{ width:48, height:48, margin:'0 auto 14px', borderRadius:'50%', background:'#22c55e', display:'grid', placeItems:'center' }}><Check style={{ width:24, height:24, color:'#06110a' }}/></span>
              <p style={{ fontSize:16, fontWeight:800, margin:0 }}>{savedMsg}</p>
            </div>
          ) : (
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                <button onClick={() => { setScreen('review'); setFinishMode(''); }} style={S.navBtn}><ArrowLeft style={{ width:13, height:13 }}/> Πίσω στην προπόνηση</button>
                <p style={{ ...S.dim, fontSize:13, margin:0 }}>«{title}» — τι θέλεις να την κάνουμε;</p>
              </div>

              {!finishMode && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:12 }}>
                  {[
                    { k:'save',    icon:Save,  t:'Απλή αποθήκευση',        d:'Μπαίνει στον φάκελο του πελάτη — την ξεκινάς όποτε θες.' },
                    { k:'schedule',icon:CalendarDays, t:'Προγραμματισμός', d:'Διάλεξε μέρα & ώρα — δημιουργείται ραντεβού και στα δύο ημερολόγια.' },
                    { k:'assign',  icon:Link2, t:'Ανάθεση σε ραντεβού',    d:'Σύνδεσέ την με υπάρχον προγραμματισμένο ραντεβού του πελάτη.' },
                  ].map(({ k, icon:Icon, t, d }) => (
                    <button key={k} onClick={() => k === 'save' ? (!saving && doSave()) : k === 'assign' ? openAssign() : setFinishMode('schedule')}
                      style={{ textAlign:'left', padding:'20px 18px', borderRadius:16, cursor:'pointer', fontFamily:'inherit',
                        border:'1.5px solid rgba(255,255,255,0.11)', background:'rgba(255,255,255,0.03)', color:'#fff' }}>
                      <span style={{ width:38, height:38, borderRadius:12, display:'grid', placeItems:'center', background:`${ACC}1c`, marginBottom:10 }}>
                        <Icon style={{ width:18, height:18, color:ACC }}/>
                      </span>
                      <p style={{ margin:0, fontSize:15, fontWeight:800 }}>{t}</p>
                      <p style={{ ...S.dim, margin:'4px 0 0', fontSize:12, lineHeight:1.5 }}>{d}</p>
                    </button>
                  ))}
                </div>
              )}

              {finishMode === 'schedule' && (
                <div style={{ ...S.card, maxWidth:520 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                    <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} style={{ ...S.navBtn, padding:'5px 10px' }}>‹</button>
                    <span style={{ fontSize:13, fontWeight:800 }}>{calMonth.toLocaleDateString('el-GR', { month:'long', year:'numeric' })}</span>
                    <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} style={{ ...S.navBtn, padding:'5px 10px' }}>›</button>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:12 }}>
                    {['Δε','Τρ','Τε','Πε','Πα','Σα','Κυ'].map(d => <span key={d} style={{ ...S.lbl, fontSize:9, textAlign:'center' }}>{d}</span>)}
                    {(() => {
                      const first = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
                      const off = (first.getDay() + 6) % 7;
                      const dim = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
                      const cells = [];
                      for (let i = 0; i < off; i++) cells.push(<span key={'e'+i}/>);
                      for (let d = 1; d <= dim; d++) {
                        const ds = `${calMonth.getFullYear()}-${String(calMonth.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                        const past = ds < todayStr(); const sel = ds === selDay; const isToday = ds === todayStr();
                        cells.push(
                          <button key={ds} disabled={past} onClick={() => pickDay(ds)}
                            style={{ aspectRatio:'1', borderRadius:9, fontSize:12, fontWeight:700, cursor: past ? 'default' : 'pointer', fontFamily:'inherit',
                              border: sel ? `1.6px solid ${ACC}` : isToday ? `1.4px dashed ${ACC}88` : '1px solid rgba(255,255,255,0.07)',
                              background: sel ? ACC + '2a' : 'transparent', color: past ? 'rgba(255,255,255,0.2)' : '#fff' }}>
                            {d}
                          </button>
                        );
                      }
                      return cells;
                    })()}
                  </div>
                  {selDay && (
                    <div>
                      <p style={{ ...S.lbl, margin:'0 0 8px', display:'flex', alignItems:'center', gap:6 }}><Clock style={{ width:12, height:12 }}/> Ελεύθερες ώρες · {selDay}</p>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom:12 }}>
                        {freeSlots.length ? freeSlots.map(t => (
                          <button key={t} onClick={() => { setTimeCheck({ time:t, ok:true }); setConfirmTime(t); }}
                            style={{ padding:'8px 14px', borderRadius:999, fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit',
                              border:`1.5px solid ${confirmTime === t ? ACC : 'rgba(255,255,255,0.16)'}`, background: confirmTime === t ? ACC + '22' : 'transparent', color:'#fff' }}>
                            {t}
                          </button>
                        )) : <span style={{ ...S.dim, fontSize:12.5 }}>Καμία ελεύθερη ώρα — δοκίμασε άλλη μέρα.</span>}
                      </div>
                      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        <input type="time" value={manualTime} onChange={e => setManualTime(e.target.value)} style={{ ...S.inp, width:126 }}/>
                        <button onClick={() => checkTime(manualTime)} style={S.btn(false)}>Έλεγχος</button>
                      </div>
                      {timeCheck && !timeCheck.ok && <p style={{ color:'#f87171', fontSize:12.5, fontWeight:700, margin:'10px 0 0' }}>Η ώρα {timeCheck.time} ΔΕΝ είναι διαθέσιμη.</p>}
                      {confirmTime && (
                        <div style={{ marginTop:14, padding:'14px 16px', borderRadius:14, background:ACC + '14', border:`1px solid ${ACC}55` }}>
                          <p style={{ margin:'0 0 10px', fontSize:13.5, fontWeight:700 }}>Ραντεβού {selDay} στις {confirmTime};</p>
                          <div style={{ display:'flex', gap:8 }}>
                            <button onClick={() => setConfirmTime('')} style={{ ...S.btn(false), flex:1 }}>Άκυρο</button>
                            <button onClick={() => !saving && doSchedule()} style={{ ...S.btn(true), flex:1 }}>{saving ? 'Αποθήκευση…' : 'Ναι, κλείσε το'}</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {finishMode === 'assign' && (
                <div style={{ ...S.card, maxWidth:520 }}>
                  <p style={{ ...S.lbl, margin:'0 0 10px' }}>Προσεχή ραντεβού του πελάτη (χωρίς προπόνηση)</p>
                  {openAppts.length === 0 && <p style={{ ...S.dim, fontSize:13, margin:0 }}>Δεν βρέθηκαν ελεύθερα ραντεβού — δοκίμασε «Προγραμματισμός».</p>}
                  {openAppts.map(a => (
                    <button key={a.id} onClick={() => !saving && doAssign(a)}
                      style={{ display:'flex', alignItems:'center', gap:12, width:'100%', textAlign:'left', padding:'12px 14px', borderRadius:13, cursor:'pointer', fontFamily:'inherit',
                        border:'1.4px solid rgba(255,255,255,0.11)', background:'rgba(255,255,255,0.03)', color:'#fff', marginBottom:8 }}>
                      <CalendarDays style={{ width:16, height:16, color:ACC, flexShrink:0 }}/>
                      <div style={{ flex:1 }}>
                        <p style={{ margin:0, fontSize:13.5, fontWeight:800 }}>{a.date} · {a.start_time}</p>
                        <p style={{ ...S.dim, margin:0, fontSize:11.5 }}>{a.title || 'Ραντεβού'} · {a.duration_minutes || 60}′</p>
                      </div>
                      <span style={{ fontSize:11.5, fontWeight:800, color:ACC }}>Ανάθεση →</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        )}
      </div>

      <style>{`
        @keyframes wcspin{to{transform:rotate(360deg)}}
        @keyframes wcpulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.07);opacity:.7}}
        @keyframes wcin{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
      `}</style>
    </div>
  );
}
