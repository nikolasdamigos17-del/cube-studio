// ── Cube Gym Equipment & Exercise Database ────────────────────────────────────
// Equipment: IMBODY Power S Pro | Leg Extension+Curl Machine | Dumbbells | Plyometric Box | Bench

export const EQUIPMENT = {
  imbody:    { label:'IMBODY Pro',    color:'#818cf8', bg:'rgba(129,140,248,0.15)', short:'IMB' },
  legmachine:{ label:'Leg Machine',  color:'#f87171', bg:'rgba(248,113,113,0.15)', short:'LEG' },
  dumbbells: { label:'Dumbbells',    color:'#fbbf24', bg:'rgba(251,191,36,0.15)',  short:'DB'  },
  box:       { label:'Plyo Box',     color:'#34d399', bg:'rgba(52,211,153,0.15)', short:'BOX' },
  bench:     { label:'Bench',        color:'#60a5fa', bg:'rgba(96,165,250,0.15)', short:'BEN' },
  bodyweight:{ label:'Bodyweight',   color:'#c084fc', bg:'rgba(192,132,252,0.15)',short:'BW'  },
};

export const EXERCISE_DB = [
  // ── IMBODY Power S Pro (cable machine) ───────────────────────────────────
  { name:'Cable Chest Press',            eq:'imbody',     muscles:['chest','triceps'],           cat:'push'     },
  { name:'Low Cable Fly',                eq:'imbody',     muscles:['chest'],                      cat:'push'     },
  { name:'High Cable Fly',               eq:'imbody',     muscles:['chest'],                      cat:'push'     },
  { name:'Cable Crossover',              eq:'imbody',     muscles:['chest'],                      cat:'push'     },
  { name:'Single Arm Cable Press',       eq:'imbody',     muscles:['chest','triceps'],            cat:'push'     },
  { name:'Cable Row',                    eq:'imbody',     muscles:['back','biceps'],              cat:'pull'     },
  { name:'Cable Lat Pulldown',           eq:'imbody',     muscles:['back','biceps'],              cat:'pull'     },
  { name:'Cable Pullover',               eq:'imbody',     muscles:['back','chest'],               cat:'pull'     },
  { name:'Straight Arm Pulldown',        eq:'imbody',     muscles:['back'],                       cat:'pull'     },
  { name:'Cable Face Pull',              eq:'imbody',     muscles:['shoulders','back'],           cat:'pull'     },
  { name:'Single Arm Cable Row',         eq:'imbody',     muscles:['back','biceps'],              cat:'pull'     },
  { name:'Cable Reverse Fly',            eq:'imbody',     muscles:['shoulders','back'],           cat:'pull'     },
  { name:'Cable Lateral Raise',          eq:'imbody',     muscles:['shoulders'],                  cat:'push'     },
  { name:'Cable Front Raise',            eq:'imbody',     muscles:['shoulders'],                  cat:'push'     },
  { name:'Cable Overhead Press',         eq:'imbody',     muscles:['shoulders','triceps'],        cat:'push'     },
  { name:'Cable Upright Row',            eq:'imbody',     muscles:['shoulders','traps'],          cat:'pull'     },
  { name:'Cable Upright Row (Single Arm)', eq:'imbody',   muscles:['shoulders','traps'],          cat:'pull'     },
  { name:'Cable Bicep Curl',             eq:'imbody',     muscles:['biceps'],                     cat:'pull'     },
  { name:'Cable Hammer Curl',            eq:'imbody',     muscles:['biceps','forearms'],          cat:'pull'     },
  { name:'Cable Tricep Pushdown',        eq:'imbody',     muscles:['triceps'],                    cat:'push'     },
  { name:'Cable Tricep Kickback',        eq:'imbody',     muscles:['triceps'],                    cat:'push'     },
  { name:'Cable Overhead Tricep Ext',    eq:'imbody',     muscles:['triceps'],                    cat:'push'     },
  { name:'Cable Kickback',               eq:'imbody',     muscles:['glutes'],                     cat:'legs'     },
  { name:'Cable Hip Abduction',          eq:'imbody',     muscles:['glutes'],                     cat:'legs'     },
  { name:'Cable Pull-Through',           eq:'imbody',     muscles:['glutes','hamstrings'],        cat:'legs'     },
  { name:'Cable Lunge',                  eq:'imbody',     muscles:['legs','glutes'],              cat:'legs'     },
  { name:'Cable Crunch',                 eq:'imbody',     muscles:['core'],                       cat:'core'     },
  { name:'Cable Crunch (Seated)',        eq:'imbody',     muscles:['core'],                       cat:'core'     },
  { name:'Cable Crunch (Standing)',      eq:'imbody',     muscles:['core'],                       cat:'core'     },
  { name:'Cable Woodchop',               eq:'imbody',     muscles:['core','obliques'],            cat:'core'     },
  { name:'Cable Pallof Press',           eq:'imbody',     muscles:['core'],                       cat:'core'     },
  { name:'Cable Deadlift',               eq:'imbody',     muscles:['hamstrings','glutes','back'], cat:'legs'     },
  // ── Leg Machine ───────────────────────────────────────────────────────────
  { name:'Leg Extension',                eq:'legmachine', muscles:['quads'],                      cat:'legs'     },
  { name:'Leg Curl',                     eq:'legmachine', muscles:['hamstrings'],                 cat:'legs'     },
  { name:'Single Leg Extension',         eq:'legmachine', muscles:['quads'],                      cat:'legs'     },
  // ── Dumbbells ─────────────────────────────────────────────────────────────
  { name:'Dumbbell Bench Press',         eq:'dumbbells',  muscles:['chest','triceps'],            cat:'push'     },
  { name:'Dumbbell Incline Press',       eq:'dumbbells',  muscles:['chest','triceps'],            cat:'push'     },
  { name:'Dumbbell Fly',                 eq:'dumbbells',  muscles:['chest'],                      cat:'push'     },
  { name:'Dumbbell Pullover',            eq:'dumbbells',  muscles:['back','chest'],               cat:'pull'     },
  { name:'Dumbbell Row',                 eq:'dumbbells',  muscles:['back','biceps'],              cat:'pull'     },
  { name:'Dumbbell Shoulder Press',      eq:'dumbbells',  muscles:['shoulders','triceps'],        cat:'push'     },
  { name:'Dumbbell Lateral Raise',       eq:'dumbbells',  muscles:['shoulders'],                  cat:'push'     },
  { name:'Dumbbell Front Raise',         eq:'dumbbells',  muscles:['shoulders'],                  cat:'push'     },
  { name:'Dumbbell Arnold Press',        eq:'dumbbells',  muscles:['shoulders'],                  cat:'push'     },
  { name:'Dumbbell Reverse Fly',         eq:'dumbbells',  muscles:['shoulders','back'],           cat:'pull'     },
  { name:'Dumbbell Bicep Curl',          eq:'dumbbells',  muscles:['biceps'],                     cat:'pull'     },
  { name:'Dumbbell Hammer Curl',         eq:'dumbbells',  muscles:['biceps','forearms'],          cat:'pull'     },
  { name:'Dumbbell Concentration Curl',  eq:'dumbbells',  muscles:['biceps'],                     cat:'pull'     },
  { name:'Dumbbell Overhead Tricep',     eq:'dumbbells',  muscles:['triceps'],                    cat:'push'     },
  { name:'Dumbbell Tricep Kickback',     eq:'dumbbells',  muscles:['triceps'],                    cat:'push'     },
  { name:'Dumbbell Squat',               eq:'dumbbells',  muscles:['legs','glutes'],              cat:'legs'     },
  { name:'Dumbbell Lunge',               eq:'dumbbells',  muscles:['legs','glutes'],              cat:'legs'     },
  { name:'Dumbbell Walking Lunge',       eq:'dumbbells',  muscles:['legs','glutes'],              cat:'legs'     },
  { name:'Dumbbell RDL',                 eq:'dumbbells',  muscles:['hamstrings','glutes'],        cat:'legs'     },
  { name:'Dumbbell Sumo Squat',          eq:'dumbbells',  muscles:['legs','glutes'],              cat:'legs'     },
  { name:'Dumbbell Overhead Lunge',       eq:'dumbbells',   muscles:['legs','glutes','shoulders'],  cat:'legs'     },
  { name:'Dumbbell Lateral Step-Up',      eq:'dumbbells',   muscles:['legs','glutes'],              cat:'legs'     },
  { name:'Dumbbell Step-Up',             eq:'dumbbells',  muscles:['legs','glutes'],              cat:'legs'     },
  { name:'Dumbbell Calf Raise',          eq:'dumbbells',  muscles:['calves'],                     cat:'legs'     },
  { name:'Dumbbell Hip Thrust',          eq:'dumbbells',  muscles:['glutes','hamstrings'],        cat:'legs'     },
  { name:'Bulgarian Split Squat (DB)',   eq:'dumbbells',  muscles:['legs','glutes'],              cat:'legs'     },
  { name:'Dumbbell Sit-Up',               eq:'dumbbells',   muscles:['core'],                       cat:'core'     },
  { name:'Dumbbell Russian Twist',       eq:'dumbbells',  muscles:['core','obliques'],            cat:'core'     },
  { name:'Dumbbell Farmer Carry',        eq:'dumbbells',  muscles:['core','traps','forearms'],    cat:'fullbody' },
  // ── Bench ─────────────────────────────────────────────────────────────────
  { name:'Bench Dip',                    eq:'bench',      muscles:['triceps','chest'],            cat:'push'     },
  { name:'Incline Push-Up',              eq:'bench',      muscles:['chest','triceps'],            cat:'push'     },
  { name:'Decline Push-Up',             eq:'bench',      muscles:['chest','triceps'],            cat:'push'     },
  { name:'Bench Jump',                   eq:'bench',      muscles:['legs','glutes'],              cat:'power'    },
  { name:'Bench Leg Raise',              eq:'bench',      muscles:['core'],                       cat:'core'     },
  { name:'Hip Thrust on Bench',         eq:'bench',      muscles:['glutes','hamstrings'],        cat:'legs'     },
  { name:'Step-Up on Bench',            eq:'bench',      muscles:['legs','glutes'],              cat:'legs'     },
  { name:'Bulgarian Split Squat (Bench)',eq:'bench',      muscles:['legs','glutes'],              cat:'legs'     },
  // ── Plyometric Box ────────────────────────────────────────────────────────
  { name:'Box Jump',                     eq:'box',        muscles:['legs','glutes','calves'],     cat:'power'    },
  { name:'Lateral Box Jump',             eq:'box',        muscles:['legs','glutes'],              cat:'power'    },
  { name:'Depth Jump',                   eq:'box',        muscles:['legs'],                       cat:'power'    },
  // ── Bodyweight ────────────────────────────────────────────────────────────
  { name:'Push-Up',                      eq:'bodyweight', muscles:['chest','triceps'],            cat:'push'     },
  { name:'Diamond Push-Up',             eq:'bodyweight', muscles:['triceps','chest'],            cat:'push'     },
  { name:'Pike Push-Up',                 eq:'bodyweight', muscles:['shoulders'],                  cat:'push'     },
  { name:'Plank',                        eq:'bodyweight', muscles:['core'],                       cat:'core'     },
  { name:'Side Plank',                   eq:'bodyweight', muscles:['core','obliques'],            cat:'core'     },
  { name:'Mountain Climber',             eq:'bodyweight', muscles:['core','legs'],                cat:'core'     },
  { name:'Burpee',                       eq:'bodyweight', muscles:['full_body'],                  cat:'power'    },
  { name:'Jump Squat',                   eq:'bodyweight', muscles:['legs','glutes'],              cat:'power'    },
  { name:'Glute Bridge',                 eq:'bodyweight', muscles:['glutes','hamstrings'],        cat:'legs'     },
  { name:'Leg Raise',                    eq:'bodyweight', muscles:['core'],                       cat:'core'     },
  { name:'Superman Hold',                eq:'bodyweight', muscles:['core','back','glutes'],       cat:'core'     },
  { name:'High Knees',                   eq:'bodyweight', muscles:['legs','core'],                cat:'cardio'   },
  /* ── Προθέρμανση ── */
  { name:'Jumping Jacks',                eq:'bodyweight', muscles:['full_body','cardio'],         cat:'warmup'   },
  { name:'Mountain Climbers',            eq:'bodyweight', muscles:['core','cardio','full_body'],  cat:'warmup'   },
  { name:'Butt Kicks',                   eq:'bodyweight', muscles:['hamstrings','cardio'],        cat:'warmup'   },
  { name:'Arm Circles',                  eq:'bodyweight', muscles:['shoulders'],                  cat:'warmup'   },
  { name:'Arm Swings',                   eq:'bodyweight', muscles:['shoulders','chest'],          cat:'warmup'   },
  { name:'Standing Toe Touch',           eq:'bodyweight', muscles:['hamstrings','back'],          cat:'warmup'   },
  { name:'Jump Rope',                    eq:'bodyweight', muscles:['full_body','cardio','calves'],cat:'warmup'   },
  { name:'Inchworms',                    eq:'bodyweight', muscles:['full_body','core'],           cat:'warmup'   },
  { name:'Bodyweight Squat (Warm-up)',   eq:'bodyweight', muscles:['legs','glutes'],              cat:'warmup'   },
  { name:'Dynamic Lunges',               eq:'bodyweight', muscles:['legs','glutes'],              cat:'warmup'   },

  // ── ΕΠΕΚΤΑΣΗ v60 — IMBODY (cable) ─────────────────────────────────────────
  { name:'Incline Cable Fly',            eq:'imbody',     muscles:['chest'],                      cat:'push'     },
  { name:'Lying Cable Tricep Extension', eq:'imbody',     muscles:['triceps'],                    cat:'push'     },
  { name:'Cable Y-Raise',                eq:'imbody',     muscles:['shoulders','traps'],          cat:'push'     },
  { name:'Cable Shrug',                  eq:'imbody',     muscles:['traps'],                      cat:'pull'     },
  { name:'Wide Grip Cable Row',          eq:'imbody',     muscles:['back'],                       cat:'pull'     },
  { name:'Single Arm Lat Pulldown',      eq:'imbody',     muscles:['back'],                       cat:'pull'     },
  { name:'Cable Rear Delt Row',          eq:'imbody',     muscles:['shoulders','back'],           cat:'pull'     },
  { name:'Cable Reverse Curl',           eq:'imbody',     muscles:['biceps','forearms'],          cat:'pull'     },
  { name:'Cable Squat',                  eq:'imbody',     muscles:['legs','quads','glutes'],      cat:'legs'     },
  { name:'Cable Front Squat',            eq:'imbody',     muscles:['legs','quads','glutes'],      cat:'legs'     },
  { name:'Cable Lateral Lunge',          eq:'imbody',     muscles:['legs','glutes'],              cat:'legs'     },
  { name:'Cable Hip Adduction',          eq:'imbody',     muscles:['legs'],                       cat:'legs'     },
  { name:'Cable Calf Raise',             eq:'imbody',     muscles:['calves'],                     cat:'legs'     },
  { name:'Cable Reverse Woodchop',       eq:'imbody',     muscles:['core','obliques'],            cat:'core'     },
  { name:'Cable Side Bend',              eq:'imbody',     muscles:['obliques'],                   cat:'core'     },

  // ── Leg Machine ────────────────────────────────────────────────────────────

  // ── Dumbbells ──────────────────────────────────────────────────────────────
  { name:'Dumbbell Split Squat',          eq:'dumbbells',   muscles:['legs','quads','glutes'],      cat:'legs'     },
  { name:'Dumbbell Goblet Squat',        eq:'dumbbells',  muscles:['legs','quads','glutes'],      cat:'legs'     },
  { name:'Dumbbell Deadlift',            eq:'dumbbells',  muscles:['hamstrings','glutes','back'], cat:'legs'     },
  { name:'Dumbbell Single Leg RDL',      eq:'dumbbells',  muscles:['hamstrings','glutes'],        cat:'legs'     },
  { name:'Dumbbell Reverse Lunge',       eq:'dumbbells',  muscles:['legs','glutes'],              cat:'legs'     },
  { name:'Dumbbell Lateral Lunge',       eq:'dumbbells',  muscles:['legs','glutes'],              cat:'legs'     },
  { name:'Dumbbell Curtsy Lunge',        eq:'dumbbells',  muscles:['glutes','legs'],              cat:'legs'     },
  { name:'Dumbbell Swing',               eq:'dumbbells',  muscles:['glutes','hamstrings','full_body'], cat:'power' },
  { name:'Dumbbell Snatch',              eq:'dumbbells',  muscles:['full_body','shoulders'],      cat:'power'    },
  { name:'Dumbbell Push Press',          eq:'dumbbells',  muscles:['shoulders','triceps','legs'], cat:'power'    },
  { name:'Dumbbell Thruster',            eq:'dumbbells',  muscles:['full_body','legs','shoulders'], cat:'power'  },
  { name:'Dumbbell Decline Press',        eq:'dumbbells',   muscles:['chest','triceps'],            cat:'push'     },
  { name:'Dumbbell Floor Press',         eq:'dumbbells',  muscles:['chest','triceps'],            cat:'push'     },
  { name:'Dumbbell Upright Row',         eq:'dumbbells',  muscles:['shoulders','traps'],          cat:'pull'     },
  { name:'Dumbbell Shrug',               eq:'dumbbells',  muscles:['traps'],                      cat:'pull'     },
  { name:'Dumbbell Renegade Row',        eq:'dumbbells',  muscles:['back','core'],                cat:'pull'     },
  { name:'Dumbbell Zottman Curl',        eq:'dumbbells',  muscles:['biceps','forearms'],          cat:'pull'     },
  { name:'Dumbbell Incline Curl',        eq:'dumbbells',  muscles:['biceps'],                     cat:'pull'     },
  { name:'Dumbbell Wrist Curl',          eq:'dumbbells',  muscles:['forearms'],                   cat:'pull'     },
  { name:'Dumbbell Side Bend',           eq:'dumbbells',  muscles:['obliques'],                   cat:'core'     },
  { name:'Dumbbell Suitcase Carry',      eq:'dumbbells',  muscles:['core','forearms','traps'],    cat:'core'     },

  // ── Bench ──────────────────────────────────────────────────────────────────
  { name:'Single Leg Hip Thrust (Bench)',eq:'bench',      muscles:['glutes','hamstrings'],        cat:'legs'     },
  { name:'Bench V-Sit',                  eq:'bench',      muscles:['core'],                       cat:'core'     },
  { name:'Seated Knee Tuck (Bench)',     eq:'bench',      muscles:['core'],                       cat:'core'     },

  // ── Plyo Box ───────────────────────────────────────────────────────────────
  { name:'Box Squat',                    eq:'box',        muscles:['legs','quads','glutes'],      cat:'legs'     },
  { name:'Box Step-Down (Eccentric)',    eq:'box',        muscles:['quads','glutes'],             cat:'legs'     },

  // ── Bodyweight ─────────────────────────────────────────────────────────────
  { name:'Dead Bug',                     eq:'bodyweight', muscles:['core'],                       cat:'core'     },
  { name:'Bird Dog',                     eq:'bodyweight', muscles:['core','back','glutes'],       cat:'core'     },
  { name:'Hollow Hold',                  eq:'bodyweight', muscles:['core'],                       cat:'core'     },
  { name:'V-Up',                         eq:'bodyweight', muscles:['core'],                       cat:'core'     },
  { name:'Flutter Kicks',                eq:'bodyweight', muscles:['core'],                       cat:'core'     },
  { name:'Crunch',                       eq:'bodyweight', muscles:['core'],                       cat:'core'     },
  { name:'Sit-Up',                       eq:'bodyweight', muscles:['core'],                       cat:'core'     },
  { name:'Reverse Crunch',               eq:'bodyweight', muscles:['core'],                       cat:'core'     },
  { name:'Swimmers',                     eq:'bodyweight', muscles:['core','back','glutes'],       cat:'core'     },
  { name:'Reverse Lunge Knee Drive',     eq:'bodyweight', muscles:['legs','glutes'],              cat:'legs'     },
  { name:'Russian Twist',                eq:'bodyweight', muscles:['core','obliques'],            cat:'core'     },
  { name:'Plank Hip Twist',              eq:'bodyweight', muscles:['core','obliques'],            cat:'core'     },
  { name:'Side Plank Hip Dip',           eq:'bodyweight', muscles:['obliques','core'],            cat:'core'     },
  { name:'Bear Crawl',                   eq:'bodyweight', muscles:['full_body','core'],           cat:'fullbody' },
  { name:'Wall Sit',                     eq:'bodyweight', muscles:['quads','legs'],               cat:'legs'     },
  { name:'Reverse Lunge',                eq:'bodyweight', muscles:['legs','glutes'],              cat:'legs'     },
  { name:'Sumo Squat',                   eq:'bodyweight', muscles:['legs','glutes'],              cat:'legs'     },
  { name:'Squat Pulse',                  eq:'bodyweight', muscles:['quads','glutes'],             cat:'legs'     },
  { name:'Single Leg Glute Bridge',      eq:'bodyweight', muscles:['glutes','hamstrings'],        cat:'legs'     },
  { name:'Donkey Kick',                  eq:'bodyweight', muscles:['glutes'],                     cat:'legs'     },
  { name:'Calf Raise',                   eq:'bodyweight', muscles:['calves'],                     cat:'legs'     },
  { name:'Single Leg Calf Raise',        eq:'bodyweight', muscles:['calves'],                     cat:'legs'     },
  { name:'Wall Push-Up',                 eq:'bodyweight', muscles:['chest','triceps'],            cat:'push'     },
];

