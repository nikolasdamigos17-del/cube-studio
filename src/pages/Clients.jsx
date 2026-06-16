import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronRight, X, Users, Users2, Check, Trash2 } from 'lucide-react';
import { db } from '../lib/db';
import { format } from 'date-fns';

const COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f97316'];
const SERVICE_LABELS = { personal_training:'Personal Training', personal_training_nutrition:'PT + Nutrition', nutrition_only:'Nutrition Only', group_training:'Group Training' };

function AddClientModal({ onClose, onSaved, client }) {
  const [f, setF] = useState(client||{ name:'', email:'', phone:'', gender:'male', date_of_birth:'', theme_color:'#6366f1', services:'personal_training', sessions_per_week:3, session_duration_hours:1, nutrition_meetings_per_month:2, monthly_price:'', weight:'', height:'', body_fat:'', goals:'', medical_notes:'', portal_password:'', active:true });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('info');
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const save = async () => {
    setSaving(true);
    if (client?.id) await db.Client.update(client.id, f);
    else await db.Client.create(f);
    setSaving(false); onSaved(); onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-gray-900 text-lg">{client?'Edit Client':'Add New Client'}</h2><button onClick={onClose}><X className="w-5 h-5 text-gray-400"/></button></div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">{['info','body','services'].map(t=><button key={t} onClick={()=>setTab(t)} className={`flex-1 py-1.5 text-xs rounded-lg font-medium capitalize transition-colors ${tab===t?'bg-white text-gray-900 shadow':'text-gray-500'}`}>{t==='info'?'Personal Info':t==='body'?'Body Measures':'Services'}</button>)}</div>
        {tab==='info'&&(
          <div className="grid grid-cols-2 gap-3">
            {[['name','Name *'],['email','Email'],['phone','Phone']].map(([k,l])=><div key={k} className={k==='name'?'col-span-2':''}><label className="text-xs font-medium text-gray-500 uppercase">{l}</label><input value={f[k]||''} onChange={e=>set(k,e.target.value)} className="input-base mt-1"/></div>)}
            <div><label className="text-xs font-medium text-gray-500 uppercase">Gender</label><select value={f.gender} onChange={e=>set('gender',e.target.value)} className="input-base mt-1"><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
            <div><label className="text-xs font-medium text-gray-500 uppercase">Date of Birth</label><input type="date" value={f.date_of_birth||''} onChange={e=>set('date_of_birth',e.target.value)} className="input-base mt-1"/></div>
            <div className="col-span-2"><label className="text-xs font-medium text-gray-500 uppercase">Portal Password</label><input value={f.portal_password||''} onChange={e=>set('portal_password',e.target.value)} placeholder="e.g. Alex2024!" className="input-base mt-1"/></div>
            <div className="col-span-2"><label className="text-xs font-medium text-gray-500 uppercase">Goals</label><textarea value={f.goals||''} onChange={e=>set('goals',e.target.value)} rows={2} className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none resize-none"/></div>
            <div className="col-span-2"><label className="text-xs font-medium text-gray-500 uppercase">Medical Notes</label><textarea value={f.medical_notes||''} onChange={e=>set('medical_notes',e.target.value)} rows={2} className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none resize-none"/></div>
            <div className="col-span-2"><label className="text-xs font-medium text-gray-500 uppercase mb-2 block">Theme Color</label><div className="flex gap-2 flex-wrap">{COLORS.map(c=><button key={c} onClick={()=>set('theme_color',c)} className={`w-8 h-8 rounded-full border-2 transition-all ${f.theme_color===c?'border-gray-900 scale-110':'border-transparent'}`} style={{backgroundColor:c}}/>)}</div></div>
          </div>
        )}
        {tab==='body'&&(<div className="grid grid-cols-3 gap-3">{[['weight','Weight (kg)'],['height','Height (cm)'],['body_fat','Body Fat (%)']].map(([k,l])=><div key={k}><label className="text-xs font-medium text-gray-500 uppercase">{l}</label><input type="number" value={f[k]||''} onChange={e=>set(k,parseFloat(e.target.value))} className="input-base mt-1"/></div>)}</div>)}
        {tab==='services'&&(
          <div className="space-y-3">
            <div><label className="text-xs font-medium text-gray-500 uppercase">Service</label><select value={f.services} onChange={e=>set('services',e.target.value)} className="input-base mt-1"><option value="personal_training">Personal Training</option><option value="group_training">Group Training</option><option value="personal_training_nutrition">PT + Nutrition</option><option value="nutrition_only">Nutrition Only</option></select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-gray-500 uppercase">Sessions / Week</label><input type="number" min="1" max="7" value={f.sessions_per_week} onChange={e=>set('sessions_per_week',parseInt(e.target.value))} className="input-base mt-1"/></div>
              <div><label className="text-xs font-medium text-gray-500 uppercase">Duration (hrs)</label><input type="number" step="0.5" value={f.session_duration_hours} onChange={e=>set('session_duration_hours',parseFloat(e.target.value))} className="input-base mt-1"/></div>
            </div>
            <div><label className="text-xs font-medium text-gray-500 uppercase">Monthly Price (€)</label><input type="number" value={f.monthly_price||''} onChange={e=>set('monthly_price',parseFloat(e.target.value))} className="input-base mt-1"/></div>
          </div>
        )}
        <div className="flex gap-2 mt-6"><button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button><button onClick={save} disabled={saving||!f.name} className="btn btn-primary flex-1">{saving?'Saving…':client?'Save Changes':'Add Client'}</button></div>
      </div>
    </div>
  );
}

