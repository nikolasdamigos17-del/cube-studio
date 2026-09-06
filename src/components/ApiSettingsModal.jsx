import React, { useState, useEffect } from 'react';
import { portalTarget } from '../lib/tvMode';
import { createPortal } from 'react-dom';
import { Key, Sparkles, Database, Scale, X, Check, Eye, EyeOff, ExternalLink, ChevronDown, Save, ShieldAlert, Copy, Link2, Unplug } from 'lucide-react';
import { WITHINGS_CLIENT_ID, withingsAuthorizeUrl, withingsCallbackUrl, isWithingsConnected, disconnectWithings } from '../lib/withings';
import { SUPABASE_URL, SUPABASE_ANON, supabaseEnabled } from '../lib/supabaseConfig';

/* ── Ρυθμίσεις → Ενσωματώσεις & API ──────────────────────────────────────────
   Κλειδιά τοπικά στον browser (localStorage). Το Withings Client SECRET ΔΕΝ
   αποθηκεύεται εδώ — ζει ως μεταβλητή WITHINGS_SECRET στο Vercel.               */

const FUCHSIA = '#e0457b';
const VIOLET  = '#8b5cf6';
const TEAL    = '#10b981';

const LS = {
  anthropic:    'studio_api_key',
  withings_id:  'withings_client_id',
  supabase_url: 'supabase_url',
  supabase_key: 'supabase_anon_key',
};

function Field({ label, value, onChange, placeholder, secret, mono, readOnly }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display:'block', fontSize:11, fontWeight:700, marginBottom:6,
        color:'hsl(var(--muted-foreground))', letterSpacing:'.02em' }}>{label}</label>
      <div style={{ position:'relative' }}>
        <input
          type={secret && !show ? 'password' : 'text'}
          value={value} readOnly={readOnly}
          onChange={e => onChange && onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false} autoCapitalize="off" autoCorrect="off"
          style={{ width:'100%', boxSizing:'border-box', padding: secret ? '11px 42px 11px 13px' : '11px 13px',
            borderRadius:11, border:'1px solid hsl(var(--border))',
            background: readOnly ? 'hsl(var(--muted))' : 'hsl(var(--background))',
            color:'hsl(var(--foreground))', fontSize:13.5, outline:'none',
            fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit' }}
        />
        {secret && (
          <button type="button" onClick={() => setShow(s => !s)} title={show ? 'Απόκρυψη' : 'Εμφάνιση'}
            style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
              background:'none', border:'none', cursor:'pointer', color:'hsl(var(--muted-foreground))', display:'flex', padding:6 }}>
            {show ? <EyeOff size={17}/> : <Eye size={17}/>}
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ icon:Icon, tint, title, subtitle, badge, children }) {
  return (
    <div style={{ borderRadius:18, padding:18, marginBottom:16,
      background:'hsl(var(--card))', border:'1px solid hsl(var(--border))', boxShadow:'0 2px 14px rgba(0,0,0,.18)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom: subtitle ? 4 : 14 }}>
        <div style={{ width:40, height:40, borderRadius:12, flexShrink:0, display:'grid', placeItems:'center',
          background:`linear-gradient(145deg, ${tint}22, ${tint}0a)`, border:`1px solid ${tint}44` }}>
          <Icon size={20} style={{ color: tint }}/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ margin:0, fontSize:15, fontWeight:800, color:'hsl(var(--foreground))' }}>{title}</p>
          {subtitle && <p style={{ margin:'2px 0 0', fontSize:11.5, color:'hsl(var(--muted-foreground))', lineHeight:1.45 }}>{subtitle}</p>}
        </div>
        {badge}
      </div>
      <div style={{ marginTop:14 }}>{children}</div>
    </div>
  );
}

function StatusDot({ ok, okLabel, offLabel }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:11, fontWeight:700,
      padding:'4px 10px', borderRadius:999, background: ok ? `${TEAL}1a` : 'hsl(var(--muted))',
      color: ok ? TEAL : 'hsl(var(--muted-foreground))' }}>
      <span style={{ width:7, height:7, borderRadius:'50%', background: ok ? TEAL : 'hsl(var(--muted-foreground))' }}/>
      {ok ? okLabel : offLabel}
    </span>
  );
}

