import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, differenceInDays } from 'date-fns';
import { el } from 'date-fns/locale';
import { Mic, X, CornerDownLeft } from 'lucide-react';
import logoCube from '../assets/logo-cube.png';

/* ── text helpers ─────────────────────────────────────────────────────── */
const strip = (s) => (s || '').toString().toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')      // drop accents
  .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

const ORDINALS = [
  [/\b(πρωτ|first|1)\b/, 0], [/\b(δευτερ|second|2)\b/, 1], [/\b(τριτ|third|3)\b/, 2],
  [/\b(τεταρτ|fourth|4)\b/, 3], [/\b(πεμπτ|fifth|5)\b/, 4],
];

// best fuzzy match of spoken text against a list of names
function pickFrom(said, names) {
  const s = strip(said);
  if (!s) return -1;
  for (const [re, i] of ORDINALS) if (re.test(s) && i < names.length) return i;
  let best = -1, bestScore = 0;
  names.forEach((n, i) => {
    const t = strip(n);
    if (!t) return;
    let score = 0;
    if (s.includes(t) || t.includes(s)) score = 100;
    else {
      const words = t.split(' ').filter(w => w.length > 3);
      score = words.filter(w => s.includes(w)).length * 10;
    }
    if (score > bestScore) { bestScore = score; best = i; }
  });
  return bestScore > 0 ? best : -1;
}

/* ── speech ───────────────────────────────────────────────────────────── */
const SR = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

