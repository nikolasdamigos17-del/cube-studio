import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { EQUIPMENT } from '../lib/gymEquipment';
import { preloadPlanGifs } from '../lib/exerciseApi';
import CubeBackground from '../components/CubeBackground';

// ── Audio ─────────────────────────────────────────────────────────────────────
const playBeep = (freq=880,dur=0.18,vol=0.4) => {
  try {
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.connect(gain);gain.connect(ctx.destination);
    osc.frequency.value=freq;osc.type='sine';
    gain.gain.setValueAtTime(vol,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur);
    osc.start();osc.stop(ctx.currentTime+dur);
  }catch(e){}
};
const playRep   = () => playBeep(880,0.07,0.22);
const playDone  = () => { playBeep(660,0.1,0.28); setTimeout(()=>playBeep(880,0.18,0.38),130); };
const playStart = () => { playBeep(440,0.08,0.2); setTimeout(()=>playBeep(660,0.08,0.25),110); setTimeout(()=>playBeep(880,0.2,0.4),220); };
const playUndo  = () => playBeep(440,0.08,0.15);
const playEndSet= () => { playBeep(550,0.1,0.25); setTimeout(()=>playBeep(750,0.15,0.35),120); };

// ── Equipment badge ───────────────────────────────────────────────────────────
function EqBadge({eqKey,small=false}){
  const eq=EQUIPMENT[eqKey];if(!eq)return null;
  return(
    <span style={{display:'inline-flex',alignItems:'center',gap:4,
      padding:small?'2px 8px':'4px 12px',borderRadius:20,
      fontSize:small?9:11,fontWeight:700,color:eq.color,
      backgroundColor:eq.bg,border:`1px solid ${eq.color}44`,
      letterSpacing:'0.05em',flexShrink:0}}>
      {small?eq.short:eq.label}
    </span>
  );
}

// ── Card glass wrapper (sits on top of the cube background) ───────────────────
const Card = ({children,style={}}) => (
  <div style={{
    background:'rgba(0,0,0,0.55)',backdropFilter:'blur(18px)',
    WebkitBackdropFilter:'blur(18px)',
    border:'1px solid rgba(255,255,255,0.10)',
    borderRadius:18,...style
  }}>
    {children}
  </div>
);

// ── Circular countdown ────────────────────────────────────────────────────────
function Countdown({seconds,onDone,label='REST'}){
  const[left,setLeft]=useState(seconds);
  const[urgent,setUrgent]=useState(false);
  useEffect(()=>{
    if(left<=0){playStart();onDone();return;}
    if(left<=3)setUrgent(true);
    const t=setTimeout(()=>{if(left<=3)playBeep(660,0.07,0.18);setLeft(l=>l-1);},1000);
    return()=>clearTimeout(t);
  },[left]);
  const pct=((seconds-left)/seconds)*100;
  const C=2*Math.PI*52;
  return(
    <div style={{textAlign:'center',padding:'20px 0'}}>
      <p style={{fontSize:10,letterSpacing:'0.2em',color:'rgba(255,255,255,0.5)',
        marginBottom:10,textTransform:'uppercase'}}>{label}</p>
      <div style={{position:'relative',width:110,height:110,margin:'0 auto 10px'}}>
        <svg viewBox="0 0 120 120" style={{position:'absolute',inset:0,transform:'rotate(-90deg)'}}>
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5"/>
          <circle cx="60" cy="60" r="52" fill="none"
            stroke={urgent?'#f87171':'var(--cp-accent,#818cf8)'}
            strokeWidth="5" strokeLinecap="round" strokeDasharray={C}
            strokeDashoffset={C*(1-pct/100)}
            style={{transition:'stroke-dashoffset 0.9s linear,stroke 0.3s'}}/>
        </svg>
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',
          justifyContent:'center',fontSize:34,fontWeight:800,
          color:urgent?'#f87171':'#fff',fontFamily:'var(--cp-font,"Georgia")',
          transition:'color 0.3s'}}>
          {left}
        </div>
      </div>
      <p style={{fontSize:11,color:'rgba(255,255,255,0.45)'}}>seconds</p>
    </div>
  );
}

