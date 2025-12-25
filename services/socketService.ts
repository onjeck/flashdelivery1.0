
import { Order, User, ChatMessage } from '../types';

type EventCallback<T = any> = (data: T) => void;

export enum SocketEvent {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  DRIVER_UPDATED = 'DRIVER_UPDATED',
  REGION_UPDATED = 'REGION_UPDATED'
}

// New events for settlement flow
export enum SettlementSocketEvent {
  SETTLEMENT_REQUEST_CREATED = 'SETTLEMENT_REQUEST_CREATED',
  SETTLEMENT_REQUEST_UPDATED = 'SETTLEMENT_REQUEST_UPDATED'
}

class SocketServiceMock {
  private listeners: Record<string, EventCallback[]> = {};

  constructor() {
    console.log('[SocketService] Initialized (Simulation Mode)');
  }

  // Subscribe to an event
  on<T>(event: SocketEvent, callback: EventCallback<T>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);

    // Return unsubscribe function
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  // Emit an event (called by MockDB to simulate Server Push)
  emit<T>(event: SocketEvent, data: T) {
    // Simulate network latency slightly for realism
    setTimeout(() => {
      if (this.listeners[event]) {
        this.listeners[event].forEach(callback => callback(data));
      }
    }, 50);
  }
}

export const socketService = new SocketServiceMock();
