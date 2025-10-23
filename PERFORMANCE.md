# ⚡ Guia de Performance e Otimização

## 📊 Métricas Core Web Vitals

### Objetivos
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms  
- **CLS** (Cumulative Layout Shift): < 0.1
- **TTFB** (Time to First Byte): < 600ms

### Como Medir

#### Chrome DevTools
1. Abra DevTools (F12)
2. Vá para a aba "Lighthouse"
3. Selecione "Performance" e "Best Practices"
4. Clique em "Generate report"

#### WebPageTest
1. Acesse [webpagetest.org](https://www.webpagetest.org/)
2. Cole URL do seu app
3. Selecione localização e dispositivo
4. Analise resultados detalhados

## 🚀 Otimizações Implementadas

### 1. Code Splitting e Lazy Loading

**Gráficos do Dashboard** (`src/pages/Dashboard.tsx`):
```typescript
const CashFlowChart = lazy(() => import("@/components/dashboard/CashFlowChart"));
```

✅ Benefício: Reduz bundle inicial em ~30KB
✅ Carrega apenas quando necessário
✅ Fallback com Suspense

### 2. Memoização de Cálculos

**KPIs e Dados Filtrados**:
```typescript
const kpis = useMemo(() => {
  // cálculos pesados
}, [filteredTransactions, investments]);
```

✅ Evita recálculos desnecessários
✅ Melhora responsividade da UI

### 3. Debouncing em Filtros

Para adicionar debounce em campos de busca:

```typescript
import { useState, useEffect } from "react";

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Uso:
const [searchTerm, setSearchTerm] = useState("");
const debouncedSearch = useDebounce(searchTerm, 300);
```

### 4. Virtualização de Listas

Para tabelas muito grandes (>100 linhas), considere usar `react-window`:

```bash
npm install react-window
```

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={transactions.length}
  itemSize={60}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      {/* Renderizar linha */}
    </div>
  )}
</FixedSizeList>
```

## 🎯 Otimizações de Bundle

### Análise do Bundle

```bash
npm run build
```

Procure por:
- Chunks muito grandes (>500KB)
- Dependências duplicadas
- Código não utilizado

### Tree Shaking

✅ **Bom**:
```typescript
import { format } from "date-fns";
```

❌ **Ruim**:
```typescript
import * as dateFns from "date-fns";
```

### Dynamic Imports

Para componentes pesados que não são usados imediatamente:

```typescript
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

## 🖼️ Otimização de Imagens

### Formatos Recomendados
- **WebP**: Melhor compressão, suporte amplo
- **AVIF**: Compressão superior, suporte crescente
- **SVG**: Para ícones e logos

### Lazy Loading de Imagens

```typescript
<img 
  src={image} 
  alt="Descrição" 
  loading="lazy"
  decoding="async"
/>
```

### Responsive Images

```typescript
<img
  src={image}
  srcSet={`
    ${imageLow} 300w,
    ${imageMed} 768w,
    ${imageHigh} 1200w
  `}
  sizes="(max-width: 768px) 100vw, 50vw"
  alt="Descrição"
/>
```

## 🗄️ Otimização de Queries

### React Query - Stale Time

Configure tempos de cache apropriados:

```typescript
const { data } = useQuery({
  queryKey: ["transactions"],
  queryFn: fetchTransactions,
  staleTime: 5 * 60 * 1000, // 5 minutos
  cacheTime: 10 * 60 * 1000, // 10 minutos
});
```

### Supabase - Select Específico

❌ **Ruim** (busca tudo):
```typescript
const { data } = await supabase
  .from("transactions")
  .select("*");
```

✅ **Bom** (busca apenas necessário):
```typescript
const { data } = await supabase
  .from("transactions")
  .select("id, date, amount, description");
```

### Paginação

Para grandes volumes de dados:

```typescript
const { data } = await supabase
  .from("transactions")
  .select("*")
  .range(0, 49) // Primeiras 50 linhas
  .order("date", { ascending: false });
```

## 🎨 Otimização de CSS

### Tailwind JIT

Já está configurado! Apenas classes usadas são incluídas.

### Evitar @apply Excessivo

❌ **Ruim**:
```css
.custom-class {
  @apply flex items-center justify-between p-4 bg-primary text-white rounded-lg shadow-md hover:bg-primary/90 transition-all;
}
```

✅ **Bom**: Use classes direto no JSX ou crie variantes no cva

### Purge CSS Não Usado

Tailwind já faz isso automaticamente via `content` no config:

```javascript
// tailwind.config.ts
content: [
  "./src/**/*.{ts,tsx}",
]
```

## 📱 Performance Mobile

### Touch Targets

Mínimo de 44x44px para elementos clicáveis:

```typescript
<Button size="icon" className="h-11 w-11" />
```

### Reduzir Layout Shifts

1. Defina width/height em imagens
2. Use skeleton loaders
3. Evite injetar conteúdo acima do fold

### Prefetch de Rotas

```typescript
import { Link } from "react-router-dom";

<Link 
  to="/dashboard" 
  onMouseEnter={() => {
    // Prefetch página
  }}
>
  Dashboard
</Link>
```

## 🔍 Monitoramento em Produção

### Ferramentas Recomendadas

1. **Vercel Analytics** (se hospedar na Vercel)
2. **Google PageSpeed Insights**
3. **WebPageTest**
4. **Chrome User Experience Report**

### Alertas de Performance

Configure alertas quando:
- LCP > 3s
- CLS > 0.1
- Bundle size aumenta >10%

## 🛠️ Checklist de Performance

Antes de publicar, verifique:

- [ ] Bundle total < 300KB (gzipped)
- [ ] Lighthouse score > 90
- [ ] Todos os Core Web Vitals no verde
- [ ] Imagens otimizadas e com lazy loading
- [ ] Queries do banco otimizadas
- [ ] Código não usado removido
- [ ] Memoização em cálculos pesados
- [ ] Lazy loading de rotas/componentes pesados
- [ ] Cache configurado corretamente
- [ ] Sem console.logs em produção

## 🐛 Debugging de Performance

### React DevTools Profiler

1. Instale React DevTools
2. Aba "Profiler"
3. Clique em "Record"
4. Interaja com o app
5. Analise componentes lentos

### Chrome Performance Tab

1. Abra DevTools
2. Aba "Performance"
3. Clique em "Record"
4. Faça ações no app
5. Pare gravação
6. Analise flamegraph

### Memory Leaks

```bash
# Use Chrome Memory tab
1. Tire heap snapshot inicial
2. Navegue pelo app
3. Tire outro snapshot
4. Compare para encontrar objetos retidos
```

## 📈 Métricas de Sucesso

Após otimizações, você deve ver:

- ✅ Tempo de carregamento inicial < 2s
- ✅ Navegação entre páginas < 200ms
- ✅ Interações respondem < 50ms
- ✅ Bundle JavaScript < 200KB
- ✅ Score Lighthouse > 90

## 🎓 Recursos Adicionais

- [web.dev/vitals](https://web.dev/vitals/)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Tailwind Optimization](https://tailwindcss.com/docs/optimizing-for-production)
- [Vite Performance](https://vitejs.dev/guide/performance.html)

---

**Última atualização**: 2025-01-23
