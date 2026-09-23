import { useEffect } from 'react';
import { useLang } from '../lib/LangContext';
import { DICT, PLACEHOLDERS, PATTERNS } from '../lib/elDict';

// Καθολικό DOM translation layer — βελτιστοποιημένο για performance:
// debounced mutation handling, no observation of canvas/svg subtrees.
export default function TranslateLayer() {
  const { lang } = useLang();

  useEffect(() => {
    if (lang !== 'el') return; // nothing to do in English — avoid any observer overhead

    let applying = false;
    let pending = new Set();
    let rafId = null;
    const originals = new Map();
    const phOriginals = new Map();

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
      if (!root || root.nodeType === Node.COMMENT_NODE) return;
      // Skip canvas/svg subtrees entirely — they never contain translatable text
      // and walking them on every animation frame update is the main perf cost.
      if (root.nodeType === Node.ELEMENT_NODE &&
          (root.tagName === 'CANVAS' || root.tagName === 'SVG' || root.tagName === 'SCRIPT' || root.tagName === 'STYLE')) {
        return;
      }
      const tw = document.createTreeWalker(
        root.nodeType === Node.TEXT_NODE ? (root.parentNode || document.body) : root,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            const p = node.parentElement;
            if (p && (p.tagName === 'CANVAS' || p.tagName === 'SVG' || p.tagName === 'SCRIPT' || p.tagName === 'STYLE')) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );
      let n;
      while ((n = tw.nextNode())) {
        const out = translateText(n.nodeValue);
        if (out !== null && out !== n.nodeValue) {
          if (!originals.has(n)) originals.set(n, n.nodeValue);
          n.nodeValue = out;
        }
      }
      const host = root.nodeType === Node.ELEMENT_NODE ? root : document.body;
      host.querySelectorAll?.('input[placeholder], textarea[placeholder]').forEach(el => {
        const ph = el.getAttribute('placeholder');
        const out = PLACEHOLDERS[ph] || DICT[ph];
        if (out) {
          if (!phOriginals.has(el)) phOriginals.set(el, ph);
          el.setAttribute('placeholder', out);
        }
      });
    };

    const restore = () => {
      originals.forEach((orig, node) => { if (node.isConnected) node.nodeValue = orig; });
      originals.clear();
      phOriginals.forEach((ph, el) => { if (el.isConnected) el.setAttribute('placeholder', ph); });
      phOriginals.clear();
    };

    // Process queued mutations once per animation frame instead of synchronously
    // on every single DOM change — this is what prevents the cube's per-frame
    // canvas updates (which can briefly touch the DOM via React state) from
    // triggering full tree walks dozens of times a second.
    const flush = () => {
      rafId = null;
      if (applying) return;
      applying = true;
      pending.forEach(node => walk(node));
      pending.clear();
      applying = false;
    };

    const observer = new MutationObserver((muts) => {
      if (applying) return;
      for (const m of muts) {
        if (m.type === 'childList') {
          m.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
              pending.add(node);
            }
          });
        } else if (m.type === 'characterData') {
          const out = translateText(m.target.nodeValue);
          if (out !== null && out !== m.target.nodeValue) {
            applying = true;
            if (!originals.has(m.target)) originals.set(m.target, m.target.nodeValue);
            m.target.nodeValue = out;
            applying = false;
          }
        }
      }
      if (pending.size && !rafId) {
        // Prefer idle time so translation never steals frames from the cube
        // or the page fade during route changes; rAF only as a fallback.
        if ('requestIdleCallback' in window) {
          rafId = requestIdleCallback(flush, { timeout: 300 });
        } else {
          rafId = requestAnimationFrame(flush);
        }
      }
    });

    walk(document.body);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
      if (rafId) {
        if ('cancelIdleCallback' in window) cancelIdleCallback(rafId);
        cancelAnimationFrame(rafId);
      }
      restore();
    };
  }, [lang]);

  return null;
}
