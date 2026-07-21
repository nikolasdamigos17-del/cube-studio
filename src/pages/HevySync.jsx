import { useState, useEffect, useRef, useCallback } from 'react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { Zap, RefreshCw, Check, X, Loader2, Monitor, Wifi, WifiOff, ChevronDown, ChevronUp, Send, AlertCircle, Play, Pause, Clock, TrendingUp, Dumbbell } from 'lucide-react';
import { db } from '../lib/db';
import { getWorkouts, getWorkoutsSince, createRoutine, parseHevyWorkout, startLiveMonitor } from '../lib/hevyApi';

const HEVY_KEY = '3ca8d9a1-4220-46f3-8f58-e20ba799db26';

// ── Set detail display ────────────────────────────────────────────────────────
function SetRow({ set, idx }) {
  const done = set.completed !== false;
  return (
    <div className={`flex items-center gap-3 px-3 py-1.5 text-xs ${done ? '' : 'opacity-40'}`}>
      <span className="w-12 text-muted-foreground">Set {idx + 1}</span>
      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${done ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}>
        {done ? '✓' : '○'}
      </span>
      <span className="font-semibold text-foreground">{set.reps} reps</span>
      {set.weight_kg > 0 && <span className="text-muted-foreground">@ {set.weight_kg} kg</span>}
      {set.rpe && <span className="ml-auto text-muted-foreground">RPE {set.rpe}</span>}
    </div>
  );
}

// ── Exercise block ─────────────────────────────────────────────────────────────
function ExerciseBlock({ exercise }) {
  const [open, setOpen] = useState(false);
  const totalVol = exercise.volume_kg || 0;
  const completedSets = exercise.set_details?.filter(s => s.completed !== false).length || 0;
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">{exercise.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {completedSets}/{exercise.set_details?.length || exercise.sets} sets
            {exercise.set_details?.[0]?.weight_kg > 0 && ` · ${exercise.set_details[0].weight_kg}kg start`}
            {totalVol > 0 && ` · ${Math.round(totalVol).toLocaleString()} kg volume`}
          </p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-border divide-y divide-border/50">
          {exercise.set_details?.map((s, i) => <SetRow key={i} set={s} idx={i} />)}
          {exercise.notes && <p className="px-4 py-2 text-xs text-muted-foreground italic">{exercise.notes}</p>}
        </div>
      )}
    </div>
  );
}

