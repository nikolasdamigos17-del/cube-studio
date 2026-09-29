import { useState, useEffect } from 'react';
import ClientLayout from '../components/client-portal/ClientLayout';
import { useAppContext } from '../lib/AppContext';
import { db } from '../lib/db';
import { creditBalance, REASON_LABELS, getGroupTrainingBalance } from '../lib/credits';

export default function ClientFinancial() {
  const { clientUser } = useAppContext();
  const [client, setClient] = useState(null);
  const [entries, setEntries] = useState([]);
  const [groupTraining, setGroupTraining] = useState(null);   // κοινό υπόλοιπο αν είναι μέλος group

  useEffect(() => {
    if (!clientUser?.clientId) return;
    Promise.all([
      db.Client.get(clientUser.clientId),
      db.CreditEntry.filter({ client_id: clientUser.clientId }),
    ]).then(([c, e]) => {
      setClient(c);
      setEntries([...e].sort((a, b) => ((b.date || '') + (b.id || '')).localeCompare((a.date || '') + (a.id || ''))));
      if (c?.group_id) db.Group.get(c.group_id).then(g => g && getGroupTrainingBalance(g).then(setGroupTraining));
    });
  }, [clientUser]);

  const bal = creditBalance(entries);
  const inGroup = !!client?.group_id;
  const trainingBal = inGroup && groupTraining !== null ? groupTraining : bal.training;
  const hasNutri = (client?.nutrition_meetings_per_month > 0) || bal.nutrition !== 0;

  return (
    <ClientLayout title="Υπόλοιπα">
      <div className="p-5 space-y-4">

        {/* Υπόλοιπό μου */}
        <div className="rounded-2xl p-5" style={{ background:'linear-gradient(135deg, var(--cp-accent), var(--cp-accent-dim))' }}>
          <p className="text-xs font-medium text-white/70 mb-2">Το υπόλοιπό μου</p>
          <div className="flex gap-8">
            <div>
              <p className="text-4xl font-bold text-white leading-none">{trainingBal}</p>
              <p className="text-xs text-white/75 mt-1.5">🏋️ Προπονήσεις{inGroup?' (group)':''}</p>
            </div>
            {hasNutri && (
              <div>
                <p className="text-4xl font-bold text-white leading-none">{bal.nutrition}</p>
                <p className="text-xs text-white/75 mt-1.5">🥗 Διατροφικές</p>
              </div>
            )}
          </div>
          <p className="text-[11px] text-white/60 mt-3">{inGroup?'Οι προπονήσεις είναι κοινές για το group σου · ':''}Με κάθε αγορά πακέτου προστίθενται · με κάθε ολοκληρωμένο session αφαιρείται 1.</p>
        </div>

        {/* My Plan */}
        {client && (
          <div className="rounded-2xl p-4" style={{ backgroundColor:'var(--cp-card-bg)', border:'1px solid var(--cp-border)' }}>
            <p className="font-semibold text-sm mb-3" style={{ color:'var(--cp-text)' }}>My Plan</p>
            <div className="space-y-2 text-sm">
              {[
                ['Πρόγραμμα', client.services?.replace(/_/g,' ')?.replace(/\b\w/g, l => l.toUpperCase())],
                ['Προπονήσεις', client.sessions_per_week ? `${client.sessions_per_week}× / εβδομάδα · ${client.session_duration_hours || 1}h` : null],
                ['Διατροφικές', client.nutrition_meetings_per_month ? `${client.nutrition_meetings_per_month}× / μήνα` : null],
              ].map(([k, v]) => v && (
                <div key={k} className="flex justify-between">
                  <span style={{ color:'var(--cp-text-dim)' }}>{k}</span>
                  <span className="font-medium" style={{ color:'var(--cp-text)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Κινήσεις υπολοίπου */}
        <div className="rounded-2xl p-4" style={{ backgroundColor:'var(--cp-card-bg)', border:'1px solid var(--cp-border)' }}>
          <p className="font-semibold text-sm mb-2" style={{ color:'var(--cp-text)' }}>Κινήσεις υπολοίπου</p>
          {entries.length === 0 && <p className="text-sm py-2" style={{ color:'var(--cp-text-dim)' }}>Καμία κίνηση ακόμα.</p>}
          <div>
            {entries.slice(0, 40).map(e => (
              <div key={e.id} className="flex items-center gap-3 py-2 text-sm" style={{ borderTop:'1px solid var(--cp-border)' }}>
                <span>{e.kind === 'nutrition' ? '🥗' : '🏋️'}</span>
                <span className="flex-1 min-w-0 truncate" style={{ color:'var(--cp-text-dim)' }}>{REASON_LABELS[e.reason] || e.reason} · {e.date}</span>
                <span className="font-bold" style={{ color:(e.delta || 0) >= 0 ? 'var(--cp-accent)' : '#f87171' }}>{(e.delta || 0) > 0 ? `+${e.delta}` : e.delta}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </ClientLayout>
  );
}