function speak(text, lang) {
  try {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    const v = window.speechSynthesis.getVoices().find(x => x.lang?.toLowerCase().startsWith(lang.slice(0, 2)));
    if (v) u.voice = v;
    u.rate = 1.02; u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

/* ── the assistant ────────────────────────────────────────────────────── */
export default function MyCubeAssistant({ size = 1, editMode, lang = 'el',
                                          client, nutrition, appts, progress }) {
  const navigate = useNavigate();
  const loc = lang === 'el' ? { locale: el } : undefined;
  const speechLang = lang === 'el' ? 'el-GR' : 'en-US';
  const T = lang === 'el' ? GR : EN;

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState('idle');      // idle | listening | answering
  const [heard, setHeard] = useState('');
  const [reply, setReply] = useState('');
  const [chips, setChips] = useState([]);
  const [supported] = useState(!!SR);
  const [typed, setTyped] = useState('');
  const convo = useRef({ step:'root', section:null });
  const rec = useRef(null);

  /* ── data the assistant can talk about ── */
  const plan = nutrition?.[0] || null;
  const sections = plan?.meal_sections || [];
  const today = format(new Date(), 'yyyy-MM-dd');
  const nextAppt = (appts || [])
    .filter(a => a.date >= today)
    .sort((a, b) => a.date === b.date
      ? (a.start_time || '').localeCompare(b.start_time || '')
      : a.date.localeCompare(b.date))[0];
  const wSeries = (progress || []).filter(p => p.weight_kg != null);
  const last = (progress || [])[progress.length - 1];
  const wNow = wSeries[wSeries.length - 1];
  const wStart = wSeries[0];
  const waterGoal = plan?.water_liters_daily ?? client?.water_goal_liters ?? null;

  /* ── intent engine ── */
  const respond = useCallback((raw) => {
    const s = strip(raw);
    const st = convo.current;

    // ── multi-turn: waiting for a meal section ──
    if (st.step === 'section') {
      const i = pickFrom(s, sections.map(x => x.section_name));
      if (i >= 0) {
        const sec = sections[i];
        const names = (sec.options || []).map(o => o.name);
        convo.current = { step:'meal', section:i };
        return { say: T.mealsIn(sec.section_name, names), chips: names };
      }
      return { say: T.whichSection(sections.map(x => x.section_name)),
               chips: sections.map(x => x.section_name) };
    }

    // ── multi-turn: waiting for a specific dish ──
    if (st.step === 'meal') {
      const sec = sections[st.section];
      const opts = sec?.options || [];
      const i = pickFrom(s, opts.map(o => o.name));
      if (i >= 0) {
        const m = opts[i];
        convo.current = { step:'root', section:null };
        return { say: T.opening(m.name), open:m };
      }
      return { say: T.whichMeal, chips: opts.map(o => o.name) };
    }

    // ── single-shot intents ──
    if (/\b(γευμ|φαω|φαγητ|διατροφ|meal|eat|food|breakfast|lunch|dinner|snack)/.test(s)) {
      if (!sections.length) return { say: T.noPlan };
      // if they already named the section in the same sentence, jump ahead
      const i = pickFrom(s, sections.map(x => x.section_name));
      if (i >= 0) {
        const sec = sections[i];
        const names = (sec.options || []).map(o => o.name);
        convo.current = { step:'meal', section:i };
        return { say: T.mealsIn(sec.section_name, names), chips: names };
      }
      convo.current = { step:'section', section:null };
      return { say: T.whichSection(sections.map(x => x.section_name)),
               chips: sections.map(x => x.section_name) };
    }

    if (/\b(ραντεβου|επομεν|appointment|session|προπονηση ποτε|ποτε ειναι)/.test(s)) {
      if (!nextAppt) return { say: T.noAppt };
      const d = parseISO(nextAppt.date);
      const days = differenceInDays(d, new Date(today));
      const when = days === 0 ? T.today : days === 1 ? T.tomorrow
        : format(d, 'EEEE d LLLL', loc);
      return { say: T.appt(when, nextAppt.start_time, nextAppt.duration_minutes || 60,
                           nextAppt.type === 'nutrition') };
    }

    if (/\b(μυικ|μυι|muscle)/.test(s)) {
      if (!last?.muscle_mass_kg) return { say: T.noData };
      return { say: T.muscle(last.muscle_mass_kg, format(parseISO(last.date), 'd LLLL', loc)) };
    }

    if (/\b(αρχικ|ξεκινησα|starting|initial)/.test(s) && /\b(βαρ|weight|κιλ)/.test(s)) {
      if (!wStart) return { say: T.noData };
      return { say: T.startW(wStart.weight_kg, format(parseISO(wStart.date), 'd LLLL yyyy', loc)) };
    }

    if (/\b(εχασα|χασει|χανω|απωλει|lost|lose)/.test(s)) {
      if (!wStart || !wNow) return { say: T.noData };
      const diff = +(wStart.weight_kg - wNow.weight_kg).toFixed(1);
      return { say: T.lost(diff, wStart.weight_kg, wNow.weight_kg) };
    }

    if (/\b(νερ|water|ενυδατ)/.test(s)) {
      if (!waterGoal) return { say: T.noWater };
      return { say: T.water(waterGoal) };
    }

    if (/\b(λιπο|fat)/.test(s)) {
      if (!last?.body_fat_pct) return { say: T.noData };
      return { say: T.fat(last.body_fat_pct, format(parseISO(last.date), 'd LLLL', loc)) };
    }

    if (/\b(βαρ|weight|κιλ|ζυγ)/.test(s)) {
      if (!wNow) return { say: T.noData };
      return { say: T.nowW(wNow.weight_kg, format(parseISO(wNow.date), 'd LLLL', loc)) };
    }

    return { say: T.help, chips: T.helpChips };
  }, [sections, nextAppt, last, wStart, wNow, waterGoal, T, loc, today]);

  /* ── run a turn ── */
  const handle = useCallback((text) => {
    setHeard(text);
    setPhase('answering');
    const r = respond(text);
    setReply(r.say);
    setChips(r.chips || []);
    speak(r.say, speechLang);
    if (r.open) {
      const m = r.open;
      const q = new URLSearchParams({ name:m.name || '', ingredients:m.ingredients || '',
        calories:m.calories || '', protein:m.protein || '', carbs:m.carbs || '', fat:m.fat || '' });
      setTimeout(() => { setOpen(false); navigate(`/recipe?${q.toString()}`); }, 900);
    }
  }, [respond, speechLang, navigate]);

  /* ── microphone ── */
  const listen = useCallback(() => {
    if (!SR) { setPhase('answering'); setReply(T.noMic); return; }
    try { window.speechSynthesis?.cancel(); } catch (e) {}
    const r = new SR();
    rec.current = r;
    r.lang = speechLang;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.continuous = false;
    setHeard(''); setReply(''); setChips([]); setPhase('listening');
    r.onresult = (e) => {
      const txt = Array.from(e.results).map(x => x[0].transcript).join(' ');
      setHeard(txt);
      if (e.results[e.results.length - 1].isFinal) handle(txt);
    };
    r.onerror = (e) => {
      setPhase('answering');
      setReply(e.error === 'not-allowed' ? T.noPerm : T.didntCatch);
    };
    r.onend = () => setPhase(p => (p === 'listening' ? 'idle' : p));
    try { r.start(); } catch (e) {}
  }, [handle, speechLang, T]);

  const stop = () => { try { rec.current?.stop(); } catch (e) {} setPhase('idle'); };

  const start = () => {
    if (editMode) return;
    convo.current = { step:'root', section:null };
    setOpen(true);
    listen();
  };

  const close = () => {
    stop();
    try { window.speechSynthesis?.cancel(); } catch (e) {}
    setOpen(false); setHeard(''); setReply(''); setChips([]);
    convo.current = { step:'root', section:null };
  };

  useEffect(() => () => { try { rec.current?.stop(); window.speechSynthesis?.cancel(); } catch (e) {} }, []);

  const pulsing = phase === 'listening';

  /* ── widget face: just the cube, no card behind it ── */
  return (
    <>
      <button onClick={start} aria-label="My Cube"
        style={{ position:'absolute', inset:0, border:'none', background:'transparent',
          cursor:'pointer', display:'flex', flexDirection:size === 2 ? 'row' : 'column',
          alignItems:'center', justifyContent:'center', gap:size === 2 ? 14 : 6, padding:8 }}>
        <span style={{ position:'relative', display:'block', flex:'0 0 auto' }}>
          <img src={logoCube} alt="" draggable="false"
            style={{ width:size === 2 ? 62 : 66, height:size === 2 ? 62 : 66, objectFit:'contain',
              display:'block', animation: pulsing ? 'cubePulse 1.35s ease-in-out infinite' : 'none',
              filter: pulsing ? 'drop-shadow(0 0 12px rgba(255,255,255,.45))' : 'none',
              transition:'filter .3s' }}/>
          {pulsing && <span style={{ position:'absolute', inset:-6, borderRadius:'26%',
            border:'1.5px solid rgba(255,255,255,.35)', animation:'cubeRing 1.35s ease-out infinite',
            pointerEvents:'none' }}/>}
        </span>
        <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase',
          color:'var(--cp-text-dim)', textAlign:size === 2 ? 'left' : 'center' }}>
          {size === 2 ? T.tapLong : 'My Cube'}
        </span>
      </button>

      <style>{`
        @keyframes cubePulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
        @keyframes cubeRing{0%{transform:scale(.92);opacity:.7}100%{transform:scale(1.22);opacity:0}}
        @keyframes cubeFade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
      `}</style>

      {/* ── conversation sheet ── */}
      {open && (
        <div style={{ position:'fixed', inset:0, zIndex:90, background:'rgba(6,8,14,.93)',
          backdropFilter:'blur(10px)', display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center', padding:'24px 20px',
          animation:'cubeFade .22s ease-out' }}>

          <button onClick={close} aria-label="Close"
            style={{ position:'absolute', top:14, right:14, width:36, height:36, borderRadius:12,
              border:'1px solid var(--cp-border)', background:'rgba(255,255,255,.05)',
              color:'var(--cp-text-dim)', cursor:'pointer', display:'flex',
              alignItems:'center', justifyContent:'center' }}>
            <X style={{ width:17, height:17 }}/>
          </button>

          <span style={{ position:'relative', display:'block', marginBottom:20 }}>
            <img src={logoCube} alt="" draggable="false"
              style={{ width:104, height:104, objectFit:'contain', display:'block',
                animation: pulsing ? 'cubePulse 1.35s ease-in-out infinite' : 'none',
                filter: pulsing ? 'drop-shadow(0 0 20px rgba(255,255,255,.5))' : 'none' }}/>
            {pulsing && <span style={{ position:'absolute', inset:-10, borderRadius:'26%',
              border:'2px solid rgba(255,255,255,.32)', animation:'cubeRing 1.35s ease-out infinite' }}/>}
          </span>

          <p style={{ margin:0, fontSize:11, fontWeight:700, letterSpacing:'.16em',
            textTransform:'uppercase', color:'var(--cp-accent)' }}>
            {phase === 'listening' ? T.listening : phase === 'answering' ? 'My Cube' : T.tapMic}
          </p>

          {heard && (
            <p style={{ margin:'14px 0 0', fontSize:13, color:'var(--cp-text-dim)',
              textAlign:'center', maxWidth:420, fontStyle:'italic' }}>“{heard}”</p>
          )}

          {reply && (
            <p style={{ margin:'12px 0 0', fontSize:17, lineHeight:1.5, color:'var(--cp-text)',
              textAlign:'center', maxWidth:440, fontWeight:600 }}>{reply}</p>
          )}

          {chips.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center',
              marginTop:18, maxWidth:460 }}>
              {chips.map((ch, i) => (
                <button key={i} onClick={() => handle(ch)}
                  style={{ border:'1px solid var(--cp-accent)', borderRadius:999,
                    padding:'9px 15px', cursor:'pointer', background:'var(--cp-accent-light)',
                    color:'var(--cp-accent)', fontSize:13, fontWeight:600 }}>
                  {ch}
                </button>
              ))}
            </div>
          )}

          <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:26 }}>
            <button onClick={pulsing ? stop : listen}
              style={{ width:62, height:62, borderRadius:'50%', border:'none', cursor:'pointer',
                background: pulsing ? '#ef4444' : 'var(--cp-accent)', color:'#fff',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 8px 24px rgba(0,0,0,.4)' }}>
              <Mic style={{ width:24, height:24 }}/>
            </button>
          </div>

          {!supported && (
            <div style={{ display:'flex', gap:8, marginTop:18, width:'100%', maxWidth:420 }}>
              <input value={typed} onChange={e => setTyped(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && typed.trim()) { handle(typed); setTyped(''); } }}
                placeholder={T.typeHere}
                style={{ flex:1, border:'1px solid var(--cp-border)', borderRadius:12,
                  padding:'11px 13px', background:'rgba(255,255,255,.05)',
                  color:'var(--cp-text)', fontSize:14, outline:'none' }}/>
              <button onClick={() => { if (typed.trim()) { handle(typed); setTyped(''); } }}
                style={{ border:'none', borderRadius:12, padding:'0 15px', cursor:'pointer',
                  background:'var(--cp-accent)', color:'#fff', display:'flex', alignItems:'center' }}>
                <CornerDownLeft style={{ width:17, height:17 }}/>
              </button>
            </div>
          )}

          <p style={{ margin:'20px 0 0', fontSize:11, color:'var(--cp-text-dim)',
            textAlign:'center', maxWidth:420, lineHeight:1.6 }}>{T.examples}</p>
        </div>
      )}
    </>
  );
}