// ── Workout card ──────────────────────────────────────────────────────────────
function WorkoutCard({ workout, clients, onAssign }) {
  const [expanded, setExpanded] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [saved, setSaved] = useState(false);

  const handleAssign = async () => {
    if (!selectedClient) return;
    setAssigning(true);
    const client = clients.find(c => c.id === selectedClient);
    await db.HevyWorkout.create({
      ...workout,
      client_id: selectedClient,
      client_name: client?.name || '',
    });
    setSaved(true);
    setAssigning(false);
    if (onAssign) onAssign();
  };

  const totalSets = workout.exercises?.reduce((s, e) => s + (e.set_details?.length || e.sets || 0), 0) || 0;
  const totalVol = Math.round(workout.total_volume_kg || 0);

  return (
    <div className={`card overflow-hidden transition-all ${saved ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"/>
              <h3 className="font-bold text-foreground truncate">{workout.title}</h3>
              {saved && <span className="badge badge-green text-xs">Saved</span>}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {workout.date && <span>📅 {format(parseISO(workout.date), 'EEE, MMM d yyyy')}</span>}
              {workout.duration_minutes && <span>⏱ {workout.duration_minutes} min</span>}
              <span>🏋️ {workout.exercises?.length || 0} exercises</span>
              <span>📊 {totalSets} sets</span>
              {totalVol > 0 && <span>⚖️ {totalVol.toLocaleString()} kg total</span>}
            </div>
          </div>
          <button onClick={() => setExpanded(v => !v)} className="btn-ghost btn-icon flex-shrink-0">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick stats row */}
        {workout.exercises?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {workout.exercises.slice(0, 5).map((ex, i) => (
              <span key={i} className="badge badge-gray text-xs">{ex.name}</span>
            ))}
            {workout.exercises.length > 5 && (
              <span className="text-xs text-muted-foreground">+{workout.exercises.length - 5} more</span>
            )}
          </div>
        )}

        {/* Assign to client */}
        {!saved && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-border">
            <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
              className="input-base flex-1 text-sm py-1.5">
              <option value="">Assign to client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={handleAssign} disabled={assigning || !selectedClient}
              className="btn btn-primary btn-sm px-4 whitespace-nowrap">
              {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5" />Save</>}
            </button>
          </div>
        )}
      </div>

      {/* Expanded exercises */}
      {expanded && workout.exercises?.length > 0 && (
        <div className="border-t border-border p-4 space-y-2 bg-muted/20">
          {workout.exercises.map((ex, i) => <ExerciseBlock key={i} exercise={ex} />)}
        </div>
      )}
    </div>
  );
}

// ── Live Monitor Panel ────────────────────────────────────────────────────────
function LiveMonitor({ clients }) {
  const [live, setLive] = useState(false);
  const [liveWorkouts, setLiveWorkouts] = useState([]);
  const [lastPing, setLastPing] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | watching | error
  const stopRef = useRef(null);

  const start = useCallback(() => {
    setLive(true);
    setStatus('watching');
    setLiveWorkouts([]);
    const stop = startLiveMonitor((workout) => {
      setLiveWorkouts(prev => {
        const exists = prev.find(w => w.hevy_id === workout.hevy_id);
        if (exists) return prev.map(w => w.hevy_id === workout.hevy_id ? workout : w);
        return [workout, ...prev];
      });
      setLastPing(new Date());
    }, 15);
    stopRef.current = stop;
  }, []);

  const stop = useCallback(() => {
    setLive(false);
    setStatus('idle');
    if (stopRef.current) stopRef.current();
  }, []);

  useEffect(() => () => { if (stopRef.current) stopRef.current(); }, []);

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 p-5 border-b border-border">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${live ? 'bg-green-100 dark:bg-green-900/40' : 'bg-muted'}`}>
          <Monitor className={`w-5 h-5 ${live ? 'text-green-600' : 'text-muted-foreground'}`} />
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-foreground">Live Training Monitor</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {live
              ? <><span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/>Watching Hevy every 15 seconds</span>{lastPing && ` · Last update ${formatDistanceToNow(lastPing)} ago`}</>
              : 'Start to watch for new workouts in real time'
            }
          </p>
        </div>
        <button onClick={live ? stop : start}
          className={`btn ${live ? 'btn-danger' : 'btn-primary'} flex items-center gap-2`}>
          {live ? <><Pause className="w-4 h-4" />Stop</> : <><Play className="w-4 h-4" />Start</>}
        </button>
      </div>

      {/* Live feed */}
      {live && (
        <div className="p-4">
          {liveWorkouts.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
                <Wifi className="w-5 h-5 animate-pulse text-green-500" />
                <span className="text-sm">Waiting for workouts...</span>
              </div>
              <p className="text-xs text-muted-foreground">When a workout is logged in Hevy, it will appear here instantly</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{liveWorkouts.length} workout{liveWorkouts.length !== 1 ? 's' : ''} detected</p>
              {liveWorkouts.map(w => <WorkoutCard key={w.hevy_id} workout={w} clients={clients} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Push Plan Panel ───────────────────────────────────────────────────────────
function PushPlanPanel({ clients }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    db.TrainingPlan.list('-date', 50).then(setPlans);
  }, []);

  const push = async () => {
    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan) return;
    setPushing(true); setResult(null);
    try {
      const response = await createRoutine(plan);
      setResult({ ok: true, msg: `✅ "${plan.title}" pushed to Hevy as a routine` });
    } catch (e) {
      setResult({ ok: false, msg: `❌ Failed: ${e.message}` });
    }
    setPushing(false);
  };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
          <Send className="w-4 h-4 text-purple-600" />
        </div>
        <div>
          <h2 className="font-bold text-foreground">Push Plan → Hevy</h2>
          <p className="text-xs text-muted-foreground">Send a training plan from Cube to Hevy as a routine</p>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <label className="section-label">Select Training Plan</label>
          <select value={selectedPlan} onChange={e => setSelectedPlan(e.target.value)} className="input-base mt-1">
            <option value="">Choose a plan...</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.title} — {p.client_name} {p.date ? `(${format(parseISO(p.date), 'MMM d')})` : ''}</option>)}
          </select>
        </div>
        {result && (
          <div className={`rounded-xl p-3 text-sm ${result.ok ? 'bg-green-50 dark:bg-green-950/30 text-green-700' : 'bg-red-50 dark:bg-red-950/30 text-red-700'}`}>
            {result.msg}
          </div>
        )}
        <button onClick={push} disabled={pushing || !selectedPlan} className="btn btn-primary w-full">
          {pushing ? <><Loader2 className="w-4 h-4 animate-spin" />Pushing to Hevy…</> : <><Send className="w-4 h-4" />Push to Hevy</>}
        </button>
      </div>
    </div>
  );
}

