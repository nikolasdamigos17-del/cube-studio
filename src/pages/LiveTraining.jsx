import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { EQUIPMENT } from '../lib/gymEquipment';
import CubeBackground from '../components/CubeBackground';

// ── Audio ─────────────────────────────────────────────────────────────────────
const playBeep = (freq=880,dur=0.18,vol=0.4) => {
  try {
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value=freq; o.type='sine';
    g.gain.setValueAtTime(vol,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur);
    o.start(); o.stop(ctx.currentTime+dur);
  } catch(e){}
};
const playRep    = () => playBeep(880,0.07,0.22);
const playDone   = () => { playBeep(660,0.1,0.28); setTimeout(()=>playBeep(880,0.18,0.38),130); };
const playStart  = () => { playBeep(440,0.08,0.2); setTimeout(()=>playBeep(660,0.08,0.25),110); setTimeout(()=>playBeep(880,0.2,0.4),220); };
const playUndo   = () => playBeep(440,0.08,0.15);
const playEndSet = () => { playBeep(550,0.1,0.25); setTimeout(()=>playBeep(750,0.15,0.35),120); };

// ── Helpers ───────────────────────────────────────────────────────────────────
const EqBadge = ({eqKey,small=false}) => {
  const eq=EQUIPMENT[eqKey]; if(!eq) return null;
  return <span style={{display:'inline-flex',alignItems:'center',gap:4,
    padding:small?'2px 8px':'3px 10px',borderRadius:20,
    fontSize:small?9:10,fontWeight:700,color:eq.color,backgroundColor:eq.bg,
    border:`1px solid ${eq.color}44`,letterSpacing:'0.05em',flexShrink:0}}>
    {small?eq.short:eq.label}
  </span>;
};

// ── Rep circle — the core visual unit ────────────────────────────────────────
const RepCircle = ({n, state}) => {
  // state: 'pending' | 'done' | 'active'
  const bg   = state==='done'  ? '#22c55e' : state==='active' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)';
  const bord = state==='done'  ? '#22c55e' : state==='active' ? 'rgba(255,255,255,0.4)'  : 'rgba(255,255,255,0.15)';
  const col  = state==='done'  ? '#fff'    : state==='active' ? '#fff'                    : 'rgba(255,255,255,0.3)';
  return (
    <div style={{width:30,height:30,borderRadius:'50%',background:bg,
      border:`2px solid ${bord}`,display:'flex',alignItems:'center',
      justifyContent:'center',fontSize:11,fontWeight:700,color:col,
      transition:'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
      transform: state==='active'?'scale(1.12)':'scale(1)',flexShrink:0}}>
      {state==='done' ? '✓' : n}
    </div>
  );
};

// ── Circular progress (used for overall workout % top-right) ─────────────────
const CircleProgress = ({pct, size=56, stroke=4, color='#22c55e'}) => {
  const r = (size-stroke*2)/2;
  const C = 2*Math.PI*r;
  return (
    <div style={{position:'relative',width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} style={{transform:'rotate(-90deg)',position:'absolute',inset:0}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="rgba(255,255,255,0.08)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C*(1-pct/100)}
          style={{transition:'stroke-dashoffset 0.5s ease'}}/>
      </svg>
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',
        justifyContent:'center',fontSize:11,fontWeight:800,color:'#fff'}}>
        {Math.round(pct)}%
      </div>
    </div>
  );
};

