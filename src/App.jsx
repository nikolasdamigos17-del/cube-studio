import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './lib/AppContext';
import { ThemeProvider } from './lib/ThemeContext';
import { useEffect } from 'react';
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
import RecipePage from './pages/RecipePage';

import ClientHome from './pages/ClientHome';
import ClientTraining from './pages/ClientTraining';
import ClientNutrition from './pages/ClientNutrition';
import ClientStats from './pages/ClientStats';
import ClientFinancial from './pages/ClientFinancial';
import ClientMessages from './pages/ClientMessages';

function AppContent() {
  const { appMode, isLoading } = useAppContext();
  useEffect(() => { seedDemoData(); }, []);

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
    <ThemeProvider>
      <Routes>
        <Route path="/client-home" element={<ClientHome/>}/>
        <Route path="/client-training" element={<ClientTraining/>}/>
        <Route path="/client-nutrition" element={<ClientNutrition/>}/>
        <Route path="/client-stats" element={<ClientStats/>}/>
        <Route path="/client-financial" element={<ClientFinancial/>}/>
        <Route path="/client-messages" element={<ClientMessages/>}/>
        <Route path="/recipe" element={<RecipePage/>}/>
        <Route path="*" element={<Navigate to="/client-home" replace/>}/>
      </Routes>
    </ThemeProvider>
  );

  return (
    <Routes>
      <Route path="/" element={<MasterLayout><Home/></MasterLayout>}/>
      <Route path="/CalendarPage" element={<MasterLayout><CalendarPage/></MasterLayout>}/>
      <Route path="/Clients" element={<MasterLayout><Clients/></MasterLayout>}/>
      <Route path="/ClientProfile" element={<MasterLayout><ClientProfile/></MasterLayout>}/>
      <Route path="/TrainingPlans" element={<MasterLayout><TrainingPlans/></MasterLayout>}/>
      <Route path="/Nutrition" element={<MasterLayout><Nutrition/></MasterLayout>}/>
      <Route path="/Statistics" element={<MasterLayout><Statistics/></MasterLayout>}/>
      <Route path="/Logistics" element={<MasterLayout><Logistics/></MasterLayout>}/>
      <Route path="/Messages" element={<MasterLayout><MasterMessages/></MasterLayout>}/>
      <Route path="/HevySync" element={<MasterLayout><HevySync/></MasterLayout>}/>
      <Route path="/recipe" element={<RecipePage/>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  );
}

export default function App() {
  return <AppProvider><Router><AppContent/></Router></AppProvider>;
}
