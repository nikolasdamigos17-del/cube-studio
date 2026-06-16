import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Dumbbell, RefreshCw, Link, X, CheckCircle2, AlertCircle, ExternalLink, ChevronDown, ChevronRight, Loader2, Settings, Trash2 } from 'lucide-react';
import { db } from '../lib/db';

// Hevy API wrapper — uses their public API v1
const HEVY_BASE = 'https://api.hevyapp.com/v1';

async function fetchHevy(endpoint, apiKey) {
  const r = await fetch(`${HEVY_BASE}${endpoint}`, {
    headers: { 'api-key': apiKey, 'accept': 'application/json' }
  });
  if (!r.ok) throw new Error(`Hevy API ${r.status}: ${r.statusText}`);
  return r.json();
}

function WorkoutCard({ workout, clients }) {
  const [expanded, setExpanded] = useState(false);
  const client = clients.find(c => c.id === workout.assigned_client_id);
  const totalSets = workout.exercises?.reduce((s,e)=>s+(e.sets?.length||0),0)||0;
  const totalVol = workout.exercises?.reduce((s,e)=>s+(e.sets?.reduce((ss,set)=>ss+((set.weight_kg||0)*(set.reps||0)),0)||0),0)||0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow">
      <div className="p-4 cursor-pointer" onClick={()=>setExpanded(v=>!v)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3 items-start">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Dumbbell className="w-5 h-5 text-purple-600"/>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{workout.title||'Workout'}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {workout.start_time?format(parseISO(workout.start_time),'EEE, MMM d, yyyy · HH:mm'):''}
                {workout.duration_seconds?' · '+Math.round(workout.duration_seconds/60)+'min':''}
              </p>
              <div className="flex gap-3 mt-1.5">
                <span className="text-xs text-gray-500">{workout.exercises?.length||0} exercises</span>
                <span className="text-xs text-gray-500">{totalSets} sets</span>
                {totalVol>0&&<span className="text-xs text-gray-500">{Math.round(totalVol).toLocaleString()} kg volume</span>}
              </div>
              {client&&<span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full text-white" style={{backgroundColor:client.theme_color||'#6366f1'}}>{client.name}</span>}
            </div>
          </div>
          {expanded?<ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0"/>:<ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0"/>}
        </div>
      </div>
      {expanded&&workout.exercises?.length>0&&(
        <div className="border-t border-gray-50">
          {workout.exercises.map((ex,i)=>(
            <div key={i} className="px-5 py-3 border-b border-gray-50 last:border-0">
              <p className="font-medium text-gray-900 text-sm">{ex.title||ex.name}</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {ex.sets?.map((s,si)=>(
                  <span key={si} className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-lg">
                    Set {si+1}: {s.reps||0} reps {s.weight_kg?`@ ${s.weight_kg}kg`:'(BW)'}
                    {s.rpe?` RPE ${s.rpe}`:''}
                  </span>
                ))}
              </div>
              {ex.notes&&<p className="text-xs text-gray-400 mt-1 italic">{ex.notes}</p>}
            </div>
          ))}
          {workout.description&&<div className="px-5 py-3 bg-gray-50"><p className="text-xs text-gray-500 italic">{workout.description}</p></div>}
        </div>
      )}
    </div>
  );
}

export default function HevySync() {
  const [apiKey, setApiKey] = useState(()=>localStorage.getItem('hevy_api_key')||'');
  const [keyInput, setKeyInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [workouts, setWorkouts] = useState([]);
  const [clients, setClients] = useState([]);
  const [lastSync, setLastSync] = useState(()=>localStorage.getItem('hevy_last_sync')||'');
  const [err, setErr] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(()=>{
    db.Client.list('name').then(setClients);
    loadLocalWorkouts();
    if (apiKey) setConnected(true);
  },[]);

  const loadLocalWorkouts = async () => {
    const w = await db.HevyWorkout.list('-start_time',200);
    setWorkouts(w);
  };

  const saveKey = () => {
    if (!keyInput.trim()) return;
    localStorage.setItem('hevy_api_key', keyInput.trim());
    setApiKey(keyInput.trim());
    setConnected(true);
    setKeyInput('');
  };

  const sync = async (pageNum=1) => {
    if (!apiKey) return;
    setSyncing(true); setErr('');
    try {
      const data = await fetchHevy(`/workouts?page=${pageNum}&pageSize=20`, apiKey);
      const incoming = data.workouts||[];
      setHasMore((data.page_count||1) > pageNum);

      // Store each workout if not already stored
      const existing = await db.HevyWorkout.list('-start_time',500);
      const existingIds = new Set(existing.map(w=>w.hevy_id));

      for (const w of incoming) {
        if (!existingIds.has(w.id)) {
          await db.HevyWorkout.create({
            hevy_id: w.id,
            title: w.title,
            description: w.description,
            start_time: w.start_time,
            end_time: w.end_time,
            duration_seconds: w.duration_seconds,
            exercises: w.exercises?.map(e=>({
              title: e.title,
              notes: e.notes,
              sets: e.sets?.map(s=>({ weight_kg:s.weight_kg, reps:s.reps, rpe:s.rpe, type:s.set_type }))
            }))||[],
            assigned_client_id: '',
          });
        }
      }

      const now = new Date().toISOString();
      localStorage.setItem('hevy_last_sync', now);
      setLastSync(now);
      await loadLocalWorkouts();
    } catch(e) {
      setErr(e.message.includes('401')||e.message.includes('403')
        ? 'Invalid API key. Check your Hevy API key in Settings → API.'
        : `Sync error: ${e.message}. Make sure you have a Hevy Pro subscription.`
      );
    }
    setSyncing(false);
  };

  const assignClient = async (workoutId, clientId) => {
    await db.HevyWorkout.update(workoutId, { assigned_client_id: clientId });
    loadLocalWorkouts();
  };

  const disconnect = () => {
    localStorage.removeItem('hevy_api_key');
    setApiKey(''); setConnected(false); setShowSettings(false);
  };

  if (!connected) return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center"><Dumbbell className="w-5 h-5 text-purple-600"/></div>
        <div><h1 className="text-2xl font-bold text-gray-900">Hevy Sync</h1><p className="text-gray-400 text-sm">Import your workouts from Hevy</p></div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
        <h2 className="font-semibold text-gray-900 mb-1">Connect your Hevy account</h2>
        <p className="text-sm text-gray-500 mb-4">You need a <strong>Hevy Pro</strong> subscription to access the API. Get your API key from:</p>
        <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm font-mono text-gray-700">
          Hevy app → Profile → Settings → API → Generate Key
        </div>
        <a href="https://hevy.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 mb-4"><ExternalLink className="w-3.5 h-3.5"/>Open Hevy website</a>
        <div className="flex gap-2 mt-2">
          <input value={keyInput} onChange={e=>setKeyInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveKey()} placeholder="Paste your Hevy API key here..." className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 font-mono"/>
          <button onClick={saveKey} disabled={!keyInput.trim()} className="px-5 py-3 bg-purple-500 text-white rounded-xl text-sm font-semibold hover:bg-purple-600 disabled:opacity-40">Connect</button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">📋 What gets imported:</p>
        <ul className="space-y-1 text-amber-700">
          <li>• All workout titles, dates and durations</li>
          <li>• Every exercise with sets, reps and weights</li>
          <li>• RPE ratings and exercise notes</li>
          <li>• You can then assign each workout to one of your clients</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center"><Dumbbell className="w-5 h-5 text-purple-600"/></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hevy Sync</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-2 h-2 rounded-full bg-green-500"/>
              <p className="text-sm text-gray-500">Connected{lastSync?` · Last sync: ${format(parseISO(lastSync),'MMM d, HH:mm')}`:'  · Not synced yet'}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setShowSettings(s=>!s)} className="p-2.5 bg-gray-100 rounded-xl hover:bg-gray-200"><Settings className="w-4 h-4 text-gray-600"/></button>
          <button onClick={()=>sync(1)} disabled={syncing} className="flex items-center gap-2 bg-purple-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-600 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${syncing?'animate-spin':''}`}/>{syncing?'Syncing...':'Sync Now'}
          </button>
        </div>
      </div>

      {showSettings&&(
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Connection Settings</h3>
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-700">Hevy API Key</p><p className="text-xs text-gray-400 font-mono">{apiKey.slice(0,8)}{'•'.repeat(Math.max(0,apiKey.length-8))}</p></div>
            <button onClick={disconnect} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100"><X className="w-4 h-4"/>Disconnect</button>
          </div>
        </div>
      )}

      {err&&<div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-start gap-2 text-sm text-red-700"><AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5"/><div className="flex-1">{err}</div><button onClick={()=>setErr('')} className="text-xs underline">Dismiss</button></div>}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600 font-medium">{workouts.length} workouts imported</p>
        {workouts.length===0&&!syncing&&<button onClick={()=>sync(1)} className="text-sm text-purple-500 hover:text-purple-600 font-medium">Click Sync Now to import →</button>}
      </div>

      <div className="space-y-3">
        {workouts.map(w=>(
          <div key={w.id}>
            <WorkoutCard workout={w} clients={clients}/>
            <div className="px-4 pb-3 -mt-1 bg-white rounded-b-2xl border-x border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Assign to client:</span>
                <select value={w.assigned_client_id||''} onChange={e=>assignClient(w.id,e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none">
                  <option value="">Unassigned</option>
                  {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {w.assigned_client_id&&<CheckCircle2 className="w-4 h-4 text-green-500"/>}
              </div>
            </div>
          </div>
        ))}
        {workouts.length===0&&!syncing&&(
          <div className="text-center py-16 text-gray-400">
            <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-30"/>
            <p className="font-medium">No workouts synced yet</p>
            <p className="text-sm mt-1">Click "Sync Now" to import your Hevy workouts</p>
          </div>
        )}
        {hasMore&&<button onClick={()=>sync(page+1)} disabled={syncing} className="w-full py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">{syncing?<Loader2 className="w-4 h-4 animate-spin mx-auto"/>:'Load more workouts'}</button>}
      </div>
    </div>
  );
}
