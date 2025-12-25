# Performance Optimization Guide

## 🚀 Implementações Realizadas

### 1. **Bundle Splitting (Code Splitting)**
- Vendors separados: Firebase, React, UI components
- Chunks automáticos para melhor cache
- Visualizador de bundle em `dist/stats.html`

```bash
npm run build
# Abra dist/stats.html para análise do bundle
```

### 2. **Lazy Loading de Componentes**
Dashboards carregam sob demanda (somente após login):

```tsx
const ClientDashboard = lazy(() => 
  import('./pages/ClientDashboard').then(m => ({ default: m.ClientDashboard }))
);

<Suspense fallback={<DashboardLoader />}>
  <ClientDashboard ... />
</Suspense>
```

**Benefício:** Login carrega ~40% mais rápido

### 3. **Otimizações de Build**

| Opção | Benefício |
|-------|-----------|
| `target: 'ES2020'` | Código mais moderno e compacto |
| `minify: 'terser'` | Melhor compressão que esbuild |
| `cssCodeSplit: true` | CSS carregado sob demanda |
| `chunkSizeWarningLimit: 1000` | Avisa se chunks > 1MB |

## 🔧 Hooks de Performance Disponíveis

### `useMemo` - Memoizar Cálculos
```tsx
const filteredOrders = useMemo(() => {
  return orders.filter(o => o.status === filter);
}, [orders, filter]);
```

### `useCallback` - Callbacks Estáveis
```tsx
const handleClick = useCallback(() => {
  updateOrder(orderId);
}, [orderId]);
```

### `useDebounce` - Debounce para Inputs
```tsx
import { useDebounce } from '@/utils/performanceUtils';

const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);

useEffect(() => {
  searchOrders(debouncedSearch);
}, [debouncedSearch]);
```

### `useThrottle` - Throttle para Eventos
```tsx
import { useThrottle } from '@/utils/performanceUtils';

const throttledScroll = useThrottle(scrollPosition, 200);
```

### `memo` - Memoizar Componentes
```tsx
const OrderCard = memo(({ order, onUpdate }: Props) => {
  return <div>{order.id}</div>;
});
```

## 📊 Analisando Performance

### 1. **Bundle Size**
```bash
npm run build
# Abra: dist/stats.html
```

### 2. **Chrome DevTools**
- Performance tab → Record → Analise loading
- Network tab → Verifique tamanho de chunks

### 3. **Lighthouse**
```bash
# Via Chrome DevTools (F12 → Lighthouse)
# Alvo: Score > 80 em Performance
```

## 🎯 Checklist de Otimização

- [ ] Usar `lazy()` para rotas menos críticas
- [ ] Aplicar `memo()` em componentes com props complexas
- [ ] Usar `useMemo()` para cálculos custosos
- [ ] Usar `useCallback()` para event handlers passados como props
- [ ] Debounce em inputs de busca/filtro
- [ ] Throttle em scroll/resize events
- [ ] Revisar bundle com visualizer

## 📈 Ganhos Esperados

- **Initial Load:** -30% a -50%
- **First Paint:** -20% a -40%
- **Bundle Size:** -15% com code splitting
- **TTI (Time to Interactive):** -25% a -35%

## 🔗 Recursos

- [React.lazy() docs](https://react.dev/reference/react/lazy)
- [Vite Code Splitting](https://vitejs.dev/guide/features.html#dynamic-import)
- [Web Vitals](https://web.dev/vitals/)
