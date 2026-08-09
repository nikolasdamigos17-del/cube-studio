import { createContext, useContext, useState, useEffect } from 'react';

// ── Helper to build a client theme entry ──────────────────────────────────────
const ct = (name, family, emoji, body, accent, accentRgb, border, text, textDim, navBg, cardBg, cardAlt) => ({
  name, family, emoji, body,
  vars: {
    '--cp-bg':           family==='dark' ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.38)',
    '--cp-card-bg':      cardBg,
    '--cp-card-alt':     cardAlt,
    '--cp-border':       border,
    '--cp-text':         text,
    '--cp-text-dim':     textDim,
    '--cp-text-mid':     textDim,
    '--cp-accent':       accent,
    '--cp-accent-light': `rgba(${accentRgb},0.14)`,
    '--cp-nav-bg':       navBg,
    '--cp-font':         '"Playfair Display","Georgia",serif',
    '--cp-font-body':    '"Inter",-apple-system,sans-serif',
  }
});

// ── ALL CLIENT THEMES ─────────────────────────────────────────────────────────
// Each colour has both a dark and light variant
export const CLIENT_THEMES = {

  // ── DARK themes ─────────────────────────────────────────────────────────────
  obsidian: ct(
    'Obsidian','dark','🟡','#070705',
    '#c9a96e','201,169,110',
    'rgba(201,169,110,0.28)','#f0ece4','#8d7b58',
    'rgba(10,9,7,0.90)','rgba(24,22,18,0.76)','rgba(17,16,13,0.66)'
  ),
  night: ct(
    'Night','dark','⬛','#050508',
    '#818cf8','129,140,248',
    'rgba(129,140,248,0.24)','#e8eaf6','#6b7280',
    'rgba(5,5,10,0.92)','rgba(15,15,28,0.76)','rgba(10,10,20,0.66)'
  ),
  ocean: ct(
    'Ocean','dark','🌊','#020812',
    '#4f8ef7','79,142,247',
    'rgba(79,142,247,0.28)','#e8f0ff','#5a7eb0',
    'rgba(3,10,20,0.92)','rgba(12,26,46,0.76)','rgba(9,20,36,0.66)'
  ),
  forest: ct(
    'Forest','dark','🌿','#050d04',
    '#5cb85c','92,184,92',
    'rgba(92,184,92,0.26)','#e2f0de','#5e8852',
    'rgba(7,15,5,0.92)','rgba(18,30,15,0.76)','rgba(13,24,11,0.66)'
  ),
  carbon: ct(
    'Carbon','dark','🖤','#060606',
    '#e0e0e0','224,224,224',
    'rgba(224,224,224,0.18)','#efefef','#888888',
    'rgba(8,8,8,0.93)','rgba(22,22,22,0.76)','rgba(16,16,16,0.66)'
  ),
  crimson: ct(
    'Crimson','dark','🔴','#0c0404',
    '#e05050','224,80,80',
    'rgba(224,80,80,0.26)','#fce8e8','#b06060',
    'rgba(12,4,4,0.92)','rgba(30,12,12,0.76)','rgba(22,8,8,0.66)'
  ),
  aurora: ct(
    'Aurora','dark','🌌','#040812',
    '#a855f7','168,85,247',
    'rgba(168,85,247,0.26)','#f0e8ff','#7c5ca8',
    'rgba(4,6,14,0.92)','rgba(16,12,30,0.76)','rgba(12,8,22,0.66)'
  ),
  copper: ct(
    'Copper','dark','🟠','#0a0603',
    '#e07840','224,120,64',
    'rgba(224,120,64,0.26)','#faeee6','#a07050',
    'rgba(10,6,3,0.92)','rgba(28,18,8,0.76)','rgba(20,13,6,0.66)'
  ),

  // ── LIGHT themes ─────────────────────────────────────────────────────────────
  sand: ct(
    'Sand','light','☀️','#e9e0cf',
    '#8a6d3b','138,109,59',
    'rgba(176,148,96,0.32)','#2c2016','#8a7a62',
    'rgba(240,233,220,0.90)','rgba(255,250,242,0.82)','rgba(237,232,222,0.72)'
  ),
  arctic: ct(
    'Arctic','light','🩵','#dbe8fa',
    '#2563eb','37,99,235',
    'rgba(37,99,235,0.24)','#0f1e38','#6088ba',
    'rgba(228,238,252,0.90)','rgba(255,255,255,0.84)','rgba(228,238,252,0.72)'
  ),
  mint: ct(
    'Mint','light','🍃','#dcf2e6',
    '#059669','5,150,105',
    'rgba(5,150,105,0.24)','#0e2418','#549a74',
    'rgba(228,245,236,0.90)','rgba(255,255,255,0.84)','rgba(228,245,236,0.72)'
  ),
  rose: ct(
    'Rose','light','🌸','#f3dfe3',
    '#c94060','201,64,96',
    'rgba(201,64,96,0.24)','#2a1015','#a8697b',
    'rgba(248,236,238,0.90)','rgba(255,250,250,0.84)','rgba(248,236,238,0.72)'
  ),
  ivory: ct(
    'Ivory','light','🤍','#f2ede4',
    '#6b5c3e','107,92,62',
    'rgba(107,92,62,0.24)','#1c1510','#8a7a66',
    'rgba(242,236,224,0.90)','rgba(255,252,246,0.84)','rgba(242,236,226,0.72)'
  ),
  lavender: ct(
    'Lavender','light','💜','#ece8f5',
    '#7c3aed','124,58,237',
    'rgba(124,58,237,0.22)','#1e1030','#8060c0',
    'rgba(236,232,245,0.90)','rgba(255,255,255,0.84)','rgba(236,232,245,0.72)'
  ),
  blush: ct(
    'Blush','light','🩷','#fae8ee',
    '#e05080','224,80,128',
    'rgba(224,80,128,0.22)','#2a0c18','#c06080',
    'rgba(250,236,240,0.90)','rgba(255,248,252,0.84)','rgba(250,236,240,0.72)'
  ),
  sky: ct(
    'Sky','light','🌤️','#e0f0fa',
    '#0284c7','2,132,199',
    'rgba(2,132,199,0.24)','#0c2030','#4a90c0',
    'rgba(224,242,250,0.90)','rgba(255,255,255,0.84)','rgba(224,242,250,0.72)'
  ),
};