/* ── phrasing ─────────────────────────────────────────────────────────── */
const listGr = (a) => a.length <= 1 ? (a[0] || '')
  : a.slice(0, -1).join(', ') + ' και ' + a[a.length - 1];

const GR = {
  listening:'Ακούω…', tapMic:'Πάτα το μικρόφωνο', tapLong:'Ρώτησέ με',
  typeHere:'Γράψε την ερώτησή σου…',
  whichSection:(s) => `Τι γεύμα θέλεις; Έχεις ${listGr(s)}.`,
  mealsIn:(sec, n) => `Για ${sec.toLowerCase()} έχεις ${listGr(n)}. Ποιο διαλέγεις;`,
  whichMeal:'Δεν το έπιασα. Ποιο γεύμα διαλέγεις;',
  opening:(n) => `Ανοίγω τη συνταγή για ${n}.`,
  noPlan:'Δεν έχεις πλάνο διατροφής ακόμη. Ρώτα τον προπονητή σου.',
  noAppt:'Δεν έχεις προγραμματισμένο ραντεβού αυτή τη στιγμή.',
  appt:(when, t, d, isNut) =>
    `Το επόμενο ραντεβού σου είναι ${when} στις ${t}, διάρκειας ${d} λεπτών. Είναι ${isNut ? 'συνάντηση διατροφής' : 'προπόνηση'}.`,
  today:'σήμερα', tomorrow:'αύριο',
  muscle:(v, d) => `Στην τελευταία σου μέτρηση, στις ${d}, η μυϊκή σου μάζα ήταν ${v} κιλά.`,
  startW:(v, d) => `Το αρχικό σου βάρος ήταν ${v} κιλά, στις ${d}.`,
  nowW:(v, d) => `Το τελευταίο σου βάρος ήταν ${v} κιλά, στις ${d}.`,
  fat:(v, d) => `Στη μέτρηση της ${d}, το ποσοστό λίπους σου ήταν ${v} τοις εκατό.`,
  lost:(diff, a, b) => diff > 0
    ? `Από την αρχή έχεις χάσει ${diff} κιλά, από ${a} σε ${b}.`
    : diff < 0 ? `Από την αρχή έχεις πάρει ${Math.abs(diff)} κιλά, από ${a} σε ${b}.`
               : `Το βάρος σου είναι ίδιο με την αρχή, ${a} κιλά.`,
  water:(v) => `Ο προπονητής σου έχει προτείνει ${v} λίτρα νερό την ημέρα.`,
  noWater:'Δεν έχει οριστεί στόχος νερού στο πλάνο σου ακόμη.',
  noData:'Δεν έχω αρκετές μετρήσεις για να σου απαντήσω.',
  noMic:'Η συσκευή σου δεν υποστηρίζει φωνητική αναγνώριση. Γράψε την ερώτησή σου.',
  noPerm:'Χρειάζομαι άδεια για το μικρόφωνο. Έλεγξε τις ρυθμίσεις του browser.',
  didntCatch:'Δεν σε άκουσα καλά. Δοκίμασε ξανά.',
  help:'Μπορώ να σου πω για τα γεύματά σου, το επόμενο ραντεβού, το βάρος, τη μυϊκή σου μάζα και το νερό.',
  helpChips:['Τι γεύμα μπορώ να φάω;','Πότε είναι το επόμενο ραντεβού;','Πόσο βάρος έχω χάσει;','Πόσο νερό πρέπει να πίνω;'],
  examples:'«Τι γεύμα μπορώ να φάω;» · «Πότε είναι το επόμενο ραντεβού μου;» · «Πόση είναι η μυϊκή μου μάζα;»',
};

