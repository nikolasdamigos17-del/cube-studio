const generateId = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
const getStore = (key) => { try { const d = localStorage.getItem(`studio_${key}`); return d ? JSON.parse(d) : []; } catch { return []; } };
const setStore = (key, data) => { try { localStorage.setItem(`studio_${key}`, JSON.stringify(data)); } catch {} };
const subscribers = {};

const createEntity = (storeName) => ({
  list: async (sortField = 'created_date', limit = 500) => {
    const items = getStore(storeName);
    const asc = !sortField.startsWith('-');
    const field = sortField.replace('-', '');
    return [...items].sort((a,b) => { const av=a[field]||''; const bv=b[field]||''; return asc?(av>bv?1:-1):(av<bv?1:-1); }).slice(0, limit);
  },
  filter: async (filters = {}, sortField = 'created_date', limit = 500) => {
    const items = getStore(storeName);
    const filtered = items.filter(item => Object.entries(filters).every(([k,v]) => item[k] === v));
    const asc = !sortField.startsWith('-');
    const field = sortField.replace('-', '');
    return [...filtered].sort((a,b) => { const av=a[field]||''; const bv=b[field]||''; return asc?(av>bv?1:-1):(av<bv?1:-1); }).slice(0, limit);
  },
  create: async (data) => {
    const items = getStore(storeName);
    const newItem = { ...data, id: generateId(), created_date: new Date().toISOString(), updated_date: new Date().toISOString() };
    setStore(storeName, [...items, newItem]);
    (subscribers[storeName]||[]).forEach(cb => cb({ type: 'create', data: newItem }));
    return newItem;
  },
  update: async (id, data) => {
    const items = getStore(storeName);
    const updated = items.map(item => item.id === id ? { ...item, ...data, id, updated_date: new Date().toISOString() } : item);
    setStore(storeName, updated);
    const result = updated.find(i => i.id === id);
    (subscribers[storeName]||[]).forEach(cb => cb({ type: 'update', id, data: result }));
    return result;
  },
  delete: async (id) => {
    setStore(storeName, getStore(storeName).filter(item => item.id !== id));
    (subscribers[storeName]||[]).forEach(cb => cb({ type: 'delete', id }));
    return { success: true };
  },
  get: async (id) => getStore(storeName).find(item => item.id === id) || null,
  subscribe: (callback) => {
    if (!subscribers[storeName]) subscribers[storeName] = [];
    subscribers[storeName].push(callback);
    return () => { subscribers[storeName] = (subscribers[storeName]||[]).filter(cb => cb !== callback); };
  },
});

export const db = {
  Client: createEntity('clients'),
  Appointment: createEntity('appointments'),
  TrainingPlan: createEntity('training_plans'),
  NutritionPlan: createEntity('nutrition_plans'),
  ClientProgress: createEntity('client_progress'),
  ClientNote: createEntity('client_notes'),
  Payment: createEntity('payments'),
  TodoItem: createEntity('todos'),
  Message: createEntity('messages'),
  Group: createEntity('groups'),
  HevyWorkout: createEntity('hevy_workouts'),
  ClientReminder: createEntity('client_reminders'),
  AppointmentRequest: createEntity('appointment_requests'),
  WaterLog: createEntity('water_logs'),
  SupplementLog: createEntity('supplement_logs'),
};

// ── AI CALL ───────────────────────────────────────────────────────────────────
// Reads key from: .env file (VITE_ANTHROPIC_API_KEY) OR localStorage (studio_api_key)
const GREEK_DIRECTIVE = `

ΓΛΩΣΣΑ: Απάντησε στα ΕΛΛΗΝΙΚΑ. Όλο το αναγνώσιμο κείμενο (τίτλοι, περιγραφές, σημειώσεις, συμβουλές, αναλύσεις) πρέπει να είναι στα ελληνικά.
ΕΞΑΙΡΕΣΕΙΣ: 1) Τα JSON keys μένουν ΠΑΝΤΑ στα αγγλικά. 2) Αν σου ζητείται να διαλέξεις στοιχεία από δοσμένη λίστα (π.χ. ονόματα ασκήσεων), επέστρεψέ τα ΑΚΡΙΒΩΣ όπως γράφονται στη λίστα, χωρίς μετάφραση.`;

