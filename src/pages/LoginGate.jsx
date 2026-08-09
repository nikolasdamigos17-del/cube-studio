import { useState } from 'react';
import { Dumbbell, Eye, EyeOff, Loader2, Zap } from 'lucide-react';
import { useAppContext } from '../lib/AppContext';
import logo from '../assets/logo-cube.png';
import { useLang } from '../lib/LangContext';
import { db } from '../lib/db';

const MASTER_EMAIL = 'nikolasdamigos17@gmail.com';
const MASTER_PASSWORD = 'neymarlol12';

export default function LoginGate() {
  const { loginAsMaster, loginAsClient } = useAppContext();
  const { lang, toggle: toggleLang, tr } = useLang();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [quickOpen, setQuickOpen] = useState(false);

  const doLogin = async () => {
    if (!email || !password) return;
    setLoading(true); setErr('');
    await new Promise(r => setTimeout(r, 500));

    // Master login
    if (email.trim() === MASTER_EMAIL && password === MASTER_PASSWORD) {
      loginAsMaster();
      return;
    }

    // Client login
    try {
      const clients = await db.Client.list('name');
      const match = clients.find(c =>
        c.email?.trim().toLowerCase() === email.trim().toLowerCase() &&
        c.portal_password === password
      );
      if (match) {
        loginAsClient({ ...match, clientId: match.id });
        return;
      }
    } catch (e) {
      console.error('Login error:', e);
    }

    setErr('Incorrect email or password. Please try again.');
    setLoading(false);
  };

  const quickLogin = async (mode) => {
    setLoading(true); setErr('');
    await new Promise(r => setTimeout(r, 300));
    if (mode === 'master') {
      loginAsMaster();
      return;
    }
    try {
      const clients = await db.Client.list('name');
      if (clients[0]) {
        loginAsClient({ ...clients[0], clientId: clients[0].id });
        return;
      }
      setErr('No demo clients found. The app will seed data on first load.');
    } catch (e) {
      setErr('Could not load clients.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left — dark brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-foreground p-10 flex-shrink-0" style={{ width: 400 }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-background/10 flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-background" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-background" style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>Cube</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-background leading-tight mb-4"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
            The Cube.<br />Personal Training Studio.
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Training plans, nutrition, client progress and payments — all in one workspace built for personal trainers.
          </p>
          <div className="mt-8 space-y-3">
            {['AI-powered training & nutrition plans', 'Hevy workout sync', 'Client portal included', 'Full logistics & billing'].map(f => (
              <div key={f} className="flex items-center gap-3 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-white/40 flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Personal Training Studio</p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-slide-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-xl bg-foreground flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-background" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Cube</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: 'var(--font-display)' }}>{tr('login_welcome')}</h2>
          <p className="text-sm text-muted-foreground mb-8">Sign in to your Cube account</p>

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
              <label className="section-label">Password</label>
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
          </div>

          {/* Quick access */}
          <div className="mt-8 border-t border-border pt-6">
            <button
              onClick={() => setQuickOpen(v => !v)}
              className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              Quick access for demo
              <span className="ml-1">{quickOpen ? '▲' : '▼'}</span>
            </button>

            {quickOpen && (
              <div className="grid grid-cols-2 gap-3 mt-4 animate-slide-up">
                <button
                  onClick={() => quickLogin('master')}
                  disabled={loading}
                  className="btn btn-secondary flex-col gap-1.5 py-4 h-auto"
                >
                  <Dumbbell className="w-5 h-5" />
                  <span className="font-semibold text-sm">Trainer</span>
                  <span className="text-xs text-muted-foreground">Master app</span>
                </button>
                <button
                  onClick={() => quickLogin('client')}
                  disabled={loading}
                  className="btn btn-secondary flex-col gap-1.5 py-4 h-auto"
                >
                  <span className="text-xl">👤</span>
                  <span className="font-semibold text-sm">Client</span>
                  <span className="text-xs text-muted-foreground">Alex Mitchell</span>
                </button>
              </div>
            )}
          </div>

          {/* Credentials hint */}
          <div className="mt-6 bg-muted rounded-xl p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground mb-2">Login credentials</p>
            <p><span className="font-medium">Trainer:</span> nikolasdamigos17@gmail.com / neymarlol12</p>
            <p><span className="font-medium">Client (Alex):</span> alex.mitchell@email.com / Alex2024!</p>
            <p><span className="font-medium">Client (Maria):</span> maria.papadaki@email.com / Maria2024!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
