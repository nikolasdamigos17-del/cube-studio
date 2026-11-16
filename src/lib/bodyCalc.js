/* ── Υπολογισμοί σώματος (η ζυγαριά στέλνει μόνο βάρος/σύσταση) ──────────────
   BMI  = βάρος / ύψος²  ·  BMR κατά Mifflin-St Jeor (χρειάζεται ύψος+ηλικία+φύλο) */

export function ageFromDob(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const t = new Date();
  let a = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--;
  return a >= 0 && a < 130 ? a : null;
}

export function calcBodyStats(client, weightKg) {
  const w = Number(weightKg) || null;
  const h = Number(client?.height_cm || client?.height) || null;
  const age = ageFromDob(client?.date_of_birth) ?? (Number(client?.age) || null);
  const g = String(client?.gender || 'male').toLowerCase();
  const male = g.startsWith('m') || g.startsWith('ά') || g.startsWith('α');
  const out = {};
  if (w && h) out.bmi = +(w / Math.pow(h / 100, 2)).toFixed(1);
  if (w && h && age != null) out.bmr = Math.round(10 * w + 6.25 * h - 5 * age + (male ? 5 : -161));
  return out;
}

export function bmiLabel(bmi) {
  if (bmi == null) return '';
  if (bmi < 18.5) return 'Ελλιποβαρής';
  if (bmi < 25)  return 'Φυσιολογικό';
  if (bmi < 30)  return 'Υπέρβαρος';
  return 'Παχυσαρκία';
}
