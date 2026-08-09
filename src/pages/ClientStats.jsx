import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { BarChart2 } from 'lucide-react';
import ClientLayout from '../components/client-portal/ClientLayout';
import { useAppContext } from '../lib/AppContext';
import { db } from '../lib/db';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';

const METRICS = [{key:'weight_kg',label:'Weight',unit:'kg',color:'#6366f1'},{key:'body_fat_pct',label:'Body Fat',unit:'%',color:'#ef4444'},{key:'muscle_mass_kg',label:'Muscle',unit:'kg',color:'#10b981'},{key:'body_water_pct',label:'Water',unit:'%',color:'#3b82f6'},{key:'bone_mass_kg',label:'Bone',unit:'kg',color:'#8b5cf6'},{key:'bmr',label:'BMR',unit:'kcal',color:'#f59e0b'},{key:'bmi',label:'BMI',unit:'',color:'#ec4899'},{key:'visceral_fat',label:'Visceral Fat',unit:'',color:'#f97316'},{key:'steps',label:'Steps',unit:'',color:'#22c55e'},{key:'sleep_hours',label:'Sleep',unit:'h',color:'#a78bfa'}];

export default function ClientStats() {
  const { clientUser } = useAppContext();
  const [progress, setProgress] = useState([]);
  const [activeMetric, setActiveMetric] = useState('weight_kg');

  useEffect(() => {
    if (!clientUser?.clientId) return;
    db.ClientProgress.filter({client_id:clientUser.clientId},'date').then(setProgress);
  }, [clientUser]);

  const metric = METRICS.find(m=>m.key===activeMetric);
  const chartData = progress.filter(r=>r[activeMetric]).map(r=>({date:r.date?format(parseISO(r.date),'MMM d'):'',value:parseFloat(r[activeMetric])||0}));
  const latest = progress[progress.length-1];
  const first = progress[0];

  return (
    <ClientLayout title="My Stats">
      <div className="p-5 space-y-5">
        {/* Latest stats grid */}
        {latest && (
          <div className="grid grid-cols-2 gap-3">
            {METRICS.slice(0,6).map(m=>{
              const delta=first&&latest&&first[m.key]&&latest[m.key]?(parseFloat(latest[m.key])-parseFloat(first[m.key])).toFixed(1):null;
              return (
                <div key={m.key} className="rounded-2xl p-4" style={{backgroundColor:'var(--cp-card-bg)',border:'1px solid var(--cp-border)'}}>
                  <p className="text-xs font-medium mb-0.5" style={{color:'var(--cp-text-dim)'}}>{m.label}</p>
                  <p className="text-xl font-bold" style={{color:m.color}}>{latest[m.key]!=null?latest[m.key]:'—'}<span className="text-xs font-normal ml-1" style={{color:'var(--cp-text-dim)'}}>{m.unit}</span></p>
                  {delta&&<p className="text-xs mt-1" style={{color:parseFloat(delta)<0?'#10b981':'#ef4444'}}>{parseFloat(delta)>0?'▲':'▼'} {Math.abs(parseFloat(delta))}{m.unit}</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* Metric chart */}
        <div className="rounded-2xl p-4" style={{backgroundColor:'var(--cp-card-bg)',border:'1px solid var(--cp-border)'}}>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {METRICS.map(m=><button key={m.key} onClick={()=>setActiveMetric(m.key)} className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors" style={activeMetric===m.key?{backgroundColor:m.color,color:'white'}:{backgroundColor:'var(--cp-bg)',color:'var(--cp-text-dim)'}}>{m.label}</button>)}
          </div>
          {chartData.length > 1 ? (
            <>
              <p className="text-sm font-semibold mb-3" style={{color:'var(--cp-text)'}}>{metric?.label} over time</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="var(--cp-border)"/><XAxis dataKey="date" tick={{fontSize:9,fill:'var(--cp-text-dim)'}}/><YAxis domain={['auto','auto']} tick={{fontSize:9,fill:'var(--cp-text-dim)'}}/><Tooltip contentStyle={{backgroundColor:'var(--cp-card-bg)',border:'1px solid var(--cp-border)',borderRadius:12}}/><Line type="monotone" dataKey="value" stroke={metric?.color||'#6366f1'} strokeWidth={2} dot={{r:3}}/></LineChart>
              </ResponsiveContainer>
            </>
          ) : <div className="text-center py-8" style={{color:'var(--cp-text-dim)'}}><p className="text-sm">Not enough data to chart yet</p></div>}
        </div>

        {!progress.length&&<div className="text-center py-12" style={{color:'var(--cp-text-dim)'}}><BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30"/><p className="text-sm">No records yet</p><p className="text-xs mt-1 opacity-70">Your trainer will add measurements</p></div>}
      </div>
    </ClientLayout>
  );
}
