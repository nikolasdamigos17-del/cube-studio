import { useEffect, useRef } from 'react';
import { useTheme } from '../../lib/ThemeContext';

// ─── PARTICLE SYSTEMS ────────────────────────────────────────────────────────

function drawStars(ctx, canvas, t) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Static star field with subtle twinkle
  for (let i = 0; i < 120; i++) {
    const x = ((Math.sin(i * 127.1) * 0.5 + 0.5) * canvas.width);
    const y = ((Math.sin(i * 311.7) * 0.5 + 0.5) * canvas.height);
    const twinkle = Math.sin(t * 0.001 * (1 + i * 0.1)) * 0.4 + 0.6;
    const size = 0.5 + (i % 3) * 0.5;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${twinkle * 0.7})`;
    ctx.fill();
  }

  // Occasional shooting star
  const shootProgress = (t * 0.00015) % 1;
  if (shootProgress < 0.3) {
    const progress = shootProgress / 0.3;
    const sx = canvas.width * 0.1 + progress * canvas.width * 0.5;
    const sy = canvas.height * 0.1 + progress * canvas.height * 0.15;
    const grad = ctx.createLinearGradient(sx - 80 * progress, sy - 30 * progress, sx, sy);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(1, `rgba(255,255,255,${(1 - progress) * 0.8})`);
    ctx.beginPath();
    ctx.moveTo(sx - 80, sy - 30);
    ctx.lineTo(sx, sy);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawGrid(ctx, canvas, t, accentRgb) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const [r, g, b] = accentRgb.split(',').map(Number);

  // Animated grid lines
  const gridSize = 60;
  const offset = (t * 0.02) % gridSize;

  ctx.strokeStyle = `rgba(${r},${g},${b},0.04)`;
  ctx.lineWidth = 1;

  for (let x = -gridSize + offset; x < canvas.width + gridSize; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height + gridSize; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Glowing dots at intersections near the cursor
  for (let x = 0; x < canvas.width; x += gridSize) {
    for (let y = 0; y < canvas.height; y += gridSize) {
      const pulse = Math.sin(t * 0.002 + x * 0.1 + y * 0.1) * 0.5 + 0.5;
      if (pulse > 0.85) {
        ctx.beginPath();
        ctx.arc(x + offset, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${pulse * 0.4})`;
        ctx.fill();
      }
    }
  }

  // Floating orbs
  for (let i = 0; i < 3; i++) {
    const ox = (Math.sin(t * 0.0008 + i * 2.1) * 0.3 + 0.5) * canvas.width;
    const oy = (Math.cos(t * 0.0006 + i * 1.7) * 0.3 + 0.5) * canvas.height;
    const gr = ctx.createRadialGradient(ox, oy, 0, ox, oy, 150);
    gr.addColorStop(0, `rgba(${r},${g},${b},0.06)`);
    gr.addColorStop(1, 'transparent');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(ox, oy, 150, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function PremiumBackground() {
  const canvasRef = useRef(null);
  const { theme } = useTheme();
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let t = 0;
    const tick = () => {
      t++;
      if (theme.particles === 'stars') {
        drawStars(ctx, canvas, t);
      } else if (theme.particles === 'grid') {
        drawGrid(ctx, canvas, t, theme.vars['--cp-accent-rgb']);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [theme]);

  return (
    <>
      {/* CSS gradient background */}
      <div
        className="fixed inset-0 z-0"
        style={{ background: theme.background }}
      />
      {/* Canvas particles on top */}
      <canvas
        ref={canvasRef}
        className="cp-bg-canvas"
        style={{ zIndex: 1 }}
      />
    </>
  );
}
