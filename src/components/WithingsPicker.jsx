import { useState, useEffect } from 'react';
import { X, Scale, Loader2, RefreshCw } from 'lucide-react';
import { fetchRecentWithingsMeasures } from '../lib/withings';

/* ── Επιλογή ζύγισης από τη «δεξαμενή» Withings ──────────────────────────────
   Δείχνει τις πιο πρόσφατες ζυγίσεις (μόνο ημερομηνία + κιλά) και ο trainer
   διαλέγει ΠΟΙΑ θα περαστεί — για να μη γίνει ποτέ λάθος καταχώρηση.          */

export default function WithingsPicker({ onPick, onClose }) {
  const [rows, setRows] = useState(null);   // null = loading
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setErr(''); setRows(null);
    try { setRows(await fetchRecentWithingsMeasures(6)); }
    catch (e) { setErr(String(e.message || e)); setRows([]); }
  };
  useEffect(() => { load(); }, []);

  const fmt = ms => new Date(ms).toLocaleString('el-GR',
    { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div onClick={onClose}
      style={{ position:'fixed', inset:0, zIndex:300, display:'flex', alignItems:'center', justifyContent:'center',
        padding:18, background:'rgba(5,4,10,.82)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width:'100%', maxWidth:440, maxHeight:'88vh', overflowY:'auto', borderRadius:22, padding:20,
          background:'#0d0c14', border:'1px solid rgba(255,255,255,.1)', boxShadow:'0 30px 80px rgba(0,0,0,.65)', color:'#fff' }}>

        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
          <div style={{ width:40, height:40, borderRadius:12, flexShrink:0, display:'grid', placeItems:'center',
            background:'linear-gradient(145deg,#10b981,#0891b2)', boxShadow:'0 6px 18px rgba(16,185,129,.35)' }}>
            <Scale size={20} color="#fff"/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ margin:0, fontSize:16, fontWeight:900 }}>Ζυγίσεις Withings</p>
            <p style={{ margin:'2px 0 0', fontSize:11.5, color:'rgba(255,255,255,.5)' }}>Διάλεξε ποια μέτρηση θα περαστεί στον πελάτη</p>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:10, border:'none', cursor:'pointer',
            background:'rgba(255,255,255,.08)', color:'#fff', display:'grid', placeItems:'center' }}><X size={16}/></button>
        </div>

        <div style={{ marginTop:16 }}>
          {rows === null && (
            <div style={{ display:'flex', justifyContent:'center', padding:'34px 0' }}>
              <Loader2 size={26} style={{ animation:'wpspin 1s linear infinite', color:'#10b981' }}/>
            </div>
          )}

          {err && (
            <div style={{ textAlign:'center', padding:'18px 8px' }}>
              <p style={{ fontSize:13, color:'#f87171', margin:'0 0 12px' }}>{err}</p>
              <button onClick={load} style={{ display:'inline-flex', alignItems:'center', gap:7, fontSize:12.5, fontWeight:800,
                padding:'9px 16px', borderRadius:10, cursor:'pointer', border:'1px solid rgba(255,255,255,.16)',
                background:'rgba(255,255,255,.06)', color:'#fff' }}><RefreshCw size={14}/> Δοκίμασε ξανά</button>
            </div>
          )}

          {rows && rows.length === 0 && !err && (
            <p style={{ textAlign:'center', fontSize:13, color:'rgba(255,255,255,.55)', padding:'22px 8px' }}>
              Δεν βρέθηκαν ζυγίσεις στον λογαριασμό Withings (τελευταίες 90 ημέρες).
            </p>
          )}

          {rows && rows.map((m, i) => (
            <button key={m.date} disabled={busy}
              onClick={async () => { setBusy(true); try { await onPick(m); } catch (e) { alert(String(e.message || e)); setBusy(false); } }}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
                padding:'13px 15px', marginBottom:8, borderRadius:14, cursor:'pointer', textAlign:'left',
                border: i === 0 ? '1px solid rgba(16,185,129,.5)' : '1px solid rgba(255,255,255,.1)',
                background: i === 0 ? 'rgba(16,185,129,.09)' : 'rgba(255,255,255,.04)',
                color:'#fff', opacity: busy ? .55 : 1 }}>
              <span style={{ minWidth:0 }}>
                <span style={{ display:'block', fontSize:13.5, fontWeight:700 }}>{fmt(m.date)}</span>
                {i === 0 && <span style={{ fontSize:10.5, fontWeight:800, color:'#10b981', letterSpacing:'.06em' }}>ΠΙΟ ΠΡΟΣΦΑΤΗ</span>}
              </span>
              <span style={{ fontSize:22, fontWeight:900, whiteSpace:'nowrap' }}>
                {m.weight}<span style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,.5)', marginLeft:4 }}>kg</span>
              </span>
            </button>
          ))}
        </div>

        <p style={{ margin:'10px 2px 0', fontSize:10.5, lineHeight:1.5, color:'rgba(255,255,255,.4)' }}>
          Εμφανίζονται μόνο τα κιλά για επιβεβαίωση — μαζί με την επιλογή αποθηκεύονται και λίπος/μυς/νερό αν τα έστειλε η ζυγαριά.
        </p>
      </div>
      <style>{`@keyframes wpspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
