# PWA (Progressive Web App) Optimization Guide

## 🚀 Implementações Realizadas

### 1. **Manifest.json Melhorado**

**Novas funcionalidades:**

#### Screenshots
Telas para exibir na Google Play ou ao instalar:
```json
"screenshots": [
  {
    "src": "path/to/screenshot.png",
    "sizes": "540x720",
    "type": "image/png",
    "form_factor": "narrow"
  }
]
```

#### Shortcuts
Atalhos rápidos no menu de contexto:
- "Novo Pedido"
- "Meus Pedidos"
- "Rastreamento"

#### Share Target
Permite compartilhar arquivos diretamente com o app:
```json
"share_target": {
  "action": "/share",
  "method": "POST",
  "enctype": "multipart/form-data"
}
```

#### File Handlers
Abre arquivos CSV diretamente no app

#### Categories
Classificação: `productivity`, `business`

### 2. **Ícones Multi-formato**

| Tamanho | Uso | Purpose |
|---------|-----|---------|
| 96x96 | Mobile taskbar | any |
| 192x192 | Instalação | any |
| 384x384 | Splash screen | any |
| 512x512 | Play Store | any |
| 192x192 Maskable | Adaptive icons | maskable |
| 512x512 Maskable | Adaptive icons | maskable |

**O que fazer:**
Substitua os placeholders `via.placeholder.com` por URLs reais:
- Use o design da marca FlashDelivery
- Maskable: deixar espaço seguro no centro (80% da imagem)

### 3. **Meta Tags Aprimoradas no index.html**

```html
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="apple-touch-icon" href="..." />
```

**Benefícios:**
- ✔️ Home screen no iOS
- ✔️ Status bar customizado
- ✔️ Fullscreen no Android

### 4. **Service Worker Otimizado**

**Estratégias de cache:**

#### Network First (HTML)
- Tenta buscar do servidor primeiro
- Fallback para cache
- Melhor para conteúdo dinâmico

#### Cache First (Assets)
- Usa cache primeiro
- Fallback para rede
- Rápido e offline-friendly

#### Runtime Cache
- Cache dinâmico para API responses
- TTl de 24 horas
- Limpeza automática

**Novos Recursos:**
- ✔️ Background Sync para sincronizar offlinne
- ✔️ Logs detalhados [SW]
- ✔️ Suporte a múltiplos caches
- ✔️ Tratamento de erros robusto

### 5. **PWA Utilities (pwaUtils.ts)**

```typescript
// Registrar Service Worker
import { registerServiceWorker } from '@/utils/pwaUtils';
registerServiceWorker();

// Instalar app
import { promptInstall, isPWAInstalled } from '@/utils/pwaUtils';
await promptInstall();

// Notificações
import { requestNotificationPermission, showNotification } from '@/utils/pwaUtils';
await requestNotificationPermission();
await showNotification('Novo Pedido', { body: 'Você tem um novo pedido' });

// Status online/offline
import { onOnlineStatusChange } from '@/utils/pwaUtils';
onOnlineStatusChange(
  () => console.log('Online!'),
  () => console.log('Offline!')
);

// Background Sync
import { requestBackgroundSync } from '@/utils/pwaUtils';
await requestBackgroundSync('sync-orders');

// Compartilhar
import { shareData } from '@/utils/pwaUtils';
await shareData({
  title: 'FlashDelivery',
  text: 'Rastreie sua entrega',
  url: 'https://flashdelivery.app'
});
```

## 📱 Setup no App.tsx

Adicionar no useEffect:

```typescript
import { registerServiceWorker, setupInstallPrompt, onAppInstalled } from '@/utils/pwaUtils';

useEffect(() => {
  // Register service worker
  registerServiceWorker();
  
  // Setup install prompt
  setupInstallPrompt();
  
  // Listen to app installed event
  onAppInstalled(() => {
    console.log('App foi instalado!');
  });
}, []);
```

## 🎯 Checklist de Implementação

- [ ] Gerar ícones reais (substituir placeholders)
- [ ] Adicionar screenshots reais
- [ ] Testar em Chrome/Edge (Install button)
- [ ] Testar em iOS (Home screen)
- [ ] Testar modo offline
- [ ] Testar push notifications
- [ ] Adicionar implementação de sync
- [ ] Adicionar share target handler
- [ ] Testar shortcuts no Android
- [ ] Publicar na PWA Store

## 📊 Lighthouse PWA Score

**Alvo:** Score > 90

```bash
# Via Chrome DevTools (F12 → Lighthouse)
# Selecione: PWA
# Rodas: Desktop/Mobile
```

**Requisitos:**
- ✔️ manifest.json válido
- ✔️ Service Worker registrado
- ✔️ HTTPS (obrigatório)
- ✔️ Icons 192x192 e 512x512
- ✔️ Responsive design
- ✔️ Funciona offline

## 🔗 Recursos

- [Web.dev PWA Checklist](https://web.dev/pwa-checklist/)
- [MDN Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Google PWA](https://developers.google.com/codelabs/your-first-pwapp)
- [Manifest.json Spec](https://www.w3.org/TR/appmanifest/)

## 🚀 Próximos Passos

1. **Gerar Ícones Real:**
   ```bash
   # Use ferramentas como:
   # - https://icons.gstatic.com/
   # - https://www.favicon-generator.org/
   # - ImageMagick/Sharp
   ```

2. **Screenshots:**
   - Capturar telas da app
   - Otimizar para mobile (540x720) e desktop (1280x720)
   - Adicionar em `/public/screenshots/`

3. **Testar PWA:**
   ```bash
   npm run build
   npm run preview
   # Abrir em Chrome e testar install
   ```

4. **Deploy em HTTPS:**
   - Service Workers requerem HTTPS
   - Use Vercel, Netlify ou Firebase Hosting

5. **Submeter para lojas:**
   - Google Play (PWA)
   - Microsoft Store (PWA)
   - Apple App Store (Requer app nativo)
