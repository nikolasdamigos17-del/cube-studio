import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Ticket, History, Plus, Undo2, Users2 } from 'lucide-react';
import { db } from '../lib/db';
import { unorphanClients } from '../lib/groups';
import { creditBalance, groupTrainingBalance, groupTrainingEntries, addCredit, addGroupCredit, REASON_LABELS } from '../lib/credits';

/* ══ LOGISTICS v2 — WALLET ═══════════════════════════════════════════════
   Καθαρή διαχείριση tokens: κανένα χρηματικό ποσό. Κάθε πελάτης/group είναι
   ένα «πορτοφόλι» με υπόλοιπο, πρόοδο πακέτου, ιστορικό και πράξεις +/−.  */

const PALETTE = ['#e0457b','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#84cc16'];
const statusOf = (b) => b <= 0 ? 'zero' : b <= 2 ? 'low' : 'ok';
const ST = {
  zero:{ chipBg:'#fef2f2', chipCol:'#dc2626', chipBr:'#fca5a5', num:'#dc2626', border:'1.5px solid #fca5a5' },
  low: { chipBg:'#fffbeb', chipCol:'#d97706', chipBr:'#fcd34d', num:'#d97706', border:'1px solid rgba(14,17,22,.09)' },
  ok:  { chipBg:'#f0fdf4', chipCol:'#16a34a', chipBr:'#86efac', num:'#16a34a', border:'1px solid rgba(14,17,22,.09)' },
};
const fmtD = (d) => d ? `${d.slice(8,10)}/${d.slice(5,7)}` : '';
const nutriBal = (entries) => (entries || []).filter(e => e.kind === 'nutrition').reduce((a, e) => a + (Number(e.delta) || 0), 0);

