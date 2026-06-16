import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { EQUIPMENT } from '../lib/gymEquipment';

// ── Beep sound (Web Audio API) ────────────────────────────────────────────────
const playBeep = (freq = 880, dur = 0.18, vol = 0.4) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch(e) {}
};
const playDone = () => { playBeep(660, 0.12, 0.3); setTimeout(() => playBeep(880, 0.18, 0.4), 140); };
const playStart = () => { playBeep(440, 0.1, 0.25); setTimeout(() => playBeep(660, 0.1, 0.3), 120); setTimeout(() => playBeep(880, 0.22, 0.45), 240); };

// ── Animated background — subtle particles ─────────────────────────────────────
function AmbientBG({ color = '#818cf8' }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    const pts = Array.from({ length: 28 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: 1.5 + Math.random() * 2.5, a: 0.08 + Math.random() * 0.18,
      phase: Math.random() * Math.PI * 2,
    }));
    let raf, t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.012;
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        const pulse = 0.6 + Math.sin(t + p.phase) * 0.4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = color + Math.round(p.a * pulse * 255).toString(16).padStart(2, '0');
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [color]);
  return <canvas ref={ref} style={{ position:'absolute', inset:0, width:'100%', height:'100%', zIndex:0 }}/>;
}

// ── Equipment badge ────────────────────────────────────────────────────────────
function EqBadge({ eqKey }) {
  const eq = EQUIPMENT[eqKey]; if (!eq) return null;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:20,
      fontSize:11, fontWeight:700, color:eq.color, backgroundColor:eq.bg, border:`1px solid ${eq.color}55`, letterSpacing:'0.05em' }}>
      {eq.label}
    </span>
  );
}

