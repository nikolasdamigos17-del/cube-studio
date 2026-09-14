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
  { name:'Straight Arm Pulldown',        eq:'imbody',     muscles:['back'],                       cat:'pull'     },
  { name:'Cable Face Pull',              eq:'imbody',     muscles:['shoulders','back'],           cat:'pull'     },
  { name:'Single Arm Cable Row',         eq:'imbody',     muscles:['back','biceps'],              cat:'pull'     },
  { name:'Cable Reverse Fly',            eq:'imbody',     muscles:['shoulders','back'],           cat:'pull'     },
  { name:'Cable Lateral Raise',          eq:'imbody',     muscles:['shoulders'],                  cat:'push'     },
  { name:'Cable Front Raise',            eq:'imbody',     muscles:['shoulders'],                  cat:'push'     },
  { name:'Cable Overhead Press',         eq:'imbody',     muscles:['shoulders','triceps'],        cat:'push'     },
  { name:'Cable Upright Row',            eq:'imbody',     muscles:['shoulders','traps'],          cat:'pull'     },
  { name:'Cable Bicep Curl',             eq:'imbody',     muscles:['biceps'],                     cat:'pull'     },
  { name:'Cable Hammer Curl',            eq:'imbody',     muscles:['biceps','forearms'],          cat:'pull'     },
  { name:'Cable Tricep Pushdown',        eq:'imbody',     muscles:['triceps'],                    cat:'push'     },
  { name:'Cable Overhead Tricep Ext',    eq:'imbody',     muscles:['triceps'],                    cat:'push'     },
  { name:'Cable Romanian Deadlift',      eq:'imbody',     muscles:['hamstrings','glutes','back'], cat:'legs'     },
  { name:'Cable Kickback',               eq:'imbody',     muscles:['glutes'],                     cat:'legs'     },
  { name:'Cable Hip Abduction',          eq:'imbody',     muscles:['glutes'],                     cat:'legs'     },
  { name:'Cable Pull-Through',           eq:'imbody',     muscles:['glutes','hamstrings'],        cat:'legs'     },
  { name:'Cable Lunge',                  eq:'imbody',     muscles:['legs','glutes'],              cat:'legs'     },
  { name:'Cable Crunch',                 eq:'imbody',     muscles:['core'],                       cat:'core'     },
  { name:'Cable Woodchop',               eq:'imbody',     muscles:['core','obliques'],            cat:'core'     },
  { name:'Cable Pallof Press',           eq:'imbody',     muscles:['core'],                       cat:'core'     },
  { name:'Cable Squat to Row',           eq:'imbody',     muscles:['legs','back'],                cat:'fullbody' },
  { name:'Cable Deadlift',               eq:'imbody',     muscles:['back','legs','glutes'],       cat:'fullbody' },
  // ── Leg Machine ───────────────────────────────────────────────────────────
  { name:'Leg Extension',                eq:'legmachine', muscles:['quads'],                      cat:'legs'     },
  { name:'Leg Curl',                     eq:'legmachine', muscles:['hamstrings'],                 cat:'legs'     },
  { name:'Single Leg Extension',         eq:'legmachine', muscles:['quads'],                      cat:'legs'     },
  { name:'Single Leg Curl',              eq:'legmachine', muscles:['hamstrings'],                 cat:'legs'     },
  // ── Dumbbells ─────────────────────────────────────────────────────────────
  { name:'Dumbbell Bench Press',         eq:'dumbbells',  muscles:['chest','triceps'],            cat:'push'     },
  { name:'Dumbbell Incline Press',       eq:'dumbbells',  muscles:['chest','triceps'],            cat:'push'     },
  { name:'Dumbbell Fly',                 eq:'dumbbells',  muscles:['chest'],                      cat:'push'     },
  { name:'Dumbbell Pullover',            eq:'dumbbells',  muscles:['chest','back'],               cat:'pull'     },
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
  { name:'Dumbbell Step-Up',             eq:'dumbbells',  muscles:['legs','glutes'],              cat:'legs'     },
  { name:'Dumbbell Calf Raise',          eq:'dumbbells',  muscles:['calves'],                     cat:'legs'     },
  { name:'Dumbbell Hip Thrust',          eq:'dumbbells',  muscles:['glutes','hamstrings'],        cat:'legs'     },
  { name:'Bulgarian Split Squat (DB)',   eq:'dumbbells',  muscles:['legs','glutes'],              cat:'legs'     },
  { name:'Dumbbell Russian Twist',       eq:'dumbbells',  muscles:['core','obliques'],            cat:'core'     },
  { name:'Dumbbell Farmer Carry',        eq:'dumbbells',  muscles:['core','traps','forearms'],    cat:'fullbody' },
  // ── Bench ─────────────────────────────────────────────────────────────────
  { name:'Bench Dip',                    eq:'bench',      muscles:['triceps','chest'],            cat:'push'     },
  { name:'Incline Push-Up',              eq:'bench',      muscles:['chest','triceps'],            cat:'push'     },
  { name:'Decline Push-Up',             eq:'bench',      muscles:['chest','triceps'],            cat:'push'     },
  { name:'Bench Leg Raise',              eq:'bench',      muscles:['core'],                       cat:'core'     },
  { name:'Hip Thrust on Bench',         eq:'bench',      muscles:['glutes','hamstrings'],        cat:'legs'     },
  { name:'Step-Up on Bench',            eq:'bench',      muscles:['legs','glutes'],              cat:'legs'     },
  { name:'Bulgarian Split Squat (Bench)',eq:'bench',      muscles:['legs','glutes'],              cat:'legs'     },
  { name:'Reverse Crunch on Bench',     eq:'bench',      muscles:['core'],                       cat:'core'     },
  // ── Plyometric Box ────────────────────────────────────────────────────────
  { name:'Box Jump',                     eq:'box',        muscles:['legs','glutes','calves'],     cat:'power'    },
  { name:'Single Leg Box Jump',          eq:'box',        muscles:['legs','glutes'],              cat:'power'    },
  { name:'Lateral Box Jump',             eq:'box',        muscles:['legs','glutes'],              cat:'power'    },
  { name:'Depth Jump',                   eq:'box',        muscles:['legs'],                       cat:'power'    },
  { name:'Explosive Step-Up',            eq:'box',        muscles:['legs','glutes'],              cat:'power'    },
  { name:'Step-Up on Box',              eq:'box',        muscles:['legs','glutes'],              cat:'legs'     },
  { name:'Bulgarian Split Squat (Box)',  eq:'box',        muscles:['legs','glutes'],              cat:'legs'     },
  { name:'Plyo Push-Up off Box',         eq:'box',        muscles:['chest','triceps'],            cat:'power'    },
  // ── Bodyweight ────────────────────────────────────────────────────────────
  { name:'Push-Up',                      eq:'bodyweight', muscles:['chest','triceps'],            cat:'push'     },
  { name:'Diamond Push-Up',             eq:'bodyweight', muscles:['triceps','chest'],            cat:'push'     },
  { name:'Pike Push-Up',                 eq:'bodyweight', muscles:['shoulders'],                  cat:'push'     },
  { name:'Plank',                        eq:'bodyweight', muscles:['core'],                       cat:'core'     },
  { name:'Side Plank',                   eq:'bodyweight', muscles:['core','obliques'],            cat:'core'     },
  { name:'Mountain Climber',             eq:'bodyweight', muscles:['core','legs'],                cat:'core'     },
  { name:'Burpee',                       eq:'bodyweight', muscles:['fullbody'],                   cat:'power'    },
  { name:'Jump Squat',                   eq:'bodyweight', muscles:['legs','glutes'],              cat:'power'    },
  { name:'Glute Bridge',                 eq:'bodyweight', muscles:['glutes','hamstrings'],        cat:'legs'     },
  { name:'Ab Bicycle',                   eq:'bodyweight', muscles:['core','obliques'],            cat:'core'     },
  { name:'Leg Raise',                    eq:'bodyweight', muscles:['core'],                       cat:'core'     },
  { name:'Superman Hold',                eq:'bodyweight', muscles:['back','glutes'],              cat:'pull'     },
  { name:'High Knees',                   eq:'bodyweight', muscles:['legs','core'],                cat:'cardio'   },
  /* ── Προθέρμανση ── */
  { name:'Jumping Jacks',                eq:'bodyweight', muscles:['full_body','cardio'],         cat:'warmup'   },
  { name:'Mountain Climbers',            eq:'bodyweight', muscles:['core','cardio','full_body'],  cat:'warmup'   },
  { name:'Butt Kicks',                   eq:'bodyweight', muscles:['hamstrings','cardio'],        cat:'warmup'   },
  { name:'Arm Circles',                  eq:'bodyweight', muscles:['shoulders'],                  cat:'warmup'   },
  { name:'Jump Rope',                    eq:'bodyweight', muscles:['full_body','cardio','calves'],cat:'warmup'   },
  { name:'Skaters',                      eq:'bodyweight', muscles:['legs','glutes','cardio'],     cat:'warmup'   },
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
  { name:'Cable Wrist Curl',             eq:'imbody',     muscles:['forearms'],                   cat:'pull'     },
  { name:'Cable Front Squat',            eq:'imbody',     muscles:['legs','quads','glutes'],      cat:'legs'     },
  { name:'Cable Good Morning',           eq:'imbody',     muscles:['hamstrings','back','glutes'], cat:'legs'     },
  { name:'Cable Lateral Lunge',          eq:'imbody',     muscles:['legs','glutes'],              cat:'legs'     },
  { name:'Cable Hip Adduction',          eq:'imbody',     muscles:['legs'],                       cat:'legs'     },
  { name:'Cable Calf Raise',             eq:'imbody',     muscles:['calves'],                     cat:'legs'     },
  { name:'Cable Reverse Woodchop',       eq:'imbody',     muscles:['core','obliques'],            cat:'core'     },
  { name:'Cable Side Bend',              eq:'imbody',     muscles:['obliques'],                   cat:'core'     },

  // ── Leg Machine ────────────────────────────────────────────────────────────
  { name:'Paused Leg Extension',         eq:'legmachine', muscles:['quads'],                      cat:'legs'     },
  { name:'Eccentric Leg Curl',           eq:'legmachine', muscles:['hamstrings'],                 cat:'legs'     },

  // ── Dumbbells ──────────────────────────────────────────────────────────────
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
  { name:'Dumbbell Floor Press',         eq:'dumbbells',  muscles:['chest','triceps'],            cat:'push'     },
  { name:'Dumbbell Skullcrusher',        eq:'dumbbells',  muscles:['triceps'],                    cat:'push'     },
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
  { name:'Bench Pistol Squat',           eq:'bench',      muscles:['legs','quads','glutes'],      cat:'legs'     },
  { name:'Seated Knee Tuck (Bench)',     eq:'bench',      muscles:['core'],                       cat:'core'     },

  // ── Plyo Box ───────────────────────────────────────────────────────────────
  { name:'Box Squat',                    eq:'box',        muscles:['legs','quads','glutes'],      cat:'legs'     },
  { name:'Seated Box Jump',              eq:'box',        muscles:['legs','glutes'],              cat:'power'    },
  { name:'Box Step-Down (Eccentric)',    eq:'box',        muscles:['quads','glutes'],             cat:'legs'     },
  { name:'Lateral Step-Over (Box)',      eq:'box',        muscles:['legs','glutes'],              cat:'legs'     },
  { name:'Incline Mountain Climber (Box)', eq:'box',      muscles:['core','cardio'],              cat:'core'     },

  // ── Bodyweight ─────────────────────────────────────────────────────────────
  { name:'Dead Bug',                     eq:'bodyweight', muscles:['core'],                       cat:'core'     },
  { name:'Bird Dog',                     eq:'bodyweight', muscles:['core','back','glutes'],       cat:'core'     },
  { name:'Hollow Hold',                  eq:'bodyweight', muscles:['core'],                       cat:'core'     },
  { name:'V-Up',                         eq:'bodyweight', muscles:['core'],                       cat:'core'     },
  { name:'Flutter Kicks',                eq:'bodyweight', muscles:['core'],                       cat:'core'     },
  { name:'Crunch',                       eq:'bodyweight', muscles:['core'],                       cat:'core'     },
  { name:'Russian Twist',                eq:'bodyweight', muscles:['core','obliques'],            cat:'core'     },
  { name:'Plank Shoulder Tap',           eq:'bodyweight', muscles:['core','shoulders'],           cat:'core'     },
  { name:'Side Plank Hip Dip',           eq:'bodyweight', muscles:['obliques','core'],            cat:'core'     },
  { name:'Bear Crawl',                   eq:'bodyweight', muscles:['full_body','core'],           cat:'fullbody' },
  { name:'Wall Sit',                     eq:'bodyweight', muscles:['quads','legs'],               cat:'legs'     },
  { name:'Reverse Lunge',                eq:'bodyweight', muscles:['legs','glutes'],              cat:'legs'     },
  { name:'Lateral Lunge',                eq:'bodyweight', muscles:['legs','glutes'],              cat:'legs'     },
  { name:'Sumo Squat',                   eq:'bodyweight', muscles:['legs','glutes'],              cat:'legs'     },
  { name:'Squat Pulse',                  eq:'bodyweight', muscles:['quads','glutes'],             cat:'legs'     },
  { name:'Single Leg Glute Bridge',      eq:'bodyweight', muscles:['glutes','hamstrings'],        cat:'legs'     },
  { name:'Donkey Kick',                  eq:'bodyweight', muscles:['glutes'],                     cat:'legs'     },
  { name:'Fire Hydrant',                 eq:'bodyweight', muscles:['glutes'],                     cat:'legs'     },
  { name:'Calf Raise',                   eq:'bodyweight', muscles:['calves'],                     cat:'legs'     },
  { name:'Wall Push-Up',                 eq:'bodyweight', muscles:['chest','triceps'],            cat:'push'     },
];

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
