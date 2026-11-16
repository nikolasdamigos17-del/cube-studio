import { db } from './db';

/* Πλήρης διαγραφή πελάτη: καρτέλα + ΟΛΑ τα συνδεδεμένα δεδομένα.
   Κρατάμε σκόπιμα Πληρωμές/Πιστώσεις/Μηνύματα ως ιστορικό. */
export async function deleteClientCascade(clientId) {
  const rel = [
    db.NutritionProfile, db.NutritionMeeting, db.TrainingPlan, db.NutritionPlan,
    db.ClientProgress, db.ClientNote, db.ClientReminder, db.AppointmentRequest,
    db.WaterLog, db.SupplementLog, db.Appointment,
  ];
  for (const ent of rel) {
    try {
      const rows = await ent.filter({ client_id: clientId }, '-created_date', 500);
      for (const r of rows) { try { await ent.delete(r.id); } catch {} }
    } catch {}
  }
  await db.Client.delete(clientId);
}
