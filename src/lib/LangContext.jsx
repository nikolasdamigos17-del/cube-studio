import { createContext, useContext, useState, useEffect } from 'react';
import { t, LANGS } from './i18n';

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('cube_lang') || 'en');

  const switchLang = (l) => { setLang(l); localStorage.setItem('cube_lang', l); };
  const toggle = () => switchLang(lang === 'en' ? 'el' : 'en');
  const tr = (key) => t(key, lang);

  return (
    <LangContext.Provider value={{ lang, switchLang, toggle, tr, LANGS }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => {
  const ctx = useContext(LangContext);
  if (!ctx) return { lang:'en', toggle:()=>{}, tr: k => t(k,'en'), LANGS };
  return ctx;
};