// ── Countdown (corner timer, non-blocking) ────────────────────────────────────
const CornerCountdown = ({seconds, onDone, label}) => {
  const [left, setLeft] = useState(seconds);
  const [urgent, setUrgent] = useState(false);
  useEffect(()=>{
    if(left<=0){playStart();onDone();return;}
    if(left<=3){setUrgent(true); playBeep(660,0.07,0.18);}
    const t=setTimeout(()=>setLeft(l=>l-1),1000);
    return()=>clearTimeout(t);
  },[left]);
  const pct=((seconds-left)/seconds)*100;
  const r=28, C=2*Math.PI*r;
  return (
    <div style={{position:'fixed',bottom:96,left:'50%',transform:'translateX(-50%)',
      zIndex:20,display:'flex',flexDirection:'column',alignItems:'center',gap:6,
      pointerEvents:'none'}}>
      <div style={{fontSize:10,letterSpacing:'0.18em',
        color:'rgba(255,255,255,0.5)',textTransform:'uppercase'}}>{label||'REST'}</div>
      <div style={{position:'relative',width:72,height:72}}>
        <svg width={72} height={72} style={{transform:'rotate(-90deg)',position:'absolute',inset:0}}>
          <circle cx={36} cy={36} r={r} fill="rgba(0,0,0,0.55)"
            stroke="rgba(255,255,255,0.08)" strokeWidth={5}/>
          <circle cx={36} cy={36} r={r} fill="none"
            stroke={urgent?'#f87171':'var(--cp-accent,#818cf8)'}
            strokeWidth={5} strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C*(1-pct/100)}
            style={{transition:'stroke-dashoffset 0.9s linear, stroke 0.3s'}}/>
        </svg>
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',
          justifyContent:'center',fontSize:22,fontWeight:800,
          color:urgent?'#f87171':'#fff',fontFamily:'var(--cp-font)'}}>
          {left}
        </div>
      </div>
      <div style={{fontSize:9,color:'rgba(255,255,255,0.35)'}}>seconds</div>
    </div>
  );
};

