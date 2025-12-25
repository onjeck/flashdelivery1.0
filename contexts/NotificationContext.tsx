
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Bell, X, AlertTriangle, CheckCircle, Info, Zap } from 'lucide-react';
import { User, NotificationPreferences } from '../types';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'critical';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  notify: (title: string, message: string, type?: NotificationType, prefKey?: keyof NotificationPreferences) => void;
  requestPermission: () => Promise<boolean>;
  permission: NotificationPermission;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    
    // Periodically sync user from localStorage for preference checks
    const interval = setInterval(() => {
      const stored = localStorage.getItem('flash_current_user');
      if (stored) setCurrentUser(JSON.parse(stored));
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;
    
    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result === 'granted') {
      notify('Notificações Ativadas', 'Você receberá alertas importantes da FlashDelivery.', 'success');
      return true;
    }
    return false;
  };

  const notify = (
    title: string, 
    message: string, 
    type: NotificationType = 'info', 
    prefKey?: keyof NotificationPreferences
  ) => {
    // Check user preferences if a key is provided
    if (prefKey && currentUser?.preferences) {
      if (!currentUser.preferences[prefKey]) {
        console.log(`Notification suppressed by user preference: ${prefKey}`);
        return;
      }
    }

    // 1. App Internal Toast (Always shown)
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, title, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 6000);

    // 2. Native OS Notification
    if (permission === 'granted') {
      // Fix: cast to 'any' because some NotificationOptions properties like 'vibrate' are not in standard TS lib.dom
      const options: any = {
        body: message,
        icon: 'https://cdn-icons-png.flaticon.com/512/732/732200.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/732/732200.png',
        vibrate: type === 'critical' ? [500, 110, 500, 110, 450] : [200, 100, 200],
        tag: id,
        requireInteraction: type === 'critical'
      };

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, options);
        });
      } else {
        new Notification(title, options);
      }
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success': return <CheckCircle className="text-green-500" size={20} />;
      case 'warning': return <AlertTriangle className="text-orange-500" size={20} />;
      case 'error': return <AlertTriangle className="text-red-500" size={20} />;
      case 'critical': return <Zap className="text-red-600 fill-red-600 animate-bounce" size={20} />;
      default: return <Info className="text-blue-500" size={20} />;
    }
  };

  return (
    <NotificationContext.Provider value={{ notify, requestPermission, permission }}>
      {children}
      
      {/* Permission Request Banner */}
      {permission === 'default' && (
        <div className="fixed top-0 left-0 right-0 bg-[#4FC1E9] text-black p-3 z-[1000] flex justify-between items-center text-xs shadow-md border-b-4 border-black font-black uppercase">
           <div className="flex items-center gap-2">
             <Bell size={18} className="animate-bounce"/>
             <span>Ative os alertas nativos para não perder nenhuma entrega!</span>
           </div>
           <button 
             onClick={requestPermission}
             className="bg-white border-2 border-black px-4 py-1 rounded-lg font-black text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all"
           >
             Ativar Agora
           </button>
        </div>
      )}

      {/* Toast Container */}
      <div className="fixed top-16 right-4 z-[9999] space-y-3 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`pointer-events-auto bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 flex items-start gap-3 transform transition-all animate-in slide-in-from-right-full duration-300 ${toast.type === 'critical' ? 'bg-red-50' : ''}`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {getIcon(toast.type)}
            </div>
            <div className="flex-1">
              <h4 className="font-['Titan_One'] text-sm uppercase tracking-tight leading-none mb-1">{toast.title}</h4>
              <p className="text-xs font-bold text-gray-600 leading-tight">{toast.message}</p>
            </div>
            <button 
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-black p-1"
            >
              <X size={16} strokeWidth={3} />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
