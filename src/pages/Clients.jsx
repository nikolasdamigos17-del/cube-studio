import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronRight, X, Users, Users2, Check, Trash2, UserPlus, Lock, Mail, Copy, Send } from 'lucide-react';
import { db } from '../lib/db';
import { GROUP_CAP, firstName, groupDisplayName, isIndividual, createEmptyGroup, addMemberToGroup, removeMemberFromGroup, deleteGroup, unorphanClients, repairOrphanGroupIds } from '../lib/groups';
import { genToken, inviteMailto, activationLink } from '../lib/invites';

const COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f97316'];
export const SERVICE_LABELS = {
  personal_training:'Personal Training', personal_training_nutrition:'PT + Nutrition',
  nutrition_only:'Nutrition Only', group_training:'Group Training', group_training_nutrition:'Group + Nutrition',
};

/* ═══════════════ Νέος / επεξεργασία πελάτη ═══════════════ */
export function AddClientModal({ onClose, onSaved, client, clients, forGroup, onGroupClient }) {
  const [f, setF] = useState(client || { name:'', phone:'', email:'',
    services: forGroup ? 'group_training' : 'personal_training',
    sessions_per_week:3, nutrition_meetings_per_month:2, monthly_price:'', active:true });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const locked = client?.account_status === 'active'; // το email είναι ο τρόπος σύνδεσης
  const [savedId, setSavedId] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [inviteInfo, setInviteInfo] = useState(null);
  const [copied, setCopied] = useState(false);
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const grp = f.services === 'group_training' || f.services === 'group_training_nutrition';
  const hasTraining  = ['personal_training','personal_training_nutrition','group_training','group_training_nutrition'].includes(f.services);
  const hasNutrition = ['nutrition_only','personal_training_nutrition','group_training_nutrition'].includes(f.services);
  const setTraining = (t) => { const base = t === 'group' ? 'group_training' : 'personal_training'; set('services', hasNutrition ? base + '_nutrition' : base); };
  const toggleNutrition = () => { const base = grp ? 'group_training' : 'personal_training'; set('services', hasNutrition ? base : base + '_nutrition'); };
  const save = async () => { setErr(''); try {
    setSaving(true);
    const payload = { ...f };
    if (payload.height_cm) { const h = parseFloat(payload.height_cm); if (h > 0) { payload.height_cm = h; payload.height = h; } }
    if (locked) { delete payload.email; delete payload.portal_email; } // το login email μένει ως έχει
    if (!client?.id) {
      payload.theme_color = COLORS[Math.floor(Math.random()*COLORS.length)];
      payload.portal_password = `${(f.name||'Cube').trim().split(' ')[0]}${new Date().getFullYear()}!`;
      payload.gender = payload.gender || 'male';
    }
    if (hasTraining && payload.sessions_per_week)
      payload.sessions_per_month = Math.max(1, Math.round(payload.sessions_per_week * 4));
    if (!hasNutrition) payload.nutrition_meetings_per_month = 0;

    if (client?.id) { await db.Client.update(client.id, payload); setSaving(false); onSaved(); onClose(); return; }
    if (savedId) { await db.Client.update(savedId, payload); setSaving(false); onSaved(); onClose(); return; }
    const created = await db.Client.create(payload);
    setSaving(false);
    if (forGroup) { await addMemberToGroup(forGroup, created.id, clients); onSaved(); onClose(); return; }
    if ((created.services === 'group_training' || created.services === 'group_training_nutrition') && onGroupClient) {
      onClose(); onSaved(); onGroupClient(created); return;
    }
    onSaved(); onClose();
  } catch (e) { setErr('Η αποθήκευση απέτυχε: ' + String(e?.message || e)); setSaving(false); } };

  const sendInvite = async () => { setErr(''); try {
    if (!f.email || !f.email.trim()) { alert('Βάλε πρώτα το email του πελάτη.'); return; }
    setInviting(true);
    let id = client?.id || savedId;
    if (!id) {
      const payload = { ...f };
      payload.theme_color = COLORS[Math.floor(Math.random()*COLORS.length)];
      payload.portal_password = `${(f.name||'Cube').trim().split(' ')[0]}${new Date().getFullYear()}!`;
      payload.gender = payload.gender || 'male';
      if (hasTraining && payload.sessions_per_week) payload.sessions_per_month = Math.max(1, Math.round(payload.sessions_per_week * 4));
      if (!hasNutrition) payload.nutrition_meetings_per_month = 0;
      const created = await db.Client.create(payload);
      id = created.id; setSavedId(id); onSaved();
    }
    const token = genToken();
    const patch = { email: f.email.trim(), invite_token: token, invite_sent_at: new Date().toISOString(), account_status: 'invited' };
    await db.Client.update(id, patch);
    const c = { id, ...f, ...patch };
    setInviteInfo({ link: activationLink(c), mailto: inviteMailto(c), email: f.email.trim() });
    setInviting(false);
  } catch (e) { setErr('Η πρόσκληση απέτυχε: ' + String(e?.message || e)); setInviting(false); } };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900 text-lg">{client?'Επεξεργασία πελάτη':forGroup?`Νέο μέλος → ${groupDisplayName(forGroup, clients)}`:'Νέος πελάτης'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400"/></button>
        </div>

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Στοιχεία επικοινωνίας</p>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="col-span-2"><label className="text-xs font-medium text-gray-500 uppercase">Ονοματεπώνυμο *</label><input value={f.name||''} onChange={e=>set('name',e.target.value)} className="input-base mt-1" placeholder="π.χ. Μαρία Παπαδάκη"/></div>
          <div><label className="text-xs font-medium text-gray-500 uppercase">Τηλέφωνο</label><input value={f.phone||''} onChange={e=>set('phone',e.target.value)} className="input-base mt-1" placeholder="+30 …"/></div>
          <div><label className="text-xs font-medium text-gray-500 uppercase">Φύλο</label>
            <div className="flex gap-2 mt-1">
              {[['male','👨 Άνδρας'],['female','👩 Γυναίκα']].map(([v,l])=>(
                <button key={v} onClick={()=>set('gender',v)}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${(f.gender||'male')===v?'border-gray-900 bg-gray-50 text-gray-900':'border-gray-100 text-gray-400 hover:border-gray-300'}`}>{l}</button>
              ))}
            </div>
          </div>
          <div><label className="text-xs font-medium text-gray-500 uppercase">Ημ. γέννησης</label><input value={f.date_of_birth||''} onChange={e=>set('date_of_birth',e.target.value)} className="input-base mt-1" type="date"/></div>
          <div><label className="text-xs font-medium text-gray-500 uppercase">Ύψος (cm)</label><input value={f.height_cm||f.height||''} onChange={e=>set('height_cm',e.target.value)} className="input-base mt-1" type="number" placeholder="π.χ. 178"/></div>
          <div className="col-span-2"><label className="text-xs font-medium text-gray-500 uppercase">Email</label>
            <div className="flex gap-2 mt-1">
              <input value={f.email||''} onChange={e=>set('email',e.target.value)} readOnly={locked}
                className={`input-base flex-1 ${locked?'opacity-60 cursor-not-allowed bg-gray-50':''}`} type="email" placeholder="email@…"/>
              {locked ? (
                <span className="flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold flex-shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Ενεργός</span>
              ) : (
                <button onClick={sendInvite} disabled={inviting||!f.email} title="Αποστολή πρόσκλησης στην εφαρμογή" className="flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold text-white disabled:opacity-40 flex-shrink-0" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>
                  {inviting? '…' : <><Send className="w-3.5 h-3.5"/> Πρόσκληση</>}
                </button>
              )}
            </div>
            {locked && <p className="text-[11px] text-gray-400 mt-1">🔒 Το email είναι ο τρόπος σύνδεσης του πελάτη — δεν αλλάζει. Όλα τα υπόλοιπα επεξεργάζονται ελεύθερα.</p>}
          </div>
        </div>

        {inviteInfo && (
          <div className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
            <p className="text-xs font-semibold text-indigo-700 mb-1.5 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5"/> Πρόσκληση έτοιμη για {inviteInfo.email}</p>
            <p className="text-[11px] text-gray-500 mb-2">Στείλ' την με το email σου, ή αντίγραψε τον σύνδεσμο και δώσ' τον όπως θες (π.χ. WhatsApp). Ο πελάτης δημιουργεί μόνος του λογαριασμό — μόνο μέσω αυτού του κλειδιού.</p>
            <div className="flex gap-2">
              <a href={inviteInfo.mailto} className="flex-1 text-center text-xs font-semibold text-white rounded-lg py-2" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>Άνοιγμα email</a>
              <button onClick={()=>{ navigator.clipboard?.writeText(inviteInfo.link); setCopied(true); setTimeout(()=>setCopied(false),1500); }} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-lg py-2">
                <Copy className="w-3.5 h-3.5"/> {copied?'Αντιγράφηκε!':'Αντιγραφή link'}
              </button>
            </div>
          </div>
        )}

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Προπόνηση *</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[['personal','🏋️','Personal','Ατομική προπόνηση'],['group','👥','Group','Ομαδική προπόνηση']].map(([t,icon,label,desc])=>{
            const on = (t==='group') === grp;
            return (
              <button key={t} onClick={()=>setTraining(t)}
                className={`text-left p-3 rounded-xl border-2 transition-all ${on?'border-gray-900 bg-gray-50':'border-gray-100 hover:border-gray-300'}`}>
                <span className="text-xl">{icon}</span>
                <p className="text-sm font-semibold text-gray-900 mt-1">{label}</p>
                <p className="text-[11px] text-gray-400">{desc}</p>
              </button>
            );
          })}
        </div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Διατροφή</p>
        <button onClick={toggleNutrition}
          className={`flex items-center gap-2 text-sm mb-5 px-3 py-2.5 rounded-xl border-2 w-full ${hasNutrition?'border-emerald-500 bg-emerald-50 text-emerald-700':'border-gray-100 text-gray-500 hover:border-gray-300'}`}>
          <span className={`w-4 h-4 rounded flex items-center justify-center ${hasNutrition?'bg-emerald-500':'border border-gray-300'}`}>{hasNutrition&&<Check className="w-3 h-3 text-white"/>}</span>
          🥗 Προσθήκη διατροφής{grp?' (χρεώνεται ατομικά)':''}
        </button>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {hasTraining&&<div><label className="text-xs font-medium text-gray-500 uppercase">Προπονήσεις / εβδομάδα</label><input type="number" min="1" value={f.sessions_per_week||''} onChange={e=>set('sessions_per_week',parseInt(e.target.value)||0)} className="input-base mt-1"/></div>}
          {hasTraining&&<div><label className="text-xs font-medium text-gray-500 uppercase">Διάρκεια συνεδρίας (ώρες)</label><input type="number" step="0.5" min="0.5" value={f.session_duration_hours||''} onChange={e=>set('session_duration_hours',parseFloat(e.target.value)||'')} className="input-base mt-1" placeholder="1"/></div>}
          {hasNutrition&&<div><label className="text-xs font-medium text-gray-500 uppercase">Διατροφικές συναντήσεις / μήνα</label><input type="number" min="1" value={f.nutrition_meetings_per_month||''} onChange={e=>set('nutrition_meetings_per_month',parseInt(e.target.value)||0)} className="input-base mt-1"/></div>}
          {hasNutrition&&<div><label className="text-xs font-medium text-gray-500 uppercase">Τιμή διατροφής / μήνα (€)</label><input type="number" step="0.5" value={f.nutrition_price??''} onChange={e=>set('nutrition_price',e.target.value===''?'':parseFloat(e.target.value)||0)} className="input-base mt-1" placeholder="= μηνιαία τιμή"/></div>}
          <div className="col-span-2"><label className="text-xs font-medium text-gray-500 uppercase">Μηνιαία τιμή (€)</label><input type="number" value={f.monthly_price||''} onChange={e=>set('monthly_price',parseFloat(e.target.value)||'')} className="input-base mt-1"/></div>
        </div>

        {!client&&<p className="text-[11px] text-gray-400 mb-4">Χρώμα προφίλ & κωδικός portal δημιουργούνται αυτόματα. Στόχος, μετρήσεις και διατροφικό προφίλ ορίζονται στο Course Planning — όχι εδώ.</p>}

        {err && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{err}</div>}
        <div className="flex gap-2">
          <button onClick={onClose} className="btn btn-secondary flex-1">Άκυρο</button>
          <button onClick={save} disabled={saving||!f.name} className="btn btn-primary flex-1">{saving?'Αποθήκευση…':client?'Αποθήκευση':'Εγγραφή πελάτη'}</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ Μικρό sheet ροής ═══════════════ */
export function Sheet({ title, sub, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-4">
          <div><h2 className="font-bold text-gray-900">{title}</h2>{sub&&<p className="text-sm text-gray-400 mt-0.5">{sub}</p>}</div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400"/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ═══════════════ Σελίδα ═══════════════ */
export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const [c,g] = await Promise.all([db.Client.list('name'), db.Group.list('name')]);
    const cFixed = unorphanClients(c, g);
    repairOrphanGroupIds(db, c, g); // μόνιμη επιδιόρθωση στη βάση, στο παρασκήνιο
    setClients(cFixed); setGroups(g);
  };
  useEffect(()=>{ load(); },[]);

  const q = search.toLowerCase();
  /* Η ρίζα δείχνει ΟΛΟΥΣ: personal ΚΑΙ μέλη group */
  const individuals = clients.filter(c => (c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)));
  const activeIndiv = individuals.filter(c=>!c.frozen);
  const frozenIndiv = individuals.filter(c=>c.frozen);
  const shownGroups = groups.filter(g => !q || groupDisplayName(g, clients).toLowerCase().includes(q));


  const IndividualCard = ({ c, frozen }) => (
    <div onClick={()=>navigate(`/ClientProfile?id=${c.id}`)}
      className={`card p-5 cursor-pointer group transition-all ${frozen?'border-dashed opacity-75':'hover:shadow-md'}`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0 ${frozen?'grayscale':''}`} style={{backgroundColor:c.theme_color||'#6366f1'}}>{c.name?.charAt(0)}</div>
        <div className="flex-1 min-w-0"><p className={`font-semibold truncate ${frozen?'text-gray-500':'text-gray-900'}`}>{c.name}{frozen?' ❄️':''}</p><p className="text-sm text-gray-400">{SERVICE_LABELS[c.services]||'—'}</p></div>
        {frozen
          ? <button onClick={async(e)=>{e.stopPropagation(); await db.Client.update(c.id,{frozen:false}); load();}} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 flex-shrink-0">Unfreeze</button>
          : <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0"/>}
      </div>
      {!frozen&&<div className="mt-3 flex gap-2 flex-wrap">
        {c.weight&&<span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">{c.weight} kg</span>}
        {(c.sessions_per_month||c.sessions_per_week)&&<span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">{c.sessions_per_month?`${c.sessions_per_month}× προπ./μήνα`:`${c.sessions_per_week}×/εβδ.`}</span>}
        {["nutrition_only","personal_training_nutrition"].includes(c.services)&&c.nutrition_meetings_per_month?<span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">🥗 {c.nutrition_meetings_per_month}×/μήνα</span>:null}
        {c.monthly_price&&<span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">€{c.monthly_price}/mo</span>}
      </div>}
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div><h1 className="page-title">Πελάτες & Groups</h1><p className="page-subtitle">{individuals.length} individuals · {groups.length} groups</p></div>
        <div className="flex gap-2">
          <button onClick={()=>{setShowAdd(true);setEditing(null);setAddForGroup(null);}} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800"><Plus className="w-4 h-4"/>Νέος πελάτης</button>
        </div>
      </div>

      <div className="relative mb-6"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Αναζήτηση σε individuals ή groups…" className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400"/></div>

      <div>

        {/* ── INDIVIDUALS ── */}
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2"><Users className="w-4 h-4"/> Πελάτες ({individuals.length})</p>
          {activeIndiv.length===0 && frozenIndiv.length===0
            ? <div className="card p-10 text-center text-gray-400"><Users className="w-10 h-10 mx-auto mb-2 opacity-30"/><p className="text-sm">Κανένας ατομικός πελάτης</p></div>
            : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{activeIndiv.map(c=><IndividualCard key={c.id} c={c}/>)}</div>}
          {frozenIndiv.length>0 && (
            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Ανενεργοί ({frozenIndiv.length})</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{frozenIndiv.map(c=><IndividualCard key={c.id} c={c} frozen/>)}</div>
            </div>
          )}
        </section>

      </div>

      {/* ── modals ── */}
      {(showAdd||editing)&&<AddClientModal clients={clients} client={editing}
        onClose={()=>{setShowAdd(false);setEditing(null);}}
        onSaved={load}/>}



    </div>
  );
}
