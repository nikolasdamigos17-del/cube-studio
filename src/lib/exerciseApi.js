// ── Exercise GIF lookup via free-exercise-db (GitHub hosted, no limits) ────────
// Images: https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/{id}/0.jpg
// JSON:   https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json

// Manually curated mapping: our exercise names → free-exercise-db image IDs
// Covers every exercise in our EXERCISE_DB
const EXERCISE_MAP = {
  // ── IMBODY / Cable ────────────────────────────────────────────────────────
  'cable chest press':            'Cable_Crossover',
  'low cable fly':                'Cable_Crossover',
  'high cable fly':               'Cable_Crossover',
  'cable crossover':              'Cable_Crossover',
  'single arm cable press':       'Cable_Crossover',
  'cable row':                    'Cable_Seated_Row',
  'cable lat pulldown':           'Cable_Pulldown',
  'straight arm pulldown':        'Cable_Pulldown',
  'cable face pull':              'Cable_Face_Pull',
  'single arm cable row':         'Cable_Seated_Row',
  'cable reverse fly':            'Cable_Rear_Delt_Row_(Version_2)',
  'cable lateral raise':          'Cable_Lateral_Raise',
  'cable front raise':            'Cable_Front_Raise',
  'cable overhead press':         'Cable_Overhead_Tricep_Extension',
  'cable upright row':            'Cable_Upright_Row',
  'cable bicep curl':             'Cable_Curl',
  'cable hammer curl':            'Cable_Curl',
  'cable tricep pushdown':        'Cable_Pushdown_(with_Rope)',
  'cable overhead tricep ext':    'Cable_Overhead_Tricep_Extension',
  'cable romanian deadlift':      'Romanian_Deadlift',
  'cable kickback':               'Cable_Hip_Abduction',
  'cable hip abduction':          'Cable_Hip_Abduction',
  'cable pull-through':           'Cable_Hip_Abduction',
  'cable lunge':                  'Lunge',
  'cable crunch':                 'Decline_Crunch',
  'cable woodchop':               'Dumbbell_Side_Bend',
  'cable pallof press':           'Decline_Crunch',
  'cable squat to row':           'Cable_Seated_Row',
  'cable deadlift':               'Romanian_Deadlift',
  // ── Leg Machine ───────────────────────────────────────────────────────────
  'leg extension':                'Leg_Extensions',
  'leg curl':                     'Leg_Curl',
  'single leg extension':         'Leg_Extensions',
  'single leg curl':              'Leg_Curl',
  // ── Dumbbells ─────────────────────────────────────────────────────────────
  'dumbbell bench press':         'Dumbbell_Bench_Press',
  'dumbbell incline press':       'Incline_Dumbbell_Press',
  'dumbbell fly':                 'Dumbbell_Flyes',
  'dumbbell pullover':            'Dumbbell_Pullover',
  'dumbbell row':                 'Bent_Over_Dumbbell_Row_(Version_2)',
  'dumbbell shoulder press':      'Dumbbell_Shoulder_Press',
  'dumbbell lateral raise':       'Dumbbell_Lateral_Raise',
  'dumbbell front raise':         'Dumbbell_Alternate_Bicep_Curl',
  'dumbbell arnold press':        'Dumbbell_Shoulder_Press',
  'dumbbell reverse fly':         'Dumbbell_Rear_Lateral_Raise',
  'dumbbell bicep curl':          'Dumbbell_Alternate_Bicep_Curl',
  'dumbbell hammer curl':         'Hammer_Curls',
  'dumbbell concentration curl':  'Concentration_Curls',
  'dumbbell overhead tricep':     'Dumbbell_Tricep_Kickback',
  'dumbbell tricep kickback':     'Dumbbell_Tricep_Kickback',
  'dumbbell squat':               'Dumbbell_Squat',
  'dumbbell lunge':               'Dumbbell_Lunges',
  'dumbbell walking lunge':       'Dumbbell_Lunges',
  'dumbbell rdl':                 'Romanian_Deadlift',
  'dumbbell sumo squat':          'Dumbbell_Squat',
  'dumbbell step-up':             'Dumbbell_Step_Ups',
  'dumbbell calf raise':          'Calf_Raise_on_a_Dumbbell',
  'dumbbell hip thrust':          'Barbell_Hip_Thrust',
  'bulgarian split squat (db)':   'Dumbbell_Lunges',
  'dumbbell russian twist':       'Russian_Twist',
  'dumbbell farmer carry':        'Farmer_s_Walk',
  // ── Bench ─────────────────────────────────────────────────────────────────
  'bench dip':                    'Bench_Dips',
  'incline push-up':              'Incline_Push-Up',
  'decline push-up':              'Decline_Push-Up',
  'bench leg raise':              'Leg_Raises',
  'hip thrust on bench':          'Barbell_Hip_Thrust',
  'step-up on bench':             'Dumbbell_Step_Ups',
  'bulgarian split squat (bench)':'Dumbbell_Lunges',
  'reverse crunch on bench':      'Decline_Crunch',
  // ── Plyometric Box ────────────────────────────────────────────────────────
  'box jump':                     'Box_Jump',
  'single leg box jump':          'Box_Jump',
  'lateral box jump':             'Box_Jump',
  'depth jump':                   'Box_Jump',
  'explosive step-up':            'Dumbbell_Step_Ups',
  'step-up on box':               'Dumbbell_Step_Ups',
  'bulgarian split squat (box)':  'Dumbbell_Lunges',
  'plyo push-up off box':         'Clap_Push-Up',
  // ── Bodyweight ────────────────────────────────────────────────────────────
  'push-up':                      'Push-Up',
  'diamond push-up':              'Close-Grip_Push-Up',
  'pike push-up':                 'Pike_Push-Up',
  'plank':                        'Plank',
  'side plank':                   'Side_Bridge',
  'mountain climber':             'Mountain_Climbers_(Cross-Body)',
  'burpee':                       'Burpees',
  'jump squat':                   'Weighted_Squat_Jump',
  'glute bridge':                 'Hip_Raise_(Glute_Bridge)',
  'ab bicycle':                   'Bicycle_Crunch',
  'leg raise':                    'Leg_Raises',
  'superman hold':                'Superman',
  'high knees':                   'Run_in_Place',
};

const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';
const cache = {};

const normalize = (str) =>
  str?.toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim() || '';

// Try to match exercise name to an image URL
export const getExerciseGif = async (exerciseName) => {
  const key = normalize(exerciseName);
  if (key in cache) return cache[key];

  // Direct lookup from our curated map
  const id = EXERCISE_MAP[key];
  if (id) {
    const url = `${BASE}/${id}/0.jpg`;
    cache[key] = url;
    return url;
  }

  // Fuzzy fallback: try parts of the name
  const words = key.split(' ').filter(w => w.length > 3);
  for (const [mapKey, mapId] of Object.entries(EXERCISE_MAP)) {
    if (words.some(w => mapKey.includes(w))) {
      const url = `${BASE}/${mapId}/0.jpg`;
      cache[key] = url;
      return url;
    }
  }

  cache[key] = null;
  return null;
};

// Preload all GIFs for a plan
export const preloadPlanGifs = async (exercises) => {
  const results = {};
  await Promise.allSettled(
    exercises.map(async (ex) => {
      results[ex.name] = await getExerciseGif(ex.name);
    })
  );
  return results;
};
