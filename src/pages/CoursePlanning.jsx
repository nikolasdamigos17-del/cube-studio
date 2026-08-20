import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, X, Lock, Loader2, Target, Leaf, Utensils, Scale, Plus, Sparkles, Home, Dumbbell, TrendingUp, Wallet, MessageCircle } from 'lucide-react';
import { db } from '../lib/db';

/* ═══════════ Στατικά δεδομένα ═══════════ */

const GOALS = [
  { key:'fat_loss',    icon:'🔥', label:'Απώλεια λίπους' },
  { key:'muscle_gain', icon:'💪', label:'Μυϊκή ανάπτυξη' },
  { key:'recomp',      icon:'⚖️', label:'Ανασύνθεση σώματος' },
  { key:'maintain',    icon:'🌿', label:'Συντήρηση / Υγεία' },
  { key:'performance', icon:'⚡', label:'Αθλητική απόδοση' },
];

const FLAG_DEFS = [
  { key:'vegetarian',   label:'Vegetarian',    desc:'Χωρίς κρέας, πουλερικά, ψάρι', excludes:['meat','poultry','fish','seafood'] },
  { key:'vegan',        label:'Vegan',         desc:'Χωρίς κανένα ζωικό προϊόν',    excludes:['meat','poultry','fish','seafood','dairy','egg','honey'] },
  { key:'lactose_free', label:'Lactose-free',  desc:'Χωρίς γαλακτοκομικά — με υποκατάστατα (γάλα αμυγδάλου, βρώμης…)', excludes:['dairy'] },
  { key:'nut_allergy',  label:'Αλλεργία σε ξηρούς καρπούς', desc:'Χωρίς ξηρούς καρπούς και ό,τι τους περιέχει', excludes:['nut'] },
];

const ING = [
  { cat:'Κρέας', items:[['Μοσχάρι',['meat']],['Χοιρινό',['meat']],['Αρνί',['meat']],['Κιμάς μοσχαρίσιος',['meat']],['Μπέικον',['meat']],['Αλλαντικά / ζαμπόν',['meat']],['Λουκάνικο',['meat']],['Συκώτι',['meat']]] },
  { cat:'Πουλερικά', items:[['Κοτόπουλο στήθος',['poultry']],['Κοτόπουλο μπούτι',['poultry']],['Γαλοπούλα',['poultry']]] },
  { cat:'Ψάρι & Θαλασσινά', items:[['Σολομός',['fish']],['Τόνος',['fish']],['Μπακαλιάρος',['fish']],['Τσιπούρα',['fish']],['Λαβράκι',['fish']],['Σαρδέλες',['fish']],['Γαρίδες',['seafood']],['Καλαμάρι',['seafood']],['Μύδια',['seafood']],['Χταπόδι',['seafood']]] },
  { cat:'Γαλακτοκομικά', items:[['Γάλα αγελάδος',['dairy']],['Γιαούρτι στραγγιστό',['dairy']],['Φέτα',['dairy']],['Κασέρι',['dairy']],['Cottage',['dairy']],['Μοτσαρέλα',['dairy']],['Παρμεζάνα',['dairy']],['Βούτυρο',['dairy']],['Κρέμα γάλακτος',['dairy']],['Πρωτεΐνη whey',['dairy']]] },
  { cat:'Αυγά', items:[['Αυγά ολόκληρα',['egg']],['Ασπράδια αυγών',['egg']]] },
  { cat:'Όσπρια & Φυτικές πρωτεΐνες', items:[['Φακές',['legume']],['Ρεβίθια',['legume']],['Φασόλια',['legume']],['Φάβα',['legume']],['Tofu / σόγια',['legume']],['Edamame',['legume']],['Φυτική πρωτεΐνη',['plant']]] },
  { cat:'Υδατάνθρακες', items:[['Ρύζι',['grain']],['Ζυμαρικά',['grain']],['Ψωμί ολικής',['grain']],['Βρώμη',['grain']],['Κινόα',['grain']],['Πατάτα',['veg']],['Γλυκοπατάτα',['veg']],['Κους κους',['grain']],['Αραβική πίτα',['grain']],['Ρυζογκοφρέτες',['grain']]] },
  { cat:'Λαχανικά', items:[['Μπρόκολο',['veg']],['Σπανάκι',['veg']],['Ντομάτα',['veg']],['Αγγούρι',['veg']],['Πιπεριά',['veg']],['Κολοκύθι',['veg']],['Μελιτζάνα',['veg']],['Καρότο',['veg']],['Μανιτάρια',['veg']],['Κρεμμύδι',['veg']],['Μαρούλι',['veg']],['Λάχανο',['veg']]] },
  { cat:'Φρούτα', items:[['Μπανάνα',['fruit']],['Μήλο',['fruit']],['Πορτοκάλι',['fruit']],['Φράουλες',['fruit']],['Μύρτιλα',['fruit']],['Ακτινίδιο',['fruit']],['Αχλάδι',['fruit']],['Ροδάκινο',['fruit']],['Καρπούζι',['fruit']]] },
  { cat:'Ξηροί καρποί & παράγωγα', items:[['Αμύγδαλα',['nut']],['Καρύδια',['nut']],['Κάσιους',['nut']],['Φιστίκια Αιγίνης',['nut']],['Φουντούκια',['nut']],['Φυστικοβούτυρο',['nut']],['Γάλα αμυγδάλου',['nut','dairy_sub']],['Ταχίνι / σουσάμι',['seed']]] },
  { cat:'Λίπη & Άλλα', items:[['Ελαιόλαδο',['fat']],['Αβοκάντο',['fat']],['Ελιές',['fat']],['Μέλι',['honey']],['Μαύρη σοκολάτα',['sweet']],['Γάλα βρώμης',['dairy_sub']],['Γάλα καρύδας',['dairy_sub']]] },
];