// ── Welcome Screen ────────────────────────────────────────────────────────────
function WelcomeScreen({plan,clientName,onStart,gifs,gifsLoading}){
  const eqUsed=[...new Set((plan.exercises||[]).map(e=>e.eq).filter(Boolean))];
  return(
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',
      alignItems:'center',justifyContent:'center',padding:'32px 20px',
      textAlign:'center',position:'relative',zIndex:1,overflowY:'auto'}}>
      <div style={{maxWidth:460,width:'100%'}}>
        {/* Greeting */}
        <div style={{marginBottom:24}}>
          <p style={{fontSize:10,letterSpacing:'0.22em',color:'rgba(255,255,255,0.45)',
            textTransform:'uppercase',marginBottom:6}}>Personal Training Studio</p>
          <h1 style={{fontSize:34,fontWeight:800,color:'#fff',
            fontFamily:'var(--cp-font,"Georgia")',lineHeight:1.15,marginBottom:6}}>
            Welcome,<br/>
            <span style={{color:'var(--cp-accent,#818cf8)'}}>{clientName||'Athlete'}</span>
          </h1>
          <p style={{fontSize:14,color:'rgba(255,255,255,0.55)',lineHeight:1.6}}>
            Get ready. Take a moment to settle in.
          </p>
        </div>

        {/* Session card */}
        <Card style={{padding:'18px 20px',marginBottom:14,textAlign:'left'}}>
          <p style={{fontSize:10,letterSpacing:'0.14em',color:'rgba(255,255,255,0.4)',
            textTransform:'uppercase',marginBottom:4}}>Today's Session</p>
          <h2 style={{fontSize:17,fontWeight:700,color:'#fff',marginBottom:12}}>{plan.title}</h2>
          {eqUsed.length>0&&(
            <div style={{marginBottom:12}}>
              <p style={{fontSize:10,color:'rgba(255,255,255,0.38)',marginBottom:6,
                textTransform:'uppercase',letterSpacing:'0.1em'}}>Equipment needed</p>
              <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                {eqUsed.map(eq=><EqBadge key={eq} eqKey={eq}/>)}
              </div>
            </div>
          )}
          <p style={{fontSize:10,color:'rgba(255,255,255,0.38)',marginBottom:7,
            textTransform:'uppercase',letterSpacing:'0.1em'}}>
            {plan.exercises?.length||0} Exercises
          </p>
          <div style={{display:'flex',flexDirection:'column',gap:5}}>
            {(plan.exercises||[]).map((ex,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',
                background:'rgba(255,255,255,0.05)',borderRadius:10,
                border:'1px solid rgba(255,255,255,0.07)'}}>
                <span style={{width:20,height:20,borderRadius:'50%',
                  background:'rgba(255,255,255,0.1)',
                  color:'rgba(255,255,255,0.7)',fontSize:9,fontWeight:700,
                  display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  {i+1}
                </span>
                {gifs[ex.name]&&(
                  <img src={gifs[ex.name]} alt={ex.name}
                    style={{width:28,height:28,borderRadius:6,objectFit:'cover',flexShrink:0}}/>
                )}
                <span style={{fontSize:13,color:'rgba(255,255,255,0.85)',flex:1}}>{ex.name}</span>
                <span style={{fontSize:11,color:'rgba(255,255,255,0.4)',flexShrink:0}}>
                  {ex.sets}×{ex.reps}
                </span>
                <EqBadge eqKey={ex.eq} small/>
              </div>
            ))}
          </div>
        </Card>

        {plan.notes&&(
          <Card style={{padding:'12px 16px',marginBottom:14,textAlign:'left',
            borderColor:'rgba(129,140,248,0.3)'}}>
            <p style={{fontSize:10,color:'var(--cp-accent,#818cf8)',letterSpacing:'0.1em',
              textTransform:'uppercase',marginBottom:3}}>Coach Notes</p>
            <p style={{fontSize:13,color:'rgba(255,255,255,0.75)',lineHeight:1.6}}>
              {plan.notes}
            </p>
          </Card>
        )}

        {gifsLoading&&(
          <p style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginBottom:10}}>
            ⏳ Loading exercise animations...
          </p>
        )}

        <button onClick={onStart} style={{width:'100%',padding:'16px',borderRadius:14,
          border:'none',cursor:'pointer',
          background:'var(--cp-accent,#818cf8)',color:'#fff',
          fontSize:16,fontWeight:700,letterSpacing:'0.04em',
          fontFamily:'var(--cp-font,"Georgia")',
          boxShadow:'0 6px 28px rgba(129,140,248,0.45)',transition:'transform 0.15s'}}
          onMouseDown={e=>e.currentTarget.style.transform='scale(0.97)'}
          onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}>
          ▶ BEGIN TRAINING
        </button>
        <p style={{fontSize:10,color:'rgba(255,255,255,0.3)',marginTop:8}}>
          Press middle clicker button to start
        </p>
      </div>
    </div>
  );
}