// ── Σωστή κατηγοριοποίηση ανά τύπο προπόνησης ────────────────────────────────
// Κάθε άσκηση κατατάσσεται από τον ΠΡΩΤΕΥΟΝΤΑ μυ της (muscles[0]) — έτσι ένα
// deadlift (hamstrings, glutes, back) ΔΕΝ εμφανίζεται στο Upper επειδή αγγίζει
// πλάτη, και ένα push press ΔΕΝ εμφανίζεται στο Lower επειδή βοηθούν τα πόδια.
const MUSCLE_REGION = {
  chest:'upper', back:'upper', shoulders:'upper', biceps:'upper', triceps:'upper', traps:'upper', forearms:'upper',
  legs:'lower', quads:'lower', hamstrings:'lower', glutes:'lower', calves:'lower',
  core:'core', obliques:'core',
  full_body:'full', cardio:'cardio',
};
export const MUSCLE_LABELS_EL = {
  chest:'Στήθος', back:'Πλάτη', shoulders:'Ώμοι', biceps:'Δικέφαλοι', triceps:'Τρικέφαλοι', traps:'Τραπεζοειδείς', forearms:'Αντιβράχια',
  legs:'Πόδια', quads:'Τετρακέφαλοι', hamstrings:'Μηριαίοι', glutes:'Γλουτοί', calves:'Γάμπες',
  core:'Κορμός', obliques:'Πλάγιοι κοιλιακοί', full_body:'Ολόσωμη', cardio:'Cardio',
};
export const MUSCLE_ORDER = ['chest','back','shoulders','biceps','triceps','traps','forearms','legs','quads','hamstrings','glutes','calves','core','obliques','full_body','cardio'];
export const primaryMuscle = (ex) => (ex.muscles && ex.muscles[0]) || '';
export const regionOf = (ex) => MUSCLE_REGION[primaryMuscle(ex)] || 'other';

