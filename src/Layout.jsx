import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import logo from './assets/logo-cube.png';
import BarbellNav, { BarbellDock, useBarColors } from './components/BarbellNav';
import ThemeSwatch from './components/ThemeSwatch';
import ApiSettingsModal from './components/ApiSettingsModal';
import { Home, Calendar, Users, Dumbbell, Salad, BarChart2, LogOut, MessageCircle, CreditCard, ChevronDown, MoreHorizontal, X, Settings, Globe, Key } from 'lucide-react';
import { useAppContext } from './lib/AppContext';
import { db } from './lib/db';
import { format } from 'date-fns';
import { useTheme, MASTER_THEMES } from './lib/ThemeContext';
import { useLang } from './lib/LangContext';

const NAV = [
  { key:'nav_home', icon:Home, path:'/' },
  { key:'nav_calendar', icon:Calendar, path:'/CalendarPage' },
  { key:'nav_clients', icon:Users, path:'/Clients' },
  { key:'nav_training', icon:Dumbbell, path:'/TrainingPlans' },
  { key:'nav_nutrition', icon:Salad, path:'/Nutrition' },
  { key:'nav_statistics', icon:BarChart2, path:'/Statistics' },
  { key:'nav_logistics', icon:CreditCard, path:'/Logistics' },
  { key:'nav_messages', icon:MessageCircle, path:'/Messages' },
];

// Mobile bottom-bar: 4 primary tabs + a "More" button that opens the rest
const BOTTOM_NAV = [
  { key:'nav_home', icon:Home, path:'/' },
  { key:'nav_nutrition', icon:Salad, path:'/Nutrition' },
  { key:'nav_messages', icon:MessageCircle, path:'/Messages' },
];
const MORE_NAV = [
  { key:'nav_clients', icon:Users, path:'/Clients' },
  { key:'nav_training', icon:Dumbbell, path:'/TrainingPlans' },
  { key:'nav_calendar', icon:Calendar, path:'/CalendarPage' },
  { key:'nav_statistics', icon:BarChart2, path:'/Statistics' },
  { key:'nav_logistics', icon:CreditCard, path:'/Logistics' },
];

function Clock({ visible }) {
  const [t, setT] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i); }, []);
  if (!visible) return null;
  return (
    <div className="px-4 py-2.5 border-b border-border">
      <p className="text-xs font-semibold text-foreground tabular-nums">{format(t, 'HH:mm:ss')}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{format(t, 'EEE, d MMM')}</p>
    </div>
  );
}

/* Desktop sidebar → Settings (theme + language together).
   Portalled to <body> with fixed coordinates: inside the sidebar it landed in
   the aside's stacking context, and it also disappeared the moment the pointer
   left the aside and collapsed it. */
