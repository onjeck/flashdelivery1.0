# 🧪 GUIA PRÁTICO DE TESTE - FlashDelivery v1.1

## ✅ Pré-Requisitos

Antes de começar, verifique:

```bash
# 1. Node.js instalado?
node --version          # Deve ser v18+

# 2. npm instalado?
npm --version           # Deve ser v9+

# 3. Você está na pasta certa?
pwd                     # Deve terminar em: flashdelivery1.1
```

---

## 🚀 TESTE 1: INSTALAÇÃO (5 minutos)

### Passo 1.1: Instalar Dependências
```bash
npm install
```

**O que esperar:**
- ✅ Múltiplas linhas de "added packages"
- ✅ Mensagem final: "up to date"
- ✅ Pasta `node_modules/` criada (pode levar 2-3 min)

**Se der erro:**
```bash
# Tente limpar cache
npm cache clean --force
rm -rf node_modules
npm install
```

### Passo 1.2: Verificar Setup
```bash
bash verify-setup.sh
```

**O que esperar:**
```
✓ node
✓ npm
✓ .eslintrc.json
✓ .prettierrc.json
✓ vitest.config.ts
✓ ... etc
```

---

## ⚙️ TESTE 2: CONFIGURAÇÃO (5 minutos)

### Passo 2.1: Copiar Arquivo de Ambiente
```bash
cp .env.example .env.local
```

**O que esperar:**
- ✅ Novo arquivo `.env.local` criado
- ✅ Conteúdo igual ao `.env.example`

### Passo 2.2: Editar Credenciais Firebase (OPCIONAL)

Se quiser testar com Firebase real:
```bash
# Abra o arquivo em seu editor
# Exemplo no VS Code:
code .env.local
```

**Preencha os campos:**
```
VITE_FIREBASE_API_KEY=sua_chave_aqui
VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu_projeto_id
# ... etc
```

**Nota:** Sem credenciais, app usará modo mock (teste local funciona).

---

## 💻 TESTE 3: SERVIDOR LOCAL (10 minutos)

### Passo 3.1: Iniciar Servidor
```bash
npm run dev
```

**O que esperar:**
```
  VITE v6.2.0  ready in 234 ms

  ➜  Local:   http://localhost:3000/
  ➜  press h + enter to show help
```

**NÃO feche este terminal!** Ele precisa continuar rodando.

### Passo 3.2: Abrir no Navegador
```
Abra: http://localhost:3000
ou
Ctrl+Click no link (alguns terminais permitem)
```

**O que esperar:**
- ✅ Página carrega em < 2 segundos
- ✅ Logo/interface visível
- ✅ Nenhuma mensagem de erro no console

### Passo 3.3: Verificar Console do Navegador
```bash
# Abra: Chrome/Firefox/Edge
# Pressione: F12 ou Ctrl+Shift+I
# Vá para: Console tab
```

**O que esperar:**
```
[PWA] Service Worker registrado com sucesso
[Application] Ready at http://localhost:3000
# Nenhum erro em vermelho
```

---

## 🔍 TESTE 4: LINTING & FORMATAÇÃO (5 minutos)

### Passo 4.1: Verificar ESLint
```bash
npm run lint
```

**O que esperar:**
```
0 errors
0 warnings
# ✅ Nenhum erro ESLint
```

**Se houver erros:**
```bash
# Corrigir automaticamente
npm run lint:fix
```

### Passo 4.2: Verificar Prettier
```bash
npm run format:check
```

**O que esperar:**
```
# ✅ Sem alterações necessárias
# ou lista de arquivos que será formatado
```

**Para formatar automaticamente:**
```bash
npm run format
```

### Passo 4.3: Verificar TypeScript
```bash
npm run type-check
```

**O que esperar:**
```
# ✅ Nenhum erro de tipo
# ou lista de erros de tipo para corrigir
```

---

## 🧪 TESTE 5: TESTES UNITÁRIOS (5 minutos)

### Passo 5.1: Executar Testes
```bash
npm run test
```

**O que esperar:**
```
✓ (lista de testes)
Test Files  1 passed (1)
Tests       1 passed (1)
```

### Passo 5.2: Ver Interface Visual
```bash
npm run test:ui
```

**O que esperar:**
- ✅ Navegador abre com interface visual
- ✅ Lista de testes
- ✅ Status de cada teste (✓ ou ✗)

---

## 📦 TESTE 6: BUILD PRODUÇÃO (15 minutos)

### Passo 6.1: Criar Build
```bash
npm run build
```

**O que esperar:**
```
✓ 150 modules transformed
dist/index.html           2.43 kB │ gzip:   0.73 kB
dist/assets/index-xxx.js   150 kB │ gzip:  45.23 kB
...

✓ built in 12.34s
```

### Passo 6.2: Analisar Bundle
```bash
# Após build, abra este arquivo no navegador
open dist/stats.html
# ou
start dist/stats.html
```

**O que esperar:**
- ✅ Visualização interativa do bundle
- ✅ Chunks separados: firebase, react, ui
- ✅ Tamanho total ~380KB

### Passo 6.3: Pré-visualizar Build
```bash
npm run preview
```

**O que esperar:**
```
  ➜  Local:   http://localhost:4173/
```

**Teste no navegador:** Deve funcionar igual ao `npm run dev`

---

## 🔐 TESTE 7: SEGURANÇA (10 minutos)

### Passo 7.1: Testar Validações

Abra o DevTools (F12) → Console e teste:

```javascript
// Email validation
import { isValidEmail } from './utils/securityUtils.ts'
isValidEmail('teste@email.com')  // true
isValidEmail('invalido')          // false

// CPF validation
import { isValidCPF } from './utils/securityUtils.ts'
isValidCPF('123.456.789-09')     // false (exemplo inválido)

// Password strength
import { isStrongPassword } from './utils/securityUtils.ts'
isStrongPassword('Fraco123')      // false
isStrongPassword('Forte@123')     // true
```