/* ── Τύποι προπόνησης: ΜΙΑ πηγή αλήθειας για όλη την εφαρμογή ──────────────── */
export const SESSION_TYPES = ['full_body', 'upper', 'lower', 'legs', 'glutes'];
export const SESSION_TYPE_LABELS = { full_body:'Full Body', upper:'Upper Body', lower:'Lower Body', legs:'Legs', glutes:'Glutes' };

/* Δέχεται ΜΟΝΟ έγκυρο κείμενο τύπου. Οτιδήποτε άλλο (κενό, αντικείμενο, άγνωστη
   λέξη) επιστρέφει null — ποτέ δεν «περνάει» κάτι που δεν είναι τύπος. */
export const normalizeSessionType = (t) => {
  if (typeof t !== 'string') return null;
  const k = t.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (SESSION_TYPES.includes(k)) return k;
  if (k === 'fullbody' || k === 'full') return 'full_body';
  if (k === 'upper_body') return 'upper';
  if (k === 'lower_body') return 'lower';
  return null;
};

const TYPE_FILTERS = {
  upper:     (ex) => regionOf(ex) === 'upper',
  lower:     (ex) => regionOf(ex) === 'lower',
  legs:      (ex) => ['legs','quads','hamstrings','calves'].includes(primaryMuscle(ex)),
  /* Glutes: ασκήσεις ΚΑΤΩ σώματος που δουλεύουν γλουτούς ή οπίσθια αλυσίδα */
  glutes:    (ex) => regionOf(ex) === 'lower' && (ex.muscles || []).some(m => m === 'glutes' || m === 'hamstrings'),
  full_body: (ex) => ['upper','lower','core','full'].includes(regionOf(ex)),
};