const MEAL_SLOTS = [
  { key:'breakfast',   emoji:'🌅', label:'Πρωινό',            time:'08:00' },
  { key:'snack1',      emoji:'🍎', label:'Δεκατιανό',         time:'10:30' },
  { key:'lunch',       emoji:'☀️', label:'Μεσημεριανό',       time:'13:30' },
  { key:'snack2',      emoji:'🥜', label:'Απογευματινό σνακ', time:'17:00' },
  { key:'dinner',      emoji:'🌙', label:'Βραδινό',           time:'20:30' },
  { key:'preworkout',  emoji:'⚡', label:'Προ-προπονητικό',   time:'' },
  { key:'postworkout', emoji:'🥤', label:'Μετα-προπονητικό',  time:'' },
];

const STEPS = [
  { icon:Target,  label:'Στόχος' },
  { icon:Leaf,    label:'Διατροφικό προφίλ' },
  { icon:Utensils,label:'Γεύματα & συνήθειες' },
  { icon:Scale,   label:'Μέτρηση' },
  { icon:Sparkles,label:'Ξενάγηση' },
];

/* Feature tour — γρήγορη επεξήγηση της εφαρμογής του πελάτη */
const TOUR = [
  { icon:Home,          accent:'#6366f1', title:'Αρχική', desc:'Η επόμενη προπόνηση, τα ραντεβού και μια γρήγορη ματιά στην πρόοδο — όλα σε μία οθόνη.' },
  { icon:Dumbbell,      accent:'#e0457b', title:'Προπονήσεις', desc:'Το πρόγραμμα κάθε μέρας με ασκήσεις, σετ, επαναλήψεις και κιλά. Πάτα «Έναρξη» για live καθοδήγηση.' },
  { icon:Leaf,          accent:'#10b981', title:'Διατροφή', desc:'Τα γεύματα της ημέρας με ποσότητες και συνταγές — δες τι, πότε και πόσο.' },
  { icon:TrendingUp,    accent:'#f59e0b', title:'Πρόοδος', desc:'Βάρος, μετρήσεις και γραφήματα στον χρόνο, ώστε να βλέπεις την εξέλιξή σου.' },
  { icon:Wallet,        accent:'#8b5cf6', title:'Οικονομικά', desc:'Πόσες προπονήσεις 🏋️ και διατροφές 🥗 σου μένουν, και το ιστορικό πληρωμών σου.' },
  { icon:MessageCircle, accent:'#06b6d4', title:'Μηνύματα', desc:'Άμεση επικοινωνία με τον προπονητή σου + οι ανακοινώσεις που στέλνει.' },
];

/* ═══════════ Component ═══════════ */

