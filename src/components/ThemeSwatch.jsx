import { BARS, MASTER_BAR } from '../assets/bars';

/* Accent colour per theme, reused from the barbell palette so the swatch,
   the bar plates and the active tab all agree. */
export const themeAccent = (name, isClient) => {
  const bar = isClient ? BARS[name] : BARS[MASTER_BAR[name] || 'carbon'];
  return bar?.accent || '#8a8a92';
};

/* A theme swatch: black face for dark themes, white face for light ones,
   with a single large circle in the theme's accent that reaches the edges. */
export default function ThemeSwatch({
  name, isClient = false, isDark, active, onClick, title, size = 40,
}) {
  const accent = themeAccent(name, isClient);
  const face = isDark ? '#0b0b0f' : '#f4f5f8';
  const edge = isDark ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.12)';
  return (
    <button onClick={onClick} title={title} aria-label={title} aria-pressed={!!active}
      style={{
        width:'100%', height:size, padding:0, borderRadius:11, cursor:'pointer',
        background:face,
        border: active ? `2px solid ${accent}` : `1px solid ${edge}`,
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow: active ? `0 0 0 3px ${accent}33` : 'none',
        transition:'box-shadow .15s, border-color .15s',
      }}>
      {/* the circle touches the inner edge of the swatch */}
      <span style={{
        display:'block', width:size - 10, height:size - 10, borderRadius:'50%',
        background:accent,
        boxShadow: isDark ? 'inset 0 -2px 6px rgba(0,0,0,.35)' : 'inset 0 -2px 6px rgba(0,0,0,.18)',
      }}/>
    </button>
  );
}