// Σωστή δεξαμενή ασκήσεων για έναν τύπο (upper/lower/legs/glutes/full_body).
// Warmup & cardio μένουν εκτός — οι προθερμάνσεις προστίθενται ξεχωριστά.
// Άγνωστος/χαλασμένος τύπος → Full Body (ποτέ «όλη η βάση χωρίς φίλτρο»).
export const getExercisesForType = (type) => {
  const pool = EXERCISE_DB.filter(x => x.cat !== 'warmup' && x.cat !== 'cardio');
  return pool.filter(TYPE_FILTERS[normalizeSessionType(type) || 'full_body']);
};

/* Ανήκει μια άσκηση (με το όνομά της) στον τύπο; — τελικός έλεγχος πριν εμφανιστεί */
const DB_BY_NAME = Object.fromEntries(EXERCISE_DB.map(e => [e.name.toLowerCase(), e]));
export const findExercise = (name) => DB_BY_NAME[String(name || '').toLowerCase().trim()] || null;
export const exerciseFitsType = (name, type) => {
  const e = findExercise(name);
  if (!e) return false;
  if (e.cat === 'warmup') return getWarmupsForType(type).some(w => w.name === e.name);
  return getExercisesForType(type).some(x => x.name === e.name);
};

/* ── Ισορροπημένη προπόνηση από τη βάση (χωρίς AI) ───────────────────────────
   Κάθε τύπος έχει «θέσεις» μυϊκών ομάδων με τη σωστή σειρά (σύνθετες πρώτες).
   Χρησιμοποιείται όταν ο εγκέφαλος δεν απαντήσει ή απαντήσει ελλιπώς. */
