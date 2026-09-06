/* ── Withings integration (frontend) ────────────────────────────────────────
   Το Client ID είναι ημι-δημόσιο (φαίνεται στο URL εξουσιοδότησης) → μπαίνει εδώ.
   Το Client SECRET ΔΕΝ μπαίνει ποτέ στον κώδικα — ζει ως μεταβλητή περιβάλλοντος
   στο Vercel (WITHINGS_SECRET) και το χρησιμοποιεί μόνο το /api/withings.        */

export const WITHINGS_CLIENT_ID = 'f93b0a7b9675c3fa7c06c8819dc8855fd540ecdb091248aa504e82df03357033';
export const WITHINGS_SCOPE = 'user.info,user.metrics,user.activity';

export const withingsCallbackUrl = () =>
  (typeof window !== 'undefined' ? window.location.origin : '') + '/withings-callback';

export function withingsAuthorizeUrl() {
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
  try { localStorage.setItem('withings_state', state); } catch {}
  const p = new URLSearchParams({
    response_type: 'code',
    client_id: WITHINGS_CLIENT_ID,
    state,
    scope: WITHINGS_SCOPE,
    redirect_uri: withingsCallbackUrl(),
  });
  return 'https://account.withings.com/oauth2_user/authorize2?' + p.toString();
}

export function isWithingsConnected() {
  try { return !!JSON.parse(localStorage.getItem('withings_tokens') || 'null')?.access_token; }
  catch { return false; }
}

export function disconnectWithings() {
  try { localStorage.removeItem('withings_tokens'); localStorage.removeItem('withings_state'); } catch {}
}

function saveTokens(b) {
  const tok = {
    access_token: b.access_token,
    refresh_token: b.refresh_token,
    userid: b.userid,
    expires_at: Date.now() + (Number(b.expires_in || 10800) - 60) * 1000,
  };
  localStorage.setItem('withings_tokens', JSON.stringify(tok));
  return tok;
}

/* Ανταλλαγή του authorization code με tokens (μέσω του δικού μας serverless). */
export async function withingsExchangeCode(code) {
  const r = await fetch('/api/withings', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'token', code, client_id: WITHINGS_CLIENT_ID, redirect_uri: withingsCallbackUrl() }),
  });
  const j = await r.json().catch(() => ({}));
  if (j.status !== 0 || !j.body?.access_token) {
    throw new Error(j.error || ('Withings token error (status ' + j.status + ')'));
  }
  return saveTokens(j.body);
}

async function getValidAccessToken() {
  const tok = JSON.parse(localStorage.getItem('withings_tokens') || 'null');
  if (!tok?.access_token) throw new Error('Το Withings δεν είναι συνδεδεμένο');
  if (Date.now() < (tok.expires_at || 0)) return tok.access_token;
  const r = await fetch('/api/withings', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'refresh', refresh_token: tok.refresh_token, client_id: WITHINGS_CLIENT_ID }),
  });
  const j = await r.json().catch(() => ({}));
  if (j.status !== 0 || !j.body?.access_token) throw new Error('Λήξη σύνδεσης Withings — ξανασυνδέσου.');
  return saveTokens(j.body).access_token;
}

/* meastype → πεδίο. 1=βάρος, 6=λίπος%, 76=μυϊκή μάζα, 77=νερό%, 88=οστά, 5=άλιπη, 8=λίπος(kg) */
const MT = { 1: 'weight', 6: 'fat_pct', 76: 'muscle', 77: 'water', 88: 'bone', 5: 'fat_free', 8: 'fat_mass' };

function parseGrp(g) {
  const out = { date: g.date * 1000 };
  for (const m of (g.measures || [])) { const k = MT[m.type]; if (k) out[k] = +(m.value * Math.pow(10, m.unit)).toFixed(1); }
  return out;
}

/* Οι πιο πρόσφατες ζυγίσεις (για επιλογή από τον trainer). */
export async function fetchRecentWithingsMeasures(limit = 6) {
  const access_token = await getValidAccessToken();
  const r = await fetch('/api/withings', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'measure', access_token, meastypes: '1,5,6,8,76,77,88', category: 1 }),
  });
  const j = await r.json().catch(() => ({}));
  if (j.status !== 0) throw new Error('Withings measure error (status ' + j.status + ')');
  const grps = (j.body?.measuregrps || []).slice().sort((a, b) => b.date - a.date);
  return grps.map(parseGrp).filter(m => m.weight != null).slice(0, limit);
}

/* Αποθήκευση ΣΥΓΚΕΚΡΙΜΕΝΗΣ ζύγισης στον πελάτη (+ extra π.χ. bmi/bmr). */
export async function saveWithingsMeasureToClient(db, clientId, m, extra = {}) {
  return db.ClientProgress.create({
    client_id: clientId,
    date: new Date(m.date || Date.now()).toISOString().split('T')[0],
    weight_kg: m.weight,
    body_fat_pct: m.fat_pct ?? null,
    muscle_mass_kg: m.muscle ?? null,
    body_water_pct: m.water ?? null,
    source: 'withings',
    ...extra,
  });
}

/* Πιο πρόσφατη μέτρηση (προαιρετικά μόνο μετά από sinceMs). */
export async function fetchLatestWithingsMeasure(sinceMs) {
  const access_token = await getValidAccessToken();
  const body = { action: 'measure', access_token, meastypes: '1,5,6,8,76,77,88', category: 1 };
  if (sinceMs) body.lastupdate = Math.floor(sinceMs / 1000);
  const r = await fetch('/api/withings', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (j.status !== 0) throw new Error('Withings measure error (status ' + j.status + ')');
  const grps = (j.body?.measuregrps || []).slice().sort((a, b) => b.date - a.date);
  if (!grps.length) return null;
  const g = grps[0];
  const out = { date: g.date * 1000 };
  for (const m of (g.measures || [])) { const k = MT[m.type]; if (k) out[k] = +(m.value * Math.pow(10, m.unit)).toFixed(1); }
  return out; // { date, weight, fat_pct, muscle, water, bone, fat_free, fat_mass }
}

/* Τραβά την τελευταία ζύγιση και τη γράφει ως μέτρηση του πελάτη (ClientProgress).
   Το υπάρχον polling των οθονών την «πιάνει» αυτόματα. */
export async function syncWithingsToClient(db, clientId) {
  const m = await fetchLatestWithingsMeasure();
  if (!m || m.weight == null) throw new Error('Δεν βρέθηκε πρόσφατη ζύγιση στο Withings.');
  return db.ClientProgress.create({
    client_id: clientId,
    date: new Date(m.date || Date.now()).toISOString().split('T')[0],
    weight_kg: m.weight,
    body_fat_pct: m.fat_pct ?? null,
    muscle_mass_kg: m.muscle ?? null,
    body_water_pct: m.water ?? null,
    source: 'withings',
  });
}