const listEn = (a) => a.length <= 1 ? (a[0] || '')
  : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];

const EN = {
  listening:'Listening…', tapMic:'Tap the mic', tapLong:'Ask me',
  typeHere:'Type your question…',
  whichSection:(s) => `Which meal? You have ${listEn(s)}.`,
  mealsIn:(sec, n) => `For ${sec.toLowerCase()} you have ${listEn(n)}. Which one?`,
  whichMeal:'I didn’t catch that. Which meal?',
  opening:(n) => `Opening the recipe for ${n}.`,
  noPlan:'You don’t have a nutrition plan yet. Ask your coach.',
  noAppt:'You have no upcoming appointment right now.',
  appt:(when, t, d, isNut) =>
    `Your next appointment is ${when} at ${t}, ${d} minutes long. It’s a ${isNut ? 'nutrition consultation' : 'training session'}.`,
  today:'today', tomorrow:'tomorrow',
  muscle:(v, d) => `At your last measurement on ${d}, your muscle mass was ${v} kilos.`,
  startW:(v, d) => `Your starting weight was ${v} kilos, on ${d}.`,
  nowW:(v, d) => `Your latest weight was ${v} kilos, on ${d}.`,
  fat:(v, d) => `At your measurement on ${d}, your body fat was ${v} percent.`,
  lost:(diff, a, b) => diff > 0
    ? `You’ve lost ${diff} kilos since the start, from ${a} to ${b}.`
    : diff < 0 ? `You’ve gained ${Math.abs(diff)} kilos since the start, from ${a} to ${b}.`
               : `Your weight is the same as at the start, ${a} kilos.`,
  water:(v) => `Your coach recommends ${v} litres of water per day.`,
  noWater:'No water target has been set in your plan yet.',
  noData:'I don’t have enough measurements to answer that.',
  noMic:'Your device doesn’t support speech recognition. Type your question instead.',
  noPerm:'I need microphone permission. Check your browser settings.',
  didntCatch:'I didn’t catch that. Try again.',
  help:'I can tell you about your meals, next appointment, weight, muscle mass and water.',
  helpChips:['What can I eat?','When is my next appointment?','How much weight have I lost?','How much water should I drink?'],
  examples:'“What can I eat?” · “When is my next appointment?” · “What’s my muscle mass?”',
};
