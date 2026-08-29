import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Dumbbell, Eye, EyeOff, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { db } from '../lib/db';
import { useAppContext } from '../lib/AppContext';

export default function ActivateAccount() {
  const [params] = useSearchParams();
  const clientId = params.get('c') || '';
  const token = params.get('token') || '';
  const { loginAsClient, appMode } = useAppContext();

  const [state, setState] = useState('checking');  // checking | ok | invalid | done
  const [client, setClient] = useState(null);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { (async () => {
    if (!clientId || !token) { setState('invalid'); return; }
    try {
      const c = await db.Client.get(clientId);
      if (!c || !c.invite_token || c.invite_token !== token) { setState('invalid'); return; }
      setClient(c); setEmail(c.email || ''); setState('ok');
    } catch { setState('invalid'); }
  })(); }, [clientId, token]);

  const submit = async () => {
    setErr('');
    if (!email.trim()) { setErr('Συμπλήρωσε το email σου.'); return; }
    if (pw.length < 6) { setErr('Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες.'); return; }
    if (pw !== pw2) { setErr('Οι κωδικοί δεν ταιριάζουν.'); return; }
    setSaving(true);
    const patch = {
      email: email.trim(), portal_email: email.trim().toLowerCase(), portal_password: pw,
      account_status: 'active', account_created_at: new Date().toISOString(), invite_token: '',
    };
    try {
      await db.Client.update(client.id, patch);
      setState('done');
      /* Ο πελάτης συνδέεται αυτόματα· αν το ανοίγει ο προπονητής (master) για δοκιμή, ΔΕΝ του αλλάζουμε session. */
      if (appMode !== 'master') setTimeout(() => loginAsClient({ ...client, ...patch, clientId: client.id }), 1400);
    } catch { setErr('Κάτι πήγε στραβά. Δοκίμασε ξανά.'); setSaving(false); }
  };

  const Shell = ({ children }) => (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center"><Dumbbell className="w-5 h-5 text-background" strokeWidth={2.5}/></div>
          <span className="font-bold text-foreground text-lg" style={{ fontFamily:'var(--font-display)' }}>The Cube</span>
        </div>
        {children}
      </div>
    </div>
  );

  if (state === 'checking') return <Shell><div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground"/></div></Shell>;

  if (state === 'invalid') return (
    <Shell>
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4"><ShieldAlert className="w-7 h-7 text-red-500"/></div>
        <h2 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily:'var(--font-display)' }}>Μη έγκυρη πρόσκληση</h2>
        <p className="text-sm text-muted-foreground">Ο σύνδεσμος δεν είναι έγκυρος ή έχει ήδη χρησιμοποιηθεί. Ζήτησε από τον προπονητή σου νέα πρόσκληση.</p>
      </div>
    </Shell>
  );

  if (state === 'done') return (
    <Shell>
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-7 h-7 text-emerald-500"/></div>
        <h2 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily:'var(--font-display)' }}>Έτοιμος! 🎉</h2>
        <p className="text-sm text-muted-foreground">{appMode === 'master' ? 'Ο λογαριασμός δημιουργήθηκε. Ο πελάτης μπαίνει πλέον με το email και τον κωδικό του.' : 'Ο λογαριασμός σου δημιουργήθηκε. Σε συνδέουμε στην εφαρμογή σου…'}</p>
      </div>
    </Shell>
  );

  return (
    <Shell>
      <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily:'var(--font-display)' }}>Καλωσόρισες{client?.name?`, ${client.name.split(' ')[0]}`:''}!</h2>
      <p className="text-sm text-muted-foreground mb-6">Δημιούργησε τον λογαριασμό σου για να μπαίνεις στην εφαρμογή.</p>
      <div className="space-y-4">
        <div>
          <label className="section-label">Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} className="input-base mt-1" type="email" autoComplete="email"/>
        </div>
        <div>
          <label className="section-label">Κωδικός</label>
          <div className="relative mt-1">
            <input value={pw} onChange={e=>setPw(e.target.value)} className="input-base pr-10" type={showPw?'text':'password'} placeholder="τουλάχιστον 6 χαρακτήρες"/>
            <button onClick={()=>setShowPw(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPw?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button>
          </div>
        </div>
        <div>
          <label className="section-label">Επιβεβαίωση κωδικού</label>
          <input value={pw2} onChange={e=>setPw2(e.target.value)} className="input-base mt-1" type={showPw?'text':'password'}/>
        </div>
        {err && <p className="text-sm text-red-500">{err}</p>}
        <button onClick={submit} disabled={saving} className="btn btn-primary w-full">{saving?<Loader2 className="w-4 h-4 animate-spin"/>:'Δημιουργία λογαριασμού'}</button>
      </div>
    </Shell>
  );
}
