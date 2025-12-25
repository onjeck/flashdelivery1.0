/**
 * Service Worker Registration & PWA Utilities
 * Gerencia o registro do service worker e funcionalidades PWA
 */

/**
 * Registra o Service Worker
 * Deve ser chamado no index.tsx ou App.tsx
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service Workers não são suportados neste navegador');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none'
    });
    console.log('[PWA] Service Worker registrado com sucesso:', registration);

    // Verificar atualizações a cada hora
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);

    return registration;
  } catch (error) {
    console.error('[PWA] Falha ao registrar Service Worker:', error);
    return null;
  }
}

/**
 * Detecta se o app foi instalado como PWA
 */
export function isPWAInstalled(): boolean {
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  if ((navigator as any).standalone === true) {
    return true;
  }
  return false;
}

/**
 * Solicita ao usuário para instalar o PWA (Chrome/Edge)
 */
let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    console.log('[PWA] Instalação disponível');
  });
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    console.warn('[PWA] Instalação não está disponível');
    return false;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome === 'accepted';
}

/**
 * Detecta quando o app foi instalado
 */
export function onAppInstalled(callback: () => void) {
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App instalado com sucesso');
    callback();
  });
}

/**
 * Solicita notificações push
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[PWA] Notificações não são suportadas');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

/**
 * Mostra uma notificação local (mesmo com app em background)
 */
export async function showNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, options);
}

/**
 * Requisita Background Sync para sincronizar dados quando voltar online
 */
export async function requestBackgroundSync(tag: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    console.warn('[PWA] Background Sync não suportado');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register(tag);
    console.log('[PWA] Background Sync registrado:', tag);
  } catch (error) {
    console.error('[PWA] Falha ao registrar Background Sync:', error);
  }
}

/**
 * Detecta conectividade online/offline
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

export function onOnlineStatusChange(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  const handleOnline = () => onOnline();
  const handleOffline = () => onOffline();

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Força update do Service Worker
 */
export async function forceUpdateServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    console.log('[PWA] Service Worker atualizado');
  } catch (error) {
    console.error('[PWA] Falha ao atualizar Service Worker:', error);
  }
}

/**
 * Compartilha dados via Web Share API
 */
export async function shareData(shareData: ShareData): Promise<void> {
  if (!('share' in navigator)) {
    console.warn('[PWA] Web Share API não suportada');
    // Fallback: copiar para clipboard ou abrir dialog de compartilhamento
    return;
  }

  try {
    await navigator.share(shareData);
    console.log('[PWA] Compartilhamento bem-sucedido');
  } catch (error) {
    console.error('[PWA] Falha ao compartilhar:', error);
  }
}

/**
 * Acesso à câmera/galeria (Web Camera/File APIs)
 */
export async function captureMedia(
  type: 'camera' | 'gallery'
): Promise<Blob | null> {
  if (type === 'camera') {
    if (!('mediaDevices' in navigator)) {
      console.warn('[PWA] Camera não disponível');
      return null;
    }
    // Implementar acesso à câmera
    return null;
  }

  if (type === 'gallery') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        resolve(file || null);
      };
      input.click();
    });
  }

  return null;
}

/**
 * Armazena dados localmente (IndexedDB wrapper)
 */
export async function setLocalData(key: string, data: any): Promise<void> {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('[PWA] Falha ao armazenar dados:', error);
  }
}

export function getLocalData(key: string): any | null {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[PWA] Falha ao recuperar dados:', error);
    return null;
  }
}

// Type definitions
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}
