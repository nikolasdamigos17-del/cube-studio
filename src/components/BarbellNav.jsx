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
      filter:'drop-shadow(0 9px 20px rgba(0,0,0,0.45))',
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