const SLOT_TEMPLATES = {
  upper:     [['chest'], ['back'], ['shoulders'], ['back'], ['chest'], ['biceps'], ['triceps']],
  lower:     [['legs','quads'], ['hamstrings'], ['glutes'], ['legs','quads'], ['hamstrings','glutes'], ['calves']],
  legs:      [['legs'], ['hamstrings'], ['quads'], ['legs'], ['hamstrings'], ['calves']],
  glutes:    [['glutes'], ['hamstrings'], ['legs'], ['glutes'], ['glutes'], ['hamstrings','legs']],
  full_body: [['legs','quads'], ['chest'], ['back'], ['hamstrings','glutes'], ['shoulders'], ['core']],
};
/* Βασικές («staple») ασκήσεις ανά μυϊκή ομάδα — αυτές προτιμώνται στην προεπιλογή */
const STAPLES = [
  'Dumbbell Bench Press', 'Cable Chest Press', 'Dumbbell Incline Press', 'Cable Crossover', 'Push-Up', 'Dumbbell Fly',
  'Cable Lat Pulldown', 'Cable Row', 'Dumbbell Row', 'Single Arm Cable Row', 'Straight Arm Pulldown', 'Wide Grip Cable Row',
  'Dumbbell Shoulder Press', 'Cable Lateral Raise', 'Dumbbell Lateral Raise', 'Cable Face Pull', 'Dumbbell Arnold Press',
  'Dumbbell Bicep Curl', 'Cable Bicep Curl', 'Dumbbell Hammer Curl',
  'Cable Tricep Pushdown', 'Dumbbell Overhead Tricep', 'Bench Dip',
  'Dumbbell Goblet Squat', 'Dumbbell Squat', 'Bulgarian Split Squat (DB)', 'Dumbbell Lunge', 'Cable Squat', 'Dumbbell Step-Up', 'Dumbbell Reverse Lunge',
  'Leg Extension', 'Single Leg Extension', 'Box Step-Down (Eccentric)',
  'Dumbbell RDL', 'Leg Curl', 'Dumbbell Deadlift', 'Cable Deadlift', 'Dumbbell Single Leg RDL',
  'Dumbbell Hip Thrust', 'Hip Thrust on Bench', 'Cable Kickback', 'Cable Pull-Through', 'Glute Bridge', 'Cable Hip Abduction', 'Dumbbell Curtsy Lunge',
  'Dumbbell Calf Raise', 'Cable Calf Raise', 'Calf Raise',
  'Plank', 'Cable Crunch', 'Cable Woodchop', 'Dead Bug', 'Leg Raise',
];
const STAPLE_RANK = Object.fromEntries(STAPLES.map((n, i) => [n, i]));
const DB_INDEX = Object.fromEntries(EXERCISE_DB.map((e, i) => [e.name, i]));

