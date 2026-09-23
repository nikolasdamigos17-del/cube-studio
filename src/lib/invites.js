/* Λογαριασμοί πελατών: πρόσκληση-κλειδί + reset — helpers */

export const genToken = () =>
  (Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10) + Date.now().toString(36));

export const appOrigin = () => (typeof window !== 'undefined' ? window.location.origin : '');

export const activationLink = (c) => `${appOrigin()}/activate?c=${c.id}&token=${c.invite_token || ''}`;
export const resetLink = (c) => `${appOrigin()}/reset?c=${c.id}&token=${c.reset_token || ''}`;

export const inviteMailto = (c) => {
  const link = activationLink(c);
  const first = (c.name || '').trim().split(/\s+/)[0] || '';
  const subj = encodeURIComponent('Πρόσκληση στην εφαρμογή The Cube 💪');
  const body = encodeURIComponent(
    `Γεια σου ${first}!\n\n` +
    `Ο προπονητής σου σε προσκαλεί στην προσωπική σου εφαρμογή The Cube.\n\n` +
    `Πάτησε τον παρακάτω σύνδεσμο για να δημιουργήσεις τον λογαριασμό σου (email + κωδικός):\n\n` +
    `${link}\n\n` +
    `Μόλις τον δημιουργήσεις, μπαίνεις στην εφαρμογή με το email και τον κωδικό σου — εκεί θα βλέπεις τις προπονήσεις, τη διατροφή, την πρόοδο και τα υπόλοιπά σου.\n\n` +
    `Τα λέμε στο γυμναστήριο!`
  );
  return `mailto:${c.email || ''}?subject=${subj}&body=${body}`;
};

export const accountStatusLabel = (c) => {
  if (c?.account_status === 'active') return 'Ενεργός λογαριασμός';
  if (c?.account_status === 'invited') return 'Στάλθηκε πρόσκληση';
  return 'Χωρίς λογαριασμό';
};
