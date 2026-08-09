import { useState, useEffect } from 'react';
import { format, parseISO, differenceInDays, addMonths, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { Plus, Trash2, X, Euro, Edit3, Settings, TrendingUp, Calendar, AlertTriangle, ChevronRight, Check, CreditCard, Users, BarChart2, Loader2 } from 'lucide-react';
import { db } from '../lib/db';

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
export default function Logistics() {
  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tab, setTab] = useState('overview');
  const [showPayment, setShowPayment] = useState(false);
  const [editPayment, setEditPayment] = useState(null);
  const [editPlan, setEditPlan] = useState(null);
  const [filterClient, setFilterClient] = useState('');

  const load = async () => {
    const [c,p] = await Promise.all([db.Client.list('name'), db.Payment.list('-paid_date', 500)]);
    setClients(c); setPayments(p);
  };
  useEffect(() => { load(); }, []);

  const now = new Date();
  const thisMonthKey = format(now, 'yyyy-MM');
  const monthRev = payments.filter(p=>p.paid_date?.startsWith(thisMonthKey)).reduce((s,p)=>s+(p.amount||0),0);
  const totalRev = payments.reduce((s,p)=>s+(p.amount||0),0);
  const pendingClients = clients.filter(c => {
    const cp = payments.filter(p=>p.client_id===c.id&&p.period_to).sort((a,b)=>b.period_to.localeCompare(a.period_to));
    if (!cp.length) return false;
    const dl = differenceInDays(parseISO(cp[0].period_to), now);
    return dl >= 0 && dl <= 7;
  });
  const expiredClients = clients.filter(c => {
    const cp = payments.filter(p=>p.client_id===c.id&&p.period_to).sort((a,b)=>b.period_to.localeCompare(a.period_to));
    if (!cp.length) return true;
    return differenceInDays(parseISO(cp[0].period_to), now) < 0;
  });

  const getSub = (client) => {
    const cp = payments.filter(p=>p.client_id===client.id&&p.period_to).sort((a,b)=>b.period_to.localeCompare(a.period_to));
    if (!cp.length) return null;
    return { daysLeft: differenceInDays(parseISO(cp[0].period_to), now), periodTo: cp[0].period_to };
  };

  const filteredPayments = filterClient ? payments.filter(p=>p.client_id===filterClient) : payments;

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="page-title">Logistics & Finance</h1>
          <p className="page-subtitle">Revenue tracking, payments and client subscriptions</p>
        </div>
        <button onClick={()=>setShowPayment(true)} className="btn btn-primary">
          <Plus className="w-4 h-4"/> Log Payment
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 stagger">
        {[
          { label:'This Month', value:`€${Math.round(monthRev).toLocaleString()}`, sub:`${payments.filter(p=>p.paid_date?.startsWith(thisMonthKey)).length} transactions`, icon:'💰', color:'text-green-600' },
          { label:'Total Revenue', value:`€${Math.round(totalRev).toLocaleString()}`, sub:`${payments.length} all time`, icon:'📈', color:'text-blue-600' },
          { label:'Active Clients', value:clients.length, sub:`${expiredClients.length} expired`, icon:'👥', color:'text-indigo-600' },
          { label:'Expiring Soon', value:pendingClients.length, sub:'within 7 days', icon:'⚠️', color: pendingClients.length>0?'text-amber-600':'text-gray-400' },
        ].map(s=>(
          <div key={s.label} className="stat-card animate-slide-up">
            <span className="text-xl">{s.icon}</span>
            <p className={`stat-card-value ${s.color}`}>{s.value}</p>
            <p className="stat-card-label mt-0.5">{s.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-bar w-fit mb-6">
        {[['overview','Overview'],['transactions','Transactions'],['clients','Client Plans'],].map(([key,lbl])=>(
          <button key={key} onClick={()=>setTab(key)} className={`tab-btn px-5 ${tab===key?'active':''}`}>{lbl}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab==='overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Revenue chart */}
            <div className="card p-5">
              <p className="font-semibold text-foreground mb-4" style={{fontFamily:'var(--font-display)'}}>Revenue — Last 6 months</p>
              <RevenueChart payments={payments}/>
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Average / month</span>
                <span className="font-bold text-foreground">€{Math.round(totalRev / Math.max(1, 6))}</span>
              </div>
            </div>
            {/* Revenue by client */}
            <div className="card p-5">
              <p className="font-semibold text-foreground mb-4" style={{fontFamily:'var(--font-display)'}}>Revenue by Client</p>
              <div className="space-y-3">
                {clients.map(c=>{
                  const total = payments.filter(p=>p.client_id===c.id).reduce((s,p)=>s+(p.amount||0),0);
                  const maxRev = Math.max(...clients.map(cl=>payments.filter(p=>p.client_id===cl.id).reduce((s,p)=>s+(p.amount||0),0)),1);
                  return (
                    <div key={c.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor:c.theme_color||'#6366f1'}}/><span className="text-sm text-foreground">{c.name}</span></div>
                        <span className="text-sm font-semibold text-foreground">€{total.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{width:`${(total/maxRev)*100}%`, backgroundColor:c.theme_color||'#6366f1'}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Alerts */}
          {(pendingClients.length > 0 || expiredClients.length > 0) && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500"/><h3 className="font-semibold text-foreground text-sm">Attention Required</h3>
              </div>
              <div className="divide-y divide-border">
                {pendingClients.map(c=>{
                  const sub=getSub(c);
                  return (
                    <div key={c.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{backgroundColor:c.theme_color||'#6366f1'}}>{c.name?.charAt(0)}</div>
                      <div className="flex-1"><p className="text-sm font-medium text-foreground">{c.name}</p><p className="text-xs text-muted-foreground">Expires {format(parseISO(sub.periodTo),'MMM d, yyyy')}</p></div>
                      <span className="badge badge-amber">⚠️ {sub.daysLeft}d left</span>
                      <button onClick={()=>setShowPayment(true)} className="btn btn-sm btn-primary">Renew</button>
                    </div>
                  );
                })}
                {expiredClients.slice(0,3).map(c=>(
                  <div key={c.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold opacity-50" style={{backgroundColor:c.theme_color||'#6366f1'}}>{c.name?.charAt(0)}</div>
                    <div className="flex-1"><p className="text-sm font-medium text-muted-foreground">{c.name}</p><p className="text-xs text-muted-foreground">No active plan</p></div>
                    <span className="badge badge-red">Expired</span>
                    <button onClick={()=>setShowPayment(true)} className="btn btn-sm btn-secondary">Add Plan</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TRANSACTIONS ── */}
      {tab==='transactions' && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground text-sm">All Transactions</h3>
              <span className="badge badge-gray">{filteredPayments.length}</span>
            </div>
            <select value={filterClient} onChange={e=>setFilterClient(e.target.value)} className="border border-border rounded-xl px-3 py-1.5 text-sm bg-background text-foreground outline-none">
              <option value="">All clients</option>
              {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {filteredPayments.length===0
            ? <div className="text-center py-16 text-muted-foreground"><CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30"/><p>No transactions yet</p></div>
            : <div className="divide-y divide-border">
                {filteredPayments.map(p=>(
                  <div key={p.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 group transition-colors">
                    <span className="text-2xl flex-shrink-0">{METHOD_EMOJI[p.method]||'💳'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{p.description||'Payment'}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">{p.client_name}</span>
                        <span className="text-border">·</span>
                        <span className="text-xs text-muted-foreground">{p.paid_date?format(parseISO(p.paid_date),'MMM d, yyyy'):''}</span>
                        {p.period_from&&p.period_to&&<><span className="text-border">·</span><span className="text-xs text-muted-foreground">{format(parseISO(p.period_from),'MMM d')}–{format(parseISO(p.period_to),'MMM d, yyyy')}</span></>}
                      </div>
                    </div>
                    <span className={`badge border ${METHOD_COLOR[p.method]||''} flex-shrink-0`}>{p.method}</span>
                    <span className="font-bold text-foreground text-sm flex-shrink-0">€{p.amount}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={()=>setEditPayment(p)} className="btn-ghost btn-icon btn-sm"><Edit3 className="w-3.5 h-3.5"/></button>
                      <button onClick={async()=>{await db.Payment.delete(p.id);load();}} className="btn-ghost btn-icon btn-sm hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* ── CLIENT PLANS ── */}
      {tab==='clients' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">Client Plans & Subscriptions</h3>
          </div>
          <div className="divide-y divide-border">
            {clients.map(c=>{
              const sub=getSub(c);
              const dl = sub?.daysLeft ?? -999;
              return (
                <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{backgroundColor:c.theme_color||'#6366f1'}}>{c.name?.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.sessions_per_week||'—'}×/wk · {c.session_duration_hours||1}h · {c.services?.replace(/_/g,' ')||'No service set'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-foreground text-sm">{c.monthly_price?`€${c.monthly_price}`:'-'}</p>
                    <p className="text-xs text-muted-foreground">/month</p>
                  </div>
                  <div className="w-28 text-right flex-shrink-0">
                    {sub
                      ? <span className={`badge ${dl<0?'badge-red':dl<=5?'badge-amber':dl<=14?'bg-yellow-50 text-yellow-700':'badge-green'}`}>
                          {dl<0?`Expired ${Math.abs(dl)}d ago`:dl===0?'Today!': `${dl}d left`}
                        </span>
                      : <span className="badge badge-red">No plan</span>
                    }
                  </div>
                  <button onClick={()=>setEditPlan(c)} className="btn btn-sm btn-secondary flex items-center gap-1 flex-shrink-0"><Settings className="w-3 h-3"/>Plan</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(showPayment||editPayment)&&<PaymentModal clients={clients} payment={editPayment} onClose={()=>{setShowPayment(false);setEditPayment(null);}} onSaved={load}/>}
      {editPlan&&<ClientPlanModal client={editPlan} onClose={()=>setEditPlan(null)} onSaved={load}/>}
    </div>
  );
}
