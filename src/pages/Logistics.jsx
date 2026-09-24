import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Ticket, Plus, Pencil, Users2 } from 'lucide-react';
import { db } from '../lib/db';
import { unorphanClients, isGroupService } from '../lib/groups';
import { creditBalance, groupTrainingBalance, addCredit, addGroupCredit } from '../lib/credits';

/* ══ LOGISTICS v3 — SPLIT WALLET ═════════════════════════════════════════
   Δύο κόσμοι, δύο χρώματα:
   🏋️ TOKENS ΠΡΟΠΟΝΗΣΗΣ (ροζ→μωβ) — δομή Training Center: Personal & Groups.
   🥗 TOKENS ΔΙΑΤΡΟΦΗΣ (emerald)   — άτομα με υπηρεσία διατροφής, ανεξάρτητα
   από group/personal. Διαχείριση ανά κάρτα: [+] πακέτο · [✎] προσαρμογή ±. */

const PALETTE = ['#e0457b','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#84cc16'];
const statusOf = (b) => b <= 0 ? 'zero' : b <= 2 ? 'low' : 'ok';
const ST = {
  zero:{ num:'#dc2626', border:'1.5px solid #fca5a5' },
  low: { num:'#d97706', border:'1px solid rgba(14,17,22,.09)' },
  ok:  { num:'#16a34a', border:'1px solid rgba(14,17,22,.09)' },
};
const THEME = {
  train:{ grad:'linear-gradient(135deg,#e0457b,#8b5cf6)', accent:'#8b5cf6', soft:'#f5f3ff', softText:'#7c3aed' },
  nutri:{ grad:'linear-gradient(135deg,#34d399,#059669)', accent:'#059669', soft:'#ecfdf5', softText:'#047857' },
};
const hasNutritionSvc = (c) => c.services === 'nutrition_only' || c.services === 'personal_training_nutrition' || c.services === 'group_training_nutrition';

/* ── [+] unfold: γράφεις αριθμό → προστίθεται στο υπόλοιπο ── */
function AddPanel({ grad, onApply, busy }) {
  const [v, setV] = useState('');
  const go = () => { const n = parseInt(v, 10); if (!n || n <= 0 || busy) return; onApply(n); setV(''); };
  return (
    <div style={{ marginTop:10, borderTop:'1px solid rgba(14,17,22,.08)', paddingTop:10, display:'flex', gap:6 }}>
      <input autoFocus type="number" min="1" value={v} onChange={e=>setV(e.target.value)}
        onKeyDown={e=>{ if (e.key === 'Enter') go(); }} placeholder="Πόσα tokens;"
        style={{ flex:1, minWidth:0, border:'1px solid rgba(14,17,22,.14)', borderRadius:10, padding:'9px 12px',
          fontSize:13.5, fontWeight:700, fontFamily:'inherit', outline:'none', background:'#fff' }}/>
      <button disabled={busy} onClick={go} style={{ border:'none', borderRadius:10, padding:'0 15px', fontSize:12,
        fontWeight:800, cursor:'pointer', color:'#fff', fontFamily:'inherit', background:grad }}>{busy ? '…' : 'Προσθήκη'}</button>
    </div>
  );
}

/* ── [✎] unfold: χειροκίνητη προσαρμογή με +/− ── */
function EditPanel({ grad, balance, onApply, busy }) {
  const [d, setD] = useState(0);
  const stp = { width:40, height:40, borderRadius:10, border:'1px solid rgba(14,17,22,.14)', background:'#fff',
    fontSize:19, fontWeight:800, cursor:'pointer', fontFamily:'inherit', color:'#0e1116', lineHeight:1, flexShrink:0 };
  return (
    <div style={{ marginTop:10, borderTop:'1px solid rgba(14,17,22,.08)', paddingTop:10, display:'flex', alignItems:'center', gap:7 }}>
      <button style={stp} onClick={()=>setD(x=>x-1)}>−</button>
      <div style={{ flex:1, textAlign:'center', minWidth:0 }}>
        <b style={{ fontFamily:'ui-monospace,monospace', fontSize:21, letterSpacing:'-.03em',
          color: d === 0 ? '#a1a1aa' : d > 0 ? '#16a34a' : '#dc2626' }}>{d > 0 ? `+${d}` : d}</b>
        <span style={{ display:'block', fontSize:8.5, letterSpacing:'.12em', fontWeight:800, color:'#a1a1aa' }}>ΝΕΟ ΥΠΟΛΟΙΠΟ: {balance + d}</span>
      </div>
      <button style={stp} onClick={()=>setD(x=>x+1)}>+</button>
      <button disabled={busy || d === 0} onClick={()=>{ if (d) { onApply(d); setD(0); } }}
        style={{ border:'none', borderRadius:10, padding:'0 14px', height:40, fontSize:12, fontWeight:800, cursor:'pointer',
          color:'#fff', fontFamily:'inherit', flexShrink:0, background: d === 0 ? '#c9ccd1' : grad }}>ΟΚ</button>
    </div>
  );
}

