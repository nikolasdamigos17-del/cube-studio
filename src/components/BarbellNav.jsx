import { useEffect, useRef } from 'react';
import { useTheme } from '../lib/ThemeContext';
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
// An opaque base fixed to the bottom of the screen that HOLDS the barbell.
// Page content stops above it (never scrolls behind), so nothing gets hidden.
// It measures itself and publishes --dock-h so layouts can pad their content.
export function BarbellDock({ children }) {
  const { isClient } = useTheme();
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const publish = () =>
      document.documentElement.style.setProperty('--dock-h', `${el.offsetHeight}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    window.addEventListener('orientationchange', publish);
    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', publish);
    };
  }, []);

  const bg     = isClient ? 'var(--cp-bg)'     : 'hsl(var(--background))';
  const border = isClient ? 'var(--cp-border)' : 'hsl(var(--border))';

  return (
    <div ref={ref} className="fixed left-0 right-0 bottom-0 z-[60]" style={{
      background: bg,
      borderTop: `1px solid ${border}`,
      boxShadow: '0 -8px 22px rgba(0,0,0,.26)',
      padding: '9px 12px calc(9px + env(safe-area-inset-bottom))',
      display: 'flex', justifyContent: 'center',
    }}>
      {children}
    </div>
  );
}
