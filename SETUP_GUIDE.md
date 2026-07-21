# 🏋️ Fitness Studio Manager — Setup Guide
## Running the App Outside Base44

---

## 📁 WHERE TO PUT THE FILES

Put the entire `fitness-studio` folder anywhere on your computer.
Recommended locations:
- **Mac:** `Documents/fitness-studio/`
- **Windows:** `C:\Users\YourName\Documents\fitness-studio\`

---

## ⚡ FIRST TIME SETUP (do this once)

### Step 1 — Install Node.js
Download and install from: **https://nodejs.org**
Choose the **LTS version** (the green button).

### Step 2 — Open Terminal / Command Prompt
- **Mac:** Press `Cmd + Space`, type "Terminal", press Enter
- **Windows:** Press `Win + R`, type "cmd", press Enter

### Step 3 — Navigate to the app folder
Type this (replace the path with where you put the folder):
```
cd Documents/fitness-studio
```

### Step 4 — Install dependencies (first time only)
```
npm install
```
Wait for it to finish (takes 1-2 minutes).

---

## 🚀 STARTING THE APP (every time)

In the terminal, inside the `fitness-studio` folder:
```
npm run dev
```

Then open your browser and go to:
**http://localhost:5173**

To stop the app: press `Ctrl + C` in the terminal.

---

## 🔑 LOGIN CREDENTIALS

### Trainer (Master) Login:
- Email: `trainer@studio.com`
- Password: `studio2024`

### Demo Client Login (Alex Mitchell):
- Email: `alex.mitchell@email.com`  
- Password: `Alex2024!`

### Other Demo Clients:
- Maria Papadaki: `maria.papadaki@email.com` / `Maria2024!`
- Nikos Stavros: `nikos.stavros@email.com` / `Nikos2024!`

💡 **Tip:** Use the "Quick Login" buttons on the login page to skip typing!

---

## 🎨 CLIENT PORTAL THEMES

The client portal has **6 premium themes** in 2 families:

**Dark Themes:**
- 🌑 **Obsidian** — Deep black with electric blue
- 🌙 **Midnight** — Navy with gold (luxury feel)
- ⚡ **Carbon** — Industrial dark with neon green

**Light Themes:**
- 🤍 **Pearl** — Soft white with purple accents
- 🍂 **Ivory** — Warm ivory with amber gold
- 🧊 **Arctic** — Clean white with cyan blue

Clients can switch themes using the **palette button** (bottom-right corner of the client portal). Their preference is saved automatically.

---

## 💾 HOW DATA IS STORED (LOCAL MODE)

Right now the app stores everything in your **browser's localStorage**.
This means:
- ✅ Works instantly, no internet needed
- ✅ Data persists between page refreshes
- ⚠️ Data is saved in the browser — clearing browser data will reset it
- ⚠️ Different browsers = different data

**Demo data is automatically loaded** the first time you open the app.

When you're ready to publish, we'll connect it to Supabase (real database).

---

## 📁 FILE STRUCTURE (for reference)

```
fitness-studio/
├── src/
│   ├── pages/           ← Each page of the app
│   │   ├── LoginGate.jsx
│   │   ├── Home.jsx     ← Master dashboard
│   │   ├── Clients.jsx
│   │   ├── ClientHome.jsx   ← Client portal home (premium theme)
│   │   └── ...more pages
│   ├── components/
│   │   ├── client-portal/
│   │   │   ├── ClientLayout.jsx    ← Client sidebar + theme
│   │   │   ├── PremiumBackground.jsx ← Animated backgrounds
│   │   │   ├── PremiumStats.jsx    ← 3D charts + animated numbers
│   │   │   └── ThemeSwitcher.jsx   ← Theme selector panel
│   │   └── ...other components
│   ├── lib/
│   │   ├── db.js           ← Data storage (replace with Supabase later)
│   │   ├── AppContext.jsx   ← Login/session management
│   │   └── ThemeContext.jsx ← 6 premium themes definition
│   └── index.css           ← Global styles + theme variables
├── package.json
└── vite.config.js
```

---

## 🔧 MAKING CHANGES

After making any change to the code, the browser **auto-refreshes** automatically.
Just save the file and see the change instantly.

To change login credentials:
→ Open `src/lib/AppContext.jsx`
→ Change `MASTER_EMAIL` and `MASTER_PASSWORD`

To add a new theme:
→ Open `src/lib/ThemeContext.jsx`
→ Copy an existing theme and change the colors

To change demo client data:
→ Open `src/lib/db.js`
→ Find `seedDemoData()` and edit the demo clients

---

## ❓ COMMON ISSUES

**"npm not found"** → Node.js is not installed. Go back to Step 1.

**"Cannot find module"** → Run `npm install` again.

**Page shows "in progress"** → That page's full code will be added next.
The core structure, themes, and client portal are fully working.

**Data reset** → This happens if you cleared browser storage.
Just refresh — demo data loads automatically.
