import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAppContext } from '../lib/AppContext';
import { useLang } from '../lib/LangContext';
import { db } from '../lib/db';
import { supabaseEnabled } from '../lib/supabaseConfig';
import { sbSignIn } from '../lib/supabaseAuth';

const MASTER_EMAIL = 'nikolasdamigos17@gmail.com';
const MASTER_PASSWORD = 'neymarlol12';

export default function LoginGate() {
  const { loginAsMaster, loginAsClient } = useAppContext();
  const navigate = useNavigate();
  const { tr } = useLang();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const doLogin = async () => {
    if (!email || !password) return;
    setLoading(true); setErr('');
    await new Promise(r => setTimeout(r, 400));

    // ── Supabase mode: κανονικό Auth ──────────────────────────────────────────
    if (supabaseEnabled()) {
      const key = email.trim().toLowerCase();
      try {
        await sbSignIn(key, password);
      } catch (e) { setErr(e.message || 'Λάθος email ή κωδικός.'); setLoading(false); return; }
      // Ρόλος: προπονητής (master email) ή πελάτης (ταιριάζει σε καρτέλα)
      if (key === MASTER_EMAIL.toLowerCase()) { loginAsMaster(); return; }
      try {
        const clients = await db.Client.list('name');
        const match = clients.find(c =>
          (c.portal_email || '').trim().toLowerCase() === key || (c.email || '').trim().toLowerCase() === key);
        if (match) { loginAsClient({ ...match, clientId: match.id }); return; }
        setErr('Ο λογαριασμός δεν αντιστοιχεί σε προπονητή ή πελάτη.');
      } catch (e) { setErr('Σφάλμα ανάγνωσης δεδομένων: ' + (e.message || e)); }
      setLoading(false);
      return;
    }

    // Trainer (master)
    if (email.trim().toLowerCase() === MASTER_EMAIL.toLowerCase() && password === MASTER_PASSWORD) {
      loginAsMaster();
      return;
    }

    // Client
    try {
      const clients = await db.Client.list('name');
      const key = email.trim().toLowerCase();
      const match = clients.find(c =>
        ((c.portal_email || '').trim().toLowerCase() === key || (c.email || '').trim().toLowerCase() === key) &&
        c.portal_password === password
      );
      if (match) { loginAsClient({ ...match, clientId: match.id }); return; }
    } catch (e) {
      console.error('Login error:', e);
      setErr('Σφάλμα σύνδεσης. Δοκίμασε ξανά.');
      setLoading(false);
      return;
    }

    setErr('Λάθος email ή κωδικός. Δοκίμασε ξανά.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Centered form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-xl bg-foreground flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-background" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Cube</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: 'var(--font-display)' }}>{tr('login_welcome')}</h2>
          <p className="text-sm text-muted-foreground mb-8">Σύνδεση στον λογαριασμό σου</p>

          <div className="space-y-4">
            <div>
              <label className="section-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doLogin()}
                placeholder="your@email.com"
                className="input-base mt-1"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="section-label">Κωδικός</label>
              <div className="relative mt-1">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doLogin()}
                  placeholder="••••••••"
                  className="input-base pr-11"
                  autoComplete="current-password"
                />
                <button
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="text-right mt-1.5">
                <button onClick={() => navigate('/forgot')} className="text-xs font-medium text-muted-foreground hover:text-foreground">Ξέχασες τον κωδικό;</button>
              </div>
            </div>

            {err && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 animate-slide-up">
                {err}
              </div>
            )}

            <button
              onClick={doLogin}
              disabled={loading || !email || !password}
              className="btn btn-primary w-full py-3 mt-2"
              style={{ fontSize: 15 }}
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{tr('login_signing')}</> : tr('login_btn')}
            </button>

            {supabaseEnabled() && (
              <button
                onClick={() => { try { localStorage.setItem('studio_use_supabase','0'); } catch {} window.location.reload(); }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-3"
              >
                Πρόβλημα σύνδεσης; Τοπική λειτουργία
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