export const buildBalancedWorkout = (type, { count = 6, exclude = [], known = {}, seed = 0 } = {}) => {
  const t = normalizeSessionType(type) || 'full_body';
  const all = getExercisesForType(t);
  /* η προεπιλογή αποφεύγει πλειομετρικά άλματα — μπαίνουν μόνο αν τα διαλέξει ο προπονητής */
  const strength = all.filter(e => e.cat !== 'power');
  const pool = strength.length >= count ? strength : all;
  const used = new Set(exclude.map(n => String(n).toLowerCase()));
  const eqUse = {};
  const out = [];
  const rank = (e) => (STAPLE_RANK[e.name] ?? (1000 + DB_INDEX[e.name])) - (known[e.name] ? 2.5 : 0) + (eqUse[e.eq] || 0) * 1.5;
  const take = (cands, i) => {
    const free = cands.filter(e => !used.has(e.name.toLowerCase())).sort((x, y) => rank(x) - rank(y));
    if (!free.length) return false;
    /* μικρή ποικιλία: εναλλαγή ανάμεσα στις 3 καλύτερες επιλογές της θέσης */
    const top = free.slice(0, Math.min(3, free.length));
    const pick = top[(seed + i) % top.length];
    used.add(pick.name.toLowerCase()); eqUse[pick.eq] = (eqUse[pick.eq] || 0) + 1; out.push(pick);
    return true;
  };
  SLOT_TEMPLATES[t].forEach((slot, i) => {
    if (out.length >= count) return;
    take(pool.filter(e => slot.includes(primaryMuscle(e))), seed ? i : 0);
  });
  let guard = 0;
  while (out.length < count && guard++ < 40) { if (!take(pool, 0)) break; }
  return out;
};

