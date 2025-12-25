
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { User, Order, OrderStatus, UserRole, PaymentStatus, RouteStop, Coordinates, NotificationPreferences } from '../types';
import { db } from '../services/mockDb';
import { socketService, SocketEvent, SettlementSocketEvent } from '../services/socketService';
import { useNotification } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';
import { ChatModal } from '../components/ChatModal';
import { RouteService } from '../services/routeService';
import { GeoService } from '../services/geoService';
import { MapMock } from '../components/MapMock';
import { 
  LogOut, Bike, MessageSquare, MapPin, Check, Send, Zap, 
  LayoutDashboard, Wallet, Store, Settings as SettingsIcon, 
  User as UserIcon, Star, DollarSign, Search, Trash2, Plus, 
  Edit3, Palette, Moon, Briefcase, Smile, List, X, Navigation, Filter, 
  Trophy, Calendar, AlertCircle, Bell, Shield, BellOff, BellRing, Save, Phone, Key,
  Loader2, CheckCircle2, Building2, Clock, Map as MapIcon, Building, Users, Activity,
  Menu as MenuIcon, ChevronRight, Mail, MessageCircle
} from 'lucide-react';

interface Props {
  user: User;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
}

export const AdminDashboard: React.FC<Props> = ({ user, onLogout, onUpdateUser }) => {
  const { notify, requestPermission, permission } = useNotification();
  const { theme, setTheme } = useTheme();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [settlementRequests, setSettlementRequests] = useState<any[]>([]);
  
  const [viewMode, setViewMode] = useState<'dashboard' | 'users' | 'settings' | 'finance' | 'my-route' | 'live-map' | 'delayed'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userTab, setUserTab] = useState<UserRole>(UserRole.CLIENT);
  const [userSearch, setUserSearch] = useState('');
  const [financeTab, setFinanceTab] = useState<'drivers' | 'clients'>('drivers');
  const [financeView, setFinanceView] = useState<'summary' | 'reports' | 'receipt'>('summary');
  const [selectedReceiptType, setSelectedReceiptType] = useState<'driver' | 'client' | null>(null);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('PENDING_ACTION');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeChatOrderId, setActiveChatOrderId] = useState<string | null>(null);

  // States for Central Responsible Data
  const [centralData, setCentralData] = useState({
    responsibleName: user.name || '',
    address: user.address || '',
    supportEmail: (user as any).supportEmail || '',
    phone: user.phone || '',
    whatsapp: (user as any).whatsapp || ''
  });
  const [isUpdatingCentral, setIsUpdatingCentral] = useState(false);

  // States for Moto Routes Visualization
  const [selectedMotoId, setSelectedMotoId] = useState<string>('');
  const [motoLocation, setMotoLocation] = useState<Coordinates | null>(null);
  const [motoRoute, setMotoRoute] = useState<RouteStop[]>([]);
  
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isSettling, setIsSettling] = useState<string | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState<{ [key: string]: string }>({});
  const [selectedAssignments, setSelectedAssignments] = useState<{ [orderId: string]: string }>({}); 
  const [clientCycles, setClientCycles] = useState<{ [clientId: string]: 'semanal' | 'quinzenal' | 'mensal' }>({});

  const delayCheckIntervalRef = useRef<number | null>(null);

  // Função para calcular entregas atrasadas
  const DELAY_THRESHOLD = 30 * 60 * 1000; // 30 minutos
  const getDelayedOrders = (ordersList: Order[]) => {
    const now = Date.now();
    return ordersList.filter(o => 
      (o.status === OrderStatus.ASSIGNED || o.status === OrderStatus.ON_WAY) &&
      (now - (o.history[o.history.length - 1]?.timestamp || now) > DELAY_THRESHOLD)
    );
  };

  const delayedOrders = useMemo(() => getDelayedOrders(orders), [orders]);

  const loadData = async () => {
    try {
      const [o, d, c, a] = await Promise.all([db.getOrders(), db.getDrivers(), db.getClients(), db.getAdmins()]);
      const settlements = await (db.getSettlementRequests ? db.getSettlementRequests() : Promise.resolve([]));
      const sortedOrders = o.sort((a,b) => b.createdAt - a.createdAt);
      setOrders(sortedOrders);
      setDrivers(d);
      setClients(c);
      setAdmins(a);
      setSettlementRequests(settlements || []);
      
      if (selectedMotoId) {
        const motoObj = d.find(drv => drv.id === selectedMotoId) || (selectedMotoId === user.id ? user : null);
        if (motoObj) {
          setMotoLocation(motoObj.location || null);
          const activeForMoto = sortedOrders.filter(ord => ord.driverId === selectedMotoId && ![OrderStatus.DELIVERED, OrderStatus.CANCELED].includes(ord.status));
          const optimized = RouteService.optimizeRoute(motoObj.location || {lat: -23.55, lng: -46.63}, activeForMoto);
          setMotoRoute(optimized);
        }
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    loadData();
    const unsubOrder = socketService.on(SocketEvent.ORDER_UPDATED, () => loadData());
    const unsubSettlementCreated = (socketService as any).on((SettlementSocketEvent as any).SETTLEMENT_REQUEST_CREATED, () => loadData());
    const unsubSettlementUpdated = (socketService as any).on((SettlementSocketEvent as any).SETTLEMENT_REQUEST_UPDATED, () => loadData());
    const unsubNew = socketService.on<Order>(SocketEvent.ORDER_CREATED, (order) => {
      loadData();
      notify('Novo Pedido', `Loja ${order.clientName} chamou!`, 'info', 'newOrders');
    });
    
    const unsubDrivers = socketService.on(SocketEvent.DRIVER_UPDATED, () => {
      loadData();
    });

    delayCheckIntervalRef.current = window.setInterval(() => {
      const now = Date.now();
      const delayed = getDelayedOrders(orders);
      if (delayed.length > 0) {
        notify('ALERTA CRÍTICO', `Existem ${delayed.length} entregas em atraso!`, 'critical', 'criticalAlerts');
      }
    }, 60000);

    return () => {
      unsubOrder();
      unsubSettlementCreated && unsubSettlementCreated();
      unsubSettlementUpdated && unsubSettlementUpdated();
      unsubNew();
      unsubDrivers();
      if (delayCheckIntervalRef.current) clearInterval(delayCheckIntervalRef.current);
    };
  }, [viewMode, user.id, selectedMotoId]);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser?.name || !editingUser?.username) return;
    setIsSavingUser(true);
    try {
      if (editingUser.id) {
        await db.updateUser(editingUser.id, editingUser);
        notify('Sucesso', 'Usuário atualizado com sucesso.', 'success');
      } else {
        await db.createUser(editingUser);
        notify('Sucesso', 'Novo usuário criado com sucesso.', 'success');
      }
      setEditingUser(null);
      await loadData();
    } catch (err: any) {
      notify('Erro', err.message, 'error');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleUpdateCentralData = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingCentral(true);
    try {
      const updated = await db.updateUser(user.id, {
        name: centralData.responsibleName,
        address: centralData.address,
        phone: centralData.phone,
        supportEmail: centralData.supportEmail,
        whatsapp: centralData.whatsapp
      } as any);
      onUpdateUser(updated);
      notify('Sucesso', 'Dados do responsável atualizados.', 'success');
    } catch (err: any) {
      notify('Erro', 'Falha ao atualizar dados.', 'error');
    } finally {
      setIsUpdatingCentral(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('Deseja realmente excluir este usuário? Esta ação não pode ser desfeita.')) {
      try {
        await db.deleteUser(id);
        notify('Sucesso', 'Usuário removido.', 'success');
        await loadData();
      } catch (err) {
        notify('Erro', 'Falha ao excluir.', 'error');
      }
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    const newPrefs = { ...user.preferences, [key]: value };
    const updated = await db.updateUser(user.id, { preferences: newPrefs as any });
    onUpdateUser(updated);
    notify('Preferências', 'Suas notificações foram atualizadas.', 'success');
  };

  const onlineDrivers = useMemo(() => drivers.filter(d => d.isOnline), [drivers]);
  const activeDrivers = useMemo(() => {
    const driversWithOrders = new Set(orders.filter(o => o.driverId && ![OrderStatus.DELIVERED, OrderStatus.CANCELED].includes(o.status)).map(o => o.driverId));
    return drivers.filter(d => driversWithOrders.has(d.id) && d.location);
  }, [drivers, orders]);
  
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = o.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           o.dropoffAddress.toLowerCase().includes(searchTerm.toLowerCase());
      if (filterStatus === 'PENDING_ACTION') return matchesSearch && [OrderStatus.REQUESTED, OrderStatus.PRICED].includes(o.status);
      if (filterStatus === 'DELIVERED') return matchesSearch && o.status === OrderStatus.DELIVERED;
      return matchesSearch;
    });
  }, [orders, filterStatus, searchTerm]);

  const filteredUsersList = useMemo(() => {
    let list: User[] = [];
    if (userTab === UserRole.CLIENT) {
      list = clients;
    } else if (userTab === UserRole.DRIVER) {
      list = drivers;
    } else if (userTab === UserRole.ADMIN) {
      list = admins;
    }
    return list.filter(u => 
      u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
      u.username.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [userTab, clients, drivers, admins, userSearch]);

  const financeData = useMemo(() => {
    const driversRes = drivers.map(d => {
      const p = orders.filter(o => o.driverId === d.id && o.status === OrderStatus.DELIVERED && o.driverPaymentStatus !== PaymentStatus.PAID);
      return { ...d, total: p.reduce((a,b) => a + (b.price || 0), 0), count: p.length };
    }).filter(x => x.total > 0 || x.count > 0);

    const clientsRes = clients.map(c => {
      const p = orders.filter(o => o.clientId === c.id && o.status === OrderStatus.DELIVERED && o.paymentStatus !== PaymentStatus.PAID);
      return { ...c, total: p.reduce((a,b) => a + (b.price || 0), 0), count: p.length };
    }).filter(x => x.total > 0 || x.count > 0);

    return { 
      drivers: driversRes, 
      clients: clientsRes,
      totalPendingDrivers: driversRes.reduce((a,b) => a + b.total, 0),
      totalPendingClients: clientsRes.reduce((a,b) => a + b.total, 0),
      totalPaidDrivers: orders.filter(o => o.driverPaymentStatus === PaymentStatus.PAID).reduce((a,b) => a + (b.price || 0), 0),
      totalPaidClients: orders.filter(o => o.paymentStatus === PaymentStatus.PAID).reduce((a,b) => a + (b.price || 0), 0)
    };
  }, [orders, drivers, clients]);

  const handleSettleDriver = async (driverId: string) => {
    if (isSettling) return;
    const pending = orders.filter(o => o.driverId === driverId && o.status === OrderStatus.DELIVERED && o.driverPaymentStatus !== PaymentStatus.PAID);
    const total = pending.reduce((a, b) => a + (b.price || 0), 0);
    if (total === 0) return notify('Atenção', 'Nenhum saldo pendente para este motoboy.', 'info');

    const drv = drivers.find(d => d.id === driverId);
    const method = drv?.paymentMethod === 'debito' ? 'Débito em Conta' : 'PIX';
    const detail = drv?.paymentMethod === 'debito' ? drv.bankAccount : drv?.pixKey;

    if (confirm(`Confirmar acerto de R$ ${total.toFixed(2)} via ${method} (${detail || 'Não informado'})?`)) {
      setIsSettling(driverId);
      try {
        await db.settleDriverOrders(pending.map(o => o.id));
        notify('Sucesso', 'Acerto realizado!', 'success');
        await loadData();
      } catch (err: any) {
        notify('Erro', 'Falha ao realizar acerto.', 'error');
      } finally {
        setIsSettling(null);
      }
    }
  };

  const handleSettleClient = async (clientId: string) => {
    if (isSettling) return;
    const pending = orders.filter(o => o.clientId === clientId && o.status === OrderStatus.DELIVERED && o.paymentStatus !== PaymentStatus.PAID);
    const total = pending.reduce((a, b) => a + (b.price || 0), 0);
    if (total === 0) return notify('Atenção', 'Nenhum saldo pendente para esta loja.', 'info');

    const cycle = clientCycles[clientId] || 'semanal';
    if (confirm(`Confirmar recebimento de R$ ${total.toFixed(2)} referente ao ciclo ${cycle} desta loja?`)) {
      setIsSettling(clientId);
      try {
        await db.settleOrders(pending.map(o => o.id));
        notify('Sucesso', 'Acerto de loja realizado!', 'success');
        await loadData();
      } catch (err: any) {
        notify('Erro', 'Falha ao realizar acerto da loja.', 'error');
      } finally {
        setIsSettling(null);
      }
    }
  };

  const handleSetPrice = async (orderId: string) => {
    const price = parseFloat(priceInput[orderId]);
    if (!price || price <= 0) return notify('Erro', 'Insira um valor válido.', 'error');
    await db.updateOrder(orderId, { price, status: OrderStatus.PRICED });
    setPriceInput(prev => ({ ...prev, [orderId]: '' }));
    notify('Sucesso', 'Preço definido.', 'success');
    await loadData();
  };

  const handleAssignDriver = async (orderId: string) => {
    const dId = selectedAssignments[orderId];
    if (!dId) return notify('Erro', 'Selecione um motoboy.', 'error');
    const d = dId === user.id ? user : drivers.find(drv => drv.id === dId);
    await db.updateOrder(orderId, { driverId: dId, driverName: d?.name, status: OrderStatus.ASSIGNED });
    notify('Sucesso', `Pedido escalado para ${d?.name?.split(' ')[0]}.`, 'success');
    await loadData();
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (confirm('Deseja realmente cancelar e deletar esta entrega? Esta ação não pode ser desfeita.')) {
      setIsDeletingOrder(orderId);
      try {
        await db.deleteOrder(orderId);
        notify('Sucesso', 'Entrega deletada com sucesso.', 'success');
        await loadData();
      } catch (err) {
        notify('Erro', 'Falha ao deletar entrega.', 'error');
      } finally {
        setIsDeletingOrder(null);
      }
    }
  };

  const generateDriverReceipt = (driver: User, ordersData: any) => {
    const now = new Date();
    const receiptHTML = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recibo de Pagamento - ${driver.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .receipt { background: white; max-width: 800px; margin: 0 auto; padding: 40px; border: 3px solid #000; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #000; padding-bottom: 20px; }
          .header h1 { margin: 0; color: #FFCE54; font-size: 28px; text-transform: uppercase; }
          .header p { margin: 5px 0; color: #666; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
          .info-box { border-left: 4px solid #4FC1E9; padding-left: 15px; }
          .info-box label { font-weight: bold; color: #999; font-size: 12px; text-transform: uppercase; display: block; }
          .info-box value { display: block; font-size: 16px; color: #000; margin-top: 5px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #FFCE54; color: #000; padding: 12px; text-align: left; font-weight: bold; border: 2px solid #000; }
          td { padding: 12px; border: 1px solid #ddd; }
          .total-row { background: #f9f9f9; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #000; color: #666; font-size: 12px; }
          @media print { body { background: white; } .receipt { box-shadow: none; } }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h1>⚡ Flash Delivery</h1>
            <p>RECIBO DE PAGAMENTO</p>
            <p style="color: #4FC1E9; font-weight: bold;">Motoboy</p>
          </div>
          
          <div class="info-grid">
            <div class="info-box">
              <label>Motoboy</label>
              <value>${driver.name}</value>
            </div>
            <div class="info-box">
              <label>Telefone</label>
              <value>${driver.phone || 'Não informado'}</value>
            </div>
            <div class="info-box">
              <label>Chave PIX</label>
              <value>${driver.pixKey || (driver.bankAccount || 'Não informado')}</value>
            </div>
            <div class="info-box">
              <label>Data do Recibo</label>
              <value>${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}</value>
            </div>
            <div class="info-box">
              <label>Forma de Pagamento</label>
              <value>${driver.paymentMethod === 'debito' ? 'Débito em Conta' : 'PIX'}</value>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Data</th>
                <th style="text-align: right;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${ordersData.orders.map((order: any) => `
                <tr>
                  <td>#${order.id.slice(-4)}</td>
                  <td>${order.clientName}</td>
                  <td>${new Date(order.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td style="text-align: right; font-weight: bold;">R$ ${(order.price || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3" style="text-align: right;">TOTAL A PAGAR:</td>
                <td style="text-align: right; font-size: 18px; color: #4FC1E9;">R$ ${ordersData.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p>Este é um recibo de pagamento gerado pelo sistema Flash Delivery</p>
            <p>Data de emissão: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}</p>
            <p style="margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px;">
              ________________________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ________________________<br>
              Responsável pela Central &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Motoboy
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  const generateClientReceipt = (client: User, ordersData: any) => {
    const now = new Date();
    const receiptHTML = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recibo de Pagamento - ${client.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .receipt { background: white; max-width: 800px; margin: 0 auto; padding: 40px; border: 3px solid #000; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #000; padding-bottom: 20px; }
          .header h1 { margin: 0; color: #FFCE54; font-size: 28px; text-transform: uppercase; }
          .header p { margin: 5px 0; color: #666; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
          .info-box { border-left: 4px solid #A0D468; padding-left: 15px; }
          .info-box label { font-weight: bold; color: #999; font-size: 12px; text-transform: uppercase; display: block; }
          .info-box value { display: block; font-size: 16px; color: #000; margin-top: 5px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #A0D468; color: #000; padding: 12px; text-align: left; font-weight: bold; border: 2px solid #000; }
          td { padding: 12px; border: 1px solid #ddd; }
          .total-row { background: #f9f9f9; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #000; color: #666; font-size: 12px; }
          @media print { body { background: white; } .receipt { box-shadow: none; } }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h1>⚡ Flash Delivery</h1>
            <p>RECIBO DE COBRANÇA</p>
            <p style="color: #A0D468; font-weight: bold;">Loja / Cliente</p>
          </div>
          
          <div class="info-grid">
            <div class="info-box">
              <label>Loja / Cliente</label>
              <value>${client.name}</value>
            </div>
            <div class="info-box">
              <label>Endereço</label>
              <value>${client.address || 'Não informado'}</value>
            </div>
            <div class="info-box">
              <label>Telefone</label>
              <value>${client.phone || 'Não informado'}</value>
            </div>
            <div class="info-box">
              <label>Data do Recibo</label>
              <value>${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}</value>
            </div>
            <div class="info-box">
              <label>Período</label>
              <value>${client.fixedDeliveryPrice ? 'Preço Fixo' : 'Por Entrega'}</value>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Motoboy</th>
                <th>Data</th>
                <th style="text-align: right;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${ordersData.orders.map((order: any) => `
                <tr>
                  <td>#${order.id.slice(-4)}</td>
                  <td>${order.driverName || 'Não atribuído'}</td>
                  <td>${new Date(order.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td style="text-align: right; font-weight: bold;">R$ ${(order.price || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3" style="text-align: right;">TOTAL A RECEBER:</td>
                <td style="text-align: right; font-size: 18px; color: #A0D468;">R$ ${ordersData.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p>Este é um recibo de cobrança gerado pelo sistema Flash Delivery</p>
            <p>Data de emissão: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}</p>
            <p style="margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px;">
              ________________________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ________________________<br>
              Responsável pela Central &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Loja / Cliente
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  const SidebarItem = ({ icon: Icon, label, view }: any) => (
    <button onClick={() => { setViewMode(view); setIsMobileMenuOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] border-[var(--border-width)] border-[var(--color-border)] transition-all ${viewMode === view ? 'bg-[var(--color-primary)] text-[var(--color-text-inv)] shadow-[var(--shadow-custom)] -translate-x-1 -translate-y-1' : 'hover:bg-gray-50'}`}>
      <Icon size={20} strokeWidth={2.5} />
      <span className="font-black text-[10px] uppercase tracking-wider">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex font-[var(--font-body)] text-[var(--color-text)] overflow-x-hidden">
      {/* SIDEBAR DESKTOP */}
      <aside className="w-64 bg-[var(--color-surface)] border-r-[var(--border-width-lg)] border-[var(--color-border)] p-6 flex-col gap-2 hidden lg:flex h-screen sticky top-0">
          <div className="mb-8 flex items-center justify-center">
            <img src="/flashdelivery.png" alt="Flash Delivery logo" className="w-24 h-24 object-contain" />
          </div>
        <SidebarItem icon={LayoutDashboard} label="Monitor Geral" view="dashboard" />
        <SidebarItem icon={Activity} label="Mapa em Tempo Real" view="live-map" />
        <SidebarItem icon={MapIcon} label="Rotas Individuais" view="my-route" />
        {delayedOrders.length > 0 && (
          <SidebarItem icon={AlertCircle} label={`Atrasos (${delayedOrders.length})`} view="delayed" />
        )}
        <SidebarItem icon={Users} label="Cadastros" view="users" />
        <SidebarItem icon={Wallet} label="Financeiro" view="finance" />
        <SidebarItem icon={SettingsIcon} label="Ajustes" view="settings" />
        <button onClick={onLogout} className="mt-auto flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] border-[var(--border-width)] border-[var(--color-border)] bg-[var(--color-danger)] text-[var(--color-text-inv)] font-black text-xs uppercase shadow-[var(--shadow-custom)] active:translate-y-1 active:shadow-none transition-all">
          <LogOut size={20} /> Sair
        </button>
      </aside>

      <main className="flex-1 pb-8 overflow-y-auto">
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
           <div className="lg:hidden flex justify-between items-center mb-2">
             <div className="flex items-center gap-2">
               <img src="/flashdelivery.png" alt="Flash Delivery logo" className="w-14 h-14 object-contain" />
             </div>
             <div className="flex gap-2">
                <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-[var(--color-primary)] border-[var(--border-width)] border-[var(--color-border)] rounded-lg shadow-[var(--shadow-custom)] active:translate-y-0.5 active:shadow-none transition-all"><MenuIcon size={20} strokeWidth={3}/></button>
                <button onClick={() => setViewMode('settings')} className="p-2 bg-[var(--color-surface)] border-[var(--border-width)] border-[var(--color-border)] rounded-lg shadow-[var(--shadow-custom)] active:translate-y-0.5 active:shadow-none transition-all"><SettingsIcon size={20}/></button>
                <button onClick={onLogout} className="p-2 bg-[var(--color-danger)] text-[var(--color-text-inv)] border-[var(--border-width)] border-[var(--color-border)] rounded-lg shadow-[var(--shadow-custom)] active:translate-y-0.5 active:shadow-none transition-all"><LogOut size={20}/></button>
             </div>
          </div>

          {viewMode === 'dashboard' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                 <div className="bg-[var(--color-surface)] p-4 rounded-[var(--radius-lg)] border-[var(--border-width-lg)] border-[var(--color-border)] shadow-[var(--shadow-custom)]">
                    <p className="text-[10px] font-black uppercase opacity-40">Ações Pendentes</p>
                    <p className="text-2xl font-[var(--font-display)]">{orders.filter(o => [OrderStatus.REQUESTED, OrderStatus.PRICED].includes(o.status)).length}</p>
                 </div>
                 <div className="bg-[var(--color-surface)] p-4 rounded-[var(--radius-lg)] border-[var(--border-width-lg)] border-[var(--color-border)] shadow-[var(--shadow-custom)]">
                    <p className="text-[10px] font-black uppercase opacity-40">Motos Online</p>
                    <p className="text-2xl font-[var(--font-display)] text-[var(--color-accent)]">{onlineDrivers.length}</p>
                 </div>
                 <div className="bg-[var(--color-surface)] p-4 rounded-[var(--radius-lg)] border-[var(--border-width-lg)] border-[var(--color-border)] shadow-[var(--shadow-custom)]">
                    <p className="text-[10px] font-black uppercase opacity-40">Entregas em Rota</p>
                    <p className="text-2xl font-[var(--font-display)] text-[var(--color-secondary)]">{orders.filter(o => ![OrderStatus.DELIVERED, OrderStatus.CANCELED, OrderStatus.REQUESTED, OrderStatus.PRICED].includes(o.status)).length}</p>
                 </div>
                 <div className={`bg-[var(--color-surface)] p-4 rounded-[var(--radius-lg)] border-[var(--border-width-lg)] border-[var(--color-border)] shadow-[var(--shadow-custom)] cursor-pointer transition-all ${delayedOrders.length > 0 ? 'border-[var(--color-danger)]' : ''}`}
                   onClick={() => delayedOrders.length > 0 && setViewMode('delayed')}>
                    <p className="text-[10px] font-black uppercase opacity-40">⏰ Em Atraso</p>
                    <p className={`text-2xl font-[var(--font-display)] ${delayedOrders.length > 0 ? 'text-[var(--color-danger)]' : ''}`}>{delayedOrders.length}</p>
                 </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                 <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      placeholder="Buscar por loja ou endereço..." 
                      className="w-full pl-10 pr-4 py-3 border-2 border-black rounded-xl font-bold text-xs shadow-inner"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                 </div>
                 <select 
                   className="border-2 border-black rounded-xl px-4 py-3 font-black text-[10px] uppercase bg-white cursor-pointer"
                   value={filterStatus}
                   onChange={e => setFilterStatus(e.target.value)}
                 >
                    <option value="PENDING_ACTION">⚠️ Ações Pendentes</option>
                    <option value="ACTIVE">⚡ Em Entrega</option>
                    <option value="DELIVERED">✅ Finalizadas</option>
                    <option value="ALL">📋 Todas</option>
                 </select>
              </div>

              <div className="space-y-4">
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-10 opacity-30 italic font-bold">Nenhum pedido encontrado.</div>
                ) : (
                  filteredOrders.map(order => (
                    <div key={order.id} className="bg-white rounded-2xl border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                       <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] font-black opacity-30">#{order.id.slice(-4)}</p>
                            <h3 className="font-black text-lg uppercase leading-none">{order.clientName}</h3>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border-2 border-black bg-gray-50">{order.status}</span>
                            <button onClick={() => setActiveChatOrderId(order.id)} className="text-blue-500 flex items-center gap-1 text-[10px] font-black hover:scale-110 transition-transform"><MessageSquare size={12}/> CHAT</button>
                          </div>
                       </div>
                       <div className="bg-gray-50 border-2 border-black border-dashed rounded-xl p-3 flex items-center gap-2">
                          <MapPin size={14} className="text-red-500" />
                          <p className="text-xs font-black truncate flex-1">{order.dropoffAddress}</p>
                       </div>
                       
                       <div className="flex gap-2">
                          {order.status === OrderStatus.REQUESTED && (
                            <div className="flex-1 flex gap-2">
                              <input type="number" placeholder="Valor R$" className="flex-1 border-2 border-black rounded-xl px-4 font-black text-xs"
                                value={priceInput[order.id] || ''} onChange={e => setPriceInput({...priceInput, [order.id]: e.target.value})}/>
                              <button onClick={() => handleSetPrice(order.id)} className="bg-[#A0D468] border-2 border-black p-3 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none"><Check size={20}/></button>
                            </div>
                          )}
                          {(order.status === OrderStatus.PRICED || order.status === OrderStatus.REQUESTED) && (
                            <div className="flex-1 flex gap-2">
                               <select className="flex-1 border-2 border-black rounded-xl px-2 font-black text-[10px] uppercase bg-white cursor-pointer"
                                 value={selectedAssignments[order.id] || ''} onChange={e => setSelectedAssignments({...selectedAssignments, [order.id]: e.target.value})}>
                                 <option value="">Escalar Motoboy...</option>
                                 {onlineDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                               </select>
                               <button onClick={() => handleAssignDriver(order.id)} className="bg-[#4FC1E9] border-2 border-black p-3 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none"><Send size={20}/></button>
                            </div>
                          )}
                       </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {viewMode === 'live-map' && (
            <div className="h-[calc(100vh-12rem)] flex flex-col gap-4 animate-in fade-in duration-500">
               <div className="flex items-center gap-3">
                  <div className="bg-[#ED5565] p-3 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-white"><Activity size={24} /></div>
                  <div>
                    <h2 className="font-['Titan_One'] text-2xl uppercase">Monitor de Entregas</h2>
                    <p className="text-[10px] font-black uppercase opacity-40">{activeDrivers.length} entregadores em rota agora</p>
                  </div>
               </div>

               <div className="flex-1 border-4 border-black rounded-[2.5rem] overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
                  <MapMock 
                    className="w-full h-full" 
                    showRoute={false} 
                    multiDrivers={activeDrivers} 
                    autoCenter={true} 
                  />
               </div>
            </div>
          )}

          {viewMode === 'my-route' && (
            <div className="h-[calc(100vh-12rem)] flex flex-col gap-4 animate-in fade-in duration-500">
               <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                     <div className="bg-[#AC92EC] p-3 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"><MapIcon size={24} /></div>
                     <h2 className="font-['Titan_One'] text-2xl uppercase">Rotas Individuais</h2>
                  </div>
                  <select 
                    className="w-full sm:w-64 border-4 border-black rounded-xl px-4 py-2 font-black text-xs uppercase bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"
                    value={selectedMotoId}
                    onChange={(e) => setSelectedMotoId(e.target.value)}
                  >
                     <option value="">Selecione um motoboy...</option>
                     {onlineDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
               </div>

               <div className="flex-1 border-4 border-black rounded-[2.5rem] overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
                  {!selectedMotoId ? (
                    <div className="absolute inset-0 bg-gray-50 flex flex-col items-center justify-center text-center p-8">
                       <Bike size={64} className="text-gray-300 mb-4 animate-bounce" />
                       <h3 className="font-['Titan_One'] text-xl uppercase opacity-40">Selecione um motoboy para ver sua rota detalhada</h3>
                    </div>
                  ) : (
                    <MapMock 
                      className="w-full h-full" 
                      showRoute={true} 
                      routeStops={motoRoute} 
                      currentLocation={motoLocation} 
                      autoCenter={true} 
                    />
                  )}
               </div>

               {selectedMotoId && motoRoute.length > 0 && (
                  <div className="bg-white p-4 border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                     <h4 className="font-black text-xs uppercase mb-2 flex items-center gap-2"><List size={16}/> Itinerário Atual</h4>
                     <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                        {motoRoute.map((stop, i) => (
                           <div key={stop.id} className="flex-shrink-0 bg-gray-50 border-2 border-black p-3 rounded-xl min-w-[200px]">
                              <p className="text-[10px] font-black uppercase opacity-40">{i+1}. {stop.type === 'PICKUP' ? 'Coleta' : 'Entrega'}</p>
                              <p className="text-[10px] font-bold truncate">{stop.address}</p>
                           </div>
                        ))}
                     </div>
                  </div>
               )}
            </div>
          )}

          {viewMode === 'delayed' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-5">
               <div className="flex items-center gap-3 mb-4">
                  <div className="bg-[#ED5565] p-3 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-white"><AlertCircle size={24} /></div>
                  <h2 className="font-['Titan_One'] text-2xl uppercase">Entregas em Atraso</h2>
               </div>
               
               {delayedOrders.length === 0 ? (
                  <div className="text-center py-10 opacity-50 font-bold text-lg">
                     ✅ Nenhuma entrega em atraso no momento!
                  </div>
               ) : (
                  <div className="space-y-4">
                     {delayedOrders.map(order => {
                        const lastUpdate = order.history[order.history.length - 1]?.timestamp || order.createdAt;
                        const delayMinutes = Math.floor((Date.now() - lastUpdate) / 60000);
                        const driver = drivers.find(d => d.id === order.driverId);
                        return (
                           <div key={order.id} className="bg-[#ED5565]/10 border-4 border-[#ED5565] rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(237,85,101,0.3)]">
                              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                 <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                       <span className="px-3 py-1 bg-[#ED5565] text-white rounded-lg font-black text-[10px]">⏰ {delayMinutes} min em atraso</span>
                                       <span className="px-3 py-1 bg-white border-2 border-[#ED5565] rounded-lg font-black text-[10px] text-[#ED5565]">#{order.id.slice(-4)}</span>
                                    </div>
                                    <h3 className="font-black text-xl uppercase mb-2">{order.clientName}</h3>
                                    <div className="space-y-2 text-sm">
                                       <p className="font-bold flex items-center gap-2"><MapPin size={16} className="text-[#ED5565]" /> {order.dropoffAddress}</p>
                                       <p className="font-bold">Status: <span className="uppercase">{order.status}</span></p>
                                       <p className="font-bold">Motoboy: {driver?.name || 'Não atribuído'}</p>
                                    </div>
                                 </div>
                                 <div className="flex flex-col gap-2 sm:items-end">
                                    <button onClick={() => setActiveChatOrderId(order.id)} className="flex items-center gap-2 px-4 py-3 bg-[#ED5565] text-white rounded-xl border-2 border-black font-black uppercase text-xs hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] transition-all">
                                       <MessageSquare size={16} /> CONVERSAR
                                    </button>
                                    <button 
                                       onClick={() => handleDeleteOrder(order.id)}
                                       disabled={isDeletingOrder === order.id}
                                       className="flex items-center gap-2 px-4 py-3 bg-[#ED5565] hover:bg-[#D63D50] text-white rounded-xl border-2 border-black font-black uppercase text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                       {isDeletingOrder === order.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} DELETAR
                                    </button>
                                 </div>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               )}
            </div>
          )}

          {viewMode === 'users' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-5">
               <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                     <div className="bg-[#FFCE54] p-3 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"><Users size={24} /></div>
                     <h2 className="font-['Titan_One'] text-2xl uppercase">Gestão de Cadastros</h2>
                  </div>
                  <button 
                    onClick={() => setEditingUser({ role: userTab })} 
                    className="w-full sm:w-auto bg-[#A0D468] border-4 border-black px-6 py-2 rounded-xl font-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 active:translate-y-1 transition-all"
                  >
                    <Plus size={20} strokeWidth={3}/> NOVO {userTab === UserRole.CLIENT ? 'CLIENTE' : userTab === UserRole.DRIVER ? 'MOTOBOY' : 'ADMIN'}
                  </button>
               </div>

               <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex gap-2 bg-white p-1 rounded-xl border-2 border-black w-full sm:w-fit overflow-x-auto">
                    <button onClick={() => setUserTab(UserRole.CLIENT)} className={`flex-1 sm:flex-none px-6 py-2 text-[10px] font-black uppercase rounded-lg transition-all whitespace-nowrap ${userTab === UserRole.CLIENT ? 'bg-[#FFCE54] border-2 border-black' : 'text-gray-400'}`}>Lojas</button>
                    <button onClick={() => setUserTab(UserRole.DRIVER)} className={`flex-1 sm:flex-none px-6 py-2 text-[10px] font-black uppercase rounded-lg transition-all whitespace-nowrap ${userTab === UserRole.DRIVER ? 'bg-[#4FC1E9] border-2 border-black text-black' : 'text-gray-400'}`}>Motoboys</button>
                    <button onClick={() => setUserTab(UserRole.ADMIN)} className={`flex-1 sm:flex-none px-6 py-2 text-[10px] font-black uppercase rounded-lg transition-all whitespace-nowrap ${userTab === UserRole.ADMIN ? 'bg-[#AC92EC] border-2 border-black text-black' : 'text-gray-400'}`}>Admins</button>
                  </div>
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      placeholder={`Buscar ${userTab === UserRole.CLIENT ? 'loja' : userTab === UserRole.DRIVER ? 'moto' : 'admin'}...`} 
                      className="w-full pl-10 pr-4 py-3 border-2 border-black rounded-xl font-bold text-xs"
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                    />
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredUsersList.length === 0 ? (
                    <div className="col-span-full py-20 text-center opacity-30 italic font-bold">Nenhum cadastro encontrado.</div>
                  ) : (
                    filteredUsersList.map(item => (
                      <div key={item.id} className="bg-white p-5 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-3 group hover:-translate-y-1 transition-all">
                         <div className="flex justify-between items-start">
                            <div className="min-w-0 pr-4">
                               <p className="font-black text-sm uppercase truncate">{item.name}</p>
                               <p className="text-[9px] font-black text-gray-400 uppercase">Login: @{item.username}</p>
                            </div>
                            <div className="flex gap-2">
                               <button onClick={() => setEditingUser(item)} className="p-2 bg-blue-50 border-2 border-black rounded-lg hover:bg-blue-100 transition-colors"><Edit3 size={16}/></button>
                               <button onClick={() => handleDeleteUser(item.id)} className="p-2 bg-red-50 border-2 border-black rounded-lg hover:bg-red-100 transition-colors"><Trash2 size={16}/></button>
                            </div>
                         </div>
                         
                         <div className="space-y-1">
                            <p className="text-[10px] font-bold text-gray-500 flex items-center gap-1"><Phone size={10}/> {item.phone || 'Sem contato'}</p>
                            {item.role === UserRole.CLIENT ? (
                               <p className="text-[10px] font-bold text-gray-400 truncate flex items-center gap-1"><MapPin size={10}/> {item.address || 'Endereço não cadastrado'}</p>
                            ) : (
                               <div className="flex items-center gap-2 mt-1">
                                  <div className={`w-2 h-2 rounded-full ${item.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                  <span className="text-[8px] font-black uppercase opacity-60">{item.isOnline ? 'Disponível' : 'Offline'}</span>
                               </div>
                            )}
                         </div>

                         {item.role === UserRole.CLIENT && item.fixedDeliveryPrice && (
                           <div className="flex items-center gap-1 text-[9px] font-black text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200 w-fit">
                              <DollarSign size={10}/> PREÇO FIXO: R$ {item.fixedDeliveryPrice.toFixed(2)}
                           </div>
                         )}
                         {item.role === UserRole.DRIVER && (item.pixKey || item.bankAccount) && (
                           <div className="flex items-center gap-1 text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200 w-fit">
                              <Wallet size={10}/> DADOS DE PAGAMENTO OK
                           </div>
                         )}
                      </div>
                    ))
                  )}
               </div>
            </div>
          )}

          {viewMode === 'finance' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-5">
               <div className="flex items-center gap-3">
                  <div className="bg-[#A0D468] p-3 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"><Wallet size={32} /></div>
                  <h2 className="font-['Titan_One'] text-3xl uppercase">Financeiro</h2>
               </div>

               {/* Settlement Requests from stores */}
               {settlementRequests && settlementRequests.length > 0 && (
                 <div className="bg-white p-4 rounded-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    <h4 className="font-black uppercase text-sm mb-2">Solicitações de Fechamento Recebidas</h4>
                    <div className="space-y-3">
                      {settlementRequests.map(req => (
                        <div key={req.id} className="flex items-start justify-between bg-gray-50 p-3 rounded-lg border-2 border-black">
                           <div className="flex-1">
                              <p className="font-bold">{req.clientName} · R$ {req.total.toFixed(2)}</p>
                              <p className="text-xs text-gray-600">{new Date(req.createdAt).toLocaleString()}</p>
                              {req.proof ? (
                                <div className="mt-2">
                                   <p className="text-[10px] font-black uppercase">Comprovante:</p>
                                   <a href={req.proof.dataUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">Abrir comprovante</a>
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500 mt-2">Aguardando comprovante</p>
                              )}
                           </div>
                           <div className="flex flex-col gap-2 ml-4">
                              {req.status !== 'PAID' && (
                                <button onClick={async () => { try { await db.approveSettlement(req.id); notify('Sucesso', 'Pagamento confirmado e baixa aplicada.', 'success'); await loadData(); } catch(e:any){ notify('Erro', e.message, 'error'); } }} className="bg-[#A0D468] px-3 py-2 rounded-lg font-black border-2 border-black">Confirmar Pagamento</button>
                              )}
                              <button onClick={async () => { try { /* optionally cancel */ } catch(e){} }} className="bg-white px-3 py-2 rounded-lg font-black border-2 border-black">Ver detalhes</button>
                           </div>
                        </div>
                      ))}
                    </div>
                 </div>
               )}

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-[2rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center text-center">
                     <p className="text-xs font-black uppercase text-gray-400 mb-1">Pendente Motoboys</p>
                     <p className="text-4xl font-['Titan_One'] text-[#ED5565]">R$ {financeData.totalPendingDrivers.toFixed(2)}</p>
                  </div>
                  <div className="bg-white p-6 rounded-[2rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center text-center">
                     <p className="text-xs font-black uppercase text-gray-400 mb-1">Pendente Lojas</p>
                     <p className="text-4xl font-['Titan_One'] text-[#4FC1E9]">R$ {financeData.totalPendingClients.toFixed(2)}</p>
                  </div>
               </div>

               <div className="flex gap-2 bg-white p-1 rounded-xl border-2 border-black w-fit mx-auto sm:mx-0">
                  <button onClick={() => { setFinanceView('summary'); setFinanceTab('drivers'); }} className={`px-6 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${financeView === 'summary' ? 'bg-[#FFCE54] border-2 border-black' : 'text-gray-400'}`}>💰 Acertos</button>
                  <button onClick={() => setFinanceView('reports')} className={`px-6 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${financeView === 'reports' ? 'bg-[#4FC1E9] border-2 border-black text-black' : 'text-gray-400'}`}>📊 Relatórios</button>
               </div>

               {financeView === 'summary' && (
                  <>
                    <div className="flex gap-2 bg-white p-1 rounded-xl border-2 border-black w-fit mx-auto sm:mx-0">
                      <button onClick={() => setFinanceTab('drivers')} className={`px-6 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${financeTab === 'drivers' ? 'bg-[#FFCE54] border-2 border-black' : 'text-gray-400'}`}>Motoboys</button>
                      <button onClick={() => setFinanceTab('clients')} className={`px-6 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${financeTab === 'clients' ? 'bg-[#4FC1E9] border-2 border-black text-black' : 'text-gray-400'}`}>Lojas</button>
                    </div>

               <div className="space-y-4">
                  <h3 className="font-black text-lg uppercase flex items-center gap-2">
                    {financeTab === 'drivers' ? <><Bike size={20}/> Saldos Motoboy</> : <><Store size={20}/> Saldos Lojas</>}
                  </h3>
                  
                  {financeTab === 'drivers' ? (
                    financeData.drivers.length === 0 ? (
                      <div className="bg-white p-12 rounded-[2rem] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center opacity-40 italic font-bold">
                         Nenhum acerto de motoboy pendente.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {financeData.drivers.map(drv => (
                          <div key={drv.id} className="bg-white p-5 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-4 group hover:-translate-y-1 transition-all">
                             <div className="flex justify-between items-center">
                                <div className="min-w-0 pr-4">
                                   <p className="font-black text-sm uppercase truncate">{drv.name}</p>
                                   <p className="text-[10px] font-black text-gray-400 uppercase">{drv.count} entregas pendentes</p>
                                   <p className="text-xl font-['Titan_One'] mt-1">R$ {drv.total.toFixed(2)}</p>
                                </div>
                                <button 
                                  onClick={() => handleSettleDriver(drv.id)}
                                  disabled={isSettling === drv.id}
                                  className={`bg-[#A0D468] border-4 border-black p-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center min-w-[64px] ${isSettling === drv.id ? 'opacity-50' : ''}`}
                                >
                                   {isSettling === drv.id ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle2 size={24} />}
                                </button>
                             </div>
                             
                             <div className="flex items-center gap-2 bg-gray-50 border-2 border-black rounded-xl p-3">
                                {drv.paymentMethod === 'debito' ? <Building size={16} className="text-blue-500" /> : <Wallet size={16} className="text-orange-500" />}
                                <div className="flex-1">
                                   <p className="text-[9px] font-black uppercase opacity-40">Preferência de Recebimento</p>
                                   <div className="flex flex-col">
                                      <span className="text-[10px] font-black uppercase">{drv.paymentMethod === 'debito' ? 'Débito em Conta' : 'PIX (Chave)'}</span>
                                      <span className="text-[10px] font-bold text-gray-400 truncate">{drv.paymentMethod === 'debito' ? (drv.bankAccount || 'Não informado') : (drv.pixKey || 'Não informado')}</span>
                                   </div>
                                </div>
                             </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    financeData.clients.length === 0 ? (
                      <div className="bg-white p-12 rounded-[2rem] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center opacity-40 italic font-bold">
                         Nenhum acerto de loja pendente.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {financeData.clients.map(cli => (
                          <div key={cli.id} className="bg-white p-5 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-4 group hover:-translate-y-1 transition-all">
                             <div className="flex justify-between items-start">
                                <div className="min-w-0 pr-4">
                                   <p className="font-black text-sm uppercase truncate">{cli.name}</p>
                                   <p className="text-[10px] font-black text-gray-400 uppercase">{cli.count} corridas a faturar</p>
                                </div>
                                <div className="text-right">
                                   <p className="text-xl font-['Titan_One']">R$ {cli.total.toFixed(2)}</p>
                                </div>
                             </div>

                             <div className="flex items-center gap-2 bg-gray-50 border-2 border-black rounded-xl p-2">
                                <Clock size={16} className="text-blue-500" />
                                <div className="flex-1">
                                   <p className="text-[9px] font-black uppercase opacity-40">Ciclo de Acerto</p>
                                   <select 
                                     className="w-full bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                                     value={clientCycles[cli.id] || 'semanal'}
                                     onChange={e => setClientCycles({...clientCycles, [cli.id]: e.target.value as any})}
                                   >
                                      <option value="semanal">Semanal (7 dias)</option>
                                      <option value="quinzenal">Quinzenal (15 dias)</option>
                                      <option value="mensal">Mensal (30 dias)</option>
                                   </select>
                                </div>
                             </div>

                             <button 
                               onClick={() => handleSettleClient(cli.id)}
                               disabled={isSettling === cli.id}
                               className={`w-full bg-[#4FC1E9] border-4 border-black py-3 rounded-xl font-['Titan_One'] text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 ${isSettling === cli.id ? 'opacity-50' : ''}`}
                             >
                                {isSettling === cli.id ? <Loader2 size={18} className="animate-spin" /> : <Building2 size={18} />}
                                Confirmar Recebimento
                             </button>
                          </div>
                        ))}
                      </div>
                    )
                  )}
               </div>
                  </>
               )}

               {financeView === 'reports' && (
                  <div className="space-y-6 animate-in fade-in">
                    <div className="bg-white p-6 rounded-[2rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                      <h3 className="font-black text-lg uppercase tracking-wider border-b-2 border-gray-100 pb-3 mb-6 flex items-center gap-2">
                        📊 Relatórios e Recibos
                      </h3>

                      <div className="space-y-6">
                        <div>
                          <h4 className="font-black text-md uppercase mb-4 flex items-center gap-2"><Bike size={20} className="text-[#ED5565]"/> Recibos de Pagamento - Motoboys</h4>
                          {financeData.drivers.length === 0 ? (
                            <div className="bg-gray-50 p-8 rounded-xl border-2 border-black text-center opacity-40 font-bold">
                              Nenhum motoboy com saldo pendente.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {financeData.drivers.map(drv => {
                                const driverOrders = orders.filter(o => o.driverId === drv.id && o.status === OrderStatus.DELIVERED && o.driverPaymentStatus !== PaymentStatus.PAID);
                                return (
                                  <div key={drv.id} className="bg-gradient-to-br from-[#ED5565]/10 to-transparent p-4 rounded-xl border-2 border-[#ED5565]">
                                    <div className="flex justify-between items-start mb-3">
                                      <div>
                                        <p className="font-black text-sm uppercase">{drv.name}</p>
                                        <p className="text-[10px] font-bold text-gray-500">{driverOrders.length} entregas • R$ {drv.total.toFixed(2)}</p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => {
                                        generateDriverReceipt(drv, { orders: driverOrders, total: drv.total });
                                      }}
                                      className="w-full bg-[#ED5565] text-white border-2 border-black px-4 py-2 rounded-lg font-black text-xs uppercase hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] transition-all flex items-center justify-center gap-2"
                                    >
                                      🖨️ Gerar Recibo
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="border-t-4 border-black pt-6">
                          <h4 className="font-black text-md uppercase mb-4 flex items-center gap-2"><Store size={20} className="text-[#A0D468]"/> Recibos de Cobrança - Lojas</h4>
                          {financeData.clients.length === 0 ? (
                            <div className="bg-gray-50 p-8 rounded-xl border-2 border-black text-center opacity-40 font-bold">
                              Nenhuma loja com saldo pendente.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {financeData.clients.map(cli => {
                                const clientOrders = orders.filter(o => o.clientId === cli.id && o.status === OrderStatus.DELIVERED && o.paymentStatus !== PaymentStatus.PAID);
                                return (
                                  <div key={cli.id} className="bg-gradient-to-br from-[#A0D468]/10 to-transparent p-4 rounded-xl border-2 border-[#A0D468]">
                                    <div className="flex justify-between items-start mb-3">
                                      <div>
                                        <p className="font-black text-sm uppercase">{cli.name}</p>
                                        <p className="text-[10px] font-bold text-gray-500">{clientOrders.length} corridas • R$ {cli.total.toFixed(2)}</p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => {
                                        generateClientReceipt(cli, { orders: clientOrders, total: cli.total });
                                      }}
                                      className="w-full bg-[#A0D468] text-black border-2 border-black px-4 py-2 rounded-lg font-black text-xs uppercase hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] transition-all flex items-center justify-center gap-2"
                                    >
                                      🖨️ Gerar Recibo
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
               )}
            </div>
          )}

          {viewMode === 'settings' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-5">
              <div className="flex items-center gap-3">
                 <div className="bg-[#FFCE54] p-3 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"><SettingsIcon size={32} /></div>
                 <h2 className="font-['Titan_One'] text-3xl">Ajustes</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
                {/* Seção Dados do Responsável */}
                <div className="bg-white p-6 rounded-[2rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6 lg:col-span-2">
                  <h3 className="font-black text-lg uppercase tracking-wider border-b-2 border-gray-100 pb-2 flex items-center gap-2">
                    <UserIcon size={18} className="text-[#4FC1E9]"/> Dados do Responsável pela Central
                  </h3>
                  <form onSubmit={handleUpdateCentralData} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Nome do Responsável</label>
                      <div className="flex items-center border-2 border-black rounded-xl p-3 bg-gray-50 focus-within:bg-white transition-all">
                        <UserIcon size={18} className="mr-2 opacity-30"/>
                        <input className="bg-transparent outline-none w-full text-sm font-bold" 
                          value={centralData.responsibleName} 
                          onChange={e => setCentralData({...centralData, responsibleName: e.target.value})} 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Endereço da Central</label>
                      <div className="flex items-center border-2 border-black rounded-xl p-3 bg-gray-50 focus-within:bg-white transition-all">
                        <MapPin size={18} className="mr-2 opacity-30"/>
                        <input className="bg-transparent outline-none w-full text-sm font-bold" 
                          value={centralData.address} 
                          onChange={e => setCentralData({...centralData, address: e.target.value})} 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Email para Suporte</label>
                      <div className="flex items-center border-2 border-black rounded-xl p-3 bg-gray-50 focus-within:bg-white transition-all">
                        <Mail size={18} className="mr-2 opacity-30"/>
                        <input type="email" className="bg-transparent outline-none w-full text-sm font-bold" 
                          value={centralData.supportEmail} 
                          onChange={e => setCentralData({...centralData, supportEmail: e.target.value})} 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Telefone Fixo/Cel</label>
                        <div className="flex items-center border-2 border-black rounded-xl p-3 bg-gray-50 focus-within:bg-white transition-all">
                          <Phone size={18} className="mr-2 opacity-30"/>
                          <input className="bg-transparent outline-none w-full text-sm font-bold" 
                            value={centralData.phone} 
                            onChange={e => setCentralData({...centralData, phone: e.target.value})} 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">WhatsApp</label>
                        <div className="flex items-center border-2 border-black rounded-xl p-3 bg-gray-50 focus-within:bg-white transition-all">
                          <MessageCircle size={18} className="mr-2 opacity-30"/>
                          <input className="bg-transparent outline-none w-full text-sm font-bold" 
                            value={centralData.whatsapp} 
                            onChange={e => setCentralData({...centralData, whatsapp: e.target.value})} 
                          />
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-2 pt-2">
                       <button 
                        type="submit" 
                        disabled={isUpdatingCentral}
                        className="w-full md:w-fit px-8 bg-[#A0D468] border-4 border-black py-3 rounded-xl font-['Titan_One'] text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                       >
                         {isUpdatingCentral ? <Loader2 className="animate-spin" size={18}/> : <><Save size={18}/> Salvar Dados da Central</>}
                       </button>
                    </div>
                  </form>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
                  <h3 className="font-black text-lg uppercase tracking-wider border-b-2 border-gray-100 pb-2 flex items-center gap-2"><Bell size={18} className="text-[#FFCE54]"/> Notificações</h3>
                  
                  <div className="space-y-4">
                     <div className="bg-gray-50 border-2 border-black p-4 rounded-xl flex items-center justify-between">
                        <div>
                           <p className="font-black text-xs uppercase">Permissão do Sistema</p>
                           <p className="text-[10px] font-bold text-gray-400">Status: {permission === 'granted' ? 'ATIVO' : permission === 'denied' ? 'BLOQUEADO' : 'PENDENTE'}</p>
                        </div>
                        {permission !== 'granted' ? (
                           <button onClick={() => requestPermission()} className="bg-[#4FC1E9] border-2 border-black px-3 py-1 rounded-lg font-black text-[10px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Ativar</button>
                        ) : (
                           <div className="text-green-500 font-black text-xs">✓ OK</div>
                        )}
                     </div>

                     {[
                        { key: 'newOrders', label: 'Novos Pedidos', icon: Zap },
                        { key: 'criticalAlerts', label: 'Alertas Críticos (Atrasos)', icon: AlertCircle },
                        { key: 'statusUpdates', label: 'Atualizações de Entrega', icon: BellRing }
                     ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between p-2 border-b-2 border-gray-50">
                           <div className="flex items-center gap-2 text-xs font-bold">
                              <item.icon size={16} className="text-gray-400" />
                              <span>{item.label}</span>
                           </div>
                           <button 
                              onClick={() => updatePreference(item.key as any, !user.preferences?.[item.key as keyof NotificationPreferences])}
                              className={`w-10 h-6 rounded-full border-2 border-black relative transition-colors ${user.preferences?.[item.key as keyof NotificationPreferences] ? 'bg-[#A0D468]' : 'bg-gray-200'}`}
                           >
                              <div className={`absolute top-0.5 w-4 h-4 bg-white border-2 border-black rounded-full transition-all ${user.preferences?.[item.key as keyof NotificationPreferences] ? 'left-4' : 'left-0.5'}`}></div>
                           </button>
                        </div>
                     ))}
                  </div>
                </div>

                <div className="bg-[var(--color-surface)] p-6 rounded-[var(--radius-xl)] border-[var(--border-width-lg)] border-[var(--color-border)] shadow-[var(--shadow-custom)] space-y-6">
                  <h3 className="font-black text-lg uppercase tracking-wider border-b-2 border-gray-100 pb-2">Aparência</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'cartoon', label: 'Cartoon', icon: Smile, color: 'bg-[#FFCE54]' },
                      { id: 'corporate', label: 'Corp', icon: Briefcase, color: 'bg-[#2563EB]' },
                      { id: 'dark', label: 'Dark', icon: Moon, color: 'bg-[#111827]' }
                    ].map((t) => (
                      <button 
                        key={t.id}
                        onClick={() => setTheme(t.id as any)}
                        className={`p-3 rounded-[var(--radius-lg)] border-[var(--border-width)] border-[var(--color-border)] transition-all flex flex-col items-center gap-2 ${theme === t.id ? 'bg-[var(--color-surface)] shadow-[var(--shadow-custom)] -translate-y-1' : 'bg-gray-50 opacity-60'}`}
                      >
                         <div className={`w-10 h-10 ${t.color} rounded-[var(--radius-md)] border-[var(--border-width)] border-[var(--color-border)] flex items-center justify-center text-white`}>
                           <t.icon size={20} />
                         </div>
                         <span className="font-black text-[9px] uppercase">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL PARA CRIAR/EDITAR USUÁRIO */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
              <div className={`p-6 border-b-4 border-black flex justify-between items-center ${editingUser.role === UserRole.CLIENT ? 'bg-[#FFCE54]' : editingUser.role === UserRole.DRIVER ? 'bg-[#4FC1E9]' : 'bg-[#AC92EC]'}`}>
                 <h3 className="font-['Titan_One'] text-2xl uppercase tracking-tighter">
                   {editingUser.id ? 'Editar' : 'Novo'} {editingUser.role === UserRole.CLIENT ? 'Cliente' : editingUser.role === UserRole.DRIVER ? 'Motoboy' : 'Admin'}
                 </h3>
                 <button onClick={() => setEditingUser(null)} className="p-2 bg-white border-2 border-black rounded-xl"><X size={20}/></button>
              </div>
              <form onSubmit={handleSaveUser} className="p-8 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
                 <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Nome Completo</label>
                        <div className="flex items-center border-2 border-black rounded-xl p-3 bg-gray-50">
                           <UserIcon size={20} className="mr-2 opacity-30"/>
                           <input required className="bg-transparent outline-none w-full text-sm font-bold" value={editingUser.name || ''} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                           <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Login (Acesso)</label>
                           <div className="flex items-center border-2 border-black rounded-xl p-3 bg-gray-50">
                              <Key size={18} className="mr-2 opacity-30"/>
                              <input required disabled={!!editingUser.id} className="bg-transparent outline-none w-full text-sm font-bold disabled:opacity-50" value={editingUser.username || ''} onChange={e => setEditingUser({...editingUser, username: e.target.value})} />
                           </div>
                        </div>
                        {!editingUser.id ? (
                          <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Senha Inicial</label>
                            <div className="flex items-center border-2 border-black rounded-xl p-3 bg-gray-50">
                               <input required className="bg-transparent outline-none w-full text-sm font-bold" type="password" value={editingUser.password || ''} onChange={e => setEditingUser({...editingUser, password: e.target.value})} />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-end">
                             <p className="text-[8px] font-black uppercase opacity-40 bg-gray-100 p-2 rounded-lg text-center w-full">Senha protegida após criação</p>
                          </div>
                        )}
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Telefone / WhatsApp</label>
                        <div className="flex items-center border-2 border-black rounded-xl p-3 bg-gray-50">
                           <Phone size={20} className="mr-2 opacity-30"/>
                           <input required className="bg-transparent outline-none w-full text-sm font-bold" value={editingUser.phone || ''} onChange={e => setEditingUser({...editingUser, phone: e.target.value})} />
                        </div>
                    </div>

                    {editingUser.role === UserRole.CLIENT ? (
                      <>
                        <div>
                           <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Endereço Principal</label>
                           <div className="flex items-center border-2 border-black rounded-xl p-3 bg-gray-50">
                              <MapPin size={20} className="mr-2 opacity-30"/>
                              <input className="bg-transparent outline-none w-full text-sm font-bold" value={editingUser.address || ''} onChange={e => setEditingUser({...editingUser, address: e.target.value})} />
                           </div>
                        </div>
                        <div>
                           <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Preço Fixo por Entrega (Opcional)</label>
                           <div className="flex items-center border-2 border-black rounded-xl p-3 bg-green-50 border-green-200">
                              <DollarSign size={20} className="mr-2 text-green-500"/>
                              <input type="number" step="0.01" placeholder="Ex: 10.00" className="bg-transparent outline-none w-full text-sm font-black text-green-700" value={editingUser.fixedDeliveryPrice || ''} onChange={e => setEditingUser({...editingUser, fixedDeliveryPrice: parseFloat(e.target.value) || undefined})} />
                           </div>
                        </div>
                      </>
                    ) : editingUser.role === UserRole.DRIVER ? (
                      <>
                        <div>
                           <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Chave PIX</label>
                           <div className="flex items-center border-2 border-black rounded-xl p-3 bg-blue-50 border-blue-100">
                              <Zap size={20} className="mr-2 text-blue-500"/>
                              <input placeholder="CPF, Email, Celular..." className="bg-transparent outline-none w-full text-sm font-bold" value={editingUser.pixKey || ''} onChange={e => setEditingUser({...editingUser, pixKey: e.target.value})} />
                           </div>
                        </div>
                        <div>
                           <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Dados Bancários (Débito)</label>
                           <div className="flex items-center border-2 border-black rounded-xl p-3 bg-gray-50">
                              <Building size={20} className="mr-2 opacity-30"/>
                              <input placeholder="Banco / Agência / Conta" className="bg-transparent outline-none w-full text-sm font-bold" value={editingUser.bankAccount || ''} onChange={e => setEditingUser({...editingUser, bankAccount: e.target.value})} />
                           </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                           <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Email (Opcional)</label>
                           <div className="flex items-center border-2 border-black rounded-xl p-3 bg-gray-50">
                              <Mail size={20} className="mr-2 opacity-30"/>
                              <input type="email" placeholder="admin@flashdelivery.app" className="bg-transparent outline-none w-full text-sm font-bold" value={(editingUser as any).email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value} as any)} />
                           </div>
                        </div>
                        <div>
                           <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Observações (Opcional)</label>
                           <div className="flex items-center border-2 border-black rounded-xl p-3 bg-gray-50">
                              <MessageCircle size={20} className="mr-2 opacity-30"/>
                              <input placeholder="Ex: Gerente, Supervisor..." className="bg-transparent outline-none w-full text-sm font-bold" value={(editingUser as any).notes || ''} onChange={e => setEditingUser({...editingUser, notes: e.target.value} as any)} />
                           </div>
                        </div>
                      </>
                    )}
                 </div>

                 <button type="submit" disabled={isSavingUser} className="w-full bg-[#A0D468] border-4 border-black py-4 mt-4 rounded-2xl font-['Titan_One'] text-xl uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2">
                    {isSavingUser ? <Loader2 className="animate-spin"/> : <><Save size={24}/> Salvar Cadastro</>}
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* MENU DRAWER MOBILE */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
           <div className="relative w-72 bg-white h-full border-l-4 border-black flex flex-col p-6 shadow-[-8px_0px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-right duration-300">
              <div className="flex justify-between items-center mb-8">
                 <div className="flex items-center gap-2">
                    <Zap className="text-[#FFCE54] fill-[#FFCE54] stroke-black" size={24} />
                    <span className="font-['Titan_One'] text-lg uppercase tracking-tighter">Central</span>
                 </div>
                 <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-gray-50 border-2 border-black rounded-xl active:translate-y-1 active:shadow-none transition-all"><X size={20}/></button>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
                 <SidebarItem icon={LayoutDashboard} label="Monitor Geral" view="dashboard" />
                 <SidebarItem icon={Activity} label="Monitor Ao Vivo" view="live-map" />
                 <SidebarItem icon={MapIcon} label="Rotas Individuais" view="my-route" />
                 <SidebarItem icon={Users} label="Gestão de Contas" view="users" />
                 <SidebarItem icon={Wallet} label="Financeiro" view="finance" />
                 <SidebarItem icon={SettingsIcon} label="Configurações" view="settings" />
              </div>

              <button onClick={onLogout} className="mt-4 flex items-center justify-between w-full p-4 bg-[#ED5565] text-white border-4 border-black rounded-2xl font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all">
                <span>Sair do Painel</span>
                <LogOut size={18} />
              </button>
           </div>
        </div>
      )}

      {activeChatOrderId && (
        <ChatModal 
          orderId={activeChatOrderId}
          currentUser={user}
          messages={orders.find(o => o.id === activeChatOrderId)?.chatMessages || []}
          onClose={() => setActiveChatOrderId(null)}
          onRefresh={loadData}
        />
      )}
    </div>
  );
};
