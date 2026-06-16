// ── Πλήρες λεξικό EN → EL για το DOM translation layer ───────────────────────
// Exact-match σε trimmed text nodes + placeholders. Τα PATTERNS πιάνουν φράσεις με αριθμούς.

export const DICT = {
  // ── Κοινά ──
  'Save':'Αποθήκευση','Cancel':'Ακύρωση','Delete':'Διαγραφή','Edit':'Επεξεργασία','Add':'Προσθήκη',
  'Back':'Πίσω','Continue':'Συνέχεια','Close':'Κλείσιμο','Send':'Αποστολή','Done':'Έγινε',
  'Loading...':'Φόρτωση...','Saving…':'Αποθήκευση…','Sending…':'Αποστολή…','Search':'Αναζήτηση',
  'Today':'Σήμερα','Tomorrow':'Αύριο','All':'Όλα','None':'Κανένα','Yes':'Ναι','No':'Όχι',
  'Date':'Ημερομηνία','Time':'Ώρα','Title':'Τίτλος','Name':'Όνομα','Email':'Email','Phone':'Τηλέφωνο',
  'Notes':'Σημειώσεις','Client':'Πελάτης','Clients':'Πελάτες','Type':'Τύπος','Status':'Κατάσταση',
  'Actions':'Ενέργειες','Amount':'Ποσό','Total':'Σύνολο','Try Again':'Δοκιμάστε ξανά','Refresh':'Ανανέωση',
  'Sign Out':'Αποσύνδεση','Sign In':'Σύνδεση','Password':'Κωδικός','exercises':'ασκήσεις','exercise':'άσκηση',
  'sets':'σετ','plans':'πλάνα','sessions':'συνεδρίες','min':'λεπτά','kcal':'kcal','days left':'μέρες απομένουν',
  'vs start':'από την αρχή','vs last':'από πριν','vs prev':'από πριν','more':'ακόμα','Optional':'Προαιρετικό',
  'records':'εγγραφές','Month':'Μήνας','Week':'Εβδομάδα','Day':'Ημέρα','Duration':'Διάρκεια',
  'Completed':'Ολοκληρώθηκε','Pending':'Σε αναμονή','Active':'Ενεργός','Inactive':'Ανενεργός','Expired':'Έληξε',

  // ── Home (master) ──
  'Total Clients':'Σύνολο Πελατών',"Today's Sessions":'Σημερινές Συνεδρίες','Training Plans':'Πλάνα Προπόνησης',
  'Nutrition Clients':'Πελάτες Διατροφής','Next Appointments':'Επόμενα Ραντεβού','This Week':'Αυτή η Εβδομάδα',
  'To-Do':'Εκκρεμότητες','No sessions today':'Καμία συνεδρία σήμερα','Daily Motivation':'Καθημερινό Κίνητρο',
  'No tasks yet':'Καμία εργασία ακόμα','No appointments scheduled':'Δεν υπάρχουν ραντεβού',

  // ── Calendar ──
  'Calendar':'Ημερολόγιο','New Event':'Νέο Ραντεβού','Requests':'Αιτήματα','Training':'Προπόνηση',
  'Nutrition':'Διατροφή','Other':'Άλλο','Decline':'Απόρριψη','Client says:':'Ο πελάτης λέει:',
  'Propose Time →':'Πρόταση Ώρας →','Re-propose Time →':'Νέα Πρόταση →','Client countered':'Αντιπρόταση πελάτη',
  'Proposed to client':'Προτάθηκε στον πελάτη','Confirmed':'Επιβεβαιώθηκε','Declined':'Απορρίφθηκε',
  'Cancelled':'Ακυρώθηκε','No requests':'Κανένα αίτημα','Start Time':'Ώρα Έναρξης',
  'Duration (min)':'Διάρκεια (λεπτά)','Note to client':'Σημείωση στον πελάτη',

  // ── Clients ──
  'Add Client':'Προσθήκη Πελάτη','Goals':'Στόχοι','sessions/week':'συνεδρίες/εβδ.','Profile':'Προφίλ',
  'No clients yet':'Κανένας πελάτης ακόμα','Medical Notes':'Ιατρικές Σημειώσεις','Progress':'Πρόοδος',

  // ── Training Plans ──
  'Manual':'Χειροκίνητο','AI Wizard':'Βοηθός AI','AI Training Wizard':'Βοηθός Προπόνησης AI',
  'No training plans yet':'Δεν υπάρχουν πλάνα ακόμα','Plan Ready':'Το Πλάνο είναι Έτοιμο',
  'Who is this plan for?':'Για ποιον είναι το πλάνο;','Select Client':'Επιλογή Πελάτη','Choose...':'Επιλέξτε...',
  'Custom name':'Άλλο όνομα','Training Focus':'Εστίαση Προπόνησης','Session Duration':'Διάρκεια Συνεδρίας',
  'Exercise Preview':'Προεπισκόπηση Ασκήσεων','Edit & Save':'Επεξεργασία & Αποθήκευση',
  'Build Full Plan':'Δημιουργία Πλήρους Πλάνου','Re-sort order':'Επαναταξινόμηση','Add Exercise':'Προσθήκη Άσκησης',
  'Plan Title':'Τίτλος Πλάνου','Save Plan ✓':'Αποθήκευση Πλάνου ✓','Save Plan':'Αποθήκευση Πλάνου',
  'Manual Plan':'Χειροκίνητο Πλάνο','Exercises':'Ασκήσεις','Sets':'Σετ','Reps':'Επαναλήψεις',
  'Rest':'Ανάπαυση','Rest between sets:':'Ανάπαυση μεταξύ σετ:','Per-Set Detail':'Λεπτομέρειες ανά Σετ',
  'Set':'Σετ','Your equipment:':'Ο εξοπλισμός σου:','Chest':'Στήθος','Shoulders':'Ώμοι','Biceps':'Δικέφαλα',
  'Triceps':'Τρικέφαλα','Legs':'Πόδια','Glutes':'Γλουτοί','Core':'Κορμός','Calves':'Γάμπες','Full Body':'Όλο το Σώμα',
  'Step':'Βήμα','of':'από','Preview Exercises':'Προεπισκόπηση Ασκήσεων','tap for detail':'πάτησε για λεπτομέρειες',
  'Exercise name':'Όνομα άσκησης','Optimized order':'Βελτιστοποιημένη σειρά',

  // ── Nutrition ──
  'Nutrition Plans':'Πλάνα Διατροφής','AI Wizard — Create Plan':'Βοηθός AI — Νέο Πλάνο',
  'Daily Calories':'Ημερήσιες Θερμίδες','Meal Types':'Τύποι Γευμάτων','Food Preferences':'Προτιμήσεις Τροφίμων',
  'Water & Supplements':'Νερό & Συμπληρώματα','Review Foods':'Επανεξέταση Τροφίμων','Final Plan':'Τελικό Πλάνο',
  'Daily Water Target':'Ημερήσιος Στόχος Νερού','Supplements':'Συμπληρώματα','Save to Client ✓':'Αποθήκευση στον Πελάτη ✓',
  'No nutrition plans yet':'Δεν υπάρχουν πλάνα ακόμα','Breakfast':'Πρωινό','Lunch':'Μεσημεριανό','Dinner':'Βραδινό',
  'Snack':'Σνακ','Morning Snack':'Πρωινό Σνακ','Afternoon Snack':'Απογευματινό Σνακ','Ingredients':'Υλικά',
  'protein':'πρωτεΐνη','carbs':'υδατάνθρακες','fat':'λίπος','water':'νερό',

  // ── Statistics ──
  'Statistics':'Στατιστικά','Track and analyze client progress':'Παρακολούθηση προόδου πελατών',
  'Select a client':'Επιλογή πελάτη','Add Record':'Προσθήκη Εγγραφής','Withings Import':'Εισαγωγή Withings',
  'Session Summary':'Σύνοψη Συνεδρίας','Weight':'Βάρος','Body Fat':'Σωματικό Λίπος','Muscle':'Μυς',
  'Muscle Mass':'Μυϊκή Μάζα','Body Water':'Νερό Σώματος','Bone Mass':'Οστική Μάζα','Visceral Fat':'Σπλαχνικό Λίπος',
  'Steps':'Βήματα','Sleep':'Ύπνος','Water':'Νερό','Hydration':'Ενυδάτωση','Metabolism':'Μεταβολισμός',
  'All Records':'Όλες οι Εγγραφές','No records yet':'Καμία εγγραφή ακόμα',
  'Select a client to view statistics':'Επίλεξε πελάτη για στατιστικά',
  'Import from Withings or add manually':'Εισαγωγή από Withings ή χειροκίνητα',
  'Import from Withings':'Εισαγωγή από Withings','Add Manually':'Χειροκίνητη Προσθήκη',
  'How to export from Withings:':'Πώς να εξάγεις από το Withings:','Upload CSV File':'Ανέβασμα Αρχείου CSV',
  'Paste CSV Text':'Επικόλληση Κειμένου CSV','from Withings export':'από εξαγωγή Withings',
  'copy-paste the data':'αντιγραφή-επικόλληση','Parse Data':'Ανάλυση Δεδομένων',
  'Parsing Withings data…':'Ανάλυση δεδομένων Withings…','Could not parse this file':'Αδυναμία ανάγνωσης αρχείου',
  'Saved':'Αποθηκεύτηκε','Save Record':'Αποθήκευση Εγγραφής',

  // ── Session Presentation ──
  'Body Stats':'Σωματικά Στατιστικά','Lifestyle':'Τρόπος Ζωής','Session Review':'Ανασκόπηση Συνεδρίας',
  'Goal':'Στόχος','Fitness Radar':'Ραντάρ Φυσικής Κατάστασης','Avg Water':'Μ.Ο. Νερού','L/day':'L/ημέρα',
  'days tracked':'ημέρες καταγραφής','latest record':'τελευταία εγγραφή','Recovery on point':'Άψογη αποκατάσταση',
  'Almost there':'Σχεδόν εκεί','Drink more daily':'Πιες περισσότερο νερό','No data':'Χωρίς δεδομένα',
  'On target':'Εντός στόχου','Below target':'Κάτω από στόχο','Lifestyle Indicators':'Δείκτες Τρόπου Ζωής',
  'vs Target':'σε σχέση με Στόχο','AI Session Analysis':'AI Ανάλυση Συνεδρίας',
  'Show AI analysis to client':'Εμφάνιση AI ανάλυσης στον πελάτη',
  'No training sessions recorded yet':'Δεν υπάρχουν καταγεγραμμένες προπονήσεις',
  'No nutrition plan assigned':'Δεν έχει ανατεθεί πλάνο διατροφής','Previous':'Προηγούμενο','Now':'Τώρα','Prev':'Πριν',
  'dashed = previous':'διακεκομμένο = προηγούμενο','faded ring = previous':'αχνός δακτύλιος = προηγούμενο',

  // ── Hevy ──
  'Connected':'Συνδεδεμένο','Live Monitor':'Ζωντανή Παρακολούθηση','History':'Ιστορικό','Push Plans':'Αποστολή Πλάνων',
  'Live Training Monitor':'Ζωντανή Παρακολούθηση Προπόνησης','Start':'Έναρξη','Stop':'Διακοπή',
  'Waiting for workouts...':'Αναμονή για προπονήσεις...','Workout History':'Ιστορικό Προπονήσεων',
  'Load Workouts':'Φόρτωση Προπονήσεων','Push to Hevy':'Αποστολή στο Hevy','Select Training Plan':'Επιλογή Πλάνου',
  'Choose a plan...':'Επίλεξε πλάνο...','Total Workouts':'Συνολικές Προπονήσεις','Total Volume':'Συνολικός Όγκος',
  'Avg Duration':'Μέση Διάρκεια','Saved Hevy Workouts':'Αποθηκευμένες Προπονήσεις Hevy',
  'No saved workouts yet':'Καμία αποθηκευμένη προπόνηση','No workouts found in Hevy':'Δεν βρέθηκαν προπονήσεις στο Hevy',
  'Load More':'Φόρτωση Περισσότερων','Two-way sync with Hevy · Push plans · Monitor live sessions':'Αμφίδρομος συγχρονισμός με Hevy · Αποστολή πλάνων · Ζωντανή παρακολούθηση',

  // ── Logistics ──
  'Logistics & Finance':'Οικονομικά','Overview':'Επισκόπηση','Transactions':'Συναλλαγές','Client Plans':'Πλάνα Πελατών',
  'Log Payment':'Καταχώρηση Πληρωμής','This Month':'Αυτόν τον Μήνα','Total Revenue':'Συνολικά Έσοδα',
  'Active Clients':'Ενεργοί Πελάτες','Expiring Soon':'Λήγουν Σύντομα','Renew':'Ανανέωση','Revenue':'Έσοδα',
  'Payment':'Πληρωμή','Subscription':'Συνδρομή','Plan Settings':'Ρυθμίσεις Πλάνου',

  // ── Messages ──
  'Messages':'Μηνύματα','Select a conversation':'Επίλεξε συνομιλία','No messages yet':'Κανένα μήνυμα ακόμα',

  // ── Client portal ──
  'Hello,':'Γεια σου,','Next Session':'Επόμενη Συνεδρία','Weight Progress':'Πρόοδος Βάρους',
  'Last Training':'Τελευταία Προπόνηση','Upcoming Sessions':'Επερχόμενες Συνεδρίες',
  "Today's Nutrition":'Διατροφή Σήμερα','Water Intake':'Πρόσληψη Νερού','Reminders':'Υπενθυμίσεις',
  'Customize':'Προσαρμογή','Request':'Αίτημα','My requests':'Τα αιτήματά μου','to confirm':'για επιβεβαίωση',
  'No reminders':'Καμία υπενθύμιση','🎉 Daily goal reached!':'🎉 Ημερήσιος στόχος!','Customize Home':'Προσαρμογή Αρχικής',
  'Motivational Quote':'Φράση Κινήτρου','Weight Progress Chart':'Γράφημα Βάρους','Muscle Progress':'Πρόοδος Μυών',
  'Water Intake Tracker':'Καταγραφή Νερού','Supplement Checklist':'Λίστα Συμπληρωμάτων','My Reminders':'Οι Υπενθυμίσεις μου',
  'Nutrition Plan':'Πλάνο Διατροφής','Request Session':'Αίτημα Συνεδρίας','Preferred Date *':'Προτιμώμενη Ημερομηνία *',
  'Note to trainer':'Σημείωση στον γυμναστή','Send Request':'Αποστολή Αιτήματος','My Session Requests':'Τα Αιτήματα Συνεδριών μου',
  'No requests yet':'Κανένα αίτημα ακόμα','Waiting for trainer':'Αναμονή γυμναστή','Trainer proposed a time':'Ο γυμναστής πρότεινε ώρα',
  'You replied':'Απάντησες','Trainer proposes:':'Ο γυμναστής προτείνει:','Suggest different time':'Πρότεινε άλλη ώρα',
  'Confirm':'Επιβεβαίωση','Cancel Request':'Ακύρωση Αιτήματος','Send Counter':'Αποστολή Αντιπρότασης',
  'No supplements assigned':'Δεν έχουν ανατεθεί συμπληρώματα','Meals':'Γεύματα','Grocery List':'Λίστα Αγορών',
  'View Full Recipe':'Δείτε την Πλήρη Συνταγή','Daily Target':'Ημερήσιος Στόχος',
  'No nutrition plan assigned yet':'Δεν έχει ανατεθεί πλάνο ακόμα','Current Nutrition Plan':'Τρέχον Πλάνο Διατροφής',
  'My Plan':'Το Πλάνο μου','Payments':'Πληρωμές','Financial':'Οικονομικά','Stats':'Στατιστικά','Home':'Αρχική',
};

