import { BAR_IMG, SHAPE_IMG, SHEEN_IMG } from '../assets/barbellData';

// Reusable barbell nav frame. `accent` colors the plates; the bar stays metallic.
// Renders the tab children over the shaft area.
export default function BarbellNav({ accent, children, maxWidth = 430 }) {
  return (
    <div style={{ position:'relative', width:'100%', maxWidth, pointerEvents:'auto',
      aspectRatio:'3.73 / 1', filter:'drop-shadow(0 10px 22px rgba(0,0,0,0.42))' }}>

      {/* 1. Accent-colored plate fill (shape as mask) */}
      <div style={{ position:'absolute', inset:0, backgroundColor:accent,
        WebkitMaskImage:`url(${SHAPE_IMG})`, maskImage:`url(${SHAPE_IMG})`,
        WebkitMaskSize:'100% 100%', maskSize:'100% 100%',
        WebkitMaskRepeat:'no-repeat', maskRepeat:'no-repeat',
        WebkitMaskPosition:'center', maskPosition:'center', pointerEvents:'none' }}/>

      {/* 2. Metallic sheen/highlights over the color (screen = adds light) */}
      <img src={SHEEN_IMG} alt="" aria-hidden="true" style={{ position:'absolute', inset:0,
        width:'100%', height:'100%', objectFit:'fill', pointerEvents:'none', userSelect:'none',
        mixBlendMode:'screen', opacity:0.85 }}/>

      {/* 3. Inner shadow depth (the shape at low opacity, multiply, for rounded look) */}
      <div style={{ position:'absolute', inset:0,
        background:'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.35) 100%)',
        WebkitMaskImage:`url(${SHAPE_IMG})`, maskImage:`url(${SHAPE_IMG})`,
        WebkitMaskSize:'100% 100%', maskSize:'100% 100%',
        WebkitMaskRepeat:'no-repeat', maskRepeat:'no-repeat', pointerEvents:'none' }}/>

      {/* 4. The metal bar on top */}
      <img src={BAR_IMG} alt="" style={{ position:'absolute', inset:0,
        width:'100%', height:'100%', objectFit:'fill', pointerEvents:'none', userSelect:'none' }}/>

      {/* Tabs over the shaft (x 14.3% → 85.8%) */}
      <div style={{ position:'absolute', left:'14.3%', right:'14.2%', top:'24%', bottom:'26%',
        display:'flex', alignItems:'center' }}>
        {children}
      </div>
    </div>
  );
}
