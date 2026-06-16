import { useState, useEffect } from 'react';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { Bell, Plus, X, Trash2, Clock, ChevronRight } from 'lucide-react';
import ClientLayout from '../components/client-portal/ClientLayout';
import { useAppContext } from '../lib/AppContext';
import { db } from '../lib/db';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function Card({ children, style = {} }) {
  return (
    <div style={{
      backgroundColor: 'var(--cp-card-bg)',
      border: '1px solid var(--cp-border)',
      borderRadius: 16,
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--cp-text-dim)',
      margin: '0 0 10px',
    }}>
      {children}
    </p>
  );
}

function StatPill({ label, value, unit, accent }) {
  return (
    <div style={{
      backgroundColor: 'var(--cp-card-bg)',
      border: '1px solid var(--cp-border)',
      borderRadius: 14,
      padding: '14px 12px',
      textAlign: 'center',
    }}>
      <p style={{ fontSize: 9, color: 'var(--cp-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 5px' }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 600, color: accent ? 'var(--cp-accent)' : 'var(--cp-text)', margin: 0, fontFamily: 'var(--cp-font)', letterSpacing: '-0.02em' }}>
        {value}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--cp-text-dim)', fontFamily: 'var(--cp-font-body)' }}> {unit}</span>
      </p>
    </div>
  );
}

function AddReminderModal({ onClose, onSaved, clientId }) {
  const [title, setTitle] = useState('');
  const [datetime, setDatetime] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await db.ClientReminder.create({ title: title.trim(), datetime, note, client_id: clientId, completed: false });
    setSaving(false); onSaved(); onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div style={{ backgroundColor: 'var(--cp-card-bg)', border: '1px solid var(--cp-border)', borderRadius: 20, padding: 22, width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, fontFamily: 'var(--cp-font)', color: 'var(--cp-text)' }}>Add Reminder</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X style={{ width: 18, height: 18, color: 'var(--cp-text-dim)' }} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cp-text-dim)', display: 'block', marginBottom: 5 }}>Reminder</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Bring gym shoes" style={{ width: '100%', border: '1px solid var(--cp-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, backgroundColor: 'var(--cp-bg)', color: 'var(--cp-text)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cp-text-dim)', display: 'block', marginBottom: 5 }}>Date & Time</label>
            <input type="datetime-local" value={datetime} onChange={e => setDatetime(e.target.value)} style={{ width: '100%', border: '1px solid var(--cp-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, backgroundColor: 'var(--cp-bg)', color: 'var(--cp-text)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cp-text-dim)', display: 'block', marginBottom: 5 }}>Note</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Optional note..." style={{ width: '100%', border: '1px solid var(--cp-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, backgroundColor: 'var(--cp-bg)', color: 'var(--cp-text)', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'var(--cp-font-body)' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', border: '1px solid var(--cp-border)', borderRadius: 12, backgroundColor: 'transparent', color: 'var(--cp-text-dim)', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={saving || !title.trim()} style={{ flex: 1, padding: '11px', border: 'none', borderRadius: 12, backgroundColor: 'var(--cp-accent)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving || !title.trim() ? 0.5 : 1 }}>{saving ? 'Saving…' : 'Add'}</button>
        </div>
      </div>
    </div>
  );
}

