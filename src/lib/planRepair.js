import { resolvePlanType, SESSION_TYPE_LABELS } from './gymEquipment';

/* ── Αυτόματη επιδιόρθωση προπονήσεων ─────────────────────────────────────────
   Παλιότερο σφάλμα του Workout Creator αποθήκευε στον «τύπο» της προπόνησης ένα
   αντικείμενο αντί για κείμενο (και τίτλους «[object Object] — …»). Τέτοιες
   εγγραφές έριχναν την καρτέλα του πελάτη στο Training Center. Εδώ εντοπίζονται,
   διορθώνονται (ο τύπος συμπεραίνεται από τις ίδιες τις ασκήσεις) και γράφονται
   πίσω στη βάση μία φορά. */

const BAD_TITLE = /\[object Object\]/g;

export const planNeedsRepair = (p) => {
  if (!p) return false;
  const st = p.session_type;
  const badType = st != null && typeof st !== 'string';
  const badTitle = p.title != null && (typeof p.title !== 'string' || BAD_TITLE.test(p.title));
  BAD_TITLE.lastIndex = 0;
  return badType || badTitle;
};

export const repairedFields = (p) => {
  const rawTitle = typeof p.title === 'string' ? p.title : '';
  const stripped = rawTitle.replace(BAD_TITLE, '').replace(/^\s*[—–-]\s*/, '').trim();
  const type = resolvePlanType({ session_type: typeof p.session_type === 'string' ? p.session_type : null, title: stripped, exercises: p.exercises }) || '';
  const label = SESSION_TYPE_LABELS[type] || 'Προπόνηση';
  let title = rawTitle;
  if (typeof p.title !== 'string' || BAD_TITLE.test(rawTitle)) {
    BAD_TITLE.lastIndex = 0;
    const who = stripped || String(p.client_name || '').split(' ')[0];
    title = who ? `${label} — ${who}` : label;
  }
  BAD_TITLE.lastIndex = 0;
  return { session_type: type, title };
};

/* Επιστρέφει αμέσως τη διορθωμένη λίστα για εμφάνιση· οι εγγραφές στη βάση
   γίνονται στο παρασκήνιο και δεν μπλοκάρουν ποτέ τη σελίδα. */
export function repairPlans(db, plans) {
  const toFix = [];
  const out = (plans || []).map(p => {
    if (!planNeedsRepair(p)) return p;
    const patch = repairedFields(p);
    toFix.push([p.id, patch]);
    return { ...p, ...patch };
  });
  if (toFix.length) {
    (async () => {
      for (const [id, patch] of toFix) {
        try { await db.TrainingPlan.update(id, patch); } catch (e) { console.warn('[planRepair] δεν γράφτηκε η διόρθωση', id, e); }
      }
    })();
  }
  return out;
}
