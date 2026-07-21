import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Dumbbell, ChevronDown, ChevronRight, BarChart2 } from 'lucide-react';
import ClientLayout from '../components/client-portal/ClientLayout';
import { useAppContext } from '../lib/AppContext';
import { db } from '../lib/db';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const METRICS = [{key:'weight_kg',label:'Weight',unit:'kg',color:'#6366f1'},{key:'body_fat_pct',label:'Body Fat',unit:'%',color:'#ef4444'},{key:'muscle_mass_kg',label:'Muscle',unit:'kg',color:'#10b981'},{key:'bmi',label:'BMI',unit:'',color:'#ec4899'}];

export default function ClientTraining() {
  const { clientUser } = useAppContext();
  const [plans, setPlans] = useState([]);
  const [progress, setProgress] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [activeMetric, setActiveMetric] = useState('weight_kg');

  useEffect(() => {
    if (!clientUser?.clientId) return;
    Promise.all([db.TrainingPlan.filter({client_id:clientUser.clientId},'-date'), db.ClientProgress.filter({client_id:clientUser.clientId},'date')]).then(([p,prog])=>{setPlans(p);setProgress(prog);});
  }, [clientUser]);

  const metric = METRICS.find(m=>m.key===activeMetric);
  const chartData = progress.filter(r=>r[activeMetric]).map(r=>({date:r.date?format(parseISO(r.date),'MMM d'):'',value:parseFloat(r[activeMetric])||0}));
  const latest = progress[progress.length-1];
  const first = progress[0];

  return (
    <ClientLayout title="Training">
      <div className="p-5 space-y-5">
        {/* Progress Stats */}
        {latest && (
          <div className="grid grid-cols-2 gap-3">
            {METRICS.map(m=>{
              const delta = first&&latest&&first[m.key]&&latest[m.key]?(parseFloat(latest[m.key])-parseFloat(first[m.key])).toFixed(1):null;
              return (
                <div key={m.key} className="rounded-2xl p-4" style={{backgroundColor:'var(--cp-card-bg)',border:'1px solid var(--cp-border)'}}>
                  <p className="text-xs font-medium mb-1" style={{color:'var(--cp-text-dim)'}}>{m.label}</p>
                  <p className="text-2xl font-bold" style={{color:m.color}}>{latest[m.key]||'—'}<span className="text-sm font-normal ml-1" style={{color:'var(--cp-text-dim)'}}>{m.unit}</span></p>
                  {delta&&<p className="text-xs mt-1" style={{color:parseFloat(delta)<0?'#10b981':'#ef4444'}}>{delta>0?'+':''}{delta} {m.unit} since start</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* Progress Chart */}
        {chartData.length > 1 && (
          <div className="rounded-2xl p-4" style={{backgroundColor:'var(--cp-card-bg)',border:'1px solid var(--cp-border)'}}>
            <div className="flex flex-wrap gap-2 mb-3">
              {METRICS.map(m=><button key={m.key} onClick={()=>setActiveMetric(m.key)} className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors" style={activeMetric===m.key?{backgroundColor:m.color,color:'white'}:{backgroundColor:'var(--cp-bg)',color:'var(--cp-text-dim)'}}>{m.label}</button>)}
            </div>
            <p className="text-sm font-semibold mb-3" style={{color:'var(--cp-text)'}}>{metric?.label} Progress</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="var(--cp-border)"/><XAxis dataKey="date" tick={{fontSize:10,fill:'var(--cp-text-dim)'}}/><YAxis domain={['auto','auto']} tick={{fontSize:10,fill:'var(--cp-text-dim)'}}/><Tooltip contentStyle={{backgroundColor:'var(--cp-card-bg)',border:'1px solid var(--cp-border)',borderRadius:12}}/><Line type="monotone" dataKey="value" stroke={metric?.color||'#6366f1'} strokeWidth={2} dot={{r:3}}/></LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Training Plans */}
        <div><p className="text-base font-bold mb-3" style={{color:'var(--cp-text)'}}>My Training Plans ({plans.length})</p>
          <div className="space-y-3">
            {plans.map(plan=>(
              <div key={plan.id} className="rounded-2xl overflow-hidden" style={{backgroundColor:'var(--cp-card-bg)',border:'1px solid var(--cp-border)'}}>
                <button onClick={()=>setExpanded(expanded===plan.id?null:plan.id)} className="w-full p-4 text-left flex items-start justify-between gap-2">
                  <div><p className="font-semibold text-sm" style={{color:'var(--cp-text)'}}>{plan.title}</p><p className="text-xs mt-0.5" style={{color:'var(--cp-text-dim)'}}>{plan.date?format(parseISO(plan.date),'EEE, MMM d, yyyy'):''} · {plan.exercises?.length||0} exercises{plan.completed?' · ✅':''}</p></div>
                  {expanded===plan.id?<ChevronDown className="w-4 h-4 flex-shrink-0" style={{color:'var(--cp-text-dim)'}}/>:<ChevronRight className="w-4 h-4 flex-shrink-0" style={{color:'var(--cp-text-dim)'}}/>}
                </button>
                {expanded===plan.id&&plan.exercises?.length>0&&(
                  <div className="border-t" style={{borderColor:'var(--cp-border)'}}>
                    <div className="grid grid-cols-4 gap-2 px-4 py-2 text-xs font-medium" style={{color:'var(--cp-text-dim)'}}>
                      <span className="col-span-2">Exercise</span><span className="text-center">Sets × Reps</span><span className="text-center">Weight</span>
                    </div>
                    {plan.exercises.map((ex,i)=>(
                      <div key={i} className="grid grid-cols-4 gap-2 px-4 py-2.5 text-sm border-t" style={{borderColor:'var(--cp-border)'}}>
                        <span className="col-span-2 font-medium" style={{color:'var(--cp-text)'}}>{ex.name}</span>
                        <span className="text-center" style={{color:'var(--cp-text-dim)'}}>{ex.sets}×{ex.reps}</span>
                        <span className="text-center" style={{color:'var(--cp-text-dim)'}}>{ex.weight_kg?`${ex.weight_kg}kg`:'BW'}</span>
                      </div>
                    ))}
                    {plan.notes&&<div className="px-4 pb-3"><p className="text-xs italic" style={{color:'var(--cp-text-dim)'}}>{plan.notes}</p></div>}
                  </div>
                )}
              </div>
            ))}
            {!plans.length&&<div className="text-center py-10" style={{color:'var(--cp-text-dim)'}}><Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-30"/><p className="text-sm">No training plans assigned yet</p></div>}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
