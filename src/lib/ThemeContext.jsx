import { createContext, useContext, useState, useEffect } from 'react';

// ── Master app themes ──────────────────────────────────────────────────────────
export const MASTER_THEMES = {
  light:    { name:'Light',    emoji:'⚪', dark:false },
  dark:     { name:'Dark',     emoji:'⬛', dark:true  },
  sand:     { name:'Sand',     emoji:'🟤', dark:false },
  obsidian: { name:'Obsidian', emoji:'🟡', dark:true  },
  ocean:    { name:'Ocean',    emoji:'🔵', dark:true  },
  forest:   { name:'Forest',   emoji:'🌿', dark:true  },
  rose:     { name:'Rose',     emoji:'🌸', dark:false },
  slate:    { name:'Slate',    emoji:'🩶', dark:true  },
};

// ── Client portal themes — TEST: semi-transparent so the cube shows through ───
// `body` = solid base colour painted behind the cube canvas
export const CLIENT_THEMES = {
  sand: {
    name:'Sand', family:'light', emoji:'☀️', body:'#e9e0cf',
    vars: { '--cp-bg':'rgba(245,240,232,0.42)','--cp-card-bg':'rgba(255,250,242,0.80)','--cp-card-alt':'rgba(237,232,222,0.72)','--cp-border':'rgba(176,148,96,0.35)','--cp-text':'#2c2016','--cp-text-dim':'#8a7a62','--cp-text-mid':'#6b5c3e','--cp-accent':'#8a6d3b','--cp-accent-light':'rgba(201,169,110,0.18)','--cp-nav-bg':'rgba(240,233,220,0.88)','--cp-font':'"Playfair Display","Georgia",serif','--cp-font-body':'"Inter",-apple-system,sans-serif' }
  },
  obsidian: {
    name:'Obsidian', family:'dark', emoji:'🌙', body:'#070705',
    vars: { '--cp-bg':'rgba(14,14,12,0.40)','--cp-card-bg':'rgba(24,22,18,0.74)','--cp-card-alt':'rgba(17,16,13,0.66)','--cp-border':'rgba(201,169,110,0.28)','--cp-text':'#f0ece4','--cp-text-dim':'#8d7b58','--cp-text-mid':'#a08060','--cp-accent':'#c9a96e','--cp-accent-light':'rgba(201,169,110,0.14)','--cp-nav-bg':'rgba(10,9,7,0.90)','--cp-font':'"Playfair Display","Georgia",serif','--cp-font-body':'"Inter",-apple-system,sans-serif' }
  },
  ocean: {
    name:'Ocean', family:'dark', emoji:'🌊', body:'#020812',
    vars: { '--cp-bg':'rgba(4,13,26,0.40)','--cp-card-bg':'rgba(12,26,46,0.74)','--cp-card-alt':'rgba(9,20,36,0.66)','--cp-border':'rgba(79,142,247,0.30)','--cp-text':'#e8f0ff','--cp-text-dim':'#5a7eb0','--cp-text-mid':'#7ca0d4','--cp-accent':'#4f8ef7','--cp-accent-light':'rgba(79,142,247,0.15)','--cp-nav-bg':'rgba(3,10,20,0.90)','--cp-font':'"Playfair Display","Georgia",serif','--cp-font-body':'"Inter",-apple-system,sans-serif' }
  },
  forest: {
    name:'Forest', family:'dark', emoji:'🌿', body:'#050d04',
    vars: { '--cp-bg':'rgba(10,20,8,0.40)','--cp-card-bg':'rgba(18,30,15,0.74)','--cp-card-alt':'rgba(13,24,11,0.66)','--cp-border':'rgba(92,184,92,0.28)','--cp-text':'#e2f0de','--cp-text-dim':'#5e8852','--cp-text-mid':'#78a86c','--cp-accent':'#5cb85c','--cp-accent-light':'rgba(92,184,92,0.15)','--cp-nav-bg':'rgba(7,15,5,0.90)','--cp-font':'"Playfair Display","Georgia",serif','--cp-font-body':'"Inter",-apple-system,sans-serif' }
  },
  rose: {
    name:'Rose', family:'light', emoji:'🌸', body:'#f3dfe3',
    vars: { '--cp-bg':'rgba(253,244,245,0.42)','--cp-card-bg':'rgba(255,250,250,0.82)','--cp-card-alt':'rgba(248,236,238,0.72)','--cp-border':'rgba(201,64,96,0.28)','--cp-text':'#2a1015','--cp-text-dim':'#a8697b','--cp-text-mid':'#8b4555','--cp-accent':'#c94060','--cp-accent-light':'rgba(201,64,96,0.12)','--cp-nav-bg':'rgba(248,236,238,0.90)','--cp-font':'"Playfair Display","Georgia",serif','--cp-font-body':'"Inter",-apple-system,sans-serif' }
  },
  arctic: {
    name:'Arctic', family:'light', emoji:'🩵', body:'#dbe8fa',
    vars: { '--cp-bg':'rgba(240,246,255,0.42)','--cp-card-bg':'rgba(255,255,255,0.84)','--cp-card-alt':'rgba(228,238,252,0.72)','--cp-border':'rgba(37,99,235,0.26)','--cp-text':'#0f1e38','--cp-text-dim':'#6088ba','--cp-text-mid':'#3a6fa8','--cp-accent':'#2563eb','--cp-accent-light':'rgba(37,99,235,0.12)','--cp-nav-bg':'rgba(228,238,252,0.90)','--cp-font':'"Playfair Display","Georgia",serif','--cp-font-body':'"Inter",-apple-system,sans-serif' }
  },
  carbon: {
    name:'Carbon', family:'dark', emoji:'🖤', body:'#060606',
    vars: { '--cp-bg':'rgba(12,12,12,0.40)','--cp-card-bg':'rgba(22,22,22,0.74)','--cp-card-alt':'rgba(16,16,16,0.66)','--cp-border':'rgba(232,232,232,0.20)','--cp-text':'#e8e8e8','--cp-text-dim':'#787878','--cp-text-mid':'#999999','--cp-accent':'#e8e8e8','--cp-accent-light':'rgba(232,232,232,0.12)','--cp-nav-bg':'rgba(8,8,8,0.90)','--cp-font':'"Playfair Display","Georgia",serif','--cp-font-body':'"Inter",-apple-system,sans-serif' }
  },
  mint: {
    name:'Mint', family:'light', emoji:'🍃', body:'#dcf2e6',
    vars: { '--cp-bg':'rgba(240,250,245,0.42)','--cp-card-bg':'rgba(255,255,255,0.84)','--cp-card-alt':'rgba(228,245,236,0.72)','--cp-border':'rgba(5,150,105,0.26)','--cp-text':'#0e2418','--cp-text-dim':'#549a74','--cp-text-mid':'#2d7050','--cp-accent':'#059669','--cp-accent-light':'rgba(5,150,105,0.12)','--cp-nav-bg':'rgba(228,245,236,0.90)','--cp-font':'"Playfair Display","Georgia",serif','--cp-font-body':'"Inter",-apple-system,sans-serif' }
  },
};

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
      root.classList.remove('dark','theme-sand','theme-obsidian','theme-ocean','theme-forest','theme-rose','theme-slate');
      if (theme.family === 'dark') root.classList.add('dark');
      // Signal the cube which palette to use
      root.dataset.cubeTheme = 'cp_' + themeName;
    } else {
      applyMasterTheme(themeName);
      document.documentElement.dataset.cubeTheme = themeName;
    }
    localStorage.setItem(storageKey, themeName);
  }, [themeName, isClient]);

  const switchTheme = (name) => setThemeName(name);
  const toggleTheme = () => {
    const keys = Object.keys(isClient ? CLIENT_THEMES : MASTER_THEMES);
    setThemeName(n => keys[(keys.indexOf(n)+1) % keys.length]);
  };

  return (
    <ThemeContext.Provider value={{ themeName, switchTheme, toggleTheme, isClient, themes: isClient ? CLIENT_THEMES : MASTER_THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

const MASTER_BODY = {
  light:'#dfe3ea', dark:'#05060c', sand:'#e7ddc8', obsidian:'#070604',
  ocean:'#020812', forest:'#040b04', rose:'#f2dde2', slate:'#070a10',
};

function applyMasterTheme(name) {
  const t = MASTER_THEMES[name] || MASTER_THEMES.light;
  const cl = document.documentElement.classList;
  cl.remove('dark','theme-sand','theme-obsidian','theme-ocean','theme-forest','theme-rose','theme-slate');
  if (t.dark) cl.add('dark');
  if (name !== 'light' && name !== 'dark') cl.add(`theme-${name}`);
  document.body.style.backgroundColor = MASTER_BODY[name] || '#05060c';
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) return { themeName:'dark', switchTheme:()=>{}, toggleTheme:()=>{}, isClient:false, themes:MASTER_THEMES };
  return ctx;
};