function GroupModal({ clients, group, onClose, onSaved }) {
  const [name, setName] = useState(group?.name||'');
  const [selected, setSelected] = useState(group?.member_ids||[]);
  const [saving, setSaving] = useState(false);
  const toggle = (id) => setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const save = async () => {
    setSaving(true);
    if (group?.id) await db.Group.update(group.id, {name:name.trim(),member_ids:selected});
    else await db.Group.create({name:name.trim(),member_ids:selected});
    setSaving(false); onSaved(); onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-gray-900">{group?'Edit Group':'Create Group'}</h2><button onClick={onClose}><X className="w-5 h-5 text-gray-400"/></button></div>
        <div className="mb-4"><label className="text-xs font-semibold text-gray-500 uppercase">Group Name *</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Monday Group Training" className="input-base mt-1"/></div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Members ({selected.length})</p>
        <div className="space-y-1.5 max-h-60 overflow-y-auto mb-4">
          {clients.map(c=>(
            <button key={c.id} onClick={()=>toggle(c.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${selected.includes(c.id)?'border-gray-900 bg-gray-50':'border-gray-100 hover:border-gray-200'}`}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{backgroundColor:c.theme_color||'#6366f1'}}>{c.name?.charAt(0)}</div>
              <span className="text-sm font-medium text-gray-900 flex-1 text-left">{c.name}</span>
              {selected.includes(c.id)&&<Check className="w-4 h-4 text-gray-900"/>}
            </button>
          ))}
        </div>
        <div className="flex gap-2"><button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button><button onClick={save} disabled={saving||!name.trim()||selected.length===0} className="flex-1 bg-gray-900 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">{saving?'Saving…':group?'Save':'Create Group'}</button></div>
      </div>
    </div>
  );
}

export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('clients');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showGroup, setShowGroup] = useState(false);
  const [editGroup, setEditGroup] = useState(null);

  const load = async () => {
    const [c,g] = await Promise.all([db.Client.list('name'), db.Group.list('name')]);
    setClients(c); setGroups(g);
  };
  useEffect(()=>{ load(); },[]);

  const filteredClients = clients.filter(c=>c.name?.toLowerCase().includes(search.toLowerCase())||c.email?.toLowerCase().includes(search.toLowerCase()));
  const filteredGroups = groups.filter(g=>g.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="page-title">Clients & Groups</h1><p className="page-subtitle">{clients.length} clients · {groups.length} groups</p></div>
        <div className="flex gap-2">
          <button onClick={()=>{setShowGroup(true);setEditGroup(null);}} className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200"><Users2 className="w-4 h-4"/>New Group</button>
          <button onClick={()=>{setShowAdd(true);setEditing(null);}} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800"><Plus className="w-4 h-4"/>Add Client</button>
        </div>
      </div>

      <div className="relative mb-5"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search clients or groups..." className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400"/></div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        <button onClick={()=>setTab('clients')} className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${tab==='clients'?'bg-white shadow text-gray-900':'text-gray-500'}`}>👤 Clients ({clients.length})</button>
        <button onClick={()=>setTab('groups')} className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${tab==='groups'?'bg-white shadow text-gray-900':'text-gray-500'}`}>👥 Groups ({groups.length})</button>
      </div>

      {tab==='clients'&&(
        filteredClients.length===0 ? <div className="text-center py-20 text-gray-400"><Users className="w-12 h-12 mx-auto mb-3 opacity-30"/><p>No clients yet</p></div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map(c=>(
              <div key={c.id} onClick={()=>navigate(`/ClientProfile?id=${c.id}`)} className="card p-5 hover:shadow-md transition-all cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0" style={{backgroundColor:c.theme_color||'#6366f1'}}>{c.name?.charAt(0)}</div>
                  <div className="flex-1 min-w-0"><p className="font-semibold text-gray-900 truncate">{c.name}</p><p className="text-sm text-gray-400">{SERVICE_LABELS[c.services]||'—'}</p></div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0"/>
                </div>
                <div className="mt-3 flex gap-2 flex-wrap">
                  {c.weight&&<span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">{c.weight} kg</span>}
                  {c.sessions_per_week&&<span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">{c.sessions_per_week}×/wk</span>}
                  {c.monthly_price&&<span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">€{c.monthly_price}/mo</span>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab==='groups'&&(
        filteredGroups.length===0 ? (
          <div className="text-center py-20 text-gray-400"><Users2 className="w-12 h-12 mx-auto mb-3 opacity-30"/><p>No groups yet</p><p className="text-sm mt-1">Create a group to assign training plans to multiple clients at once</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGroups.map(g=>{
              const members = clients.filter(c=>g.member_ids?.includes(c.id));
              return (
                <div key={g.id} className="card p-5 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg">👥</div>
                      <div><p className="font-semibold text-gray-900">{g.name}</p><p className="text-sm text-gray-400">{members.length} members</p></div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={()=>{setEditGroup(g);setShowGroup(true);}} className="p-1.5 hover:bg-gray-100 rounded-lg"><Search className="w-4 h-4 text-gray-400"/></button>
                      <button onClick={async()=>{await db.Group.delete(g.id);load();}} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-400"/></button>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {members.map(m=><span key={m.id} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white" style={{backgroundColor:m.theme_color||'#6366f1'}}>{m.name?.split(' ')[0]}</span>)}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {(showAdd||editing)&&<AddClientModal onClose={()=>{setShowAdd(false);setEditing(null);}} onSaved={load} client={editing}/>}
      {(showGroup||editGroup)&&<GroupModal clients={clients} group={editGroup} onClose={()=>{setShowGroup(false);setEditGroup(null);}} onSaved={load}/>}
    </div>
  );
}
