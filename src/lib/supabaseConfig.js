/* ── Supabase config ─────────────────────────────────────────────────────────
   Το URL + το anon (public) key είναι δημόσια by design → μπαίνουν εδώ.
   (Ποτέ ΔΕΝ βάζουμε εδώ το service_role key.)                                  */

export const SUPABASE_URL  = 'https://tsaxrtclloloxqdtvemq.supabase.co';
export const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzYXhydGNsbG9sb3hxZHR2ZW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MjMzMjEsImV4cCI6MjEwNDA5OTMyMX0.5H3iaIrUUT-1viGEqDgLf5jRFAtdWFHZ91PzLeBVwnU';

export const sbUrl  = () => { try { return (localStorage.getItem('supabase_url') || SUPABASE_URL).replace(/\/+$/, ''); } catch { return SUPABASE_URL; } };
export const sbAnon = () => { try { return localStorage.getItem('supabase_anon_key') || SUPABASE_ANON; } catch { return SUPABASE_ANON; } };

export const supabaseEnabled = () => { try { return localStorage.getItem('studio_use_supabase') !== '0'; } catch { return true; } };

export function sbSession() {
  try { const s = JSON.parse(localStorage.getItem('sb_session') || 'null'); return (s && s.access_token) ? s : null; }
  catch { return null; }
}
export function sbAccessToken() { return sbSession()?.access_token || null; }
