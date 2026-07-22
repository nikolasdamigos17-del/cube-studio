import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Dumbbell, Salad, BarChart2, CreditCard, MessageCircle, LogOut, Sun, Moon, ChevronDown, Check, MoreHorizontal, Settings, Globe } from 'lucide-react';
import { useAppContext } from '../../lib/AppContext';
import { useTheme, CLIENT_THEMES } from '../../lib/ThemeContext';
import logo from '../../assets/logo-cube.png';
import barbellBar from '../../assets/barbell-bar.png';
import barbellPlates from '../../assets/barbell-plates.png';
import { useLang } from '../../lib/LangContext';

const NAV = [
  { path:'/client-home', icon:Home, key:'cp_home' },
  { path:'/client-training', icon:Dumbbell, key:'cp_training' },
  { path:'/client-nutrition', icon:Salad, key:'cp_nutrition' },
  { path:'/client-stats', icon:BarChart2, key:'cp_stats' },
  { path:'/client-financial', icon:CreditCard, key:'cp_financial' },
  { path:'/client-messages', icon:MessageCircle, key:'cp_messages' },
];
// Mobile bottom bar: 3 primary + More
const CP_BOTTOM = [
  { path:'/client-home', icon:Home, key:'cp_home' },
  { path:'/client-nutrition', icon:Salad, key:'cp_nutrition' },
  { path:'/client-messages', icon:MessageCircle, key:'cp_messages' },
];
const CP_MORE = [
  { path:'/client-training', icon:Dumbbell, key:'cp_training' },
  { path:'/client-stats', icon:BarChart2, key:'cp_stats' },
  { path:'/client-financial', icon:CreditCard, key:'cp_financial' },
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
            boxShadow:'0 8px 32px rgba(0,0,0,0.4)',width:200,backdropFilter:'blur(10px)'}}>
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
  const [cpSettingsOpen, setCpSettingsOpen] = useState(false);
  const [cpMoreTab, setCpMoreTab] = useState('menu');
  const { themeName: cpTheme, switchTheme: cpSwitch, themes: cpThemes } = useTheme();
  const { lang: cpLang, toggle: cpToggle } = useLang();
  const { tr } = useLang();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Detect if mobile (< 768px) — sidebar collapses to icons only
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const sidebarW = sidebarOpen ? 200 : 64;

  // ── MOBILE: bottom navigation bar ──
  if (isMobile) {
    return (
      <div style={{ minHeight:'100vh', backgroundColor:'var(--cp-bg)', fontFamily:'var(--cp-font-body)' }}>
        {title && (
          <header style={{ padding:'14px 18px', borderBottom:'1px solid var(--cp-border)', backgroundColor:'var(--cp-card-bg)', position:'sticky', top:0, zIndex:30, backdropFilter:'blur(12px)' }}>
            <h1 style={{ margin:0, fontSize:18, fontWeight:600, fontFamily:'var(--cp-font)', color:'var(--cp-text)' }}>{title}</h1>
          </header>
        )}
        <main style={{ paddingBottom:'calc(92px + env(safe-area-inset-bottom))', minHeight:'100vh' }}>
          {children}
        </main>
        {/* ── More / Settings sheet (tabbed) ── */}
        {cpSettingsOpen && (
          <>
            <div onClick={()=>setCpSettingsOpen(false)} style={{position:'fixed',inset:0,zIndex:70,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(3px)'}}/>
            <div style={{position:'fixed',left:0,right:0,bottom:0,zIndex:71,background:'var(--cp-card-bg)',
              borderTopLeftRadius:24,borderTopRightRadius:24,borderTop:'1px solid var(--cp-border)',
              padding:'10px 16px calc(20px + env(safe-area-inset-bottom))',boxShadow:'0 -8px 40px rgba(0,0,0,0.5)',
              animation:'sheetUp 0.26s cubic-bezier(0.22,1,0.36,1)',maxHeight:'80vh',overflowY:'auto'}}>
              <style>{`@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
              <div style={{width:38,height:4,borderRadius:4,background:'var(--cp-text-dim)',opacity:0.4,margin:'4px auto 14px'}}/>

              {/* Tab switcher */}
              <div style={{display:'flex',gap:4,padding:4,borderRadius:14,background:'var(--cp-card-alt)',marginBottom:16}}>
                <button onClick={()=>setCpMoreTab('menu')}
                  style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px',
                    borderRadius:11,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,
                    background:cpMoreTab==='menu'?'var(--cp-card-bg)':'transparent',
                    color:cpMoreTab==='menu'?'var(--cp-text)':'var(--cp-text-dim)',transition:'all 0.2s'}}>
                  <MoreHorizontal style={{width:16,height:16}}/> Menu
                </button>
                <button onClick={()=>setCpMoreTab('settings')}
                  style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px',
                    borderRadius:11,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,
                    background:cpMoreTab==='settings'?'var(--cp-card-bg)':'transparent',
                    color:cpMoreTab==='settings'?'var(--cp-text)':'var(--cp-text-dim)',transition:'all 0.2s'}}>
                  <Settings style={{width:16,height:16}}/> Settings
                </button>
              </div>

              {/* MENU tab */}
              {cpMoreTab==='menu' && (
                <>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
                    {CP_MORE.map(({path,icon:Icon,key})=>(
                      <NavLink key={path} to={path} onClick={()=>setCpSettingsOpen(false)}
                        style={({isActive})=>({
                          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,
                          padding:'16px 6px',borderRadius:16,textDecoration:'none',
                          background:isActive?'var(--cp-accent-light)':'var(--cp-card-alt)',
                          color:isActive?'var(--cp-accent)':'var(--cp-text)'})}>
                        <Icon style={{width:20,height:20}}/>
                        <span style={{fontSize:11,fontWeight:600,textAlign:'center',lineHeight:1.2}}>{tr(key)}</span>
                      </NavLink>
                    ))}
                  </div>
                  <button onClick={logout}
                    style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'14px',
                      borderRadius:16,border:'none',cursor:'pointer',fontSize:14,fontWeight:600,
                      background:'rgba(239,68,68,0.12)',color:'#ef4444'}}>
                    <LogOut style={{width:16,height:16}}/> Sign Out
                  </button>
                </>
              )}

              {/* SETTINGS tab */}
              {cpMoreTab==='settings' && (
                <>
                  <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'var(--cp-text-dim)',marginBottom:8}}>
                    <Globe style={{width:12,height:12,display:'inline',marginRight:4,marginBottom:-1}}/>Language
                  </p>
                  <div style={{display:'flex',gap:8,marginBottom:18}}>
                    <button onClick={()=>cpLang!=='en'&&cpToggle()}
                      style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'12px',
                        borderRadius:12,cursor:'pointer',fontSize:14,fontWeight:600,
                        border:cpLang==='en'?'2px solid var(--cp-accent)':'1px solid var(--cp-border)',
                        background:cpLang==='en'?'var(--cp-accent-light)':'var(--cp-card-alt)',
                        color:cpLang==='en'?'var(--cp-accent)':'var(--cp-text)'}}>🇬🇧 English</button>
                    <button onClick={()=>cpLang!=='el'&&cpToggle()}
                      style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'12px',
                        borderRadius:12,cursor:'pointer',fontSize:14,fontWeight:600,
                        border:cpLang==='el'?'2px solid var(--cp-accent)':'1px solid var(--cp-border)',
                        background:cpLang==='el'?'var(--cp-accent-light)':'var(--cp-card-alt)',
                        color:cpLang==='el'?'var(--cp-accent)':'var(--cp-text)'}}>🇬🇷 Ελληνικά</button>
                  </div>
                  <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'var(--cp-text-dim)',marginBottom:8}}>Theme</p>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:6}}>
                    {Object.entries(cpThemes).map(([k,t])=>(
                      <button key={k} onClick={()=>cpSwitch(k)} title={t.name}
                        style={{height:36,borderRadius:10,background:t.body,cursor:'pointer',
                          border:cpTheme===k?'2px solid var(--cp-accent)':'1px solid var(--cp-border)',
                          display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>{t.emoji}</button>
                    ))}
                  </div>
                </>
              )}

              <button onClick={()=>setCpSettingsOpen(false)}
                style={{width:'100%',marginTop:16,padding:'12px',borderRadius:16,border:'none',cursor:'pointer',
                  fontSize:14,fontWeight:600,background:'var(--cp-card-alt)',color:'var(--cp-text-dim)'}}>Close</button>
            </div>
          </>
        )}

        {/* ── Floating barbell bottom nav (theme-tinted) ── */}
        <div style={{ position:'fixed', left:0, right:0, zIndex:60,
          bottom:'calc(14px + env(safe-area-inset-bottom))',
          display:'flex', justifyContent:'center', padding:'0 12px', pointerEvents:'none' }}>
          <div style={{ position:'relative', width:'100%', maxWidth:430, pointerEvents:'auto',
            aspectRatio:'3.73 / 1', filter:'drop-shadow(0 10px 22px rgba(0,0,0,0.4))' }}>
            {/* accent-tinted plates via mask */}
            <div style={{ position:'absolute', inset:0, background:'var(--cp-accent)',
              WebkitMaskImage:`url(${barbellPlates})`, maskImage:`url(${barbellPlates})`,
              WebkitMaskSize:'100% 100%', maskSize:'100% 100%',
              WebkitMaskRepeat:'no-repeat', maskRepeat:'no-repeat', opacity:0.92, pointerEvents:'none' }}/>
            <img src={barbellPlates} alt="" aria-hidden="true" style={{ position:'absolute', inset:0,
              width:'100%', height:'100%', objectFit:'fill', pointerEvents:'none', userSelect:'none',
              mixBlendMode:'multiply', opacity:0.55 }}/>
            <img src={barbellBar} alt="" style={{ position:'absolute', inset:0,
              width:'100%', height:'100%', objectFit:'fill', pointerEvents:'none', userSelect:'none' }}/>
            <div style={{ position:'absolute', left:'14.3%', right:'14.2%', top:'24%', bottom:'26%',
              display:'flex', alignItems:'center' }}>
              {CP_BOTTOM.map(({ path, icon:Icon, key }) => (
                <NavLink key={path} to={path}
                  style={({isActive}) => ({
                    flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                    gap:1.5, textDecoration:'none', position:'relative',
                    color: isActive ? 'var(--cp-accent)' : '#2a2a2e', transition:'color 0.15s ease',
                  })}>
                  {({isActive}) => (
                    <>
                      <Icon style={{width:'clamp(16px,4.6vw,20px)',height:'clamp(16px,4.6vw,20px)'}} strokeWidth={isActive?2.7:2.2}/>
                      <span style={{fontSize:'clamp(6.5px,2vw,8.5px)',fontWeight:700,letterSpacing:'-0.02em',
                        textTransform:'uppercase',lineHeight:1,color:isActive?'var(--cp-accent)':'#3a3a3e',whiteSpace:'nowrap'}}>{tr(key)}</span>
                      {isActive && <div style={{position:'absolute',bottom:-3,width:'56%',height:2.5,borderRadius:3,background:'var(--cp-accent)'}}/>}
                    </>
                  )}
                </NavLink>
              ))}
              <button onClick={()=>setCpSettingsOpen(v=>!v)}
                style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:1.5,
                  border:'none',background:'transparent',cursor:'pointer',position:'relative',
                  color:cpSettingsOpen?'var(--cp-accent)':'#2a2a2e'}}>
                <MoreHorizontal style={{width:'clamp(16px,4.6vw,20px)',height:'clamp(16px,4.6vw,20px)'}} strokeWidth={cpSettingsOpen?2.7:2.2}/>
                <span style={{fontSize:'clamp(6.5px,2vw,8.5px)',fontWeight:700,letterSpacing:'-0.02em',
                  textTransform:'uppercase',lineHeight:1,color:cpSettingsOpen?'var(--cp-accent)':'#3a3a3e'}}>More</span>
                {cpSettingsOpen && <div style={{position:'absolute',bottom:-3,width:'56%',height:2.5,borderRadius:3,background:'var(--cp-accent)'}}/>}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── DESKTOP: sidebar ──
  return (
    <div style={{ minHeight:'100vh', display:'flex', backgroundColor:'var(--cp-bg)', fontFamily:'var(--cp-font-body)' }}>

      {/* ── SIDEBAR (desktop) ── */}
      <aside
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => setSidebarOpen(false)}
        style={{
          position:'fixed', top:0, left:0, height:'100%', zIndex:50,
          backgroundColor:'var(--cp-nav-bg)',
          borderRight:'1px solid var(--cp-border)',
          display:'flex', flexDirection:'column',
          width: sidebarW,
          transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: sidebarOpen ? '0 0 40px rgba(0,0,0,0.25)' : 'none',
          flexShrink:0,
        }}
      >
        {/* Logo / App name */}
        <div style={{ display:'flex', alignItems:'center', height:60, padding:'0 14px', borderBottom:'1px solid var(--cp-border)', flexShrink:0, overflow:'hidden' }}>
          <div style={{ width:32, height:32, borderRadius:9, overflow:'hidden', flexShrink:0, background:'#000' }}>
            <img src={logo} alt="Cube" style={{ width:'100%', height:'100%', objectFit:'cover', filter:'brightness(1.25)' }}/>
          </div>
          <div style={{ marginLeft:10, overflow:'hidden', opacity:sidebarOpen?1:0, transition:'opacity 0.15s ease', transitionDelay:sidebarOpen?'0.08s':'0s', whiteSpace:'nowrap' }}>
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
      <div style={{ flex:1, marginLeft: sidebarW, transition:'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)', display:'flex', flexDirection:'column', minHeight:'100vh' }}>
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
