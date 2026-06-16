import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// ── Page → camera angle ───────────────────────────────────────────────────────
const PAGE_ANGLES = {
  '/':                  { rotX:  24, rotY:  35 },
  '/CalendarPage':      { rotX:  15, rotY:  98 },
  '/Clients':           { rotX:  32, rotY: 160 },
  '/TrainingPlans':     { rotX:  19, rotY: 222 },
  '/Nutrition':         { rotX:  28, rotY: 285 },
  '/Statistics':        { rotX:  13, rotY: 345 },
  '/Logistics':         { rotX:  30, rotY:  62 },
  '/HevySync':          { rotX:  17, rotY: 188 },
  '/Messages':          { rotX:  26, rotY: 250 },
  '/client-home':       { rotX:  24, rotY:  35 },
  '/client-training':   { rotX:  16, rotY: 105 },
  '/client-nutrition':  { rotX:  30, rotY: 170 },
  '/client-stats':      { rotX:  15, rotY: 232 },
  '/client-financial':  { rotX:  28, rotY: 295 },
  '/client-messages':   { rotX:  19, rotY: 350 },
};

// ── Theme palettes  [r,g,b] ───────────────────────────────────────────────────
// line: bracket/edge lines · glow: light escaping · panelHi/panelLo: metallic faces · particle
const PALETTES = {
  // master
  light:       { line:[105,115,135], glow:[140,155,190], panelHi:[175,185,205], panelLo:[90,100,120],  particle:[120,140,180], lightBg:true  },
  dark:        { line:[150,160,200], glow:[129,140,248], panelHi:[120,128,185], panelLo:[28,30,52],    particle:[165,180,252], lightBg:false },
  sand:        { line:[150,120,70],  glow:[225,190,120], panelHi:[190,160,105], panelLo:[70,56,32],    particle:[222,190,130], lightBg:true  },
  obsidian:    { line:[185,155,95],  glow:[201,169,110], panelHi:[170,142,88],  panelLo:[38,32,20],    particle:[235,200,130], lightBg:false },
  ocean:       { line:[95,150,235],  glow:[96,165,250],  panelHi:[80,130,210],  panelLo:[12,28,58],    particle:[125,211,252], lightBg:false },
  forest:      { line:[95,180,105],  glow:[74,222,128],  panelHi:[78,160,90],   panelLo:[14,38,18],    particle:[134,239,172], lightBg:false },
  rose:        { line:[175,65,95],   glow:[225,100,130], panelHi:[200,95,120],  panelLo:[70,24,36],    particle:[230,120,150], lightBg:true  },
  slate:       { line:[125,158,201], glow:[147,197,253], panelHi:[110,145,190], panelLo:[22,32,48],    particle:[170,205,250], lightBg:false },
  // client portal
  cp_sand:     { line:[145,115,65],  glow:[215,180,115], panelHi:[185,155,100], panelLo:[68,54,30],    particle:[215,182,124], lightBg:true  },
  cp_obsidian: { line:[185,155,95],  glow:[201,169,110], panelHi:[170,142,88],  panelLo:[38,32,20],    particle:[235,200,130], lightBg:false },
  cp_ocean:    { line:[90,148,240],  glow:[96,165,250],  panelHi:[78,128,212],  panelLo:[10,26,56],    particle:[125,211,252], lightBg:false },
  cp_forest:   { line:[95,180,105],  glow:[92,196,116],  panelHi:[78,160,90],   panelLo:[14,38,18],    particle:[134,239,172], lightBg:false },
  cp_rose:     { line:[170,60,90],   glow:[215,95,125],  panelHi:[195,90,115],  panelLo:[66,22,34],    particle:[225,115,145], lightBg:true  },
  cp_arctic:   { line:[55,105,210],  glow:[80,130,235],  panelHi:[95,140,225],  panelLo:[18,38,80],    particle:[110,160,240], lightBg:true  },
  cp_carbon:   { line:[185,185,190], glow:[225,225,230], panelHi:[160,160,168], panelLo:[35,35,38],    particle:[210,210,215], lightBg:false },
  cp_mint:     { line:[20,135,95],   glow:[35,165,120],  panelHi:[60,170,130],  panelLo:[10,52,36],    particle:[80,200,155],  lightBg:true  },
};