export default function ApiSettingsModal({ onClose }) {
  const get = k => (typeof localStorage !== 'undefined' ? (localStorage.getItem(k) || '') : '');
  const cb = withingsCallbackUrl();

  const [v, setV] = useState({
    anthropic: get(LS.anthropic),
    wId: get(LS.withings_id) || WITHINGS_CLIENT_ID,
    sUrl: get(LS.supabase_url) || SUPABASE_URL,
    sKey: get(LS.supabase_key) || SUPABASE_ANON,
    useSb: supabaseEnabled(),
  });
  const [saved, setSaved] = useState(false);
  const [howto, setHowto] = useState(false);
  const [connected, setConnected] = useState(isWithingsConnected());
  const [copied, setCopied] = useState(false);
  const set = (k, val) => { setV(p => ({ ...p, [k]: val })); setSaved(false); };

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = () => {
    const put = (k, val) => { val && val.trim() ? localStorage.setItem(k, val.trim()) : localStorage.removeItem(k); };
    put(LS.anthropic, v.anthropic);
    put(LS.withings_id, v.wId);
    put(LS.supabase_url, v.sUrl);
    put(LS.supabase_key, v.sKey);
    localStorage.setItem('studio_use_supabase', v.useSb ? '1' : '0');
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const connect = () => { save(); window.location.href = withingsAuthorizeUrl(); };
  const disconnect = () => { disconnectWithings(); setConnected(false); };
  const copyCb = () => { try { navigator.clipboard.writeText(cb); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {} };

  const linkBtn = (extra) => ({ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700,
    padding:'8px 13px', borderRadius:10, cursor:'pointer', textDecoration:'none',
    border:'1px solid hsl(var(--border))', background:'hsl(var(--background))', color:'hsl(var(--foreground))', ...extra });

  return createPortal(
    <div onClick={onClose}
      style={{ position:'fixed', inset:0, zIndex:400, display:'flex', alignItems:'center', justifyContent:'center',
        padding:16, background:'rgba(6,6,12,.72)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width:'100%', maxWidth:560, maxHeight:'92vh', overflowY:'auto', borderRadius:24,
          background:'hsl(var(--background))', border:'1px solid hsl(var(--border))',
          boxShadow:'0 30px 80px rgba(0,0,0,.6)', position:'relative' }}>

        <div style={{ position:'sticky', top:0, zIndex:2, padding:'20px 20px 16px',
          background:'linear-gradient(180deg, hsl(var(--background)) 70%, transparent)', borderBottom:'1px solid hsl(var(--border))' }}>
          <div style={{ display:'flex', alignItems:'center', gap:13 }}>
            <div style={{ width:44, height:44, borderRadius:13, display:'grid', placeItems:'center', flexShrink:0,
              background:`linear-gradient(145deg, ${FUCHSIA}, ${VIOLET})`, boxShadow:`0 8px 22px ${FUCHSIA}55` }}>
              <Key size={22} color="#fff"/>
            </div>
            <div style={{ flex:1 }}>
              <p style={{ margin:0, fontSize:19, fontWeight:900, color:'hsl(var(--foreground))', letterSpacing:'-.01em' }}>Ενσωματώσεις & API</p>
              <p style={{ margin:'2px 0 0', fontSize:12, color:'hsl(var(--muted-foreground))' }}>Κλειδιά & συνδέσεις της εφαρμογής</p>
            </div>
            <button onClick={onClose} title="Κλείσιμο"
              style={{ background:'hsl(var(--muted))', border:'none', cursor:'pointer', width:34, height:34,
                borderRadius:10, display:'grid', placeItems:'center', color:'hsl(var(--foreground))' }}>
              <X size={18}/>
            </button>
          </div>
        </div>

        <div style={{ padding:20 }}>
          <div style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'11px 13px', borderRadius:12, marginBottom:18,
            background:`${VIOLET}12`, border:`1px solid ${VIOLET}33` }}>
            <ShieldAlert size={17} style={{ color:VIOLET, flexShrink:0, marginTop:1 }}/>
            <p style={{ margin:0, fontSize:11.5, lineHeight:1.5, color:'hsl(var(--foreground))' }}>
              Τα κλειδιά αποθηκεύονται <b>τοπικά σε αυτή τη συσκευή</b>. Χρησιμοποίησέ τα μόνο στον δικό σου, ιδιωτικό υπολογιστή.
            </p>
          </div>

          {/* Anthropic */}
          <Section icon={Sparkles} tint={FUCHSIA} title="Anthropic (Τεχνητή Νοημοσύνη)"
            subtitle="Το κλειδί για όλες τις AI λειτουργίες. Ισχύει άμεσα — χωρίς νέο deploy."
            badge={<StatusDot ok={!!v.anthropic.trim()} okLabel="Ορίστηκε" offLabel="Κενό"/>}>
            <Field label="API Key" secret mono value={v.anthropic} onChange={val => set('anthropic', val)} placeholder="sk-ant-api03-..." />
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" style={linkBtn()}>
              Console Anthropic <ExternalLink size={13}/>
            </a>
          </Section>

          {/* Withings */}
          <Section icon={Scale} tint={TEAL} title="Withings (ζυγαριά)"
            subtitle="Σύνδεση με τη ζυγαριά Withings για αυτόματη λήψη μετρήσεων σώματος."
            badge={<StatusDot ok={connected} okLabel="Συνδεδεμένο" offLabel="Χωρίς σύνδεση"/>}>
            <Field label="Client ID" mono value={v.wId} onChange={val => set('wId', val)} />

            <label style={{ display:'block', fontSize:11, fontWeight:700, marginBottom:6, color:'hsl(var(--muted-foreground))' }}>Callback URL — βάλ' το ΑΚΡΙΒΩΣ στο Withings dashboard</label>
            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              <input readOnly value={cb} style={{ flex:1, minWidth:0, padding:'11px 13px', borderRadius:11,
                border:'1px solid hsl(var(--border))', background:'hsl(var(--muted))', color:'hsl(var(--foreground))',
                fontSize:12.5, fontFamily:'ui-monospace, Menlo, monospace' }}/>
              <button onClick={copyCb} style={linkBtn({ flexShrink:0 })}>
                {copied ? <Check size={14} style={{ color:TEAL }}/> : <Copy size={14}/>}{copied ? 'OK' : 'Copy'}
              </button>
            </div>

            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {!connected ? (
                <button onClick={connect}
                  style={{ display:'inline-flex', alignItems:'center', gap:7, fontSize:12.5, fontWeight:800,
                    padding:'9px 15px', borderRadius:10, cursor:'pointer', border:'none',
                    background:`linear-gradient(145deg, ${TEAL}, #0891b2)`, color:'#fff', boxShadow:`0 6px 18px ${TEAL}44` }}>
                  <Link2 size={15}/> Σύνδεση με Withings
                </button>
              ) : (
                <button onClick={disconnect} style={linkBtn({ color:'#ef4444', borderColor:'#ef444455' })}>
                  <Unplug size={14}/> Αποσύνδεση
                </button>
              )}
              <button onClick={() => setHowto(h => !h)} style={linkBtn()}>
                Οδηγίες <ChevronDown size={13} style={{ transform: howto ? 'rotate(180deg)' : 'none', transition:'.2s' }}/>
              </button>
            </div>

            {howto && (
              <ol style={{ margin:'14px 0 0', paddingLeft:20, fontSize:12, lineHeight:1.7, color:'hsl(var(--foreground))' }}>
                <li>Στο <b>developer.withings.com</b> → Developer Dashboard → «Add an app».</li>
                <li>Στο <b>Callback URL / Registered URL</b> βάλε ΑΚΡΙΒΩΣ το URL από πάνω (κουμπί Copy).</li>
                <li>Το <b>Client Secret</b> μπαίνει στο <b>Vercel</b> (Settings → Environment Variables → <code>WITHINGS_SECRET</code>) — <b>όχι</b> εδώ, για ασφάλεια.</li>
                <li>Πάτα «Σύνδεση με Withings», δώσε άδεια, και θα γυρίσεις πίσω συνδεδεμένος.</li>
              </ol>
            )}

            <div style={{ display:'flex', gap:9, alignItems:'flex-start', marginTop:14, padding:'10px 12px', borderRadius:11, background:'hsl(var(--muted))' }}>
              <ShieldAlert size={15} style={{ color:'hsl(var(--muted-foreground))', flexShrink:0, marginTop:1 }}/>
              <p style={{ margin:0, fontSize:11, lineHeight:1.5, color:'hsl(var(--muted-foreground))' }}>
                Το Client Secret αποθηκεύεται στο <b>Vercel</b> ως <code>WITHINGS_SECRET</code>, όχι στην εφαρμογή. Στη ζύγιση θα εμφανιστεί κουμπί «Λήψη από Withings».
              </p>
            </div>
          </Section>

          {/* Supabase */}
          <Section icon={Database} tint={VIOLET} title="Supabase (cloud βάση δεδομένων)"
            subtitle="Cloud αποθήκευση αντί για τοπική. Χρειάζεται URL + key ΚΑΙ εκτέλεση του schema (supabase-schema.sql)."
            badge={<StatusDot ok={v.useSb} okLabel="Ενεργό" offLabel="Ανενεργό"/>}>
            <Field label="Project URL" mono value={v.sUrl} onChange={val => set('sUrl', val)} placeholder="https://xxxx.supabase.co" />
            <Field label="anon / public key" secret mono value={v.sKey} onChange={val => set('sKey', val)} placeholder="eyJhbGci..." />
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginTop:4, padding:'11px 13px',
              borderRadius:12, background:'hsl(var(--muted))' }}>
              <div style={{ minWidth:0 }}>
                <p style={{ margin:0, fontSize:13, fontWeight:800, color:'hsl(var(--foreground))' }}>Χρήση Supabase ως βάση</p>
                <p style={{ margin:'2px 0 0', fontSize:11, color:'hsl(var(--muted-foreground))' }}>Απενεργό = τοπική αποθήκευση (ασφαλές). Χρειάζεται reload μετά την αλλαγή.</p>
              </div>
              <button onClick={() => set('useSb', !v.useSb)} aria-pressed={v.useSb}
                style={{ width:46, height:26, borderRadius:999, border:'none', cursor:'pointer', position:'relative', flexShrink:0,
                  background: v.useSb ? TEAL : 'hsl(var(--muted-foreground)/0.35)', transition:'background .2s' }}>
                <span style={{ position:'absolute', top:3, left: v.useSb ? 23 : 3, width:20, height:20, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.3)' }}/>
              </button>
            </div>
            {v.useSb && (
              <div style={{ display:'flex', gap:9, alignItems:'flex-start', marginTop:12, padding:'10px 12px', borderRadius:11, background:`${VIOLET}12`, border:`1px solid ${VIOLET}33` }}>
                <ShieldAlert size={15} style={{ color:VIOLET, flexShrink:0, marginTop:1 }}/>
                <p style={{ margin:0, fontSize:11, lineHeight:1.5, color:'hsl(var(--foreground))' }}>
                  Μόλις πατήσεις Αποθήκευση, κάνε <b>Reload</b> τη σελίδα για να ενεργοποιηθεί. Αν κάτι δεν παίζει, σβήσε τον διακόπτη → επιστρέφεις στην τοπική αποθήκευση.
                </p>
              </div>
            )}
          </Section>
        </div>

        <div style={{ position:'sticky', bottom:0, padding:'14px 20px', display:'flex', gap:12, alignItems:'center',
          background:'linear-gradient(0deg, hsl(var(--background)) 70%, transparent)', borderTop:'1px solid hsl(var(--border))' }}>
          <p style={{ margin:0, flex:1, fontSize:12, fontWeight:700, color: saved ? TEAL : 'hsl(var(--muted-foreground))', display:'flex', alignItems:'center', gap:6 }}>
            {saved && <Check size={15}/>}{saved ? 'Αποθηκεύτηκε' : ''}
          </p>
          <button onClick={save}
            style={{ display:'inline-flex', alignItems:'center', gap:8, fontSize:13.5, fontWeight:800,
              padding:'11px 22px', borderRadius:12, cursor:'pointer', border:'none',
              background:`linear-gradient(145deg, ${FUCHSIA}, ${VIOLET})`, color:'#fff', boxShadow:`0 8px 22px ${FUCHSIA}55` }}>
            <Save size={16}/> Αποθήκευση
          </button>
        </div>
      </div>
    </div>,
    portalTarget()
  );
}
