# 👥 Guia: Como Criar Usuários para Login

## 📋 Opção 1: Modo Mock (localStorage) - Recomendado para Testes Rápidos ✅

O sistema já vem com **3 usuários padrão** criados automaticamente no localStorage:

### Usuários Pré-configurados:

| Tipo | Username | Senha | Função |
|------|----------|-------|--------|
| **Admin** | `admin` | `admin123` | Gerenciar sistema e pedidos |
| **Motoboy** | `moto` | `123456` | Aceitar e entregar pedidos |
| **Cliente/Loja** | `loja` | `123456` | Criar e acompanhar pedidos |

### ✅ Como Testar Agora:

1. **Certifique-se que o servidor está rodando:**
   ```bash
   npm run dev
   ```

2. **Abra a página de login:**
   - URL: `http://localhost:3000`

3. **Faça login com uma das contas acima:**
   - Admin: `admin` / `admin123`
   - Moto: `moto` / `123456`
   - Loja: `loja` / `123456`

### 📝 Como Adicionar Mais Usuários Mock (localStorage):

Edite [services/mockDb.ts](services/mockDb.ts) na seção de inicialização:

```typescript
private init() {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    const initialUsers: User[] = [
      // Usuários existentes...
      
      // ✨ NOVO USUÁRIO
      { 
        id: 'u2', 
        name: 'João Silva', 
        username: 'joao', 
        password: '123456', 
        role: UserRole.CLIENT, 
        preferences: DEFAULT_PREFS,
        address: 'Rua das Flores, 500'
      },
    ];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(initialUsers));
  }
}
```

**Propriedades disponíveis por tipo:**

**Cliente/Loja:**
```typescript
{ 
  id: 'unique_id',
  name: 'Nome da Loja',
  username: 'username_unico',
  password: 'senha',
  role: UserRole.CLIENT,
  address: 'Endereço completo',
  phone: '(11) 98765-4321',
  fixedDeliveryPrice: 15.00,
  preferences: DEFAULT_PREFS
}
```

**Motoboy/Motorista:**
```typescript
{ 
  id: 'unique_id',
  name: 'Nome do Motorista',
  username: 'username_unico',
  password: 'senha',
  role: UserRole.DRIVER,
  phone: '(11) 98765-4321',
  isOnline: true,
  location: { lat: -23.5615, lng: -46.6559 },
  vehicle: { plate: 'ABC-1234', model: 'Honda CG 160' },
  stats: {
    totalDeliveries: 0,
    averageRating: 5.0,
    punctualityScore: 100,
    level: 'BRONZE' as DriverLevel,
    points: 0,
    badges: []
  },
  preferences: DEFAULT_PREFS
}
```

**Admin:**
```typescript
{ 
  id: 'unique_id',
  name: 'Nome Admin',
  username: 'username_unico',
  password: 'senha',
  role: UserRole.ADMIN,
  preferences: DEFAULT_PREFS
}
```

---

## 🔥 Opção 2: Modo Real (Firebase) - Para Produção

### ⚙️ Pré-requisitos:

1. **Credenciais Firebase configuradas** em `.env.local`:
   ```env
   VITE_FIREBASE_API_KEY=seu_api_key
   VITE_FIREBASE_PROJECT_ID=seu_project_id
   VITE_FIREBASE_AUTH_DOMAIN=seu_project.firebaseapp.com
   VITE_FIREBASE_STORAGE_BUCKET=seu_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
   VITE_FIREBASE_APP_ID=seu_app_id
   ```

2. **Servidor do Firebase rodando:**
   ```bash
   npm run dev
   ```

### 📖 Como Usar o DbSeeder (Criador de Banco de Dados):

1. **Abra o console do navegador (F12)**

2. **Execute este comando no console:**
   ```javascript
   // Procure a página que tem um botão com ícone de Database
   // Ou execute manualmente através do componente DbSeeder
   ```

3. **Ou acesse o componente DbSeeder direto:**
   - Edite [App.tsx](App.tsx) e adicione temporariamente o componente:
   ```tsx
   import { DbSeeder } from './components/DbSeeder';
   
   // Dentro do componente App:
   <DbSeeder />
   ```

4. **Clique no botão "Seed Database"** para criar os usuários:
   - Criará: Admin, Motoboy, Cliente e Regiões
   - Mostrará logs de progresso
   - Confirmará sucesso ou erro

### 🔐 Usuários Criados pelo DbSeeder:

| Tipo | Email | Senha | Função |
|------|-------|-------|--------|
| **Admin** | `admin` | `admin123` | Gerenciador do sistema |
| **Motoboy** | `moto` | `123456` | Entregador profissional |
| **Cliente** | `loja` | `123456` | Loja/Cliente |

---

## 🎯 Comparação: Mock vs Real

| Aspecto | Mock (localStorage) | Real (Firebase) |
|--------|------------------|-----------------|
| **Setup** | ✅ Automático | ⚠️ Requer credenciais |
| **Persistência** | ⏱️ Por navegador/aba | ✅ Global/Nuvem |
| **Colaboração** | ❌ Não | ✅ Sim |
| **Segurança** | ⚠️ Fraca | ✅ Forte |
| **Para Teste** | ✅ Perfeito | ⚠️ Mais complexo |
| **Para Produção** | ❌ Não | ✅ Sim |

---

## 🚀 Próximos Passos:

### ✅ Teste Imediato (5 minutos):
```bash
# 1. Certifique-se que npm install foi executado
npm install

# 2. Inicie o servidor
npm run dev

# 3. Abra http://localhost:3000
# 4. Faça login com: admin / admin123
```

### 📋 Se Usar Mock + Adicionar Mais Usuários:
1. Edite [services/mockDb.ts](services/mockDb.ts)
2. Adicione novos usuários na array `initialUsers`
3. Limpe o localStorage (DevTools → Application → Storage → Clear All)
4. Recarregue a página (F5)
5. Faça login com o novo usuário

### 🔐 Se Quiser Usar Firebase Real:
1. Obtenha credenciais do [Firebase Console](https://console.firebase.google.com)
2. Adicione em `.env.local` (não `commit` este arquivo!)
3. Use o componente `DbSeeder` para criar usuários
4. Verifique logs em DevTools (F12)

---

## 🐛 Troubleshooting:

### "Usuário ou senha incorretos"
- Verifique o `username` e `password` exatamente como digitados
- Usuarios são case-sensitive para senha
- Usuarnames são case-insensitive

### Usuários desaparecem ao recarregar página
- Você está usando Firebase Real?
- Verifique se `.env.local` tem credenciais válidas
- Verifique Firestore rules em Firebase Console

### DbSeeder mostra erro "Firebase Auth não inicializado"
- Verifique credenciais em `.env.local`
- Use `npm run dev` para recarregar environment
- Veja logs em DevTools (F12)

---

## 📚 Estrutura de Usuário (TypeScript):

```typescript
interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  role: UserRole; // ADMIN | CLIENT | DRIVER
  phone?: string;
  address?: string;
  email?: string;
  
  // Campos específicos de motorista:
  isOnline?: boolean;
  location?: Coordinates;
  vehicle?: { plate: string; model: string };
  stats?: {
    totalDeliveries: number;
    averageRating: number;
    punctualityScore: number;
    level: DriverLevel;
    points: number;
    badges: string[];
  };
  
  // Campos específicos de cliente:
  fixedDeliveryPrice?: number;
  
  // Preferências:
  preferences: NotificationPreferences;
}
```

---

**Pronto! Escolha Mock (rápido) ou Real (produção) e comece a testar! 🎉**
