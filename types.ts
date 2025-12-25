
export enum UserRole {
  CLIENT = 'CLIENT',
  ADMIN = 'ADMIN',
  DRIVER = 'DRIVER'
}

export enum OrderStatus {
  REQUESTED = 'REQUESTED',   // Client created
  PRICED = 'PRICED',         // Central added price
  ASSIGNED = 'ASSIGNED',     // Central assigned driver
  ACCEPTED = 'ACCEPTED',     // Driver accepted
  ON_WAY = 'ON_WAY',         // Driver going to pickup
  COLLECTED = 'COLLECTED',   // Driver has item
  DELIVERED = 'DELIVERED',   // Done
  CANCELED = 'CANCELED'      // Canceled
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID'
}

export enum TrafficLevel {
  LOW = 'LOW',       // x1.0 time
  MODERATE = 'MODERATE', // x1.3 time
  HEAVY = 'HEAVY'    // x1.8 time
}

export type DriverLevel = 'BRONZE' | 'PRATA' | 'OURO' | 'DIAMANTE';

export interface DriverStats {
  totalDeliveries: number;
  averageRating: number; // 0.0 to 5.0
  punctualityScore: number; // 0 to 100%
  level: DriverLevel;
  points: number; // For rewards
  badges: string[]; // e.g., 'FAST_DELIVERY', 'TOP_RATED'
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RouteStop {
  id: string;
  type: 'PICKUP' | 'DROPOFF';
  orderId: string;
  address: string;
  coordinates: Coordinates;
  completed: boolean;
  distanceToNext?: number; // km
  timeToNext?: number; // minutes
}

export interface NotificationPreferences {
  criticalAlerts: boolean; // For admins (delays) or drivers (urgent updates)
  newOrders: boolean;      // For drivers
  statusUpdates: boolean;  // For clients
  marketing: boolean;
}

export interface DeliveryRegion {
  id: string;
  name: string;
  price: number;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  username: string; // Login access
  password?: string; // Login access (mock purposes)
  phone?: string;
  preferences?: NotificationPreferences;
  
  // Client specifics
  address?: string;
  document?: string; // CPF or CNPJ
  fixedDeliveryPrice?: number; // Pre-defined price for this client

  // Driver specifics
  isOnline?: boolean;
  location?: Coordinates;
  vehicle?: {
    plate: string;
    model: string;
    color?: string;
  };
  stats?: DriverStats; // New Performance Data
  
  // Payment Details
  paymentMethod?: 'pix' | 'debito';
  pixKey?: string;
  bankAccount?: string;
}

export interface NotificationLog {
  id: string;
  type: 'WHATSAPP';
  recipient: string;
  message: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  content: string;
  timestamp: number;
  readBy: string[]; // List of user IDs who read it
}

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  pickupAddress: string;
  pickupCoordinates?: Coordinates; // For routing
  dropoffAddress: string;
  dropoffCoordinates?: Coordinates; // For routing
  description: string;
  notes?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus; // Track if Shop paid Central
  driverPaymentStatus?: PaymentStatus; // NEW: Track if Central paid Driver
  createdAt: number;
  price?: number;
  driverId?: string;
  driverName?: string;
  history: OrderHistoryLog[];
  notifications?: NotificationLog[];
  chatMessages: ChatMessage[]; // New Chat System
  
  // Review fields
  rating?: number; // 1-5
  feedback?: string;
}

export interface OrderHistoryLog {
  status: OrderStatus;
  timestamp: number;
  note?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
