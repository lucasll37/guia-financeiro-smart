-- Criar tabela de histórico de rateio por período
CREATE TABLE IF NOT EXISTS public.casa_revenue_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, user_id, period_start)
);

-- Índices para performance
CREATE INDEX idx_casa_revenue_splits_account ON public.casa_revenue_splits(account_id);
CREATE INDEX idx_casa_revenue_splits_period ON public.casa_revenue_splits(account_id, period_start);

-- RLS policies
ALTER TABLE public.casa_revenue_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view splits of accessible accounts"
  ON public.casa_revenue_splits FOR SELECT
  USING (user_has_account_access(account_id, auth.uid()));

CREATE POLICY "Owners can manage splits"
  ON public.casa_revenue_splits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE id = casa_revenue_splits.account_id AND owner_id = auth.uid()
    )
  );

-- Migrar dados existentes de accounts.revenue_split para a nova tabela
-- Para cada conta casa com revenue_split, criar registros para o mês atual
INSERT INTO public.casa_revenue_splits (account_id, user_id, period_start, weight)
SELECT 
  a.id,
  (jsonb_each.key)::uuid,
  date_trunc('month', CURRENT_DATE)::date,
  (jsonb_each.value)::numeric
FROM public.accounts a
CROSS JOIN LATERAL jsonb_each(COALESCE(a.revenue_split, '{}'::jsonb)) AS jsonb_each
WHERE a.type = 'casa'
  AND jsonb_typeof(a.revenue_split) = 'object'
ON CONFLICT (account_id, user_id, period_start) DO NOTHING;