// ── Top progress bar with exercise titles ─────────────────────────────────────
const TopProgress = ({exercises, currentIdx, totalRepsDone, totalRepsAll}) => {
  const overallPct = totalRepsAll > 0 ? (totalRepsDone/totalRepsAll)*100 : 0;
  return (
    <div style={{padding:'12px 14px 0',flexShrink:0}}>
      {/* Title row */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',gap:3,overflowX:'auto',scrollbarWidth:'none'}}>
            {exercises.map((ex,i)=>{
              const done=i<currentIdx, active=i===currentIdx;
              return(
                <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',
                  gap:2,minWidth:0,flexShrink:0,maxWidth:72}}>
                  <div style={{width:6,height:6,borderRadius:'50%',flexShrink:0,
                    background:done?'#22c55e':active?'var(--cp-accent,#818cf8)':'rgba(255,255,255,0.18)',
                    transition:'background 0.3s'}}/>
                  <span style={{fontSize:8,color:done?'#22c55e':active?'#fff':'rgba(255,255,255,0.3)',
                    textAlign:'center',lineHeight:1.2,overflow:'hidden',textOverflow:'ellipsis',
                    whiteSpace:'nowrap',maxWidth:70,transition:'color 0.3s'}}>
                    {ex.name.split(' ').slice(0,2).join(' ')}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Progress bar */}
          <div style={{height:3,background:'rgba(255,255,255,0.07)',borderRadius:3,
            overflow:'hidden',marginTop:6}}>
            <div style={{height:'100%',background:'linear-gradient(90deg,#22c55e,var(--cp-accent,#818cf8))',
              borderRadius:3,width:`${overallPct}%`,
              transition:'width 0.5s cubic-bezier(0.4,0,0.2,1)'}}/>
          </div>
        </div>
        {/* Overall circle */}
        <CircleProgress pct={overallPct} size={52} stroke={3} color="#22c55e"/>
      </div>
    </div>
  );
};

// ── Welcome Screen ────────────────────────────────────────────────────────────
const WelcomeScreen = ({plan, clientName, onStart}) => {
  const eqUsed=[...new Set((plan.exercises||[]).map(e=>e.eq).filter(Boolean))];
  const totalSets=(plan.exercises||[]).reduce((s,e)=>s+(e.set_details?.length||e.sets||0),0);
  const totalReps=(plan.exercises||[]).reduce((s,e)=>s+(e.set_details?.length||e.sets||0)*(parseInt(e.reps)||10),0);
  return(
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',
      alignItems:'center',justifyContent:'center',padding:'32px 20px',
      textAlign:'center',position:'relative',zIndex:1,overflowY:'auto'}}>
      <div style={{maxWidth:440,width:'100%'}}>
        <p style={{fontSize:10,letterSpacing:'0.22em',color:'rgba(255,255,255,0.4)',
          textTransform:'uppercase',marginBottom:6}}>Personal Training Studio</p>
        <h1 style={{fontSize:32,fontWeight:800,color:'#fff',
          fontFamily:'var(--cp-font,"Georgia")',lineHeight:1.15,marginBottom:6}}>
          Welcome,<br/><span style={{color:'var(--cp-accent,#818cf8)'}}>
            {clientName||'Athlete'}
          </span>
        </h1>
        <p style={{fontSize:14,color:'rgba(255,255,255,0.5)',marginBottom:24,lineHeight:1.6}}>
          Get ready. Take a moment to settle in.
        </p>

        {/* Session overview card */}
        <div style={{background:'rgba(0,0,0,0.55)',backdropFilter:'blur(14px)',
          border:'1px solid rgba(255,255,255,0.1)',borderRadius:18,
          padding:'18px 20px',marginBottom:14,textAlign:'left'}}>
          <p style={{fontSize:10,letterSpacing:'0.14em',color:'rgba(255,255,255,0.38)',
            textTransform:'uppercase',marginBottom:4}}>Today's Session</p>
          <h2 style={{fontSize:17,fontWeight:700,color:'#fff',marginBottom:14}}>
            {plan.title}
          </h2>
          {/* Stats row */}
          <div style={{display:'flex',gap:12,marginBottom:14,flexWrap:'wrap'}}>
            {[
              ['💪', plan.exercises?.length||0, 'Exercises'],
              ['📊', totalSets, 'Sets'],
              ['🔁', totalReps, 'Reps'],
            ].map(([icon,val,lbl])=>(
              <div key={lbl} style={{background:'rgba(255,255,255,0.05)',borderRadius:10,
                padding:'8px 12px',textAlign:'center',flex:1}}>
                <div style={{fontSize:18,marginBottom:2}}>{icon}</div>
                <div style={{fontSize:16,fontWeight:800,color:'#fff'}}>{val}</div>
                <div style={{fontSize:9,color:'rgba(255,255,255,0.38)',
                  textTransform:'uppercase',letterSpacing:'0.1em'}}>{lbl}</div>
              </div>
            ))}
          </div>
          {eqUsed.length>0&&(
            <div style={{marginBottom:12}}>
              <p style={{fontSize:9,color:'rgba(255,255,255,0.35)',marginBottom:6,
                textTransform:'uppercase',letterSpacing:'0.1em'}}>Equipment</p>
              <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                {eqUsed.map(eq=><EqBadge key={eq} eqKey={eq}/>)}
              </div>
            </div>
          )}
          {/* Exercise list preview */}
          <div style={{display:'flex',flexDirection:'column',gap:5}}>
            {(plan.exercises||[]).map((ex,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:8,
                padding:'7px 10px',background:'rgba(255,255,255,0.04)',
                borderRadius:10,border:'1px solid rgba(255,255,255,0.06)'}}>
                <span style={{width:18,height:18,borderRadius:'50%',
                  background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.5)',
                  fontSize:8,fontWeight:700,display:'flex',alignItems:'center',
                  justifyContent:'center',flexShrink:0}}>{i+1}</span>
                <span style={{fontSize:12,color:'rgba(255,255,255,0.8)',flex:1}}>
                  {ex.name}
                </span>
                <span style={{fontSize:10,color:'rgba(255,255,255,0.35)',flexShrink:0}}>
                  {ex.sets}×{ex.reps}
                </span>
                <EqBadge eqKey={ex.eq} small/>
              </div>
            ))}
          </div>
        </div>

        {plan.notes&&(
          <div style={{background:'rgba(129,140,248,0.12)',
            border:'1px solid rgba(129,140,248,0.3)',
            borderRadius:12,padding:'12px 16px',marginBottom:14,textAlign:'left'}}>
            <p style={{fontSize:9,color:'var(--cp-accent,#818cf8)',letterSpacing:'0.1em',
              textTransform:'uppercase',marginBottom:3}}>Coach Notes</p>
            <p style={{fontSize:13,color:'rgba(255,255,255,0.7)',lineHeight:1.6}}>
              {plan.notes}
            </p>
          </div>
        )}

        <button onClick={onStart} style={{width:'100%',padding:'16px',borderRadius:14,
          border:'none',cursor:'pointer',
          background:'var(--cp-accent,#818cf8)',color:'#fff',
          fontSize:15,fontWeight:700,fontFamily:'var(--cp-font)',
          boxShadow:'0 6px 28px rgba(129,140,248,0.4)'}}>
          ▶ BEGIN TRAINING
        </button>
        <p style={{fontSize:10,color:'rgba(255,255,255,0.28)',marginTop:8}}>
          Press middle clicker button to start
        </p>
      </div>
    </div>
  );
};

