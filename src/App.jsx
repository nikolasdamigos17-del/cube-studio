import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './lib/AppContext';
import { ThemeProvider } from './lib/ThemeContext';
import { LangProvider } from './lib/LangContext';
import CubeBackground from './components/CubeBackground';
import PageTransition from './components/PageTransition';
import TranslateLayer from './components/TranslateLayer';
import { useEffect, Component } from 'react';
import { seedDemoData } from './lib/db';

import LoginGate from './pages/LoginGate';
import MasterLayout from './Layout';
import Home from './pages/Home';
import CalendarPage from './pages/CalendarPage';
import Clients from './pages/Clients';
import ClientProfile from './pages/ClientProfile';
import TrainingPlans from './pages/TrainingPlans';
import Nutrition from './pages/Nutrition';
import Statistics from './pages/Statistics';
import Logistics from './pages/Logistics';
import MasterMessages from './pages/MasterMessages';
import HevySync from './pages/HevySync';
import LiveTraining from './pages/LiveTraining';
import RecipePage from './pages/RecipePage';

import ClientHome from './pages/ClientHome';
import ClientTraining from './pages/ClientTraining';
import ClientNutrition from './pages/ClientNutrition';
import ClientStats from './pages/ClientStats';
import ClientFinancial from './pages/ClientFinancial';
import ClientMessages from './pages/ClientMessages';

// ── Error Boundary ─────────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#0a0a0f', color:'#fff', fontFamily:'monospace', padding:32, gap:16 }}>
          <div style={{ fontSize:40 }}>⚠️</div>
          <div style={{ fontSize:18, fontWeight:700, color:'#ef4444' }}>App Error</div>
          <div style={{ fontSize:13, color:'#aaa', maxWidth:600, textAlign:'center', lineHeight:1.6 }}>
            {this.state.error?.message || String(this.state.error)}
          </div>
          <div style={{ fontSize:11, color:'#666', maxWidth:600, textAlign:'left', whiteSpace:'pre-wrap', background:'#111', padding:'12px 16px', borderRadius:8, width:'100%' }}>
            {this.state.error?.stack?.slice(0, 800)}
          </div>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ padding:'10px 24px', background:'#ef4444', border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:14 }}>
            Clear Storage &amp; Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── App Content ────────────────────────────────────────────────────────────────
function AppContent() {
  const { appMode, isLoading } = useAppContext();
  
  useEffect(() => { 
    try { seedDemoData(); } catch(e) { console.error('Seed error:', e); }
  }, []);

  if (isLoading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0a0f' }}>
      <div style={{ width:32, height:32, border:'3px solid rgba(79,142,247,0.3)', borderTop:'3px solid #4f8ef7', borderRadius:'50%', animation:'spin 1s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!appMode) return (
    <Routes>
      <Route path="*" element={<LoginGate />} />
    </Routes>
  );

  if (appMode === 'client') return (
    <ThemeProvider isClient={true}>
      <Routes>
        <Route path="/client-home"      element={<ClientHome/>}/>
        <Route path="/client-training"  element={<ClientTraining/>}/>
        <Route path="/client-nutrition" element={<ClientNutrition/>}/>
        <Route path="/client-stats"     element={<ClientStats/>}/>
        <Route path="/client-financial" element={<ClientFinancial/>}/>
        <Route path="/client-messages"  element={<ClientMessages/>}/>
        <Route path="/recipe"           element={<RecipePage/>}/>
        <Route path="*" element={<Navigate to="/client-home" replace/>}/>
      </Routes>
    </ThemeProvider>
  );

  return (
    <ThemeProvider isClient={false}>
      <Routes>
        <Route path="/"            element={<MasterLayout><Home/></MasterLayout>}/>
        <Route path="/CalendarPage" element={<MasterLayout><CalendarPage/></MasterLayout>}/>
        <Route path="/Clients"     element={<MasterLayout><Clients/></MasterLayout>}/>
        <Route path="/ClientProfile" element={<MasterLayout><ClientProfile/></MasterLayout>}/>
        <Route path="/TrainingPlans" element={<MasterLayout><TrainingPlans/></MasterLayout>}/>
        <Route path="/Nutrition"   element={<MasterLayout><Nutrition/></MasterLayout>}/>
        <Route path="/Statistics"  element={<MasterLayout><Statistics/></MasterLayout>}/>
        <Route path="/Logistics"   element={<MasterLayout><Logistics/></MasterLayout>}/>
        <Route path="/Messages"    element={<MasterLayout><MasterMessages/></MasterLayout>}/>
        <Route path="/HevySync"    element={<MasterLayout><HevySync/></MasterLayout>}/>
        <Route path="/recipe"      element={<RecipePage/>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <LangProvider>
    <ErrorBoundary>
      <AppProvider>
        <Router>
          <CubeBackground/>
          <TranslateLayer/>
          <ErrorBoundary>
            <PageTransition>
              <AppContent/>
            </PageTransition>
          </ErrorBoundary>
        </Router>
      </AppProvider>
    </ErrorBoundary>
    </LangProvider>
  );
}
