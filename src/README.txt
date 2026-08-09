NUTRITION CENTER — ΣΤΑΔΙΟ 1 (θεμέλια)
======================================

ΕΦΑΡΜΟΓΗ
1. Κάνε unzip ΣΤΗ ΡΙΖΑ του project (εκεί που είναι ο φάκελος src/) ώστε τα αρχεία
   να αντικαταστήσουν τα υπάρχοντα. ΜΗΝ κάνεις copy-paste περιεχόμενο — αντικατάσταση αρχείων.
2. git add -A && git commit -m "Nutrition Center - Stage 1" && git push

ΕΠΑΛΗΘΕΥΣΗ (wc -l <αρχείο>)
src/App.jsx: 135 γραμμές
src/lib/db.js: 214 γραμμές
src/pages/Clients.jsx: 206 γραμμές
src/pages/CoursePlanning.jsx: 444 γραμμές
src/pages/Nutrition.jsx: 660 γραμμές
src/pages/TrainingPlans.jsx: 610 γραμμές

ΤΙ ΠΕΡΙΛΑΜΒΑΝΕΙ
- db.js: νέες οντότητες NutritionProfile + NutritionMeeting
- Clients: νέα απλή εγγραφή (επικοινωνία + πρόγραμμα + φορές/μήνα + τιμή, αυτόματο χρώμα & portal password)
- TrainingPlans: οι nutrition-only πελάτες ΔΕΝ εμφανίζονται εκεί
- Nutrition = Nutrition Center: πελάτες διατροφής -> φάκελος πελάτη (προφίλ, meeting, παραγγελίες, διατροφές)
- /course-planning: πλήρες wizard πρώτης φοράς (στόχος -> προφίλ/αποκλεισμοί -> γεύματα/συνήθειες -> αναμονή μέτρησης)

ΠΡΟΣΩΡΙΝΑ ΚΛΕΙΔΩΜΕΝΑ (επίτηδες)
- Κουμπί "Nutrition Meeting"  -> έρχεται στο Στάδιο 3 (fullscreen περιβάλλον τύπου Cube Offers)
- "Δημιουργία διατροφής" από παραγγελία -> Στάδιο 4 (AI)
- Ο κλασικός AI Wizard διατροφών ΠΑΡΑΜΕΝΕΙ διαθέσιμος μέσα στον φάκελο πελάτη.

ΥΠΕΝΘΥΜΙΣΗ: εκκρεμεί ακόμα το fix των widgets (fix-components.patch ή τα 3 αρχεία components).
Έλεγχος: wc -l src/components/MobileHome.jsx  ->  πρέπει 1051 (τώρα είναι 784).