const easeInOutCubic = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
const lerp = (a,b,t) => a + (b-a)*t;
const lerpAngle = (a,b,t) => { const d = ((b-a+540)%360)-180; return a + d*t; };
const rgba = ([r,g,b], a) => `rgba(${r},${g},${b},${Math.max(0,Math.min(1,a))})`;

// ── Cube geometry: 6 faces (corner indices into the ±1 vertex array) ─────────
const VERTS = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
const FACES = [
  { vi:[4,5,6,7], n:[ 0, 0, 1] }, // front
  { vi:[1,0,3,2], n:[ 0, 0,-1] }, // back
  { vi:[5,1,2,6], n:[ 1, 0, 0] }, // right
  { vi:[0,4,7,3], n:[-1, 0, 0] }, // left
  { vi:[0,1,5,4], n:[ 0,-1, 0] }, // top (y is down on canvas)
  { vi:[3,7,6,2], n:[ 0, 1, 0] }, // bottom
];
const EDGES = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];

export default function CubeBackground() {
  const canvasRef = useRef(null);
  const loc = useLocation();
  const S = useRef({
    rotX:24, rotY:35, fromX:24, fromY:35, targetX:24, targetY:35,
    rays:[],
    animating:false, animT:0, animDur:1700,
    particles:[], pal: PALETTES.dark,
  });
  const rafRef = useRef(null);
  const prevPath = useRef(loc.pathname);

  // ── Read theme from data attribute set by ThemeContext ──────────────────────
  useEffect(() => {
    const read = () => {
      const key = document.documentElement.dataset.cubeTheme || 'dark';
      S.current.pal = PALETTES[key] || PALETTES.dark;
    };
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes:true, attributeFilter:['data-cube-theme'] });
    read();
    return () => obs.disconnect();
  }, []);

  // ── Spin on route change ─────────────────────────────────────────────────────
  useEffect(() => {
    if (loc.pathname === prevPath.current) return;
    prevPath.current = loc.pathname;
    const s = S.current;
    const t = PAGE_ANGLES[loc.pathname] || { rotX: 15 + Math.random()*18, rotY: s.rotY + 95 + Math.random()*40 };
    s.fromX = s.rotX; s.fromY = s.rotY;
    s.targetX = t.rotX; s.targetY = t.rotY;
    s.animDur = 1700;
    s.animating = true; s.animT = 0;
    for (let i = 0; i < 26; i++) {
      s.particles.push({
        x:(Math.random()-0.5)*1.4, y:(Math.random()-0.5)*1.4, z:(Math.random()-0.5)*1.4,
        vx:(Math.random()-0.5)*2.4, vy:(Math.random()-0.5)*2.4,
        life:0.9+Math.random()*0.4, decay:0.013+Math.random()*0.012,
        size:1.4+Math.random()*2.2, type:'burst',
      });
    }
  }, [loc.pathname]);

  // ── Render loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const spawn = setInterval(() => {
      const s = S.current;
      if (s.particles.filter(p => p.type === 'ambient').length < 36) {
        const a = Math.random()*Math.PI*2, r = 1.5+Math.random()*1.1;
        s.particles.push({
          x:Math.cos(a)*r, y:Math.sin(a)*r, z:(Math.random()-0.5)*r*1.2,
          vx:(Math.random()-0.5)*0.0035, vy:(Math.random()-0.5)*0.0035,
          life:0, maxLife:0.4+Math.random()*0.45, growing:true,
          decay:0.0028+Math.random()*0.003, size:0.7+Math.random()*1.7, type:'ambient',
        });
      }
    }, 110);

    const draw = (ts) => {
      const s = S.current;
      const pal = s.pal;
    // One pulsing beam per cube vertex — light bursting out of the corners
    if (S.current.rays.length === 0) {
      for (let i = 0; i < 8; i++) {
        S.current.rays.push({
          period: 2600 + Math.random()*4400,   // each corner pulses on its own interval
          phase: Math.random()*Math.PI*2,
          len: 0.55 + Math.random()*0.35,
          width: 0.030 + Math.random()*0.025,
        });
      }
    }


      if (s.animating) {
        s.animT += 16 / s.animDur;
        if (s.animT >= 1) { s.animT = 1; s.animating = false; }
        const e = easeInOutCubic(s.animT);
        s.rotX = lerp(s.fromX, s.targetX, e);
        s.rotY = lerpAngle(s.fromY, s.targetY, e);
      } else {
        s.rotY += 0.022 + Math.sin(ts*0.00017)*0.008;
        s.rotX += Math.sin(ts*0.00023)*0.006;
      }

      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const cx = W*0.5, cy = H*0.46;
      const size = Math.min(W, H)*0.21;
      const dim = pal.lightBg ? 0.92 : 1; // slightly stronger lines on light bg, softer glow handled below
      const glowK = pal.lightBg ? 0.55 : 1;

      const rx = s.rotX*Math.PI/180, ry = s.rotY*Math.PI/180;
      const cosY=Math.cos(ry), sinY=Math.sin(ry), cosX=Math.cos(rx), sinX=Math.sin(rx);
      const rot3 = ([x,y,z]) => {
        const nx = x*cosY + z*sinY;
        const nz = -x*sinY + z*cosY;
        const ny = y*cosX - nz*sinX;
        const nz2 = y*sinX + nz*cosX;
        return [nx, ny, nz2];
      };
      const proj = ([x,y,z]) => {
        const fov = 4.2, sc = fov/(fov+z);
        return [cx + x*size*sc, cy + y*size*sc, z];
      };
      const tp = (v) => proj(rot3(v));


      // ── Pre-compute faces with depth ─────────────────────────────────────
      const faceData = FACES.map(f => {
        const world = f.vi.map(i => VERTS[i]);
        const center = [0,1,2].map(k => (world[0][k]+world[1][k]+world[2][k]+world[3][k])/4);
        const rn = rot3(f.n);                    // rotated normal
        const facing = rn[2];                     // <0 → toward camera? our camera looks down -z... use projection depth instead
        const pts = world.map(tp);
        const avgZ = pts.reduce((a,p)=>a+p[2],0)/4;
        return { f, world, center, pts, avgZ, facing: -rn[2] };
      }).sort((a,b) => b.avgZ - a.avgZ);          // far first (bigger z = farther with our fov math)

      // ── Draw each face: fill → inset metallic panel → floating bracket ──
      faceData.forEach(({ f, world, center, pts, avgZ, facing }) => {
        const vis = Math.max(0, Math.min(1, (facing+1)/2));        // 0 back → 1 front
        const depthA = 0.25 + vis*0.75;

        // 1. Face fill — barely there, gives the cube body mass
        ctx.beginPath();
        pts.forEach((p,i)=> i===0 ? ctx.moveTo(p[0],p[1]) : ctx.lineTo(p[0],p[1]));
        ctx.closePath();
        ctx.fillStyle = rgba(pal.panelLo, 0.05 + vis*0.06);
        ctx.fill();

        // 2. Inset metallic panel (the floating gradient square of the logo)
        const panelW = world.map(v => [0,1,2].map(k => lerp(v[k], center[k], 0.24)));
        const panel = panelW.map(tp);
        const g = ctx.createLinearGradient(panel[0][0], panel[0][1], panel[2][0], panel[2][1]);
        g.addColorStop(0,   rgba(pal.panelHi, (0.16 + vis*0.34)*dim));
        g.addColorStop(0.5, rgba(pal.panelLo, (0.10 + vis*0.22)*dim));
        g.addColorStop(1,   rgba(pal.panelHi, (0.08 + vis*0.18)*dim));
        ctx.beginPath();
        panel.forEach((p,i)=> i===0 ? ctx.moveTo(p[0],p[1]) : ctx.lineTo(p[0],p[1]));
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = rgba(pal.line, 0.30*depthA*dim);
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // 3. Floating bracket frame — scaled out in-plane + lifted along the normal
        const bracketW = world.map(v => {
          const out = [0,1,2].map(k => center[k] + (v[k]-center[k])*1.34 + f.n[k]*0.16);
          return out;
        });
        const bk = bracketW.map(tp);
        const lw = (0.9 + vis*1.5);
        ctx.lineCap = 'round';
        for (let i = 0; i < 4; i++) {
          const p1 = bk[i], p2 = bk[(i+1)%4];
          const a = (0.28 + vis*0.62)*dim;
          ctx.strokeStyle = rgba(pal.line, a);
          ctx.lineWidth = lw;
          ctx.shadowColor = rgba(pal.glow, 0.7*vis*glowK);
          ctx.shadowBlur = 6 + vis*12;
          // segment 1: corner → 38%
          ctx.beginPath();
          ctx.moveTo(p1[0], p1[1]);
          ctx.lineTo(lerp(p1[0],p2[0],0.38), lerp(p1[1],p2[1],0.38));
          ctx.stroke();
          // segment 2: 62% → corner
          ctx.beginPath();
          ctx.moveTo(lerp(p1[0],p2[0],0.62), lerp(p1[1],p2[1],0.62));
          ctx.lineTo(p2[0], p2[1]);
          ctx.stroke();
          ctx.shadowBlur = 0;

          // light escaping through the bracket gap
          if (vis > 0.35) {
            const gx = lerp(p1[0],p2[0],0.5), gy = lerp(p1[1],p2[1],0.5);
            const r = 7 + vis*16;
            const gg = ctx.createRadialGradient(gx,gy,0,gx,gy,r);
            gg.addColorStop(0, rgba(pal.glow, 0.34*vis*glowK));
            gg.addColorStop(0.4, rgba(pal.glow, 0.10*vis*glowK));
            gg.addColorStop(1, rgba(pal.glow, 0));
            ctx.fillStyle = gg;
            ctx.beginPath(); ctx.arc(gx,gy,r,0,Math.PI*2); ctx.fill();
          }
        }
      });

      // ── Main cube edges with gaps (open cube) ────────────────────────────
      const pv = VERTS.map(tp);
      EDGES.forEach(([a,b]) => {
        const p1 = pv[a], p2 = pv[b];
        const depth = 1 - Math.min(1, Math.max(0, ((p1[2]+p2[2])/2 + 1)/2)); // nearer → 1
        const al = (0.30 + depth*0.55)*dim;
        ctx.strokeStyle = rgba(pal.line, al);
        ctx.lineWidth = 1 + depth*1.3;
        ctx.shadowColor = rgba(pal.glow, 0.6*depth*glowK);
        ctx.shadowBlur = 4 + depth*10;
        ctx.beginPath();
        ctx.moveTo(p1[0],p1[1]);
        ctx.lineTo(lerp(p1[0],p2[0],0.42), lerp(p1[1],p2[1],0.42));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(lerp(p1[0],p2[0],0.58), lerp(p1[1],p2[1],0.58));
        ctx.lineTo(p2[0],p2[1]);
        ctx.stroke();
        ctx.shadowBlur = 0;
        // light at the edge gap
        const gx = lerp(p1[0],p2[0],0.5), gy = lerp(p1[1],p2[1],0.5);
        const r = 6 + depth*14;
        const gg = ctx.createRadialGradient(gx,gy,0,gx,gy,r);
        gg.addColorStop(0, rgba(pal.glow, (0.18+depth*0.30)*glowK));
        gg.addColorStop(1, rgba(pal.glow, 0));
        ctx.fillStyle = gg;
        ctx.beginPath(); ctx.arc(gx,gy,r,0,Math.PI*2); ctx.fill();
      });


      // ── Light beams bursting from the cube's corners ─────────────────────
      ctx.save();
      if (!pal.lightBg) ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 8; i++) {
        const ray = s.rays[i];
        if (!ray) continue;
        const v = pv[i];
        const pulse = Math.pow((Math.sin(ts*2*Math.PI/ray.period + ray.phase)+1)/2, 2.2); // eased 0→1
        const depth = 1 - Math.min(1, Math.max(0, (v[2]+1)/2));   // nearer corner → 1
        const intensity = (0.10 + pulse*0.42) * (0.35 + depth*0.65) * (pal.lightBg ? 0.55 : 1);
        if (intensity < 0.03) continue;
        // Beam direction: outward from the cube centre through this corner
        let dx = v[0]-cx, dy = v[1]-cy;
        const dl = Math.hypot(dx,dy) || 1;
        dx/=dl; dy/=dl;
        const L = size * ray.len * (0.7 + pulse*0.55);
        const x2 = v[0] + dx*L, y2 = v[1] + dy*L;
        const halfW = size * ray.width * (0.6 + pulse*0.7);
        const px = -dy*halfW, py = dx*halfW;
        const bg = ctx.createLinearGradient(v[0], v[1], x2, y2);
        bg.addColorStop(0,   rgba(pal.glow, intensity));
        bg.addColorStop(0.45, rgba(pal.glow, intensity*0.40));
        bg.addColorStop(1,   rgba(pal.glow, 0));
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(v[0] - px*0.3, v[1] - py*0.3);
        ctx.lineTo(x2 + px, y2 + py);
        ctx.lineTo(x2 - px, y2 - py);
        ctx.closePath();
        ctx.fill();
        // Bright point at the corner itself
        const cgl = ctx.createRadialGradient(v[0], v[1], 0, v[0], v[1], 4 + pulse*10*(0.4+depth*0.6));
        cgl.addColorStop(0, rgba(pal.glow, intensity*1.1));
        cgl.addColorStop(1, rgba(pal.glow, 0));
        ctx.fillStyle = cgl;
        ctx.beginPath(); ctx.arc(v[0], v[1], 4 + pulse*10, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();

      // ── Breathing inner light ─────────────────────────────────────────────
      const breathe = 0.65 + Math.sin(ts*0.0012)*0.25 + Math.sin(ts*0.0021)*0.10;
      const cg = ctx.createRadialGradient(cx,cy,0,cx,cy,size*0.95);
      cg.addColorStop(0, rgba(pal.glow, 0.14*breathe*glowK));
      cg.addColorStop(0.45, rgba(pal.glow, 0.035*breathe*glowK));
      cg.addColorStop(1, rgba(pal.glow, 0));
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(cx,cy,size*0.95,0,Math.PI*2); ctx.fill();

      // ── Particles ─────────────────────────────────────────────────────────
      s.particles = s.particles.filter(p => p.life > 0);
      s.particles.forEach(p => {
        if (p.type === 'ambient') {
          if (p.growing) { p.life += p.decay*1.8; if (p.life >= p.maxLife) p.growing = false; }
          else p.life -= p.decay;
          p.x += p.vx; p.y += p.vy;
        } else {
          p.x += p.vx*0.006; p.y += p.vy*0.006;
          p.vx *= 0.965; p.vy *= 0.965;
          p.life -= p.decay;
        }
        const pp = tp([p.x, p.y, p.z || 0]);
        const a = Math.max(0, Math.min(1, p.life))*(pal.lightBg ? 0.55 : 0.85);
        const psz = p.size*(p.type==='burst' ? Math.max(0.3,p.life)*1.3 : 1);
        const pg = ctx.createRadialGradient(pp[0],pp[1],0,pp[0],pp[1],psz*3);
        pg.addColorStop(0, rgba(pal.particle, a*0.9));
        pg.addColorStop(0.4, rgba(pal.particle, a*0.28));
        pg.addColorStop(1, rgba(pal.particle, 0));
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(pp[0],pp[1],psz*3,0,Math.PI*2); ctx.fill();
      });

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearInterval(spawn);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas ref={canvasRef} style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }}/>
  );
}
