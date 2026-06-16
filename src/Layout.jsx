import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Users, Dumbbell, Salad, BarChart2, LogOut, MessageCircle, Sun, Moon, CreditCard, Zap, ChevronRight } from 'lucide-react';
import { useAppContext } from './lib/AppContext';
import { db } from './lib/db';
import { format } from 'date-fns';

const NAV = [
  { label:'Home', icon:Home, path:'/' },
  { label:'Calendar', icon:Calendar, path:'/CalendarPage' },
  { label:'Clients', icon:Users, path:'/Clients' },
  { label:'Training', icon:Dumbbell, path:'/TrainingPlans' },
  { label:'Nutrition', icon:Salad, path:'/Nutrition' },
  { label:'Statistics', icon:BarChart2, path:'/Statistics' },
  { label:'Logistics', icon:CreditCard, path:'/Logistics' },
  { label:'Hevy Sync', icon:Zap, path:'/HevySync' },
  { label:'Messages', icon:MessageCircle, path:'/Messages' },
];

function Clock({ visible }) {
  const [t, setT] = useState(new Date());
  useEffect(()=>{ const i=setInterval(()=>setT(new Date()),1000); return()=>clearInterval(i); },[]);
  if (!visible) return null;
  return (
    <div className="px-4 py-3 border-b border-border">
      <p className="text-xs font-semibold text-foreground tabular-nums tracking-tight">{format(t,'HH:mm:ss')}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{format(t,'EEE d MMM')}</p>
    </div>
  );
}

export default function MasterLayout({ children }) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const { logout } = useAppContext();
  const [unread, setUnread] = useState(0);
  const [dark, setDark] = useState(()=>localStorage.getItem('studio_dark')==='true');

  useEffect(()=>{
    dark ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark');
    localStorage.setItem('studio_dark', dark);
  },[dark]);

  useEffect(()=>{
    const go = async () => {
      const m = await db.Message.filter({sender:'client',read:false});
      setUnread(m.length);
    };
    go(); const iv=setInterval(go,5000); return()=>clearInterval(iv);
  },[]);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        onMouseEnter={()=>setOpen(true)}
        onMouseLeave={()=>setOpen(false)}
        className="fixed top-0 left-0 h-full z-50 flex flex-col border-r border-border bg-card"
        style={{
          width: open ? 220 : 64,
          transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: open ? 'var(--shadow-xl)' : 'var(--shadow-xs)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center h-[60px] px-4 border-b border-border flex-shrink-0 overflow-hidden">
          <div className="w-8 h-8 rounded-xl bg-foreground flex items-center justify-center flex-shrink-0">
            <Dumbbell className="w-4 h-4 text-background" strokeWidth={2.5}/>
          </div>
          <span className="ml-3 font-semibold text-foreground text-sm whitespace-nowrap overflow-hidden"
            style={{opacity:open?1:0,transition:'opacity 0.15s ease',transitionDelay:open?'0.1s':'0s'}}>
            Studio
          </span>
        </div>

        <Clock visible={open}/>

        {/* Nav links */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-hidden overflow-y-auto">
          {NAV.map(({label,icon:Icon,path})=>{
            const active = loc.pathname===path||(path!=='/'&&loc.pathname.startsWith(path));
            const isMsg = path==='/Messages';
            return (
              <Link key={path} to={path}
                className={`flex items-center h-10 rounded-xl overflow-hidden ${active
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                style={{
                  paddingLeft: 12,
                  paddingRight: 8,
                  transition: 'background 0.15s ease, color 0.15s ease',
                  minWidth: 40,
                }}
              >
                <div className="relative flex-shrink-0">
                  <Icon className="w-[18px] h-[18px]" strokeWidth={active?2.5:2}/>
                  {isMsg&&unread>0&&(
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                      {unread>9?'9+':unread}
                    </span>
                  )}
                </div>
                <span className="ml-3 text-sm font-medium whitespace-nowrap"
                  style={{opacity:open?1:0,transition:'opacity 0.15s ease',transitionDelay:open?'0.08s':'0s'}}>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-2 py-3 border-t border-border space-y-0.5 flex-shrink-0">
          <button onClick={()=>setDark(d=>!d)}
            className="flex items-center h-10 w-full rounded-xl px-3 text-muted-foreground hover:bg-muted hover:text-foreground overflow-hidden"
            style={{transition:'background 0.15s ease'}}
          >
            {dark
              ? <Sun className="w-[18px] h-[18px] flex-shrink-0 text-amber-400" strokeWidth={2}/>
              : <Moon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={2}/>
            }
            <span className="ml-3 text-sm font-medium whitespace-nowrap"
              style={{opacity:open?1:0,transition:'opacity 0.15s ease'}}>
              {dark?'Light Mode':'Dark Mode'}
            </span>
          </button>
          <button onClick={logout}
            className="flex items-center h-10 w-full rounded-xl px-3 text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40 overflow-hidden"
            style={{transition:'background 0.15s ease, color 0.15s ease'}}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={2}/>
            <span className="ml-3 text-sm font-medium whitespace-nowrap"
              style={{opacity:open?1:0,transition:'opacity 0.15s ease'}}>
              Sign Out
            </span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen bg-background" style={{marginLeft:64}}>
        {children}
      </main>
    </div>
  );
}
