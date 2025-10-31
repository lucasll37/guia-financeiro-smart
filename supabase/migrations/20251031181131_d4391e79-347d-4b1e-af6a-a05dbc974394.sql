-- Corrigir trigger para recalcular receitas de cartão quando o período muda
CREATE OR REPLACE FUNCTION public.sync_casa_credit_card_revenues()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_acc_type public.account_type;
  v_account_id uuid;
  v_credit_card_id uuid;
  v_payment_month date;
  v_old_payment_month date;
  v_card_name text;
  v_user_id uuid;
  v_user_name text;
  v_user_email text;
  v_revenue_cat_id uuid;
  v_user_revenue_subcat_id uuid;
  v_invoice_total numeric := 0;
  v_existing_revenue_id uuid;
  v_category_type public.category_type;
BEGIN
  -- Determinar contexto baseado na operação
  IF TG_OP = 'DELETE' THEN
    v_account_id := OLD.account_id;
    v_credit_card_id := OLD.credit_card_id;
    v_payment_month := OLD.payment_month;
  ELSIF TG_OP = 'UPDATE' THEN
    v_account_id := NEW.account_id;
    v_credit_card_id := NEW.credit_card_id;
    v_payment_month := NEW.payment_month;
    v_old_payment_month := OLD.payment_month;
  ELSE
    v_account_id := NEW.account_id;
    v_credit_card_id := NEW.credit_card_id;
    v_payment_month := NEW.payment_month;
  END IF;

  -- Ignorar se não for transação de cartão
  IF v_credit_card_id IS NULL OR v_payment_month IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Verificar se é conta tipo casa
  SELECT type INTO v_acc_type
  FROM public.accounts
  WHERE id = v_account_id;

  IF v_acc_type IS DISTINCT FROM 'casa' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Verificar tipo da categoria da transação (processar apenas despesas)
  SELECT type INTO v_category_type
  FROM public.categories
  WHERE id = COALESCE(NEW.category_id, OLD.category_id);

  IF v_category_type IS DISTINCT FROM 'despesa' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Buscar nome do cartão e usuário dono do cartão (created_by)
  SELECT cc.name, cc.created_by INTO v_card_name, v_user_id
  FROM public.credit_cards cc
  WHERE cc.id = v_credit_card_id;

  -- Buscar dados do usuário dono do cartão
  SELECT name, email INTO v_user_name, v_user_email
  FROM public.profiles
  WHERE id = v_user_id;

  -- Buscar categoria raiz de Receita
  SELECT id INTO v_revenue_cat_id
  FROM public.categories
  WHERE account_id = v_account_id 
    AND type = 'receita' 
    AND parent_id IS NULL
  LIMIT 1;

  IF v_revenue_cat_id IS NULL THEN
    -- Criar categoria Receita se não existir
    INSERT INTO public.categories(account_id, name, type, color, is_system_generated)
    VALUES (v_account_id, 'Receita', 'receita', '#10b981', true)
    RETURNING id INTO v_revenue_cat_id;
  END IF;

  -- Buscar subcategoria de receita do usuário dono do cartão
  SELECT id INTO v_user_revenue_subcat_id
  FROM public.categories
  WHERE account_id = v_account_id
    AND parent_id = v_revenue_cat_id
    AND name = (COALESCE(NULLIF(v_user_name, ''), 'Sem nome') || 
                CASE WHEN v_user_email IS NOT NULL AND v_user_email <> '' 
                     THEN ' (' || v_user_email || ')' 
                     ELSE '' END)
  LIMIT 1;

  IF v_user_revenue_subcat_id IS NULL THEN
    -- Criar subcategoria do usuário se não existir
    INSERT INTO public.categories(account_id, name, type, color, parent_id, is_system_generated)
    VALUES (
      v_account_id,
      COALESCE(NULLIF(v_user_name, ''), 'Sem nome') || 
        CASE WHEN v_user_email IS NOT NULL AND v_user_email <> '' 
             THEN ' (' || v_user_email || ')' 
             ELSE '' END,
      'receita',
      '#10b981',
      v_revenue_cat_id,
      true
    )
    RETURNING id INTO v_user_revenue_subcat_id;
  END IF;

  -- IMPORTANTE: Se for UPDATE e o payment_month mudou, processar AMBOS os períodos
  IF TG_OP = 'UPDATE' AND v_old_payment_month IS DISTINCT FROM v_payment_month THEN
    -- Recalcular período ANTIGO primeiro
    IF v_old_payment_month IS NOT NULL THEN
      -- Calcular total da fatura do cartão para o mês ANTIGO
      SELECT COALESCE(SUM(amount), 0) INTO v_invoice_total
      FROM public.transactions
      WHERE account_id = v_account_id
        AND credit_card_id = v_credit_card_id
        AND payment_month = v_old_payment_month;

      -- Buscar lançamento de receita automático existente para o período ANTIGO
      SELECT id INTO v_existing_revenue_id
      FROM public.transactions
      WHERE account_id = v_account_id
        AND category_id = v_user_revenue_subcat_id
        AND date = v_old_payment_month
        AND description = '[AUTO] Fatura ' || v_card_name
      LIMIT 1;

      IF v_invoice_total > 0 THEN
        -- Atualizar lançamento existente do período antigo
        IF v_existing_revenue_id IS NOT NULL THEN
          UPDATE public.transactions
          SET amount = v_invoice_total,
              updated_at = now()
          WHERE id = v_existing_revenue_id;
        END IF;
      ELSE
        -- Se não há mais despesas no período antigo, deletar o lançamento de receita
        IF v_existing_revenue_id IS NOT NULL THEN
          DELETE FROM public.transactions
          WHERE id = v_existing_revenue_id;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Processar período ATUAL (novo ou único)
  -- Calcular total da fatura do cartão para o mês
  SELECT COALESCE(SUM(amount), 0) INTO v_invoice_total
  FROM public.transactions
  WHERE account_id = v_account_id
    AND credit_card_id = v_credit_card_id
    AND payment_month = v_payment_month;

  -- Buscar lançamento de receita automático existente (identificado pela descrição)
  SELECT id INTO v_existing_revenue_id
  FROM public.transactions
  WHERE account_id = v_account_id
    AND category_id = v_user_revenue_subcat_id
    AND date = v_payment_month
    AND description = '[AUTO] Fatura ' || v_card_name
  LIMIT 1;

  IF v_invoice_total > 0 THEN
    -- Criar ou atualizar lançamento de receita
    IF v_existing_revenue_id IS NULL THEN
      -- Criar novo lançamento
      INSERT INTO public.transactions (
        account_id,
        category_id,
        date,
        amount,
        description,
        created_by,
        is_recurring,
        payment_month
      ) VALUES (
        v_account_id,
        v_user_revenue_subcat_id,
        v_payment_month,
        v_invoice_total,
        '[AUTO] Fatura ' || v_card_name,
        v_user_id,
        false,
        NULL
      );
    ELSE
      -- Atualizar lançamento existente
      UPDATE public.transactions
      SET amount = v_invoice_total,
          updated_at = now()
      WHERE id = v_existing_revenue_id;
    END IF;
  ELSE
    -- Se não há mais despesas, deletar o lançamento de receita
    IF v_existing_revenue_id IS NOT NULL THEN
      DELETE FROM public.transactions
      WHERE id = v_existing_revenue_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;