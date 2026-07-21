// ── Hevy API Integration ──────────────────────────────────────────────────────
// Docs: https://api.hevyapp.com/docs
// Auth: api-key header
// Note: Calls made from browser (CORS enabled by Hevy for browser clients)

const HEVY_BASE = 'https://api.hevyapp.com/v1';

const hevyFetch = async (endpoint, options = {}) => {
  const apiKey = localStorage.getItem('hevy_api_key') || '3ca8d9a1-4220-46f3-8f58-e20ba799db26';
  const res = await fetch(`${HEVY_BASE}${endpoint}`, {
    ...options,
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Hevy API ${res.status}: ${err}`);
  }
  return res.json();
};

// ── READ — Get all workouts (paginated) ───────────────────────────────────────
export const getWorkouts = async (page = 1, pageSize = 10) => {
  return hevyFetch(`/workouts?page=${page}&pageSize=${pageSize}`);
};

// ── READ — Get all workouts since a date ──────────────────────────────────────
export const getWorkoutsSince = async (sinceDate) => {
  const allWorkouts = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const data = await hevyFetch(`/workouts?page=${page}&pageSize=50`);
    const workouts = data.workouts || [];
    // Hevy returns newest first — stop when we hit older than sinceDate
    const relevant = workouts.filter(w => new Date(w.start_time) >= new Date(sinceDate));
    allWorkouts.push(...relevant);
    if (relevant.length < workouts.length || workouts.length < 50) hasMore = false;
    else page++;
    if (page > 20) break; // safety limit
  }
  return allWorkouts;
};

// ── READ — Get single workout ─────────────────────────────────────────────────
export const getWorkout = async (workoutId) => {
  return hevyFetch(`/workouts/${workoutId}`);
};

// ── READ — Get recent workout events (since timestamp) ────────────────────────
export const getWorkoutEvents = async (since) => {
  const params = since ? `?since=${encodeURIComponent(since)}` : '';
  return hevyFetch(`/workout-events${params}`);
};

// ── READ — Get all routines ───────────────────────────────────────────────────
export const getRoutines = async (page = 1, pageSize = 50) => {
  return hevyFetch(`/routines?page=${page}&pageSize=${pageSize}`);
};

// ── READ — Get exercise templates ─────────────────────────────────────────────
export const getExerciseTemplates = async (page = 1, pageSize = 100) => {
  return hevyFetch(`/exercise_templates?page=${page}&pageSize=${pageSize}`);
};

// ── WRITE — Create a routine (push training plan from Cube → Hevy) ────────────
export const createRoutine = async (plan) => {
  // Convert Cube training plan format → Hevy routine format
  const body = {
    routine: {
      title: plan.title || 'Training Session',
      notes: plan.notes || '',
      exercises: (plan.exercises || []).map(ex => ({
        exercise_template_id: ex.hevy_template_id || null, // if we have it
        notes: ex.notes || '',
        sets: (ex.set_details?.length ? ex.set_details : Array.from({ length: ex.sets || 3 }, () => ({
          reps: parseInt(ex.reps) || 10,
          weight_kg: parseFloat(ex.weight_kg) || 0,
        }))).map(s => ({
          type: 'normal',
          weight_kg: parseFloat(s.weight_kg) || 0,
          reps: parseInt(s.reps) || 10,
        })),
      })).filter(ex => ex.sets.length > 0),
    },
  };
  return hevyFetch('/routines', {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

// ── WRITE — Create a workout (log a completed session) ────────────────────────
export const createWorkout = async (workoutData) => {
  return hevyFetch('/workouts', {
    method: 'POST',
    body: JSON.stringify({ workout: workoutData }),
  });
};

// ── HELPERS — Parse Hevy workout into Cube-compatible format ──────────────────
export const parseHevyWorkout = (hevyWorkout) => {
  const durationMin = hevyWorkout.end_time && hevyWorkout.start_time
    ? Math.round((new Date(hevyWorkout.end_time) - new Date(hevyWorkout.start_time)) / 60000)
    : null;
  return {
    hevy_id: hevyWorkout.id,
    title: hevyWorkout.title || 'Workout',
    date: hevyWorkout.start_time ? hevyWorkout.start_time.split('T')[0] : null,
    start_time: hevyWorkout.start_time,
    end_time: hevyWorkout.end_time,
    duration_minutes: durationMin,
    description: hevyWorkout.description || '',
    exercises: (hevyWorkout.exercises || []).map(ex => ({
      hevy_template_id: ex.exercise_template_id,
      name: ex.title || ex.exercise_template_id || 'Exercise',
      notes: ex.notes || '',
      sets: ex.sets?.length || 0,
      reps: ex.sets?.[0]?.reps?.toString() || '0',
      weight_kg: ex.sets?.[0]?.weight_kg || 0,
      set_details: (ex.sets || []).map(s => ({
        type: s.type,
        reps: s.reps?.toString() || '0',
        weight_kg: s.weight_kg || 0,
        duration_seconds: s.duration_seconds,
        rpe: s.rpe,
        completed: s.indicator === 'completed',
      })),
      volume_kg: (ex.sets || []).reduce((sum, s) => sum + ((s.weight_kg || 0) * (s.reps || 0)), 0),
    })),
    total_volume_kg: (hevyWorkout.exercises || []).reduce((sum, ex) =>
      sum + (ex.sets || []).reduce((s2, s) => s2 + ((s.weight_kg || 0) * (s.reps || 0)), 0), 0),
  };
};

// ── LIVE MONITOR — Poll for new workouts every N seconds ─────────────────────
export const startLiveMonitor = (onNewWorkout, intervalSeconds = 30) => {
  let lastCheckTime = new Date().toISOString();
  const poll = async () => {
    try {
      const data = await hevyFetch(`/workouts?page=1&pageSize=5`);
      const workouts = data.workouts || [];
      const newOnes = workouts.filter(w => w.updated_at > lastCheckTime || w.created_at > lastCheckTime);
      if (newOnes.length > 0) {
        lastCheckTime = new Date().toISOString();
        newOnes.forEach(w => onNewWorkout(parseHevyWorkout(w)));
      }
    } catch (e) {
      console.warn('Hevy poll failed:', e.message);
    }
  };
  const interval = setInterval(poll, intervalSeconds * 1000);
  poll(); // immediate first check
  return () => clearInterval(interval); // returns cleanup function
};
