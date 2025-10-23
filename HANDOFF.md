# 📋 Guia de Handoff - Gestão Financeira Pessoal

## 🎨 Design System

### Cores e Temas

As cores do sistema são definidas em `src/index.css`. Para personalizar:

```css
:root {
  --primary: [hsl values];
  --secondary: [hsl values];
  --accent: [hsl values];
  /* etc */
}
```

**IMPORTANTE**: Use sempre tokens semânticos (ex: `text-primary`, `bg-secondary`) em vez de cores diretas.

### Componentes UI

Todos os componentes UI estão em `src/components/ui/` e seguem o padrão shadcn/ui. Para customizar variantes:

**Exemplo - Botões** (`src/components/ui/button.tsx`):
```typescript
const buttonVariants = cva(
  "...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        // Adicione novas variantes aqui
      }
    }
  }
)
```

## 🌍 Internacionalização (i18n)

### Arquivos de Idioma

- Português: `src/lib/i18n/pt-BR.ts`
- Inglês: `src/lib/i18n/en-US.ts` (a criar se necessário)

### Adicionar Novo Idioma

1. Criar arquivo em `src/lib/i18n/[locale].ts`
2. Adicionar tipo em `src/hooks/useUserPreferences.tsx`:
```typescript
export type Language = "pt-BR" | "en-US" | "novo-idioma";
```
3. Atualizar componente `UserPreferences.tsx`

## 💾 Dados e Exportação

### Exportar Dados Completos

Para fazer backup de todos os dados:

1. Acesse o backend via botão no header (ícone de banco de dados)
2. Use a interface de gerenciamento do Lovable Cloud
3. Ou utilize as APIs de exportação em `/relatorios`

### Formatos de Exportação

- **CSV**: Transações simples, compatível com Excel
- **Excel (.xlsx)**: Múltiplas abas (Transações, Resumo, Por Categoria)
- **PDF**: Relatório completo formatado

### Código de Exportação

Localizado em `src/lib/reportGenerator.ts`:
- `generateCSVExport()`: Gera CSV
- `generateExcelExport()`: Gera Excel
- `generatePDFReport()`: Gera PDF

## 🖼️ Imagens e Assets

### Substituir Logo

Não há logo específico implementado. Para adicionar:

1. Colocar imagem em `src/assets/`
2. Importar no componente Header:
```typescript
import logo from "@/assets/logo.png";
```
3. Adicionar no `src/components/layout/Header.tsx`

### Ícones

