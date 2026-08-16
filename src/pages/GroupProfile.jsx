import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Users2, ChevronRight, Dumbbell, Euro, Save } from 'lucide-react';
import { db } from '../lib/db';
import { groupDisplayName, firstName, groupWeek, groupPrice, memberTrainingPrice, hasNutrition, nutritionPrice } from '../lib/groups';

export default function GroupProfile() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const groupId = params.get('id') || '';

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ sessions_per_week:'', monthly_price:'' });
  const [saved, setSaved] = useState(false);

  const load = async () => {
    const g = await db.Group.get(groupId);
    const mem = [];
    for (const id of g?.member_ids || []) { const c = await db.Client.get(id); if (c) mem.push(c); }
    setGroup(g); setMembers(mem);
    setForm({
      sessions_per_week: g?.sessions_per_week ?? (mem[0]?.sessions_per_week || ''),
      monthly_price: g?.monthly_price ?? '',
    });
  };
  useEffect(()=>{ if (groupId) load(); }, [groupId]);

  if (!group) return <div className="p-8 text-center text-gray-400">Φόρτωση…</div>;

  const mem = members;
  const priceNow = form.monthly_price !== '' ? parseFloat(form.monthly_price)||0 : groupPrice(group, mem);
  const weekNow = form.sessions_per_week !== '' ? parseInt(form.sessions_per_week)||0 : groupWeek(group, mem);

  const save = async () => {
    const w = parseInt(form.sessions_per_week)||0;
    const patch = { sessions_per_week:w, monthly_price: parseFloat(form.monthly_price)||0 };
    await db.Group.update(group.id, patch);
    // κράτα και στα μέλη το κοινό sessions_per_week (για ημερολόγιο/εγκέφαλο)
    for (const m of mem) await db.Client.update(m.id, { sessions_per_week:w, sessions_per_month:w*4 });
    setGroup({ ...group, ...patch });
    setSaved(true); setTimeout(()=>setSaved(false), 1500);
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto animate-fade-in">
      <button onClick={()=>navigate('/Clients')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5"><ArrowLeft className="w-4 h-4"/> Πελάτες & Groups</button>

      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{background:'linear-gradient(135deg,#e0457b,#8b5cf6)'}}>👥</div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{groupDisplayName(group, mem)}</h1>
          <p className="text-sm text-gray-400">Ομαδικό πλάνο · {mem.length} μέλη · αγοράζει μόνο προπονήσεις</p>
        </div>
      </div>

      {/* Ομαδικό πλάνο προπονήσεων */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mb-5">
        <p className="font-semibold text-gray-900 mb-1 flex items-center gap-2"><Dumbbell className="w-4 h-4 text-gray-500"/> Πλάνο προπονήσεων (κοινό)</p>
        <p className="text-xs text-gray-400 mb-4">Οι προπονήσεις είναι κοινές για το group. Η διατροφή, αν υπάρχει, ορίζεται ξεχωριστά σε κάθε μέλος.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Προπονήσεις / εβδομάδα</label>
            <input type="number" min="1" value={form.sessions_per_week} onChange={e=>setForm(f=>({...f,sessions_per_week:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1"/>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Τιμή group / μήνα (€)</label>
            <input type="number" step="0.5" value={form.monthly_price} onChange={e=>setForm(f=>({...f,monthly_price:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1"/>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4 flex-wrap text-sm">
          <span className="px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 font-semibold">🏋️ {weekNow*4} προπονήσεις / μήνα</span>
          <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">Κάθε μέλος: €{(priceNow/2).toFixed(0)} (τιμή ÷ 2)</span>
        </div>
        <button onClick={save} className="w-full mt-5 bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-800">
          <Save className="w-4 h-4"/> {saved ? 'Αποθηκεύτηκε ✓' : 'Αποθήκευση πλάνου'}
        </button>
      </div>

      {/* Μέλη */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <p className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Users2 className="w-4 h-4 text-gray-500"/> Μέλη</p>
        <div className="space-y-2">
          {mem.map(m=>(
            <button key={m.id} onClick={()=>navigate(`/ClientProfile?id=${m.id}`)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-900 text-left">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{backgroundColor:m.theme_color||'#6366f1'}}>{m.name?.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{m.name}</p>
                <p className="text-xs text-gray-400">
                  🏋️ €{(priceNow/2).toFixed(0)}/μήνα · {weekNow}×/εβδ.
                  {hasNutrition(m) ? ` · 🥗 €${nutritionPrice(m).toFixed(0)} για ${m.nutrition_meetings_per_month||0} διατροφές` : ''}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300"/>
            </button>
          ))}
          {mem.length===0 && <p className="text-sm text-gray-400 text-center py-3">Το group δεν έχει μέλη ακόμα.</p>}
        </div>
        <p className="text-[11px] text-gray-400 mt-3">Για τη διατροφή κάθε μέλους (τιμή & πλήθος), άνοιξε την καρτέλα του.</p>
      </div>
    </div>
  );
}
