
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { User, Order, OrderStatus, RouteStop, TrafficLevel, Coordinates, PaymentStatus, NotificationPreferences } from '../types';
import { db } from '../services/mockDb';
import { socketService, SocketEvent } from '../services/socketService';
import { RouteService } from '../services/routeService'; 
import { openWhatsApp, WhatsAppTemplates, CENTRAL_SUPPORT_PHONE } from '../services/whatsappUtils';
import { useNotification } from '../contexts/NotificationContext';
import { GeoService } from '../services/geoService';
import { 
  LogOut, Bike, MapPin, Navigation, CheckCircle, Package, DollarSign, Settings, 
  X, User as UserIcon, MessageCircle, MessageSquare, Zap, History, Wallet, 
  CreditCard, List, TrendingUp, Target, Bell, AlertCircle, BellRing, Compass, ExternalLink,
  Navigation2, Map as MapIcon, Loader2, Save, Key, Building
} from 'lucide-react';
import { MapMock } from '../components/MapMock';
import { ChatModal } from '../components/ChatModal';

interface Props {
  user: User;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
}

export const DriverDashboard: React.FC<Props> = ({ user, onLogout, onUpdateUser }) => {
  const { notify, requestPermission, permission } = useNotification();
  
  const [viewMode, setViewMode] = useState<'home' | 'history' | 'finance'>('home');
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(user.location || null);
  const watchIdRef = useRef<number | null>(null);
  
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [routeItinerary, setRouteItinerary] = useState<RouteStop[]>([]);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  
  const [activeChatOrderId, setActiveChatOrderId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(user.isOnline || false);
  const [showProfile, setShowProfile] = useState(false);
  const [stopToConfirm, setStopToConfirm] = useState<RouteStop | null>(null);
  const [navigationStop, setNavigationStop] = useState<RouteStop | null>(null);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  // Profile Payment States
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'debito'>(user.paymentMethod || 'pix');
  const [pixKey, setPixKey] = useState(user.pixKey || '');
  const [bankAccount, setBankAccount] = useState(user.bankAccount || '');

  const fetchDriverData = async () => {
    try {
      const allOrders = await db.getOrders();
      
      const myActive = allOrders.filter(o => 
        o.driverId === user.id && 
        [OrderStatus.ACCEPTED, OrderStatus.ON_WAY, OrderStatus.COLLECTED].includes(o.status)
      );
      setActiveOrders(myActive);

      const newAvailable = allOrders.filter(o => o.driverId === user.id && o.status === OrderStatus.ASSIGNED);
      setAvailableOrders(newAvailable);

      const history = allOrders.filter(o => 
        o.driverId === user.id && 
        [OrderStatus.DELIVERED, OrderStatus.CANCELED].includes(o.status)
      ).sort((a, b) => b.createdAt - a.createdAt);
      setHistoryOrders(history);

      const loc = currentLocation || user.location || { lat: -23.5505, lng: -46.6333 };
      if (myActive.length > 0) {
        const optimized = RouteService.optimizeRoute(loc, myActive);
        setRouteItinerary(optimized);
      } else {
        setRouteItinerary([]);
      }
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    fetchDriverData();
    const unsubUpdate = socketService.on<Order>(SocketEvent.ORDER_UPDATED, (order) => {
      fetchDriverData();
      if (order.driverId === user.id && order.status === OrderStatus.ASSIGNED) {
         notify('Nova Entrega!', `Central te escalou para um pedido de ${order.clientName}.`, 'success', 'newOrders');
      }
    });
    const unsubChat = socketService.on(SocketEvent.CHAT_MESSAGE, () => fetchDriverData());
    
    if (isOnline) {
      watchIdRef.current = GeoService.watchLocation((coords) => {
        setCurrentLocation(coords);
        db.updateUser(user.id, { location: coords });
      });
    }

    return () => {
      unsubUpdate(); unsubChat();
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [user.id, isOnline]);

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    const newPrefs = { ...user.preferences, [key]: value };
    const updated = await db.updateUser(user.id, { preferences: newPrefs as any });
    onUpdateUser(updated);
    notify('Preferências', 'Suas notificações foram atualizadas.', 'success');
  };

  const handleSavePaymentData = async () => {
    setIsSavingPayment(true);
    try {
      const updated = await db.updateUser(user.id, { 
        paymentMethod, 
        pixKey, 
        bankAccount 
      });
      onUpdateUser(updated);
      notify('Sucesso', 'Dados de pagamento atualizados.', 'success');
    } catch (e) {
      notify('Erro', 'Falha ao salvar dados.', 'error');
    } finally {
      setIsSavingPayment(false);
    }
  };

  const financeStats = useMemo(() => {
    const delivered = historyOrders.filter(o => o.status === OrderStatus.DELIVERED);
    const total = delivered.reduce((acc, curr) => acc + (curr.price || 0), 0);
    const pending = delivered.filter(o => o.driverPaymentStatus !== PaymentStatus.PAID).reduce((acc, curr) => acc + (curr.price || 0), 0);
    return { total, pending, list: delivered };
  }, [historyOrders]);

  const toggleOnline = async () => {
    const newState = !isOnline;
    setIsOnline(newState);
    await db.toggleDriverStatus(user.id, newState);
  };

  const handleAccept = async (orderId: string) => {
    await db.updateOrder(orderId, { status: OrderStatus.ON_WAY }); 
    notify('Corrida Aceita!', 'A caminho da coleta.', 'success');
    fetchDriverData();
  };

  const confirmStopCompletion = async () => {
    if (!stopToConfirm) return;
    const isPickup = stopToConfirm.type === 'PICKUP';
    await db.updateOrder(stopToConfirm.orderId, { status: isPickup ? OrderStatus.COLLECTED : OrderStatus.DELIVERED });
    setStopToConfirm(null);
    setNavigationStop(null);
    notify('Sucesso!', isPickup ? 'Coleta concluída.' : 'Entrega finalizada!', 'success');
    fetchDriverData();
  };

  const openExternalGps = (stop: RouteStop, platform: 'google' | 'waze') => {
    const { lat, lng } = stop.coordinates;
    const url = platform === 'google' 
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=motorcycle`
      : `waze://?ll=${lat},${lng}&navigate=yes`;
    window.open(url, '_blank');
  };

  const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-black p-3 flex justify-around items-center z-30 shadow-[0_-5px_10px_rgba(0,0,0,0.1)]">
       <button className={`flex flex-col items-center ${viewMode === 'home' ? 'text-[#FFCE54]' : 'text-gray-400'}`} onClick={() => setViewMode('home')}>
         <Navigation size={24} /><span className="text-[10px] font-black uppercase mt-1">Rotas</span>
       </button>
       <button className={`flex flex-col items-center ${viewMode === 'finance' ? 'text-[#A0D468]' : 'text-gray-400'}`} onClick={() => setViewMode('finance')}>
         <Wallet size={24} /><span className="text-[10px] font-black uppercase mt-1">Caixa</span>
       </button>
       <button className={`flex flex-col items-center ${viewMode === 'history' ? 'text-[#4FC1E9]' : 'text-gray-400'}`} onClick={() => setViewMode('history')}>
         <History size={24} /><span className="text-[10px] font-black uppercase mt-1">Histórico</span>
       </button>
       <button className="flex flex-col items-center text-gray-400" onClick={() => setShowProfile(true)}>
         <UserIcon size={24} /><span className="text-[10px] font-black uppercase mt-1">Perfil</span>
       </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex flex-col pb-20 font-['Nunito']">
      {viewMode === 'finance' && (
        <div className="flex-1 animate-in slide-in-from-bottom-5">
           <div className="bg-[#A0D468] p-6 border-b-4 border-black sticky top-0 z-20 shadow-md flex items-center gap-3">
              <img src="/flashdelivery.png" alt="Flash Delivery logo" className="w-16 h-16 object-contain" />
              <h1 className="font-['Titan_One'] text-2xl flex items-center gap-2"><Wallet size={28}/> MEU CAIXA</h1>
           </div>
           <div className="p-4 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white p-4 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1">A Receber</p>
                    <p className="text-2xl font-['Titan_One'] text-orange-500">R$ {financeStats.pending.toFixed(2)}</p>
                 </div>
                 <div className="bg-white p-4 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Total Ganho</p>
                    <p className="text-2xl font-['Titan_One'] text-green-600">R$ {financeStats.total.toFixed(2)}</p>
                 </div>
              </div>

              <div className="bg-blue-50 border-2 border-black border-dashed p-4 rounded-2xl flex items-center gap-4">
                 <div className="bg-blue-500 text-white p-3 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"><CreditCard size={24}/></div>
                 <div className="flex-1">
                    <p className="text-xs font-black uppercase">Acerto pendente?</p>
                    <button onClick={() => openWhatsApp(CENTRAL_SUPPORT_PHONE, WhatsAppTemplates.toSupport('Motoboy', user.name))} className="text-[10px] font-black text-blue-600 underline uppercase mt-1">Falar com a Central</button>
                 </div>
              </div>

              <div className="space-y-3">
                 <h3 className="font-black text-sm uppercase flex items-center gap-2 px-1"><TrendingUp size={16}/> Últimos Ganhos</h3>
                 {financeStats.list.length === 0 ? (
                    <div className="text-center py-20 opacity-30 italic font-bold">Nenhum ganho registrado.</div>
                 ) : (
                    financeStats.list.map(order => (
                      <div key={order.id} className="bg-white p-4 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center">
                         <div className="min-w-0 pr-2">
                            <p className="text-[10px] font-black text-gray-400 uppercase">#{order.id.slice(-4)} · {new Date(order.createdAt).toLocaleDateString()}</p>
                            <p className="text-xs font-black truncate">{order.dropoffAddress}</p>
                         </div>
                         <div className="text-right whitespace-nowrap">
                            <p className="font-black text-lg">R$ {order.price?.toFixed(2)}</p>
                            <div className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${order.driverPaymentStatus === PaymentStatus.PAID ? 'bg-green-100 border-green-500 text-green-700' : 'bg-orange-100 border-orange-500 text-orange-700'}`}>
                               {order.driverPaymentStatus === PaymentStatus.PAID ? '✓ Acertado' : '⏳ Pendente'}
                            </div>
                         </div>
                      </div>
                    ))
                 )}
              </div>
           </div>
        </div>
      )}

      {viewMode === 'history' && (
        <div className="flex-1 animate-in slide-in-from-bottom-5">
           <div className="bg-[#4FC1E9] p-6 border-b-4 border-black sticky top-0 z-20 shadow-md flex items-center gap-3">
              <img src="/flashdelivery.png" alt="Flash Delivery logo" className="w-16 h-16 object-contain" />
              <h1 className="font-['Titan_One'] text-2xl flex items-center gap-2"><History size={28}/> MEU HISTÓRICO</h1>
           </div>
           <div className="p-4 space-y-4">
              {historyOrders.length === 0 ? (
                 <div className="text-center py-20 opacity-30 italic font-bold text-black">Nenhuma corrida finalizada.</div>
              ) : (
                historyOrders.map(order => (
                  <div key={order.id} className="bg-white p-4 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-3">
                     <div className="flex justify-between items-start">
                        <div>
                           <p className="text-[10px] font-black text-gray-400 uppercase">#{order.id.slice(-4)} · {new Date(order.createdAt).toLocaleDateString()}</p>
                           <h4 className="font-black text-sm uppercase">{order.clientName}</h4>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border-2 border-black ${order.status === OrderStatus.DELIVERED ? 'bg-[#A0D468]' : 'bg-[#ED5565] text-white'}`}>
                           {order.status === OrderStatus.DELIVERED ? 'Entregue' : 'Cancelada'}
                        </span>
                     </div>
                     <div className="bg-gray-50 border-2 border-black border-dashed p-2 rounded-lg flex items-center gap-2">
                        <MapPin size={12} className="text-red-500" />
                        <p className="text-[10px] font-bold truncate">{order.dropoffAddress}</p>
                     </div>
                     <div className="flex justify-between items-center pt-1">
                        <p className="font-['Titan_One'] text-lg">R$ {order.price?.toFixed(2)}</p>
                        <button onClick={() => setActiveChatOrderId(order.id)} className="text-[10px] font-black uppercase underline flex items-center gap-1"><MessageSquare size={12}/> Ver Chat</button>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>
      )}

      {viewMode === 'home' && (
        <div className="flex-1 flex flex-col">
          {!isOnline ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50">
               <div className="bg-white border-4 border-black p-8 rounded-full mb-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"><Bike size={80}/></div>
               <h1 className="text-3xl font-['Titan_One'] uppercase mb-2">João Vitor está OFFLINE</h1>
               <p className="text-gray-400 font-bold mb-8 uppercase text-xs">Ative para começar a receber corridas.</p>
               <button onClick={toggleOnline} className="w-full max-w-xs bg-[#A0D468] border-4 border-black py-4 rounded-2xl font-['Titan_One'] text-xl uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-2 transition-all">Ficar Online</button>
            </div>
          ) : activeOrders.length > 0 ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
               <div className="h-[45vh] border-b-4 border-black relative">
                  <MapMock className="w-full h-full" showRoute={true} routeStops={routeItinerary} currentLocation={currentLocation}/>
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                     <button onClick={() => setCurrentLocation(user.location || null)} className="bg-white border-2 border-black p-2 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"><Target size={20}/></button>
                  </div>
               </div>
               <div className="flex-1 bg-white p-4 overflow-y-auto no-scrollbar">
                  <h2 className="font-['Titan_One'] text-sm uppercase mb-4 flex items-center gap-2"><List size={18}/> Minha Rota ({routeItinerary.length} paradas)</h2>
                  <div className="space-y-4 pb-4">
                     {routeItinerary.map((stop, i) => (
                       <div key={stop.id} className={`flex gap-4 p-4 rounded-xl border-2 border-black ${i === 0 ? 'bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-gray-50 opacity-40'}`}>
                          <div className={`w-10 h-10 rounded-xl border-2 border-black flex items-center justify-center font-black ${stop.type === 'PICKUP' ? 'bg-[#FFCE54]' : 'bg-[#A0D468]'}`}>{i+1}</div>
                          <div className="flex-1 min-w-0">
                             <div className="flex justify-between items-start">
                                <div>
                                   <p className="text-[10px] font-black uppercase opacity-40">{stop.type === 'PICKUP' ? 'Coleta' : 'Entrega'}</p>
                                   <p className="text-xs font-black truncate">{stop.address}</p>
                                </div>
                                {i === 0 && (
                                   <button 
                                      onClick={() => setNavigationStop(stop)}
                                      className="bg-[#AC92EC] text-white p-2 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
                                   >
                                      <Compass size={18} />
                                   </button>
                                )}
                             </div>
                             {i === 0 && (
                               <div className="flex gap-2 mt-3">
                                  <button onClick={() => setStopToConfirm(stop)} className="flex-1 bg-[#A0D468] border-2 border-black py-2 rounded-lg font-black text-[10px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5">Cheguei ao Local</button>
                                  <button onClick={() => setActiveChatOrderId(stop.orderId)} className="bg-white border-2 border-black p-2 rounded-lg"><MessageSquare size={16}/></button>
                               </div>
                             )}
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
               <h2 className="font-['Titan_One'] text-xl uppercase mb-4">Corridas Disponíveis ({availableOrders.length})</h2>
               {availableOrders.length === 0 ? (
                 <div className="text-center py-20 opacity-30 italic font-bold">Buscando novas chamadas...</div>
               ) : (
                 availableOrders.map(order => (
                   <div key={order.id} className="bg-white p-5 rounded-2xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-bottom-5">
                      <div className="flex justify-between items-center mb-4 border-b-2 border-dashed border-gray-100 pb-3">
                         <span className="bg-[#FFCE54] border-2 border-black px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">Entrega Central</span>
                         <span className="text-xl font-black text-[#A0D468]">R$ {order.price?.toFixed(2)}</span>
                      </div>
                      <p className="text-xs font-black"><MapPin size={12} className="inline mr-1 text-red-500"/> {order.dropoffAddress}</p>
                      <button onClick={() => handleAccept(order.id)} className="w-full mt-4 py-3 bg-[#4FC1E9] border-2 border-black rounded-xl font-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1">Aceitar Corrida</button>
                   </div>
                 ))
               )}
            </div>
          )}
        </div>
      )}

      {/* OVERLAY DE NAVEGAÇÃO GPS */}
      {navigationStop && (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col animate-in slide-in-from-right duration-300">
           {/* Header de Navegação */}
           <div className="bg-[#111827] text-white p-4 border-b-4 border-black flex justify-between items-center shadow-lg">
              <div className="flex items-center gap-3">
                 <div className="bg-[#A0D468] p-2 rounded-lg text-black animate-pulse">
                    <Navigation2 size={24} />
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase text-gray-400">Navegando para {navigationStop.type === 'PICKUP' ? 'Coleta' : 'Entrega'}</p>
                    <p className="text-xs font-bold truncate max-w-[200px]">{navigationStop.address}</p>
                 </div>
              </div>
              <button onClick={() => setNavigationStop(null)} className="p-2 bg-white/10 rounded-full"><X size={24}/></button>
           </div>

           {/* Mapa de Navegação Full */}
           <div className="flex-1 relative">
              <MapMock 
                 className="w-full h-full" 
                 showRoute={true} 
                 routeStops={[navigationStop]} 
                 currentLocation={currentLocation}
                 autoCenter={true}
              />
              
              {/* Controles de Mapa Flutuantes */}
              <div className="absolute bottom-6 right-6 flex flex-col gap-3">
                 <button onClick={() => setCurrentLocation(user.location || null)} className="bg-white border-2 border-black p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all">
                    <Target size={24} className="text-blue-600"/>
                 </button>
              </div>

              {/* Atalhos Externos */}
              <div className="absolute bottom-6 left-6 flex gap-3">
                 <button onClick={() => openExternalGps(navigationStop, 'google')} className="bg-white border-2 border-black px-4 py-3 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all flex items-center gap-2">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/3/39/Google_Maps_icon_%282020%29.svg" className="w-5 h-5" alt="Maps"/>
                    <span className="text-[10px] font-black uppercase">Google</span>
                 </button>
                 <button onClick={() => openExternalGps(navigationStop, 'waze')} className="bg-[#33CCFF] border-2 border-black px-4 py-3 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all flex items-center gap-2">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/6/66/Waze_icon.svg" className="w-5 h-5" alt="Waze"/>
                    <span className="text-[10px] font-black uppercase text-white">Waze</span>
                 </button>
              </div>
           </div>

           {/* Footer de Ação Rápida */}
           <div className="p-4 bg-[#F0F4F8] border-t-4 border-black grid grid-cols-2 gap-3">
              <button 
                onClick={() => setActiveChatOrderId(navigationStop.orderId)} 
                className="bg-white border-2 border-black py-4 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2"
              >
                <MessageSquare size={18}/> Chat
              </button>
              <button 
                onClick={() => setStopToConfirm(navigationStop)} 
                className="bg-[#A0D468] border-2 border-black py-4 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                <CheckCircle size={18}/> Cheguei
              </button>
           </div>
        </div>
      )}

      {stopToConfirm && (
        <div className="fixed inset-0 bg-black/70 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className={`p-6 text-center border-b-4 border-black ${stopToConfirm.type === 'PICKUP' ? 'bg-[#FFCE54]' : 'bg-[#A0D468]'}`}>
                 <h3 className="text-2xl font-['Titan_One'] uppercase">CONFIRMAR {stopToConfirm.type === 'PICKUP' ? 'COLETA' : 'ENTREGA'}?</h3>
              </div>
              <div className="p-6 flex gap-3">
                 <button onClick={() => setStopToConfirm(null)} className="flex-1 py-3 border-2 border-black rounded-xl font-black text-xs uppercase">Não</button>
                 <button onClick={confirmStopCompletion} className="flex-1 py-3 bg-[#A0D468] border-2 border-black rounded-xl font-black text-xs uppercase">Confirmar</button>
              </div>
           </div>
        </div>
      )}

      {activeChatOrderId && (
        <ChatModal 
          orderId={activeChatOrderId}
          currentUser={user}
          messages={historyOrders.concat(activeOrders).find(o => o.id === activeChatOrderId)?.chatMessages || []}
          onClose={() => setActiveChatOrderId(null)}
          onRefresh={fetchDriverData} 
        />
      )}

      {showProfile && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
             <div className="bg-[#FFCE54] p-6 border-b-4 border-black relative">
                <button onClick={() => setShowProfile(false)} className="absolute top-4 right-4 bg-white border-2 border-black p-1 rounded-lg"><X size={20}/></button>
                <div className="w-20 h-20 bg-white border-4 border-black rounded-full mx-auto flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-3 overflow-hidden">
                   <UserIcon size={40} />
                </div>
                <h2 className="text-center font-['Titan_One'] uppercase text-xl">{user.name}</h2>
             </div>
             
             <div className="p-6 overflow-y-auto space-y-6 no-scrollbar">
                {/* Dados de Pagamento */}
                <div className="space-y-4">
                   <h3 className="font-black text-xs uppercase opacity-40 flex items-center gap-2"><Wallet size={14}/> Dados de Pagamento</h3>
                   <div className="space-y-4 bg-gray-50 border-2 border-black p-4 rounded-2xl">
                      <div className="flex gap-2">
                         <button 
                            onClick={() => setPaymentMethod('pix')}
                            className={`flex-1 py-2 rounded-lg border-2 border-black font-black text-[10px] uppercase transition-all ${paymentMethod === 'pix' ? 'bg-[#FFCE54] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5' : 'bg-white opacity-40'}`}
                         >
                            PIX
                         </button>
                         <button 
                            onClick={() => setPaymentMethod('debito')}
                            className={`flex-1 py-2 rounded-lg border-2 border-black font-black text-[10px] uppercase transition-all ${paymentMethod === 'debito' ? 'bg-[#4FC1E9] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5' : 'bg-white opacity-40'}`}
                         >
                            Débito
                         </button>
                      </div>

                      {paymentMethod === 'pix' ? (
                         <div className="relative">
                            <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                               placeholder="Sua Chave PIX..." 
                               className="w-full pl-10 pr-4 py-2 border-2 border-black rounded-xl font-bold text-xs"
                               value={pixKey}
                               onChange={e => setPixKey(e.target.value)}
                            />
                         </div>
                      ) : (
                         <div className="relative">
                            <Building size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                               placeholder="Agência / Conta / Banco..." 
                               className="w-full pl-10 pr-4 py-2 border-2 border-black rounded-xl font-bold text-xs"
                               value={bankAccount}
                               onChange={e => setBankAccount(e.target.value)}
                            />
                         </div>
                      )}

                      <button 
                        onClick={handleSavePaymentData}
                        disabled={isSavingPayment}
                        className="w-full bg-[#A0D468] border-2 border-black py-2 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5"
                      >
                         {isSavingPayment ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14}/> Salvar Dados</>}
                      </button>
                   </div>
                </div>

                <div className="space-y-4">
                   <h3 className="font-black text-xs uppercase opacity-40 flex items-center gap-2"><Bell size={14}/> Notificações</h3>
                   
                   <div className="space-y-3">
                      <div className="bg-gray-50 border-2 border-black p-3 rounded-xl flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase">Permissão: {permission === 'granted' ? 'ON' : 'OFF'}</span>
                         {permission !== 'granted' && <button onClick={() => requestPermission()} className="text-[8px] font-black bg-white border border-black px-2 py-1 rounded">Ativar</button>}
                      </div>

                      {[
                        { key: 'newOrders', label: 'Novos Pedidos', icon: Zap },
                        { key: 'statusUpdates', label: 'Mensagens & Avisos', icon: MessageSquare }
                      ].map((pref) => (
                        <div key={pref.key} className="flex items-center justify-between py-1 border-b border-gray-100">
                           <div className="flex items-center gap-2 text-xs font-bold">
                              <pref.icon size={14} className="text-gray-400" />
                              <span>{pref.label}</span>
                           </div>
                           <button 
                              onClick={() => updatePreference(pref.key as any, !user.preferences?.[pref.key as keyof NotificationPreferences])}
                              className={`w-8 h-5 rounded-full border-2 border-black relative transition-colors ${user.preferences?.[pref.key as keyof NotificationPreferences] ? 'bg-[#A0D468]' : 'bg-gray-200'}`}
                           >
                              <div className={`absolute top-0.5 w-3 h-3 bg-white border border-black rounded-full transition-all ${user.preferences?.[pref.key as keyof NotificationPreferences] ? 'left-4' : 'left-0.5'}`}></div>
                           </button>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="pt-4 border-t-2 border-black border-dashed">
                   <button onClick={onLogout} className="w-full py-3 bg-[#ED5565] text-white border-2 border-black rounded-xl font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none">Sair do Aplicativo</button>
                </div>
             </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};
