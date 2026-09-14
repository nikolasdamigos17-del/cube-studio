import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Users2, UserPlus, Plus, X, Trash2, Lock, ChevronRight } from 'lucide-react';
import { GROUP_CAP, firstName, groupDisplayName, createEmptyGroup, addMemberToGroup, removeMemberFromGroup, deleteGroup } from '../lib/groups';
import { AddClientModal, Sheet, SERVICE_LABELS } from '../pages/Clients';

/* ── Διαχείριση Groups — ζει στο Training Center ─────────────────────────────
   Οι πελάτες καταχωρούνται όλοι στο Clients (η ρίζα)· εδώ γίνεται η κατάταξη:
   δημιουργία group, προσθήκη/αφαίρεση μελών, μετακινήσεις group↔group και
   group↔personal (η αφαίρεση από group = επιστροφή σε personal).              */

export default function GroupsPanel({ clients, groups, onChanged }) {
  const navigate = useNavigate();
  const [choiceGroup, setChoiceGroup] = useState(null);
  const [pickForGroup, setPickForGroup] = useState(null);
  const [placeClient, setPlaceClient] = useState(null);
  const [addForGroup, setAddForGroup] = useState(null);

  const availableForGroup = clients.filter(c => !c.group_id);
  const openGroups = groups.filter(g => (g.member_ids || []).length < GROUP_CAP);

  const createGroup = async () => { await createEmptyGroup(); onChanged(); };
  const doAddExisting = async (group, clientId) => { await addMemberToGroup(group, clientId, clients); setPickForGroup(null); onChanged(); };
  const doPlace = async (group, clientId) => { await addMemberToGroup(group, clientId, clients); setPlaceClient(null); onChanged(); };
  const doPlaceNew = async (clientId) => { const g = await createEmptyGroup(); await addMemberToGroup(g, clientId, clients); setPlaceClient(null); onChanged(); };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Users2 className="w-4 h-4"/> Διαχείριση groups ({groups.length})</p>
        <button onClick={createGroup} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-border hover:bg-muted"><Plus className="w-3.5 h-3.5"/> Νέο group</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {groups.length === 0 && (
          <div className="card p-8 text-center text-muted-foreground col-span-full">
            <Users2 className="w-10 h-10 mx-auto mb-2 opacity-30"/>
            <p className="text-sm font-medium">Κανένα group ακόμα — φτιάξε το πρώτο και πρόσθεσε μέλη από τους πελάτες σου.</p>
          </div>
        )}
        {groups.map(g => {
          const members = (g.member_ids || []).map(id => clients.find(c => c.id === id)).filter(Boolean);
          const full = members.length >= GROUP_CAP;
          return (
            <div key={g.id} className={`card p-5 ${full ? 'border-emerald-200' : 'border-dashed'}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: full ? 'linear-gradient(135deg,#e0457b,#8b5cf6)' : 'hsl(var(--muted))' }}>{full ? '👥' : '➕'}</div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{groupDisplayName(g, clients)}</p>
                    <p className="text-xs text-muted-foreground">{members.length}/{GROUP_CAP} μέλη</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {full
                    ? <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><Lock className="w-3 h-3"/> Πλήρες</span>
                    : <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Ανοιχτό</span>}
                  <button onClick={async () => { if (confirm(`Διαγραφή του group «${groupDisplayName(g, clients)}»; Τα μέλη επιστρέφουν σε personal.`)) { await deleteGroup(g, clients); onChanged(); } }} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-400"/></button>
                </div>
              </div>

              <div className="space-y-2">
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/50">
                    <div onClick={() => navigate(`/ClientProfile?id=${m.id}`)} className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: m.theme_color || '#6366f1' }}>{m.name?.charAt(0)}</div>
                      <div className="min-w-0"><p className="text-sm font-medium truncate">{m.name}</p>{m.services === 'group_training_nutrition' && <p className="text-[10px] text-emerald-600">🥗 + διατροφή (ατομικά)</p>}</div>
                    </div>
                    <button onClick={async () => { await removeMemberFromGroup(g, m.id, clients); onChanged(); }} className="p-1.5 hover:bg-background rounded-lg" title="Αφαίρεση — επιστρέφει σε personal"><X className="w-3.5 h-3.5 text-muted-foreground"/></button>
                  </div>
                ))}
                {members.length === 0 && <p className="text-sm text-muted-foreground py-2 text-center">Άδειο group — πρόσθεσε μέλη.</p>}
              </div>

              {!full && (
                <button onClick={() => setChoiceGroup(g)} className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border text-sm font-semibold text-muted-foreground hover:border-foreground hover:text-foreground transition-colors">
                  <UserPlus className="w-4 h-4"/> Προσθήκη στο group
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── modals / sheets ── */}
      {addForGroup && <AddClientModal clients={clients} forGroup={addForGroup}
        onClose={() => setAddForGroup(null)} onSaved={onChanged} onGroupClient={(c) => setPlaceClient(c)}/>}

      {choiceGroup && (
        <Sheet title="Προσθήκη μέλους" sub={groupDisplayName(choiceGroup, clients)} onClose={() => setChoiceGroup(null)}>
          <div className="space-y-2">
            <button onClick={() => { setPickForGroup(choiceGroup); setChoiceGroup(null); }} className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-100 hover:border-gray-900 text-left">
              <Users className="w-5 h-5 text-gray-500"/><div><p className="font-semibold text-gray-900 text-sm">Υπάρχων πελάτης</p><p className="text-xs text-gray-400">Διάλεξε από τους πελάτες σου (ή μετακίνησε από άλλο group αφαιρώντας τον πρώτα)</p></div>
            </button>
            <button onClick={() => { setAddForGroup(choiceGroup); setChoiceGroup(null); }} className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-100 hover:border-gray-900 text-left">
              <UserPlus className="w-5 h-5 text-gray-500"/><div><p className="font-semibold text-gray-900 text-sm">Νέος πελάτης</p><p className="text-xs text-gray-400">Κανονική εγγραφή — μπαίνει κατευθείαν στο group</p></div>
            </button>
          </div>
        </Sheet>
      )}

      {pickForGroup && (
        <Sheet title="Υπάρχων πελάτης" sub={`→ ${groupDisplayName(pickForGroup, clients)}`} onClose={() => setPickForGroup(null)}>
          <div className="space-y-1.5">
            {availableForGroup.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Δεν υπάρχουν διαθέσιμοι πελάτες — όλοι ανήκουν ήδη σε group.</p>}
            {availableForGroup.map(c => (
              <button key={c.id} onClick={() => doAddExisting(pickForGroup, c.id)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-900 text-left">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: c.theme_color || '#6366f1' }}>{c.name?.charAt(0)}</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{c.name}</p><p className="text-xs text-gray-400">{SERVICE_LABELS[c.services] || '—'}</p></div>
                <ChevronRight className="w-4 h-4 text-gray-300"/>
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {placeClient && (
        <Sheet title="Σε ποιο group;" sub={`${firstName(placeClient.name)} επέλεξε group πρόγραμμα`} onClose={() => { setPlaceClient(null); onChanged(); }}>
          <div className="space-y-1.5">
            <button onClick={() => doPlaceNew(placeClient.id)} className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-gray-900 bg-gray-900 text-white text-left mb-2">
              <Plus className="w-5 h-5"/><div><p className="text-sm font-semibold">Δημιουργία νέου group</p><p className="text-xs text-white/60">Φτιάχνει group με τον/την {firstName(placeClient.name)}</p></div>
            </button>
            {openGroups.length > 0 && <p className="text-xs font-semibold text-gray-400 uppercase pt-1 pb-1">Ανοιχτά group</p>}
            {openGroups.map(g => (
              <button key={g.id} onClick={() => doPlace(g, placeClient.id)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-900 text-left">
                <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">👥</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{groupDisplayName(g, clients)}</p><p className="text-xs text-gray-400">{(g.member_ids || []).length}/{GROUP_CAP} μέλη</p></div>
                <ChevronRight className="w-4 h-4 text-gray-300"/>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}
