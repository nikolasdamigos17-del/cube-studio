import { useEffect, useRef, useState } from 'react';
import { useTheme, bodyColor } from '../lib/ThemeContext';
import { barFor } from '../assets/bars';

// Floating barbell nav frame. Picks the pre-rendered bar that matches the
// active theme and positions the tab children over its shaft.
// Children receive nothing — they are laid out in a flex row by this wrapper.
export default function BarbellNav({ children, maxWidth = 430 }) {
  const { themeName, isClient } = useTheme();
  const bar = barFor(themeName, isClient);

  const shaftH = bar.sy1 - bar.sy0;
  const inset  = (bar.sx1 - bar.sx0) * 0.025;

  return (
    <div style={{
      position:'relative', width:'100%', maxWidth, pointerEvents:'auto',
      aspectRatio:`${bar.ar} / 1`,
      filter:'drop-shadow(0 4px 10px rgba(0,0,0,0.3))',
    }}>
      <img src={bar.img} alt="" style={{
        position:'absolute', inset:0, width:'100%', height:'100%',
        objectFit:'fill', pointerEvents:'none', userSelect:'none',
      }}/>
      <div style={{
        position:'absolute',
        left:  `${(bar.sx0 + inset) * 100}%`,
        right: `${(1 - bar.sx1 + inset) * 100}%`,
        top:   `${(bar.sy0 + shaftH * 0.07) * 100}%`,
        bottom:`${(1 - bar.sy1 + shaftH * 0.10) * 100}%`,
        display:'flex', alignItems:'center',
      }}>
        {children}
      </div>
    </div>
  );
}

// Colour helpers so the tabs always match the plates of the active bar.
export function useBarColors() {
  const { themeName, isClient } = useTheme();
  const bar = barFor(themeName, isClient);
  return { accent: bar.accent, tab: bar.tab, idle: '#3a3a42', idleLabel: '#4a4a52' };
}

// ── Bezel dock ────────────────────────────────────────────────────────────
// A solid base fixed to the bottom of the screen that HOLDS the barbell.
// Its top edge follows the barbell's own silhouette: raised around the plates,
// dipping down along the metal shaft. Filled with the theme's opaque page
// colour so nothing shows through it. Publishes --dock-h for the layouts.
export function BarbellDock({ children, maxWidth = 430, sidePad = 12 }) {
  const { themeName, isClient } = useTheme();
  const bar = barFor(themeName, isClient);
  const ref = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      setBox({ w: el.offsetWidth, h: el.offsetHeight });
      document.documentElement.style.setProperty('--dock-h', `${el.offsetHeight}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('orientationchange', measure);
    return () => { ro.disconnect(); window.removeEventListener('orientationchange', measure); };
  }, []);

  const fill   = bodyColor(themeName, isClient);
  const stroke = isClient ? 'var(--cp-border)' : 'hsl(var(--border))';
  const PAD_TOP = 7;

  // silhouette: high over the plates, low over the shaft
  const { w: W, h: H } = box;
  let d = '', edge = '';
  if (W > 0 && H > 0) {
    const BW = Math.min(W - sidePad * 2, maxWidth);
    const BL = (W - BW) / 2;
    const barH = BW / bar.ar;
    const yHigh = 0;
    const yLow  = Math.max(yHigh + 6, PAD_TOP + bar.sy0 * barH - 3);
    const xL = BL + bar.sx0 * BW;
    const xR = BL + bar.sx1 * BW;
    const r  = Math.min(14, (xR - xL) / 4);
    edge = `M0 ${yHigh} L${xL - r} ${yHigh}`
         + ` C${xL} ${yHigh} ${xL} ${yLow} ${xL + r} ${yLow}`
         + ` L${xR - r} ${yLow}`
         + ` C${xR} ${yLow} ${xR} ${yHigh} ${xR + r} ${yHigh}`
         + ` L${W} ${yHigh}`;
    d = `${edge} L${W} ${H} L0 ${H} Z`;
  }

  return (
    <div ref={ref} className="fixed left-0 right-0 bottom-0 z-[60]" style={{
      padding: `${PAD_TOP}px ${sidePad}px calc(9px + env(safe-area-inset-bottom))`,
      display: 'flex', justifyContent: 'center',
      filter: 'drop-shadow(0 -6px 16px rgba(0,0,0,.28))',
    }}>
      {d && (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true"
          style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
          <path d={d} fill={fill}/>
          <path d={edge} fill="none" stroke={stroke} strokeWidth="1"/>
        </svg>
      )}
      <div style={{ position:'relative', width:'100%', maxWidth, display:'flex', justifyContent:'center' }}>
        {children}
      </div>
    </div>
  );
}
