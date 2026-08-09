import { useState, useEffect } from 'react';

// Reads the resolved --primary (master) or --cp-accent (client) CSS variable
// as a real color string, and updates whenever the theme changes.
// For "plain" dark/light themes the primary is near-black/near-white and would
// make the plates look washed-out, so we fall back to a neutral gunmetal there.
function parseHslTriple(str) {
  // "H S% L%" → {h,s,l} or null
  const m = str.trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!m) return null;
  return { h:+m[1], s:+m[2], l:+m[3] };
}

export function useAccent(isClient = false) {
  const read = () => {
    if (typeof window === 'undefined') return '#4a4a52';
    const cs = getComputedStyle(document.documentElement);
    if (isClient) {
      const v = cs.getPropertyValue('--cp-accent').trim();
      if (v) return v;
    }
    const p = cs.getPropertyValue('--primary').trim(); // "H S% L%"
    const hsl = parseHslTriple(p);
    if (hsl) {
      // Muted (low saturation) OR extreme lightness → the theme has no vivid
      // accent (plain Dark/Light). Use gunmetal so plates read as real weights.
      if (hsl.s < 25 || hsl.l > 82 || hsl.l < 14) return '#3d3d44';
      return `hsl(${p})`;
    }
    return '#3d3d44';
  };

  const [accent, setAccent] = useState(read);

  useEffect(() => {
    const update = () => setAccent(read());
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes:true, attributeFilter:['class','data-cube-theme','style'] });
    return () => obs.disconnect();
  }, [isClient]);

  return accent;
}