// ── Exercise Screen ───────────────────────────────────────────────────────────
const ExerciseScreen = ({
  exercise, exerciseIdx, totalExercises,
  exercises, totalRepsDone, totalRepsAll,
  onExerciseDone, nextExercise,
}) => {
  const sets = exercise.set_details?.length
    ? exercise.set_details
    : Array.from({length:exercise.sets||3},()=>({
        reps:exercise.reps||'10',
        weight_kg:exercise.weight_kg||0,
        rest_sec:exercise.rest_between_sets||60,
      }));
  const totalSets = sets.length;

  const [currentSet,  setCurrentSet]  = useState(0);
  const [currentRep,  setCurrentRep]  = useState(0);
  const [phase, setPhase]             = useState('ready'); // ready|active|rest_set|rest_exercise
  const [completedReps, setCompletedReps] = useState({}); // {setIdx: count}
  const [repsDoneInSession, setRepsDoneInSession] = useState(0);

  const repTarget   = parseInt(sets[currentSet]?.reps)||10;
  const restSec     = parseInt(sets[currentSet]?.rest_sec||exercise.rest_between_sets||60);
  const restAfterEx = parseInt(exercise.rest_after_exercise||90);

  // Total reps completed THIS exercise so far (for global progress)
  const exRepsDone = Object.values(completedReps).reduce((s,v)=>s+v,0);

  // ── End Set early ────────────────────────────────────────────────────────────
  const endSet = useCallback(()=>{
    if(phase!=='active') return;
    playEndSet();
    const done = currentRep;
    setCompletedReps(prev=>({...prev,[currentSet]:done}));
    if(currentSet+1>=totalSets) setPhase('rest_exercise');
    else setPhase('rest_set');
  },[phase,currentSet,totalSets,currentRep]);

  // ── Next rep ─────────────────────────────────────────────────────────────────
  const handleNext = useCallback(()=>{
    if(phase==='ready'){setPhase('active');return;}
    if(phase==='active'){
      const done = currentRep+1;
      playRep();
      setCurrentRep(done);
      setRepsDoneInSession(r=>r+1);
      if(done>=repTarget){
        setCompletedReps(prev=>({...prev,[currentSet]:done}));
        playDone();
        if(currentSet+1>=totalSets) setPhase('rest_exercise');
        else setPhase('rest_set');
      }
    }
  },[phase,currentSet,currentRep,repTarget,totalSets]);

  // ── Undo last rep ────────────────────────────────────────────────────────────
  const handleBack = useCallback(()=>{
    if(phase==='active'&&currentRep>0){
      playUndo();
      setCurrentRep(r=>r-1);
      setRepsDoneInSession(r=>Math.max(0,r-1));
    }
  },[phase,currentSet,currentRep]);

  // ── Keyboard / clicker ───────────────────────────────────────────────────────
  useEffect(()=>{
    const h=(e)=>{
      if(['ArrowUp','ArrowRight',' '].includes(e.key)){e.preventDefault();handleNext();}
      if(['ArrowDown','ArrowLeft'].includes(e.key)){e.preventDefault();handleBack();}
      if(['Enter','PageDown'].includes(e.key)){e.preventDefault();endSet();}
    };
    window.addEventListener('keydown',h);
    return()=>window.removeEventListener('keydown',h);
  },[handleNext,handleBack,endSet]);

  const onSetRestDone  = () => { setCurrentSet(s=>s+1); setCurrentRep(0); setPhase('active'); };
  const onExRestDone   = () => onExerciseDone(exRepsDone);

  return(
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',
      position:'relative',zIndex:1}}>

      {/* ── Top progress ── */}
      <TopProgress
        exercises={exercises}
        currentIdx={exerciseIdx}
        totalRepsDone={totalRepsDone + exRepsDone}
        totalRepsAll={totalRepsAll}
      />

      {/* ── Exercise header ── */}
      <div style={{padding:'10px 14px 4px',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'flex-start',gap:10,
          background:'rgba(0,0,0,0.5)',backdropFilter:'blur(10px)',
          border:'1px solid rgba(255,255,255,0.09)',borderRadius:14,
          padding:'12px 14px'}}>
          <div style={{flex:1}}>
            <h1 style={{fontSize:20,fontWeight:800,color:'#fff',
              fontFamily:'var(--cp-font)',lineHeight:1.2,margin:0,marginBottom:4}}>
              {exercise.name}
            </h1>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
              {exercise.eq&&<EqBadge eqKey={exercise.eq}/>}
              <span style={{fontSize:10,color:'rgba(255,255,255,0.4)'}}>
                {totalSets} sets · {exercise.reps} reps
                {exercise.weight_kg>0?` · ${exercise.weight_kg}kg`:''}
              </span>
            </div>
          </div>
          {/* Exercise counter circle */}
          <CircleProgress
            pct={(exerciseIdx/totalExercises)*100}
            size={44} stroke={3}
            color="var(--cp-accent,#818cf8)"
          />
        </div>
      </div>

      {/* ── Sets list ── */}
      <div style={{flex:1,overflowY:'auto',padding:'6px 14px 110px'}}>
        {sets.map((s,si)=>{
          const isDone   = completedReps[si] !== undefined;
          const isActive = si===currentSet && (phase==='active'||phase==='ready');
          const isFuture = si>currentSet;
          const repsCount = completedReps[si] ?? 0;
          const rt = parseInt(s.reps)||10;

          return(
            <div key={si} style={{
              marginBottom:8,borderRadius:16,overflow:'hidden',
              border: isActive ? '2px solid var(--cp-accent,#818cf8)'
                     : isDone  ? '1px solid rgba(34,197,94,0.35)'
                                : '1px solid rgba(255,255,255,0.07)',
              background: isActive ? 'rgba(0,0,0,0.65)'
                         : isDone  ? 'rgba(0,0,0,0.35)'
                                   : 'rgba(0,0,0,0.25)',
              backdropFilter:'blur(8px)',
              opacity: isFuture ? 0.45 : 1,
              transition:'all 0.3s ease',
            }}>

              {/* Set header — always visible */}
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px'}}>
                {/* Status circle */}
                <div style={{width:26,height:26,borderRadius:'50%',flexShrink:0,
                  background:isDone?'rgba(34,197,94,0.15)':isActive?'rgba(129,140,248,0.15)':'rgba(255,255,255,0.05)',
                  border:`2px solid ${isDone?'#22c55e':isActive?'var(--cp-accent,#818cf8)':'rgba(255,255,255,0.15)'}`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:11,fontWeight:800,
                  color:isDone?'#22c55e':isActive?'var(--cp-accent,#818cf8)':'rgba(255,255,255,0.3)',
                  transition:'all 0.3s'}}>
                  {isDone ? '✓' : si+1}
                </div>
                <div style={{flex:1}}>
                  <p style={{margin:0,fontSize:13,fontWeight:700,
                    color:isDone?'rgba(34,197,94,0.9)':isActive?'#fff':'rgba(255,255,255,0.45)'}}>
                    Set {si+1}
                  </p>
                  <p style={{margin:0,fontSize:11,
                    color:isDone?'rgba(34,197,94,0.6)':'rgba(255,255,255,0.35)'}}>
                    {isDone ? `${repsCount}/${rt} reps` : `${s.reps} reps`}
                    {s.weight_kg>0 ? ` · ${s.weight_kg}kg` : ''}
                    {isDone && repsCount<rt ? ' (early finish)' : ''}
                  </p>
                </div>
                {/* Active: live rep counter */}
                {isActive && phase==='active' && (
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <span style={{fontSize:22,fontWeight:900,
                      color:'var(--cp-accent,#818cf8)',fontFamily:'var(--cp-font)'}}>
                      {currentRep}
                    </span>
                    <span style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>/{rt}</span>
                  </div>
                )}
              </div>

              {/* Rep circles — only shown for active set */}
              {isActive && phase==='active' && (
                <div style={{padding:'0 14px 12px',
                  display:'flex',flexWrap:'wrap',gap:6}}>
                  {Array.from({length:rt},(_,ri)=>(
                    <RepCircle key={ri} n={ri+1}
                      state={ri<currentRep?'done':ri===currentRep?'active':'pending'}/>
                  ))}
                </div>
              )}

              {/* Start Set button if active but ready */}
              {isActive && phase==='ready' && (
                <div style={{padding:'0 14px 12px',textAlign:'center'}}>
                  <button onClick={handleNext} style={{
                    padding:'10px 32px',borderRadius:10,border:'none',cursor:'pointer',
                    background:'var(--cp-accent,#818cf8)',color:'#fff',
                    fontSize:13,fontWeight:700}}>
                    Start Set {si+1}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Exercise done — next exercise preview */}
        {(phase==='rest_exercise') && nextExercise && (
          <div style={{marginTop:8,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(10px)',
            border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:'14px'}}>
            <p style={{fontSize:10,color:'rgba(255,255,255,0.38)',
              textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:8}}>
              Next Up
            </p>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{flex:1}}>
                <p style={{fontSize:14,fontWeight:700,color:'#fff',margin:0}}>
                  {nextExercise.name}
                </p>
                <p style={{fontSize:11,color:'rgba(255,255,255,0.4)',margin:'3px 0 0'}}>
                  {nextExercise.sets} sets · {nextExercise.reps} reps
                  {nextExercise.weight_kg>0?` · ${nextExercise.weight_kg}kg`:''}
                </p>
              </div>
              {nextExercise.eq && <EqBadge eqKey={nextExercise.eq}/>}
            </div>
          </div>
        )}
      </div>

      {/* ── Corner countdown timer (non-blocking) ── */}
      {phase==='rest_set' && (
        <CornerCountdown
          key={`set-${currentSet}`}
          seconds={restSec}
          onDone={onSetRestDone}
          label={`Rest · Set ${currentSet+1} done`}
        />
      )}
      {phase==='rest_exercise' && (
        <CornerCountdown
          key="ex-rest"
          seconds={restAfterEx}
          onDone={onExRestDone}
          label="Rest · Exercise done"
        />
      )}

      {/* ── Bottom HUD ── */}
      {(phase==='active'||phase==='ready') && (
        <div style={{position:'fixed',bottom:0,left:0,right:0,
          padding:'10px 14px 22px',
          background:'linear-gradient(to top,rgba(0,0,0,0.88) 60%,transparent)',
          zIndex:10}}>
          {phase==='ready' ? (
            <div style={{textAlign:'center'}}>
              <p style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginBottom:8}}>
                Press <strong style={{color:'var(--cp-accent,#818cf8)'}}>▲</strong> to begin
              </p>
              <button onClick={handleNext} style={{padding:'13px 40px',
                borderRadius:12,border:'none',cursor:'pointer',
                background:'var(--cp-accent,#818cf8)',color:'#fff',
                fontSize:13,fontWeight:700}}>
                Start Set {currentSet+1}
              </button>
            </div>
          ):(
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{flex:1}}>
                <p style={{fontSize:10,color:'rgba(255,255,255,0.38)',
                  margin:'0 0 1px',textTransform:'uppercase',letterSpacing:'0.1em'}}>
                  Set {currentSet+1}/{totalSets}
                </p>
                <p style={{fontSize:22,fontWeight:900,
                  color:'var(--cp-accent,#818cf8)',margin:0,fontFamily:'var(--cp-font)'}}>
                  Rep {currentRep+1}<span style={{fontSize:11,
                    color:'rgba(255,255,255,0.3)'}}>/{repTarget}</span>
                </p>
              </div>
              <button onClick={handleBack}
                style={{width:44,height:44,borderRadius:11,
                  border:'1px solid rgba(255,255,255,0.15)',
                  background:'rgba(255,255,255,0.07)',
                  color:'#fff',fontSize:16,cursor:'pointer',flexShrink:0}}>
                ◀
              </button>
              <button onClick={endSet}
                style={{height:44,padding:'0 12px',borderRadius:11,
                  border:'1px solid rgba(255,165,0,0.4)',
                  background:'rgba(255,140,0,0.15)',color:'#ffa040',
                  fontSize:10,fontWeight:700,cursor:'pointer',
                  letterSpacing:'0.05em',flexShrink:0,whiteSpace:'nowrap'}}>
                END SET
              </button>
              <button onClick={handleNext}
                style={{width:52,height:44,borderRadius:11,border:'none',
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
};

// ── Finish Screen ─────────────────────────────────────────────────────────────
const FinishScreen = ({plan, clientName, onClose}) => {
  const exC  = plan.exercises?.length||0;
  const setC = (plan.exercises||[]).reduce((s,e)=>s+(e.set_details?.length||e.sets||0),0);
  const repC = (plan.exercises||[]).reduce((s,e)=>s+(e.set_details?.length||e.sets||0)*(parseInt(e.reps)||10),0);
  const vol  = (plan.exercises||[]).reduce((s,e)=>s+(e.set_details?.length||e.sets||0)*(parseInt(e.reps)||10)*(e.weight_kg||0),0);
  return(
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',
      alignItems:'center',justifyContent:'center',
      padding:'40px 20px',textAlign:'center',position:'relative',zIndex:1}}>
      <div style={{maxWidth:380,width:'100%'}}>
        <div style={{fontSize:56,marginBottom:12}}>🏆</div>
        <h1 style={{fontSize:26,fontWeight:800,color:'#fff',
          fontFamily:'var(--cp-font)',marginBottom:6}}>Session Complete!</h1>
        <p style={{fontSize:14,color:'rgba(255,255,255,0.5)',marginBottom:24,lineHeight:1.6}}>
          Outstanding work,{' '}
          <strong style={{color:'var(--cp-accent,#818cf8)'}}>{clientName||'Athlete'}</strong>.
        </p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:24}}>
          {[['💪',exC,'Exercises'],['📊',setC,'Sets'],
            ['🔁',repC,'Reps'],['⚖️',vol>0?`${Math.round(vol).toLocaleString()}kg`:'—','Volume']
          ].map(([icon,val,lbl])=>(
            <div key={lbl} style={{background:'rgba(0,0,0,0.55)',backdropFilter:'blur(8px)',
              border:'1px solid rgba(255,255,255,0.09)',borderRadius:14,padding:'14px 10px'}}>
              <p style={{fontSize:20,margin:'0 0 3px'}}>{icon}</p>
              <p style={{fontSize:18,fontWeight:800,color:'#fff',margin:'0 0 2px',
                fontFamily:'var(--cp-font)'}}>{val}</p>
              <p style={{fontSize:9,color:'rgba(255,255,255,0.38)',margin:0,
                textTransform:'uppercase',letterSpacing:'0.1em'}}>{lbl}</p>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{width:'100%',padding:'14px',borderRadius:13,
          border:'none',background:'var(--cp-accent,#818cf8)',color:'#fff',
          fontSize:14,fontWeight:700,cursor:'pointer'}}>
          ← Back to Plans
        </button>
      </div>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LiveTraining() {
  const location = useLocation();
  const navigate = useNavigate();
  const plan       = location.state?.plan;
  const clientName = location.state?.clientName || '';
  const [screen,        setScreen]        = useState('welcome');
  const [exerciseIdx,   setExerciseIdx]   = useState(0);
  const [totalRepsDone, setTotalRepsDone] = useState(0);

  const exercises   = plan?.exercises || [];
  const totalRepsAll = exercises.reduce((s,e)=>
    s+(e.set_details?.length||e.sets||0)*(parseInt(e.reps)||10), 0);

  // Clicker: welcome → start
  useEffect(()=>{
    const h=(e)=>{
      if(screen==='welcome'&&[' ','Enter'].includes(e.key)){
        e.preventDefault(); setScreen('exercise');
      }
      if(screen==='finish'&&e.key==='Escape') navigate(-1);
    };
    window.addEventListener('keydown',h);
    return()=>window.removeEventListener('keydown',h);
  },[screen,navigate]);

  if(!plan) return(
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',
      justifyContent:'center',flexDirection:'column',gap:16,position:'relative',zIndex:1}}>
      <p style={{color:'#fff'}}>No training plan selected.</p>
      <button onClick={()=>navigate(-1)} style={{padding:'10px 24px',borderRadius:10,
        border:'none',background:'#818cf8',color:'#fff',cursor:'pointer'}}>Go Back</button>
    </div>
  );

  const current = exercises[exerciseIdx];
  const next    = exercises[exerciseIdx+1]||null;

  const onExerciseDone = (repsDone=0) => {
    setTotalRepsDone(t => t + repsDone);
    if(exerciseIdx+1>=exercises.length) setScreen('finish');
    else { setExerciseIdx(i=>i+1); setScreen('exercise'); }
  };

  return(
    <div style={{minHeight:'100vh',position:'relative',
      background:'transparent',overflowX:'hidden'}}>
      <CubeBackground/>
      <div style={{position:'fixed',inset:0,zIndex:0,
        background:'rgba(0,0,0,0.50)',pointerEvents:'none'}}/>
      {screen==='welcome' && (
        <WelcomeScreen plan={plan} clientName={clientName}
          onStart={()=>setScreen('exercise')}/>
      )}
      {screen==='finish' && (
        <FinishScreen plan={plan} clientName={clientName}
          onClose={()=>navigate(-1)}/>
      )}
      {screen==='exercise' && current && (
        <ExerciseScreen
          key={exerciseIdx}
          exercise={current}
          exerciseIdx={exerciseIdx}
          totalExercises={exercises.length}
          exercises={exercises}
          totalRepsDone={totalRepsDone}
          totalRepsAll={totalRepsAll}
          nextExercise={next}
          onExerciseDone={onExerciseDone}
        />
      )}
    </div>
  );
}