// ── Exercise Screen ───────────────────────────────────────────────────────────
function ExerciseScreen({exercise,exerciseIdx,totalExercises,onExerciseDone,nextExercise,gifUrl,nextGifUrl}){
  const sets=exercise.set_details?.length
    ?exercise.set_details
    :Array.from({length:exercise.sets||3},()=>({
        reps:exercise.reps||'10',
        weight_kg:exercise.weight_kg||0,
        rest_sec:exercise.rest_between_sets||60
      }));
  const totalSets=sets.length;
  const[currentSet,setCurrentSet]=useState(0);
  const[currentRep,setCurrentRep]=useState(0);
  const[phase,setPhase]=useState('ready'); // ready|active|rest_set|rest_exercise
  const[completedReps,setCompletedReps]=useState({});
  const repTarget=parseInt(sets[currentSet]?.reps)||10;
  const restSec=parseInt(sets[currentSet]?.rest_sec||exercise.rest_between_sets||60);
  const restAfterEx=parseInt(exercise.rest_after_exercise||90);
  const exPct=(exerciseIdx/totalExercises)*100;

  // ── End Set early (clicker: Enter, or button) ─────────────────────────────
  const endSet=useCallback(()=>{
    if(phase!=='active')return;
    playEndSet();
    // Mark set complete with however many reps were done
    if(currentSet+1>=totalSets) setPhase('rest_exercise');
    else setPhase('rest_set');
  },[phase,currentSet,totalSets,currentRep]);

  // ── Next rep ──────────────────────────────────────────────────────────────
  const handleNext=useCallback(()=>{
    if(phase==='ready'){setPhase('active');return;}
    if(phase==='active'){
      const done=currentRep+1;
      playRep();
      setCurrentRep(done);
      setCompletedReps(prev=>({...prev,[currentSet]:[...(prev[currentSet]||[]),done]}));
      if(done>=repTarget){
        playDone();
        if(currentSet+1>=totalSets)setPhase('rest_exercise');
        else setPhase('rest_set');
      }
    }
  },[phase,currentSet,currentRep,repTarget,totalSets]);

  // ── Undo last rep ─────────────────────────────────────────────────────────
  const handleBack=useCallback(()=>{
    if(phase==='active'&&currentRep>0){
      playUndo();
      setCurrentRep(r=>r-1);
      setCompletedReps(prev=>{
        const arr=prev[currentSet]||[];
        return{...prev,[currentSet]:arr.slice(0,-1)};
      });
    }
  },[phase,currentSet,currentRep]);

  // ── Clicker key mapping ───────────────────────────────────────────────────
  // ▲ Volume Up / Space / ArrowUp  = next rep
  // ▼ Volume Down / ArrowDown      = undo rep
  // Enter / PageDown               = end set early
  useEffect(()=>{
    const h=(e)=>{
      if(['ArrowUp','ArrowRight',' '].includes(e.key)){e.preventDefault();handleNext();}
      if(['ArrowDown','ArrowLeft'].includes(e.key)){e.preventDefault();handleBack();}
      if(['Enter','PageDown'].includes(e.key)){e.preventDefault();endSet();}
    };
    window.addEventListener('keydown',h);
    return()=>window.removeEventListener('keydown',h);
  },[handleNext,handleBack,endSet]);

  const onSetRestDone=()=>{
    setCurrentSet(s=>s+1);setCurrentRep(0);setPhase('active');
  };
  const onExRestDone=()=>onExerciseDone();

  return(
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',
      position:'relative',zIndex:1}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Progress bar ── */}
      <div style={{padding:'14px 16px 0',flexShrink:0}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
          <span style={{fontSize:10,color:'rgba(255,255,255,0.4)',
            letterSpacing:'0.12em',textTransform:'uppercase'}}>
            {exerciseIdx+1} / {totalExercises}
          </span>
          <span style={{fontSize:10,color:'var(--cp-accent,#818cf8)',fontWeight:700}}>
            {Math.round(exPct)}%
          </span>
        </div>
        <div style={{height:3,background:'rgba(255,255,255,0.07)',borderRadius:3,overflow:'hidden'}}>
          <div style={{height:'100%',background:'var(--cp-accent,#818cf8)',borderRadius:3,
            width:`${exPct}%`,transition:'width 0.6s ease'}}/>
        </div>
        <div style={{display:'flex',gap:4,marginTop:7}}>
          {Array.from({length:totalExercises},(_,i)=>(
            <div key={i} style={{flex:1,height:2.5,borderRadius:2,minWidth:6,
              background:i<exerciseIdx?'var(--cp-accent,#818cf8)':
                i===exerciseIdx?'rgba(129,140,248,0.6)':'rgba(255,255,255,0.08)',
              transition:'background 0.3s'}}/>
          ))}
        </div>
      </div>

      {/* ── Exercise name + equipment ── */}
      <div style={{padding:'12px 16px 6px',flexShrink:0}}>
        <h1 style={{fontSize:22,fontWeight:800,color:'#fff',
          fontFamily:'var(--cp-font,"Georgia")',lineHeight:1.2,marginBottom:6}}>
          {exercise.name}
        </h1>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          {exercise.eq&&<EqBadge eqKey={exercise.eq}/>}
          <span style={{fontSize:11,color:'rgba(255,255,255,0.45)'}}>
            {totalSets} sets · {exercise.reps} reps
            {exercise.weight_kg>0?` · ${exercise.weight_kg}kg`:''}
          </span>
        </div>
      </div>

      {/* ── GIF on a bright card ── */}
      <div style={{margin:'0 16px 12px',flexShrink:0}}>
        <Card style={{padding:8,display:'flex',alignItems:'center',justifyContent:'center',
          height:185,background:'rgba(255,255,255,0.92)',border:'none'}}>
          {gifUrl?(
            <img src={gifUrl} alt={exercise.name}
              style={{maxHeight:170,maxWidth:'100%',objectFit:'contain',borderRadius:10}}/>
          ):(
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:40,marginBottom:6}}>
                {exercise.eq==='imbody'?'🔵':exercise.eq==='legmachine'?'🔴':
                  exercise.eq==='dumbbells'?'🟡':exercise.eq==='box'?'🟢':'🟣'}
              </div>
              <EqBadge eqKey={exercise.eq}/>
              <p style={{fontSize:10,color:'#888',marginTop:5,fontStyle:'italic'}}>
                No animation found
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* ── Sets + countdown ── */}
      <div style={{flex:1,overflowY:'auto',padding:'0 16px 120px'}}>
        {phase==='rest_exercise'?(
          <Card style={{padding:'16px',textAlign:'center'}}>
            <div style={{fontSize:26,marginBottom:4}}>✅</div>
            <p style={{fontSize:15,fontWeight:700,color:'#fff',marginBottom:10}}>
              Exercise Complete!
            </p>
            {nextExercise&&(
              <div style={{background:'rgba(255,255,255,0.06)',borderRadius:12,
                padding:'12px 14px',marginBottom:14,textAlign:'left',
                border:'1px solid rgba(255,255,255,0.08)'}}>
                <p style={{fontSize:10,color:'rgba(255,255,255,0.4)',
                  textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:6}}>
                  Next Up
                </p>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  {nextGifUrl&&(
                    <div style={{width:44,height:44,borderRadius:8,overflow:'hidden',
                      flexShrink:0,background:'rgba(255,255,255,0.9)'}}>
                      <img src={nextGifUrl} alt={nextExercise.name}
                        style={{width:'100%',height:'100%',objectFit:'contain'}}/>
                    </div>
                  )}
                  <div style={{flex:1}}>
                    <p style={{fontSize:13,fontWeight:700,color:'#fff',margin:0}}>
                      {nextExercise.name}
                    </p>
                    <p style={{fontSize:11,color:'rgba(255,255,255,0.45)',margin:'2px 0 0'}}>
                      {nextExercise.sets} sets · {nextExercise.reps} reps
                    </p>
                  </div>
                  {nextExercise.eq&&<EqBadge eqKey={nextExercise.eq}/>}
                </div>
              </div>
            )}
            <Countdown seconds={restAfterEx} onDone={onExRestDone}
              label="REST BEFORE NEXT EXERCISE"/>
          </Card>
        ):phase==='rest_set'?(
          <Card style={{padding:'16px',textAlign:'center'}}>
            <Countdown seconds={restSec} onDone={onSetRestDone}
              label={`REST — SET ${currentSet+1} DONE`}/>
          </Card>
        ):(
          sets.map((s,si)=>{
            const isActive=si===currentSet&&phase==='active';
            const isReady=si===currentSet&&phase==='ready';
            const isDone=si<currentSet||(si===currentSet&&
              (phase==='rest_set'||phase==='rest_exercise'));
            const repsDone=completedReps[si]||[];
            const rt=parseInt(s.reps)||10;
            return(
              <div key={si} style={{marginBottom:8,
                background:isActive?'rgba(0,0,0,0.6)':isDone?'rgba(0,0,0,0.3)':'rgba(0,0,0,0.2)',
                border:isActive?'2px solid var(--cp-accent,#818cf8)':
                  isDone?'1px solid rgba(255,255,255,0.08)':'1px solid rgba(255,255,255,0.05)',
                borderRadius:14,overflow:'hidden',
                opacity:si>currentSet&&!isReady?0.38:1,
                transition:'all 0.3s',
                backdropFilter:'blur(12px)'}}>
                {/* Set header */}
                <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px'}}>
                  <div style={{width:28,height:28,borderRadius:'50%',flexShrink:0,
                    background:isDone?'var(--cp-accent,#818cf8)':
                      isActive?'rgba(129,140,248,0.18)':'rgba(255,255,255,0.07)',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    border:isActive?'2px solid var(--cp-accent,#818cf8)':'none',
                    transition:'all 0.3s'}}>
                    {isDone
                      ?<span style={{fontSize:12,color:'#fff'}}>✓</span>
                      :<span style={{fontSize:11,fontWeight:700,
                          color:isActive?'var(--cp-accent,#818cf8)':'rgba(255,255,255,0.4)'}}>
                          {si+1}
                        </span>}
                  </div>
                  <div style={{flex:1}}>
                    <p style={{fontSize:13,fontWeight:700,color:'#fff',margin:0}}>
                      Set {si+1}
                    </p>
                    <p style={{fontSize:11,color:'rgba(255,255,255,0.4)',margin:0}}>
                      {s.reps} reps{s.weight_kg>0?` @ ${s.weight_kg}kg`:''}
                    </p>
                  </div>
                  {isActive&&(
                    <div style={{textAlign:'right'}}>
                      <p style={{fontSize:24,fontWeight:800,
                        color:'var(--cp-accent,#818cf8)',margin:0,
                        fontFamily:'var(--cp-font,"Georgia")'}}>
                        {repsDone.length}
                        <span style={{fontSize:12,color:'rgba(255,255,255,0.35)'}}>
                          /{rt}
                        </span>
                      </p>
                    </div>
                  )}
                  {isDone&&(
                    <span style={{fontSize:11,color:'var(--cp-accent,#818cf8)',fontWeight:600}}>
                      {repsDone.length||rt}/{rt} ✓
                    </span>
                  )}
                </div>
                {/* Rep dots */}
                {(isActive||isDone)&&repsDone.length>0&&(
                  <div style={{padding:'0 14px 12px',display:'flex',flexWrap:'wrap',gap:5}}>
                    {Array.from({length:rt},(_,ri)=>(
                      <div key={ri} style={{width:28,height:28,borderRadius:7,
                        background:ri<repsDone.length?'var(--cp-accent,#818cf8)':
                          'rgba(255,255,255,0.07)',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:10,fontWeight:700,
                        color:ri<repsDone.length?'#fff':'rgba(255,255,255,0.3)',
                        transition:'all 0.18s',
                        transform:ri===repsDone.length-1&&isActive?'scale(1.15)':'scale(1)'}}>
                        {ri+1}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Bottom HUD ── */}
      {phase!=='rest_set'&&phase!=='rest_exercise'&&(
        <div style={{position:'fixed',bottom:0,left:0,right:0,
          padding:'12px 16px 24px',
          background:'linear-gradient(to top,rgba(0,0,0,0.85) 60%,transparent)',
          zIndex:10}}>
          {phase==='ready'?(
            <div style={{textAlign:'center'}}>
              <p style={{fontSize:12,color:'rgba(255,255,255,0.45)',marginBottom:10}}>
                Press <strong style={{color:'var(--cp-accent,#818cf8)'}}>▲</strong> to begin Set {currentSet+1}
              </p>
              <button onClick={handleNext} style={{padding:'14px 44px',borderRadius:12,
                border:'none',cursor:'pointer',
                background:'var(--cp-accent,#818cf8)',color:'#fff',
                fontSize:14,fontWeight:700}}>
                Start Set {currentSet+1}
              </button>
            </div>
          ):(
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
              <div style={{flex:1}}>
                <p style={{fontSize:10,color:'rgba(255,255,255,0.4)',
                  margin:'0 0 1px',textTransform:'uppercase',letterSpacing:'0.1em'}}>
                  Set {currentSet+1}/{totalSets}
                </p>
                <p style={{fontSize:24,fontWeight:800,
                  color:'var(--cp-accent,#818cf8)',margin:0,
                  fontFamily:'var(--cp-font,"Georgia")'}}>
                  Rep {currentRep+1}
                  <span style={{fontSize:12,color:'rgba(255,255,255,0.35)'}}>
                    /{repTarget}
                  </span>
                </p>
              </div>
              {/* Undo */}
              <button onClick={handleBack}
                style={{width:46,height:46,borderRadius:12,
                  border:'1px solid rgba(255,255,255,0.15)',
                  background:'rgba(255,255,255,0.08)',color:'#fff',
                  fontSize:17,cursor:'pointer',flexShrink:0}}>
                ◀
              </button>
              {/* End Set Early */}
              <button onClick={endSet}
                title="End set now (Enter on clicker)"
                style={{height:46,padding:'0 14px',borderRadius:12,
                  border:'1px solid rgba(255,120,0,0.5)',
                  background:'rgba(255,120,0,0.18)',color:'#ffa040',
                  fontSize:11,fontWeight:700,cursor:'pointer',
                  letterSpacing:'0.05em',flexShrink:0,whiteSpace:'nowrap'}}>
                END SET
              </button>
              {/* Next rep */}
              <button onClick={handleNext}
                style={{width:52,height:46,borderRadius:12,border:'none',
                  background:'var(--cp-accent,#818cf8)',color:'#fff',
                  fontSize:18,cursor:'pointer',flexShrink:0,
                  boxShadow:'0 3px 18px rgba(129,140,248,0.5)'}}>
                ▲
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Finish Screen ─────────────────────────────────────────────────────────────
function FinishScreen({plan,clientName,onClose}){
  const exC=plan.exercises?.length||0;
  const setC=(plan.exercises||[]).reduce((s,e)=>s+(e.set_details?.length||e.sets||0),0);
  const repC=(plan.exercises||[]).reduce((s,e)=>s+(e.set_details?.length||e.sets||0)*(parseInt(e.reps)||10),0);
  const vol=(plan.exercises||[]).reduce((s,e)=>s+(e.set_details?.length||e.sets||0)*(parseInt(e.reps)||10)*(e.weight_kg||0),0);
  return(
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',
      alignItems:'center',justifyContent:'center',
      padding:'40px 20px',textAlign:'center',position:'relative',zIndex:1}}>
      <div style={{maxWidth:400,width:'100%'}}>
        <div style={{fontSize:60,marginBottom:12}}>🏆</div>
        <h1 style={{fontSize:28,fontWeight:800,color:'#fff',
          fontFamily:'var(--cp-font,"Georgia")',marginBottom:6}}>
          Session Complete!
        </h1>
        <p style={{fontSize:14,color:'rgba(255,255,255,0.55)',marginBottom:24,lineHeight:1.6}}>
          Outstanding work,{' '}
          <strong style={{color:'var(--cp-accent,#818cf8)'}}>{clientName||'Athlete'}</strong>.
          <br/>Every rep counts.
        </p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:24}}>
          {[['💪',exC,'Exercises'],['📊',setC,'Sets'],
            ['🔁',repC,'Reps'],['⚖️',vol>0?`${Math.round(vol).toLocaleString()}kg`:'—','Volume']
          ].map(([icon,val,lbl])=>(
            <Card key={lbl} style={{padding:'14px 10px'}}>
              <p style={{fontSize:22,margin:'0 0 3px'}}>{icon}</p>
              <p style={{fontSize:20,fontWeight:800,color:'#fff',margin:'0 0 2px',
                fontFamily:'var(--cp-font,"Georgia")'}}>{val}</p>
              <p style={{fontSize:10,color:'rgba(255,255,255,0.4)',margin:0,
                textTransform:'uppercase',letterSpacing:'0.1em'}}>{lbl}</p>
            </Card>
          ))}
        </div>
        <button onClick={onClose} style={{width:'100%',padding:'15px',borderRadius:13,
          border:'none',background:'var(--cp-accent,#818cf8)',color:'#fff',
          fontSize:14,fontWeight:700,cursor:'pointer'}}>
          ← Back to Plans
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LiveTraining(){
  const location=useLocation();
  const navigate=useNavigate();
  const plan=location.state?.plan;
  const clientName=location.state?.clientName||'';
  const[screen,setScreen]=useState('welcome');
  const[exerciseIdx,setExerciseIdx]=useState(0);
  const[gifs,setGifs]=useState({});
  const[gifsLoading,setGifsLoading]=useState(true);

  useEffect(()=>{
    if(!plan?.exercises?.length)return;
    preloadPlanGifs(plan.exercises).then(r=>{setGifs(r);setGifsLoading(false);});
  },[plan]);

  useEffect(()=>{
    const h=(e)=>{
      if(screen==='welcome'&&[' ','Enter'].includes(e.key)){
        e.preventDefault();setScreen('exercise');
      }
      if(screen==='finish'&&e.key==='Escape')navigate(-1);
    };
    window.addEventListener('keydown',h);
    return()=>window.removeEventListener('keydown',h);
  },[screen,navigate]);

  if(!plan)return(
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',
      justifyContent:'center',flexDirection:'column',gap:16,position:'relative',zIndex:1}}>
      <p style={{color:'#fff'}}>No training plan selected.</p>
      <button onClick={()=>navigate(-1)} style={{padding:'10px 24px',borderRadius:10,
        border:'none',background:'#818cf8',color:'#fff',cursor:'pointer'}}>
        Go Back
      </button>
    </div>
  );

  const exercises=plan.exercises||[];
  const current=exercises[exerciseIdx];
  const next=exercises[exerciseIdx+1]||null;
  const onExerciseDone=()=>{
    if(exerciseIdx+1>=exercises.length)setScreen('finish');
    else{setExerciseIdx(i=>i+1);setScreen('exercise');}
  };

  return(
    <div style={{minHeight:'100vh',position:'relative',
      background:'transparent',overflowX:'hidden'}}>
      {/* Cube background — scaled down, less intrusive */}
      <div style={{position:'fixed',inset:0,zIndex:0,
        transform:'scale(0.7)',transformOrigin:'center center',
        opacity:0.6,pointerEvents:'none'}}>
        <CubeBackground/>
      </div>
      {/* Dark overlay */}
      <div style={{position:'fixed',inset:0,zIndex:0,
        background:'rgba(0,0,0,0.55)',pointerEvents:'none'}}/>
      {/* Content */}
      {screen==='welcome'&&(
        <WelcomeScreen plan={plan} clientName={clientName}
          onStart={()=>setScreen('exercise')} gifs={gifs} gifsLoading={gifsLoading}/>
      )}
      {screen==='finish'&&(
        <FinishScreen plan={plan} clientName={clientName} onClose={()=>navigate(-1)}/>
      )}
      {screen==='exercise'&&current&&(
        <ExerciseScreen key={exerciseIdx} exercise={current}
          exerciseIdx={exerciseIdx} totalExercises={exercises.length}
          nextExercise={next} onExerciseDone={onExerciseDone}
          gifUrl={gifs[current.name]} nextGifUrl={next?gifs[next.name]:null}/>
      )}
    </div>
  );
}