// ── Countdown Timer ────────────────────────────────────────────────────────────
function Countdown({ seconds, onDone, label = 'REST' }) {
  const [left, setLeft] = useState(seconds);
  const [urgent, setUrgent] = useState(false);
  useEffect(() => {
    if (left <= 0) { playStart(); onDone(); return; }
    if (left <= 3) setUrgent(true);
    const t = setTimeout(() => {
      if (left <= 3) playBeep(660, 0.08, 0.2);
      setLeft(l => l - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [left]);
  const pct = ((seconds - left) / seconds) * 100;
  return (
    <div style={{ textAlign:'center', padding:'32px 0' }}>
      <p style={{ fontSize:11, letterSpacing:'0.2em', color:'var(--cp-text-dim)', marginBottom:12, textTransform:'uppercase' }}>{label}</p>
      <div style={{ position:'relative', width:120, height:120, margin:'0 auto 16px' }}>
        <svg viewBox="0 0 120 120" style={{ position:'absolute', inset:0, transform:'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6"/>
          <circle cx="60" cy="60" r="52" fill="none"
            stroke={urgent ? '#f87171' : 'var(--cp-accent)'}
            strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 52}`}
            strokeDashoffset={`${2 * Math.PI * 52 * (1 - pct / 100)}`}
            style={{ transition:'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
          />
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:38, fontWeight:800, color: urgent ? '#f87171' : 'var(--cp-text)',
          fontFamily:'var(--cp-font)', transition:'color 0.3s' }}>
          {left}
        </div>
      </div>
      <p style={{ fontSize:13, color:'var(--cp-text-dim)' }}>seconds remaining</p>
    </div>
  );
}

// ── Welcome Screen ─────────────────────────────────────────────────────────────
function WelcomeScreen({ plan, clientName, onStart }) {
  const muscles = [...new Set((plan.exercises || []).flatMap(e => {
    const eq = EQUIPMENT[e.eq]; return [];
  }))];
  const eqUsed = [...new Set((plan.exercises || []).map(e => e.eq).filter(Boolean))];
  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', padding:'40px 24px', textAlign:'center', position:'relative' }}>
      <AmbientBG color="#818cf8"/>
      <div style={{ position:'relative', zIndex:1, maxWidth:480, width:'100%' }}>
        {/* Greeting */}
        <div style={{ marginBottom:32 }}>
          <p style={{ fontSize:13, letterSpacing:'0.2em', color:'var(--cp-text-dim)', textTransform:'uppercase', marginBottom:8 }}>
            Personal Training Studio
          </p>
          <h1 style={{ fontSize:38, fontWeight:800, color:'var(--cp-text)', fontFamily:'var(--cp-font)', lineHeight:1.15, marginBottom:8 }}>
            Welcome,<br/><span style={{ color:'var(--cp-accent)' }}>{clientName || 'Athlete'}</span>
          </h1>
          <p style={{ fontSize:15, color:'var(--cp-text-dim)', lineHeight:1.6 }}>
            Get ready for today's session. Take a moment to settle in.
          </p>
        </div>

        {/* Today's session card */}
        <div style={{ background:'var(--cp-card-bg)', border:'1px solid var(--cp-border)',
          borderRadius:20, padding:'24px 28px', marginBottom:24, textAlign:'left' }}>
          <p style={{ fontSize:11, letterSpacing:'0.18em', color:'var(--cp-text-dim)', textTransform:'uppercase', marginBottom:6 }}>Today's Session</p>
          <h2 style={{ fontSize:20, fontWeight:700, color:'var(--cp-text)', marginBottom:16 }}>{plan.title}</h2>

          {/* Equipment needed */}
          {eqUsed.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <p style={{ fontSize:11, color:'var(--cp-text-dim)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.1em' }}>Equipment</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {eqUsed.map(eq => <EqBadge key={eq} eqKey={eq}/>)}
              </div>
            </div>
          )}

          {/* Exercise preview */}
          <p style={{ fontSize:11, color:'var(--cp-text-dim)', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.1em' }}>
            {plan.exercises?.length || 0} Exercises
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {(plan.exercises || []).map((ex, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10,
                padding:'8px 12px', background:'var(--cp-card-alt)', borderRadius:10 }}>
                <span style={{ width:22, height:22, borderRadius:'50%', background:'var(--cp-accent-light)',
                  color:'var(--cp-accent)', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {i + 1}
                </span>
                <span style={{ fontSize:13, color:'var(--cp-text)', flex:1 }}>{ex.name}</span>
                <span style={{ fontSize:11, color:'var(--cp-text-dim)' }}>{ex.sets}×{ex.reps}</span>
                {ex.eq && <EqBadge eqKey={ex.eq}/>}
              </div>
            ))}
          </div>
        </div>

        {/* Coach notes */}
        {plan.notes && (
          <div style={{ background:'var(--cp-accent-light)', border:`1px solid var(--cp-accent)44`,
            borderRadius:14, padding:'14px 18px', marginBottom:24, textAlign:'left' }}>
            <p style={{ fontSize:11, color:'var(--cp-accent)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:4 }}>Coach Notes</p>
            <p style={{ fontSize:13, color:'var(--cp-text)', lineHeight:1.6 }}>{plan.notes}</p>
          </div>
        )}

        {/* Start button */}
        <button onClick={onStart} style={{
          width:'100%', padding:'18px', borderRadius:16, border:'none', cursor:'pointer',
          background:'var(--cp-accent)', color:'#fff', fontSize:17, fontWeight:700,
          letterSpacing:'0.05em', fontFamily:'var(--cp-font)',
          boxShadow:`0 8px 32px var(--cp-accent)55`,
          transition:'transform 0.15s, box-shadow 0.15s',
        }}
          onMouseDown={e => e.currentTarget.style.transform='scale(0.97)'}
          onMouseUp={e => e.currentTarget.style.transform='scale(1)'}
        >
          ▶ BEGIN TRAINING
        </button>
        <p style={{ fontSize:11, color:'var(--cp-text-dim)', marginTop:10 }}>
          Press middle button on clicker to start
        </p>
      </div>
    </div>
  );
}

// ── Exercise Screen ────────────────────────────────────────────────────────────
function ExerciseScreen({ exercise, exerciseIdx, totalExercises, onExerciseDone, nextExercise, clicker }) {
  const sets = exercise.set_details?.length
    ? exercise.set_details
    : Array.from({ length: exercise.sets || 3 }, () => ({ reps: exercise.reps || '10', weight_kg: exercise.weight_kg || 0, rest_sec: exercise.rest_between_sets || 60 }));
  const totalSets = sets.length;
  const [currentSet, setCurrentSet] = useState(0);
  const [currentRep, setCurrentRep] = useState(0);
  const [phase, setPhase] = useState('resting_start'); // resting_start | active | resting | done
  const [completedReps, setCompletedReps] = useState([]); // array per set of completed reps
  const [expandedSets, setExpandedSets] = useState([]);
  const repTarget = parseInt(sets[currentSet]?.reps) || 10;
  const restSec = parseInt(sets[currentSet]?.rest_sec || exercise.rest_between_sets || 60);
  const restAfter = parseInt(exercise.rest_after_exercise || 90);

  // ── Clicker handler ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handle = (e) => {
      const k = e.key;
      // Volume Up / ArrowUp / Space = next rep or advance
      if (['ArrowUp','ArrowRight','PageDown', ' '].includes(k)) {
        e.preventDefault();
        handleNext();
      }
      // Volume Down / ArrowDown = go back one rep
      if (['ArrowDown','ArrowLeft','PageUp'].includes(k)) {
        e.preventDefault();
        handleBack();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [currentSet, currentRep, phase, completedReps]);

  const handleNext = useCallback(() => {
    if (phase === 'resting_start') {
      setPhase('active');
      setExpandedSets([currentSet]);
      return;
    }
    if (phase === 'active') {
      const target = repTarget;
      const done = (currentRep + 1);
      playBeep(880, 0.08, 0.25);
      setCurrentRep(done);
      setCompletedReps(prev => {
        const next = [...prev];
        if (!next[currentSet]) next[currentSet] = [];
        next[currentSet] = [...(next[currentSet] || []), done];
        return next;
      });
      if (done >= target) {
        // Set complete
        playDone();
        if (currentSet + 1 >= totalSets) {
          // All sets done → exercise rest
          setPhase('done');
        } else {
          setPhase('resting');
        }
      }
    }
  }, [phase, currentSet, currentRep, repTarget, totalSets]);

  const handleBack = useCallback(() => {
    if (phase === 'active' && currentRep > 0) {
      playBeep(440, 0.08, 0.2);
      setCurrentRep(r => r - 1);
      setCompletedReps(prev => {
        const next = [...prev];
        if (next[currentSet]?.length) next[currentSet] = next[currentSet].slice(0, -1);
        return next;
      });
    }
  }, [phase, currentSet, currentRep]);

  const onRestDone = () => {
    const nextSet = currentSet + 1;
    setCurrentSet(nextSet);
    setCurrentRep(0);
    setPhase('active');
    setExpandedSets(prev => [...prev, nextSet]);
  };

  const onExerciseRestDone = () => onExerciseDone();

  // ── Progress ──────────────────────────────────────────────────────────────────
  const exPct = ((exerciseIdx) / totalExercises) * 100;

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'var(--cp-bg)', position:'relative' }}>
      <AmbientBG color="#818cf8"/>
      <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', minHeight:'100vh' }}>
        {/* Progress bar */}
        <div style={{ padding:'16px 20px 0', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <span style={{ fontSize:11, color:'var(--cp-text-dim)', letterSpacing:'0.12em', textTransform:'uppercase' }}>
              Exercise {exerciseIdx + 1} of {totalExercises}
            </span>
            <span style={{ fontSize:11, color:'var(--cp-accent)', fontWeight:700 }}>
              {Math.round(exPct)}% complete
            </span>
          </div>
          <div style={{ height:4, background:'rgba(255,255,255,0.08)', borderRadius:4, overflow:'hidden' }}>
            <div style={{ height:'100%', background:'var(--cp-accent)', borderRadius:4, width:`${exPct}%`,
              transition:'width 0.6s cubic-bezier(0.4,0,0.2,1)' }}/>
          </div>
          {/* Exercise dots */}
          <div style={{ display:'flex', gap:5, marginTop:10, flexWrap:'wrap' }}>
            {Array.from({ length: totalExercises }, (_, i) => (
              <div key={i} style={{ flex:1, height:3, borderRadius:3, minWidth:8,
                background: i < exerciseIdx ? 'var(--cp-accent)' : i === exerciseIdx ? 'var(--cp-accent)99' : 'rgba(255,255,255,0.1)',
                transition:'background 0.3s' }}/>
            ))}
          </div>
        </div>

        {/* Exercise name */}
        <div style={{ padding:'20px 20px 8px', flexShrink:0 }}>
          <h1 style={{ fontSize:28, fontWeight:800, color:'var(--cp-text)', fontFamily:'var(--cp-font)', lineHeight:1.2, marginBottom:8 }}>
            {exercise.name}
          </h1>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {exercise.eq && <EqBadge eqKey={exercise.eq}/>}
            <span style={{ fontSize:12, color:'var(--cp-text-dim)' }}>
              {totalSets} sets · {exercise.reps} reps · {exercise.weight_kg > 0 ? `${exercise.weight_kg}kg` : 'Bodyweight'}
            </span>
          </div>
        </div>

        {/* Animation placeholder */}
        <div style={{ margin:'0 20px 16px', borderRadius:20, overflow:'hidden', flexShrink:0,
          background:'var(--cp-card-bg)', border:'1px solid var(--cp-border)',
          height:180, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
          <AmbientBG color={EQUIPMENT[exercise.eq]?.color || '#818cf8'}/>
          <div style={{ position:'relative', zIndex:1, textAlign:'center' }}>
            <div style={{ fontSize:52, marginBottom:8 }}>
              {exercise.eq === 'imbody' ? '🔵' : exercise.eq === 'legmachine' ? '🔴' : exercise.eq === 'dumbbells' ? '🟡' : exercise.eq === 'box' ? '🟢' : exercise.eq === 'bench' ? '🔵' : '🟣'}
            </div>
            <p style={{ fontSize:13, color:'var(--cp-text-dim)', fontStyle:'italic' }}>Animation coming soon</p>
            <EqBadge eqKey={exercise.eq}/>
          </div>
        </div>

        {/* Sets list */}
        <div style={{ flex:1, overflowY:'auto', padding:'0 20px 100px' }}>
          {phase === 'done' ? (
            <div style={{ textAlign:'center', padding:'32px 0' }}>
              <p style={{ fontSize:32, marginBottom:8 }}>✅</p>
              <p style={{ fontSize:18, fontWeight:700, color:'var(--cp-text)' }}>Exercise Complete!</p>
              {nextExercise && (
                <div style={{ marginTop:24, background:'var(--cp-card-bg)', borderRadius:16, padding:'16px 20px',
                  border:'1px solid var(--cp-border)', textAlign:'left' }}>
                  <p style={{ fontSize:11, color:'var(--cp-text-dim)', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:6 }}>Next Up</p>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:16, fontWeight:700, color:'var(--cp-text)', flex:1 }}>{nextExercise.name}</span>
                    {nextExercise.eq && <EqBadge eqKey={nextExercise.eq}/>}
                  </div>
                  <p style={{ fontSize:12, color:'var(--cp-text-dim)', marginTop:4 }}>
                    {nextExercise.sets} sets · {nextExercise.reps} reps
                  </p>
                </div>
              )}
              <Countdown seconds={restAfter} onDone={onExerciseRestDone} label="REST BEFORE NEXT EXERCISE"/>
            </div>
          ) : phase === 'resting' ? (
            <Countdown seconds={restSec} onDone={onRestDone} label="REST BETWEEN SETS"/>
          ) : (
            sets.map((s, si) => {
              const isActive = si === currentSet && phase === 'active';
              const isDone = si < currentSet || (si === currentSet && phase === 'done');
              const isExpanded = expandedSets.includes(si);
              const repsDone = completedReps[si] || [];
              const repTarget = parseInt(s.reps) || 10;
              return (
                <div key={si} style={{ marginBottom:10,
                  background: isActive ? 'var(--cp-card-bg)' : isDone ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.02)',
                  border: isActive ? `2px solid var(--cp-accent)` : `1px solid var(--cp-border)`,
                  borderRadius:16, overflow:'hidden',
                  opacity: si > currentSet ? 0.45 : 1,
                  transition:'all 0.3s' }}>
                  {/* Set header */}
                  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px' }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0,
                      background: isDone ? 'var(--cp-accent)' : isActive ? 'var(--cp-accent-light)' : 'rgba(255,255,255,0.06)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      border: isActive ? '2px solid var(--cp-accent)' : 'none',
                      transition:'all 0.3s' }}>
                      {isDone
                        ? <span style={{ fontSize:14 }}>✓</span>
                        : <span style={{ fontSize:12, fontWeight:700, color: isActive ? 'var(--cp-accent)' : 'var(--cp-text-dim)' }}>{si + 1}</span>
                      }
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:14, fontWeight:700, color:'var(--cp-text)', margin:0 }}>Set {si + 1}</p>
                      <p style={{ fontSize:12, color:'var(--cp-text-dim)', margin:0 }}>
                        {s.reps} reps{s.weight_kg > 0 ? ` @ ${s.weight_kg}kg` : ''}
                      </p>
                    </div>
                    {isActive && (
                      <div style={{ textAlign:'right' }}>
                        <p style={{ fontSize:26, fontWeight:800, color:'var(--cp-accent)', margin:0, fontFamily:'var(--cp-font)' }}>
                          {repsDone.length}<span style={{ fontSize:14, color:'var(--cp-text-dim)' }}>/{repTarget}</span>
                        </p>
                      </div>
                    )}
                    {isDone && (
                      <span style={{ fontSize:12, color:'var(--cp-accent)', fontWeight:600 }}>
                        {repsDone.length}/{repTarget} ✓
                      </span>
                    )}
                  </div>
                  {/* Rep dots — expanded when active or done */}
                  {(isActive || isDone) && isExpanded && repsDone.length > 0 && (
                    <div style={{ padding:'4px 16px 14px', display:'flex', flexWrap:'wrap', gap:6 }}>
                      {Array.from({ length: repTarget }, (_, ri) => (
                        <div key={ri} style={{
                          width:32, height:32, borderRadius:8,
                          background: ri < repsDone.length ? 'var(--cp-accent)' : 'rgba(255,255,255,0.06)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:11, fontWeight:700,
                          color: ri < repsDone.length ? '#fff' : 'var(--cp-text-dim)',
                          transition:'all 0.2s',
                          transform: ri === repsDone.length - 1 ? 'scale(1.12)' : 'scale(1)',
                        }}>
                          {ri + 1}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom HUD */}
        {phase !== 'done' && phase !== 'resting' && (
          <div style={{ position:'fixed', bottom:0, left:0, right:0, padding:'16px 20px 28px',
            background:'linear-gradient(to top, var(--cp-nav-bg) 60%, transparent)',
            zIndex:10 }}>
            {phase === 'resting_start' ? (
              <div style={{ textAlign:'center' }}>
                <p style={{ fontSize:13, color:'var(--cp-text-dim)', marginBottom:12 }}>
                  Press <strong style={{color:'var(--cp-accent)'}}>▲ UP</strong> on clicker to begin set {currentSet + 1}
                </p>
                <button onClick={handleNext} style={{
                  padding:'16px 40px', borderRadius:14, border:'none', cursor:'pointer',
                  background:'var(--cp-accent)', color:'#fff', fontSize:15, fontWeight:700 }}>
                  Start Set {currentSet + 1}
                </button>
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <p style={{ fontSize:11, color:'var(--cp-text-dim)', margin:'0 0 2px', textTransform:'uppercase', letterSpacing:'0.1em' }}>
                    Set {currentSet + 1}/{totalSets}
                  </p>
                  <p style={{ fontSize:28, fontWeight:800, color:'var(--cp-accent)', margin:0, fontFamily:'var(--cp-font)' }}>
                    Rep {currentRep + 1}<span style={{ fontSize:14, color:'var(--cp-text-dim)' }}>/{repTarget}</span>
                  </p>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={handleBack} style={{ width:52, height:52, borderRadius:14, border:'1px solid var(--cp-border)',
                    background:'var(--cp-card-bg)', color:'var(--cp-text)', fontSize:20, cursor:'pointer' }}>
                    ◀
                  </button>
                  <button onClick={handleNext} style={{ width:52, height:52, borderRadius:14, border:'none',
                    background:'var(--cp-accent)', color:'#fff', fontSize:20, cursor:'pointer',
                    boxShadow:`0 4px 20px var(--cp-accent)55` }}>
                    ▲
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Finish Screen ──────────────────────────────────────────────────────────────
function FinishScreen({ plan, clientName, onClose }) {
  const total = (plan.exercises || []).reduce((s, e) => {
    const sets = e.set_details?.length || e.sets || 0;
    const reps = parseInt(e.reps) || 10;
    const kg = e.weight_kg || 0;
    return s + sets * reps * kg;
  }, 0);
  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', padding:'40px 24px', textAlign:'center', position:'relative' }}>
      <AmbientBG color="#34d399"/>
      <div style={{ position:'relative', zIndex:1, maxWidth:420, width:'100%' }}>
        <div style={{ fontSize:72, marginBottom:16 }}>🏆</div>
        <h1 style={{ fontSize:34, fontWeight:800, color:'var(--cp-text)', fontFamily:'var(--cp-font)', marginBottom:8 }}>
          Session Complete!
        </h1>
        <p style={{ fontSize:16, color:'var(--cp-text-dim)', marginBottom:32 }}>
          Outstanding work, {clientName || 'Athlete'}. Every rep counts.
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:32 }}>
          {[
            ['💪', plan.exercises?.length || 0, 'Exercises'],
            ['📊', (plan.exercises || []).reduce((s,e)=>s+(e.set_details?.length||e.sets||0),0), 'Total Sets'],
            ['🔁', (plan.exercises || []).reduce((s,e)=>s+(e.set_details?.length||e.sets||0)*(parseInt(e.reps)||10),0), 'Total Reps'],
            ['⚖️', total > 0 ? `${Math.round(total).toLocaleString()}kg` : '—', 'Volume'],
          ].map(([icon, val, lbl]) => (
            <div key={lbl} style={{ background:'var(--cp-card-bg)', border:'1px solid var(--cp-border)',
              borderRadius:16, padding:'18px 12px' }}>
              <p style={{ fontSize:24, margin:'0 0 4px' }}>{icon}</p>
              <p style={{ fontSize:22, fontWeight:800, color:'var(--cp-text)', margin:'0 0 2px', fontFamily:'var(--cp-font)' }}>{val}</p>
              <p style={{ fontSize:11, color:'var(--cp-text-dim)', margin:0, textTransform:'uppercase', letterSpacing:'0.1em' }}>{lbl}</p>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{ width:'100%', padding:'16px', borderRadius:14, border:'none',
          background:'var(--cp-accent)', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer' }}>
          Back to Plans
        </button>
      </div>
    </div>
  );
}

// ── Main LiveTraining Page ─────────────────────────────────────────────────────
export default function LiveTraining() {
  const location = useLocation();
  const navigate = useNavigate();
  const plan = location.state?.plan;
  const clientName = location.state?.clientName || '';
  const [screen, setScreen] = useState('welcome'); // welcome | exercise | finish
  const [exerciseIdx, setExerciseIdx] = useState(0);

  // Clicker: global keydown for welcome screen start
  useEffect(() => {
    const h = (e) => {
      if (screen === 'welcome' && [' ','Enter'].includes(e.key)) {
        e.preventDefault(); setScreen('exercise');
      }
      if (screen === 'finish' && e.key === 'Escape') navigate(-1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [screen]);

  if (!plan) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <p>No training plan selected.</p>
    </div>
  );

  const exercises = plan.exercises || [];
  const currentExercise = exercises[exerciseIdx];
  const nextExercise = exercises[exerciseIdx + 1] || null;

  const onExerciseDone = () => {
    if (exerciseIdx + 1 >= exercises.length) {
      setScreen('finish');
    } else {
      setExerciseIdx(i => i + 1);
      setScreen('exercise');
    }
  };

  if (screen === 'welcome') return <WelcomeScreen plan={plan} clientName={clientName} onStart={() => setScreen('exercise')}/>;
  if (screen === 'finish') return <FinishScreen plan={plan} clientName={clientName} onClose={() => navigate(-1)}/>;
  if (screen === 'exercise' && currentExercise) return (
    <ExerciseScreen
      key={exerciseIdx}
      exercise={currentExercise}
      exerciseIdx={exerciseIdx}
      totalExercises={exercises.length}
      nextExercise={nextExercise}
      onExerciseDone={onExerciseDone}
    />
  );
  return null;
}