function DesktopSettings({ open: sidebarOpen, onHoldOpen }) {
  const { themeName, switchTheme, themes, cubeOff, toggleCubeOff } = useTheme();
  const { lang, toggle } = useLang();
  const [open, setOpen] = React.useState(false);
  const [apiOpen, setApiOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ left:74, bottom:16 });
  const btnRef = React.useRef(null);
  const dark = Object.entries(themes).filter(([, t]) => t.group === 'dark');
  const light = Object.entries(themes).filter(([, t]) => t.group === 'light');

  const place = React.useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ left: r.right + 10, bottom: Math.max(12, window.innerHeight - r.bottom) });
  }, []);

  React.useEffect(() => {
    onHoldOpen?.(open);
    if (!open) return;
    place();
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('resize', place);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('keydown', onKey); };
  }, [open, place, onHoldOpen]);

  return (
    <>
      <button ref={btnRef} onClick={() => setOpen(v => !v)}
        className="flex items-center h-10 w-full rounded-xl px-3 text-muted-foreground hover:bg-muted hover:text-foreground overflow-hidden transition-colors gap-3"
        style={open ? { background:'hsl(var(--muted))', color:'hsl(var(--foreground))' } : undefined}>
        <Settings className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={2}/>
        <span className="text-sm font-medium whitespace-nowrap"
          style={{ opacity: sidebarOpen ? 1 : 0, transition:'opacity .15s ease' }}>Ρυθμίσεις</span>
      </button>

      {open && createPortal(
        <>
          <div onClick={() => setOpen(false)} style={{ position:'fixed', inset:0, zIndex:120 }}/>
          <div style={{ position:'fixed', left:pos.left, bottom:pos.bottom, zIndex:121,
            width:260, padding:14, borderRadius:16,
            background:'hsl(var(--card))', border:'1px solid hsl(var(--border))',
            boxShadow:'0 16px 48px rgba(0,0,0,.5)', color:'hsl(var(--foreground))' }}>
            <p className="text-[9px] font-bold uppercase tracking-[.15em] mb-2"
              style={{ color:'hsl(var(--muted-foreground))' }}>Γλώσσα</p>
            <div style={{ display:'flex', gap:6, marginBottom:14 }}>
              {[['en','🇬🇧 English'], ['el','🇬🇷 Ελληνικά']].map(([code, label]) => (
                <button key={code} onClick={() => lang !== code && toggle()}
                  style={{ flex:1, padding:'8px 0', borderRadius:10, cursor:'pointer',
                    fontSize:11.5, fontWeight:600,
                    border: lang === code ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
                    background: lang === code ? 'hsl(var(--primary)/0.12)' : 'transparent',
                    color: lang === code ? 'hsl(var(--primary))' : 'hsl(var(--foreground))' }}>
                  {label}
                </button>
              ))}
            </div>

            <p className="text-[9px] font-bold uppercase tracking-[.15em] mb-2"
              style={{ color:'hsl(var(--muted-foreground))' }}>Θέμα · Dark</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:12 }}>
              {dark.map(([k, t]) => (
                <ThemeSwatch key={k} name={k} isDark active={themeName === k}
                  size={34} title={t.name} onClick={() => switchTheme(k)}/>
              ))}
            </div>
            <p className="text-[9px] font-bold uppercase tracking-[.15em] mb-2"
              style={{ color:'hsl(var(--muted-foreground))' }}>Θέμα · Light</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
              {light.map(([k, t]) => (
                <ThemeSwatch key={k} name={k} isDark={false} active={themeName === k}
                  size={34} title={t.name} onClick={() => switchTheme(k)}/>
              ))}
            </div>
            <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid hsl(var(--border))', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
              <div>
                <p className="text-[11px] font-bold" style={{ color:'hsl(var(--foreground))', margin:0 }}>Cube off</p>
                <p className="text-[9px]" style={{ color:'hsl(var(--muted-foreground))', margin:0 }}>Χωρίς κύβο στο φόντο</p>
              </div>
              <button onClick={toggleCubeOff} aria-pressed={cubeOff} title="Cube off"
                style={{ width:42, height:24, borderRadius:999, border:'none', cursor:'pointer', position:'relative', flexShrink:0,
                  background: cubeOff ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground)/0.3)', transition:'background .2s' }}>
                <span style={{ position:'absolute', top:3, left: cubeOff ? 21 : 3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.3)' }}/>
              </button>
            </div>
            <button onClick={() => { setApiOpen(true); setOpen(false); }}
              style={{ marginTop:12, width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                borderRadius:12, cursor:'pointer', border:'1px solid hsl(var(--border))', background:'hsl(var(--muted))',
                color:'hsl(var(--foreground))' }}>
              <Key size={16} style={{ color:'hsl(var(--primary))' }}/>
              <span style={{ fontSize:12.5, fontWeight:700 }}>Ενσωματώσεις / API</span>
            </button>
          </div>
        </>, document.body)}
      {apiOpen && <ApiSettingsModal onClose={() => setApiOpen(false)} />}
    </>
  );
}