/* ── Τύπος μιας αποθηκευμένης προπόνησης ─────────────────────────────────────
   1) το πεδίο session_type αν είναι έγκυρο, 2) ο τίτλος, 3) οι ίδιες οι ασκήσεις. */
export const typeFromTitle = (title) => {
  const s = typeof title === 'string' ? title : '';
  if (!s) return null;
  if (/(glute|γλουτ)/i.test(s)) return 'glutes';
  if (/(upper|άνω|πάνω κορμ|push|pull|στήθος|πλάτη|ώμ|χέρι|δικέφαλ|τρικέφαλ)/i.test(s)) return 'upper';
  if (/(leg|πόδι|τετρακέφαλ|μηριαί|γάμπ|quad|hamstring|calf|calves)/i.test(s)) return 'legs';
  if (/(lower|κάτω)/i.test(s)) return 'lower';
  if (/(full|ολόσωμ|όλο το σώμα)/i.test(s)) return 'full_body';
  return null;
};
export const typeFromExercises = (list) => {
  let up = 0, low = 0, glute = 0, legOnly = 0;
  (Array.isArray(list) ? list : []).forEach(x => {
    const e = findExercise(x?.name);
    if (!e || e.cat === 'warmup' || e.cat === 'cardio') return;
    const r = regionOf(e);
    if (r === 'upper') up++;
    else if (r === 'lower') { low++; if (primaryMuscle(e) === 'glutes') glute++; else legOnly++; }
  });
  const total = up + low;
  if (!total) return null;
  if (up / total >= 0.75) return 'upper';
  if (low / total >= 0.75) return glute / low >= 0.5 ? 'glutes' : (glute === 0 ? 'legs' : 'lower');
  return 'full_body';
};
export const resolvePlanType = (p) =>
  normalizeSessionType(p?.session_type) || typeFromTitle(p?.title) || typeFromExercises(p?.exercises) || null;

