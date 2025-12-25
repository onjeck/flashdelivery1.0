/**
 * HTTP Security Headers Configuration
 * Para Vite, implemente em um middleware/plugin
 * Ou use em um servidor backend
 */

export const securityHeaders = {
  // Previne ataques de clickjacking
  'X-Frame-Options': 'DENY',
  
  // Previne MIME sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Ativa proteção XSS do navegador
  'X-XSS-Protection': '1; mode=block',
  
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' https://cdn.tailwindcss.com https://fonts.googleapis.com https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
    "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com data:",
    "connect-src 'self' https://*.firebaseio.com https://*.firebaseapp.com https://*.googleapis.com https://api.github.com",
    "worker-src 'self'",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; '),
  
  // Política de referrer
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissões para APIs sensíveis
  'Permissions-Policy': 'geolocation=(self), microphone=(), camera=(), payment=()',
  
  // HSTS (força HTTPS)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Disable caching para conteúdo sensível
  'Cache-Control': 'public, max-age=3600',
  
  // Información de origem permitida
  'Access-Control-Allow-Origin': 'https://flashdelivery.app',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400'
};

/**
 * Para Vite: Adicione em vite.config.ts
 */
export function viteCorsPlugin() {
  return {
    name: 'cors-headers',
    configResolved(config: any) {
      config.server.middlewareMode = true;
    },
    configureServer(server: any) {
      return () => {
        server.middlewares.use((_req: any, res: any, next: any) => {
          // Adicione headers de segurança
          Object.entries(securityHeaders).forEach(([key, value]) => {
            res.setHeader(key, value);
          });
          next();
        });
      };
    }
  };
}

/**
 * Para Express.js backend (se aplicável)
 */
export function expressSecurityMiddleware() {
  return (req: any, res: any, next: any) => {
    Object.entries(securityHeaders).forEach(([key, value]) => {
      res.setHeader(key, value as string);
    });
    next();
  };
}

/**
 * Whitelist de URLs permitidas (CORS)
 */
export const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://flashdelivery.app',
  'https://www.flashdelivery.app'
];

/**
 * Verifica se origem é permitida
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  return origin ? allowedOrigins.includes(origin) : false;
}
