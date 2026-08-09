import { useState, useEffect } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { CreditCard, Calendar, TrendingUp, Clock } from 'lucide-react';
import ClientLayout from '../components/client-portal/ClientLayout';
import { useAppContext } from '../lib/AppContext';
import { db } from '../lib/db';

const METHOD_EMOJI = { cash:'💵', card:'💳', transfer:'🏦', other:'📄' };

export default function ClientFinancial() {
  const { clientUser } = useAppContext();
  const [client, setClient] = useState(null);
  const [payments, setPayments] = useState([]);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    if (!clientUser?.clientId) return;
    Promise.all([db.Client.get(clientUser.clientId), db.Payment.filter({client_id:clientUser.clientId},'-paid_date'), db.Appointment.filter({client_id:clientUser.clientId},'-date')]).then(([c,p,a])=>{setClient(c);setPayments(p);setAppointments(a);});
  }, [clientUser]);

  const now = new Date();
  const latestPayment = payments.find(p => p.period_to);
  const daysLeft = latestPayment ? differenceInDays(parseISO(latestPayment.period_to), now) : null;
  const todayStr = format(now, 'yyyy-MM-dd');
  const completedAppts = appointments.filter(a => a.status === 'completed' || a.date < todayStr).length;
  const totalPaid = payments.reduce((s,p) => s + (p.amount||0), 0);

  return (
    <ClientLayout title="Financial">
      <div className="p-5 space-y-4">
        {/* Status card */}
        <div className="rounded-2xl p-5" style={{background:'linear-gradient(135deg, var(--cp-accent), var(--cp-accent-dim))'}}>
          <p className="text-xs font-medium text-white/70 mb-1">Subscription Status</p>
          {daysLeft !== null ? (
            <>
              <p className="text-3xl font-bold text-white">{Math.max(0,daysLeft)} <span className="text-lg font-normal">days</span></p>
              <p className="text-sm text-white/80 mt-1">{daysLeft < 0 ? 'Expired — please renew' : daysLeft <= 5 ? '⚠️ Expiring soon! Talk to your trainer' : 'Remaining in current plan'}</p>
              {latestPayment?.period_to && <p className="text-xs text-white/60 mt-2">Coverage until {format(parseISO(latestPayment.period_to),'MMMM d, yyyy')}</p>}
            </>
          ) : <p className="text-white/80 text-sm">No active subscription</p>}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[[`€${totalPaid}`,'Total Paid',CreditCard],[`${completedAppts}+`,'Sessions Done',Calendar],[client?.sessions_per_week?`${client.sessions_per_week}/wk`:'—','Sessions / Week',TrendingUp],[`€${client?.monthly_price||'—'}`,'Monthly Plan',Clock]].map(([v,l,Icon],i)=>(
            <div key={i} className="rounded-2xl p-4" style={{backgroundColor:'var(--cp-card-bg)',border:'1px solid var(--cp-border)'}}>
              <Icon className="w-4 h-4 mb-2" style={{color:'var(--cp-accent)'}}/>
              <p className="text-xl font-bold" style={{color:'var(--cp-text)'}}>{v}</p>
              <p className="text-xs" style={{color:'var(--cp-text-dim)'}}>{l}</p>
            </div>
          ))}
        </div>

        {/* Service Plan */}
        {client && (
          <div className="rounded-2xl p-4" style={{backgroundColor:'var(--cp-card-bg)',border:'1px solid var(--cp-border)'}}>
            <p className="font-semibold text-sm mb-3" style={{color:'var(--cp-text)'}}>My Plan</p>
            <div className="space-y-2 text-sm">
              {[['Service',client.services?.replace(/_/g,' ')?.replace(/\b\w/g,l=>l.toUpperCase())],['Sessions',`${client.sessions_per_week}×/week · ${client.session_duration_hours}h each`],['Monthly',`€${client.monthly_price}`]].map(([k,v])=>v&&<div key={k} className="flex justify-between"><span style={{color:'var(--cp-text-dim)'}}>{k}</span><span className="font-medium" style={{color:'var(--cp-text)'}}>{v}</span></div>)}
            </div>
          </div>
        )}

        {/* Payment History */}
        <div>
          <p className="font-semibold text-sm mb-3" style={{color:'var(--cp-text)'}}>Payment History</p>
          <div className="space-y-2">
            {payments.map(p=>(
              <div key={p.id} className="rounded-xl p-4 flex items-center justify-between" style={{backgroundColor:'var(--cp-card-bg)',border:'1px solid var(--cp-border)'}}>
                <div><div className="flex items-center gap-2"><span>{METHOD_EMOJI[p.method]||'💳'}</span><span className="font-medium text-sm" style={{color:'var(--cp-text)'}}>{p.description||'Payment'}</span></div><p className="text-xs mt-0.5" style={{color:'var(--cp-text-dim)'}}>{p.paid_date?format(parseISO(p.paid_date),'MMM d, yyyy'):''}{p.period_to?` · until ${format(parseISO(p.period_to),'MMM d, yyyy')}`:''}</p></div>
                <span className="font-bold" style={{color:'var(--cp-accent)'}}>€{p.amount}</span>
              </div>
            ))}
            {!payments.length&&<div className="text-center py-8" style={{color:'var(--cp-text-dim)'}}><p className="text-sm">No payments recorded yet</p></div>}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