-- Atualizar função recompute_casa_revenue_forecasts para usar a nova tabela
CREATE OR REPLACE FUNCTION public.recompute_casa_revenue_forecasts(p_account_id uuid, p_period_start date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_acc_type public.account_type;
  v_total_expenses numeric := 0;
  v_revenue_cat_id uuid;
  v_total_weight numeric := 0;
  v_period_end date := (date_trunc('month', p_period_start) + interval '1 month' - interval '1 day')::date;
  r record;
  v_user_id uuid;
  v_weight numeric;
  v_name text;
  v_email text;
  v_subcat_id uuid;
BEGIN
  -- Verificar tipo da conta
  SELECT type INTO v_acc_type
  FROM public.accounts
  WHERE id = p_account_id;

  IF v_acc_type IS DISTINCT FROM 'casa' THEN
    RETURN;
  END IF;

  -- Total de DESPESAS previstas do mês
  SELECT COALESCE(SUM(f.forecasted_amount), 0) INTO v_total_expenses
  FROM public.account_period_forecasts f
  JOIN public.categories c ON c.id = f.category_id
  WHERE f.account_id = p_account_id
    AND f.period_start = p_period_start
    AND c.type = 'despesa';

  -- Encontrar/criar categoria Receita raiz
  SELECT id INTO v_revenue_cat_id
  FROM public.categories
  WHERE account_id = p_account_id AND type = 'receita' AND parent_id IS NULL
  LIMIT 1;

  IF v_revenue_cat_id IS NULL THEN
    INSERT INTO public.categories(account_id, name, type, color)
    VALUES (p_account_id, 'Receita', 'receita', '#10b981')
    RETURNING id INTO v_revenue_cat_id;
  END IF;

  -- Limpar previsões de RECEITA anteriores do mês
  DELETE FROM public.account_period_forecasts f
  USING public.categories c
  WHERE f.account_id = p_account_id
    AND f.period_start = p_period_start
    AND c.id = f.category_id
    AND c.type = 'receita'
    AND c.parent_id = v_revenue_cat_id;

  -- Se não há despesas previstas, não criar previsões de receita
  IF v_total_expenses = 0 THEN
    RETURN;
  END IF;

  -- Buscar split do período específico
  SELECT COALESCE(SUM(weight), 0) INTO v_total_weight
  FROM public.casa_revenue_splits
  WHERE account_id = p_account_id
    AND period_start = p_period_start;

  IF v_total_weight = 0 THEN
    RETURN;
  END IF;

  -- Para cada participante no split do período
  FOR r IN 
    SELECT user_id, weight 
    FROM public.casa_revenue_splits
    WHERE account_id = p_account_id
      AND period_start = p_period_start
  LOOP
    v_user_id := r.user_id;
    v_weight := r.weight;

    SELECT p.name, p.email INTO v_name, v_email
    FROM public.profiles p
    WHERE p.id = v_user_id;

    -- Verificar se já existe subcategoria com o padrão NOME (EMAIL)
    SELECT id INTO v_subcat_id
    FROM public.categories
    WHERE account_id = p_account_id
      AND type = 'receita'
      AND parent_id = v_revenue_cat_id
      AND name = (COALESCE(NULLIF(v_name, ''), 'Sem nome') || 
                  CASE WHEN v_email IS NOT NULL AND v_email <> '' 
                       THEN ' (' || v_email || ')' 
                       ELSE '' END)
    LIMIT 1;

    -- Se não existir, criar subcategoria
    IF v_subcat_id IS NULL THEN
      INSERT INTO public.categories(account_id, name, type, color, parent_id)
      VALUES (
        p_account_id,
        COALESCE(NULLIF(v_name, ''), 'Sem nome') || 
          CASE WHEN v_email IS NOT NULL AND v_email <> '' 
               THEN ' (' || v_email || ')' 
               ELSE '' END,
        'receita',
        '#10b981',
        v_revenue_cat_id
      )
      RETURNING id INTO v_subcat_id;
    END IF;

    -- Inserir previsão de RECEITA deste usuário para o mês
    INSERT INTO public.account_period_forecasts(
      account_id, category_id, period_start, period_end, forecasted_amount, notes
    ) VALUES (
      p_account_id,
      v_subcat_id,
      p_period_start,
      v_period_end,
      (v_total_expenses * v_weight / v_total_weight),
      'Contribuição automática: ' || to_char((v_weight / v_total_weight) * 100, 'FM999990.0') || '% (peso ' || v_weight::text || ')'
    )
    ON CONFLICT (account_id, category_id, period_start)
    DO UPDATE SET
      forecasted_amount = EXCLUDED.forecasted_amount,
      notes = EXCLUDED.notes,
      updated_at = now();
  END LOOP;
END;
$function$;

-- Atualizar trigger para adicionar split por período (não mais deletar subcategorias)
CREATE OR REPLACE FUNCTION public.tr_recalc_casa_on_member_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_account_id uuid := COALESCE(NEW.account_id, OLD.account_id);
  v_acc_type public.account_type;
  v_period_start date;
  v_user_id uuid;
BEGIN
  -- Verificar se a conta é tipo casa
  SELECT type INTO v_acc_type
  FROM public.accounts
  WHERE id = v_account_id;

  IF v_acc_type IS DISTINCT FROM 'casa' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Apenas processar membros com role 'editor' (pagantes)
  IF COALESCE(NEW.role, OLD.role) IS DISTINCT FROM 'editor' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Caso 1: Membro editor aceito foi adicionado/mudou para aceito
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.status = 'accepted' AND NEW.role = 'editor' THEN
    v_user_id := NEW.user_id;
    
    -- Adicionar ao split de TODOS os períodos que têm despesas (presente e futuro)
    INSERT INTO public.casa_revenue_splits (account_id, user_id, period_start, weight)
    SELECT DISTINCT 
      v_account_id,
      v_user_id,
      f.period_start,
      1
    FROM public.account_period_forecasts f
    JOIN public.categories c ON c.id = f.category_id
    WHERE f.account_id = v_account_id
      AND c.type = 'despesa'
      AND f.period_start >= date_trunc('month', CURRENT_DATE)::date
    ON CONFLICT (account_id, user_id, period_start) DO NOTHING;

    -- Recalcular para todos os períodos afetados
    FOR v_period_start IN 
      SELECT DISTINCT period_start
      FROM public.casa_revenue_splits
      WHERE account_id = v_account_id
        AND user_id = v_user_id
    LOOP
      PERFORM public.recompute_casa_revenue_forecasts(v_account_id, v_period_start);
    END LOOP;
  END IF;

  -- Caso 2: Membro editor foi removido ou deixou de ser aceito
  -- IMPORTANTE: NÃO deletar subcategorias nem forecasts (preservar histórico)
  -- Apenas remover do split de períodos futuros
  IF (TG_OP = 'DELETE') OR 
     (TG_OP = 'UPDATE' AND (OLD.status = 'accepted' AND NEW.status <> 'accepted')) THEN
    v_user_id := COALESCE(OLD.user_id, NEW.user_id);

    -- Remover do split apenas de períodos futuros (>= mês atual)
    DELETE FROM public.casa_revenue_splits
    WHERE account_id = v_account_id
      AND user_id = v_user_id
      AND period_start >= date_trunc('month', CURRENT_DATE)::date;

    -- Recalcular para períodos futuros
    FOR v_period_start IN 
      SELECT DISTINCT f.period_start
      FROM public.account_period_forecasts f
      JOIN public.categories c ON c.id = f.category_id
      WHERE f.account_id = v_account_id
        AND c.type = 'despesa'
        AND f.period_start >= date_trunc('month', CURRENT_DATE)::date
    LOOP
      PERFORM public.recompute_casa_revenue_forecasts(v_account_id, v_period_start);
    END LOOP;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Atualizar trigger de mudança de split na conta para trabalhar com a nova tabela
CREATE OR REPLACE FUNCTION public.tr_recalc_casa_on_split_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_period_start date;
BEGIN
  -- Apenas processar contas tipo casa
  IF NEW.type IS DISTINCT FROM 'casa' THEN
    RETURN NEW;
  END IF;

  -- Este trigger agora é menos relevante já que o split está na tabela casa_revenue_splits
  -- Mas vamos manter para compatibilidade

  -- Recalcular previsões de receita para todos os meses que têm despesas previstas
  FOR v_period_start IN 
    SELECT DISTINCT f.period_start
    FROM public.account_period_forecasts f
    JOIN public.categories c ON c.id = f.category_id
    WHERE f.account_id = NEW.id
      AND c.type = 'despesa'
  LOOP
    PERFORM public.recompute_casa_revenue_forecasts(NEW.id, v_period_start);
  END LOOP;

  RETURN NEW;
END;
$function$;