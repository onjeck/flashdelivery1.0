/**
 * Security Utilities
 * Input validation, sanitization, and security helpers
 */

/**
 * Valida email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Valida CPF/CNPJ
 */
export function isValidCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;

  return true;
}

/**
 * Valida telefone brasileiro
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length === 11 && /^[1-9]\d{10}$/.test(cleanPhone);
}

/**
 * Valida senha
 * Requisitos:
 * - Mínimo 8 caracteres
 * - Pelo menos uma letra maiúscula
 * - Pelo menos uma letra minúscula
 * - Pelo menos um número
 * - Pelo menos um caractere especial
 */
export function isStrongPassword(password: string): boolean {
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return strongRegex.test(password);
}

/**
 * Sanitiza input HTML para prevenir XSS
 */
export function sanitizeHTML(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Valida URL
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Valida latitude/longitude
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Valida dados de cartão de crédito (Luhn Algorithm)
 */
export function isValidCreditCard(cardNumber: string): boolean {
  const cleanNumber = cardNumber.replace(/\s/g, '');
  if (!/^\d{13,19}$/.test(cleanNumber)) return false;

  let sum = 0;
  let isEven = false;

  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Cria hash SHA-256 (para fingerprinting)
 */
export async function createHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Gera um token seguro aleatório
 */
export function generateSecureToken(length: number = 32): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(byte => characters[byte % characters.length])
    .join('');
}

/**
 * Rate limiting simple (client-side)
 */
export function createRateLimiter(maxAttempts: number, windowMs: number) {
  const attempts = new Map<string, { count: number; resetTime: number }>();

  return {
    checkLimit(key: string): boolean {
      const now = Date.now();
      const record = attempts.get(key);

      if (!record || now > record.resetTime) {
        attempts.set(key, { count: 1, resetTime: now + windowMs });
        return true;
      }

      if (record.count < maxAttempts) {
        record.count++;
        return true;
      }

      return false;
    },
    getRemainingTime(key: string): number {
      const record = attempts.get(key);
      if (!record) return 0;
      return Math.max(0, record.resetTime - Date.now());
    }
  };
}

/**
 * Valida dados de formulário
 */
export interface ValidationRule {
  field: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
  message?: string;
}

export function validateForm(data: Record<string, any>, rules: ValidationRule[]): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const rule of rules) {
    const value = data[rule.field];

    // Required check
    if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      errors[rule.field] = rule.message || `${rule.field} é obrigatório`;
      continue;
    }

    if (!value) continue;

    // Length checks
    if (rule.minLength && value.length < rule.minLength) {
      errors[rule.field] = rule.message || `${rule.field} deve ter no mínimo ${rule.minLength} caracteres`;
      continue;
    }

    if (rule.maxLength && value.length > rule.maxLength) {
      errors[rule.field] = rule.message || `${rule.field} deve ter no máximo ${rule.maxLength} caracteres`;
      continue;
    }

    // Pattern check
    if (rule.pattern && !rule.pattern.test(value)) {
      errors[rule.field] = rule.message || `${rule.field} tem formato inválido`;
      continue;
    }

    // Custom validation
    if (rule.custom) {
      const result = rule.custom(value);
      if (result !== true) {
        errors[rule.field] = typeof result === 'string' ? result : rule.message || `${rule.field} é inválido`;
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * CORS validator (client-side)
 */
export function isCORSAllowed(targetOrigin: string, allowedOrigins: string[]): boolean {
  try {
    const url = new URL(targetOrigin);
    return allowedOrigins.includes(url.origin);
  } catch {
    return false;
  }
}

/**
 * Content Security Policy checker
 */
export function getCSPHeaders(): Record<string, string> {
  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' https://cdn.tailwindcss.com https://fonts.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
      "img-src 'self' data: https: blob:",
      "font-src 'self' https://fonts.gstatic.com data:",
      "connect-src 'self' https://*.firebaseio.com https://*.firebaseapp.com https://*.googleapis.com https://api.github.com",
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ].join('; ')
  };
}

/**
 * Security headers
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(self), microphone=(), camera=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  };
}

/**
 * Detecta se a conexão é segura (HTTPS)
 */
export function isSecureConnection(): boolean {
  return window.location.protocol === 'https:' || window.location.hostname === 'localhost';
}

/**
 * Log seguro de erros (não expor informações sensíveis)
 */
export function safeLog(error: Error | unknown, context?: string) {
  if (process.env.NODE_ENV === 'development') {
    console.error('[ERROR]', context || '', error);
  } else {
    // Em produção, enviar para serviço de logging seguro
    console.error('[ERROR] An error occurred', { context });
    // Aqui você poderia enviar para Sentry, LogRocket, etc.
  }
}