export default function ClientHome() {
  const { clientUser } = useAppContext();
  const [client, setClient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [progress, setProgress] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [showReminder, setShowReminder] = useState(false);

  const load = async () => {
    if (!clientUser?.clientId) return;
    const [c, a, prog, rem] = await Promise.all([
      db.Client.get(clientUser.clientId),
      db.Appointment.filter({ client_id: clientUser.clientId }, 'date'),
      db.ClientProgress.filter({ client_id: clientUser.clientId }, 'date'),
      db.ClientReminder.filter({ client_id: clientUser.clientId }, '-created_date'),
    ]);
    setClient(c); setAppointments(a); setProgress(prog); setReminders(rem);
  };
  useEffect(() => { load(); }, [clientUser]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const upcoming = appointments.filter(a => a.date >= today).sort((a, b) => a.date === b.date ? a.start_time?.localeCompare(b.start_time) : a.date.localeCompare(b.date)).slice(0, 4);
  const latest = progress[progress.length - 1];
  const weightData = progress.filter(p => p.weight_kg).slice(-10).map(p => ({ d: p.date ? format(parseISO(p.date), 'MMM d') : '', w: p.weight_kg }));
  const pendingRem = reminders.filter(r => !r.completed);

  const getDayLabel = (ds) => {
    try { const d = parseISO(ds); return isToday(d) ? 'Today' : isTomorrow(d) ? 'Tomorrow' : format(d, 'EEE, MMM d'); } catch { return ds; }
  };

  const toggleRem = async (r) => { await db.ClientReminder.update(r.id, { completed: !r.completed }); load(); };
  const delRem = async (id) => { await db.ClientReminder.delete(id); load(); };

  return (
    <ClientLayout title="">
      <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── HERO greeting ── */}
        <div style={{ paddingBottom: 4 }}>
          <p style={{ margin: '0 0 2px', fontSize: 11, color: 'var(--cp-text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {format(new Date(), 'EEEE, d MMMM')}
          </p>
          <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 600, fontFamily: 'var(--cp-font)', color: 'var(--cp-text)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Hello, {client?.name?.split(' ')[0] || 'Athlete'}
          </h1>
          {client?.goals && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--cp-text-mid)', fontStyle: 'italic' }}>{client.goals}</p>
          )}
        </div>

        {/* ── NEXT SESSION ── */}
        {upcoming[0] && (
          <div>
            <SectionLabel>Next Session</SectionLabel>
            <div style={{
              backgroundColor: 'var(--cp-accent)',
              borderRadius: 16,
              padding: '18px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}>
              <div style={{ width: 50, height: 50, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 22 }}>{upcoming[0].type === 'nutrition' ? '🥗' : '🏋️'}</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 3px', fontSize: 16, fontWeight: 600, color: '#fff', fontFamily: 'var(--cp-font)' }}>{upcoming[0].title?.replace(` - ${upcoming[0].type?.charAt(0).toUpperCase() + upcoming[0].type?.slice(1)}`, '') || 'Training'}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                  <Clock style={{ width: 12, height: 12 }} />
                  <span>{getDayLabel(upcoming[0].date)} · {upcoming[0].start_time} · {upcoming[0].duration_minutes} min</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STATS ROW ── */}
        {latest && (
          <div>
            <SectionLabel>Body Stats</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <StatPill label="Weight" value={latest.weight_kg} unit="kg" />
              <StatPill label="Body Fat" value={latest.body_fat_pct} unit="%" />
              <StatPill label="Muscle" value={latest.muscle_mass_kg} unit="kg" accent />
            </div>
          </div>
        )}

        {/* ── WEIGHT CHART ── */}
        {weightData.length > 2 && (
          <Card>
            <div style={{ padding: '16px 18px 4px' }}>
              <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 600, fontFamily: 'var(--cp-font)', color: 'var(--cp-text)' }}>Weight Progress</p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--cp-text-dim)' }}>Last {weightData.length} measurements</p>
            </div>
            <div style={{ padding: '8px 8px 12px' }}>
              <ResponsiveContainer width="100%" height={110}>
                <LineChart data={weightData}>
                  <XAxis dataKey="d" tick={{ fontSize: 9, fill: 'var(--cp-text-dim)' }} axisLine={false} tickLine={false} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9, fill: 'var(--cp-text-dim)' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--cp-card-bg)', border: '1px solid var(--cp-border)', borderRadius: 10, fontSize: 12 }} formatter={v => [`${v} kg`, 'Weight']} />
                  <Line type="monotone" dataKey="w" stroke="var(--cp-accent)" strokeWidth={2} dot={{ r: 3, fill: 'var(--cp-accent)' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* ── UPCOMING SESSIONS ── */}
        {upcoming.length > 0 && (
          <div>
            <SectionLabel>Upcoming Sessions</SectionLabel>
            <Card>
              {upcoming.map((a, i) => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px',
                  borderBottom: i < upcoming.length - 1 ? '1px solid var(--cp-border)' : 'none',
                }}>
                  <div style={{ width: 4, height: 36, borderRadius: 2, backgroundColor: a.client_color || 'var(--cp-accent)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 600, color: 'var(--cp-text)' }}>{getDayLabel(a.date)}</p>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--cp-text-dim)' }}>{a.start_time} · {a.duration_minutes} min · {a.type}</p>
                  </div>
                  <ChevronRight style={{ width: 15, height: 15, color: 'var(--cp-border)' }} />
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* ── REMINDERS ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <SectionLabel>My Reminders</SectionLabel>
            <button onClick={() => setShowReminder(true)} style={{ width: 26, height: 26, borderRadius: 8, border: '1px solid var(--cp-border)', backgroundColor: 'var(--cp-accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginBottom: 10 }}>
              <Plus style={{ width: 14, height: 14, color: 'var(--cp-accent)' }} />
            </button>
          </div>
          {pendingRem.length === 0
            ? <p style={{ fontSize: 13, color: 'var(--cp-text-dim)', textAlign: 'center', padding: '14px 0' }}>No reminders. Tap + to add one.</p>
            : <Card>
                {pendingRem.map((r, i) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 16px', borderBottom: i < pendingRem.length - 1 ? '1px solid var(--cp-border)' : 'none' }}>
                    <button onClick={() => toggleRem(r)} style={{ width: 20, height: 20, borderRadius: '50%', border: '1.5px solid var(--cp-accent)', backgroundColor: 'transparent', flexShrink: 0, marginTop: 1, cursor: 'pointer' }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 500, color: 'var(--cp-text)' }}>{r.title}</p>
                      {r.datetime && <p style={{ margin: 0, fontSize: 11, color: 'var(--cp-text-dim)' }}>{format(parseISO(r.datetime), 'EEE, MMM d · HH:mm')}</p>}
                      {r.note && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--cp-text-dim)', fontStyle: 'italic' }}>{r.note}</p>}
                    </div>
                    <button onClick={() => delRem(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}><Trash2 style={{ width: 13, height: 13, color: 'var(--cp-text-dim)' }} /></button>
                  </div>
                ))}
              </Card>
          }
        </div>

        {/* bottom spacer */}
        <div style={{ height: 12 }} />
      </div>

      {showReminder && <AddReminderModal clientId={clientUser?.clientId} onClose={() => setShowReminder(false)} onSaved={load} />}
    </ClientLayout>
  );
}
