import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../lib/ThemeContext';

// ─── ANIMATED COUNTER ─────────────────────────────────────────────────────
export function AnimatedNumber({ value, unit = '', decimals = 1, duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);
  const prevRef = useRef(0);

  useEffect(() => {
    const from = prevRef.current;
    const to = parseFloat(value) || 0;
    const start = performance.now();

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      setDisplay(current.toFixed(decimals));
      if (progress < 1) startRef.current = requestAnimationFrame(tick);
      else prevRef.current = to;
    };

    startRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(startRef.current);
  }, [value, duration, decimals]);

  return <span>{display}{unit}</span>;
}

// ─── CIRCULAR PROGRESS RING ───────────────────────────────────────────────
export function ProgressRing({ value, max = 100, size = 100, strokeWidth = 8, label, unit = '%' }) {
  const { theme } = useTheme();
  const [animated, setAnimated] = useState(0);
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = animated / max;
  const strokeDashoffset = circumference - progress * circumference;

  useEffect(() => {
    const timeout = setTimeout(() => {
      let start = 0;
      const target = parseFloat(value) || 0;
      const duration = 1400;
      const startTime = performance.now();

      const tick = (now) => {
        const elapsed = now - startTime;
        const p = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setAnimated(eased * target);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, 200);
    return () => clearTimeout(timeout);
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={theme.vars['--cp-accent']}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 6px ${theme.vars['--cp-accent']})`,
              transition: 'stroke-dashoffset 0.05s linear',
            }}
          />
        </svg>
        {/* Center value */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: 'var(--cp-text-primary)', fontWeight: 700, fontSize: size * 0.2 }}>
            <AnimatedNumber value={value} unit={unit} decimals={1} duration={1400} />
          </span>
        </div>
      </div>
      {label && (
        <p style={{ color: 'var(--cp-text-muted)', fontSize: 11, textAlign: 'center' }}>{label}</p>
      )}
    </div>
  );
}

// ─── ANIMATED LINE CHART (Canvas) ─────────────────────────────────────────
export function PremiumLineChart({ data = [], dataKey, color, height = 160, showGrid = true }) {
  const canvasRef = useRef(null);
  const { theme } = useTheme();
  const accentColor = color || theme.vars['--cp-accent'];
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;
    const pad = { top: 16, bottom: 28, left: 8, right: 8 };

    const values = data.map(d => parseFloat(d[dataKey]) || 0).filter(v => v > 0);
    if (!values.length) return;

    const minV = Math.min(...values) * 0.95;
    const maxV = Math.max(...values) * 1.05;

    const toX = (i) => pad.left + (i / (data.length - 1)) * (W - pad.left - pad.right);
    const toY = (v) => pad.top + (1 - (v - minV) / (maxV - minV)) * (H - pad.top - pad.bottom);

    let progress = 0;
    const drawFrame = () => {
      ctx.clearRect(0, 0, W, H);

      // Grid lines
      if (showGrid) {
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
          const y = pad.top + (i / 4) * (H - pad.top - pad.bottom);
          ctx.beginPath();
          ctx.moveTo(pad.left, y);
          ctx.lineTo(W - pad.right, y);
          ctx.stroke();
        }
      }

      // Gradient area
      const areaGrad = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
      areaGrad.addColorStop(0, accentColor + '30');
      areaGrad.addColorStop(1, accentColor + '00');

      const visibleCount = Math.ceil(data.length * progress);
      const pts = data.slice(0, Math.max(2, visibleCount));

      if (pts.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(toX(0), toY(parseFloat(pts[0][dataKey]) || 0));
      pts.forEach((d, i) => {
        if (i > 0) ctx.lineTo(toX(i), toY(parseFloat(d[dataKey]) || 0));
      });
      const lastX = toX(pts.length - 1);
      ctx.lineTo(lastX, H - pad.bottom);
      ctx.lineTo(pad.left, H - pad.bottom);
      ctx.closePath();
      ctx.fillStyle = areaGrad;
      ctx.fill();

      // Line
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(parseFloat(pts[0][dataKey]) || 0));
      pts.forEach((d, i) => {
        if (i > 0) ctx.lineTo(toX(i), toY(parseFloat(d[dataKey]) || 0));
      });
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Dots
      pts.forEach((d, i) => {
        const v = parseFloat(d[dataKey]) || 0;
        if (!v) return;
        ctx.beginPath();
        ctx.arc(toX(i), toY(v), 3, 0, Math.PI * 2);
        ctx.fillStyle = accentColor;
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // X labels
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = '10px DM Sans, sans-serif';
      ctx.textAlign = 'center';
      const step = Math.max(1, Math.floor(data.length / 5));
      data.forEach((d, i) => {
        if (i % step === 0 && i < visibleCount) {
          ctx.fillText(d.date || '', toX(i), H - 4);
        }
      });

      if (progress < 1) {
        progress = Math.min(1, progress + 0.025);
        animRef.current = requestAnimationFrame(drawFrame);
      }
    };

    animRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(animRef.current);
  }, [data, dataKey, accentColor, showGrid]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height, display: 'block' }}
    />
  );
}

// ─── STAT CARD WITH TREND ─────────────────────────────────────────────────
export function PremiumStatCard({ label, value, unit = '', trend, icon: Icon, delay = 0 }) {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const trendUp = trend > 0;
  const trendColor = trendUp ? '#10b981' : '#ef4444';

  return (
    <div
      className="cp-stat-card"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`,
      }}
    >
      {/* Icon */}
      {Icon && (
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
          style={{ background: `rgba(var(--cp-accent-rgb), 0.12)` }}
        >
          <Icon className="w-4 h-4" style={{ color: 'var(--cp-accent)' }} />
        </div>
      )}

      {/* Value */}
      <div style={{ fontFamily: 'var(--cp-font-display)', fontSize: 32, fontWeight: 700, color: 'var(--cp-text-primary)', lineHeight: 1 }}>
        <AnimatedNumber value={value} unit={unit} decimals={value % 1 !== 0 ? 1 : 0} />
      </div>

      {/* Label */}
      <p style={{ color: 'var(--cp-text-muted)', fontSize: 12, marginTop: 6, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </p>

      {/* Trend */}
      {trend !== undefined && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: trendColor, fontSize: 12, fontWeight: 600 }}>
            {trendUp ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}{unit}
          </span>
          <span style={{ color: 'var(--cp-text-muted)', fontSize: 11 }}>vs first record</span>
        </div>
      )}
    </div>
  );
}

// ─── MINI SPARKLINE ───────────────────────────────────────────────────────
export function Sparkline({ values = [], color }) {
  const { theme } = useTheme();
  const c = color || theme.vars['--cp-accent'];
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const W = 80, H = 28;
  const toX = (i) => (i / (values.length - 1)) * W;
  const toY = (v) => H - ((v - min) / (max - min || 1)) * H;

  const pts = values.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');

  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      <polyline
        points={pts}
        fill="none"
        stroke={c}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px ${c})` }}
      />
    </svg>
  );
}