/* ── panel πράξεων (+1/+5/+10/custom/−1 + σημείωση) ── */
function ActionPanel({ onApply, busy, nutrition, members }) {
  const [note, setNote] = useState('');
  const [custom, setCustom] = useState('');
  const [kind, setKind] = useState('training');
  const [memberId, setMemberId] = useState(members?.[0]?.id || '');
  const needMember = kind === 'nutrition' && !!members;
  const go = (delta) => {
    if (!delta || busy) return;
    if (needMember && !memberId) return;
    onApply(kind, delta, note, needMember ? memberId : null);
    setNote(''); setCustom('');
  };
  const b = { border:'1px solid rgba(14,17,22,.12)', background:'#fff', borderRadius:10, padding:'10px 0',
    fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit', color:'#0e1116' };
  const p = { ...b, background:'linear-gradient(135deg,#e0457b,#8b5cf6)', color:'#fff', border:'none' };
  return (
    <div style={{ marginTop:10, borderTop:'1px solid rgba(14,17,22,.08)', paddingTop:10 }}>
      {nutrition && (
        <div style={{ display:'flex', gap:6, marginBottom:8 }}>
          {[['training','🏋️ Προπονήσεις'],['nutrition','🥗 Διατροφή']].map(([k,l])=>(
            <button key={k} onClick={()=>setKind(k)} style={{ ...b, flex:1, padding:'7px 0', fontSize:11,
              background: kind===k ? '#0e1116' : '#fff', color: kind===k ? '#fff' : '#0e1116' }}>{l}</button>
          ))}
        </div>
      )}
      {needMember && (
        <div style={{ display:'flex', gap:6, marginBottom:8, flexWrap:'wrap' }}>
          {members.map(m => (
            <button key={m.id} onClick={()=>setMemberId(m.id)} style={{ ...b, padding:'6px 11px', fontSize:11,
              background: memberId===m.id ? (m.theme_color || '#8b5cf6') : '#fff',
              color: memberId===m.id ? '#fff' : '#0e1116' }}>{(m.name || '').split(' ')[0]}</button>
          ))}
        </div>
      )}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
        <button style={p} onClick={()=>go(10)}>+10</button>
        <button style={{...p, opacity:.88}} onClick={()=>go(5)}>+5</button>
        <button style={b} onClick={()=>go(1)}>+1</button>
        <button style={{...b, color:'#dc2626'}} onClick={()=>go(-1)}>−1</button>
      </div>
      <div style={{ display:'flex', gap:6, marginTop:6 }}>
        <input type="number" value={custom} onChange={e=>setCustom(e.target.value)} placeholder="±"
          style={{ width:64, border:'1px solid rgba(14,17,22,.12)', borderRadius:10, padding:'8px 10px', fontSize:12.5, fontFamily:'inherit', outline:'none' }}/>
        <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Σημείωση (π.χ. Πακέτο Οκτωβρίου)…"
          style={{ flex:1, minWidth:0, border:'1px solid rgba(14,17,22,.12)', borderRadius:10, padding:'8px 10px', fontSize:12.5, fontFamily:'inherit', outline:'none' }}/>
        <button style={{...p, padding:'0 14px'}} disabled={busy} onClick={()=>go(parseInt(custom)||0)}>{busy?'…':'ΟΚ'}</button>
      </div>
    </div>
  );
}

/* ── ιστορικό κινήσεων ── */
function Ledger({ rows, onUndo, nameOf }) {
  if (!rows.length) return <p style={{ margin:'10px 0 2px', fontSize:12, color:'#a1a1aa' }}>Καμία κίνηση ακόμα.</p>;
  return (
    <div style={{ marginTop:10, borderTop:'1px solid rgba(14,17,22,.08)', maxHeight:196, overflowY:'auto' }}>
      {rows.map(e => (
        <div key={e.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:'1px solid rgba(14,17,22,.06)' }}>
          <span style={{ fontFamily:'ui-monospace,monospace', fontSize:10, color:'#a1a1aa', width:38, flexShrink:0 }}>{fmtD(e.date)}</span>
          <span style={{ fontFamily:'ui-monospace,monospace', fontWeight:700, fontSize:12, minWidth:34, textAlign:'center',
            borderRadius:8, padding:'2px 6px', flexShrink:0,
            background: e.delta > 0 ? '#f0fdf4' : '#fef2f2', color: e.delta > 0 ? '#16a34a' : '#dc2626' }}>
            {e.delta > 0 ? `+${e.delta}` : e.delta}</span>
          <span style={{ fontSize:11.5, color:'#374151', flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {e.kind === 'nutrition' ? `🥗 ${nameOf?.(e.client_id) || ''} ` : ''}{REASON_LABELS[e.reason] || e.reason}{e.note ? ` — ${e.note}` : ''}</span>
          {e.reason !== 'session' && e.reason !== 'meeting' && (
            <button title="Αναίρεση κίνησης" onClick={()=>onUndo(e)}
              style={{ border:'none', background:'transparent', cursor:'pointer', color:'#a1a1aa', padding:2, flexShrink:0 }}>
              <Undo2 style={{ width:13, height:13 }}/></button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── κάρτα-πορτοφόλι ── */
function WalletCard({ w, open, setOpen, onApply, onUndo, busy, nav, nameOf }) {
  const st = ST[statusOf(w.balance)];
  const pct = w.lastPack > 0 ? Math.max(0, Math.min(100, (w.balance / w.lastPack) * 100)) : 0;
  const mode = open?.id === w.id ? open.mode : null;
  const toggle = (m) => setOpen(mode === m ? null : { id:w.id, mode:m });
  return (
    <div style={{ position:'relative', background: w.isGroup ? 'linear-gradient(135deg,#fdf2f8,#f5f3ff)' : '#fff',
      border:st.border, borderRadius:16, padding:14, overflow:'hidden', display:'flex', flexDirection:'column' }}>
      <span style={{ position:'absolute', inset:'0 0 auto 0', height:4,
        background: w.isGroup ? 'linear-gradient(90deg,#e0457b,#8b5cf6)' : w.color }}/>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        {w.isGroup ? (
          <b style={{ fontSize:13.5, cursor:'pointer' }} onClick={()=>nav(`/GroupProfile?id=${w.id}`)}>👥 {w.name}</b>
        ) : (<>
          <span style={{ width:30, height:30, borderRadius:99, display:'grid', placeItems:'center', color:'#fff',
            fontWeight:800, fontSize:12, background:w.color, flexShrink:0 }}>{w.name?.charAt(0)}</span>
          <b style={{ fontSize:13.5, cursor:'pointer', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
            onClick={()=>nav(`/ClientProfile?id=${w.id}`)}>{w.name}</b>
        </>)}
        {statusOf(w.balance)==='zero' && <span style={{ marginLeft:'auto', fontSize:8.5, letterSpacing:'.12em', fontWeight:800, padding:'3px 8px', borderRadius:6, background:'#fef2f2', color:'#dc2626', flexShrink:0 }}>ΤΕΛΕΙΩΣΕ</span>}
        {w.isGroup && statusOf(w.balance)!=='zero' && <span style={{ marginLeft:'auto', fontSize:8.5, letterSpacing:'.12em', fontWeight:800, padding:'3px 8px', borderRadius:6, background:'#fff', color:'#8b5cf6', flexShrink:0 }}>GROUP</span>}
      </div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:10 }}>
        <div style={{ fontFamily:'ui-monospace,monospace', fontWeight:700, fontSize:44, letterSpacing:'-.05em', margin:'6px 0 0', color:st.num, lineHeight:1 }}>{w.balance}</div>
        {w.nutrition !== 0 && !w.isGroup && (
          <span title="Υπόλοιπο διατροφικών συναντήσεων" style={{ marginBottom:4, fontSize:11.5, fontWeight:800, color:'#16a34a', background:'#f0fdf4', border:'1px solid #86efac', borderRadius:99, padding:'2px 9px' }}>🥗 {w.nutrition}</span>
        )}
      </div>
      <div style={{ fontSize:9, letterSpacing:'.16em', fontWeight:800, color:'#a1a1aa', margin:'3px 0 0' }}>
        {w.isGroup ? `ΚΟΙΝΑ TOKENS · ${w.memberNames}` : `TOKENS${w.lastPack ? ` · ΑΠΟ ΠΑΚΕΤΟ ${w.lastPack}` : ''}`}
      </div>
      {w.isGroup ? (
        <div style={{ display:'flex', gap:7, margin:'8px 0 9px', flexWrap:'wrap' }}>
          {w.members.map(m => (
            <span key={m.id} title={m.name} style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
              <span style={{ width:22, height:22, borderRadius:99, display:'grid', placeItems:'center',
                color:'#fff', fontWeight:800, fontSize:10, background:m.theme_color || '#8b5cf6' }}>{m.name?.charAt(0)}</span>
              {m._nutri !== null && (
                <span title={`🥗 διατροφικές ${(m.name || '').split(' ')[0]}`} style={{ fontSize:10, fontWeight:800, color:'#16a34a', background:'#f0fdf4', border:'1px solid #86efac', borderRadius:99, padding:'1px 7px' }}>🥗 {m._nutri}</span>
              )}
            </span>
          ))}
        </div>
      ) : (
        <div style={{ height:7, borderRadius:9, background:'#eceef1', margin:'9px 0 10px', overflow:'hidden' }}>
          <span style={{ display:'block', height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#e0457b,#8b5cf6)', transition:'width .3s' }}/>
        </div>
      )}
      <div style={{ display:'flex', gap:6, marginTop:'auto' }}>
        <button onClick={()=>toggle('add')} style={{ flex:1, border:'none', borderRadius:10, padding:'9px 0', fontSize:11.5, fontWeight:800,
          cursor:'pointer', color:'#fff', fontFamily:'inherit', background:'linear-gradient(135deg,#e0457b,#8b5cf6)' }}>
          <Plus style={{ width:12, height:12, display:'inline', verticalAlign:'-2px' }}/> Πακέτο</button>
        <button onClick={()=>toggle('hist')} style={{ border:'1px solid rgba(14,17,22,.12)', background:'#fff', borderRadius:10,
          padding:'9px 12px', fontSize:11.5, fontWeight:800, cursor:'pointer', fontFamily:'inherit', color:'#0e1116' }}>
          <History style={{ width:12, height:12, display:'inline', verticalAlign:'-2px' }}/> Ιστορικό</button>
      </div>
      {mode === 'add' && <ActionPanel onApply={onApply} busy={busy}
        nutrition={!w.isGroup || w.members.some(m => m._nutri !== null)}
        members={w.isGroup ? w.members : null}/>}
      {mode === 'hist' && <Ledger rows={w.hist} onUndo={onUndo} nameOf={nameOf}/>}
    </div>
  );
}

export default function Logistics() {
  const nav = useNavigate();
  const [clients, setClients] = useState([]);
  const [groups, setGroups] = useState([]);
  const [entries, setEntries] = useState([]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');   // all | zero | low | ok | groups
  const [open, setOpen] = useState(null);        // { id, mode:'add'|'hist' }
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [c, g, e] = await Promise.all([
      db.Client.list('name'),
      db.Group.list().catch(()=>[]),
      db.CreditEntry.list('-date', 3000).catch(()=>[]),
    ]);
    const gs = (g || []).filter(x => !x.is_trial);
    setClients(unorphanClients(c || [], g || []).filter(x => !x.is_trial));
    setGroups(gs);
    setEntries((e || []).slice().sort((a, b) => ((b.date || '') + (b.id || '')).localeCompare((a.date || '') + (a.id || ''))));
  };
  useEffect(() => { load(); }, []);

  const nameOf = useMemo(() => {
    const map = Object.fromEntries(clients.map(c => [c.id, (c.name || '').split(' ')[0]]));
    return (id) => map[id] || '';
  }, [clients]);

  const wallets = useMemo(() => {
    const byClient = {};
    for (const e of entries) if (e.client_id) (byClient[e.client_id] ||= []).push(e);
    const inGroup = new Set(groups.flatMap(g => g.member_ids || []));
    const ws = [];
    clients.filter(c => c.active !== false && !inGroup.has(c.id)).forEach((c, i) => {
      const es = byClient[c.id] || [];
      const bal = creditBalance(es);
      const lastPack = es.find(e => e.kind !== 'nutrition' && Number(e.delta) > 0);
      ws.push({ id:c.id, isGroup:false, name:c.name, color:c.theme_color || PALETTE[i % PALETTE.length],
        balance:bal.training, nutrition:bal.nutrition, lastPack:lastPack ? Number(lastPack.delta) : 0,
        members:[], hist:es.slice(0, 30) });
    });
    groups.forEach(g => {
      const members = clients.filter(c => (g.member_ids || []).includes(c.id)).map(c => {
        const nb = nutriBal(byClient[c.id]);
        const hasN = nb !== 0 || ['nutrition_only','personal_training_nutrition','group_training_nutrition'].includes(c.services);
        return { ...c, _nutri: hasN ? nb : null };
      });
      if (!members.length) return;
      const nutriHist = members.flatMap(m => (byClient[m.id] || []).filter(e => e.kind === 'nutrition'));
      const hist = [...groupTrainingEntries(entries, g), ...nutriHist]
        .sort((a, b) => ((b.date || '') + (b.id || '')).localeCompare((a.date || '') + (a.id || '')));
      ws.push({ id:g.id, isGroup:true, name:g.name || members.map(m => m.name?.split(' ')[0]).join(' + '),
        members, memberNames:members.map(m => (m.name || '').split(' ')[0].toUpperCase()).join(' + '),
        balance:groupTrainingBalance(entries, g), nutrition:0, lastPack:0,
        hist:hist.slice(0, 30) });
    });
    return ws.sort((a, b) => a.balance - b.balance || a.name.localeCompare(b.name));
  }, [clients, groups, entries]);

  const kpi = useMemo(() => {
    const monthKey = new Date().toISOString().slice(0, 7);
    const train = entries.filter(e => e.kind !== 'nutrition');
    return {
      active: wallets.reduce((s, w) => s + Math.max(0, w.balance), 0),
      burned: train.filter(e => (e.date || '').startsWith(monthKey) && Number(e.delta) < 0)
                   .reduce((s, e) => s - Number(e.delta), 0),
      low: wallets.filter(w => statusOf(w.balance) === 'low').length,
      zero: wallets.filter(w => statusOf(w.balance) === 'zero').length,
    };
  }, [wallets, entries]);

  const shown = wallets.filter(w => {
    if (q && !w.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === 'groups') return w.isGroup;
    if (filter !== 'all') return statusOf(w.balance) === filter;
    return true;
  });

  const apply = (w) => async (kind, delta, note, memberId) => {
    if (busy || !delta) return;
    setBusy(true);
    try {
      const reason = delta > 0 ? 'purchase' : 'adjust';
      if (w.isGroup && kind === 'nutrition' && memberId) await addCredit(memberId, 'nutrition', delta, reason, null, note);
      else if (w.isGroup) await addGroupCredit(w.id, delta, reason, null, note);
      else await addCredit(w.id, kind, delta, reason, null, note);
      await load();
    } finally { setBusy(false); }
  };
  const undo = async (e) => { await db.CreditEntry.delete(e.id); await load(); };

  const FILTERS = [
    ['all', `ΟΛΟΙ (${wallets.length})`, '#0e1116', '#fff'],
    ['zero', `ΜΗΔΕΝ (${kpi.zero})`, '#fef2f2', '#dc2626'],
    ['low', `ΧΑΜΗΛΑ (${kpi.low})`, '#fffbeb', '#d97706'],
    ['ok', 'ΕΝΤΑΞΕΙ', '#f0fdf4', '#16a34a'],
    ['groups', `GROUPS (${wallets.filter(w=>w.isGroup).length})`, '#f5f3ff', '#8b5cf6'],
  ];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto animate-fade-in" style={{ color:'#0e1116' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap', marginBottom:14 }}>
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

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:10, marginBottom:14 }}>
        {[[kpi.active, 'ΕΝΕΡΓΑ TOKENS ΣΥΝΟΛΟ', '#e0457b'], [kpi.burned, 'SESSIONS ΑΥΤΟΝ ΤΟΝ ΜΗΝΑ', '#16a34a'],
          [kpi.low, 'ΠΕΛΑΤΕΣ ΧΑΜΗΛΑ (1-2)', '#d97706'], [kpi.zero, 'ΠΕΛΑΤΕΣ ΣΤΟ ΜΗΔΕΝ', '#dc2626']].map(([v, l, col]) => (
          <div key={l} style={{ background:'#fff', border:'1px solid rgba(14,17,22,.09)', borderRadius:14, padding:'12px 14px' }}>
            <b style={{ display:'block', fontFamily:'ui-monospace,monospace', fontWeight:700, fontSize:26, letterSpacing:'-.04em', color:col }}>{v}</b>
            <span style={{ fontSize:9, letterSpacing:'.14em', fontWeight:800, color:'#a1a1aa' }}>{l}</span>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:7, marginBottom:14, flexWrap:'wrap' }}>
        {FILTERS.map(([k, l, bg, col]) => (
          <button key={k} onClick={()=>setFilter(k)} style={{ border:'none', cursor:'pointer', fontFamily:'inherit',
            fontSize:9.5, letterSpacing:'.12em', fontWeight:800, padding:'6px 11px', borderRadius:8,
            background: filter === k ? '#0e1116' : bg, color: filter === k ? '#fff' : col }}>{l}</button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p style={{ color:'#a1a1aa', fontSize:13, textAlign:'center', padding:'40px 0' }}>Κανένα πορτοφόλι εδώ.</p>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))', gap:12, alignItems:'start' }}>
          {shown.map(w => (
            <WalletCard key={w.id} w={w} open={open} setOpen={setOpen}
              onApply={apply(w)} onUndo={undo} busy={busy} nav={nav} nameOf={nameOf}/>
          ))}
        </div>
      )}

      <p style={{ marginTop:16, fontSize:11, color:'#a1a1aa', display:'flex', alignItems:'center', gap:6 }}>
        <Users2 style={{ width:13, height:13 }}/> Τα groups διαχειρίζονται κοινό υπόλοιπο προπονήσεων — το Live Training αφαιρεί αυτόματα 1 token ανά session. Η διατροφή μετριέται ανά μέλος (🥗).
      </p>
    </div>
  );
}
