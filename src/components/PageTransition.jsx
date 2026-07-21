import { useRef, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

// Content never disappears, but gets a quick, cheap fade+lift on route change
// so navigation feels intentional rather than abrupt. Uses only `opacity`
// and `transform` (both GPU-compositable, no layout/paint cost) so it never
// competes with the cube animation for frame budget.
export default function PageTransition({ children }) {
  const location = useLocation();
  const prevPath = useRef(location.pathname);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (location.pathname === prevPath.current) return;
    prevPath.current = location.pathname;
    setAnimKey(k => k + 1);
  }, [location.pathname]);

  return (
    <div
      key={animKey}
      style={{
        position: 'relative',
        zIndex: 1,
        minHeight: '100vh',
        animation: 'pageIn 0.32s cubic-bezier(0.22,1,0.36,1)',
        willChange: 'opacity, transform',
      }}
    >
      <style>{`
        @keyframes pageIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {children}
    </div>
  );
}
