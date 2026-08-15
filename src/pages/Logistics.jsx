import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { format, parseISO, differenceInDays, addMonths, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { Plus, Trash2, X, Euro, Edit3, Settings, TrendingUp, Calendar, AlertTriangle, ChevronRight, Check, CreditCard, Users, BarChart2, Loader2, Undo2, Wallet } from 'lucide-react';
import { db } from '../lib/db';
import { creditBalance, addCredit, REASON_LABELS, addGroupCredit, getGroupTrainingBalance, getBalance, groupTrainingBalance } from '../lib/credits';
import { groupDisplayName, firstName, GROUP_CAP, isIndividual } from '../lib/groups';

const METHOD_EMOJI = { cash:'💵', card:'💳', transfer:'🏦', other:'📄' };
const METHOD_COLOR = { cash:'bg-green-50 text-green-700 border-green-100', card:'bg-blue-50 text-blue-700 border-blue-100', transfer:'bg-purple-50 text-purple-700 border-purple-100', other:'bg-gray-100 text-gray-600 border-gray-200' };

// ── Shared Section Header ────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div>
        <h2 className="text-lg font-bold text-foreground" style={{fontFamily:'var(--font-display)',letterSpacing:'-0.02em'}}>{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Payment Modal ────────────────────────────────────────────────────────────
function PaymentModal({ clients, payment, onClose, onSaved }) {
  const [f, setF] = useState(payment || {
    client_id:'', client_name:'', amount:'', currency:'EUR', description:'',
    paid_date: format(new Date(),'yyyy-MM-dd'), period_from:'', period_to:'',
    method:'cash', notes:'', item_type:'monthly'
  });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  const handleClient = (id) => {
    const c = clients.find(c=>c.id===id);
    setF(p=>({...p, client_id:id, client_name:c?.name||'', amount: c?.monthly_price || p.amount}));
  };

  const setMonthly = (from) => {
    if (!from) return;
    set('period_from', from);
    set('period_to', format(addMonths(parseISO(from),1), 'yyyy-MM-dd'));
  };

  const save = async () => {
    setSaving(true);
    const data = {...f, amount: parseFloat(f.amount)||0};
    if (payment?.id) await db.Payment.update(payment.id, data);
    else await db.Payment.create(data);
    setSaving(false); onSaved(); onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-lg p-0 overflow-hidden w-full" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-foreground text-lg" style={{fontFamily:'var(--font-display)'}}>{payment?'Edit Transaction':'Log Transaction'}</h2>
          <button onClick={onClose} className="btn-ghost btn-icon"><X className="w-4 h-4"/></button>
        </div>
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="section-label">Client *</label>
            <select value={f.client_id} onChange={e=>handleClient(e.target.value)} className="input-base mt-1">
              <option value="">Select client</option>
              {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="section-label">Payment type</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {[['monthly','📅 Monthly Plan'],['session','🏋️ Session(s)'],['custom','✏️ Custom']].map(([v,l])=>(
                <button key={v} onClick={()=>set('item_type',v)} className={`py-2.5 px-2 rounded-xl text-xs font-semibold border-2 transition-all ${f.item_type===v?'border-foreground bg-foreground text-background':'border-border text-muted-foreground hover:border-foreground/30'}`}>{l}</button>
              ))}
            </div>
          </div>
          {f.item_type==='monthly' && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-blue-700">Coverage period</p>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-blue-700 mb-1 block">From</label><input type="date" value={f.period_from} onChange={e=>setMonthly(e.target.value)} className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white outline-none text-foreground"/></div>
                <div><label className="text-xs text-blue-700 mb-1 block">To</label><input type="date" value={f.period_to} onChange={e=>set('period_to',e.target.value)} className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white outline-none text-foreground"/></div>
              </div>
            </div>
          )}
          <div><label className="section-label">Description</label><input value={f.description} onChange={e=>set('description',e.target.value)} placeholder="e.g. Monthly PT — June 2025" className="input-base mt-1"/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="section-label">Amount (€) *</label><input type="number" step="0.5" value={f.amount} onChange={e=>set('amount',e.target.value)} placeholder="0.00" className="input-base mt-1"/></div>
            <div><label className="section-label">Method</label>
              <select value={f.method} onChange={e=>set('method',e.target.value)} className="input-base mt-1">
                <option value="cash">💵 Cash</option><option value="card">💳 Card</option><option value="transfer">🏦 Transfer</option><option value="other">📄 Other</option>
              </select>
            </div>
          </div>
          <div><label className="section-label">Date Paid *</label><input type="date" value={f.paid_date} onChange={e=>set('paid_date',e.target.value)} className="input-base mt-1"/></div>
          <div><label className="section-label">Notes</label><textarea value={f.notes||''} onChange={e=>set('notes',e.target.value)} rows={2} className="input-base mt-1 resize-none"/></div>
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
          <button onClick={save} disabled={saving||!f.client_id||!f.amount} className="btn btn-primary flex-1">{saving?<><Loader2 className="w-4 h-4 animate-spin"/>Saving…</>:payment?'Update':'Log Payment'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Client Plan Modal ────────────────────────────────────────────────────────
function ClientPlanModal({ client, onClose, onSaved }) {
  const [f, setF] = useState({
    services: client.services||'personal_training',
    sessions_per_week: client.sessions_per_week||3,
    session_duration_hours: client.session_duration_hours||1,
    nutrition_meetings_per_month: client.nutrition_meetings_per_month||0,
    monthly_price: client.monthly_price||'',
  });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  const calcPrice = () => {
    const h = parseFloat(f.session_duration_hours)||1;
    const s = parseInt(f.sessions_per_week)||0;
    const n = parseInt(f.nutrition_meetings_per_month)||0;
    const type = f.services;
    let price = 0;
    if (type.includes('group')) price = 20 * h * s * 4;
    else if (type.includes('training')) price = 30 * h * s * 4;
    if (type.includes('nutrition') || n > 0) price += 20 * (n||2);
    return Math.round(price);
  };

  const save = async () => {
    setSaving(true);
    await db.Client.update(client.id, {...f, monthly_price: parseFloat(f.monthly_price)||0});
    setSaving(false); onSaved(); onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-md p-0 overflow-hidden w-full" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{backgroundColor:client.theme_color||'#6366f1'}}>{client.name?.charAt(0)}</div>
          <div><h2 className="font-bold text-foreground text-base" style={{fontFamily:'var(--font-display)'}}>{client.name}</h2><p className="text-xs text-muted-foreground">Plan Settings</p></div>
          <button onClick={onClose} className="btn-ghost btn-icon ml-auto"><X className="w-4 h-4"/></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="section-label">Service Type</label>
            <select value={f.services} onChange={e=>set('services',e.target.value)} className="input-base mt-1">
              <option value="personal_training">Personal Training</option>
              <option value="group_training">Group Training</option>
              <option value="personal_training_nutrition">PT + Nutrition</option>
              <option value="nutrition_only">Nutrition Only</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label">Sessions / Week</label>
              <input type="number" min="1" max="7" value={f.sessions_per_week} onChange={e=>set('sessions_per_week',parseInt(e.target.value))} className="input-base mt-1"/>
            </div>
            <div>
              <label className="section-label">Duration (hours)</label>
              <input type="number" step="0.5" min="0.5" value={f.session_duration_hours} onChange={e=>set('session_duration_hours',parseFloat(e.target.value))} className="input-base mt-1"/>
            </div>
          </div>
          {f.services?.includes('nutrition') && (
            <div><label className="section-label">Nutrition Meetings / Month</label><input type="number" value={f.nutrition_meetings_per_month} onChange={e=>set('nutrition_meetings_per_month',parseInt(e.target.value))} className="input-base mt-1"/></div>
          )}
          <div>
            <label className="section-label">Monthly Price (€)</label>
            <div className="flex gap-2 mt-1">
              <input type="number" value={f.monthly_price} onChange={e=>set('monthly_price',e.target.value)} className="input-base flex-1"/>
              <button onClick={()=>set('monthly_price',calcPrice())} className="btn btn-secondary px-3 text-xs whitespace-nowrap">Auto-calc</button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">PT €30/h · Group €20/h · Nutrition +€20/meeting</p>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn btn-primary flex-1">{saving?'Saving…':'Save Plan'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Revenue Chart ────────────────────────────────────────────────────────────
function RevenueChart({ payments }) {
  const now = new Date();
  const months = eachMonthOfInterval({ start: subMonths(now, 5), end: now });
  const data = months.map(m => {
    const key = format(m, 'yyyy-MM');
    const rev = payments.filter(p => p.paid_date?.startsWith(key)).reduce((s,p) => s+(p.amount||0), 0);
    return { label: format(m, 'MMM'), rev };
  });
  const max = Math.max(...data.map(d => d.rev), 1);

  return (
    <div className="flex items-end gap-2 h-20">
      {data.map((d,i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
          <div className="w-full rounded-t-md transition-all" style={{
            height: Math.max(4, (d.rev / max) * 64),
            backgroundColor: i === data.length-1 ? 'hsl(var(--foreground))' : 'hsl(var(--border))',
          }}/>
          <span className="text-[10px] text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
/* ═══════════════ Log Payment — 3 βήματα ═══════════════ */

function LogPayWizard({ individuals, groups, allClients, onClose, onSaved }) {
  const [step, setStep] = useState(1);
  const [tType, setTType] = useState('client');       // 'client' | 'group'
  const [tId, setTId] = useState('');
  const [months, setMonths] = useState(1);
  const [trainings, setTrainings] = useState(0);
  const [nutrition, setNutrition] = useState(0);       // individual
  const [memberNutri, setMemberNutri] = useState({});  // group: {memberId:count}
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState('cash');
  const [payDate, setPayDate] = useState(format(new Date(),'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);

  const weekOf = (c) => c.sessions_per_week || (c.sessions_per_month ? Math.round(c.sessions_per_month/4) : 0);
  const client = tType==='client' ? (individuals.find(c=>c.id===tId) || allClients.find(c=>c.id===tId)) : null;
  const group  = tType==='group'  ? groups.find(g=>g.id===tId) : null;
  const members = group ? (group.member_ids||[]).map(id=>allClients.find(c=>c.id===id)).filter(Boolean) : [];
  const nutriMembers = members.filter(m=>m.services==='group_training_nutrition' || m.nutrition_meetings_per_month>0);

  const pickClient = (c) => {
    setTType('client'); setTId(c.id); setMonths(1);
    setTrainings(weekOf(c)*4); setNutrition(c.nutrition_meetings_per_month||0);
    setAmount(parseFloat(c.monthly_price)||0); setStep(2);
  };
  const pickGroup = (g) => {
    const mem = (g.member_ids||[]).map(id=>allClients.find(c=>c.id===id)).filter(Boolean);
    setTType('group'); setTId(g.id); setMonths(1);
    setTrainings((mem[0]?weekOf(mem[0]):0)*4);
    const mn={}; mem.forEach(m=>{ if(m.services==='group_training_nutrition'||m.nutrition_meetings_per_month>0) mn[m.id]=m.nutrition_meetings_per_month||0; });
    setMemberNutri(mn);
    setAmount(mem.reduce((s,m)=>s+(parseFloat(m.monthly_price)||0),0));
    setStep(2);
  };
  const applyMonths = (m) => {
    setMonths(m);
    if (tType==='client' && client) {
      setTrainings(weekOf(client)*4*m); setNutrition((client.nutrition_meetings_per_month||0)*m);
      setAmount((parseFloat(client.monthly_price)||0)*m);
    } else if (group) {
      setTrainings((members[0]?weekOf(members[0]):0)*4*m);
      const mn={}; nutriMembers.forEach(x=>mn[x.id]=(x.nutrition_meetings_per_month||0)*m); setMemberNutri(mn);
      setAmount(members.reduce((s,x)=>s+(parseFloat(x.monthly_price)||0),0)*m);
    }
  };

  const monthWord = months===1?'μήνας':'μήνες';
  const confirm = async () => {
    if (saving) return;
    setSaving(true);
    const tN = parseInt(trainings)||0;
    if (tType==='client' && client) {
      const nN = parseInt(nutrition)||0;
      const pay = await db.Payment.create({
        client_id: client.id, client_name: client.name, amount: parseFloat(amount)||0, currency:'EUR',
        description:`Πακέτο ${months} ${monthWord} — ${tN} προπ.${nN?` + ${nN} διατρ.`:''}`,
        paid_date: payDate, method, months, item_trainings:tN, item_nutrition:nN, item_type:'package',
      });
      if (tN>0) await addCredit(client.id,'training', tN,'purchase', pay.id, `${months} ${monthWord} πακέτου`);
      if (nN>0) await addCredit(client.id,'nutrition', nN,'purchase', pay.id, `${months} ${monthWord} πακέτου`);
      await db.Message.create({ thread_id: client.id, thread_type:'client', client_id: client.id, client_name: client.name, sender:'trainer', read:false,
        content:`🧾 Νέα αγορά πακέτου: ${tN} προπονήσεις${nN>0?` + ${nN} διατροφικές συναντήσεις`:''} (${months} ${monthWord}). Το υπόλοιπό σου ενημερώθηκε — καλή συνέχεια! 💪` });
      const entries = await db.CreditEntry.filter({ client_id: client.id });
      const b = creditBalance(entries);
      setDone({ isGroup:false, training:b.training, nutrition:b.nutrition, showNutri:(client.nutrition_meetings_per_month>0||b.nutrition!==0) });
    } else if (group) {
      const totalNutri = Object.values(memberNutri).reduce((a,v)=>a+(parseInt(v)||0),0);
      const gname = groupDisplayName(group, allClients);
      const pay = await db.Payment.create({
        group_id: group.id, client_id:'', client_name: gname, amount: parseFloat(amount)||0, currency:'EUR',
        description:`Group πακέτο ${months} ${monthWord} — ${tN} κοιν. προπ.${totalNutri?` + ${totalNutri} διατρ.`:''}`,
        paid_date: payDate, method, months, item_trainings:tN, item_nutrition:totalNutri, item_type:'group_package',
      });
      if (tN>0) await addGroupCredit(group.id, tN, 'purchase', pay.id, `${months} ${monthWord} group πακέτου`);
      for (const m of nutriMembers) { const c=parseInt(memberNutri[m.id])||0; if (c>0) await addCredit(m.id,'nutrition', c,'purchase', pay.id, `${months} ${monthWord} (group)`); }
      for (const m of members) {
        await db.Message.create({ thread_id: m.id, thread_type:'client', client_id: m.id, client_name: m.name, sender:'trainer', read:false,
          content:`🧾 Νέα αγορά group πακέτου: ${tN} κοινές προπονήσεις${(parseInt(memberNutri[m.id])||0)>0?` + ${memberNutri[m.id]} δικές σου διατροφικές`:''} (${months} ${monthWord}). 💪` });
      }
      await db.Message.create({ thread_id: group.id, thread_type:'group', client_id:'', client_name: gname, sender:'trainer', read:false,
        content:`🧾 Το group απέκτησε ${tN} κοινές προπονήσεις (${months} ${monthWord}). Καλή συνέχεια! 💪` });
      const gbal = await getGroupTrainingBalance(group);
      const nm = await Promise.all(nutriMembers.map(async m=>({ name:firstName(m.name), n:(await getBalance(m.id)).nutrition })));
      setDone({ isGroup:true, training:gbal, nutriMembers:nm });
    }
    setSaving(false);
    onSaved();
  };

  const inp = "w-full border border-border bg-card rounded-xl px-3 py-2.5 text-sm";
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e=>e.stopPropagation()}>
        {done ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-500 flex items-center justify-center"><Check className="w-6 h-6 text-white"/></div>
            <p className="font-bold text-foreground text-lg mb-1">Καταχωρήθηκε!</p>
            <p className="text-sm text-muted-foreground mb-1">Το ποσό εισπράχθηκε και το υπόλοιπο «φορτίστηκε».</p>
            {done.isGroup ? (
              <>
                <p className="text-sm font-semibold text-foreground mb-1">Νέο υπόλοιπο group: 🏋️ {done.training} κοινές προπονήσεις</p>
                {done.nutriMembers?.length>0 && <p className="text-sm text-foreground mb-1">{done.nutriMembers.map(x=>`🥗 ${x.name}: ${x.n}`).join('  ·  ')}</p>}
                <p className="text-xs text-muted-foreground mb-5">Στάλθηκε ειδοποίηση στα μέλη του group.</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-foreground mb-1">Νέο υπόλοιπο: 🏋️ {done.training} προπονήσεις{done.showNutri?` · 🥗 ${done.nutrition} διατροφικές`:''}</p>
                <p className="text-xs text-muted-foreground mb-5">Στάλθηκε ειδοποίηση στην εφαρμογή του πελάτη.</p>
              </>
            )}
            <button onClick={onClose} className="btn btn-primary w-full">Κλείσιμο</button>
          </div>
        ) : (
        <>
          <div className="flex items-center justify-between mb-5">
            <p className="font-bold text-foreground">Log Payment</p>
            <div className="flex items-center gap-1.5">
              {[1,2,3].map(n=>(<span key={n} className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center ${step>=n?'bg-primary text-primary-foreground':'bg-muted text-muted-foreground'}`}>{n}</span>))}
              <button onClick={onClose} className="ml-2 p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4 text-muted-foreground"/></button>
            </div>
          </div>

          {step===1 && (
            <div>
              <p className="text-sm text-muted-foreground mb-3">Βήμα 1 — Για ποιον;</p>
              <div className="space-y-2 max-h-[54vh] overflow-y-auto pr-1">
                {individuals.map(c=>(
                  <button key={c.id} onClick={()=>pickClient(c)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted text-left">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0" style={{backgroundColor:c.theme_color||'#6366f1'}}>{c.name?.charAt(0)}</div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-foreground truncate">{c.name}</p><p className="text-xs text-muted-foreground">{weekOf(c)}×/εβδ.{c.nutrition_meetings_per_month?` · ${c.nutrition_meetings_per_month} διατρ./μήνα`:''} · €{c.monthly_price||0}/μήνα</p></div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground"/>
                  </button>
                ))}
                {groups.length>0 && <p className="text-xs font-semibold text-muted-foreground uppercase pt-2 pb-1">Groups</p>}
                {groups.map(g=>{
                  const mem=(g.member_ids||[]).map(id=>allClients.find(c=>c.id===id)).filter(Boolean);
                  return (
                    <button key={g.id} onClick={()=>pickGroup(g)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted text-left">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>👥</div>
                      <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-foreground truncate">{groupDisplayName(g, allClients)}</p><p className="text-xs text-muted-foreground">{mem.length}/{GROUP_CAP} μέλη · κοινές προπονήσεις</p></div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground"/>
                    </button>
                  );
                })}
                {individuals.length===0 && groups.length===0 && <p className="text-sm text-muted-foreground text-center py-4">Κανένας διαθέσιμος.</p>}
              </div>
            </div>
          )}

          {step===2 && client && (
            <div>
              <p className="text-sm text-muted-foreground mb-3">Βήμα 2 — Πλάνο του {client.name.split(' ')[0]} & διάρκεια</p>
              <div className="rounded-xl border border-border p-3 mb-4 text-sm text-muted-foreground">
                Πλάνο: <b className="text-foreground">{weekOf(client)} προπ./εβδ.</b>{client.nutrition_meetings_per_month?<> · <b className="text-foreground">{client.nutrition_meetings_per_month} διατρ./μήνα</b></>:null} · <b className="text-foreground">€{client.monthly_price||0}/μήνα</b>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Μήνες</p>
              <div className="grid grid-cols-6 gap-1.5 mb-4">
                {Array.from({length:12},(_,i)=>i+1).map(m=>(<button key={m} onClick={()=>applyMonths(m)} className={`py-2 rounded-lg text-sm font-bold border ${months===m?'bg-primary text-primary-foreground border-primary':'border-border hover:bg-muted text-foreground'}`}>{m}</button>))}
              </div>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div><label className="text-xs font-medium text-muted-foreground">🏋️ Προπονήσεις</label><input type="number" className={inp+" mt-1"} value={trainings} onChange={e=>setTrainings(e.target.value)}/></div>
                <div><label className="text-xs font-medium text-muted-foreground">🥗 Διατροφές</label><input type="number" className={inp+" mt-1"} value={nutrition} onChange={e=>setNutrition(e.target.value)}/></div>
                <div><label className="text-xs font-medium text-muted-foreground">€ Σύνολο</label><input type="number" step="0.5" className={inp+" mt-1"} value={amount} onChange={e=>setAmount(e.target.value)}/></div>
              </div>
              <div className="flex gap-2"><button onClick={()=>setStep(1)} className="btn btn-secondary flex-1">Πίσω</button><button onClick={()=>setStep(3)} className="btn btn-primary flex-1">Συνέχεια</button></div>
            </div>
          )}

          {step===2 && group && (
            <div>
              <p className="text-sm text-muted-foreground mb-3">Βήμα 2 — Group «{groupDisplayName(group, allClients)}» & διάρκεια</p>
              <div className="rounded-xl border border-border p-3 mb-4 text-sm text-muted-foreground">
                <b className="text-foreground">{members[0]?weekOf(members[0]):0} κοινές προπ./εβδ.</b> · μέλη: <b className="text-foreground">{members.map(m=>firstName(m.name)).join(', ')}</b> · <b className="text-foreground">€{members.reduce((s,m)=>s+(parseFloat(m.monthly_price)||0),0)}/μήνα</b>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3">Οι προπονήσεις είναι κοινές για το group· οι διατροφές χρεώνονται ξεχωριστά σε κάθε μέλος.</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Μήνες</p>
              <div className="grid grid-cols-6 gap-1.5 mb-4">
                {Array.from({length:12},(_,i)=>i+1).map(m=>(<button key={m} onClick={()=>applyMonths(m)} className={`py-2 rounded-lg text-sm font-bold border ${months===m?'bg-primary text-primary-foreground border-primary':'border-border hover:bg-muted text-foreground'}`}>{m}</button>))}
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div><label className="text-xs font-medium text-muted-foreground">🏋️ Κοινές προπονήσεις</label><input type="number" className={inp+" mt-1"} value={trainings} onChange={e=>setTrainings(e.target.value)}/></div>
                <div><label className="text-xs font-medium text-muted-foreground">€ Σύνολο</label><input type="number" step="0.5" className={inp+" mt-1"} value={amount} onChange={e=>setAmount(e.target.value)}/></div>
              </div>
              {nutriMembers.length>0 && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">🥗 Διατροφές ανά άτομο</p>
                  <div className="grid grid-cols-2 gap-3">
                    {nutriMembers.map(m=>(
                      <div key={m.id}><label className="text-xs font-medium text-muted-foreground">{firstName(m.name)}</label><input type="number" className={inp+" mt-1"} value={memberNutri[m.id]??0} onChange={e=>setMemberNutri(mn=>({...mn,[m.id]:e.target.value}))}/></div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2"><button onClick={()=>setStep(1)} className="btn btn-secondary flex-1">Πίσω</button><button onClick={()=>setStep(3)} className="btn btn-primary flex-1">Συνέχεια</button></div>
            </div>
          )}

          {step===3 && (client || group) && (
            <div>
              <p className="text-sm text-muted-foreground mb-3">Βήμα 3 — Εξόφληση</p>
              <div className="rounded-xl border border-border p-4 mb-4">
                <p className="text-sm font-semibold text-foreground mb-2">Σύνοψη</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex justify-between"><span>{group?'Group':'Πελάτης'}</span><b className="text-foreground">{group?groupDisplayName(group, allClients):client.name}</b></div>
                  <div className="flex justify-between"><span>Πακέτο</span><b className="text-foreground">{months} {monthWord}</b></div>
                  <div className="flex justify-between"><span>{group?'Κοινές προπονήσεις':'Προπονήσεις'}</span><b className="text-foreground">{trainings}</b></div>
                  {group
                    ? nutriMembers.map(m=>((parseInt(memberNutri[m.id])||0)>0 && <div key={m.id} className="flex justify-between"><span>🥗 {firstName(m.name)}</span><b className="text-foreground">{memberNutri[m.id]}</b></div>))
                    : (parseInt(nutrition)>0 && <div className="flex justify-between"><span>Διατροφικές</span><b className="text-foreground">{nutrition}</b></div>)}
                  <div className="flex justify-between pt-2 border-t border-border mt-2"><span>Σύνολο</span><b className="text-foreground text-base">€{amount}</b></div>
                </div>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Τρόπος πληρωμής</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[['cash','💵 Μετρητά'],['card','💳 Κάρτα'],['transfer','🏦 Κατάθεση']].map(([k,l])=>(<button key={k} onClick={()=>setMethod(k)} className={`py-2.5 rounded-xl text-sm font-semibold border ${method===k?'bg-primary text-primary-foreground border-primary':'border-border hover:bg-muted text-foreground'}`}>{l}</button>))}
              </div>
              <div className="mb-5"><label className="text-xs font-medium text-muted-foreground">Ημερομηνία</label><input type="date" className={inp+" mt-1"} value={payDate} onChange={e=>setPayDate(e.target.value)}/></div>
              <div className="flex gap-2"><button onClick={()=>setStep(2)} className="btn btn-secondary flex-1">Πίσω</button><button onClick={confirm} disabled={saving} className="btn btn-primary flex-1">{saving?'Καταχώρηση…':'Επιβεβαίωση'}</button></div>
            </div>
          )}
        </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════ Group ledger — κοινές προπονήσεις + διατροφές ανά μέλος ═══════════════ */

function GroupLedgerModal({ group, allClients, onClose, onChanged }) {
  const [tEntries, setTEntries] = useState([]);            // training (group + members)
  const [memEntries, setMemEntries] = useState({});        // {memberId: nutrition entries}
  const [adjT, setAdjT] = useState('');
  const [adjN, setAdjN] = useState({});                    // {memberId: value}
  const members = (group.member_ids||[]).map(id=>allClients.find(c=>c.id===id)).filter(Boolean);
  const nutriMembers = members.filter(m=>m.services==='group_training_nutrition' || m.nutrition_meetings_per_month>0);

  const load = async () => {
    const parts = await Promise.all([ db.CreditEntry.filter({ group_id: group.id }), ...members.map(m=>db.CreditEntry.filter({ client_id: m.id })) ]);
    const sortD = (a,b)=>((b.date||'')+(b.id||'')).localeCompare((a.date||'')+(a.id||''));
    setTEntries(parts.flat().filter(e=>e.kind!=='nutrition').sort(sortD));
    const me={}; members.forEach((m,i)=>{ me[m.id]=(parts[i+1]||[]).filter(e=>e.kind==='nutrition').sort(sortD); });
    setMemEntries(me);
  };
  useEffect(()=>{ load(); },[group.id]);

  const tBal = tEntries.reduce((a,e)=>a+(Number(e.delta)||0),0);
  const undo = async (e) => { await db.CreditEntry.delete(e.id); await load(); onChanged(); };
  const adjustT = async () => { const d=parseInt(adjT); if(!d) return; await addGroupCredit(group.id, d, 'adjust', null, 'χειροκίνητη'); setAdjT(''); await load(); onChanged(); };
  const adjustN = async (m) => { const d=parseInt(adjN[m.id]); if(!d) return; await addCredit(m.id,'nutrition', d,'adjust', null,'χειροκίνητη'); setAdjN(x=>({...x,[m.id]:''})); await load(); onChanged(); };
  const nBal = (id) => (memEntries[id]||[]).reduce((a,e)=>a+(Number(e.delta)||0),0);

  const Row = ({ e }) => (
    <div className="flex items-center gap-2.5 py-2 border-t border-border/60 text-sm">
      <span>{e.kind==='nutrition'?'🥗':'🏋️'}</span>
      <div className="flex-1 min-w-0"><p className="text-foreground font-medium truncate">{REASON_LABELS[e.reason]||e.reason}{e.note?` — ${e.note}`:''}</p><p className="text-xs text-muted-foreground">{e.date}</p></div>
      <span className={`font-bold ${((e.delta||0)>=0)?'text-green-600':'text-rose-600'}`}>{(e.delta||0)>0?`+${e.delta}`:e.delta}</span>
      {(e.delta||0)<0 && e.reason!=='purchase' && <button onClick={()=>undo(e)} title="Αναίρεση" className="p-1.5 rounded-lg hover:bg-muted"><Undo2 className="w-4 h-4 text-muted-foreground"/></button>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>👥</div>
          <div className="flex-1 min-w-0"><p className="font-bold text-foreground truncate">{groupDisplayName(group, allClients)}</p><p className="text-xs text-muted-foreground">Κοινές προπονήσεις: 🏋️ <b className="text-foreground">{tBal}</b>{nutriMembers.map(m=><span key={m.id}> · 🥗 {firstName(m.name)} <b className="text-foreground">{nBal(m.id)}</b></span>)}</p></div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4 text-muted-foreground"/></button>
        </div>

        {/* κοινές προπονήσεις */}
        <div className="rounded-xl border border-border p-3 mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">🏋️ Κοινές προπονήσεις — προσαρμογή</p>
          <div className="flex gap-2">
            <input type="number" placeholder="±" className="w-20 border border-border bg-card rounded-xl px-2 py-2 text-sm" value={adjT} onChange={e=>setAdjT(e.target.value)}/>
            <button onClick={adjustT} className="btn btn-primary px-3 py-2 text-sm">OK</button>
          </div>
        </div>
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Ιστορικό προπονήσεων</p>
        {tEntries.length===0 && <p className="text-sm text-muted-foreground mb-2">Καμία κίνηση ακόμα.</p>}
        <div className="mb-4">{tEntries.map(e=><Row key={e.id} e={e}/>)}</div>

        {/* διατροφές ανά μέλος */}
        {nutriMembers.map(m=>(
          <div key={m.id} className="mb-4 rounded-xl border border-border p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{backgroundColor:m.theme_color||'#6366f1'}}>{m.name?.charAt(0)}</div>
              <p className="text-sm font-semibold text-foreground flex-1 truncate">🥗 {m.name}</p>
              <span className="text-xs font-bold text-foreground">Υπόλοιπο: {nBal(m.id)}</span>
            </div>
            <div className="flex gap-2 mb-2">
              <input type="number" placeholder="±" className="w-20 border border-border bg-card rounded-xl px-2 py-2 text-sm" value={adjN[m.id]||''} onChange={e=>setAdjN(x=>({...x,[m.id]:e.target.value}))}/>
              <button onClick={()=>adjustN(m)} className="btn btn-secondary px-3 py-2 text-sm">Προσαρμογή</button>
            </div>
            {(memEntries[m.id]||[]).map(e=><Row key={e.id} e={e}/>)}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ Ledger πελάτη — χρεώσεις, αναίρεση, προσαρμογή ═══════════════ */

function ClientLedgerModal({ client, onClose, onChanged }) {
  const [entries, setEntries] = useState([]);
  const [adjKind, setAdjKind] = useState('training');
  const [adjDelta, setAdjDelta] = useState('');
  const [adjNote, setAdjNote] = useState('');
  const [showPlan, setShowPlan] = useState(false);

  const load = async () => {
    const e = await db.CreditEntry.filter({ client_id: client.id });
    setEntries([...e].sort((a,b)=>((b.date||'')+(b.id||'')).localeCompare((a.date||'')+(a.id||''))));
  };
  useEffect(()=>{ load(); },[client.id]);

  const bal = creditBalance(entries);
  const undo = async (e) => { await db.CreditEntry.delete(e.id); await load(); onChanged(); };
  const adjust = async () => {
    const d = parseInt(adjDelta);
    if (!d) return;
    await addCredit(client.id, adjKind, d, 'adjust', null, adjNote);
    setAdjDelta(''); setAdjNote('');
    await load(); onChanged();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0" style={{backgroundColor:client.theme_color||'#6366f1'}}>{client.name?.charAt(0)}</div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground truncate">{client.name}</p>
            <p className="text-xs text-muted-foreground">Υπόλοιπο: 🏋️ <b className="text-foreground">{bal.training}</b>{(client.nutrition_meetings_per_month>0||bal.nutrition!==0)?<> · 🥗 <b className="text-foreground">{bal.nutrition}</b></>:null}</p>
          </div>
          <button onClick={()=>setShowPlan(true)} className="btn btn-secondary text-xs px-3 py-2">📦 Πλάνο</button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4 text-muted-foreground"/></button>
        </div>

        <div className="rounded-xl border border-border p-3 mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Χειροκίνητη προσαρμογή υπολοίπου</p>
          <div className="flex gap-2">
            <select value={adjKind} onChange={e=>setAdjKind(e.target.value)} className="border border-border bg-card rounded-xl px-2 py-2 text-sm">
              <option value="training">🏋️ Προπονήσεις</option>
              <option value="nutrition">🥗 Διατροφές</option>
            </select>
            <input type="number" placeholder="±" className="w-20 border border-border bg-card rounded-xl px-2 py-2 text-sm" value={adjDelta} onChange={e=>setAdjDelta(e.target.value)}/>
            <input placeholder="Σημείωση (προαιρετικό)" className="flex-1 border border-border bg-card rounded-xl px-2 py-2 text-sm" value={adjNote} onChange={e=>setAdjNote(e.target.value)}/>
            <button onClick={adjust} className="btn btn-primary px-3 py-2 text-sm">OK</button>
          </div>
        </div>

        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Ιστορικό χρεώσεων & αγορών</p>
        {entries.length===0 && <p className="text-sm text-muted-foreground">Καμία κίνηση ακόμα.</p>}
        <div className="space-y-1">
          {entries.map(e=>(
            <div key={e.id} className="flex items-center gap-2.5 py-2 border-t border-border/60 text-sm">
              <span>{e.kind==='nutrition'?'🥗':'🏋️'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-medium truncate">{REASON_LABELS[e.reason]||e.reason}{e.note?` — ${e.note}`:''}</p>
                <p className="text-xs text-muted-foreground">{e.date}</p>
              </div>
              <span className={`font-bold ${((e.delta||0)>=0)?'text-green-600':'text-rose-600'}`}>{(e.delta||0)>0?`+${e.delta}`:e.delta}</span>
              {(e.delta||0)<0 && e.reason!=='purchase' && (
                <button onClick={()=>undo(e)} title="Αναίρεση χρέωσης" className="p-1.5 rounded-lg hover:bg-muted"><Undo2 className="w-4 h-4 text-muted-foreground"/></button>
              )}
            </div>
          ))}
        </div>

        {showPlan && <ClientPlanModal client={client} onClose={()=>setShowPlan(false)} onSaved={()=>{ setShowPlan(false); onChanged(); }}/>}
      </div>
    </div>
  );
}

/* ═══════════════ Κύρια σελίδα ═══════════════ */

export default function Logistics() {
  const location = useLocation();
  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [entries, setEntries] = useState([]);
  const [tab, setTab] = useState('overview');
  const [showWizard, setShowWizard] = useState(false);
  const [editPayment, setEditPayment] = useState(null);
  const [ledgerClient, setLedgerClient] = useState(null);
  const [groups, setGroups] = useState([]);
  const [ledgerGroup, setLedgerGroup] = useState(null);

  const load = async () => {
    const [c,p,e,g] = await Promise.all([
      db.Client.list('name'),
      db.Payment.list('-paid_date', 500),
      db.CreditEntry.list('-date', 2000),
      db.Group.list('name'),
    ]);
    setClients(c); setPayments(p); setEntries(e); setGroups(g);
  };
  useEffect(()=>{ load(); },[]);
  useEffect(()=>{ if (location.state?.openLogPay) { setShowWizard(true); window.history.replaceState({},''); } },[location.state]);

  const active = clients.filter(c=>!c.frozen);
  const weekOf = (c) => c.sessions_per_week || (c.sessions_per_month ? c.sessions_per_month/4 : 0);
  const theoIncome = active.reduce((s,c)=>s+(parseFloat(c.monthly_price)||0),0);
  const theoHours = active.reduce((s,c)=>{
    const t = weekOf(c) * (parseFloat(c.session_duration_hours)||1);
    const n = ((c.nutrition_meetings_per_month||0) * (40/60)) / 4.3;
    return s + t + n;
  },0);
  const balOf = (id) => creditBalance(entries.filter(e=>e.client_id===id));

  const now = new Date();
  const thisMonthKey = format(now,'yyyy-MM');
  const monthRev = payments.filter(p=>p.paid_date?.startsWith(thisMonthKey)).reduce((s,p)=>s+(p.amount||0),0);
  const methodSplit = payments.reduce((acc,p)=>{ const k=p.method||'other'; acc[k]=(acc[k]||0)+(p.amount||0); return acc; },{});

  const chip = (n) => n<=0 ? 'bg-rose-50 text-rose-600 border border-rose-100' : n<=3 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-green-50 text-green-700 border border-green-100';

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-7 flex-wrap gap-3">
        <div>
          <h1 className="page-title">Λογιστικά</h1>
          <p className="page-subtitle">Πακέτα «με το κομμάτι» — υπόλοιπα, συναλλαγές, στατιστικά</p>
        </div>
        <button onClick={()=>setShowWizard(true)} className="btn btn-primary"><Plus className="w-4 h-4"/> Log Payment</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-7">
        {[
          { icon:'💶', label:'Θεωρητικό μηνιαίο εισόδημα', value:`€${Math.round(theoIncome).toLocaleString()}`, sub:`${active.length} ενεργά πλάνα` },
          { icon:'👥', label:'Ενεργοί πελάτες', value:active.length, sub:`${clients.length-active.length} ανενεργοί (freeze)` },
          { icon:'⏱️', label:'Θεωρητικές ώρες / εβδομάδα', value:`${theoHours.toFixed(1)}h`, sub:'προπονήσεις + διατροφικές' },
        ].map(k=>(
          <div key={k.label} className="stat-card">
            <span className="text-xl">{k.icon}</span>
            <p className="stat-card-value">{k.value}</p>
            <p className="stat-card-label mt-0.5">{k.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-bar w-fit mb-6">
        {[['overview','Υπόλοιπα πελατών'],['transactions','Συναλλαγές'],['stats','Στατιστικά']].map(([key,lbl])=>(
          <button key={key} onClick={()=>setTab(key)} className={`tab-btn px-5 ${tab===key?'active':''}`}>{lbl}</button>
        ))}
      </div>

      {/* ── ΥΠΟΛΟΙΠΑ ── */}
      {tab==='overview' && (() => {
        const indiv = [...clients.filter(c=>!c.frozen && isIndividual(c)), ...clients.filter(c=>c.frozen && isIndividual(c))];
        const gWithMembers = groups.filter(g=>(g.member_ids||[]).length>0);
        return (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Individuals</p>
              <div className="card divide-y divide-border/60">
                {indiv.length===0 && <p className="p-6 text-sm text-muted-foreground">Κανένας ατομικός πελάτης.</p>}
                {indiv.map(c=>{
                  const b = balOf(c.id);
                  const hasNutri = c.nutrition_meetings_per_month>0 || b.nutrition!==0;
                  return (
                    <button key={c.id} onClick={()=>setLedgerClient(c)} className={`w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 ${c.frozen?'opacity-55':''}`}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0" style={{backgroundColor:c.theme_color||'#6366f1'}}>{c.name?.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{c.name}{c.frozen?' ❄️':''}</p>
                        <p className="text-xs text-muted-foreground">{weekOf(c)?`${weekOf(c)}×/εβδ.`:'—'}{c.nutrition_meetings_per_month?` · ${c.nutrition_meetings_per_month} διατρ./μήνα`:''} · €{c.monthly_price||0}/μήνα</p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1.5 rounded-full ${chip(b.training)}`}>🏋️ {b.training}</span>
                      {hasNutri && <span className={`text-xs font-bold px-2.5 py-1.5 rounded-full ${chip(b.nutrition)}`}>🥗 {b.nutrition}</span>}
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0"/>
                    </button>
                  );
                })}
              </div>
            </div>

            {gWithMembers.length>0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Groups</p>
                <div className="card divide-y divide-border/60">
                  {gWithMembers.map(g=>{
                    const members = (g.member_ids||[]).map(id=>clients.find(c=>c.id===id)).filter(Boolean);
                    const tb = groupTrainingBalance(entries, g);
                    const nutriMembers = members.filter(m=>m.services==='group_training_nutrition' || m.nutrition_meetings_per_month>0);
                    return (
                      <button key={g.id} onClick={()=>setLedgerGroup(g)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>👥</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{groupDisplayName(g, clients)}</p>
                          <p className="text-xs text-muted-foreground">{members.map(m=>firstName(m.name)).join(' & ')} · κοινές προπονήσεις</p>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1.5 rounded-full ${chip(tb)}`}>🏋️ {tb}</span>
                        {nutriMembers.map(m=>{ const nb=balOf(m.id).nutrition; return <span key={m.id} className={`text-xs font-bold px-2.5 py-1.5 rounded-full ${chip(nb)}`}>🥗 {firstName(m.name)} {nb}</span>; })}
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0"/>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── ΣΥΝΑΛΛΑΓΕΣ ── */}
      {tab==='transactions' && (
        <div className="card divide-y divide-border/60">
          {payments.length===0 && <p className="p-6 text-sm text-muted-foreground">Καμία συναλλαγή ακόμα.</p>}
          {payments.map(p=>(
            <div key={p.id} className="flex items-center gap-3 p-4">
              <span className="text-xl">{METHOD_EMOJI[p.method]||'📄'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{p.client_name}</p>
                <p className="text-xs text-muted-foreground truncate">{p.paid_date} · {p.description||'Πληρωμή'}</p>
              </div>
              <p className="font-bold text-foreground">€{p.amount}</p>
              <button onClick={()=>setEditPayment(p)} className="p-2 rounded-lg hover:bg-muted"><Edit3 className="w-4 h-4 text-muted-foreground"/></button>
              <button onClick={async()=>{ const rel = entries.filter(e=>e.ref_id===p.id); for (const e of rel) await db.CreditEntry.delete(e.id); await db.Payment.delete(p.id); load(); }} className="p-2 rounded-lg hover:bg-muted" title="Διαγραφή (αφαιρεί και τις πιστώσεις της)"><Trash2 className="w-4 h-4 text-muted-foreground"/></button>
            </div>
          ))}
        </div>
      )}

      {/* ── ΣΤΑΤΙΣΤΙΚΑ ── */}
      {tab==='stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card p-5">
            <p className="font-semibold text-foreground mb-4">Έσοδα — τελευταίοι 6 μήνες</p>
            <RevenueChart payments={payments}/>
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Αυτόν τον μήνα</span>
              <span className="font-bold text-foreground">€{Math.round(monthRev).toLocaleString()}</span>
            </div>
          </div>
          <div className="card p-5">
            <p className="font-semibold text-foreground mb-4">Ανά τρόπο πληρωμής</p>
            <div className="space-y-3">
              {Object.entries(methodSplit).map(([k,v])=>(
                <div key={k} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{METHOD_EMOJI[k]||'📄'} {k==='cash'?'Μετρητά':k==='card'?'Κάρτα':k==='transfer'?'Κατάθεση':'Άλλο'}</span>
                  <span className="font-bold text-foreground">€{Math.round(v).toLocaleString()}</span>
                </div>
              ))}
              {!payments.length && <p className="text-sm text-muted-foreground">—</p>}
              <div className="pt-3 border-t border-border flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Σύνολο εσόδων</span>
                <span className="font-bold text-foreground">€{Math.round(payments.reduce((s,p)=>s+(p.amount||0),0)).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showWizard && <LogPayWizard individuals={active.filter(isIndividual)} groups={groups.filter(g=>(g.member_ids||[]).length>0)} allClients={clients} onClose={()=>setShowWizard(false)} onSaved={load}/>}
      {editPayment && <PaymentModal clients={clients} payment={editPayment} onClose={()=>setEditPayment(null)} onSaved={()=>{ setEditPayment(null); load(); }}/>}
      {ledgerClient && <ClientLedgerModal client={ledgerClient} onClose={()=>setLedgerClient(null)} onChanged={load}/>}
      {ledgerGroup && <GroupLedgerModal group={ledgerGroup} allClients={clients} onClose={()=>setLedgerGroup(null)} onChanged={load}/>}
    </div>
  );
}
