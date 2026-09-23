import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Scale } from 'lucide-react';
import { withingsExchangeCode } from '../lib/withings';

export default function WithingsCallback() {
  const navigate = useNavigate();
  const [st, setSt] = useState('loading'); // 'loading' | 'ok' | 'error'
  const [msg, setMsg] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; ran.current = true;
    const p = new URLSearchParams(window.location.search);
    const code = p.get('code'); const state = p.get('state');
    const err = p.get('error');
    const saved = (() => { try { return localStorage.getItem('withings_state'); } catch { return null; } })();
    if (err) { setSt('error'); setMsg('Η εξουσιοδότηση ακυρώθηκε (' + err + ').'); return; }
    if (!code) { setSt('error'); setMsg('Δεν επιστράφηκε κωδικός εξουσιοδότησης.'); return; }
    if (saved && state && saved !== state) { setSt('error'); setMsg('Αναντιστοιχία κωδικού ασφαλείας (state).'); return; }
    withingsExchangeCode(code)
      .then(() => { setSt('ok'); setTimeout(() => navigate('/'), 1800); })
      .catch(e => { setSt('error'); setMsg(String(e.message || e)); });
  }, [navigate]);

  const wrap = { position:'fixed', inset:0, display:'grid', placeItems:'center', padding:24,
    background:'radial-gradient(circle at 50% 30%, #12131c, #060609)', color:'#fff', textAlign:'center' };
  const card = { maxWidth:420, width:'100%', padding:'34px 26px', borderRadius:24,
    background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)', boxShadow:'0 30px 80px rgba(0,0,0,.6)' };

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ width:64, height:64, borderRadius:18, margin:'0 auto 18px', display:'grid', placeItems:'center',
          background: st==='error' ? 'rgba(239,68,68,.15)' : 'linear-gradient(145deg,#10b981,#0891b2)' }}>
          {st === 'loading' && <Loader2 size={30} style={{ animation:'spin 1s linear infinite' }} />}
          {st === 'ok' && <CheckCircle2 size={32} color="#fff" />}
          {st === 'error' && <XCircle size={32} color="#ef4444" />}
        </div>
        <h1 style={{ fontSize:20, fontWeight:900, margin:'0 0 8px' }}>
          {st === 'loading' && 'Σύνδεση με Withings…'}
          {st === 'ok' && 'Συνδέθηκε!'}
          {st === 'error' && 'Κάτι πήγε στραβά'}
        </h1>
        <p style={{ fontSize:13.5, lineHeight:1.55, color:'rgba(255,255,255,.7)', margin:0 }}>
          {st === 'loading' && 'Ολοκληρώνουμε την ασφαλή σύνδεση με τη ζυγαριά σου.'}
          {st === 'ok' && 'Η ζυγαριά Withings συνδέθηκε. Επιστροφή στην εφαρμογή…'}
          {st === 'error' && msg}
        </p>
        {st === 'error' && (
          <button onClick={() => navigate('/')}
            style={{ marginTop:20, padding:'11px 22px', borderRadius:12, border:'none', cursor:'pointer',
              background:'linear-gradient(145deg,#e0457b,#8b5cf6)', color:'#fff', fontSize:14, fontWeight:800 }}>
            Επιστροφή
          </button>
        )}
        <div style={{ marginTop:22, display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:.5, fontSize:11 }}>
          <Scale size={14} /> Withings · Cube Studio
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
