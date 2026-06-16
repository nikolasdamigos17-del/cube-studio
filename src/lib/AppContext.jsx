import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [appMode, setAppMode] = useState(null);   // 'master' | 'client' | null
  const [clientUser, setClientUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on page reload
  useEffect(() => {
    try {
      const saved = localStorage.getItem('studio_session');
      if (saved) {
        const session = JSON.parse(saved);
        if (session?.mode) {
          setAppMode(session.mode);
          setClientUser(session.clientUser || null);
        }
      }
    } catch {}
    setIsLoading(false);
  }, []);

  const loginAsMaster = () => {
    const session = { mode: 'master', clientUser: null };
    localStorage.setItem('studio_session', JSON.stringify(session));
    setAppMode('master');
    setClientUser(null);
  };

  const loginAsClient = (client) => {
    // Ensure clientId is always set
    const user = { ...client, clientId: client.clientId || client.id };
    const session = { mode: 'client', clientUser: user };
    localStorage.setItem('studio_session', JSON.stringify(session));
    setAppMode('client');
    setClientUser(user);
  };

  const logout = () => {
    localStorage.removeItem('studio_session');
    setAppMode(null);
    setClientUser(null);
  };

  return (
    <AppContext.Provider value={{
      appMode,
      clientUser,
      loginAsMaster,
      loginAsClient,
      logout,
      isLoading,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