### Passo 7.2: Testar Rate Limiting

```javascript
import { createRateLimiter } from './utils/securityUtils.ts'
const limiter = createRateLimiter(3, 5000); // 3 tentativas por 5s

for(let i = 0; i < 5; i++) {
  console.log(limiter.checkLimit('user1')); // true, true, true, false, false
}
```

---

## 📱 TESTE 8: PWA (15 minutos)

### Passo 8.1: Service Worker Registration
Abra DevTools (F12) → Application → Service Workers

**O que esperar:**
```
flash-delivery-v3  Active and running
Scope: http://localhost:3000/
```

### Passo 8.2: Testar Offline Mode
```bash
# No DevTools → Application → Service Workers
# Marque: "Offline"
```

**O que esperar:**
- ✅ Página continua funcionando
- ✅ Assets carregam do cache
- ✅ Nenhuma mensagem de erro

### Passo 8.3: Instalar PWA (Chrome/Edge apenas)
```bash
# No Chrome/Edge, clique no ícone de "Install" na barra de endereço
# (Pode estar como: "Install FlashDelivery" ou ícone de download)
```

**O que esperar:**
- ✅ Popup para instalar PWA
- ✅ App instalável como aplicativo nativo
- ✅ Funciona offline

### Passo 8.4: Testar Notificações
Console do DevTools:

```javascript
import { requestNotificationPermission, showNotification } from '@/utils/pwaUtils'

// Solicitar permissão
await requestNotificationPermission()

// Mostrar notificação
await showNotification('Teste', {
  body: 'Esta é uma notificação de teste',
  badge: 'https://via.placeholder.com/96x96?text=FD'
})
```

---

## 📊 TESTE 9: PERFORMANCE (10 minutos)

### Passo 9.1: Chrome Lighthouse
```bash
# 1. Abra o app: http://localhost:3000
# 2. Pressione F12 (DevTools)
# 3. Vá para aba "Lighthouse"
# 4. Clique em "Analyze page load"
```

**O que esperar:**
- ✅ Performance: 70-85
- ✅ Accessibility: 80-90
- ✅ Best Practices: 85-95
- ✅ SEO: 85-95
- ℹ️ PWA: 60-75 (sem ícones reais)

### Passo 9.2: Performance Timeline
```bash
# DevTools → Performance → Click "Record"
# Interaja com a página por 5 segundos
# Clique "Stop"
```

**O que esperar:**
- ✅ First Contentful Paint: < 1.5s
- ✅ Largest Contentful Paint: < 2.5s
- ✅ Cumulative Layout Shift: < 0.1

---

## ✅ TESTE 10: CHECKLIST FINAL

### Instalação
- [ ] npm install sucesso
- [ ] verify-setup.sh sem erros
- [ ] .env.local criado

### Desenvolvimento
- [ ] npm run dev funciona
- [ ] http://localhost:3000 abre
- [ ] Console sem erros (F12)

### Qualidade
- [ ] npm run lint: 0 errors
- [ ] npm run format:check: OK
- [ ] npm run type-check: OK

### Testes
- [ ] npm run test passa
- [ ] npm run test:ui funciona

### Build
- [ ] npm run build sucesso
- [ ] dist/stats.html abre
- [ ] npm run preview funciona

### PWA
- [ ] Service Worker registrado
- [ ] Funciona offline (modo avião)
- [ ] Instalável (Chrome/Edge)

### Security
- [ ] Validações funcionam
- [ ] Rate limiting funciona

### Performance
- [ ] Lighthouse Performance > 70
- [ ] Lighthouse PWA > 60

---

## 🐛 TROUBLESHOOTING

### npm install falha
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Porta 3000 já está em uso
```bash
# Usar porta diferente
npm run dev -- --port 3001
```

### Erro "Cannot find module"
```bash
npm install
npm run type-check
```

### Build falha
```bash
rm -rf dist
npm run build
```

### Service Worker não registra
```bash
# Verificar HTTPS em produção
# Localmente http://localhost:3000 funciona
```

---

## 📊 RESULTADO ESPERADO

Após passar em todos os testes:

```
✅ Setup:      SUCESSO
✅ Dev:        FUNCIONANDO  
✅ Lint:       SEM ERROS
✅ Format:     OK
✅ Type-check: OK
✅ Testes:     PASSANDO
✅ Build:      SEM ERROS
✅ PWA:        ATIVO
✅ Security:   FUNCIONANDO
✅ Perf:       OTIMIZADO

🎉 TUDO PRONTO PARA PRODUÇÃO!
```

---

## 🚀 PRÓXIMOS PASSOS

Se todos os testes passaram:

1. **Implementar Firestore Rules** → Ler `SECURITY_GUIDE.md`
2. **Gerar ícones reais** → Ler `PWA_GUIDE.md`
3. **Deploy em HTTPS** → Ler `QUICK_START.md` → Deploy section
4. **Testar em produção** → Usar Vercel/Netlify/Firebase

---

## 📞 SUPORTE

Se algo falhar:

1. Verifique o console: F12 → Console
2. Leia as mensagens de erro
3. Consulte documentação relevante:
   - Setup: `QUICK_START.md`
   - Linting: `LINTING_SETUP.md`
   - Performance: `PERFORMANCE_GUIDE.md`
   - PWA: `PWA_GUIDE.md`
   - Security: `SECURITY_GUIDE.md`

---

**FlashDelivery v1.1 - Guia de Teste**  
*Tempo total: ~1 hora para todos os testes*  
*Última atualização: 21 de Dezembro de 2025*
