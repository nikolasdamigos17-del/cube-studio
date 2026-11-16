import { useState } from 'react';
import { Palette, X, Sun, Moon } from 'lucide-react';
import { useTheme, THEME_FAMILIES } from '../../lib/ThemeContext';

export default function ThemeSwitcher() {
  const { themeId, setTheme, theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [activeFamily, setActiveFamily] = useState(theme.family);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200"
        style={{
          background: `rgba(var(--cp-accent-rgb), 0.15)`,
          border: `1px solid rgba(var(--cp-accent-rgb), 0.3)`,
          color: 'var(--cp-accent)',
          backdropFilter: 'blur(12px)',
          boxShadow: `0 4px 20px rgba(var(--cp-accent-rgb), 0.2)`,
        }}
        title="Customize theme"
      >
        <Palette className="w-5 h-5" />
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-20 right-6 z-50 w-72 rounded-2xl p-5"
          style={{
            background: 'var(--cp-card-bg)',
            border: '1px solid var(--cp-border-strong)',
            backdropFilter: 'blur(30px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <p style={{ color: 'var(--cp-text-primary)', fontFamily: 'var(--cp-font-display)', fontSize: 18, fontWeight: 600 }}>
              Choose Theme
            </p>
            <button onClick={() => setOpen(false)} style={{ color: 'var(--cp-text-muted)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Family toggle */}
          <div
            className="flex gap-1 p-1 rounded-xl mb-4"
            style={{ background: 'var(--cp-surface)' }}
          >
            {['dark', 'light'].map(fam => (
              <button
                key={fam}
                onClick={() => setActiveFamily(fam)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all"
                style={activeFamily === fam
                  ? { background: `rgba(var(--cp-accent-rgb), 0.2)`, color: 'var(--cp-accent)' }
                  : { color: 'var(--cp-text-muted)' }
                }
              >
                {fam === 'dark' ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                {fam === 'dark' ? 'Dark' : 'Light'}
              </button>
            ))}
          </div>

          {/* Theme options */}
          <div className="space-y-2">
            {THEME_FAMILIES[activeFamily].map(t => (
              <button
                key={t.id}
                onClick={() => { setTheme(t.id); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left"
                style={themeId === t.id
                  ? { background: `rgba(var(--cp-accent-rgb), 0.12)`, border: `1px solid rgba(var(--cp-accent-rgb), 0.25)` }
                  : { background: 'var(--cp-surface)', border: '1px solid transparent' }
                }
              >
                {/* Color swatches */}
                <div className="flex gap-1 flex-shrink-0">
                  {t.preview.map((color, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full"
                      style={{ backgroundColor: color, border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  ))}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p style={{ color: 'var(--cp-text-primary)', fontSize: 13, fontWeight: 600 }}>
                    {t.name}
                  </p>
                  <p style={{ color: 'var(--cp-text-muted)', fontSize: 11 }} className="truncate">
                    {t.description}
                  </p>
                </div>

                {/* Active check */}
                {themeId === t.id && (
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--cp-accent)' }}
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          <p style={{ color: 'var(--cp-text-muted)', fontSize: 11, marginTop: 12, textAlign: 'center' }}>
            Your preference is saved automatically
          </p>
        </div>
      )}
    </>
  );
}
