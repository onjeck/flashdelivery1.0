
import { Order, OrderStatus, User, UserRole, ChatMessage, DeliveryRegion, DriverStats, PaymentStatus } from '../types';
import { socketService, SocketEvent } from './socketService';
import { GeoService } from './geoService';
import { db as fdb, auth, firebaseConfig, functions } from './firebaseConfig';
import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, 
  onSnapshot, query, where, orderBy, addDoc, deleteDoc, increment, writeBatch
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, getAuth, onAuthStateChanged 
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { initializeApp, deleteApp } from 'firebase/app';

const convertDoc = <T>(doc: any): T => ({ id: doc.id, ...doc.data() } as T);

export class RealDB {
  private currentUser: User | null = null;
  private unsubOrders: (() => void) | null = null;

  constructor() {
    this.initRealtimeListeners();
    const saved = localStorage.getItem('flash_current_user');
    if (saved) this.currentUser = JSON.parse(saved);
    
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(fdb, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = convertDoc<User>(userDoc);
          this.currentUser = userData;
          localStorage.setItem('flash_current_user', JSON.stringify(userData));
        }
      } else {
        this.currentUser = null;
        localStorage.removeItem('flash_current_user');
      }
    });
  }

  private formatEmail(username: string): string {
    const clean = username.trim().toLowerCase();
    if (clean.includes('@')) return clean;
    return `${clean}@flashdelivery.app`;
  }

  private initRealtimeListeners() {
    const qOrders = query(collection(fdb, 'orders'), orderBy('createdAt', 'desc'));
    this.unsubOrders = onSnapshot(qOrders, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const order = convertDoc<Order>(change.doc);
        if (change.type === 'added' && (Date.now() - order.createdAt < 30000)) {
            socketService.emit(SocketEvent.ORDER_CREATED, order);
        }
        if (change.type === 'modified') {
            socketService.emit(SocketEvent.ORDER_UPDATED, order);
        }
      });
    });

    const qDrivers = query(collection(fdb, 'users'), where('role', 'in', [UserRole.DRIVER, UserRole.ADMIN]));
    onSnapshot(qDrivers, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          socketService.emit(SocketEvent.DRIVER_UPDATED, convertDoc<User>(change.doc));
        }
      });
    });
  }

  async login(username: string, password: string): Promise<User> {
    const email = this.formatEmail(username);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(fdb, 'users', userCredential.user.uid));
      if (!userDoc.exists()) throw new Error('Perfil não encontrado.');
      const userData = convertDoc<User>(userDoc);
      this.currentUser = userData;
      localStorage.setItem('flash_current_user', JSON.stringify(userData));
      return userData;
    } catch (error: any) {
      throw new Error('Login ou senha incorretos.');
    }
  }

  logout() {
    signOut(auth);
    this.currentUser = null;
    localStorage.removeItem('flash_current_user');
  }

  getUser(): User | null { return this.currentUser; }

  async createUser(userData: Partial<User>): Promise<User> {
    const email = this.formatEmail(userData.username!);
    const password = userData.password || '123456'; 
    const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp-" + Date.now());
    const secondaryAuth = getAuth(secondaryApp);
    let uid = '';
    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      uid = userCredential.user.uid;
      await signOut(secondaryAuth);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') throw new Error('Login já em uso.');
      throw error;
    } finally {
      await deleteApp(secondaryApp);
    }
    const rawUser: any = {
      id: uid,
      name: userData.name || userData.username,
      role: userData.role,
      username: userData.username!.toLowerCase(),
      phone: userData.phone || '',
      preferences: { criticalAlerts: true, newOrders: true, statusUpdates: true, marketing: false },
      stats: userData.role === UserRole.DRIVER ? { totalDeliveries: 0, averageRating: 5.0, punctualityScore: 100, level: 'BRONZE', points: 0, badges: [] } : null,
      ...userData
    };
    Object.keys(rawUser).forEach(key => rawUser[key] === undefined && delete rawUser[key]);
    await setDoc(doc(fdb, 'users', uid), rawUser);
    return rawUser as User;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const userRef = doc(fdb, 'users', userId);
    const cleanUpdates: any = { ...updates };
    Object.keys(cleanUpdates).forEach(key => cleanUpdates[key] === undefined && delete cleanUpdates[key]);
    await updateDoc(userRef, cleanUpdates);
    if (this.currentUser && this.currentUser.id === userId) {
      this.currentUser = { ...this.currentUser, ...cleanUpdates };
      localStorage.setItem('flash_current_user', JSON.stringify(this.currentUser));
    }
    return this.currentUser as User;
  }

  async deleteUser(userId: string): Promise<void> {
    // Prefer calling a server-side callable function that will remove the Auth user and Firestore doc.
    // If that function is not deployed or fails, fall back to deleting the Firestore document only.
    try {
      const del = httpsCallable(functions as any, 'deleteUser');
      await del({ uid: userId });
      return;
    } catch (err) {
      console.warn('Callable deleteUser failed or not deployed, removing Firestore doc only.', err);
      await deleteDoc(doc(fdb, 'users', userId));
    }
  }

  async getOrders(): Promise<Order[]> {
    const snapshot = await getDocs(query(collection(fdb, 'orders'), orderBy('createdAt', 'desc')));
    return snapshot.docs.map(d => convertDoc<Order>(d));
  }

  async getDrivers(): Promise<User[]> {
    const snapshot = await getDocs(query(collection(fdb, 'users'), where('role', '==', UserRole.DRIVER)));
    return snapshot.docs.map(d => convertDoc<User>(d));
  }

  async getAdmins(): Promise<User[]> {
    const snapshot = await getDocs(query(collection(fdb, 'users'), where('role', '==', UserRole.ADMIN)));
    return snapshot.docs.map(d => convertDoc<User>(d));
  }

  async getClients(): Promise<User[]> {
    const snapshot = await getDocs(query(collection(fdb, 'users'), where('role', '==', UserRole.CLIENT)));
    return snapshot.docs.map(d => convertDoc<User>(d));
  }

  async createOrder(orderData: Partial<Order>): Promise<Order> {
    // Busca informações do cliente para checar preço fixo
    let finalStatus = OrderStatus.REQUESTED;
    let finalPrice = orderData.price;

    if (orderData.clientId) {
      const clientDoc = await getDoc(doc(fdb, 'users', orderData.clientId));
      if (clientDoc.exists()) {
        const client = clientDoc.data() as User;
        if (client.fixedDeliveryPrice) {
          finalPrice = client.fixedDeliveryPrice;
          finalStatus = OrderStatus.PRICED; // Se tem preço fixo, já nasce precificado
        }
      }
    }

    const newOrder: any = {
      ...orderData,
      status: finalStatus,
      price: finalPrice,
      paymentStatus: PaymentStatus.PENDING,
      driverPaymentStatus: PaymentStatus.PENDING,
      createdAt: Date.now(),
      history: [{ status: finalStatus, timestamp: Date.now() }],
      chatMessages: [],
      notifications: []
    };
    const docRef = await addDoc(collection(fdb, 'orders'), newOrder);
    return { id: docRef.id, ...newOrder };
  }

  async createDirectOrder(orderData: Partial<Order>, adminId: string, adminName: string): Promise<Order> {
    // Checa preço fixo mesmo em chamada direta
    let finalPrice = 10.0;
    if (orderData.clientId) {
      const clientDoc = await getDoc(doc(fdb, 'users', orderData.clientId));
      if (clientDoc.exists()) {
        const client = clientDoc.data() as User;
        if (client.fixedDeliveryPrice) finalPrice = client.fixedDeliveryPrice;
      }
    }

    const newOrder: any = {
      ...orderData,
      status: OrderStatus.ASSIGNED,
      paymentStatus: PaymentStatus.PENDING,
      driverPaymentStatus: PaymentStatus.PENDING,
      createdAt: Date.now(),
      driverId: adminId,
      driverName: adminName,
      price: finalPrice,
      history: [
        { status: OrderStatus.REQUESTED, timestamp: Date.now() },
        { status: OrderStatus.ASSIGNED, timestamp: Date.now(), note: 'Direto para João Vitor' }
      ],
      chatMessages: [],
      notifications: []
    };
    const docRef = await addDoc(collection(fdb, 'orders'), newOrder);
    return { id: docRef.id, ...newOrder };
  }

  async updateOrder(orderId: string, updates: Partial<Order>): Promise<Order> {
    const orderRef = doc(fdb, 'orders', orderId);
    const snap = await getDoc(orderRef);
    if (!snap.exists()) throw new Error('Pedido não encontrado');
    const current = snap.data() as Order;
    if (updates.status && updates.status !== current.status) {
       const history = current.history || [];
       history.push({ status: updates.status, timestamp: Date.now() });
       updates.history = history;
    }
    const cleanUpdates: any = { ...updates };
    Object.keys(cleanUpdates).forEach(key => cleanUpdates[key] === undefined && delete cleanUpdates[key]);
    await updateDoc(orderRef, cleanUpdates);
    return { ...current, ...cleanUpdates, id: orderId };
  }

  async addMessageToOrder(orderId: string, sender: User, content: string): Promise<ChatMessage> {
    const orderRef = doc(fdb, 'orders', orderId);
    const newMessage: ChatMessage = { id: `msg-${Date.now()}`, senderId: sender.id, senderName: sender.name, senderRole: sender.role, content, timestamp: Date.now(), readBy: [sender.id] };
    const snap = await getDoc(orderRef);
    const messages = (snap.data() as Order).chatMessages || [];
    messages.push(newMessage);
    await updateDoc(orderRef, { chatMessages: messages });
    socketService.emit(SocketEvent.CHAT_MESSAGE, { orderId, message: newMessage });
    return newMessage;
  }

  async rateOrder(orderId: string, rating: number, feedback: string): Promise<Order> {
     return this.updateOrder(orderId, { rating, feedback });
  }

  async deleteOrder(orderId: string): Promise<void> {
    await deleteDoc(doc(fdb, 'orders', orderId));
  }

  async toggleDriverStatus(driverId: string, isOnline: boolean): Promise<void> {
    await this.updateUser(driverId, { isOnline });
  }

  async settleOrders(orderIds: string[]): Promise<void> {
    const batch = writeBatch(fdb);
    orderIds.forEach(id => {
      const ref = doc(fdb, 'orders', id);
      batch.update(ref, { paymentStatus: PaymentStatus.PAID });
    });
    await batch.commit();
  }

  async settleDriverOrders(orderIds: string[]): Promise<void> {
    const batch = writeBatch(fdb);
    orderIds.forEach(id => {
      const ref = doc(fdb, 'orders', id);
      batch.update(ref, { driverPaymentStatus: PaymentStatus.PAID });
    });
    await batch.commit();
  }
}
