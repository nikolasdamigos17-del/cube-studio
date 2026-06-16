import { useState, useEffect } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { ChevronDown, ChevronRight, ExternalLink, ShoppingCart, X, Salad, Check, Share2, Trash2, Droplets, Plus, Pill, ChevronLeft } from 'lucide-react';
import ClientLayout from '../components/client-portal/ClientLayout';
import { useAppContext } from '../lib/AppContext';
import { db } from '../lib/db';

const cs = {
  card: { backgroundColor:'var(--cp-card-bg)', border:'1px solid var(--cp-border)', borderRadius:14 },
  text: { color:'var(--cp-text)' },
  dim: { color:'var(--cp-text-dim)' },
  accent: { color:'var(--cp-accent)' },
  label: { fontSize:10, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--cp-text-dim)', margin:'0 0 8px', display:'block' },
};

// ── Meal Sheet ────────────────────────────────────────────────────────────────
function MealSheet({ meal, supplements, onClose }) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:60,display:'flex',alignItems:'flex-end',justifyContent:'center',backgroundColor:'rgba(0,0,0,0.5)'}}>
      <div style={{...cs.card,borderRadius:'20px 20px 0 0',width:'100%',maxWidth:500,maxHeight:'88vh',display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 20px 12px',borderBottom:'1px solid var(--cp-border)',flexShrink:0}}>
          <h3 style={{margin:0,fontSize:17,fontWeight:700,fontFamily:'var(--cp-font)',...cs.text}}>{meal.name}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',padding:4}}><X style={{width:18,height:18,...cs.dim}}/></button>
        </div>
        <div style={{overflowY:'auto',padding:'16px 20px 28px',display:'flex',flexDirection:'column',gap:16}}>
          {meal.description && <p style={{margin:0,fontSize:14,lineHeight:1.6,...cs.dim}}>{meal.description}</p>}
          {/* Macros */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8}}>
            {[['🔥',meal.calories,'kcal'],['💪',meal.protein,'g P'],['🌾',meal.carbs,'g C'],['🥑',meal.fat,'g F']].map(([e,v,l])=>v&&(
              <div key={l} style={{backgroundColor:'var(--cp-bg)',borderRadius:10,padding:'10px 6px',textAlign:'center'}}>
                <div style={{fontSize:18,marginBottom:4}}>{e}</div>
                <div style={{fontSize:16,fontWeight:700,...cs.text}}>{v}</div>
                <div style={{fontSize:10,...cs.dim}}>{l}</div>
              </div>
            ))}
          </div>
          {/* Ingredients */}
          {meal.ingredients && (
            <div>
              <span style={cs.label}>Ingredients</span>
              <div style={{...cs.card,padding:'12px 14px',display:'flex',flexDirection:'column',gap:7}}>
                {meal.ingredients.split(',').map((ing,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'flex-start',gap:8}}>
                    <div style={{width:6,height:6,borderRadius:'50%',backgroundColor:'var(--cp-accent)',flexShrink:0,marginTop:5}}/>
                    <span style={{fontSize:13,...cs.text}}>{ing.trim()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Supplement pairings */}
          {supplements?.length > 0 && (
            <div>
              <span style={cs.label}>Supplement pairings</span>
              <div style={{display:'flex',flexDirection:'column',gap:7}}>
                {supplements.slice(0,3).map((s,i)=>(
                  <div key={i} style={{...cs.card,padding:'10px 14px',display:'flex',alignItems:'center',gap:10}}>
                    <span style={{fontSize:18}}>💊</span>
                    <div>
                      <p style={{margin:0,fontSize:13,fontWeight:600,...cs.text}}>{s.name}</p>
                      <p style={{margin:'2px 0 0',fontSize:11,...cs.dim}}>{s.quantity} — great with this meal</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Recipe */}
          {meal.recipe_url && (
            <a href={`/recipe?name=${encodeURIComponent(meal.name)}&ingredients=${encodeURIComponent(meal.ingredients||'')}&calories=${meal.calories||''}&protein=${meal.protein||''}&carbs=${meal.carbs||''}&fat=${meal.fat||''}`}
              target="_blank" rel="noreferrer"
              style={{display:'flex',alignItems:'center',gap:8,padding:'13px 18px',borderRadius:13,backgroundColor:'var(--cp-accent)',color:'#fff',textDecoration:'none',fontSize:14,fontWeight:600}}>
              <ExternalLink style={{width:16,height:16}}/>View Full Recipe
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Supplement Detail Sheet ───────────────────────────────────────────────────
function SupplementSheet({ supplement, planSections, onClose }) {
  const pairMeals = [];
  planSections?.forEach(s => {
    s.options?.forEach(opt => {
      const n = supplement.name?.toLowerCase()||'';
      const isProtein = n.includes('protein')||n.includes('whey');
      const isPre = n.includes('creatine')||n.includes('caffeine')||n.includes('pre');
      if (isProtein && (s.section_name?.toLowerCase().includes('breakfast')||s.section_name?.toLowerCase().includes('snack'))) pairMeals.push({...opt, section:s.section_name});
      else if (isPre && (s.section_name?.toLowerCase().includes('pre')||s.section_name?.toLowerCase().includes('post'))) pairMeals.push({...opt, section:s.section_name});
      else if (!isProtein && !isPre) pairMeals.push({...opt, section:s.section_name});
    });
  });
  const shown = pairMeals.slice(0, 3);
  return (
    <div style={{position:'fixed',inset:0,zIndex:60,display:'flex',alignItems:'flex-end',justifyContent:'center',backgroundColor:'rgba(0,0,0,0.5)'}}>
      <div style={{...cs.card,borderRadius:'20px 20px 0 0',width:'100%',maxWidth:500,maxHeight:'80vh',display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 20px 14px',borderBottom:'1px solid var(--cp-border)',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontSize:26}}>💊</span>
            <div>
              <h3 style={{margin:0,fontSize:17,fontWeight:700,fontFamily:'var(--cp-font)',...cs.text}}>{supplement.name}</h3>
              <p style={{margin:'2px 0 0',fontSize:13,...cs.dim}}>{supplement.quantity} · {supplement.timing}</p>
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',padding:4}}><X style={{width:18,height:18,...cs.dim}}/></button>
        </div>
        <div style={{overflowY:'auto',padding:'16px 20px 28px',display:'flex',flexDirection:'column',gap:14}}>
          {shown.length > 0 && (
            <div>
              <span style={cs.label}>Suggested meals to take with</span>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {shown.map((meal,i)=>(
                  <div key={i} style={{...cs.card,padding:'12px 14px'}}>
                    <p style={{margin:'0 0 2px',fontSize:14,fontWeight:600,...cs.text}}>{meal.name}</p>
                    <p style={{margin:0,fontSize:11,...cs.dim}}>{meal.section} · {meal.calories} kcal · Mix {supplement.quantity} with this meal</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Grocery Modal ────────────────────────────────────────────────────────────
function GroceryModal({ plan, onClose }) {
  const allItems = [];
  plan?.meal_sections?.forEach(s=>s.options?.forEach(opt=>{
    (opt.ingredients||'').split(',').map(i=>i.trim()).filter(Boolean).forEach(p=>{
      if (!allItems.find(i=>i.text.toLowerCase()===p.toLowerCase())) allItems.push({text:p});
    });
  }));
  const [items, setItems] = useState(allItems.map((it,i)=>({id:i,text:it.text,checked:false,deleted:false})));
  const toggle=(id)=>setItems(p=>p.map(it=>it.id===id?{...it,checked:!it.checked}:it));
  const del=(id)=>setItems(p=>p.map(it=>it.id===id?{...it,deleted:true}:it));
  const restore=(id)=>setItems(p=>p.map(it=>it.id===id?{...it,deleted:false}:it));
  const share=async()=>{
    const text=`🛒 Grocery List — ${plan.title}\n\n${items.filter(i=>!i.deleted).map(i=>`${i.checked?'✓':'○'} ${i.text}`).join('\n')}`;
    if(navigator.share){try{await navigator.share({title:'Grocery List',text});return;}catch{}}
    try{await navigator.clipboard.writeText(text);alert('Copied to clipboard!');}catch{alert(text);}
  };
  const visible=items.filter(i=>!i.deleted);
  const hidden=items.filter(i=>i.deleted);
  const checked=visible.filter(i=>i.checked).length;
  return (
    <div style={{position:'fixed',inset:0,zIndex:60,display:'flex',alignItems:'flex-end',justifyContent:'center',padding:16,backgroundColor:'rgba(0,0,0,0.5)'}}>
      <div style={{...cs.card,borderRadius:20,width:'100%',maxWidth:440,display:'flex',flexDirection:'column',maxHeight:'85vh'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 18px 10px',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}><ShoppingCart style={{width:18,height:18,...cs.accent}}/><h3 style={{margin:0,fontSize:15,fontWeight:700,fontFamily:'var(--cp-font)',...cs.text}}>Grocery List</h3><span style={{fontSize:11,padding:'2px 7px',borderRadius:20,backgroundColor:'var(--cp-bg)',...cs.dim}}>{checked}/{visible.length}</span></div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={share} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:10,border:'none',backgroundColor:'var(--cp-accent)',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer'}}><Share2 style={{width:13,height:13}}/>Share</button>
            <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer'}}><X style={{width:18,height:18,...cs.dim}}/></button>
          </div>
        </div>
        <p style={{margin:'0 18px 8px',fontSize:11,...cs.dim,flexShrink:0}}>Tap to check · 🗑 to hide items you have</p>
        <div style={{flex:1,overflowY:'auto',padding:'0 14px 16px',display:'flex',flexDirection:'column',gap:5}}>
          {visible.map(item=>(
            <div key={item.id} onClick={()=>toggle(item.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:12,backgroundColor:item.checked?'var(--cp-accent-light)':'var(--cp-bg)',border:'1px solid var(--cp-border)',cursor:'pointer'}}>
              <div style={{width:20,height:20,borderRadius:'50%',border:`2px solid ${item.checked?'var(--cp-accent)':'var(--cp-border)'}`,backgroundColor:item.checked?'var(--cp-accent)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                {item.checked&&<Check style={{width:12,height:12,color:'#fff'}}/>}
              </div>
              <span style={{flex:1,fontSize:13,textDecoration:item.checked?'line-through':'none',opacity:item.checked?0.5:1,...cs.text}}>{item.text}</span>
              <button onClick={e=>{e.stopPropagation();del(item.id);}} style={{background:'none',border:'none',cursor:'pointer',padding:2,opacity:0.4}}><Trash2 style={{width:13,height:13,...cs.dim}}/></button>
            </div>
          ))}
          {hidden.length>0&&(<div style={{marginTop:8}}><p style={{fontSize:11,...cs.dim,marginBottom:5}}>Already have ({hidden.length})</p>{hidden.map(item=>(<div key={item.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:12,border:'1px dashed var(--cp-border)',opacity:0.4,marginBottom:4}}><span style={{flex:1,fontSize:13,textDecoration:'line-through',...cs.dim}}>{item.text}</span><button onClick={()=>restore(item.id)} style={{fontSize:10,padding:'3px 8px',borderRadius:8,border:'1px solid var(--cp-border)',backgroundColor:'var(--cp-bg)',cursor:'pointer',...cs.dim}}>Restore</button></div>))}</div>)}
        </div>
        <div style={{padding:'0 18px 16px',flexShrink:0}}><div style={{height:4,borderRadius:2,backgroundColor:'var(--cp-border)',overflow:'hidden'}}><div style={{height:'100%',borderRadius:2,backgroundColor:'var(--cp-accent)',width:`${visible.length?(checked/visible.length)*100:0}%`,transition:'width 0.3s ease'}}/></div></div>
      </div>
    </div>
  );
}

// ── Supplement Tracker ────────────────────────────────────────────────────────
function SupplementTracker({ supplements, clientId }) {
  const [offset, setOffset] = useState(0);
  const date = format(offset===0?new Date():subDays(new Date(),-offset),'yyyy-MM-dd');
  const label = offset===0?'Today':format(subDays(new Date(),-offset),'EEE, MMM d');
  const [logs, setLogs] = useState([]);
  const [sheetSupp, setSheetSupp] = useState(null);
  const load = async () => { const l=await db.SupplementLog.filter({client_id:clientId,date}); setLogs(l); };
  useEffect(()=>{ if(clientId&&supplements?.length) load(); },[clientId,date]);
  const toggle = async(name)=>{
    const ex=logs.find(l=>l.supplement_name===name);
    if(ex) await db.SupplementLog.delete(ex.id);
    else await db.SupplementLog.create({client_id:clientId,date,supplement_name:name,taken_at:new Date().toISOString()});
    load();
  };
  if(!supplements?.length) return <div style={{textAlign:'center',padding:'30px 0',...cs.dim}}><p style={{fontSize:18,margin:'0 0 8px'}}>💊</p><p style={{fontSize:14,margin:0}}>No supplements in this plan</p></div>;
  return (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
        <span style={{fontSize:13,fontWeight:600,...cs.text}}>Supplement Checklist</span>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <button onClick={()=>setOffset(d=>d-1)} style={{background:'none',border:'none',cursor:'pointer',padding:2}}><ChevronLeft style={{width:14,height:14,...cs.dim}}/></button>
          <span style={{fontSize:11,...cs.dim,minWidth:70,textAlign:'center'}}>{label}</span>
          <button onClick={()=>setOffset(d=>Math.min(0,d+1))} disabled={offset===0} style={{background:'none',border:'none',cursor:'pointer',padding:2,opacity:offset===0?0.3:1}}><ChevronRight style={{width:14,height:14,...cs.dim}}/></button>
        </div>
      </div>
      {supplements.map((s,i)=>{
        const taken=logs.some(l=>l.supplement_name===s.name);
        return (
          <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:13,border:`1px solid ${taken?'var(--cp-accent)':'var(--cp-border)'}`,backgroundColor:taken?'var(--cp-accent-light)':'var(--cp-card-bg)',cursor:'pointer',transition:'all 0.2s'}}
            onClick={()=>toggle(s.name)}>
            <div style={{width:22,height:22,borderRadius:'50%',border:`2px solid ${taken?'var(--cp-accent)':'var(--cp-border)'}`,backgroundColor:taken?'var(--cp-accent)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              {taken&&<Check style={{width:13,height:13,color:'#fff'}}/>}
            </div>
            <div style={{flex:1}}>
              <p style={{margin:0,fontSize:13,fontWeight:600,...cs.text,textDecoration:taken?'line-through':'none',opacity:taken?0.6:1}}>{s.name}</p>
              <p style={{margin:'1px 0 0',fontSize:11,...cs.dim}}>{s.quantity}{s.timing?` · ${s.timing}`:''}</p>
            </div>
            <button onClick={e=>{e.stopPropagation();setSheetSupp(s);}} style={{background:'none',border:'none',cursor:'pointer',fontSize:16}}>ℹ️</button>
          </div>
        );
      })}
      {sheetSupp&&<SupplementSheet supplement={sheetSupp} planSections={[]} onClose={()=>setSheetSupp(null)}/>}
    </div>
  );
}

// ── Water Tracker ─────────────────────────────────────────────────────────────
function WaterTracker({ targetLiters=2.5, clientId }) {
  const today=format(new Date(),'yyyy-MM-dd');
  const [log,setLog]=useState(null);
  const load=async()=>{ const l=await db.WaterLog.filter({client_id:clientId,date:today}); setLog(l[0]||null); };
  useEffect(()=>{ if(clientId) load(); },[clientId]);
  const current=log?.amount_liters||0;
  const pct=Math.min(1,current/(targetLiters||2.5));
  const add=async(ml)=>{
    const addL=ml/1000;
    if(log?.id){ const u=await db.WaterLog.update(log.id,{amount_liters:parseFloat((current+addL).toFixed(2))}); setLog(u); }
    else { const c=await db.WaterLog.create({client_id:clientId,date:today,amount_liters:addL}); setLog(c); }
  };
  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontSize:13,fontWeight:600,...cs.text}}>Daily Water</span>
        <span style={{fontSize:14,fontWeight:700,color:pct>=1?'#22c55e':'#3b82f6'}}>{current.toFixed(2)}L / {targetLiters}L</span>
      </div>
      <div style={{height:10,borderRadius:5,backgroundColor:'var(--cp-bg)',overflow:'hidden'}}>
        <div style={{height:'100%',borderRadius:5,background:pct>=1?'#22c55e':'linear-gradient(90deg,#3b82f6,#60a5fa)',width:`${pct*100}%`,transition:'width 0.4s ease'}}/>
      </div>
      <div style={{display:'flex',gap:6}}>
        {[150,250,330,500].map(ml=>(
          <button key={ml} onClick={()=>add(ml)} style={{flex:1,padding:'9px 4px',borderRadius:10,border:'1px solid var(--cp-border)',backgroundColor:'var(--cp-bg)',...cs.text,fontSize:11,fontWeight:500,cursor:'pointer'}}>+{ml}ml</button>
        ))}
      </div>
      {pct>=1&&<p style={{fontSize:12,color:'#22c55e',textAlign:'center',fontWeight:600,margin:0}}>🎉 Daily goal reached!</p>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ClientNutrition() {
  const { clientUser } = useAppContext();
  const [plan, setPlan] = useState(null); // only latest plan
  const [expandedSection, setExpandedSection] = useState({});
  const [groceryOpen, setGroceryOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [tab, setTab] = useState('meals');

  useEffect(() => {
    if (!clientUser?.clientId) return;
    // Only load the LATEST plan
    db.NutritionPlan.filter({ client_id: clientUser.clientId }, '-date', 1).then(plans => {
      setPlan(plans[0] || null);
      // Auto-expand all sections
      if (plans[0]?.meal_sections) {
        const exp = {};
        plans[0].meal_sections.forEach(s => { exp[s.section_name] = true; });
        setExpandedSection(exp);
      }
    });
  }, [clientUser]);

  const supplements = plan?.supplements || [];
  const targetWater = plan?.water_liters_daily || 2.5;
  const SECTION_EMOJI = { breakfast:'🌅', 'morning snack':'🍎', lunch:'☀️', 'afternoon snack':'🥜', dinner:'🌙', 'pre-workout':'🏃', 'post-workout':'💪', snack:'🍎' };
  const getEmoji = (name) => SECTION_EMOJI[(name||'').toLowerCase()] || '🍽️';

  return (
    <ClientLayout title="Nutrition">
      {/* Tab bar */}
      <div style={{display:'flex',borderBottom:'1px solid var(--cp-border)',backgroundColor:'var(--cp-card-bg)',flexShrink:0}}>
        {[['meals','🥗 Meals'],['water','💧 Water'],['supplements','💊 Supplements']].map(([key,lbl])=>(
          <button key={key} onClick={()=>setTab(key)} style={{flex:1,padding:'12px 4px',border:'none',backgroundColor:'transparent',fontSize:12,fontWeight:tab===key?700:400,color:tab===key?'var(--cp-accent)':'var(--cp-text-dim)',borderBottom:`2px solid ${tab===key?'var(--cp-accent)':'transparent'}`,cursor:'pointer',transition:'all 0.15s'}}>{lbl}</button>
        ))}
      </div>

      <div style={{padding:'18px 16px',display:'flex',flexDirection:'column',gap:14}}>

        {/* MEALS TAB */}
        {tab==='meals'&&(
          <>
            {!plan ? (
              <div style={{textAlign:'center',padding:'48px 0',...cs.dim}}><Salad style={{width:40,height:40,margin:'0 auto 12px',opacity:0.3}}/><p style={{fontSize:14,margin:0}}>No nutrition plan assigned yet</p></div>
            ) : (
              <>
                {/* Plan header */}
                <div style={{...cs.card,overflow:'hidden'}}>
                  <div style={{padding:'14px 16px'}}>
                    <p style={{margin:'0 0 6px',fontSize:16,fontWeight:700,fontFamily:'var(--cp-font)',...cs.text}}>{plan.title}</p>
                    <div style={{display:'flex',gap:7,flexWrap:'wrap',marginBottom:8}}>
                      {[['🔥',plan.calories,'kcal'],['💪',plan.protein,'g P'],['🌾',plan.carbs,'g C'],['🥑',plan.fat,'g F'],['💧',plan.water_liters_daily,'L']].map(([e,v,l])=>v&&(
                        <span key={l} style={{fontSize:11,padding:'4px 10px',borderRadius:8,backgroundColor:'var(--cp-bg)',border:'1px solid var(--cp-border)',...cs.dim}}>{e} {v}{l}</span>
                      ))}
                    </div>
                    {plan.notes&&<p style={{margin:0,fontSize:12,...cs.dim,fontStyle:'italic'}}>{plan.notes}</p>}
                  </div>
                  <button onClick={()=>setGroceryOpen(true)} style={{width:'100%',padding:'11px 16px',border:'none',borderTop:'1px solid var(--cp-border)',backgroundColor:'var(--cp-accent)',display:'flex',alignItems:'center',justifyContent:'center',gap:8,cursor:'pointer'}}>
                    <ShoppingCart style={{width:15,height:15,color:'#fff'}}/><span style={{fontSize:13,fontWeight:600,color:'#fff'}}>Grocery List</span>
                  </button>
                </div>

                {/* Meal sections */}
                {plan.meal_sections?.map(section=>{
                  const open=!!expandedSection[section.section_name];
                  return (
                    <div key={section.section_name} style={{...cs.card,overflow:'hidden'}}>
                      {/* Section header — always visible, tap to toggle */}
                      <button onClick={()=>setExpandedSection(p=>({...p,[section.section_name]:!p[section.section_name]}))}
                        style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'15px 16px',border:'none',backgroundColor:'transparent',cursor:'pointer'}}>
                        <div style={{display:'flex',alignItems:'center',gap:12}}>
                          <span style={{fontSize:24}}>{getEmoji(section.section_name)}</span>
                          <div style={{textAlign:'left'}}>
                            <p style={{margin:0,fontSize:16,fontWeight:700,fontFamily:'var(--cp-font)',...cs.text}}>{section.section_name}</p>
                            <p style={{margin:'2px 0 0',fontSize:11,...cs.dim}}>{section.time} · {section.options?.length} meal options</p>
                          </div>
                        </div>
                        {open?<ChevronDown style={{width:17,height:17,...cs.dim}}/>:<ChevronRight style={{width:17,height:17,...cs.dim}}/>}
                      </button>

                      {/* Meal options list */}
                      {open&&section.options?.map((opt,oi)=>(
                        <button key={oi} onClick={()=>setSelectedMeal({...opt,supplements,planSections:plan.meal_sections})}
                          style={{width:'100%',display:'flex',alignItems:'center',gap:14,padding:'13px 16px',border:'none',backgroundColor:'transparent',borderTop:'1px solid var(--cp-border)',cursor:'pointer',textAlign:'left',transition:'background 0.15s'}}>
                          {/* Color stripe */}
                          <div style={{width:3,height:36,borderRadius:2,backgroundColor:'var(--cp-accent)',flexShrink:0}}/>
                          <div style={{flex:1,minWidth:0}}>
                            <p style={{margin:'0 0 2px',fontSize:14,fontWeight:600,...cs.text}}>{opt.name}</p>
                            <p style={{margin:0,fontSize:11,...cs.dim,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{opt.description}</p>
                            <div style={{display:'flex',gap:6,marginTop:5,flexWrap:'wrap'}}>
                              {[['🔥',opt.calories,'kcal'],['💪',opt.protein,'g P']].map(([e,v,l])=>v&&(
                                <span key={l} style={{fontSize:10,padding:'2px 7px',borderRadius:7,backgroundColor:'var(--cp-bg)',border:'1px solid var(--cp-border)',...cs.dim}}>{e} {v}{l}</span>
                              ))}
                            </div>
                          </div>
                          <ChevronRight style={{width:14,height:14,...cs.dim,flexShrink:0}}/>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}

        {/* WATER TAB */}
        {tab==='water'&&(
          <>
            <div style={{...cs.card,padding:'18px 16px'}}>
              <WaterTracker targetLiters={targetWater} clientId={clientUser?.clientId}/>
            </div>
            <div style={{...cs.card,padding:'14px 16px'}}>
              <p style={{margin:'0 0 4px',fontSize:13,fontWeight:600,...cs.text}}>Daily Target</p>
              <p style={{margin:0,fontSize:32,fontWeight:700,fontFamily:'var(--cp-font)',color:'#3b82f6'}}>{targetWater}L</p>
              <p style={{margin:'4px 0 10px',fontSize:12,...cs.dim}}>Recommended by your trainer</p>
              {[['Start your day with a full glass of water'],['Drink before, during, and after training'],['Carry a reusable bottle everywhere']].map(([tip],i)=>(
                <p key={i} style={{margin:'0 0 5px',fontSize:12,...cs.dim,display:'flex',gap:6}}><span style={{...cs.accent}}>•</span>{tip}</p>
              ))}
            </div>
          </>
        )}

        {/* SUPPLEMENTS TAB */}
        {tab==='supplements'&&(
          <div style={{...cs.card,padding:'16px'}}>
            <SupplementTracker supplements={supplements} clientId={clientUser?.clientId}/>
          </div>
        )}
      </div>

      {selectedMeal&&<MealSheet meal={selectedMeal} supplements={selectedMeal.supplements} onClose={()=>setSelectedMeal(null)}/>}
      {groceryOpen&&plan&&<GroceryModal plan={plan} onClose={()=>setGroceryOpen(false)}/>}
    </ClientLayout>
  );
}