// ── Workout History Panel ─────────────────────────────────────────────────────
function WorkoutHistory({ clients }) {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const data = await getWorkouts(p, 10);
      const parsed = (data.workouts || []).map(parseHevyWorkout);
      if (p === 1) setWorkouts(parsed);
      else setWorkouts(prev => [...prev, ...parsed]);
      setHasMore((data.workouts || []).length === 10);
      setLoaded(true);
    } catch (e) {
      console.error('Hevy load failed:', e);
    }
    setLoading(false);
  };

  const loadMore = () => { const next = page + 1; setPage(next); load(next); };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <div>
          <h2 className="font-bold text-foreground">Workout History</h2>
          <p className="text-xs text-muted-foreground mt-0.5">All workouts logged in Hevy · Assign to clients</p>
        </div>
        <button onClick={() => load(1)} disabled={loading} className="btn btn-secondary flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {loaded ? 'Refresh' : 'Load Workouts'}
        </button>
      </div>

      <div className="p-4">
        {!loaded && !loading && (
          <div className="text-center py-16 text-muted-foreground">
            <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium mb-1">Connect to Hevy</p>
            <p className="text-sm">Click "Load Workouts" to fetch your Hevy history</p>
          </div>
        )}
        {loading && page === 1 && (
          <div className="text-center py-16"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></div>
        )}
        {loaded && workouts.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground"><p>No workouts found in Hevy</p></div>
        )}
        {workouts.length > 0 && (
          <div className="space-y-3">
            {workouts.map(w => <WorkoutCard key={w.hevy_id} workout={w} clients={clients} />)}
            {hasMore && (
              <button onClick={loadMore} disabled={loading} className="btn btn-secondary w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load More'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stats Panel ───────────────────────────────────────────────────────────────
function HevyStats({ workouts }) {
  if (!workouts.length) return null;
  const totalVol = workouts.reduce((s, w) => s + (w.total_volume_kg || 0), 0);
  const avgDuration = workouts.filter(w => w.duration_minutes).reduce((s, w, _, a) => s + w.duration_minutes / a.length, 0);
  const totalSets = workouts.reduce((s, w) => s + w.exercises?.reduce((s2, e) => s2 + (e.set_details?.length || 0), 0), 0);

  return (
    <div className="grid grid-cols-3 gap-4">
      {[
        { icon:'🏋️', label:'Total Workouts', val:workouts.length },
        { icon:'⚖️', label:'Total Volume', val:`${Math.round(totalVol).toLocaleString()} kg` },
        { icon:'⏱', label:'Avg Duration', val:avgDuration ? `${Math.round(avgDuration)} min` : '—' },
      ].map(s => (
        <div key={s.label} className="stat-card">
          <span className="text-2xl">{s.icon}</span>
          <p className="stat-card-value mt-2">{s.val}</p>
          <p className="stat-card-label">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HevySync() {
  const [clients, setClients] = useState([]);
  const [savedWorkouts, setSavedWorkouts] = useState([]);
  const [tab, setTab] = useState('monitor');

  useEffect(() => {
    db.Client.list('name').then(setClients);
    db.HevyWorkout.list('-date', 100).then(setSavedWorkouts);
  }, []);

  const refreshSaved = () => db.HevyWorkout.list('-date', 100).then(setSavedWorkouts);

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="page-title">Hevy Sync</h1>
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 rounded-full text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"/>Connected
            </span>
          </div>
          <p className="page-subtitle">Two-way sync with Hevy · Push plans · Monitor live sessions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6">
        <HevyStats workouts={savedWorkouts} />
      </div>

      {/* Tabs */}
      <div className="tab-bar w-fit mb-6">
        {[['monitor','📺 Live Monitor'],['history','📋 History'],['push','📤 Push Plans'],['saved','✅ Saved']].map(([key, lbl]) => (
          <button key={key} onClick={() => setTab(key)} className={`tab-btn px-5 ${tab === key ? 'active' : ''}`}>{lbl}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'monitor' && <LiveMonitor clients={clients} />}
      {tab === 'history' && <WorkoutHistory clients={clients} />}
      {tab === 'push' && <PushPlanPanel clients={clients} />}
      {tab === 'saved' && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-bold text-foreground">Saved Hevy Workouts</h2>
            <span className="badge badge-gray">{savedWorkouts.length}</span>
          </div>
          {savedWorkouts.length === 0
            ? <div className="text-center py-16 text-muted-foreground"><p>No saved workouts yet</p><p className="text-sm mt-1">Assign workouts from History or Live Monitor</p></div>
            : <div className="p-4 space-y-3">
                {savedWorkouts.map(w => <WorkoutCard key={w.id} workout={w} clients={clients} onAssign={refreshSaved} />)}
              </div>
          }
        </div>
      )}
    </div>
  );
}