export async function callAI(prompt, systemPrompt) {
  const lang = localStorage.getItem('cube_lang') || 'en';
  if (lang === 'el') systemPrompt = (systemPrompt || '') + GREEK_DIRECTIVE;
  const API_KEY = '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';
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        system: systemPrompt || 'You are a helpful fitness and nutrition assistant.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error('API error:', response.status, errText);
      return '__ERROR__:' + response.status;
    }
    const data = await response.json();
    if (data.error) return '__ERROR__:' + data.error.message;
    return data.content?.[0]?.text || '';
  } catch (e) {
    console.error('callAI error:', e);
    return '__ERROR__:' + e.message;
  }
}

// ── SEED DEMO DATA ────────────────────────────────────────────────────────────
export const seedDemoData = () => {
  if (getStore('clients').length > 0) return;
  const fmt = (d) => d.toISOString().split('T')[0];
  const dAgo = (n) => { const d=new Date(); d.setDate(d.getDate()-n); return fmt(d); };
  const dAhead = (n) => { const d=new Date(); d.setDate(d.getDate()+n); return fmt(d); };
  const wAgo = (n) => dAgo(n*7);
  const now = new Date().toISOString();

  setStore('clients', [
    { id:'c1', name:'Alex Mitchell', email:'alex.mitchell@email.com', phone:'+30 694 123 4567', gender:'male', date_of_birth:'1992-05-15', theme_color:'#6366f1', services:'personal_training', sessions_per_week:3, session_duration_hours:1, monthly_price:250, weight:82, height:181, body_fat:18, goals:'Build muscle mass and improve overall fitness', portal_password:'Alex2024!', active:true, created_date:now },
    { id:'c2', name:'Maria Papadaki', email:'maria.papadaki@email.com', phone:'+30 697 987 6543', gender:'female', date_of_birth:'1995-08-22', theme_color:'#ec4899', services:'personal_training_nutrition', sessions_per_week:4, session_duration_hours:1, nutrition_meetings_per_month:2, monthly_price:320, weight:61, height:165, body_fat:22, goals:'Weight loss and toning', portal_password:'Maria2024!', active:true, created_date:now },
    { id:'c3', name:'Nikos Stavros', email:'nikos.stavros@email.com', phone:'+30 693 456 7890', gender:'male', date_of_birth:'1988-03-10', theme_color:'#10b981', services:'personal_training', sessions_per_week:3, session_duration_hours:1, monthly_price:250, weight:91, height:178, body_fat:24, goals:'Strength training and fat loss', portal_password:'Nikos2024!', active:true, created_date:now },
  ]);

  const today = fmt(new Date());
  setStore('appointments', [
    { id:'a1', title:'Alex Mitchell - Training', client_id:'c1', client_name:'Alex Mitchell', client_color:'#6366f1', type:'training', date:today, start_time:'09:00', duration_minutes:60, status:'scheduled', created_date:now },
    { id:'a2', title:'Maria Papadaki - Training', client_id:'c2', client_name:'Maria Papadaki', client_color:'#ec4899', type:'training', date:today, start_time:'11:00', duration_minutes:60, status:'scheduled', created_date:now },
    { id:'a3', title:'Nikos Stavros - Training', client_id:'c3', client_name:'Nikos Stavros', client_color:'#10b981', type:'training', date:dAhead(1), start_time:'10:00', duration_minutes:60, status:'scheduled', created_date:now },
    { id:'a4', title:'Alex Mitchell - Training', client_id:'c1', client_name:'Alex Mitchell', client_color:'#6366f1', type:'training', date:dAhead(2), start_time:'09:00', duration_minutes:60, status:'scheduled', created_date:now },
    { id:'a5', title:'Maria Papadaki - Nutrition', client_id:'c2', client_name:'Maria Papadaki', client_color:'#ec4899', type:'nutrition', date:dAhead(3), start_time:'14:00', duration_minutes:60, status:'scheduled', created_date:now },
    { id:'a6', title:'Alex Mitchell - Training', client_id:'c1', client_name:'Alex Mitchell', client_color:'#6366f1', type:'training', date:dAhead(5), start_time:'09:00', duration_minutes:60, status:'scheduled', created_date:now },
  ]);

  const alexProg = Array.from({length:10},(_,i)=>({ id:`pg-a${i}`, client_id:'c1', date:wAgo(9-i), weight_kg:parseFloat((85-i*0.45).toFixed(1)), body_fat_pct:parseFloat((20-i*0.3).toFixed(1)), muscle_mass_kg:parseFloat((66+i*0.4).toFixed(1)), body_water_pct:parseFloat((57+i*0.1).toFixed(1)), bone_mass_kg:3.8, bmr:1920+i*12, bmi:parseFloat((25.9-i*0.14).toFixed(1)), visceral_fat:Math.max(7,11-Math.floor(i/2)), steps:7500+Math.floor(Math.random()*4000), sleep_hours:parseFloat((7+Math.random()).toFixed(1)), water_liters:parseFloat((2+Math.random()).toFixed(1)), created_date:now }));
  const mariaProg = Array.from({length:10},(_,i)=>({ id:`pg-m${i}`, client_id:'c2', date:wAgo(9-i), weight_kg:parseFloat((65-i*0.55).toFixed(1)), body_fat_pct:parseFloat((25-i*0.4).toFixed(1)), muscle_mass_kg:parseFloat((43+i*0.25).toFixed(1)), body_water_pct:parseFloat((54+i*0.1).toFixed(1)), bone_mass_kg:2.9, bmr:1420+i*8, bmi:parseFloat((23.9-i*0.2).toFixed(1)), visceral_fat:7, steps:9000+Math.floor(Math.random()*3000), sleep_hours:parseFloat((7.5+Math.random()*0.5).toFixed(1)), water_liters:parseFloat((2.5+Math.random()*0.5).toFixed(1)), created_date:now }));
  setStore('client_progress', [...alexProg, ...mariaProg]);

  setStore('training_plans', [
    { id:'tp1', client_id:'c1', client_name:'Alex Mitchell', date:dAhead(2), title:'Alex - Upper Body Hypertrophy', notes:'Focus on mind-muscle connection. Rest 90s between sets.', completed:false, created_date:now, exercises:[
      { name:'Bench Press', sets:4, reps:'8-10', weight_kg:80, rest_between_sets:90, rest_after_exercise:120, notes:'Control the eccentric', set_details:[{reps:10,weight_kg:80,rest_sec:90},{reps:10,weight_kg:80,rest_sec:90},{reps:8,weight_kg:82.5,rest_sec:90},{reps:8,weight_kg:82.5,rest_sec:90}] },
      { name:'Incline Dumbbell Press', sets:3, reps:'10-12', weight_kg:30, rest_between_sets:75, rest_after_exercise:90, notes:'', set_details:[] },
      { name:'Pull-Up', sets:4, reps:'6-8', weight_kg:0, rest_between_sets:90, rest_after_exercise:120, notes:'Full ROM', set_details:[] },
      { name:'Overhead Press', sets:3, reps:'8-10', weight_kg:50, rest_between_sets:90, rest_after_exercise:120, notes:'', set_details:[] },
      { name:'Bicep Curl', sets:3, reps:'12', weight_kg:15, rest_between_sets:60, rest_after_exercise:90, notes:'', set_details:[] },
    ]},
    { id:'tp2', client_id:'c2', client_name:'Maria Papadaki', date:today, title:'Maria - Full Body Toning', notes:'Moderate weight, higher reps.', completed:false, created_date:now, exercises:[
      { name:'Barbell Squat', sets:4, reps:'12-15', weight_kg:40, rest_between_sets:75, rest_after_exercise:90, notes:'Depth to parallel', set_details:[] },
      { name:'Romanian Deadlift', sets:3, reps:'12', weight_kg:35, rest_between_sets:75, rest_after_exercise:90, notes:'', set_details:[] },
      { name:'Hip Thrust', sets:4, reps:'15', weight_kg:50, rest_between_sets:60, rest_after_exercise:90, notes:'', set_details:[] },
      { name:'Lateral Raise', sets:3, reps:'15', weight_kg:8, rest_between_sets:60, rest_after_exercise:75, notes:'', set_details:[] },
      { name:'Plank', sets:3, reps:'45s', weight_kg:0, rest_between_sets:60, rest_after_exercise:60, notes:'', set_details:[] },
    ]},
  ]);

  setStore('nutrition_plans', [
    { id:'np1', client_id:'c1', client_name:'Alex Mitchell', date:dAgo(5), title:'Alex - Muscle Building Plan (2800 kcal)', calories:2800, protein:200, carbs:320, fat:80, notes:'High protein for muscle building.', created_date:now,
      meal_sections:[
        { section_name:'Breakfast', time:'08:00', options:[
          { name:'Greek Yogurt Power Bowl', description:'500g Greek yogurt with oats, honey and berries', ingredients:'500g Greek yogurt, 80g rolled oats, 1 tbsp honey, 100g mixed berries, 30g almonds', calories:650, protein:45, carbs:75, fat:18, recipe_url:'https://www.bbcgoodfood.com/recipes/greek-yogurt-bowl' },
          { name:'Eggs & Oat Pancakes', description:'4 whole eggs with oat pancakes', ingredients:'4 whole eggs, 100g oats, 1 banana, 200ml milk', calories:700, protein:40, carbs:70, fat:22, recipe_url:'https://www.allrecipes.com/recipe/oat-pancakes' },
        ]},
        { section_name:'Lunch', time:'13:00', options:[
          { name:'Chicken Rice Bowl', description:'Grilled chicken with brown rice and roasted vegetables', ingredients:'200g chicken breast, 150g brown rice, 200g mixed vegetables, 1 tbsp olive oil', calories:720, protein:55, carbs:80, fat:15, recipe_url:'https://www.allrecipes.com/chicken-rice-bowl' },
          { name:'Chicken Burrito Bowl', description:'Spiced chicken with rice, beans, avocado', ingredients:'200g chicken breast, 120g rice, 100g black beans, half avocado, salsa', calories:750, protein:52, carbs:78, fat:18, recipe_url:'https://www.bbcgoodfood.com/recipes/chicken-burrito-bowl' },
        ]},
        { section_name:'Dinner', time:'20:00', options:[
          { name:'Turkey & Pasta', description:'Ground turkey bolognese with whole wheat pasta', ingredients:'200g ground turkey, 150g pasta, tomato sauce, onion, garlic', calories:650, protein:52, carbs:68, fat:12, recipe_url:'https://www.allrecipes.com/turkey-bolognese' },
          { name:'Chicken Souvlaki Bowl', description:'Marinated chicken with tzatziki and pita', ingredients:'200g chicken, 1 pita, tzatziki, tomato, cucumber', calories:680, protein:50, carbs:58, fat:18, recipe_url:'https://www.allrecipes.com/chicken-souvlaki' },
        ]},
      ]},
    { id:'np2', client_id:'c2', client_name:'Maria Papadaki', date:dAgo(3), title:'Maria - Weight Loss Plan (1800 kcal)', calories:1800, protein:140, carbs:180, fat:55, notes:'Caloric deficit for weight loss.', created_date:now,
      meal_sections:[
        { section_name:'Breakfast', time:'08:00', options:[
          { name:'Protein Smoothie', description:'Strawberry protein smoothie with oats', ingredients:'1 scoop protein, 200ml almond milk, 100g strawberries, 40g oats', calories:380, protein:35, carbs:42, fat:7, recipe_url:'https://www.bbcgoodfood.com/recipes/protein-smoothie' },
          { name:'Avocado Toast & Eggs', description:'Whole grain toast with avocado and eggs', ingredients:'2 slices whole grain bread, half avocado, 2 eggs', calories:420, protein:24, carbs:38, fat:20, recipe_url:'https://www.allrecipes.com/avocado-toast' },
        ]},
        { section_name:'Lunch', time:'13:00', options:[
          { name:'Greek Chicken Salad', description:'Grilled chicken on Greek salad', ingredients:'150g chicken, tomato, cucumber, olives, 30g feta, olive oil', calories:420, protein:40, carbs:18, fat:20, recipe_url:'https://www.allrecipes.com/greek-chicken-salad' },
          { name:'Tuna & Quinoa Bowl', description:'Tuna with quinoa and spinach', ingredients:'1 can tuna, 80g quinoa, cherry tomatoes, spinach', calories:410, protein:42, carbs:38, fat:9, recipe_url:'https://www.allrecipes.com/tuna-quinoa' },
        ]},
        { section_name:'Dinner', time:'19:00', options:[
          { name:'Baked Cod & Veg', description:'Baked cod with Mediterranean vegetables', ingredients:'180g cod, zucchini, pepper, tomato, olive oil', calories:360, protein:38, carbs:22, fat:12, recipe_url:'https://www.bbcgoodfood.com/recipes/baked-cod' },
          { name:'Turkey Meatballs', description:'Turkey meatballs in tomato sauce with zucchini noodles', ingredients:'180g turkey mince, zucchini noodles, tomato sauce', calories:380, protein:40, carbs:18, fat:14, recipe_url:'https://www.allrecipes.com/turkey-meatballs' },
        ]},
      ]},
  ]);

  setStore('payments', [
    { id:'pay1', client_id:'c1', client_name:'Alex Mitchell', amount:250, currency:'EUR', description:'Monthly PT - May 2025', period_from:dAgo(5), period_to:dAhead(25), paid_date:dAgo(5), method:'cash', created_date:now },
    { id:'pay2', client_id:'c2', client_name:'Maria Papadaki', amount:320, currency:'EUR', description:'Monthly PT + Nutrition - May 2025', period_from:dAgo(10), period_to:dAhead(20), paid_date:dAgo(10), method:'card', created_date:now },
    { id:'pay3', client_id:'c3', client_name:'Nikos Stavros', amount:250, currency:'EUR', description:'Monthly PT - April 2025', period_from:dAgo(35), period_to:dAgo(5), paid_date:dAgo(35), method:'transfer', created_date:now },
  ]);

  setStore('todos', [
    { id:'t1', title:'Update Alex training plan for next month', completed:false, priority:'high', due_date:dAhead(2), created_date:now },
    { id:'t2', title:'Send nutrition plan to Maria', completed:false, priority:'medium', due_date:dAhead(1), created_date:now },
    { id:'t3', title:'Order new resistance bands', completed:false, priority:'low', created_date:now },
    { id:'t4', title:'Review weekly progress reports', completed:true, priority:'low', created_date:now },
  ]);

  setStore('messages', [
    { id:'msg1', client_id:'c1', client_name:'Alex Mitchell', sender:'client', content:"Hey! What time is our session tomorrow?", read:false, created_date:new Date(Date.now()-3600000).toISOString() },
    { id:'msg2', client_id:'c2', client_name:'Maria Papadaki', sender:'client', content:"Can we reschedule Thursday's session?", read:false, created_date:new Date(Date.now()-7200000).toISOString() },
  ]);

  setStore('client_notes', [
    { id:'n1', client_id:'c1', title:'Shoulder injury history', content:'Had a minor rotator cuff issue in 2022. Avoid heavy overhead pressing for now.', type:'note', pinned:true, category:'medical', created_date:now },
    { id:'n2', client_id:'c1', title:'Motivation style', content:'Alex responds well to PBs and tracking numbers. Always celebrate progress.', type:'note', pinned:false, category:'general', created_date:now },
    { id:'n3', client_id:'c2', title:'Dietary restriction', content:'Lactose intolerant. Use plant-based dairy alternatives.', type:'note', pinned:true, category:'nutrition', created_date:now },
  ]);

  console.log('✅ Demo data seeded');
};
