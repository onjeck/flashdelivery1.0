
import React, { useEffect, useState, Suspense, lazy } from 'react';
import { User, UserRole } from './types';
import { db } from './services/mockDb';
import { Login } from './pages/Login';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { isFirebaseConfigured } from './services/firebaseConfig';
import { auth } from './services/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

// Lazy load dashboard components for better initial load performance
const ClientDashboard = lazy(() => import('./pages/ClientDashboard').then(m => ({ default: m.ClientDashboard })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const DriverDashboard = lazy(() => import('./pages/DriverDashboard').then(m => ({ default: m.DriverDashboard })));

// Loading component for lazy-loaded sections
const DashboardLoader = () => (
  <div className="h-screen flex flex-col items-center justify-center bg-[#F0F4F8] text-[#2563eb] font-bold">
    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
    <div className="text-sm text-gray-600">Carregando dashboard...</div>
  </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Tenta carregar do cache local imediatamente para rapidez
    const storedUser = db.getUser();
    if (storedUser) {
      setUser(storedUser);
    }

    // 2. Se Firebase estiver configurado, escuta mudanças
    if (isFirebaseConfigured) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const currentUser = db.getUser();
          if (currentUser) {
            setUser(currentUser);
          }
        } else {
          setUser(null);
        }
        setIsLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Modo mock: sem Firebase, apenas localStorage
      setIsLoading(false);
      console.log('🧪 Modo de teste: Usando dados mock do localStorage');
    }
  }, []);

  const handleLogin = async (role: UserRole) => {
    // Após o sucesso no Login.tsx, o usuário já está no db.getUser()
    const loggedUser = await db.getUser();
    if (loggedUser) setUser(loggedUser);
  };

  const handleLogout = () => {
    db.logout();
    setUser(null);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#F0F4F8] text-[#2563eb] font-bold">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="font-['Titan_One'] text-2xl animate-pulse uppercase tracking-widest">Sincronizando...</div>
      </div>
    );
  }

  const content = !user ? (
    <Login onLogin={handleLogin} />
  ) : (
    <div className="font-sans text-gray-900 antialiased">
      <Suspense fallback={<DashboardLoader />}>
        {user.role === UserRole.CLIENT && (
          <ClientDashboard 
            user={user} 
            onLogout={handleLogout} 
            onUpdateUser={handleUpdateUser}
          />
        )}
        {user.role === UserRole.ADMIN && (
          <AdminDashboard 
            user={user} 
            onLogout={handleLogout} 
            onUpdateUser={handleUpdateUser}
          />
        )}
        {user.role === UserRole.DRIVER && <DriverDashboard user={user} onLogout={handleLogout} />}
      </Suspense>
    </div>
  );

  return (
    <ThemeProvider>
      <NotificationProvider>
        {content}
      </NotificationProvider>
    </ThemeProvider>
  );
};

export default App;
