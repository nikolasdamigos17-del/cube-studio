// ── ExerciseDB API Integration ────────────────────────────────────────────────
// Free public API: https://oss.exercisedb.dev
// 1,500+ exercises with GIF animations, muscles, equipment

const BASE = 'https://oss.exercisedb.dev/api/v1';

// Cache in memory to avoid repeated calls
const cache = {};

// ── Map our equipment keys → ExerciseDB equipment names ──────────────────────
const EQ_MAP = {
  imbody:     ['cable'],
  legmachine: ['leverage machine'],
  dumbbells:  ['dumbbell'],
  bench:      ['body weight', 'dumbbell'],
  box:        ['body weight'],
  bodyweight: ['body weight'],
};

// ── Map our exercise names → search terms for the API ─────────────────────────
// Fuzzy normalize: lowercase, remove punctuation, trim
const normalize = str => str?.toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim() || '';

// Search for a GIF by exercise name
export const getExerciseGif = async (exerciseName, eqKey) => {
  const key = normalize(exerciseName);
  if (cache[key]) return cache[key];

  try {
    // Try exact name search first
    const res = await fetch(`${BASE}/exercises/name/${encodeURIComponent(key)}?limit=5`);
    if (res.ok) {
      const data = await res.json();
      const exercises = Array.isArray(data) ? data : data.exercises || [];
      if (exercises.length > 0) {
        // Prefer the one that best matches our equipment
        const eqNames = EQ_MAP[eqKey] || [];
        const match = exercises.find(e =>
          eqNames.some(eq => e.equipments?.includes(eq))
        ) || exercises[0];
        const gif = match.gifUrl || null;
        if (gif) { cache[key] = gif; return gif; }
      }
    }

    // Fallback: search by equipment + first meaningful word of exercise name
    const words = key.split(' ').filter(w => w.length > 3 && !['with','from','into','over','under'].includes(w));
    if (words.length > 0 && eqKey) {
      const eqNames = EQ_MAP[eqKey] || [];
      for (const eqName of eqNames) {
        const r2 = await fetch(`${BASE}/exercises/equipment/${encodeURIComponent(eqName)}?limit=50`);
        if (r2.ok) {
          const d2 = await r2.json();
          const exs = Array.isArray(d2) ? d2 : d2.exercises || [];
          const match = exs.find(e => words.some(w => normalize(e.name).includes(w)));
          if (match?.gifUrl) { cache[key] = match.gifUrl; return match.gifUrl; }
        }
      }
    }
  } catch (e) {
    console.warn('ExerciseDB fetch failed:', e.message);
  }

  cache[key] = null;
  return null;
};

// Preload GIFs for all exercises in a plan
export const preloadPlanGifs = async (exercises) => {
  const results = {};
  await Promise.allSettled(
    exercises.map(async (ex) => {
      const gif = await getExerciseGif(ex.name, ex.eq);
      results[ex.name] = gif;
    })
  );
  return results;
};