// ── MASTER THEMES (trainer app) ───────────────────────────────────────────────
export const MASTER_THEMES = {
  // Dark
  dark:     { name:'Dark',     emoji:'⬛', dark:true,  group:'dark'  },
  obsidian: { name:'Obsidian', emoji:'🟡', dark:true,  group:'dark'  },
  ocean:    { name:'Ocean',    emoji:'🌊', dark:true,  group:'dark'  },
  forest:   { name:'Forest',   emoji:'🌿', dark:true,  group:'dark'  },
  slate:    { name:'Slate',    emoji:'🩶', dark:true,  group:'dark'  },
  aurora:   { name:'Aurora',   emoji:'🌌', dark:true,  group:'dark'  },
  crimson:  { name:'Crimson',  emoji:'🔴', dark:true,  group:'dark'  },
  copper:   { name:'Copper',   emoji:'🟠', dark:true,  group:'dark'  },
  // Light
  light:    { name:'Light',    emoji:'⚪', dark:false, group:'light' },
  sand:     { name:'Sand',     emoji:'☀️', dark:false, group:'light' },
  rose:     { name:'Rose',     emoji:'🌸', dark:false, group:'light' },
  arctic:   { name:'Arctic',   emoji:'🩵', dark:false, group:'light' },
  mint:     { name:'Mint',     emoji:'🍃', dark:false, group:'light' },
  ivory:    { name:'Ivory',    emoji:'🤍', dark:false, group:'light' },
  lavender: { name:'Lavender', emoji:'💜', dark:false, group:'light' },
  sky:      { name:'Sky',      emoji:'🌤️', dark:false, group:'light' },
};

export const MASTER_BODY = {
  light:'#dfe3ea',  dark:'#05060c',   sand:'#e7ddc8',   obsidian:'#070604',
  ocean:'#020812',  forest:'#040b04', rose:'#f2dde2',   slate:'#070a10',
  aurora:'#06040e', crimson:'#0c0404',copper:'#0a0603', arctic:'#dbe8fa',
  mint:'#dcf2e6',   ivory:'#f2ede4',  lavender:'#ece8f5',sky:'#e0f0fa',
};

function applyMasterTheme(name) {
  const t = MASTER_THEMES[name] || MASTER_THEMES.dark;
  const cl = document.documentElement.classList;
  cl.remove('dark','theme-sand','theme-obsidian','theme-ocean','theme-forest',
    'theme-rose','theme-slate','theme-aurora','theme-crimson','theme-copper',
    'theme-arctic','theme-mint','theme-ivory','theme-lavender','theme-sky');
  if (t.dark) cl.add('dark');
  if (name !== 'light' && name !== 'dark') cl.add(`theme-${name}`);
  document.body.style.backgroundColor = MASTER_BODY[name] || '#05060c';
}

// Opaque page colour for the active theme (the translucent --cp-bg / bg-background
// variables deliberately let the cube show through, so they can't be used for
// surfaces that must hide what's behind them).
export const bodyColor = (name, isClient) =>
  isClient ? (CLIENT_THEMES[name]?.body || '#070705')
           : (MASTER_BODY[name] || '#05060c');

const ThemeContext = createContext(null);

export function ThemeProvider({ children, isClient = false }) {
  const storageKey = isClient ? 'cp_theme' : 'master_theme';
  const defaultTheme = isClient ? 'obsidian' : 'dark';
  const [themeName, setThemeName] = useState(() => localStorage.getItem(storageKey) || defaultTheme);

  useEffect(() => {
    if (isClient) {
      const theme = CLIENT_THEMES[themeName] || CLIENT_THEMES.obsidian;
      const root = document.documentElement;
      Object.entries(theme.vars).forEach(([k,v]) => root.style.setProperty(k, v));
      document.body.style.backgroundColor = theme.body;
      root.classList.remove('dark');
      if (theme.family === 'dark') root.classList.add('dark');
      root.dataset.cubeTheme = 'cp_' + themeName;
    } else {
      applyMasterTheme(themeName);
      document.documentElement.dataset.cubeTheme = themeName;
    }
    localStorage.setItem(storageKey, themeName);
  }, [themeName, isClient]);

  const switchTheme = (name) => setThemeName(name);

  return (
    <ThemeContext.Provider value={{ themeName, switchTheme, isClient, themes: isClient ? CLIENT_THEMES : MASTER_THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) return { themeName:'dark', switchTheme:()=>{}, isClient:false, themes:MASTER_THEMES };
  return ctx;
};
