import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from './assets/logo-cube.png';
import { Home, Calendar, Users, Dumbbell, Salad, BarChart2, LogOut, MessageCircle, CreditCard, Zap, ChevronDown } from 'lucide-react';
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
  { key:'nav_hevy', icon:Zap, path:'/HevySync' },
  { key:'nav_messages', icon:MessageCircle, path:'/Messages' },
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

function ThemePicker({ open: sidebarOpen }) {
  const { themeName, switchTheme, themes } = useTheme();
  const [open, setOpen] = React.useState(false);
  const dark = Object.entries(themes).filter(([,t])=>t.group==='dark');
  const light = Object.entries(themes).filter(([,t])=>t.group==='light');
  const cur = themes[themeName];
  return (
    <div style={{position:'relative'}}>
      <button onClick={()=>setOpen(v=>!v)}
        className="flex items-center h-10 w-full rounded-xl px-3 text-muted-foreground hover:bg-muted hover:text-foreground overflow-hidden transition-colors gap-3">
        <span className="text-base flex-shrink-0">{cur?.emoji||'🎨'}</span>
        <span className="text-sm font-medium whitespace-nowrap"
          style={{opacity:(open||sidebarOpen)?1:0,transition:'opacity 0.15s ease'}}>
          {cur?.name||'Theme'}
        </span>
      </button>
      {open&&(
        <>
          <div onClick={()=>setOpen(false)} style={{position:'fixed',inset:0,zIndex:99}}/>
          <div style={{position:'fixed',bottom:120,left:68,zIndex:100,background:'hsl(var(--card)/0.96)',
            border:'1px solid hsl(var(--border))',borderRadius:16,padding:'14px',
            boxShadow:'0 8px 40px rgba(0,0,0,0.5)',width:220,backdropFilter:'blur(20px)'}}>
            <p style={{fontSize:9,letterSpacing:'0.16em',color:'hsl(var(--muted-foreground))',textTransform:'uppercase',margin:'0 0 8px 2px'}}>DARK</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5,marginBottom:12}}>
              {dark.map(([k,t])=>(
                <button key={k} onClick={()=>{switchTheme(k);setOpen(false);}} title={t.name}
                  style={{height:34,borderRadius:8,border:themeName===k?'2px solid hsl(var(--primary))':'1px solid hsl(var(--border))',
                    background:k==='dark'?'#1a1a2e':k==='obsidian'?'#1a1500':k==='ocean'?'#020f24':k==='forest'?'#051205':k==='slate'?'#0d1424':k==='aurora'?'#0d0820':k==='crimson'?'#1a0505':'#1a0e05',
                    cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {t.emoji}
                </button>
              ))}
            </div>
            <p style={{fontSize:9,letterSpacing:'0.16em',color:'hsl(var(--muted-foreground))',textTransform:'uppercase',margin:'0 0 8px 2px'}}>LIGHT</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5}}>
              {light.map(([k,t])=>(
                <button key={k} onClick={()=>{switchTheme(k);setOpen(false);}} title={t.name}
                  style={{height:34,borderRadius:8,border:themeName===k?'2px solid hsl(var(--primary))':'1px solid rgba(0,0,0,0.12)',
                    background:k==='light'?'#e8edf5':k==='sand'?'#e9e0cf':k==='rose'?'#f3dfe3':k==='arctic'?'#dbe8fa':k==='mint'?'#dcf2e6':k==='ivory'?'#f2ede4':k==='lavender'?'#ece8f5':'#e0f0fa',
                    cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center'}}>
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


export default function MasterLayout({ children }) {
  const [open, setOpen] = useState(false);
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

  return (
    <div className="min-h-screen bg-background flex">
      {isMobile && (
        <button onClick={() => setOpen(v => !v)}
          className="fixed z-[60] overflow-hidden border border-border"
          style={{ top:10, left:10, width:44, height:44, borderRadius:12, padding:0, background:'#000', boxShadow:'0 4px 18px rgba(0,0,0,0.35)', cursor:'pointer' }}>
          <img src={logo} alt="Menu" className="w-full h-full object-cover" style={{filter:'brightness(1.25)'}}/>
        </button>
      )}
      {isMobile && open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 z-[49]" style={{ background:'rgba(0,0,0,0.45)', backdropFilter:'blur(2px)' }}/>
      )}
      <aside
        onMouseEnter={isMobile ? undefined : () => setOpen(true)}
        onMouseLeave={isMobile ? undefined : () => setOpen(false)}
        className="fixed top-0 left-0 h-full z-50 flex flex-col border-r border-border bg-card"
        style={{
          width: isMobile ? 240 : (open ? 220 : 64),
          transform: isMobile ? (open ? 'translateX(0)' : 'translateX(-110%)') : 'none',
          transition: isMobile ? 'transform 0.28s cubic-bezier(0.4,0,0.2,1)' : 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: open ? 'var(--shadow-xl)' : 'var(--shadow-xs)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center h-[60px] px-4 border-b border-border flex-shrink-0 overflow-hidden">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0" style={{background:'#000'}}>
            <img src={logo} alt="The Cube" className="w-full h-full object-cover" style={{filter:'brightness(1.25)'}}/>
          </div>
          <div className="ml-3 overflow-hidden" style={{ opacity: (open||isMobile) ? 1 : 0, transition: 'opacity 0.15s ease', transitionDelay: open ? '0.1s' : '0s' }}>
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
              <Link key={path} to={path} onClick={() => isMobile && setOpen(false)}
                className={`flex items-center h-10 rounded-xl overflow-hidden ${active ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                style={{ paddingLeft: 12, paddingRight: 8, transition: 'background 0.15s ease, color 0.15s ease' }}
              >
                <div className="relative flex-shrink-0">
                  <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.5 : 2} />
                  {badge > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">{badge > 9 ? '9+' : badge}</span>}
                </div>
                <span className="ml-3 text-sm font-medium whitespace-nowrap" style={{ opacity: (open||isMobile) ? 1 : 0, transition: 'opacity 0.15s ease', transitionDelay: open ? '0.08s' : '0s' }}>{tr(key)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-2 py-3 border-t border-border space-y-0.5 flex-shrink-0">
          <ThemePicker open={open} />
          <LangToggle open={open} />
          <button onClick={logout}
            className="flex items-center h-10 w-full rounded-xl px-3 text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40 overflow-hidden transition-colors">
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={2} />
            <span className="ml-3 text-sm font-medium whitespace-nowrap" style={{ opacity: open ? 1 : 0, transition: 'opacity 0.15s ease' }}>Sign Out</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 min-h-screen bg-background" style={{ marginLeft: isMobile ? 0 : 64, paddingTop: isMobile ? 56 : 0 }}>{children}</main>
    </div>
  );
}
