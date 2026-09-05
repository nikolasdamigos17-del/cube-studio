/* ── Vercel serverless: Withings ασφαλής γέφυρα ──────────────────────────────
   Τρέχει στον server (όχι στον browser) ώστε το CLIENT SECRET να μη φύγει ποτέ
   στο κλιεντ. Το secret διαβάζεται από τη μεταβλητή περιβάλλοντος WITHINGS_SECRET
   που ορίζεις στο Vercel (Settings → Environment Variables).                    */

const OAUTH_URL = 'https://wbsapi.withings.net/v2/oauth2';
const MEASURE_URL = 'https://wbsapi.withings.net/measure';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const secret = process.env.WITHINGS_SECRET;
  if (!secret) { res.status(500).json({ error: 'Λείπει η μεταβλητή WITHINGS_SECRET στο Vercel' }); return; }

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};

  try {
    if (b.action === 'token' || b.action === 'refresh') {
      const form = new URLSearchParams({
        action: 'requesttoken',
        client_id: b.client_id || '',
        client_secret: secret,
      });
      if (b.action === 'token') {
        form.set('grant_type', 'authorization_code');
        form.set('code', b.code || '');
        form.set('redirect_uri', b.redirect_uri || '');
      } else {
        form.set('grant_type', 'refresh_token');
        form.set('refresh_token', b.refresh_token || '');
      }
      const r = await fetch(OAUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });
      const j = await r.json();
      res.status(200).json(j);
      return;
    }

    if (b.action === 'measure') {
      const form = new URLSearchParams({
        action: 'getmeas',
        meastypes: b.meastypes || '1,5,6,8,76,77,88',
        category: String(b.category || 1),
      });
      if (b.lastupdate) {
        form.set('lastupdate', String(b.lastupdate));
      } else {
        const now = Math.floor(Date.now() / 1000);
        form.set('startdate', String(now - 90 * 86400));
        form.set('enddate', String(now + 86400));
      }
      const r = await fetch(MEASURE_URL, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + (b.access_token || ''),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      });
      const j = await r.json();
      res.status(200).json(j);
      return;
    }

    res.status(400).json({ error: 'Άγνωστη ενέργεια' });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
