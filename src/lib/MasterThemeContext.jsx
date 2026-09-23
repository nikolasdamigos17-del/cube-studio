import { createContext, useContext, useState, useEffect } from 'react';

export const MASTER_THEMES = {
  light: {
    name: 'Light', emoji: '⬜', description: 'Clean white',
    class: '', // default
  },
  dark: {
    name: 'Dark', emoji: '⬛', description: 'Deep dark',
    class: 'dark',
  },
  sand: {
    name: 'Sand', emoji: '🟤', description: 'Warm earth',
    class: 'theme-sand',
  },
  obsidian: {
    name: 'Obsidian', emoji: '🟡', description: 'Black & gold',
    class: 'theme-obsidian',
  },
};

const MasterThemeContext = createContext(null);

export function MasterThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('master_theme') || 'light');

  useEffect(() => {
    const root = document.documentElement;
    // Remove all theme classes
    root.classList.remove('dark', 'theme-sand', 'theme-obsidian');
    const cls = MASTER_THEMES[theme]?.class;
    if (cls) root.classList.add(cls);
    localStorage.setItem('master_theme', theme);
  }, [theme]);

  return (
    <MasterThemeContext.Provider value={{ theme, setTheme, themes: MASTER_THEMES }}>
      {children}
    </MasterThemeContext.Provider>
  );
}

export const useMasterTheme = () => useContext(MasterThemeContext);
