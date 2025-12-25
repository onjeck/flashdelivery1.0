
import { Order, OrderStatus, User, UserRole, Coordinates, NotificationPreferences, ChatMessage, DeliveryRegion, PaymentStatus } from '../types';
import { socketService, SocketEvent, SettlementSocketEvent } from './socketService';
import { RealDB } from './realDb';

const USE_REAL_DB = true; 

const DEFAULT_PREFS: NotificationPreferences = {
  criticalAlerts: true,
  newOrders: true,
  statusUpdates: true,
  marketing: false
};

const STORAGE_KEYS = { USERS: 'flash_users', ORDERS: 'flash_orders', REGIONS: 'flash_regions', CURRENT_USER: 'flash_current_user', SETTLEMENTS: 'flash_settlements' };

class MockDB {
  constructor() { this.init(); }
  
  private init() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
        const initialUsers: User[] = [
          { id: 'a1', name: 'João Vitor', username: 'admin', password: 'admin123', role: UserRole.ADMIN, preferences: DEFAULT_PREFS },
          { id: 'm1', name: 'Carlos Motoboy', username: 'moto', password: '123456', role: UserRole.DRIVER, isOnline: true, preferences: DEFAULT_PREFS, stats: { totalDeliveries: 0, averageRating: 5.0, punctualityScore: 100, level: 'BRONZE', points: 0, badges: [] } },
          { id: 'c1', name: 'Loja Exemplo', username: 'loja', password: '123456', role: UserRole.CLIENT, preferences: DEFAULT_PREFS, address: 'Av. Paulista, 1000' }
        ];
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(initialUsers));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
    if (!localStorage.getItem(STORAGE_KEYS.REGIONS)) localStorage.setItem(STORAGE_KEYS.REGIONS, JSON.stringify([]));
    if (!localStorage.getItem(STORAGE_KEYS.SETTLEMENTS)) localStorage.setItem(STORAGE_KEYS.SETTLEMENTS, JSON.stringify([]));
  }

  async login(u: string, p: string): Promise<User> {
    const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const user = users.find(usr => usr.username.toLowerCase() === u.toLowerCase() && usr.password === p);
    if (!user) throw new Error('Usuário ou senha incorretos.');
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return user;
  }

  logout() { localStorage.removeItem(STORAGE_KEYS.CURRENT_USER); }
  
  getUser(): User | null { 
    const u = localStorage.getItem(STORAGE_KEYS.CURRENT_USER); 
    return u ? JSON.parse(u) : null; 
  }

  async getOrders(): Promise<Order[]> {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
  }

  async getDrivers(): Promise<User[]> {
    const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    return users.filter(u => u.role === UserRole.DRIVER);
  }

  async getSettlementRequests(): Promise<any[]> {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTLEMENTS) || '[]');
  }

  async createSettlementRequest(data: { clientId: string; clientName: string; orderIds: string[]; total: number; timestamp?: number; proof?: { name: string; dataUrl: string } | null; }): Promise<any> {
    const settlements = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTLEMENTS) || '[]');
    const newReq = {
      id: `sett-${Date.now()}`,
      clientId: data.clientId,
      clientName: data.clientName,
      orderIds: data.orderIds,
      total: data.total,
      proof: data.proof || null,
      status: 'REQUESTED', // REQUESTED | PROOF_SENT | PAID | CANCELED
      createdAt: data.timestamp || Date.now(),
      updatedAt: Date.now()
    };
    settlements.unshift(newReq);
    localStorage.setItem(STORAGE_KEYS.SETTLEMENTS, JSON.stringify(settlements));
    // notify central
    try { (socketService as any).emit((SettlementSocketEvent as any).SETTLEMENT_REQUEST_CREATED, newReq); } catch(e) { /* best-effort */ }
    return newReq;
  }

  async attachProofToSettlement(settlementId: string, proof: { name: string; dataUrl: string }): Promise<any> {
    const settlements = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTLEMENTS) || '[]');
    const idx = settlements.findIndex((s: any) => s.id === settlementId);
    if (idx === -1) throw new Error('Solicitação não encontrada');
    settlements[idx].proof = proof;
    settlements[idx].status = 'PROOF_SENT';
    settlements[idx].updatedAt = Date.now();
    localStorage.setItem(STORAGE_KEYS.SETTLEMENTS, JSON.stringify(settlements));
    try { (socketService as any).emit((SettlementSocketEvent as any).SETTLEMENT_REQUEST_UPDATED, settlements[idx]); } catch(e) { }
    return settlements[idx];
  }

  async approveSettlement(settlementId: string): Promise<void> {
    const settlements = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTLEMENTS) || '[]');
    const idx = settlements.findIndex((s: any) => s.id === settlementId);
    if (idx === -1) throw new Error('Solicitação não encontrada');
    const req = settlements[idx];
    // mark orders as paid
    const orders = await this.getOrders();
    req.orderIds.forEach((id: string) => {
      const oi = orders.find(o => o.id === id);
      if (oi) oi.paymentStatus = PaymentStatus.PAID;
    });
    // persist orders
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    // update settlement
    settlements[idx].status = 'PAID';
    settlements[idx].updatedAt = Date.now();
    localStorage.setItem(STORAGE_KEYS.SETTLEMENTS, JSON.stringify(settlements));
    // emit updates for orders and settlement
    orders.forEach(o => (socketService as any).emit(SocketEvent.ORDER_UPDATED, o));
    try { (socketService as any).emit((SettlementSocketEvent as any).SETTLEMENT_REQUEST_UPDATED, settlements[idx]); } catch(e) { }
  }

  async getClients(): Promise<User[]> {
    const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    return users.filter(u => u.role === UserRole.CLIENT);
  }

  async getAdmins(): Promise<User[]> {
    const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    return users.filter(u => u.role === UserRole.ADMIN);
  }

  async createUser(userData: Partial<User>): Promise<User> {
    const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    if (users.some(u => u.username.toLowerCase() === userData.username?.toLowerCase())) {
      throw new Error('Este login já está em uso.');
    }
    const newUser = {
      id: `u-${Date.now()}`,
      ...userData,
      preferences: DEFAULT_PREFS,
      stats: userData.role === UserRole.DRIVER ? { totalDeliveries: 0, averageRating: 5.0, punctualityScore: 100, level: 'BRONZE' as any, points: 0, badges: [] } : undefined
    } as User;
    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    return newUser;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const idx = users.findIndex(u => u.id === userId);
    if (idx > -1) {
      users[idx] = { ...users[idx], ...updates };
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      const current = this.getUser();
      if (current && current.id === userId) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(users[idx]));
      }
      if (users[idx].role === UserRole.DRIVER || users[idx].role === UserRole.ADMIN) {
        socketService.emit(SocketEvent.DRIVER_UPDATED, users[idx]);
      }
      return users[idx];
    }
    throw new Error('Usuário não encontrado');
  }

  async deleteUser(userId: string): Promise<void> {
    const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const filtered = users.filter(u => u.id !== userId);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(filtered));
  }

  async createOrder(orderData: Partial<Order>): Promise<Order> {
    const orders = await this.getOrders();
    const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const client = users.find(u => u.id === orderData.clientId);
    
    let finalStatus = OrderStatus.REQUESTED;
    let finalPrice = orderData.price;

    if (client?.fixedDeliveryPrice) {
      finalPrice = client.fixedDeliveryPrice;
      finalStatus = OrderStatus.PRICED;
    }

    const newOrder: Order = {
      id: `order-${Date.now()}`,
      status: finalStatus,
      price: finalPrice,
      paymentStatus: PaymentStatus.PENDING,
      driverPaymentStatus: PaymentStatus.PENDING,
      createdAt: Date.now(),
      history: [{ status: finalStatus, timestamp: Date.now() }],
      chatMessages: [],
      ...orderData
    } as Order;
    orders.unshift(newOrder);
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    socketService.emit(SocketEvent.ORDER_CREATED, newOrder);
    return newOrder;
  }

  async createDirectOrder(orderData: Partial<Order>, adminId: string, adminName: string): Promise<Order> {
    const orders = await this.getOrders();
    const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const client = users.find(u => u.id === orderData.clientId);
    
    let finalPrice = client?.fixedDeliveryPrice || 10.0;

    const newOrder: Order = {
      id: `order-dir-${Date.now()}`,
      status: OrderStatus.ASSIGNED,
      paymentStatus: PaymentStatus.PENDING,
      driverPaymentStatus: PaymentStatus.PENDING,
      createdAt: Date.now(),
      driverId: adminId,
      driverName: adminName,
      price: finalPrice,
      history: [
        { status: OrderStatus.REQUESTED, timestamp: Date.now() },
        { status: OrderStatus.ASSIGNED, timestamp: Date.now(), note: 'Chamada direta para Admin' }
      ],
      chatMessages: [],
      ...orderData
    } as Order;
    orders.unshift(newOrder);
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    socketService.emit(SocketEvent.ORDER_CREATED, newOrder);
    return newOrder;
  }

  async updateOrder(orderId: string, updates: Partial<Order>): Promise<Order> {
    const orders = await this.getOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx > -1) {
      const oldStatus = orders[idx].status;
      orders[idx] = { ...orders[idx], ...updates };
      if (updates.status && updates.status !== oldStatus) {
        orders[idx].history.push({ status: updates.status, timestamp: Date.now() });
      }
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
      socketService.emit(SocketEvent.ORDER_UPDATED, orders[idx]);
      return orders[idx];
    }
    throw new Error('Pedido não encontrado');
  }

  async addMessageToOrder(orderId: string, sender: User, content: string): Promise<ChatMessage> {
    const orders = await this.getOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx > -1) {
      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        senderId: sender.id,
        senderName: sender.name,
        senderRole: sender.role,
        content,
        timestamp: Date.now(),
        readBy: [sender.id]
      };
      orders[idx].chatMessages.push(newMessage);
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
      socketService.emit(SocketEvent.CHAT_MESSAGE, { orderId, message: newMessage });
      return newMessage;
    }
    throw new Error('Pedido não encontrado');
  }

  async rateOrder(orderId: string, rating: number, feedback: string): Promise<Order> {
    return this.updateOrder(orderId, { rating, feedback });
  }

  async deleteOrder(orderId: string): Promise<void> {
    const orders = await this.getOrders();
    const filtered = orders.filter(o => o.id !== orderId);
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(filtered));
  }

  async toggleDriverStatus(driverId: string, isOnline: boolean): Promise<void> {
    await this.updateUser(driverId, { isOnline });
  }

  async getRegions(): Promise<DeliveryRegion[]> {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.REGIONS) || '[]');
  }

  async settleOrders(orderIds: string[]): Promise<void> {
    const orders = await this.getOrders();
    orderIds.forEach(id => {
      const idx = orders.findIndex(o => o.id === id);
      if (idx > -1) {
        orders[idx].paymentStatus = PaymentStatus.PAID;
        socketService.emit(SocketEvent.ORDER_UPDATED, orders[idx]);
      }
    });
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }

  async settleDriverOrders(orderIds: string[]): Promise<void> {
    const orders = await this.getOrders();
    orderIds.forEach(id => {
      const idx = orders.findIndex(o => o.id === id);
      if (idx > -1) {
        orders[idx].driverPaymentStatus = PaymentStatus.PAID;
        socketService.emit(SocketEvent.ORDER_UPDATED, orders[idx]);
      }
    });
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }
}

let databaseInstance: any;
try {
    if (USE_REAL_DB) {
        databaseInstance = new RealDB();
    } else {
        databaseInstance = new MockDB();
    }
} catch (e) {
    databaseInstance = new MockDB();
}
export const db = databaseInstance;
