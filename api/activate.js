/* ── Vercel serverless: ενεργοποίηση λογαριασμού πελάτη ──────────────────────
   Ο πελάτης που ανοίγει το invite link ΔΕΝ είναι συνδεδεμένος, άρα δεν μπορεί
   να διαβάσει/γράψει στη βάση (σωστά — είναι κλειδωμένη). Η επικύρωση του token
   και η δημιουργία λογαριασμού γίνονται εδώ, server-side, με το service κλειδί
   που ζει ΜΟΝΟ στο Vercel (μεταβλητή SUPABASE_SERVICE_KEY — ποτέ στον κώδικα). */

const SB_URL = 'https://tsaxrtclloloxqdtvemq.supabase.co';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const svc = process.env.SUPABASE_SERVICE_KEY;
  if (!svc) { res.status(500).json({ error: 'Λείπει η μεταβλητή SUPABASE_SERVICE_KEY στο Vercel' }); return; }

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};
  const H = { apikey: svc, Authorization: 'Bearer ' + svc, 'Content-Type': 'application/json' };

  try {
    const { action, c, token } = b;
    if (!c || !token) { res.status(200).json({ ok: false, reason: 'invalid' }); return; }

    // Ο πελάτης με το service key (παρακάμπτει RLS — μόνο εδώ, server-side)
    const gr = await fetch(`${SB_URL}/rest/v1/studio_clients?id=eq.${encodeURIComponent(c)}&select=doc&limit=1`, { headers: H });
    const rows = await gr.json().catch(() => []);
    const doc = Array.isArray(rows) ? rows[0]?.doc : null;
    if (!doc || !doc.invite_token || doc.invite_token !== token) {
      res.status(200).json({ ok: false, reason: 'invalid' }); return;
    }

    if (action === 'lookup') {
      res.status(200).json({ ok: true, name: doc.name || '', email: doc.email || '' }); return;
    }

    if (action === 'activate') {
      const email = String(b.email || '').trim().toLowerCase();
      const password = String(b.password || '');
      if (!email || password.length < 6) { res.status(200).json({ ok: false, reason: 'bad_input' }); return; }

      // 1) Λογαριασμός Supabase Auth (admin, με email ήδη επιβεβαιωμένο)
      const cr = await fetch(`${SB_URL}/auth/v1/admin/users`, {
        method: 'POST', headers: H,
        body: JSON.stringify({ email, password, email_confirm: true }),
      });
      const cj = await cr.json().catch(() => ({}));
      if (!cr.ok) {
        const msg = String(cj.msg || cj.error_description || cj.error || '');
        if (!/already|exists|registered/i.test(msg)) {
          res.status(200).json({ ok: false, reason: 'auth', detail: msg }); return;
        }
        // Υπάρχει ήδη auth λογαριασμός με αυτό το email → συνεχίζουμε κανονικά.
      }

      // 2) Ενημέρωση καρτέλας + κατανάλωση token (χωρίς plaintext κωδικό)
      const now = new Date().toISOString();
      const merged = {
        ...doc,
        email: String(b.email).trim(),
        portal_email: email,
        account_status: 'active',
        account_created_at: now,
        invite_token: '',
        updated_date: now,
      };
      delete merged.portal_password;
      const pr = await fetch(`${SB_URL}/rest/v1/studio_clients?id=eq.${encodeURIComponent(c)}`, {
        method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' },
        body: JSON.stringify({ doc: merged, updated_date: now }),
      });
      if (!pr.ok) { res.status(200).json({ ok: false, reason: 'update', detail: 'PATCH ' + pr.status }); return; }

      res.status(200).json({ ok: true }); return;
    }

    res.status(400).json({ error: 'Άγνωστη ενέργεια' });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
