import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Dumbbell, Salad, BarChart2, CreditCard, MessageCircle, LogOut, Sun, Moon, ChevronDown, Check } from 'lucide-react';
import { useAppContext } from '../../lib/AppContext';
import { useTheme, CLIENT_THEMES } from '../../lib/ThemeContext';
import logo from '../../assets/logo-cube.png';
import { useLang } from '../../lib/LangContext';

const NAV = [
  { path:'/client-home', icon:Home, key:'cp_home' },
  { path:'/client-training', icon:Dumbbell, key:'cp_training' },
  { path:'/client-nutrition', icon:Salad, key:'cp_nutrition' },
  { path:'/client-stats', icon:BarChart2, key:'cp_stats' },
  { path:'/client-financial', icon:CreditCard, key:'cp_financial' },
  { path:'/client-messages', icon:MessageCircle, key:'cp_messages' },
];


function LangToggleClient() {
  const { lang, toggle } = useLang();
  return (
    <button
      onClick={toggle}
      title={lang === 'en' ? 'Switch to Greek' : 'Αλλαγή σε Αγγλικά'}
      style={{
        width:36, height:36, borderRadius:10,
        border:'1px solid var(--cp-border)',
        backgroundColor:'var(--cp-accent-light)',
        display:'flex', alignItems:'center', justifyContent:'center',
        cursor:'pointer', fontSize:16,
      }}
    >
      {lang === 'en' ? '🇬🇧' : '🇬🇷'}
    </button>
  );
}

