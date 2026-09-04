import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Dumbbell, Eye, EyeOff, Loader2, CheckCircle2, KeyRound, ArrowLeft, Mail } from 'lucide-react';
import { db } from '../lib/db';
import { supabaseEnabled } from '../lib/supabaseConfig';
import { sbRecover, sbUpdatePassword, parseRecoveryHash } from '../lib/supabaseAuth';

/* /forgot (email-entry) και /reset. Δύο λειτουργίες:
   • Supabase ON  → στέλνει email επαναφοράς· το link γυρίζει με token στο #hash → ορισμός νέου κωδικού.
   • Supabase OFF → τοπικά: επαλήθευση email και ορισμός κωδικού επιτόπου (ή /reset?c=&token=).  */
export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const clientId = params.get('c') || '';
  const token = params.get('token') || '';
  const tokenMode = !!(clientId && token);

  const recoveryToken = parseRecoveryHash();               // από email της Supabase
  const [phase, setPhase] = useState(
    recoveryToken ? 'setpw' : (tokenMode ? 'checking' : 'email')
  ); // email | sent | checking | setpw | done | invalid
  const [sbRecovery] = useState(!!recoveryToken);
  const [client, setClient] = useState(null);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { (async () => {
    if (recoveryToken || !tokenMode) return;
    try {
      const c = await db.Client.get(clientId);
      if (!c || !c.reset_token || c.reset_token !== token) { setPhase('invalid'); return; }
      setClient(c); setPhase('setpw');
    } catch { setPhase('invalid'); }
  })(); }, [tokenMode, clientId, token, recoveryToken]);

  const submitEmail = async () => {
    setErr('');
    if (!email.trim()) { setErr('Συμπλήρωσε το email σου.'); return; }
    setBusy(true);
    if (supabaseEnabled()) {
      try {
        await sbRecover(email.trim().toLowerCase(), window.location.origin + '/reset');
        setPhase('sent');
      } catch (e) { setErr(e.message || 'Αποτυχία αποστολής email.'); }
      setBusy(false);
      return;
    }
    try {
      const clients = await db.Client.list('name');
      const key = email.trim().toLowerCase();
      const c = clients.find(x => (x.portal_email || x.email || '').trim().toLowerCase() === key && x.account_status === 'active');
      if (!c) { setErr('Δεν βρέθηκε ενεργός λογαριασμός με αυτό το email. Επικοινώνησε με τον προπονητή σου.'); setBusy(false); return; }
      setClient(c); setPhase('setpw');
    } catch { setErr('Κάτι πήγε στραβά.'); }
    setBusy(false);
  };

  const savePw = async () => {
    setErr('');
    if (pw.length < 6) { setErr('Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες.'); return; }
    if (pw !== pw2) { setErr('Οι κωδικοί δεν ταιριάζουν.'); return; }
    setBusy(true);
    try {
      if (sbRecovery) { await sbUpdatePassword(pw, recoveryToken); }
      else { await db.Client.update(client.id, { portal_password: pw, reset_token: '' }); }
      setPhase('done');
    } catch (e) { setErr(e.message || 'Κάτι πήγε στραβά.'); setBusy(false); }
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

  if (phase === 'checking') return <Shell><div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground"/></div></Shell>;

  if (phase === 'invalid') return (
    <Shell>
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4"><KeyRound className="w-7 h-7 text-red-500"/></div>
        <h2 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily:'var(--font-display)' }}>Μη έγκυρος σύνδεσμος</h2>
        <p className="text-sm text-muted-foreground mb-5">Ο σύνδεσμος επαναφοράς δεν είναι έγκυρος ή έχει λήξει.</p>
        <button onClick={()=>navigate('/')} className="btn btn-secondary w-full">Πίσω στην είσοδο</button>
      </div>
    </Shell>
  );

  if (phase === 'sent') return (
    <Shell>
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4"><Mail className="w-7 h-7 text-emerald-500"/></div>
        <h2 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily:'var(--font-display)' }}>Έλεγξε το email σου</h2>
        <p className="text-sm text-muted-foreground mb-5">Αν υπάρχει λογαριασμός με αυτό το email, στείλαμε σύνδεσμο επαναφοράς κωδικού. Άνοιξέ τον για να ορίσεις νέο κωδικό.</p>
        <button onClick={()=>navigate('/')} className="btn btn-secondary w-full">Πίσω στην είσοδο</button>
      </div>
    </Shell>
  );

  if (phase === 'done') return (
    <Shell>
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-7 h-7 text-emerald-500"/></div>
        <h2 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily:'var(--font-display)' }}>Ο κωδικός άλλαξε</h2>
        <p className="text-sm text-muted-foreground mb-5">Μπες τώρα στην εφαρμογή με το email και τον νέο σου κωδικό.</p>
        <button onClick={()=>navigate('/')} className="btn btn-primary w-full">Είσοδος</button>
      </div>
    </Shell>
  );

  if (phase === 'email') return (
    <Shell>
      <button onClick={()=>navigate('/')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="w-4 h-4"/> Είσοδος</button>
      <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily:'var(--font-display)' }}>Ξέχασες τον κωδικό;</h2>
      <p className="text-sm text-muted-foreground mb-6">Δώσε το email του λογαριασμού σου{supabaseEnabled() ? ' και θα σου στείλουμε σύνδεσμο επαναφοράς.' : ' για να ορίσεις νέο κωδικό.'}</p>
      <div className="space-y-4">
        <div><label className="section-label">Email</label><input value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitEmail()} className="input-base mt-1" type="email"/></div>
        {err && <p className="text-sm text-red-500">{err}</p>}
        <button onClick={submitEmail} disabled={busy} className="btn btn-primary w-full">{busy?<Loader2 className="w-4 h-4 animate-spin"/>:(supabaseEnabled()?'Αποστολή συνδέσμου':'Συνέχεια')}</button>
      </div>
    </Shell>
  );

  // setpw
  return (
    <Shell>
      <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily:'var(--font-display)' }}>Νέος κωδικός</h2>
      <p className="text-sm text-muted-foreground mb-6">{client?.name?`${client.name.split(' ')[0]}, ό`:'Ό'}ρισε τον νέο σου κωδικό.</p>
      <div className="space-y-4">
        <div>
          <label className="section-label">Νέος κωδικός</label>
          <div className="relative mt-1">
            <input value={pw} onChange={e=>setPw(e.target.value)} className="input-base pr-10" type={showPw?'text':'password'} placeholder="τουλάχιστον 6 χαρακτήρες"/>
            <button onClick={()=>setShowPw(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPw?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button>
          </div>
        </div>
        <div><label className="section-label">Επιβεβαίωση</label><input value={pw2} onChange={e=>setPw2(e.target.value)} className="input-base mt-1" type={showPw?'text':'password'}/></div>
        {err && <p className="text-sm text-red-500">{err}</p>}
        <button onClick={savePw} disabled={busy} className="btn btn-primary w-full">{busy?<Loader2 className="w-4 h-4 animate-spin"/>:'Αποθήκευση κωδικού'}</button>
      </div>
    </Shell>
  );
}