Utilizamos [Lucide React](https://lucide.dev/). Para trocar ícones:

```typescript
import { NovoIcone } from "lucide-react";

<NovoIcone className="h-4 w-4" />
```

## 🚀 Deploy e Publicação

### Publicar App

1. Clique no botão "Publish" no canto superior direito
2. Aguarde o build e deploy automáticos
3. Seu app estará disponível em `[nome-projeto].lovable.app`

### Domínio Customizado

1. Vá em Settings → Domains
2. Adicione seu domínio
3. Configure DNS conforme instruções
4. **Nota**: Requer plano pago

### Variáveis de Ambiente

Já configuradas automaticamente pelo Lovable Cloud:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

## 📝 Editar Textos

### Títulos e Descrições de Páginas

Editar em `src/components/seo/PageMeta.tsx`:

```typescript
const pageMetadata: Record<string, PageMetaData> = {
  "/": {
    title: "Seu Novo Título",
    description: "Sua nova descrição",
  },
  // ...
}
```

### Textos do Dashboard

Cada página está em `src/pages/`:
- `Dashboard.tsx` - Página inicial
- `Accounts.tsx` - Contas
- `Categories.tsx` - Categorias
- `Transactions.tsx` - Lançamentos
- `Goals.tsx` - Metas
- `Investments.tsx` - Investimentos
- `Reports.tsx` - Relatórios
- `Settings.tsx` - Configurações

### Mensagens de Toast

Centralizadas nos hooks em `src/hooks/`:
```typescript
toast({
  title: "Título",
  description: "Descrição",
  variant: "default" | "destructive"
});
```

## 🗄️ Banco de Dados

### Schema

Tabelas principais:
- `accounts` - Contas bancárias
- `categories` - Categorias hierárquicas
- `transactions` - Lançamentos
- `budgets` - Orçamentos
- `goals` - Metas
- `investment_assets` - Investimentos
- `notifications` - Notificações

### Modificar Schema

**IMPORTANTE**: Use sempre migrações via ferramenta do Lovable Cloud:

1. Acesse o backend (botão no header)
2. Vá em "Database" → "New Migration"
3. Escreva SQL da migração
4. Execute após revisão

**Nunca** edite `src/integrations/supabase/types.ts` manualmente - é gerado automaticamente.

## 🔒 Segurança (RLS)

Todas as tabelas possuem Row Level Security (RLS) habilitado. Políticas estão documentadas no código das migrações.

### Verificar Segurança

Execute o linter do Lovable Cloud:
1. Acesse o backend
2. "Database" → "Security Linter"
3. Revise avisos e corrija conforme necessário

## ⚡ Performance

### Otimizações Implementadas

1. **Lazy Loading**: Gráficos carregam sob demanda
2. **Memoização**: Cálculos pesados usam `useMemo`
3. **Code Splitting**: React.lazy() para rotas
4. **Tree Shaking**: Apenas código usado é incluído

### Melhorar Performance

1. Use React DevTools Profiler
2. Analise bundle com `npm run build`
3. Monitore Lighthouse no Chrome

### Métricas Alvo

- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

## ♿ Acessibilidade

### Checklist Implementado

✅ Landmarks semânticas (header, main, nav)
✅ Labels em todos os campos
✅ Contraste WCAG AA (mínimo 4.5:1)
✅ Navegação por teclado
✅ Indicadores de foco
✅ Textos alternativos
✅ Design responsivo
✅ Tratamento de erros

### Testar Acessibilidade

1. Use extensão WAVE (Chrome/Firefox)
2. Teste navegação apenas por teclado (Tab/Enter)
3. Use leitor de tela (NVDA/JAWS)
4. Verifique contraste com ferramentas online

## 📧 Email (Opcional)

Sistema de email está configurado mas em modo simulado. Para ativar:

1. Crie conta em [Resend.com](https://resend.com)
2. Valide domínio em https://resend.com/domains
3. Gere API key em https://resend.com/api-keys
4. Configure secret `RESEND_API_KEY` no Lovable Cloud
5. Atualize edge function em `supabase/functions/send-report-email/`

## 🐛 Debug

### Console Logs

Acesse logs do backend:
1. Botão do backend no header
2. "Logs" → Selecione função/serviço
3. Filtre por data/erro

### Network Requests

Use DevTools do navegador (F12) → Network tab

### Database Queries

Use interface SQL do Lovable Cloud para testar queries.

## 📱 Responsividade

Classes Tailwind usadas:
- `sm:` - 640px+
- `md:` - 768px+
- `lg:` - 1024px+
- `xl:` - 1280px+

Teste em diferentes tamanhos via DevTools (F12) → Device Toolbar.

## 🎯 Próximos Passos Sugeridos

1. **Multi-idioma completo**: Implementar i18n em todos os textos
2. **Testes automatizados**: Adicionar testes com Vitest/Playwright
3. **PWA**: Tornar aplicação Progressive Web App
4. **Notificações Push**: Alertas via navegador
5. **Exportação agendada**: Relatórios automáticos por email
6. **Integração bancária**: APIs de bancos (Open Finance)
7. **IA para categorização**: Sugestão automática de categorias
8. **Gráficos avançados**: Mais visualizações e análises

## 📞 Suporte

- [Documentação Lovable](https://docs.lovable.dev/)
- [Discord Lovable](https://discord.com/channels/1119885301872070706/1280461670979993613)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui Docs](https://ui.shadcn.com/)

---

**Data da última atualização**: 2025-01-23
**Versão**: 1.0.0