function BottomBar({ unread, requests }) {
  const loc = useLocation();
  const { tr, lang, toggle } = useLang();
  const { logout } = useAppContext();
  const { themeName, switchTheme, themes, cubeOff, toggleCubeOff } = useTheme();
  const [moreOpen, setMoreOpen] = useState(false);
  const [apiOpen, setApiOpen] = useState(false);
  const [moreTab, setMoreTab] = useState('menu'); // 'menu' | 'settings'
  const { accent, tab: tabActive, idle, idleLabel } = useBarColors();
  const isActive = (path) => loc.pathname === path || (path !== '/' && loc.pathname.startsWith(path));
  const moreActive = MORE_NAV.some(n => isActive(n.path));

  const darkThemes = Object.entries(themes).filter(([,t])=>t.group==='dark');
  const lightThemes = Object.entries(themes).filter(([,t])=>t.group==='light');

  return createPortal(
    <>
      {/* ── More / Settings sheet ── */}
      {moreOpen && (
        <>
          <div onClick={() => setMoreOpen(false)}
            className="fixed inset-0 z-[70]" style={{ background:'rgba(0,0,0,0.55)', backdropFilter:'blur(3px)' }}/>
          <div className="fixed left-0 right-0 z-[71]" style={{
            bottom:0, background:'hsl(var(--card))', borderTopLeftRadius:24, borderTopRightRadius:24,
            borderTop:'1px solid hsl(var(--border))', padding:'10px 16px calc(20px + env(safe-area-inset-bottom))',
            boxShadow:'0 -8px 40px rgba(0,0,0,0.5)', animation:'sheetUp 0.26s cubic-bezier(0.22,1,0.36,1)',
            maxHeight:'80vh', overflowY:'auto' }}>
            <style>{`@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
            <div style={{width:38,height:4,borderRadius:4,background:'hsl(var(--muted-foreground)/0.3)',margin:'4px auto 14px'}}/>

            {/* Tab switcher */}
            <div style={{display:'flex',gap:4,padding:4,borderRadius:14,background:'hsl(var(--muted)/0.5)',marginBottom:16}}>
              <button onClick={()=>setMoreTab('menu')}
                style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px',
                  borderRadius:11,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,
                  background:moreTab==='menu'?'hsl(var(--card))':'transparent',
                  color:moreTab==='menu'?'hsl(var(--foreground))':'hsl(var(--muted-foreground))',
                  boxShadow:moreTab==='menu'?'0 1px 4px rgba(0,0,0,0.15)':'none',transition:'all 0.2s'}}>
                <MoreHorizontal className="w-4 h-4"/> Menu
              </button>
              <button onClick={()=>setMoreTab('settings')}
                style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px',
                  borderRadius:11,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,
                  background:moreTab==='settings'?'hsl(var(--card))':'transparent',
                  color:moreTab==='settings'?'hsl(var(--foreground))':'hsl(var(--muted-foreground))',
                  boxShadow:moreTab==='settings'?'0 1px 4px rgba(0,0,0,0.15)':'none',transition:'all 0.2s'}}>
                <Settings className="w-4 h-4"/> {tr('nav_settings')||'Settings'}
              </button>
            </div>

            {/* ── MENU tab ── */}
            {moreTab==='menu' && (
              <>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {MORE_NAV.map(({ key, icon:Icon, path }) => {
                    const active = isActive(path);
                    const badge = path==='/Messages' ? unread : 0;
                    return (
                      <Link key={path} to={path} onClick={()=>setMoreOpen(false)}
                        className="flex flex-col items-center justify-center gap-1.5 rounded-2xl py-4"
                        style={{ background: active?'hsl(var(--primary)/0.14)':'hsl(var(--muted)/0.5)',
                          color: active?'hsl(var(--primary))':'hsl(var(--foreground))', position:'relative' }}>
                        <Icon className="w-5 h-5" strokeWidth={active?2.4:2}/>
                        <span className="text-[11px] font-medium text-center leading-tight px-1">{tr(key)}</span>
                        {badge>0 && <span className="absolute top-2 right-3 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">{badge>9?'9+':badge}</span>}
                      </Link>
                    );
                  })}
                </div>
                <button onClick={logout}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold"
                  style={{background:'rgba(239,68,68,0.12)',color:'#ef4444'}}>
                  <LogOut className="w-4 h-4"/> Sign Out
                </button>
              </>
            )}

            {/* ── SETTINGS tab ── */}
            {moreTab==='settings' && (
              <>
                {/* Language */}
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2 px-1" style={{color:'hsl(var(--muted-foreground))'}}>
                  <Globe className="w-3 h-3 inline mr-1 -mt-0.5"/>Language
                </p>
                <div className="flex gap-2 mb-5">
                  <button onClick={()=>lang!=='en'&&toggle()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
                    style={{border:lang==='en'?'2px solid hsl(var(--primary))':'1px solid hsl(var(--border))',
                      background:lang==='en'?'hsl(var(--primary)/0.12)':'hsl(var(--muted)/0.4)',
                      color:lang==='en'?'hsl(var(--primary))':'hsl(var(--foreground))'}}>
                    🇬🇧 English
                  </button>
                  <button onClick={()=>lang!=='el'&&toggle()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
                    style={{border:lang==='el'?'2px solid hsl(var(--primary))':'1px solid hsl(var(--border))',
                      background:lang==='el'?'hsl(var(--primary)/0.12)':'hsl(var(--muted)/0.4)',
                      color:lang==='el'?'hsl(var(--primary))':'hsl(var(--foreground))'}}>
                    🇬🇷 Ελληνικά
                  </button>
                </div>

                {/* Theme */}
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2 px-1" style={{color:'hsl(var(--muted-foreground))'}}>Theme · Dark</p>
                <div className="grid grid-cols-8 gap-1.5 mb-3">
                  {darkThemes.map(([k,t])=>(
                    <ThemeSwatch key={k} name={k} isDark active={themeName===k}
                      title={t.name} onClick={()=>switchTheme(k)}/>
                  ))}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2 px-1" style={{color:'hsl(var(--muted-foreground))'}}>Theme · Light</p>
                <div className="grid grid-cols-8 gap-1.5 mb-2">
                  {lightThemes.map(([k,t])=>(
                    <ThemeSwatch key={k} name={k} isDark={false} active={themeName===k}
                      title={t.name} onClick={()=>switchTheme(k)}/>
                  ))}
                </div>
                <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid hsl(var(--border))', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                  <div>
                    <p className="text-[13px] font-bold" style={{ color:'hsl(var(--foreground))', margin:0 }}>Cube off</p>
                    <p className="text-[11px]" style={{ color:'hsl(var(--muted-foreground))', margin:0 }}>Χωρίς κύβο στο φόντο</p>
                  </div>
                  <button onClick={toggleCubeOff} aria-pressed={cubeOff} title="Cube off"
                    style={{ width:48, height:28, borderRadius:999, border:'none', cursor:'pointer', position:'relative', flexShrink:0,
                      background: cubeOff ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground)/0.3)', transition:'background .2s' }}>
                    <span style={{ position:'absolute', top:3, left: cubeOff ? 23 : 3, width:22, height:22, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.3)' }}/>
                  </button>
                </div>
                <button onClick={()=>{ setApiOpen(true); setMoreOpen(false); }}
                  className="w-full mt-3 flex items-center gap-3 py-3 px-3 rounded-2xl"
                  style={{ background:'hsl(var(--muted)/0.5)', color:'hsl(var(--foreground))' }}>
                  <Key size={18} style={{ color:'hsl(var(--primary))' }}/>
                  <span className="text-sm font-semibold">Ενσωματώσεις / API</span>
                </button>
              </>
            )}

            <button onClick={()=>setMoreOpen(false)}
              className="w-full mt-4 py-3 rounded-2xl text-sm font-semibold"
              style={{ background:'hsl(var(--muted)/0.5)', color:'hsl(var(--muted-foreground))' }}>
              Close
            </button>
          </div>
        </>
      )}

      {apiOpen && <ApiSettingsModal onClose={() => setApiOpen(false)} />}

      {/* ── Barbell bezel: opaque base, content never passes behind it ── */}
      <BarbellDock>
        <BarbellNav>
          {BOTTOM_NAV.map(({ key, icon:Icon, path }) => {
              const active = isActive(path);
              const badge = path==='/Messages' ? unread : 0;
              return (
                <Link key={path} to={path}
                  className="flex-1 flex flex-col items-center justify-center relative"
                  style={{ color: active?tabActive:idle, transition:'color 0.15s ease',
                    gap:1.5, textDecoration:'none' }}>
                  <div className="relative">
                    <Icon style={{width:'clamp(15px,4.2vw,18px)',height:'clamp(15px,4.2vw,18px)'}} strokeWidth={active?2.7:2.2}/>
                    {badge>0 && <span className="absolute -top-1.5 -right-2 rounded-full text-white flex items-center justify-center" style={{width:14,height:14,fontSize:8,fontWeight:700,background:tabActive}}>{badge>9?'9+':badge}</span>}
                  </div>
                  <span style={{fontSize:'clamp(6px,1.85vw,8px)',fontWeight:700,letterSpacing:'-0.02em',
                    textTransform:'uppercase',lineHeight:1,color:active?tabActive:idleLabel,whiteSpace:'nowrap'}}>{tr(key)}</span>
                  {active && <div style={{position:'absolute',bottom:-3,width:'56%',height:2.5,borderRadius:3,background:tabActive}}/>}
                </Link>
              );
            })}
            <button onClick={()=>setMoreOpen(v=>!v)}
              className="flex-1 flex flex-col items-center justify-center relative"
              style={{ color: moreActive||moreOpen?tabActive:idle, gap:1.5, background:'transparent', border:'none', cursor:'pointer' }}>
              <div className="relative">
                <MoreHorizontal style={{width:'clamp(15px,4.2vw,18px)',height:'clamp(15px,4.2vw,18px)'}} strokeWidth={moreActive?2.7:2.2}/>
                {unread>0 && <span className="absolute -top-1.5 -right-2 rounded-full" style={{width:8,height:8,background:tabActive}}/>}
              </div>
              <span style={{fontSize:'clamp(6px,1.85vw,8px)',fontWeight:700,letterSpacing:'-0.02em',
                textTransform:'uppercase',lineHeight:1,color:moreActive||moreOpen?tabActive:idleLabel}}>More</span>
              {(moreActive||moreOpen) && <div style={{position:'absolute',bottom:-3,width:'56%',height:2.5,borderRadius:3,background:tabActive}}/>}
            </button>
        </BarbellNav>
      </BarbellDock>
    </>,
    document.body
  );
}


export default function MasterLayout({ children }) {
  const [open, setOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  const loc = useLocation();
  const { logout } = useAppContext();
  const { tr } = useLang();
  const [unread, setUnread] = useState(0);
  const [requests, setRequests] = useState(0);

  useEffect(() => {
    const go = async () => {
      const [m, r] = await Promise.all([
        db.Message.filter({ sender: 'client', read: false }),
        db.AppointmentRequest.filter({ status: 'pending' }),
      ]);
      setUnread(m.length);
      setRequests(r.length);
    };
    go(); const iv = setInterval(go, 5000); return () => clearInterval(iv);
  }, []);

  // ── MOBILE: bottom navigation bar layout ──
  if (isMobile) {
    return (
      <>
        <div className="app-viewport bg-background">{children}</div>
        <BottomBar unread={unread} requests={requests} />
      </>
    );
  }

  // ── DESKTOP: collapsible sidebar layout ──
  return (
    <div className="min-h-screen bg-background flex">
      <aside
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => { if (!pinOpen) setOpen(false); }}
        className="fixed top-0 left-0 h-full z-50 flex flex-col border-r border-border bg-card"
        style={{
          width: open ? 220 : 64,
          transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: open ? 'var(--shadow-xl)' : 'var(--shadow-xs)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center h-[60px] px-4 border-b border-border flex-shrink-0 overflow-hidden">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0" style={{background:'#000'}}>
            <img src={logo} alt="The Cube" className="w-full h-full object-cover" style={{filter:'brightness(1.25)'}}/>
          </div>
          <div className="ml-3 overflow-hidden" style={{ opacity: open ? 1 : 0, transition: 'opacity 0.15s ease', transitionDelay: open ? '0.1s' : '0s' }}>
            <p className="font-bold text-foreground text-sm whitespace-nowrap leading-tight" style={{ fontFamily: 'var(--font-display)' }}>Cube</p>
            <p className="text-[9px] text-muted-foreground whitespace-nowrap leading-tight tracking-wide uppercase">Personal Training</p>
          </div>
        </div>

        <Clock visible={open} />

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-hidden">
          {NAV.map(({ key, icon: Icon, path }) => {
            const active = loc.pathname === path || (path !== '/' && loc.pathname.startsWith(path));
            const isMsg = path === '/Messages';
            const isCalendar = path === '/CalendarPage';
            const badge = isMsg ? unread : isCalendar ? requests : 0;
            return (
              <Link key={path} to={path}
                className={`flex items-center h-10 rounded-xl overflow-hidden ${active ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                style={{ paddingLeft: 12, paddingRight: 8, transition: 'background 0.15s ease, color 0.15s ease' }}
              >
                <div className="relative flex-shrink-0">
                  <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.5 : 2} />
                  {badge > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">{badge > 9 ? '9+' : badge}</span>}
                </div>
                <span className="ml-3 text-sm font-medium whitespace-nowrap" style={{ opacity: open ? 1 : 0, transition: 'opacity 0.15s ease', transitionDelay: open ? '0.08s' : '0s' }}>{tr(key)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-2 py-3 border-t border-border space-y-0.5 flex-shrink-0">
          <DesktopSettings open={open} onHoldOpen={setPinOpen} />
          <button onClick={logout}
            className="flex items-center h-10 w-full rounded-xl px-3 text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40 overflow-hidden transition-colors">
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={2} />
            <span className="ml-3 text-sm font-medium whitespace-nowrap" style={{ opacity: open ? 1 : 0, transition: 'opacity 0.15s ease' }}>Sign Out</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 min-h-screen bg-background" style={{ marginLeft: 64 }}>{children}</main>
    </div>
  );
}
