-- Adicionar configurações de guias de ajuda editáveis pelo admin
INSERT INTO public.app_settings (key, value, description, updated_by)
VALUES 
  (
    'account_guide_text',
    '## Como usar esta conta

**1. Crie previsões** - Defina quanto espera receber e gastar em cada categoria

**2. Registre lançamentos** - Adicione suas receitas e despesas do dia a dia

**3. Acompanhe a evolução** - Veja a comparação entre previsto x realizado e seu saldo

### Opcional:
- **Cartões de crédito** - Configure seus cartões para rastrear faturas
- **Categorias personalizadas** - Adapte as categorias às suas necessidades',
    'Texto em markdown do guia de instruções da página de detalhes de conta',
    (SELECT auth.uid())
  ),
  (
    'investment_guide_text',
    '## Como usar seus investimentos

**1. Registre os rendimentos** - Adicione os retornos mensais do investimento

**2. Acompanhe a evolução** - Visualize gráficos e projeções de crescimento

**3. Simule cenários** - Use o simulador para planejar o futuro do investimento',
    'Texto em markdown do guia de instruções da página de detalhes de investimento',
    (SELECT auth.uid())
  ),
  (
    'goal_guide_text',
    '## Como usar suas metas

**1. Defina seus objetivos** - Crie metas com valor alvo e prazo

**2. Atualize o progresso** - Registre o quanto já acumulou para cada meta

**3. Acompanhe a evolução** - Veja o percentual de conclusão e tempo restante',
    'Texto em markdown do guia de instruções da página de metas',
    (SELECT auth.uid())
  )
ON CONFLICT (key) DO NOTHING;