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

/* ── Groups: το group παίρνει τις ΠΡΟΠΟΝΗΣΕΙΣ ενιαία· η διατροφή μένει ανά άτομο ──
   Group training balance = εγγραφές με group_id ΤΟΥ group Ή client_id μέλους
   (έτσι μετράνε αυτόματα και τα προϋπάρχοντα υπόλοιπα των μελών — χωρίς migration). */

export const groupTrainingBalance = (entries, group) => {
  const ids = new Set(group?.member_ids || []);
  return (entries || [])
    .filter(e => e.kind !== 'nutrition' && (e.group_id === group.id || ids.has(e.client_id)))
    .reduce((a, e) => a + (Number(e.delta) || 0), 0);
};

/* όλες οι training εγγραφές που "ανήκουν" στο group (group-level + των μελών) */
export const groupTrainingEntries = (entries, group) => {
  const ids = new Set(group?.member_ids || []);
  return (entries || []).filter(e => e.kind !== 'nutrition' && (e.group_id === group.id || ids.has(e.client_id)));
};

export async function getGroupTrainingBalance(group) {
  const parts = await Promise.all([
    db.CreditEntry.filter({ group_id: group.id }),
    ...(group.member_ids || []).map(id => db.CreditEntry.filter({ client_id: id })),
  ]);
  return groupTrainingBalance(parts.flat(), group);
}

/* χρέωση/πίστωση προπονήσεων στο GROUP (client_id κενό, φέρει group_id) */
export async function addGroupCredit(groupId, delta, reason, ref_id, note) {
  return db.CreditEntry.create({
    group_id: groupId, client_id: '', kind: 'training', delta,
    reason: reason || 'adjust', ref_id: ref_id || null, note: note || '',
    date: new Date().toISOString().split('T')[0],
  });
}

export const REASON_LABELS = {
  purchase: 'Αγορά πακέτου',
  session:  'Προπόνηση (Live)',
  meeting:  'Διατροφική συνάντηση',
  adjust:   'Χειροκίνητη προσαρμογή',
};