/* ── κάρτα-πορτοφόλι (κοινή φιλοσοφία, θέμα ανά στήλη) ── */
function TokenCard({ k, theme, w, open, setOpen, onAdd, onAdjust, busy, nav }) {
  const st = ST[statusOf(w.balance)];
  const pct = w.lastPack > 0 ? Math.max(0, Math.min(100, (w.balance / w.lastPack) * 100)) : 0;
  const mode = open?.k === k ? open.mode : null;
  const toggle = (m) => setOpen(mode === m ? null : { k, mode:m });
  return (
    <div style={{ position:'relative', background: w.isGroup ? 'linear-gradient(135deg,#fdf2f8,#f5f3ff)' : '#fff',
      border:st.border, borderRadius:16, padding:14, overflow:'hidden', display:'flex', flexDirection:'column' }}>
      <span style={{ position:'absolute', inset:'0 0 auto 0', height:4, background:theme.grad }}/>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        {w.isGroup ? (
          <b style={{ fontSize:13.5, cursor:'pointer' }} onClick={()=>nav(`/GroupProfile?id=${w.id}`)}>👥 {w.name}</b>
        ) : (<>
          <span style={{ width:30, height:30, borderRadius:99, display:'grid', placeItems:'center', color:'#fff',
            fontWeight:800, fontSize:12, background:w.color, flexShrink:0 }}>{w.name?.charAt(0)}</span>
          <b style={{ fontSize:13.5, cursor:'pointer', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
            onClick={()=>nav(`/ClientProfile?id=${w.id}`)}>{w.name}</b>
        </>)}
        {statusOf(w.balance) === 'zero' && <span style={{ marginLeft:'auto', fontSize:8.5, letterSpacing:'.12em', fontWeight:800, padding:'3px 8px', borderRadius:6, background:'#fef2f2', color:'#dc2626', flexShrink:0 }}>ΤΕΛΕΙΩΣΕ</span>}
        {w.isGroup && statusOf(w.balance) !== 'zero' && <span style={{ marginLeft:'auto', fontSize:8.5, letterSpacing:'.12em', fontWeight:800, padding:'3px 8px', borderRadius:6, background:'#fff', color:theme.accent, flexShrink:0 }}>GROUP</span>}
      </div>
      <div style={{ fontFamily:'ui-monospace,monospace', fontWeight:700, fontSize:44, letterSpacing:'-.05em', margin:'6px 0 0', color:st.num, lineHeight:1 }}>{w.balance}</div>
      <div style={{ fontSize:9, letterSpacing:'.16em', fontWeight:800, color:'#a1a1aa', margin:'3px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{w.label}</div>
      {w.isGroup ? (
        <div style={{ display:'flex', gap:5, margin:'8px 0 9px', flexWrap:'wrap' }}>
          {w.members.map(m => (
            <span key={m.id} title={m.name} style={{ width:22, height:22, borderRadius:99, display:'grid', placeItems:'center',
              color:'#fff', fontWeight:800, fontSize:10, background:m.theme_color || theme.accent }}>{m.name?.charAt(0)}</span>
          ))}
        </div>
      ) : (
        <div style={{ height:7, borderRadius:9, background:'#eceef1', margin:'9px 0 10px', overflow:'hidden' }}>
          <span style={{ display:'block', height:'100%', width:`${pct}%`, background:theme.grad, transition:'width .3s' }}/>
        </div>
      )}
      <div style={{ display:'flex', gap:6, marginTop:'auto' }}>
        <button title="Προσθήκη tokens" onClick={()=>toggle('add')} style={{ flex:1, border:'none', borderRadius:10, padding:'9px 0',
          fontSize:12, fontWeight:800, cursor:'pointer', color:'#fff', fontFamily:'inherit', background:theme.grad }}>
          <Plus style={{ width:13, height:13, display:'inline', verticalAlign:'-2px' }}/> Tokens</button>
        <button title="Χειροκίνητη προσαρμογή ±" onClick={()=>toggle('edit')} style={{ border:'1px solid rgba(14,17,22,.14)',
          background: mode === 'edit' ? '#0e1116' : '#fff', color: mode === 'edit' ? '#fff' : '#0e1116',
          borderRadius:10, padding:'9px 13px', cursor:'pointer', fontFamily:'inherit' }}>
          <Pencil style={{ width:13, height:13, display:'block' }}/></button>
      </div>
      {mode === 'add' && <AddPanel grad={theme.grad} onApply={onAdd} busy={busy}/>}
      {mode === 'edit' && <EditPanel grad={theme.grad} balance={w.balance} onApply={onAdjust} busy={busy}/>}
    </div>
  );
}

/* ── κεφαλίδα στήλης ── */
function ColHeader({ emoji, title, theme, total, zero, count }) {
  return (
    <div style={{ background:theme.grad, borderRadius:16, padding:'13px 16px', color:'#fff',
      display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
      <span style={{ fontSize:22 }}>{emoji}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <b style={{ display:'block', fontSize:13.5, letterSpacing:'.1em' }}>{title}</b>
        <span style={{ fontSize:10, letterSpacing:'.14em', fontWeight:800, opacity:.85 }}>{count} ΚΑΡΤΕΣ{zero > 0 ? ` · ${zero} ΣΤΟ ΜΗΔΕΝ` : ''}</span>
      </div>
      <div style={{ textAlign:'right' }}>
        <b style={{ display:'block', fontFamily:'ui-monospace,monospace', fontWeight:700, fontSize:27, letterSpacing:'-.04em', lineHeight:1 }}>{total}</b>
        <span style={{ fontSize:8.5, letterSpacing:'.16em', fontWeight:800, opacity:.85 }}>ΕΝΕΡΓΑ TOKENS</span>
      </div>
    </div>
  );
}

export default function Logistics() {
  const nav = useNavigate();
  const [clients, setClients] = useState([]);
  const [groups, setGroups] = useState([]);
  const [entries, setEntries] = useState([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);   // { k, mode:'add'|'edit' }
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [c, g, e] = await Promise.all([
      db.Client.list('name'),
      db.Group.list().catch(()=>[]),
      db.CreditEntry.list('-date', 3000).catch(()=>[]),
    ]);
    setClients(unorphanClients(c || [], g || []).filter(x => !x.is_trial && x.active !== false));
    setGroups((g || []).filter(x => !x.is_trial));
    setEntries((e || []).slice().sort((a, b) => ((b.date || '') + (b.id || '')).localeCompare((a.date || '') + (a.id || ''))));
  };
  useEffect(() => { load(); }, []);

  const data = useMemo(() => {
    const byClient = {};
    for (const e of entries) if (e.client_id) (byClient[e.client_id] ||= []).push(e);
    const lastPackOf = (id, nutri) => {
      const hit = (byClient[id] || []).find(e => (nutri ? e.kind === 'nutrition' : e.kind !== 'nutrition') && Number(e.delta) > 0);
      return hit ? Number(hit.delta) : 0;
    };
    /* 🏋️ Personal — όπως στο Training Center: βάσει υπηρεσίας */
    const personal = clients.filter(c => !isGroupService(c.services)).map((c, i) => {
      const bal = creditBalance(byClient[c.id] || []);
      return { id:c.id, isGroup:false, name:c.name, color:c.theme_color || PALETTE[i % PALETTE.length],
        balance:bal.training, lastPack:lastPackOf(c.id, false),
        label:`TOKENS ΠΡΟΠΟΝΗΣΗΣ${lastPackOf(c.id, false) ? ` · ΠΑΚΕΤΟ ${lastPackOf(c.id, false)}` : ''}` };
    }).sort((a, b) => a.balance - b.balance || a.name.localeCompare(b.name));
    /* 🏋️ Groups — κοινό υπόλοιπο */
    const grps = groups.map(g => {
      const members = clients.filter(c => (g.member_ids || []).includes(c.id));
      if (!members.length) return null;
      return { id:g.id, isGroup:true, name:g.name || members.map(m => m.name?.split(' ')[0]).join(' + '),
        members, balance:groupTrainingBalance(entries, g), lastPack:0,
        label:`ΚΟΙΝΑ TOKENS · ${members.map(m => (m.name || '').split(' ')[0].toUpperCase()).join(' + ')}` };
    }).filter(Boolean).sort((a, b) => a.balance - b.balance || a.name.localeCompare(b.name));
    const unassigned = clients.filter(c => isGroupService(c.services) && !c.group_id);
    /* 🥗 Διατροφή — όσοι έχουν διαλέξει διατροφή (όπως στο Nutrition Center), ως άτομα */
    const nutri = clients.filter(hasNutritionSvc).map((c, i) => {
      const bal = creditBalance(byClient[c.id] || []);
      const per = c.nutrition_meetings_per_month ? ` · ${c.nutrition_meetings_per_month}/ΜΗΝΑ` : '';
      return { id:c.id, isGroup:false, name:c.name, color:c.theme_color || PALETTE[i % PALETTE.length],
        balance:bal.nutrition, lastPack:lastPackOf(c.id, true),
        label:`TOKENS ΔΙΑΤΡΟΦΗΣ${lastPackOf(c.id, true) ? ` · ΠΑΚΕΤΟ ${lastPackOf(c.id, true)}` : ''}${per}` };
    }).sort((a, b) => a.balance - b.balance || a.name.localeCompare(b.name));
    return { personal, grps, unassigned, nutri };
  }, [clients, groups, entries]);

  const match = (w) => !q || w.name.toLowerCase().includes(q.toLowerCase());
  const personal = data.personal.filter(match);
  const grps = data.grps.filter(match);
  const nutri = data.nutri.filter(match);

  const stat = (list) => ({
    total: list.reduce((s, w) => s + Math.max(0, w.balance), 0),
    zero:  list.filter(w => statusOf(w.balance) === 'zero').length,
  });
  const tStat = stat([...data.personal, ...data.grps]);
  const nStat = stat(data.nutri);

  const run = (fn) => async (delta) => {
    if (busy || !delta) return;
    setBusy(true);
    try { await fn(delta); await load(); setOpen(null); } finally { setBusy(false); }
  };
  const addTrain  = (w, reason) => run((d) => w.isGroup
    ? addGroupCredit(w.id, d, reason, null, '')
    : addCredit(w.id, 'training', d, reason, null, ''));
  const addNutri  = (w, reason) => run((d) => addCredit(w.id, 'nutrition', d, reason, null, ''));

  const SUB = { fontSize:9.5, letterSpacing:'.18em', fontWeight:800, color:'#a1a1aa', margin:'2px 0 8px' };
  const GRID = { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(215px,1fr))', gap:11, alignItems:'start' };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in" style={{ color:'#0e1116' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap', marginBottom:16 }}>
        <div>
          <p style={{ margin:0, fontSize:10, letterSpacing:'.28em', fontWeight:800, color:'#e0457b' }}>LOGISTICS</p>
          <h1 style={{ margin:'2px 0 0', fontSize:24, fontWeight:900, letterSpacing:'-.02em', display:'flex', alignItems:'center', gap:8 }}>
            <Ticket style={{ width:22, height:22, color:'#8b5cf6' }}/> Υπόλοιπα & Tokens</h1>
        </div>
        <div style={{ position:'relative' }}>
          <Search style={{ width:14, height:14, position:'absolute', left:11, top:11, color:'#a1a1aa' }}/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Αναζήτηση πελάτη ή group…"
            style={{ width:260, border:'1px solid rgba(14,17,22,.12)', borderRadius:11, padding:'9px 12px 9px 32px',
              fontSize:12.5, fontFamily:'inherit', outline:'none', background:'#fff' }}/>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,380px),1fr))', gap:18, alignItems:'start' }}>

        {/* ═══ 🏋️ TOKENS ΠΡΟΠΟΝΗΣΗΣ ═══ */}
        <section>
          <ColHeader emoji="🏋️" title="TOKENS ΠΡΟΠΟΝΗΣΗΣ" theme={THEME.train}
            total={tStat.total} zero={tStat.zero} count={data.personal.length + data.grps.length}/>
          {personal.length > 0 && (<>
            <p style={SUB}>PERSONAL ({personal.length})</p>
            <div style={{ ...GRID, marginBottom:16 }}>
              {personal.map(w => (
                <TokenCard key={w.id} k={`t:${w.id}`} theme={THEME.train} w={w} open={open} setOpen={setOpen}
                  onAdd={addTrain(w, 'purchase')} onAdjust={addTrain(w, 'adjust')} busy={busy} nav={nav}/>
              ))}
            </div>
          </>)}
          {grps.length > 0 && (<>
            <p style={SUB}>GROUPS ({grps.length})</p>
            <div style={GRID}>
              {grps.map(w => (
                <TokenCard key={w.id} k={`t:${w.id}`} theme={THEME.train} w={w} open={open} setOpen={setOpen}
                  onAdd={addTrain(w, 'purchase')} onAdjust={addTrain(w, 'adjust')} busy={busy} nav={nav}/>
              ))}
            </div>
          </>)}
          {data.unassigned.length > 0 && (
            <div style={{ marginTop:12, border:'1.5px dashed #fcd34d', background:'#fffbeb', borderRadius:14, padding:'10px 14px' }}>
              <p style={{ margin:0, fontSize:10, letterSpacing:'.14em', fontWeight:800, color:'#d97706' }}>⏳ GROUP ΠΕΛΑΤΕΣ ΧΩΡΙΣ GROUP</p>
              <p style={{ margin:'4px 0 0', fontSize:12, color:'#92400e', fontWeight:700 }}>{data.unassigned.map(c => c.name).join(' · ')}</p>
              <p style={{ margin:'3px 0 0', fontSize:10.5, color:'#a16207' }}>Τοποθέτησέ τους σε group από το Training Center για να πάρουν κοινό υπόλοιπο.</p>
            </div>
          )}
          {personal.length === 0 && grps.length === 0 && (
            <p style={{ color:'#a1a1aa', fontSize:13, textAlign:'center', padding:'32px 0' }}>Καμία κάρτα προπόνησης.</p>
          )}
        </section>

        {/* ═══ 🥗 TOKENS ΔΙΑΤΡΟΦΗΣ ═══ */}
        <section>
          <ColHeader emoji="🥗" title="TOKENS ΔΙΑΤΡΟΦΗΣ" theme={THEME.nutri}
            total={nStat.total} zero={nStat.zero} count={data.nutri.length}/>
          <p style={SUB}>ΑΤΟΜΑ ΜΕ ΔΙΑΤΡΟΦΗ ({nutri.length})</p>
          {nutri.length === 0 ? (
            <p style={{ color:'#a1a1aa', fontSize:13, textAlign:'center', padding:'32px 0' }}>Κανείς με υπηρεσία διατροφής.</p>
          ) : (
            <div style={GRID}>
              {nutri.map(w => (
                <TokenCard key={w.id} k={`n:${w.id}`} theme={THEME.nutri} w={w} open={open} setOpen={setOpen}
                  onAdd={addNutri(w, 'purchase')} onAdjust={addNutri(w, 'adjust')} busy={busy} nav={nav}/>
              ))}
            </div>
          )}
        </section>
      </div>

      <p style={{ marginTop:18, fontSize:11, color:'#a1a1aa', display:'flex', alignItems:'center', gap:6 }}>
        <Users2 style={{ width:13, height:13 }}/> Οι προπονήσεις χρεώνουν το ροζ-μωβ υπόλοιπο (κοινό στα groups) · οι διατροφικές συναντήσεις το πράσινο, πάντα ατομικά. [+] προσθέτει tokens πακέτου, [✎] κάνει χειροκίνητη προσαρμογή ±.
      </p>
    </div>
  );
}