export default function CoursePlanning() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const clientId = params.get('client') || '';

  const [client, setClient] = useState(null);
  const [existing, setExisting] = useState(null);   // υπάρχον προφίλ (edit mode)
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [exitAsk, setExitAsk] = useState(false);

  /* βήμα 1 — στόχος */
  const [goalType, setGoalType] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [goalNotes, setGoalNotes] = useState('');

  /* βήμα 2 — προφίλ */
  const [flags, setFlags] = useState({ vegetarian:false, vegan:false, lactose_free:false, nut_allergy:false });
  const [excluded, setExcluded] = useState([]);      // χειροκίνητοι αποκλεισμοί (ονόματα)

  /* βήμα 3 — γεύματα & συνήθειες */
  const [slots, setSlots] = useState(['breakfast','lunch','snack2','dinner']);
  const [liked, setLiked] = useState([]);
  const [disliked, setDisliked] = useState([]);
  const [likedInput, setLikedInput] = useState('');
  const [dislikedInput, setDislikedInput] = useState('');
  const [habits, setHabits] = useState('');

  /* βήμα 4 — μέτρηση */
  const startRef = useRef(new Date().toISOString());
  const [captured, setCaptured] = useState(null);
  const [skipMeasure, setSkipMeasure] = useState(false);
  const [manual, setManual] = useState({ weight_kg:'', body_fat_pct:'', muscle_mass_kg:'', body_water_pct:'' });
  const [manualOpen, setManualOpen] = useState(false);

  const ACC = client?.theme_color || '#e0a355';

  /* φόρτωση πελάτη + υπάρχοντος προφίλ */
  useEffect(() => { (async () => {
    if (!clientId) return;
    const [c, profs] = await Promise.all([db.Client.get(clientId), db.NutritionProfile.filter({ client_id: clientId })]);
    setClient(c);
    const p = profs[0];
    if (p) {
      setExisting(p);
      setGoalType(p.goal_type || '');
      setTargetWeight(p.target_weight || '');
      setGoalNotes(p.goal_notes || '');
      setFlags({ vegetarian:false, vegan:false, lactose_free:false, nut_allergy:false, ...(p.flags||{}) });
      setExcluded(p.excluded_ingredients || []);
      setSlots(p.meal_slots?.length ? p.meal_slots : ['breakfast','lunch','snack2','dinner']);
      setLiked(p.liked || []); setDisliked(p.disliked || []);
      setHabits(p.habits || '');
    }
  })(); }, [clientId]);

  /* αναμονή μέτρησης από τη ζυγαριά */
  useEffect(() => {
    if (step !== 3 || captured) return;
    const t = setInterval(async () => {
      const rows = await db.ClientProgress.filter({ client_id: clientId }, '-created_date', 1);
      const r = rows[0];
      if (r && r.created_date > startRef.current) setCaptured(r);
    }, 4000);
    return () => clearInterval(t);
  }, [step, captured, clientId]);

  /* αυτόματοι αποκλεισμοί από flags */
  const autoTags = useMemo(() => {
    const s = new Set();
    FLAG_DEFS.forEach(f => { if (flags[f.key]) f.excludes.forEach(t => s.add(t)); });
    return s;
  }, [flags]);
  const isAuto = (tags) => tags.some(t => autoTags.has(t));
  const autoExcludedNames = useMemo(() => {
    const out = [];
    ING.forEach(c => c.items.forEach(([n, tags]) => { if (isAuto(tags)) out.push(n); }));
    return out;
  }, [autoTags]); // eslint-disable-line

  const canNext = step === 0 ? !!goalType : step === 2 ? slots.length > 0 : step === 3 ? (captured || skipMeasure || existing?.first_progress_id) : true;
  const canFinish = captured || skipMeasure || existing?.first_progress_id;

  const saveManual = async () => {
    const w = parseFloat(manual.weight_kg);
    if (!w) return;
    const rec = await db.ClientProgress.create({
      client_id: clientId, date: new Date().toISOString().split('T')[0],
      weight_kg: w,
      body_fat_pct: parseFloat(manual.body_fat_pct) || null,
      muscle_mass_kg: parseFloat(manual.muscle_mass_kg) || null,
      body_water_pct: parseFloat(manual.body_water_pct) || null,
      source: 'course_planning_manual',
    });
    setCaptured(rec); setManualOpen(false);
  };

  const finish = async () => {
    setSaving(true);
    const payload = {
      client_id: clientId,
      goal_type: goalType, goal_notes: goalNotes, target_weight: targetWeight ? parseFloat(targetWeight) : null,
      flags, excluded_ingredients: excluded, excluded_auto: autoExcludedNames,
      meal_slots: slots, liked, disliked, habits,
      first_progress_id: captured?.id || existing?.first_progress_id || null,
      skipped_measurement: !captured && skipMeasure ? true : false,
      setup_completed: true,
    };
    if (existing?.id) await db.NutritionProfile.update(existing.id, payload);
    else await db.NutritionProfile.create(payload);
    setSaving(false);
    navigate('/Nutrition');
  };

  const addTag = (which) => {
    if (which === 'liked') { const v = likedInput.trim(); if (v && !liked.includes(v)) setLiked(p=>[...p,v]); setLikedInput(''); }
    else { const v = dislikedInput.trim(); if (v && !disliked.includes(v)) setDisliked(p=>[...p,v]); setDislikedInput(''); }
  };

  /* ═══ στυλ ═══ */
  const S = {
    page:{ minHeight:'100vh', background:'#07070c', color:'#eceaf2', fontFamily:'var(--font-display, "Space Grotesk", sans-serif)',
      backgroundImage:`radial-gradient(900px 420px at 12% -6%, ${ACC}14, transparent 60%), radial-gradient(700px 380px at 100% 0%, ${ACC}0c, transparent 55%)` },
    wrap:{ maxWidth:920, margin:'0 auto', padding:'26px 22px 120px' },
    kicker:{ fontSize:10.5, letterSpacing:'.32em', textTransform:'uppercase', color:ACC, fontWeight:700 },
    card:{ background:'rgba(255,255,255,0.035)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:18, padding:'20px 22px' },
    h1:{ fontSize:26, fontWeight:800, letterSpacing:'-.02em', margin:'6px 0 4px' },
    dim:{ color:'rgba(255,255,255,0.42)' },
    lbl:{ fontSize:10.5, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.42)', fontWeight:700 },
    inp:{ background:'rgba(0,0,0,0.35)', border:'1px solid rgba(255,255,255,0.13)', borderRadius:11, color:'#eceaf2',
      padding:'11px 13px', fontSize:14, outline:'none', width:'100%', fontFamily:'inherit' },
    chip:(on)=>({ padding:'9px 14px', borderRadius:999, fontSize:13, fontWeight:600, cursor:'pointer',
      border:`1.6px solid ${on?ACC:'rgba(255,255,255,0.14)'}`, background:on?`${ACC}22`:'transparent', color:on?'#fff':'rgba(255,255,255,0.6)' }),
    footer:{ position:'fixed', left:0, right:0, bottom:0, background:'rgba(7,7,12,0.92)', backdropFilter:'blur(14px)',
      borderTop:'1px solid rgba(255,255,255,0.08)', padding:'14px 22px' },
    btn:(primary)=>({ border:'none', borderRadius:12, padding:'13px 26px', fontSize:14, fontWeight:800, cursor:'pointer',
      fontFamily:'inherit', background:primary?ACC:'transparent', color:primary?'#0a0a0d':'rgba(255,255,255,0.65)',
      outline:primary?'none':'1px solid rgba(255,255,255,0.16)' }),
  };
  const initials = (n)=> (n||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();

  if (!client) return (
    <div style={{ ...S.page, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <Loader2 style={{ width:26, height:26, color:ACC, animation:'spin 1s linear infinite' }}/>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.wrap}>

        {/* header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
          <div>
            <span style={S.kicker}>The Cube · Course Planning</span>
            <h1 style={S.h1}>{existing ? 'Επεξεργασία πλάνου πορείας' : 'Διαμόρφωση πλάνου πορείας'}</h1>
            <p style={{ ...S.dim, fontSize:13, margin:0 }}>Γίνεται μία φορά — καθορίζει στόχο, διατροφικό προφίλ και δομή γευμάτων.</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:9, padding:'7px 13px 7px 8px', borderRadius:999, border:'1px solid rgba(255,255,255,0.12)' }}>
              <span style={{ width:30, height:30, borderRadius:'50%', background:ACC, color:'#0a0a0d', fontWeight:800, fontSize:12, display:'grid', placeItems:'center' }}>{initials(client.name)}</span>
              <span style={{ fontSize:13.5, fontWeight:700 }}>{client.name}</span>
            </div>
            <button onClick={()=>setExitAsk(true)} style={{ width:36, height:36, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.14)', background:'transparent', color:'rgba(255,255,255,0.55)', cursor:'pointer', display:'grid', placeItems:'center' }}><X style={{width:16,height:16}}/></button>
          </div>
        </div>

        {/* step indicator */}
        <div style={{ display:'flex', gap:8, marginBottom:22 }}>
          {STEPS.map((st,i)=>{ const Icon=st.icon; const on=i===step; const done=i<step;
            return (
              <div key={i} style={{ flex:1, display:'flex', alignItems:'center', gap:8, padding:'9px 12px', borderRadius:12,
                background:on?`${ACC}1a`:'rgba(255,255,255,0.03)', border:`1px solid ${on?ACC+'66':'rgba(255,255,255,0.07)'}`, opacity:done||on?1:.5 }}>
                <Icon style={{ width:14, height:14, color:done||on?ACC:'rgba(255,255,255,0.4)' }}/>
                <span style={{ fontSize:11.5, fontWeight:700, letterSpacing:'.04em' }}>{st.label}</span>
                {done&&<Check style={{ width:13, height:13, color:ACC, marginLeft:'auto' }}/>}
              </div>
            );
          })}
        </div>

        {/* ── ΒΗΜΑ 1: Στόχος ── */}
        {step===0&&(
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={S.card}>
              <p style={{ ...S.lbl, marginBottom:12 }}>Ποιος είναι ο στόχος;</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
                {GOALS.map(g=>(
                  <button key={g.key} onClick={()=>setGoalType(g.key)}
                    style={{ textAlign:'left', padding:'14px 14px', borderRadius:14, cursor:'pointer', fontFamily:'inherit',
                      border:`1.6px solid ${goalType===g.key?ACC:'rgba(255,255,255,0.1)'}`,
                      background:goalType===g.key?`${ACC}1e`:'rgba(255,255,255,0.02)', color:'#fff' }}>
                    <span style={{ fontSize:22 }}>{g.icon}</span>
                    <p style={{ margin:'8px 0 0', fontSize:13.5, fontWeight:700 }}>{g.label}</p>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ ...S.card, display:'grid', gridTemplateColumns:'180px 1fr', gap:16 }}>
              <div>
                <p style={{ ...S.lbl, marginBottom:8 }}>Στόχος βάρους (kg)</p>
                <input style={S.inp} type="number" step="0.5" value={targetWeight} onChange={e=>setTargetWeight(e.target.value)} placeholder="προαιρετικό"/>
              </div>
              <div>
                <p style={{ ...S.lbl, marginBottom:8 }}>Σημειώσεις στόχου</p>
                <input style={S.inp} value={goalNotes} onChange={e=>setGoalNotes(e.target.value)} placeholder="π.χ. γάμος τον Σεπτέμβριο, θέλει ενέργεια στις προπονήσεις…"/>
              </div>
            </div>
          </div>
        )}

        {/* ── ΒΗΜΑ 2: Διατροφικό προφίλ ── */}
        {step===1&&(
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={S.card}>
              <p style={{ ...S.lbl, marginBottom:12 }}>Γρήγορα φίλτρα</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))', gap:10 }}>
                {FLAG_DEFS.map(fd=>{ const on=flags[fd.key];
                  return (
                    <button key={fd.key} onClick={()=>setFlags(p=>({...p,[fd.key]:!p[fd.key]}))}
                      style={{ textAlign:'left', padding:'12px 14px', borderRadius:14, cursor:'pointer', fontFamily:'inherit',
                        border:`1.6px solid ${on?ACC:'rgba(255,255,255,0.1)'}`, background:on?`${ACC}1e`:'rgba(255,255,255,0.02)', color:'#fff' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ width:17, height:17, borderRadius:5, border:`1.6px solid ${on?ACC:'rgba(255,255,255,0.3)'}`, background:on?ACC:'transparent', display:'grid', placeItems:'center' }}>{on&&<Check style={{width:12,height:12,color:'#0a0a0d'}}/>}</span>
                        <span style={{ fontSize:13.5, fontWeight:800 }}>{fd.label}</span>
                      </div>
                      <p style={{ margin:'6px 0 0', fontSize:11.5, color:'rgba(255,255,255,0.45)', lineHeight:1.4 }}>{fd.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={S.card}>
              <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:4 }}>
                <p style={{ ...S.lbl, margin:0 }}>Υλικά — κλικ για μόνιμο αποκλεισμό</p>
                <span style={{ fontSize:11.5, color:'rgba(255,255,255,0.4)' }}>{excluded.length} χειροκίνητα · {autoExcludedNames.length} από φίλτρα</span>
              </div>
              <p style={{ fontSize:11.5, color:'rgba(255,255,255,0.4)', margin:'0 0 14px' }}>Ό,τι αποκλειστεί δεν θα εμφανιστεί ποτέ σε συνταγές ή διατροφές αυτού του πελάτη.</p>
              {ING.map(cat=>(
                <div key={cat.cat} style={{ marginBottom:14 }}>
                  <p style={{ fontSize:11, fontWeight:800, letterSpacing:'.1em', textTransform:'uppercase', color:ACC, margin:'0 0 8px' }}>{cat.cat}</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                    {cat.items.map(([name,tags])=>{
                      const auto=isAuto(tags); const off=excluded.includes(name);
                      return (
                        <button key={name} disabled={auto}
                          onClick={()=>setExcluded(p=>off?p.filter(x=>x!==name):[...p,name])}
                          style={{ padding:'7px 12px', borderRadius:999, fontSize:12.5, fontWeight:600, cursor:auto?'default':'pointer', fontFamily:'inherit',
                            display:'inline-flex', alignItems:'center', gap:6,
                            border:`1.4px solid ${auto?'rgba(255,255,255,0.07)':off?'#ef4444aa':'rgba(255,255,255,0.13)'}`,
                            background:auto?'rgba(255,255,255,0.02)':off?'rgba(239,68,68,0.12)':'rgba(255,255,255,0.03)',
                            color:auto?'rgba(255,255,255,0.25)':off?'#fca5a5':'rgba(255,255,255,0.78)',
                            textDecoration:(auto||off)?'line-through':'none' }}>
                          {auto&&<Lock style={{width:10,height:10}}/>}{name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ΒΗΜΑ 3: Γεύματα & συνήθειες ── */}
        {step===2&&(
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={S.card}>
              <p style={{ ...S.lbl, marginBottom:12 }}>Ποια γεύματα τρώει; — ορίζει τη δομή κάθε διατροφής του</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:9 }}>
                {MEAL_SLOTS.map(m=>{ const on=slots.includes(m.key);
                  return (
                    <button key={m.key} onClick={()=>setSlots(p=>on?p.filter(x=>x!==m.key):[...p,m.key])} style={{ ...S.chip(on), fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:7 }}>
                      <span>{m.emoji}</span>{m.label}{m.time&&on?<span style={{ opacity:.55, fontSize:11 }}>{m.time}</span>:null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div style={S.card}>
                <p style={{ ...S.lbl, marginBottom:10 }}>Του αρέσουν</p>
                <div style={{ display:'flex', gap:8 }}>
                  <input style={S.inp} value={likedInput} onChange={e=>setLikedInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTag('liked')} placeholder="π.χ. σουβλάκι κοτόπουλο ↵"/>
                  <button onClick={()=>addTag('liked')} style={{ ...S.btn(false), padding:'0 14px' }}><Plus style={{width:15,height:15}}/></button>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginTop:11 }}>
                  {liked.map(t=><span key={t} onClick={()=>setLiked(p=>p.filter(x=>x!==t))} style={{ padding:'6px 11px', borderRadius:999, fontSize:12, cursor:'pointer', background:'rgba(34,197,94,0.13)', border:'1px solid rgba(34,197,94,0.4)', color:'#86efac' }}>{t} ×</span>)}
                  {!liked.length&&<span style={{ fontSize:12, color:'rgba(255,255,255,0.3)' }}>Καμία καταχώρηση</span>}
                </div>
              </div>
              <div style={S.card}>
                <p style={{ ...S.lbl, marginBottom:10 }}>Δεν του αρέσουν</p>
                <div style={{ display:'flex', gap:8 }}>
                  <input style={S.inp} value={dislikedInput} onChange={e=>setDislikedInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTag('disliked')} placeholder="π.χ. μπάμιες ↵"/>
                  <button onClick={()=>addTag('disliked')} style={{ ...S.btn(false), padding:'0 14px' }}><Plus style={{width:15,height:15}}/></button>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginTop:11 }}>
                  {disliked.map(t=><span key={t} onClick={()=>setDisliked(p=>p.filter(x=>x!==t))} style={{ padding:'6px 11px', borderRadius:999, fontSize:12, cursor:'pointer', background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.4)', color:'#fca5a5' }}>{t} ×</span>)}
                  {!disliked.length&&<span style={{ fontSize:12, color:'rgba(255,255,255,0.3)' }}>Καμία καταχώρηση</span>}
                </div>
              </div>
            </div>

            <div style={S.card}>
              <p style={{ ...S.lbl, marginBottom:10 }}>Διατροφικές συνήθειες / σημειώσεις</p>
              <textarea style={{ ...S.inp, minHeight:86, resize:'vertical' }} value={habits} onChange={e=>setHabits(e.target.value)} placeholder="π.χ. τρώει έξω τα μεσημέρια, δεν προλαβαίνει μαγείρεμα καθημερινές, θέλει γρήγορα πρωινά…"/>
            </div>
          </div>
        )}

        {/* ── ΒΗΜΑ 4: Μέτρηση ── */}
        {step===3&&(
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {!captured ? (
              <div style={{ ...S.card, textAlign:'center', padding:'44px 22px' }}>
                <div style={{ width:64, height:64, margin:'0 auto 16px', borderRadius:'50%', border:`2px solid ${ACC}55`, display:'grid', placeItems:'center', animation:'cpPulse 1.8s ease-in-out infinite' }}>
                  <Scale style={{ width:26, height:26, color:ACC }}/>
                </div>
                <p style={{ fontSize:17, fontWeight:800, margin:'0 0 6px' }}>Αναμονή μέτρησης από τη ζυγαριά…</p>
                <p style={{ ...S.dim, fontSize:13, margin:'0 auto', maxWidth:420 }}>Κάνε τη ζύγιση στο IMBODY — μόλις καταχωρηθεί νέα μέτρηση για τον/την {client.name?.split(' ')[0]}, θα εμφανιστεί εδώ αυτόματα.</p>
                <div style={{ display:'flex', gap:10, justifyContent:'center', marginTop:22 }}>
                  <button onClick={()=>setManualOpen(v=>!v)} style={S.btn(false)}>Χειροκίνητη καταχώρηση</button>
                  <label style={{ display:'inline-flex', alignItems:'center', gap:8, fontSize:12.5, color:'rgba(255,255,255,0.5)', cursor:'pointer' }}>
                    <input type="checkbox" checked={skipMeasure} onChange={e=>setSkipMeasure(e.target.checked)}/> Παράλειψη για τώρα
                  </label>
                </div>
                {manualOpen&&(
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginTop:20, textAlign:'left' }}>
                    {[['weight_kg','Βάρος (kg)'],['body_fat_pct','Λίπος %'],['muscle_mass_kg','Μυς (kg)'],['body_water_pct','Νερό %']].map(([k,l])=>(
                      <div key={k}><p style={{ ...S.lbl, marginBottom:6 }}>{l}</p><input style={S.inp} type="number" step="0.1" value={manual[k]} onChange={e=>setManual(p=>({...p,[k]:e.target.value}))}/></div>
                    ))}
                    <button onClick={saveManual} disabled={!parseFloat(manual.weight_kg)} style={{ ...S.btn(true), gridColumn:'1/5', opacity:parseFloat(manual.weight_kg)?1:.4 }}>Καταχώρηση μέτρησης</button>
                  </div>
                )}
              </div>
            ):(
              <div style={{ ...S.card, borderColor:`${ACC}66` }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                  <span style={{ width:30, height:30, borderRadius:'50%', background:ACC, display:'grid', placeItems:'center' }}><Check style={{ width:16, height:16, color:'#0a0a0d' }}/></span>
                  <p style={{ fontSize:16, fontWeight:800, margin:0 }}>Η μέτρηση καταχωρήθηκε</p>
                  <span style={{ ...S.dim, fontSize:12, marginLeft:'auto' }}>{captured.date}</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                  {[['Βάρος', captured.weight_kg, 'kg'],['Λίπος', captured.body_fat_pct, '%'],['Μυς', captured.muscle_mass_kg, 'kg'],['Νερό', captured.body_water_pct, '%']].map(([l,v,u])=>(
                    <div key={l} style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'13px 14px' }}>
                      <p style={{ ...S.lbl, margin:'0 0 5px' }}>{l}</p>
                      <p style={{ fontSize:22, fontWeight:800, margin:0 }}>{v ?? '—'}<span style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}> {v!=null?u:''}</span></p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p style={{ ...S.dim, fontSize:12.5, margin:0, textAlign:'center' }}>Με την Ολοκλήρωση, το προφίλ αποθηκεύεται στον διατροφικό φάκελο του πελάτη — το first-time meeting κλείνει εδώ.</p>
          </div>
        )}

        {/* ── ΒΗΜΑ 5: Ξενάγηση εφαρμογής ── */}
        {step===4&&(
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={S.card}>
              <p style={{ ...S.lbl, marginBottom:6 }}>Δείξε στον πελάτη την εφαρμογή του</p>
              <p style={{ ...S.dim, fontSize:13, margin:0 }}>Μια γρήγορη ματιά στα βασικά, ώστε να περιηγηθεί εύκολα από την πρώτη μέρα. (Θα λάβει και πρόσκληση για να φτιάξει τον λογαριασμό του.)</p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:14 }}>
              {TOUR.map((f,i)=>{ const Icon=f.icon; return (
                <div key={i} style={{ ...S.card, padding:16, display:'flex', gap:14 }}>
                  {/* mock phone */}
                  <div style={{ width:74, flexShrink:0, borderRadius:14, overflow:'hidden', border:'1px solid rgba(255,255,255,0.12)', background:'#0d0d14', boxShadow:'0 8px 20px rgba(0,0,0,0.35)' }}>
                    <div style={{ height:26, background:f.accent, display:'flex', alignItems:'center', gap:5, padding:'0 8px' }}>
                      <Icon style={{ width:12, height:12, color:'#fff' }}/>
                      <span style={{ fontSize:8, fontWeight:800, color:'#fff', letterSpacing:'.02em' }}>{f.title}</span>
                    </div>
                    <div style={{ padding:8, display:'flex', flexDirection:'column', gap:5 }}>
                      {i===3 ? (
                        <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:38 }}>
                          {[40,55,48,66,60,80].map((h,k)=><div key={k} style={{ flex:1, height:`${h}%`, borderRadius:2, background:f.accent, opacity:.35+k*0.1 }}/>)}
                        </div>
                      ) : i===4 ? (
                        <><div style={{ display:'flex', gap:4 }}><span style={{ flex:1, height:16, borderRadius:5, background:`${f.accent}33`, display:'grid', placeItems:'center', fontSize:8 }}>🏋️ 8</span><span style={{ flex:1, height:16, borderRadius:5, background:`${f.accent}33`, display:'grid', placeItems:'center', fontSize:8 }}>🥗 2</span></div>
                        <div style={{ height:7, borderRadius:3, background:'rgba(255,255,255,0.08)' }}/><div style={{ height:7, width:'70%', borderRadius:3, background:'rgba(255,255,255,0.08)' }}/></>
                      ) : i===5 ? (
                        <><div style={{ alignSelf:'flex-start', maxWidth:'80%', height:12, borderRadius:'7px 7px 7px 2px', background:'rgba(255,255,255,0.12)', width:'60%' }}/><div style={{ alignSelf:'flex-end', maxWidth:'80%', height:12, borderRadius:'7px 7px 2px 7px', background:f.accent, width:'70%' }}/><div style={{ alignSelf:'flex-start', height:12, borderRadius:'7px 7px 7px 2px', background:'rgba(255,255,255,0.12)', width:'45%' }}/></>
                      ) : (
                        <>{[0,1,2].map(k=><div key={k} style={{ height:9, borderRadius:3, width:`${100-k*18}%`, background: k===0?`${f.accent}55`:'rgba(255,255,255,0.08)' }}/>)}
                        <div style={{ height:16, borderRadius:5, marginTop:2, background:`${f.accent}22`, border:`1px solid ${f.accent}44` }}/></>
                      )}
                    </div>
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
                      <span style={{ width:22, height:22, borderRadius:7, background:`${f.accent}22`, display:'grid', placeItems:'center', flexShrink:0 }}><Icon style={{ width:13, height:13, color:f.accent }}/></span>
                      <p style={{ fontSize:14, fontWeight:800, margin:0 }}>{f.title}</p>
                    </div>
                    <p style={{ ...S.dim, fontSize:11.5, margin:0, lineHeight:1.5 }}>{f.desc}</p>
                  </div>
                </div>
              ); })}
            </div>
            <p style={{ ...S.dim, fontSize:12.5, margin:0, textAlign:'center' }}>Πάτα «Ολοκλήρωση» για να κλείσει το πρώτο meeting.</p>
          </div>
        )}
      </div>

      {/* footer */}
      <div style={S.footer}>
        <div style={{ maxWidth:920, margin:'0 auto', display:'flex', gap:10, alignItems:'center' }}>
          {step>0&&<button onClick={()=>setStep(s=>s-1)} style={S.btn(false)}><ArrowLeft style={{ width:15, height:15, verticalAlign:'-2px' }}/> Πίσω</button>}
          <span style={{ ...S.dim, fontSize:12, marginLeft:4 }}>Βήμα {step+1} / {STEPS.length}</span>
          <div style={{ flex:1 }}/>
          {step<4&&<button onClick={()=>canNext&&setStep(s=>s+1)} style={{ ...S.btn(true), opacity:canNext?1:.4 }}>Συνέχεια <ArrowRight style={{ width:15, height:15, verticalAlign:'-2px' }}/></button>}
          {step===4&&<button onClick={()=>canFinish&&!saving&&finish()} style={{ ...S.btn(true), opacity:canFinish?1:.4 }}>{saving?'Αποθήκευση…':'Ολοκλήρωση'}</button>}
        </div>
      </div>

      {/* exit confirm */}
      {exitAsk&&(
        <div style={{ position:'fixed', inset:0, zIndex:50, display:'grid', placeItems:'center', background:'rgba(0,0,0,0.6)' }} onClick={()=>setExitAsk(false)}>
          <div style={{ ...S.card, width:340, textAlign:'center' }} onClick={e=>e.stopPropagation()}>
            <p style={{ fontSize:16, fontWeight:800, margin:'0 0 6px' }}>Έξοδος χωρίς αποθήκευση;</p>
            <p style={{ ...S.dim, fontSize:13, margin:'0 0 18px' }}>Οι επιλογές αυτού του βήματος θα χαθούν.</p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setExitAsk(false)} style={{ ...S.btn(false), flex:1 }}>Ακύρωση</button>
              <button onClick={()=>navigate('/Nutrition')} style={{ ...S.btn(true), flex:1 }}>Έξοδος</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes cpPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.07);opacity:.7}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
