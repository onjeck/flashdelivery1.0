
import React, { useEffect, useState, useRef } from 'react';
import { User, Order, OrderStatus, RouteStop, ChatMessage, PaymentStatus } from '../types';
import { db } from '../services/mockDb';
import { socketService, SocketEvent } from '../services/socketService';
import { openWhatsApp, WhatsAppTemplates, CENTRAL_SUPPORT_PHONE } from '../services/whatsappUtils';
import { ChatModal } from '../components/ChatModal';
import { ReviewModal } from '../components/ReviewModal';
import { useNotification } from '../contexts/NotificationContext';
import { 
  Package, MapPin, Clock, LogOut, Plus, Bike, 
  MessageCircle, Store, Edit2, Check, X, Calendar, 
  ChevronRight, Map as MapIcon, History, AlertCircle, MessageSquare, Star, PackageCheck, Zap, Wallet, CreditCard, Loader2
} from 'lucide-react';

interface Props {
  user: User;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
}

export const ClientDashboard: React.FC<Props> = ({ user, onLogout, onUpdateUser }) => {
  const { notify } = useNotification();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'finance'>('active');
  const [settlementRequested, setSettlementRequested] = useState(false);
  const [isRequestingSettlement, setIsRequestingSettlement] = useState(false);
  const [proofFileName, setProofFileName] = useState<string | null>(null);
  const [proofData, setProofData] = useState<string | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofSent, setProofSent] = useState(false);
  const [settlementId, setSettlementId] = useState<string | null>(null);
  
  const [activeChatOrderId, setActiveChatOrderId] = useState<string | null>(null);
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempStoreName, setTempStoreName] = useState(user.name);
  
  const [formData, setFormData] = useState({
    pickup: user.address || '',
    dropoff: '',
    description: '',
    notes: ''
  });

  useEffect(() => {
    if (user.address) setFormData(prev => ({ ...prev, pickup: user.address! }));
  }, [user.address]);

  const fetchOrders = async () => {
    const all = await db.getOrders();
    const myOrders = all.filter(o => o.clientId === user.id).sort((a,b) => b.createdAt - a.createdAt);
    setOrders(myOrders);
  };

  useEffect(() => {
    fetchOrders();
    const unsubOrderUpdate = socketService.on<Order>(SocketEvent.ORDER_UPDATED, (updatedOrder) => {
      if (updatedOrder.clientId === user.id) fetchOrders();
    });
    return () => unsubOrderUpdate();
  }, [user.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if(!formData.pickup || !formData.dropoff || !formData.description) return notify('Atenção', 'Preencha os campos obrigatórios.', 'warning');

    setIsProcessing(true);
    try {
      await db.createOrder({
        clientId: user.id,
        clientName: user.name,
        pickupAddress: formData.pickup,
        dropoffAddress: formData.dropoff,
        description: formData.description,
        notes: formData.notes
      });
      notify('Pedido Criado', 'Sua solicitação foi enviada para a central.', 'success');

      setFormData({ pickup: user.address || '', dropoff: '', description: '', notes: '' });
      setIsCreating(false);
      fetchOrders();
      setActiveTab('active');
    } catch (err: any) {
      notify('Erro', err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveStoreName = async () => {
    if (!tempStoreName.trim()) return;
    const updatedUser = await db.updateUser(user.id, { name: tempStoreName });
    onUpdateUser(updatedUser);
    setIsEditingName(false);
  };

  const handleReviewSubmit = async (rating: number, feedback: string) => {
    if (reviewOrderId) {
      await db.rateOrder(reviewOrderId, rating, feedback);
      notify('Avaliação Enviada', 'Obrigado!', 'success');
      setReviewOrderId(null);
      fetchOrders();
    }
  };

  const handleRequestSettlement = async () => {
    const pending = orders.filter(o => o.status === OrderStatus.DELIVERED && o.paymentStatus === PaymentStatus.PENDING);
    if (pending.length === 0) return;
    const total = pending.reduce((acc, o) => acc + (o.price || 0), 0);
    
    setIsRequestingSettlement(true);
    try {
      // Criar solicitação persistente no mock DB e notificar a central
      const req = await db.createSettlementRequest({ clientId: user.id, clientName: user.name, orderIds: pending.map(p => p.id), total });
      setSettlementId(req.id);
      notify('Solicitação Enviada', `Solicitação de fechamento (R$ ${total.toFixed(2)}) enviada à central. Pague via PIX e envie o comprovante.`, 'success');
      setSettlementRequested(true);
      setProofSent(false);
    } catch (err: any) {
      notify('Erro', 'Falha ao solicitar acerto.', 'error');
    } finally {
      setIsRequestingSettlement(false);
    }
  };

  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setProofFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setProofData(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSendProof = async () => {
    if (!proofData) return notify('Atenção', 'Anexe o comprovante antes de enviar.', 'warning');
    setProofUploading(true);
    try {
      if (!settlementId) return notify('Erro', 'Nenhuma solicitação encontrada para anexar comprovante.', 'error');
      await db.attachProofToSettlement(settlementId, { name: proofFileName || 'comprovante', dataUrl: proofData });
      setProofSent(true);
      notify('Comprovante Enviado', 'Comprovante enviado para a central. Aguarde confirmação de pagamento.', 'success');
    } catch (err: any) {
      notify('Erro', 'Falha ao enviar comprovante.', 'error');
    } finally {
      setProofUploading(false);
    }
  };

  const getStatusLabel = (s: OrderStatus) => {
    switch (s) {
      case OrderStatus.REQUESTED: return 'Aguardando Orçamento';
      case OrderStatus.PRICED: return 'Aguardando Motoboy';
      case OrderStatus.ASSIGNED: return 'João Vitor à caminho';
      case OrderStatus.ACCEPTED: return 'Motoboy Aceitou';
      case OrderStatus.ON_WAY: return 'Em trânsito';
      case OrderStatus.COLLECTED: return 'Coletado';
      case OrderStatus.DELIVERED: return 'Finalizado';
      default: return s;
    }
  };

  const activeOrders = orders.filter(o => !['DELIVERED', 'CANCELED'].includes(o.status));
  const historyOrders = orders.filter(o => ['DELIVERED', 'CANCELED'].includes(o.status));
  const pendingPaymentOrders = orders.filter(o => o.status === OrderStatus.DELIVERED && o.paymentStatus === PaymentStatus.PENDING);
  const totalToSettle = pendingPaymentOrders.reduce((acc, o) => acc + (o.price || 0), 0);

  const trackingOrder = activeOrders[0];

  if (isCreating) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex flex-col font-['Nunito']">
        <div className="bg-[#4FC1E9] border-b-4 border-black p-4 flex items-center gap-3 shadow-md">
          <button onClick={() => setIsCreating(false)} className="text-black font-bold border-2 border-black bg-white px-3 py-1 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all">Voltar</button>
          <h1 className="font-['Titan_One'] text-2xl flex-1 text-center uppercase tracking-tighter">Novo Pedido</h1>
        </div>

        <div className="p-4 flex flex-col gap-4 max-w-lg mx-auto w-full mt-4">
          <div className="space-y-4 bg-white p-6 rounded-2xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Retirada (Sua Loja)</label>
              <div className="flex items-center border-2 border-black rounded-xl p-3 bg-gray-50 focus-within:bg-white transition-all">
                <Store size={24} className="text-[#4FC1E9] mr-2" />
                <input required placeholder="Endereço de retirada..." className="bg-transparent outline-none w-full text-sm font-bold"
                  value={formData.pickup} onChange={e => setFormData({...formData, pickup: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Entrega (Destino)</label>
              <div className="flex items-center border-2 border-black rounded-xl p-3 bg-gray-50 focus-within:bg-white transition-all">
                <MapPin size={24} className="text-[#ED5565] mr-2" />
                <input required placeholder="Endereço de destino..." className="bg-transparent outline-none w-full text-sm font-bold"
                  value={formData.dropoff} onChange={e => setFormData({...formData, dropoff: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">O que levar?</label>
              <div className="flex items-center border-2 border-black rounded-xl p-3 bg-gray-50 focus-within:bg-white transition-all">
                <Package size={24} className="text-[#FFCE54] mr-2" />
                <input required placeholder="Ex: Marmita, Documento..." className="bg-transparent outline-none w-full text-sm font-bold"
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
            </div>
            <textarea placeholder="Observações adicionais..." className="border-2 border-black rounded-xl p-3 w-full h-20 bg-gray-50 outline-none font-bold text-sm"
                value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
          </div>

          <button 
             onClick={handleSubmit}
             disabled={isProcessing}
             className="w-full bg-[#A0D468] text-black border-4 border-black py-4 rounded-2xl font-['Titan_One'] text-xl uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 active:translate-y-2 transition-all flex items-center justify-center gap-2"
          >
             {isProcessing ? <Loader2 className="animate-spin"/> : <><Bike size={28}/> CHAMAR MOTOBOY</>}
          </button>
          <p className="text-[10px] font-black text-gray-400 text-center uppercase">A central será notificada e enviará o motoboy disponível</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex flex-col font-['Nunito']">
      {activeChatOrderId && <ChatModal orderId={activeChatOrderId} currentUser={user} messages={orders.find(o => o.id === activeChatOrderId)?.chatMessages || []} onClose={() => setActiveChatOrderId(null)} onRefresh={fetchOrders} />}
      {reviewOrderId && <ReviewModal orderId={reviewOrderId} driverName={orders.find(o => o.id === reviewOrderId)?.driverName || 'Motoboy'} onClose={() => setReviewOrderId(null)} onSubmit={handleReviewSubmit} />}

      <div className="bg-[#FFCE54] border-b-4 border-black p-4 flex justify-between items-center sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-4">
           <img src="/flashdelivery.png" alt="Flash Delivery logo" className="w-16 h-16 object-contain" />
           <div className="flex flex-col">
              <h1 className="font-['Titan_One'] text-lg sm:text-xl uppercase tracking-tight leading-none">{user.name}</h1>
              <p className="text-[10px] font-black text-gray-700 uppercase opacity-70 mt-0.5">Suas entregas, nossa velocidade ⚡</p>
           </div>
        </div>
        <div className="flex gap-2">
           <button onClick={() => openWhatsApp(CENTRAL_SUPPORT_PHONE, WhatsAppTemplates.toSupport('Cliente', user.name))} className="bg-white border-2 border-black p-2 rounded-full"><MessageCircle size={20}/></button>
           <button onClick={onLogout} className="bg-[#ED5565] text-white border-2 border-black p-2 rounded-lg"><LogOut size={20}/></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20 p-4 max-w-lg mx-auto w-full space-y-6">
        {trackingOrder && (
          <div className="bg-white rounded-2xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="p-4 bg-blue-50 flex justify-between items-center">
               <div className="flex items-center gap-3">
                  <div className="bg-[#4FC1E9] p-3 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-bounce">
                     <Bike size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">Acompanhando Entrega</p>
                    <p className="text-sm font-black text-blue-600 uppercase tracking-tight">{getStatusLabel(trackingOrder.status)}</p>
                  </div>
               </div>
               <div className="text-right">
                  <p className="text-[9px] font-black text-gray-400 uppercase leading-none mb-1">Pedido</p>
                  <p className="text-xs font-black font-mono bg-white border border-black px-2 py-0.5 rounded">#{trackingOrder.id.slice(-4)}</p>
               </div>
            </div>
            <div className="px-4 py-3 border-t-2 border-black border-dashed flex items-center gap-2">
               <MapPin size={14} className="text-red-500 flex-shrink-0" />
               <p className="text-[10px] font-bold text-gray-600 truncate">Destino: {trackingOrder.dropoffAddress}</p>
            </div>
          </div>
        )}

        <button onClick={() => setIsCreating(true)} className="w-full bg-[#4FC1E9] p-6 rounded-2xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center group">
           <div className="text-left">
              <h2 className="text-xl font-['Titan_One'] uppercase tracking-tight">Solicitar Entrega</h2>
              <p className="text-[10px] font-black opacity-60 uppercase">Chame um motoboy agora</p>
           </div>
           <div className="bg-white border-2 border-black p-2 rounded-xl group-active:translate-y-1 transition-all"><Plus size={24}/></div>
        </button>

        <div className="flex gap-2 bg-white p-1 rounded-xl border-2 border-black">
           <button onClick={() => setActiveTab('active')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg ${activeTab === 'active' ? 'bg-[#FFCE54] border-2 border-black' : 'text-gray-400'}`}>Ativas</button>
           <button onClick={() => setActiveTab('history')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg ${activeTab === 'history' ? 'bg-[#AC92EC] border-2 border-black' : 'text-gray-400'}`}>Histórico</button>
           <button onClick={() => setActiveTab('finance')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg ${activeTab === 'finance' ? 'bg-[#A0D468] border-2 border-black' : 'text-gray-400'}`}>Caixa</button>
        </div>

        <div className="space-y-4">
           {activeTab === 'active' && activeOrders.map(o => (
             <div key={o.id} className="bg-white p-4 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex justify-between items-start mb-3">
                   <span className="text-[10px] font-black uppercase bg-[#FFCE54] px-2 py-0.5 border-2 border-black rounded-md">{getStatusLabel(o.status)}</span>
                   <p className="font-['Titan_One']">R$ {o.price?.toFixed(2) || '---'}</p>
                </div>
                <p className="text-xs font-black truncate mb-3"><MapPin size={12} className="inline mr-1 text-red-500"/> {o.dropoffAddress}</p>
                <button onClick={() => setActiveChatOrderId(o.id)} className="w-full py-2 bg-gray-50 border-2 border-black rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2"><MessageSquare size={14}/> Falar com {o.driverName?.split(' ')[0] || 'Central'}</button>
             </div>
           ))}
           {activeTab === 'finance' && (
             <div className="space-y-4">
                {/* PIX da Central */}
                <div className="bg-gradient-to-br from-[#4FC1E9] to-[#2BB6E6] p-6 rounded-2xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-white">
                   <div className="flex items-center gap-2 mb-3">
                      <Zap size={24} className="fill-white" />
                      <h3 className="font-['Titan_One'] text-lg uppercase">Flash Delivery</h3>
                   </div>
                   <p className="text-[10px] font-black uppercase opacity-80 mb-2">PIX para Receber Acerto:</p>
                   <div className="bg-white/20 backdrop-blur p-4 rounded-xl border-2 border-white/40 font-mono text-sm font-bold break-all">
                      central@flashdelivery.pix
                   </div>
                </div>

                {/* Total Pendente */}
                <div className="bg-white p-6 rounded-2xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center">
                   <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Total Pendente</p>
                   <p className="text-4xl font-['Titan_One'] text-[#A0D468] mb-4">R$ {totalToSettle.toFixed(2)}</p>
                   
                   {settlementRequested ? (
                     <div className="bg-blue-50 border-2 border-blue-500 p-4 rounded-xl space-y-3 text-left">
                       <p className="text-[10px] font-black text-blue-700 uppercase">✓ Solicitação de Fechamento enviada</p>
                       <p className="text-sm text-blue-600">Por favor, efetue o pagamento do valor para a Central (PIX acima) e envie o comprovante abaixo. A Central confirmará o recebimento e dará baixa no sistema.</p>
                       {proofSent ? (
                         <div className="bg-white p-3 rounded-lg border-2 border-blue-200 text-blue-700 font-bold">
                           Comprovante "{proofFileName}" enviado — aguardando confirmação da Central.
                         </div>
                       ) : (
                         <div className="flex flex-col gap-2">
                           <label className="text-[11px] font-black uppercase">Enviar comprovante de pagamento</label>
                           <input type="file" accept="image/*,application/pdf" onChange={handleProofChange} className="file:py-2 file:px-3 file:rounded file:border-0 file:bg-[#4FC1E9] file:text-white" />
                           <div className="flex gap-2">
                             <button onClick={handleSendProof} disabled={proofUploading || !proofData} className="flex-1 bg-blue-500 text-white border-2 border-black py-2 rounded-lg font-black text-[10px] uppercase disabled:opacity-50">
                               {proofUploading ? 'Enviando...' : 'Enviar Comprovante'}
                             </button>
                             <button onClick={() => { setSettlementRequested(false); setProofData(null); setProofFileName(null); setProofSent(false); }} className="bg-white border-2 border-black py-2 px-3 rounded-lg font-black text-[10px]">Cancelar</button>
                           </div>
                         </div>
                       )}
                     </div>
                   ) : totalToSettle > 0 ? (
                      <button 
                         onClick={handleRequestSettlement}
                         disabled={isRequestingSettlement}
                         className="w-full bg-[#A0D468] border-4 border-black py-3 rounded-xl font-['Titan_One'] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                         {isRequestingSettlement ? <Loader2 className="animate-spin" size={20} /> : <>📤 SOLICITAR ACERTO</>}
                      </button>
                   ) : (
                      <div className="text-gray-400 font-bold text-sm">Nenhum pendente no momento</div>
                   )}
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