function ThemePicker() {
  const { themeName, switchTheme, themes } = useTheme();
  const [open, setOpen] = React.useState(false);
  const dark = Object.entries(themes).filter(([,t])=>t.family==='dark');
  const light = Object.entries(themes).filter(([,t])=>t.family==='light');
  const cur = themes[themeName];
  return (
    <div style={{position:'relative'}}>
      <button onClick={()=>setOpen(v=>!v)} title="Change theme"
        style={{width:36,height:36,borderRadius:10,border:'1px solid var(--cp-border)',
          backgroundColor:'var(--cp-accent-light)',display:'flex',alignItems:'center',
          justifyContent:'center',cursor:'pointer',fontSize:16}}>
        {cur?.emoji||'🎨'}
      </button>
      {open&&(
        <>
          <div onClick={()=>setOpen(false)} style={{position:'fixed',inset:0,zIndex:99}}/>
          <div style={{position:'fixed',bottom:60,left:8,zIndex:100,background:'var(--cp-card-bg)',
            border:'1px solid var(--cp-border)',borderRadius:16,padding:'12px',
            boxShadow:'0 8px 32px rgba(0,0,0,0.4)',width:200,backdropFilter:'blur(20px)'}}>
            <p style={{fontSize:9,letterSpacing:'0.15em',color:'var(--cp-text-dim)',textTransform:'uppercase',margin:'0 0 8px 2px'}}>DARK</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5,marginBottom:10}}>
              {dark.map(([k,t])=>(
                <button key={k} onClick={()=>{switchTheme(k);setOpen(false);}}
                  title={t.name}
                  style={{height:32,borderRadius:8,border:themeName===k?'2px solid var(--cp-accent)':'1px solid var(--cp-border)',
                    background:t.body,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',
                    boxShadow:themeName===k?'0 0 0 1px var(--cp-accent)':'none'}}>
                  {t.emoji}
                </button>
              ))}
            </div>
            <p style={{fontSize:9,letterSpacing:'0.15em',color:'var(--cp-text-dim)',textTransform:'uppercase',margin:'0 0 8px 2px'}}>LIGHT</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5}}>
              {light.map(([k,t])=>(
                <button key={k} onClick={()=>{switchTheme(k);setOpen(false);}}
                  title={t.name}
                  style={{height:32,borderRadius:8,border:themeName===k?'2px solid var(--cp-accent)':'1px solid rgba(0,0,0,0.15)',
                    background:t.body,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',
                    boxShadow:themeName===k?'0 0 0 1px #666':'none'}}>
                  {t.emoji}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ClientLayout({ children, title }) {
  const { logout, clientUser } = useAppContext();
  const { tr } = useLang();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Detect if mobile (< 768px) — sidebar collapses to icons only
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const sidebarW = isMobile ? 230 : (sidebarOpen ? 200 : 64);

  return (
    <div style={{ minHeight:'100vh', display:'flex', backgroundColor:'var(--cp-bg)', fontFamily:'var(--cp-font-body)' }}>

      {/* ── SIDEBAR ── */}
      {/* Mobile: floating logo button — the only way to open the menu */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen(v => !v)}
          style={{
            position:'fixed', top:10, left:10, zIndex:60,
            width:44, height:44, borderRadius:12, padding:0,
            overflow:'hidden', border:'1px solid var(--cp-border)',
            background:'#000', cursor:'pointer',
            boxShadow:'0 4px 18px rgba(0,0,0,0.35)',
          }}
        >
          <img src={logo} alt="Menu" style={{ width:'100%', height:'100%', objectFit:'cover', filter:'brightness(1.25)' }}/>
        </button>
      )}
      {/* Mobile: backdrop closes the menu */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position:'fixed', inset:0, zIndex:49, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(2px)' }}/>
      )}
      <aside
        onMouseEnter={isMobile ? undefined : () => setSidebarOpen(true)}
        onMouseLeave={isMobile ? undefined : () => setSidebarOpen(false)}
        style={{
          position:'fixed', top:0, left:0, height:'100%', zIndex:50,
          backgroundColor:'var(--cp-nav-bg)',
          borderRight:'1px solid var(--cp-border)',
          display:'flex', flexDirection:'column',
          width: sidebarW,
          transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-110%)') : 'none',
          transition: isMobile ? 'transform 0.28s cubic-bezier(0.4,0,0.2,1)' : 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: sidebarOpen ? '0 0 40px rgba(0,0,0,0.25)' : 'none',
          flexShrink:0,
        }}
      >
        {/* Logo / App name */}
        <div style={{ display:'flex', alignItems:'center', height:60, padding:'0 14px', borderBottom:'1px solid var(--cp-border)', flexShrink:0, overflow:'hidden' }}>
          <div style={{ width:32, height:32, borderRadius:9, overflow:'hidden', flexShrink:0, background:'#000' }}>
            <img src={logo} alt="Cube" style={{ width:'100%', height:'100%', objectFit:'cover', filter:'brightness(1.25)' }}/>
          </div>
          <div style={{ marginLeft:10, overflow:'hidden', opacity:(sidebarOpen||isMobile)?1:0, transition:'opacity 0.15s ease', transitionDelay:sidebarOpen?'0.08s':'0s', whiteSpace:'nowrap' }}>
            <p style={{ margin:0, fontSize:13, fontWeight:700, color:'var(--cp-text)', fontFamily:'var(--cp-font)', lineHeight:1.2 }}>The Cube</p>
            <p style={{ margin:0, fontSize:8, color:'var(--cp-text-dim)', letterSpacing:'0.08em', textTransform:'uppercase' }}>Personal Training</p>
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ flex:1, padding:'10px 8px', display:'flex', flexDirection:'column', gap:2, overflowY:'auto', overflowX:'hidden' }}>
          {NAV.map(({ path, icon:Icon, key }) => (
            <NavLink key={path} to={path}
              style={({ isActive }) => ({
                display:'flex', alignItems:'center',
                height:42, paddingLeft:12, paddingRight:8,
                borderRadius:12, textDecoration:'none',
                backgroundColor: isActive ? 'var(--cp-accent)' : 'transparent',
                color: isActive ? '#fff' : 'var(--cp-text-dim)',
                transition:'all 0.15s ease',
                overflow:'hidden',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon style={{ width:18, height:18, flexShrink:0 }} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span style={{
                    marginLeft:10, fontSize:13, fontWeight: isActive ? 600 : 400,
                    whiteSpace:'nowrap', color: isActive ? '#fff' : 'var(--cp-text-dim)',
                    opacity: sidebarOpen ? 1 : 0, transition:'opacity 0.15s ease',
                    transitionDelay: sidebarOpen ? '0.05s' : '0s',
                  }}>
                    {tr(key)}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom — theme + logout */}
        <div style={{ padding:'8px', borderTop:'1px solid var(--cp-border)', display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
          <LangToggleClient />
        <ThemePicker />
          <button
            onClick={logout}
            title="Sign out"
            style={{
              width:36, height:36, borderRadius:10,
              border:'1px solid var(--cp-border)',
              backgroundColor:'transparent',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer',
            }}
          >
            <LogOut style={{ width:15, height:15, color:'var(--cp-text-dim)' }} />
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex:1, marginLeft: isMobile ? 0 : sidebarW, paddingTop: isMobile ? 56 : 0, transition:'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)', display:'flex', flexDirection:'column', minHeight:'100vh' }}>
        {/* Top bar */}
        {title && (
          <header style={{ padding:'14px 20px', borderBottom:'1px solid var(--cp-border)', backgroundColor:'var(--cp-card-bg)', flexShrink:0 }}>
            <h1 style={{ margin:0, fontSize:18, fontWeight:600, fontFamily:'var(--cp-font)', color:'var(--cp-text)', letterSpacing:'-0.01em' }}>{title}</h1>
          </header>
        )}
        <main style={{ flex:1, overflowY:'auto' }}>{children}</main>
      </div>
    </div>
  );
}
