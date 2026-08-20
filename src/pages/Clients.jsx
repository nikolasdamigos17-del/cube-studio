import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronRight, X, Users, Users2, Check, Trash2, UserPlus, Lock, Mail, Copy, Send } from 'lucide-react';
import { db } from '../lib/db';
import { GROUP_CAP, firstName, groupDisplayName, isIndividual, createEmptyGroup, addMemberToGroup, removeMemberFromGroup, deleteGroup } from '../lib/groups';
import { genToken, inviteMailto, activationLink } from '../lib/invites';

const COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f97316'];
const SERVICE_LABELS = {
  personal_training:'Personal Training', personal_training_nutrition:'PT + Nutrition',
  nutrition_only:'Nutrition Only', group_training:'Group Training', group_training_nutrition:'Group + Nutrition',
};

/* ═══════════════ Νέος / επεξεργασία πελάτη ═══════════════ */
function AddClientModal({ onClose, onSaved, client, clients, forGroup, onGroupClient }) {
  const [f, setF] = useState(client || { name:'', phone:'', email:'',
    services: forGroup ? 'group_training' : 'personal_training',
    sessions_per_week:3, nutrition_meetings_per_month:2, monthly_price:'', active:true });
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [inviteInfo, setInviteInfo] = useState(null);
  const [copied, setCopied] = useState(false);
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const grp = f.services === 'group_training' || f.services === 'group_training_nutrition';
  const hasTraining  = ['personal_training','personal_training_nutrition','group_training','group_training_nutrition'].includes(f.services);
  const hasNutrition = ['nutrition_only','personal_training_nutrition','group_training_nutrition'].includes(f.services);
  const PROGRAMS = [
    { v:'personal_training',           icon:'🏋️', label:'Προπόνηση',            desc:'Personal training' },
    { v:'nutrition_only',              icon:'🥗', label:'Διατροφή',             desc:'Nutrition Center' },
    { v:'personal_training_nutrition', icon:'⚡', label:'Προπόνηση + Διατροφή', desc:'Πλήρες πρόγραμμα' },
    { v:'group_training',              icon:'👥', label:'Group',                desc:'Ομαδικές προπονήσεις' },
  ];
  const save = async () => {
    setSaving(true);
    const payload = { ...f };
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
  };

  const sendInvite = async () => {
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
  };

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
          <div><label className="text-xs font-medium text-gray-500 uppercase">Email</label>
            <div className="flex gap-2 mt-1">
              <input value={f.email||''} onChange={e=>set('email',e.target.value)} className="input-base flex-1" type="email" placeholder="email@…"/>
              <button onClick={sendInvite} disabled={inviting||!f.email} title="Αποστολή πρόσκλησης στην εφαρμογή" className="flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold text-white disabled:opacity-40 flex-shrink-0" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>
                {inviting? '…' : <><Send className="w-3.5 h-3.5"/> Πρόσκληση</>}
              </button>
            </div>
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

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Πρόγραμμα</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {PROGRAMS.map(p=>{
            const on = p.v==='group_training' ? grp : f.services===p.v;
            return (
              <button key={p.v} onClick={()=>set('services', p.v)}
                className={`text-left p-3 rounded-xl border-2 transition-all ${on?'border-gray-900 bg-gray-50':'border-gray-100 hover:border-gray-300'}`}>
                <span className="text-xl">{p.icon}</span>
                <p className="text-sm font-semibold text-gray-900 mt-1">{p.label}</p>
                <p className="text-[11px] text-gray-400">{p.desc}</p>
              </button>
            );
          })}
        </div>
        {grp && (
          <button onClick={()=>set('services', f.services==='group_training_nutrition'?'group_training':'group_training_nutrition')}
            className={`flex items-center gap-2 text-sm mb-5 px-3 py-2 rounded-xl border-2 w-full ${f.services==='group_training_nutrition'?'border-emerald-500 bg-emerald-50 text-emerald-700':'border-gray-100 text-gray-500'}`}>
            <span className={`w-4 h-4 rounded flex items-center justify-center ${f.services==='group_training_nutrition'?'bg-emerald-500':'border border-gray-300'}`}>{f.services==='group_training_nutrition'&&<Check className="w-3 h-3 text-white"/>}</span>
            🥗 Το group + διατροφή (η διατροφή χρεώνεται ατομικά)
          </button>
        )}

        <div className="grid grid-cols-2 gap-3 mb-5">
          {hasTraining&&<div><label className="text-xs font-medium text-gray-500 uppercase">Προπονήσεις / εβδομάδα</label><input type="number" min="1" value={f.sessions_per_week||''} onChange={e=>set('sessions_per_week',parseInt(e.target.value)||0)} className="input-base mt-1"/></div>}
          {hasNutrition&&<div><label className="text-xs font-medium text-gray-500 uppercase">Διατροφικές συναντήσεις / μήνα</label><input type="number" min="1" value={f.nutrition_meetings_per_month||''} onChange={e=>set('nutrition_meetings_per_month',parseInt(e.target.value)||0)} className="input-base mt-1"/></div>}
          <div className={hasTraining&&hasNutrition?'col-span-2':''}><label className="text-xs font-medium text-gray-500 uppercase">Μηνιαία τιμή (€)</label><input type="number" value={f.monthly_price||''} onChange={e=>set('monthly_price',parseFloat(e.target.value)||'')} className="input-base mt-1"/></div>
        </div>

        {!client&&<p className="text-[11px] text-gray-400 mb-4">Χρώμα προφίλ & κωδικός portal δημιουργούνται αυτόματα. Στόχος, μετρήσεις και διατροφικό προφίλ ορίζονται στο Course Planning — όχι εδώ.</p>}

        <div className="flex gap-2">
          <button onClick={onClose} className="btn btn-secondary flex-1">Άκυρο</button>
          <button onClick={save} disabled={saving||!f.name} className="btn btn-primary flex-1">{saving?'Αποθήκευση…':client?'Αποθήκευση':'Εγγραφή πελάτη'}</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ Μικρό sheet ροής ═══════════════ */
function Sheet({ title, sub, onClose, children }) {
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
  const [addForGroup, setAddForGroup] = useState(null);
  const [choiceGroup, setChoiceGroup] = useState(null);
  const [pickForGroup, setPickForGroup] = useState(null);
  const [placeClient, setPlaceClient] = useState(null);

  const load = async () => {
    const [c,g] = await Promise.all([db.Client.list('name'), db.Group.list('name')]);
    setClients(c); setGroups(g);
  };
  useEffect(()=>{ load(); },[]);

  const q = search.toLowerCase();
  const individuals = clients.filter(c => isIndividual(c) && (c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)));
  const activeIndiv = individuals.filter(c=>!c.frozen);
  const frozenIndiv = individuals.filter(c=>c.frozen);
  const shownGroups = groups.filter(g => !q || groupDisplayName(g, clients).toLowerCase().includes(q));
  const availableForGroup = clients.filter(c => !c.group_id);
  const openGroups = groups.filter(g => (g.member_ids||[]).length < GROUP_CAP);

  const createGroup = async () => { await createEmptyGroup(); load(); };
  const doAddExisting = async (group, clientId) => { await addMemberToGroup(group, clientId, clients); setPickForGroup(null); load(); };
  const doPlace = async (group, clientId) => { await addMemberToGroup(group, clientId, clients); setPlaceClient(null); load(); };
  const doPlaceNew = async (clientId) => { const g = await createEmptyGroup(); await addMemberToGroup(g, clientId, clients); setPlaceClient(null); load(); };

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
          <button onClick={createGroup} className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200"><Users2 className="w-4 h-4"/>Δημιουργία group</button>
          <button onClick={()=>{setShowAdd(true);setEditing(null);setAddForGroup(null);}} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800"><Plus className="w-4 h-4"/>Νέος πελάτης</button>
        </div>
      </div>

      <div className="relative mb-6"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Αναζήτηση σε individuals ή groups…" className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400"/></div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">

        {/* ── INDIVIDUALS ── */}
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2"><Users className="w-4 h-4"/> Individuals ({individuals.length})</p>
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

        {/* ── GROUPS ── */}
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2"><Users2 className="w-4 h-4"/> Groups ({groups.length})</p>
          <div className="space-y-4">
            {shownGroups.length===0 && (
              <div className="card p-8 text-center text-gray-400">
                <Users2 className="w-10 h-10 mx-auto mb-2 opacity-30"/>
                <p className="text-sm font-medium text-gray-500">Κανένα group ακόμα</p>
                <button onClick={createGroup} className="mt-3 text-sm font-semibold text-gray-900 underline">Δημιουργία group</button>
              </div>
            )}
            {shownGroups.map(g=>{
              const members = (g.member_ids||[]).map(id=>clients.find(c=>c.id===id)).filter(Boolean);
              const full = members.length >= GROUP_CAP;
              return (
                <div key={g.id} className={`card p-5 ${full?'border-emerald-200':'border-dashed'}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <button onClick={()=>navigate(`/GroupProfile?id=${g.id}`)} className="flex items-center gap-3 min-w-0 text-left group/gh">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{background:full?'linear-gradient(135deg,#e0457b,#8b5cf6)':'#f3f4f6'}}>{full?'👥':'➕'}</div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate group-hover/gh:underline">{groupDisplayName(g, clients)}</p>
                        <p className="text-xs text-gray-400">{members.length}/{GROUP_CAP} μέλη · πλάνο group</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {full
                        ? <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><Lock className="w-3 h-3"/> Πλήρες</span>
                        : <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Ανοιχτό</span>}
                      <button onClick={async()=>{ if(confirm(`Διαγραφή του group «${groupDisplayName(g,clients)}»; Τα μέλη επιστρέφουν σε individuals.`)){ await deleteGroup(g, clients); load(); } }} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-400"/></button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {members.map(m=>(
                      <div key={m.id} className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50">
                        <div onClick={()=>navigate(`/ClientProfile?id=${m.id}`)} className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{backgroundColor:m.theme_color||'#6366f1'}}>{m.name?.charAt(0)}</div>
                          <div className="min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>{m.services==='group_training_nutrition'&&<p className="text-[10px] text-emerald-600">🥗 + διατροφή (ατομικά)</p>}</div>
                        </div>
                        <button onClick={async()=>{ await removeMemberFromGroup(g, m.id, clients); load(); }} className="p-1.5 hover:bg-white rounded-lg" title="Αφαίρεση από το group"><X className="w-3.5 h-3.5 text-gray-400"/></button>
                      </div>
                    ))}
                    {members.length===0 && <p className="text-sm text-gray-400 py-2 text-center">Άδειο group — πρόσθεσε μέλη.</p>}
                  </div>

                  {!full && (
                    <button onClick={()=>setChoiceGroup(g)} className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors">
                      <UserPlus className="w-4 h-4"/> Προσθήκη στο group
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* ── modals ── */}
      {(showAdd||editing||addForGroup)&&<AddClientModal clients={clients} client={editing} forGroup={addForGroup}
        onClose={()=>{setShowAdd(false);setEditing(null);setAddForGroup(null);}}
        onSaved={load} onGroupClient={(c)=>setPlaceClient(c)}/>}

      {choiceGroup && (
        <Sheet title="Προσθήκη μέλους" sub={groupDisplayName(choiceGroup, clients)} onClose={()=>setChoiceGroup(null)}>
          <div className="space-y-2">
            <button onClick={()=>{ setPickForGroup(choiceGroup); setChoiceGroup(null); }} className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-100 hover:border-gray-900 text-left">
              <Users className="w-5 h-5 text-gray-500"/><div><p className="font-semibold text-gray-900 text-sm">Υπάρχων πελάτης</p><p className="text-xs text-gray-400">Διάλεξε από τους πελάτες σου</p></div>
            </button>
            <button onClick={()=>{ setAddForGroup(choiceGroup); setChoiceGroup(null); }} className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-100 hover:border-gray-900 text-left">
              <UserPlus className="w-5 h-5 text-gray-500"/><div><p className="font-semibold text-gray-900 text-sm">Νέος πελάτης</p><p className="text-xs text-gray-400">Κανονική εγγραφή — μπαίνει κατευθείαν στο group</p></div>
            </button>
          </div>
        </Sheet>
      )}

      {pickForGroup && (
        <Sheet title="Υπάρχων πελάτης" sub={`→ ${groupDisplayName(pickForGroup, clients)}`} onClose={()=>setPickForGroup(null)}>
          <div className="space-y-1.5">
            {availableForGroup.length===0 && <p className="text-sm text-gray-400 text-center py-4">Δεν υπάρχουν διαθέσιμοι πελάτες — όλοι ανήκουν ήδη σε group.</p>}
            {availableForGroup.map(c=>(
              <button key={c.id} onClick={()=>doAddExisting(pickForGroup, c.id)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-900 text-left">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{backgroundColor:c.theme_color||'#6366f1'}}>{c.name?.charAt(0)}</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{c.name}</p><p className="text-xs text-gray-400">{SERVICE_LABELS[c.services]||'—'}</p></div>
                <ChevronRight className="w-4 h-4 text-gray-300"/>
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {placeClient && (
        <Sheet title="Σε ποιο group;" sub={`${firstName(placeClient.name)} επέλεξε group πρόγραμμα`} onClose={()=>{ setPlaceClient(null); load(); }}>
          <div className="space-y-1.5">
            <button onClick={()=>doPlaceNew(placeClient.id)} className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-gray-900 bg-gray-900 text-white text-left mb-2">
              <Plus className="w-5 h-5"/><div><p className="text-sm font-semibold">Δημιουργία νέου group</p><p className="text-xs text-white/60">Φτιάχνει group με τον/την {firstName(placeClient.name)}</p></div>
            </button>
            {openGroups.length>0 && <p className="text-xs font-semibold text-gray-400 uppercase pt-1 pb-1">Ανοιχτά group</p>}
            {openGroups.map(g=>(
              <button key={g.id} onClick={()=>doPlace(g, placeClient.id)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-900 text-left">
                <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">👥</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{groupDisplayName(g, clients)}</p><p className="text-xs text-gray-400">{(g.member_ids||[]).length}/{GROUP_CAP} μέλη</p></div>
                <ChevronRight className="w-4 h-4 text-gray-300"/>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}
