/* ── Vercel serverless: AI proxy ─────────────────────────────────────────────
   Το Anthropic API key ζει ΜΟΝΟ εδώ (μεταβλητή ANTHROPIC_API_KEY στο Vercel) —
   ποτέ στον browser, ποτέ στον κώδικα. Έτσι το AI δουλεύει σε ΚΑΘΕ συσκευή
   (Mac, PC, κινητό, TV) χωρίς καμία ρύθμιση ανά συσκευή.                       */

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { res.status(500).json({ error: { message: 'Λείπει η μεταβλητή ANTHROPIC_API_KEY στο Vercel' } }); return; }

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};
  const prompt = String(b.prompt || '');
  const system = String(b.system || 'You are a helpful fitness and nutrition assistant.');
  if (!prompt) { res.status(400).json({ error: { message: 'Λείπει το prompt' } }); return; }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const j = await r.json().catch(() => ({}));
    res.status(r.ok ? 200 : r.status).json(j);
  } catch (e) {
    res.status(500).json({ error: { message: String((e && e.message) || e) } });
  }
}
