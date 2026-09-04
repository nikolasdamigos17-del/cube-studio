/* ── Supabase Auth (GoTrue) μέσω fetch — χωρίς εξωτερικές εξαρτήσεις ──────────── */
import { sbUrl, sbAnon } from './supabaseConfig';

function store(session) {
  if (!session?.access_token) return null;
  const s = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: Date.now() + (Number(session.expires_in || 3600) - 60) * 1000,
    user: session.user || null,
  };
  localStorage.setItem('sb_session', JSON.stringify(s));
  return s;
}

export async function sbSignIn(email, password) {
  const r = await fetch(`${sbUrl()}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: sbAnon(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(j.error_description || j.msg || j.error || 'Λάθος email ή κωδικός.');
  return store(j);
}

export async function sbSignUp(email, password) {
  const r = await fetch(`${sbUrl()}/auth/v1/signup`, {
    method: 'POST', headers: { apikey: sbAnon(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json().catch(() => ({}));
  // Αν είναι κλειστό το email confirmation, γυρίζει access_token κατευθείαν.
  if (j.access_token) store(j);
  if (!r.ok && !j.id && !j.user && !j.access_token) {
    throw new Error(j.msg || j.error_description || j.error || 'Αποτυχία δημιουργίας λογαριασμού.');
  }
  return j;
}

export async function sbRefresh() {
  let s; try { s = JSON.parse(localStorage.getItem('sb_session') || 'null'); } catch { s = null; }
  if (!s?.refresh_token) return null;
  const r = await fetch(`${sbUrl()}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST', headers: { apikey: sbAnon(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: s.refresh_token }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) { localStorage.removeItem('sb_session'); return null; }
  return store(j);
}

export async function sbEnsureFresh() {
  let s; try { s = JSON.parse(localStorage.getItem('sb_session') || 'null'); } catch { s = null; }
  if (!s) return null;
  if (Date.now() < (s.expires_at || 0)) return s;
  return sbRefresh();
}

export function sbSignOut() {
  let s; try { s = JSON.parse(localStorage.getItem('sb_session') || 'null'); } catch { s = null; }
  try { if (s?.access_token) fetch(`${sbUrl()}/auth/v1/logout`, { method: 'POST', headers: { apikey: sbAnon(), Authorization: 'Bearer ' + s.access_token } }); } catch {}
  localStorage.removeItem('sb_session');
}