// ── Placeholders (input/textarea) ──
export const PLACEHOLDERS = {
  'Search clients...':'Αναζήτηση πελατών...','Type a message...':'Γράψε μήνυμα...','Add a task...':'Προσθήκη εργασίας...',
  'Search...':'Αναζήτηση...','Exercise name':'Όνομα άσκησης','e.g. Prefer morning, around 9–10am':'π.χ. Προτιμώ πρωί, 9–10πμ',
  'e.g. Can we do 10am instead?':'π.χ. Μπορούμε στις 10πμ;','e.g. Slow eccentric, pause at bottom':'π.χ. Αργό αρνητικό, παύση κάτω',
};

// ── Patterns με αριθμούς ──
export const PATTERNS = [
  [/^(\d+)\s*exercises$/i, '$1 ασκήσεις'],
  [/^(\d+)\s*sets$/i, '$1 σετ'],
  [/^(\d+)\s*plans$/i, '$1 πλάνα'],
  [/^(\d+)\s*sessions recorded$/i, '$1 καταγεγραμμένες συνεδρίες'],
  [/^(\d+)\s*days tracked$/i, '$1 ημέρες καταγραφής'],
  [/^(\d+)\s*min$/i, '$1 λεπτά'],
  [/^(\d+)\s*days left$/i, '$1 μέρες απομένουν'],
  [/^Step (\d+) of (\d+)/i, 'Βήμα $1 από $2'],
  [/^\+(\d+) more$/i, '+$1 ακόμα'],
];
