# Security Implementation Guide

## 🔒 Implementações Realizadas

### 1. **Security Utilities (securityUtils.ts)**

#### Validações

```typescript
import { 
  isValidEmail, 
  isValidCPF,
  isValidPhoneNumber,
  isStrongPassword,
  isValidURL,
  isValidCoordinate
} from '@/utils/securityUtils';

// Email
isValidEmail('user@example.com');  // true

// CPF
isValidCPF('123.456.789-09');     // valida com Luhn algorithm

// Telefone brasileiro
isValidPhoneNumber('(11) 98765-4321');  // true

// Senha forte
isStrongPassword('Senha@123');    // true (8+ chars, upper, lower, number, special)

// URL
isValidURL('https://example.com'); // true

// Coordenadas GPS
isValidCoordinate(-23.5505, -46.6333); // true (São Paulo)
```

#### Criptografia & Tokens

```typescript
// Hash SHA-256
const hash = await createHash('usuario@email.com');

// Token seguro aleatório
const token = generateSecureToken(32);
```

#### Rate Limiting

```typescript
const limiter = createRateLimiter(5, 60000); // 5 tentativas por minuto

// Verificar limite
if (limiter.checkLimit('user-email')) {
  // Processara
} else {
  // Bloqueado
  const remaining = limiter.getRemainingTime('user-email');
  console.log(`Tente novamente em ${remaining}ms`);
}
```

#### Validação de Formulário

```typescript
import { validateForm } from '@/utils/securityUtils';

const rules = [
  { field: 'email', required: true, pattern: /@/, message: 'Email inválido' },
  { field: 'password', required: true, minLength: 8 },
  { field: 'cpf', required: true, custom: (v) => isValidCPF(v) }
];

const { valid, errors } = validateForm(formData, rules);

if (!valid) {
  console.error('Erros:', errors);
}
```

#### Sanitização HTML

```typescript
import { sanitizeHTML } from '@/utils/securityUtils';

// Previne XSS
const safeHTML = sanitizeHTML('<script>alert("xss")</script>');
// Resultado: &lt;script&gt;alert("xss")&lt;/script&gt;
```

### 2. **Firestore Security Rules (firebaseRules.ts)**

**Cole no Firebase Console:**

1. Abra [Firebase Console](https://console.firebase.google.com)
2. Firestore Database → Rules
3. Selecione tudo e delete
4. Cole o conteúdo de `firebaseRules.ts`

**Regras implementadas:**

| Collection | Read | Create | Update | Delete |
|------------|------|--------|--------|--------|
| users | Próprio ou Admin | Autenticado | Próprio ou Admin | Admin |
| orders | Criador, Driver ou Admin | Cliente auth | Participantes ou Admin | Admin |
| messages | Participantes | Autenticado | Criador | Criador |
| notifications | Destinatário | Admin | - | Destinatário |
| ratings | Público | Cliente após entrega | - | Admin |

### 3. **Security Headers (securityHeaders.ts)**

#### Headers Implementados

| Header | Função |
|--------|---------|
| `X-Frame-Options` | Previne clickjacking |
| `X-Content-Type-Options` | Previne MIME sniffing |
| `X-XSS-Protection` | Ativa proteção XSS |
| `Content-Security-Policy` | Whitelist de scripts/styles |
| `Referrer-Policy` | Controla informações de origem |
| `Permissions-Policy` | Desabilita APIs sensíveis |
| `Strict-Transport-Security` | Força HTTPS |

#### Implementar Headers

**Opção 1: Vite Middleware**
```typescript
// vite.config.ts
import { viteCorsPlugin } from '@/utils/securityHeaders';

plugins: [react(), viteCorsPlugin()]
```

**Opção 2: Express Backend**
```typescript
// server.ts
import { expressSecurityMiddleware } from '@/utils/securityHeaders';

app.use(expressSecurityMiddleware());
```

### 4. **CORS Configuration**

```typescript
import { allowedOrigins, isOriginAllowed } from '@/utils/securityHeaders';

// Whitelist de origens
const allowed = ['http://localhost:3000', 'https://flashdelivery.app'];

// Verificar origem
if (isOriginAllowed(request.headers.origin)) {
  // Permitir requisição
}
```

## 🎯 Checklist de Segurança

### Autenticação
- [ ] Usar Firebase Auth com email/senha ou OAuth
- [ ] Implementar 2FA (Two-Factor Authentication)
- [ ] Hash de senhas (Firebase faz automaticamente)
- [ ] Sessão com timeout
- [ ] Logout em múltiplos dispositivos

### Validação
- [ ] Validar input no client e backend
- [ ] Usar regex para formato de dados
- [ ] Sanitizar HTML/JavaScript
- [ ] Validar CPF/CNPJ
- [ ] Rate limiting em login/signup

### Armazenamento
- [ ] Não armazenar senhas em localStorage
- [ ] Usar sessionStorage para tokens temporários
- [ ] Criptografar dados sensíveis
- [ ] Limpar dados ao logout

### Comunicação
- [ ] Usar HTTPS em produção
- [ ] Validar certificados SSL/TLS
- [ ] Implementar CORS correto
- [ ] Não expor APIs em GET
- [ ] Versionar APIs

### Banco de Dados
- [ ] Implementar Firestore Rules
- [ ] Validar autenticação em operações
- [ ] Usar índices para queries complexas
- [ ] Auditar acessos (Firebase Audit Logs)

### Código
- [ ] Usar HTTPS e CSP
- [ ] Validar libs/dependências
- [ ] Code review regular
- [ ] Testes de segurança
- [ ] Logging de eventos suspeitos

## 📊 Exemplo de Implementação Completa

```typescript
// pages/Login.tsx
import { useState } from 'react';
import { 
  isValidEmail, 
  isStrongPassword,
  validateForm 
} from '@/utils/securityUtils';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar cliente
    const { valid, errors: validationErrors } = validateForm(
      { email, password },
      [
        { 
          field: 'email', 
          required: true, 
          custom: (v) => isValidEmail(v) 
        },
        { 
          field: 'password', 
          required: true, 
          custom: (v) => isStrongPassword(v) 
        }
      ]
    );

    if (!valid) {
      setErrors(validationErrors);
      return;
    }

    // Enviar para Firebase (HTTPS)
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      // Sucesso
    } catch (error) {
      setErrors({ submit: 'Credenciais inválidas' });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {errors.email && <span>{errors.email}</span>}

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {errors.password && <span>{errors.password}</span>}

      <button type="submit">Login</button>
    </form>
  );
}
```

## 🔗 Recursos

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Firebase Security](https://firebase.google.com/docs/firestore/security)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [CSP Documentation](https://content-security-policy.com/)

## ⚠️ Próximos Passos

1. [ ] Implementar 2FA
2. [ ] Adicionar rate limiting no backend
3. [ ] Configurar WAF (Web Application Firewall)
4. [ ] Implementar CAPTCHA
5. [ ] Setup de alertas de segurança
6. [ ] Audit log completo
7. [ ] Teste de penetração
8. [ ] Certificado SSL/TLS (Let's Encrypt)
