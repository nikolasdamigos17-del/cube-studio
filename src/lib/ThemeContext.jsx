import { createContext, useContext, useState, useEffect } from 'react';

export const THEMES = {
  sand: {
    name: 'Sand',
    family: 'light',
    emoji: '☀️',
    vars: {
      '--cp-bg': '#f5f0e8',
      '--cp-card-bg': '#fff9f0',
      '--cp-card-alt': '#ede8de',
      '--cp-border': '#e0d0b8',
      '--cp-text': '#2c2016',
      '--cp-text-dim': '#a09080',
      '--cp-text-mid': '#6b5c3e',
      '--cp-accent': '#6b5c3e',
      '--cp-accent-light': '#f0e8d8',
      '--cp-nav-bg': '#ede8de',
      '--cp-font': '"Playfair Display", "Georgia", serif',
      '--cp-font-body': '"Inter", -apple-system, sans-serif',
    }
  },
  obsidian: {
    name: 'Obsidian',
    family: 'dark',
    emoji: '🌙',
    vars: {
      '--cp-bg': '#0e0e0e',
      '--cp-card-bg': '#161616',
      '--cp-card-alt': '#111111',
      '--cp-border': '#2a2a2a',
      '--cp-text': '#f0ece4',
      '--cp-text-dim': '#6b5c3e',
      '--cp-text-mid': '#a08060',
      '--cp-accent': '#c9a96e',
      '--cp-accent-light': '#c9a96e18',
      '--cp-nav-bg': '#111111',
      '--cp-font': '"Playfair Display", "Georgia", serif',
      '--cp-font-body': '"Inter", -apple-system, sans-serif',
    }
  }
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeName, setThemeName] = useState(() => localStorage.getItem('cp_theme') || 'sand');
  const theme = THEMES[themeName] || THEMES.sand;

  useEffect(() => {
    const root = document.documentElement;
    Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
    document.body.style.backgroundColor = theme.vars['--cp-bg'];
  }, [themeName]);

  const toggleTheme = () => {
    const next = themeName === 'sand' ? 'obsidian' : 'sand';
    setThemeName(next);
    localStorage.setItem('cp_theme', next);
  };

  return (
    <ThemeContext.Provider value={{ themeName, toggleTheme, theme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
