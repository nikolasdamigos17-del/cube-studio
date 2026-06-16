import { useEffect } from 'react';
import { useLang } from '../lib/LangContext';
import { DICT, PLACEHOLDERS, PATTERNS } from '../lib/elDict';

// Καθολικό DOM translation layer: μεταφράζει κάθε text node & placeholder
// που ταιριάζει στο λεξικό, σε ΟΛΗ την εφαρμογή, και ό,τι εμφανίζεται δυναμικά.
export default function TranslateLayer() {
  const { lang } = useLang();

  useEffect(() => {
    let applying = false;
    const originals = new Map();     // TextNode -> original english
    const phOriginals = new Map();   // Element -> original placeholder

    const translateText = (raw) => {
      const trimmed = raw.trim();
      if (!trimmed) return null;
      if (DICT[trimmed]) {
        const lead = raw.match(/^\s*/)[0], tail = raw.match(/\s*$/)[0];
        return lead + DICT[trimmed] + tail;
      }
      for (const [re, rep] of PATTERNS) {
        if (re.test(trimmed)) {
          const lead = raw.match(/^\s*/)[0], tail = raw.match(/\s*$/)[0];
          return lead + trimmed.replace(re, rep) + tail;
        }
      }
      return null;
    };

    const walk = (root) => {
      if (!root) return;
      applying = true;
      const tw = document.createTreeWalker(
        root.nodeType === Node.TEXT_NODE ? root.parentNode || document.body : root,
        NodeFilter.SHOW_TEXT
      );
      let n;
      while ((n = tw.nextNode())) {
        const out = translateText(n.nodeValue);
        if (out !== null && out !== n.nodeValue) {
          if (!originals.has(n)) originals.set(n, n.nodeValue);
          n.nodeValue = out;
        }
      }
      // Placeholders
      const host = root.nodeType === Node.ELEMENT_NODE ? root : document.body;
      host.querySelectorAll?.('input[placeholder], textarea[placeholder]').forEach(el => {
        const ph = el.getAttribute('placeholder');
        const out = PLACEHOLDERS[ph] || DICT[ph];
        if (out) {
          if (!phOriginals.has(el)) phOriginals.set(el, ph);
          el.setAttribute('placeholder', out);
        }
      });
      applying = false;
    };

    const restore = () => {
      applying = true;
      originals.forEach((orig, node) => { if (node.isConnected) node.nodeValue = orig; });
      originals.clear();
      phOriginals.forEach((ph, el) => { if (el.isConnected) el.setAttribute('placeholder', ph); });
      phOriginals.clear();
      applying = false;
    };

    let observer = null;
    if (lang === 'el') {
      walk(document.body);
      observer = new MutationObserver((muts) => {
        if (applying) return;
        for (const m of muts) {
          if (m.type === 'childList') m.addedNodes.forEach(node => walk(node));
          else if (m.type === 'characterData') {
            const out = translateText(m.target.nodeValue);
            if (out !== null && out !== m.target.nodeValue) {
              applying = true;
              if (!originals.has(m.target)) originals.set(m.target, m.target.nodeValue);
              m.target.nodeValue = out;
              applying = false;
            }
          }
        }
      });
      observer.observe(document.body, { childList:true, subtree:true, characterData:true });
    } else {
      restore();
    }
    return () => { observer?.disconnect(); };
  }, [lang]);

  return null;
}
