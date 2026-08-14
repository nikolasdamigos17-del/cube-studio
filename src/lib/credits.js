import { db } from './db';

/* Υπόλοιπο "με το κομμάτι": ΠΑΝΤΑ derived από το ledger (credit_entries) — μία πηγή αλήθειας. */

export const creditBalance = (entries) =>
  (entries || []).reduce((acc, e) => {
    const k = e.kind === 'nutrition' ? 'nutrition' : 'training';
    acc[k] += Number(e.delta) || 0;
    return acc;
  }, { training: 0, nutrition: 0 });

export async function getBalance(clientId) {
  const entries = await db.CreditEntry.filter({ client_id: clientId });
  return creditBalance(entries);
}

export async function addCredit(clientId, kind, delta, reason, ref_id, note) {
  return db.CreditEntry.create({
    client_id: clientId, kind, delta,
    reason: reason || 'adjust',            /* purchase | session | meeting | adjust */
    ref_id: ref_id || null, note: note || '',
    date: new Date().toISOString().split('T')[0],
  });
}

export const REASON_LABELS = {
  purchase: 'Αγορά πακέτου',
  session:  'Προπόνηση (Live)',
  meeting:  'Διατροφική συνάντηση',
  adjust:   'Χειροκίνητη προσαρμογή',
};