// ── Warmups που ταιριάζουν στον τύπο: σε Upper δεν προτείνονται squats/lunges,
// σε Lower/Legs/Glutes δεν προτείνονται arm circles κ.λπ. Τα ουδέτερα
// (full body / cardio / core) επιτρέπονται παντού.
export const getWarmupsForType = (type) => {
  const warm = EXERCISE_DB.filter(x => x.cat === 'warmup');
  const t = normalizeSessionType(type) || 'full_body';
  if (t === 'full_body') return warm;
  const want = t === 'upper' ? 'upper' : 'lower';   // lower/legs/glutes → κάτω σώμα
  return warm.filter(w => {
    const r = regionOf(w);
    return r === want || r === 'full' || r === 'cardio' || r === 'core';
  });
};

// ── Σωστό φίλτρο ανά μυϊκή ομάδα (επιλογές του γρήγορου workout) ─────────────
const PART_FILTERS = {
  chest:     (ex) => primaryMuscle(ex) === 'chest',
  back:      (ex) => primaryMuscle(ex) === 'back',
  shoulders: (ex) => primaryMuscle(ex) === 'shoulders',
  biceps:    (ex) => primaryMuscle(ex) === 'biceps',
  triceps:   (ex) => primaryMuscle(ex) === 'triceps',
  legs:      (ex) => ['legs','quads','hamstrings','calves'].includes(primaryMuscle(ex)),
  glutes:    (ex) => (ex.muscles || []).some(m => m === 'glutes' || m === 'hamstrings'),
  core:      (ex) => regionOf(ex) === 'core',
  calves:    (ex) => (ex.muscles || []).includes('calves'),
  fullbody:  (ex) => ['upper','lower','core','full'].includes(regionOf(ex)),
  full_body: (ex) => ['upper','lower','core','full'].includes(regionOf(ex)),
};
export const getExercisesForParts = (parts) => {
  const pool = EXERCISE_DB.filter(x => x.cat !== 'warmup' && x.cat !== 'cardio');
  if (!parts?.length) return pool;
  return pool.filter(ex => parts.some(pt => {
    const f = PART_FILTERS[pt];
    return f ? f(ex) : (ex.muscles || []).includes(pt);
  }));
};

// Get exercises relevant to selected muscle groups
export const getExercisesFor = (muscleGroups) => {
  if (!muscleGroups?.length) return EXERCISE_DB;
  return EXERCISE_DB.filter(ex =>
    ex.muscles.some(m =>
      muscleGroups.some(t =>
        m.toLowerCase().includes(t.toLowerCase()) ||
        t.toLowerCase().includes(m.toLowerCase())
      )
    )
  );
};

// Optimal session order
export const SESSION_ORDER = { power:1, legs:2, push:3, pull:4, fullbody:5, core:6, cardio:7 };
export const sortBySessionOrder = (exercises) =>
  [...exercises].sort((a, b) => (SESSION_ORDER[a.cat]||9) - (SESSION_ORDER[b.cat]||9));
