import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Dumbbell, Salad, BarChart2, CreditCard, MessageCircle, LogOut, Sun, Moon } from 'lucide-react';
import { useAppContext } from '../../lib/AppContext';
import { useTheme } from '../../lib/ThemeContext';

const NAV = [
  { path: '/client-home', icon: Home, label: 'Home' },
  { path: '/client-training', icon: Dumbbell, label: 'Training' },
  { path: '/client-nutrition', icon: Salad, label: 'Nutrition' },
  { path: '/client-stats', icon: BarChart2, label: 'Stats' },
  { path: '/client-financial', icon: CreditCard, label: 'Financial' },
  { path: '/client-messages', icon: MessageCircle, label: 'Messages' },
];

// Detect if running on mobile viewport
const isMobile = () => window.innerWidth < 768;

export default function ClientLayout({ children, title }) {
  const { logout, clientUser } = useAppContext();
  const { themeName, toggleTheme } = useTheme();
  const dark = themeName === 'obsidian';

  useEffect(() => {
    // Apply theme to body bg
    document.body.style.backgroundColor = 'var(--cp-bg)';
  }, [themeName]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--cp-bg)',
      fontFamily: 'var(--cp-font-body)',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* ── TOP BAR ── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        borderBottom: '1px solid var(--cp-border)',
        backgroundColor: 'var(--cp-card-bg)',
        flexShrink: 0,
      }}>
        <div>
          {title
            ? <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, fontFamily: 'var(--cp-font)', color: 'var(--cp-text)', letterSpacing: '-0.01em' }}>{title}</h1>
            : <p style={{ margin: 0, fontSize: 13, color: 'var(--cp-text-dim)' }}>
                {clientUser?.name?.split(' ')[0] || 'Welcome'}
              </p>
          }
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={dark ? 'Switch to light' : 'Switch to dark'}
            style={{
              width: 36, height: 36,
              borderRadius: 10,
              border: '1px solid var(--cp-border)',
              backgroundColor: 'var(--cp-accent-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {dark
              ? <Sun style={{ width: 16, height: 16, color: 'var(--cp-accent)' }} />
              : <Moon style={{ width: 16, height: 16, color: 'var(--cp-accent)' }} />
            }
          </button>
          {/* Logout */}
          <button
            onClick={logout}
            title="Sign out"
            style={{
              width: 36, height: 36,
              borderRadius: 10,
              border: '1px solid var(--cp-border)',
              backgroundColor: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <LogOut style={{ width: 15, height: 15, color: 'var(--cp-text-dim)' }} />
          </button>
        </div>
      </header>

      {/* ── CONTENT ── */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </main>

      {/* ── BOTTOM NAV (mobile-first, stays bottom on all sizes for client app) ── */}
      <nav style={{
        display: 'flex',
        borderTop: '1px solid var(--cp-border)',
        backgroundColor: 'var(--cp-nav-bg)',
        flexShrink: 0,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {NAV.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            style={({ isActive }) => ({
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 4px 8px',
              textDecoration: 'none',
              color: isActive ? 'var(--cp-accent)' : 'var(--cp-text-dim)',
              transition: 'color 0.15s ease',
              gap: 3,
            })}
          >
            {({ isActive }) => (
              <>
                <Icon
                  style={{ width: 22, height: 22 }}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400, letterSpacing: '0.02em' }}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
