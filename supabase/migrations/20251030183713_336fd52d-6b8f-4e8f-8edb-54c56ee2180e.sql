-- Fix notes formatting to avoid invalid format() specifier
CREATE OR REPLACE FUNCTION public.recompute_casa_revenue_forecasts(p_account_id uuid, p_period_start date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acc_type public.account_type;
  v_total_expenses numeric := 0;
  v_revenue_cat_id uuid;
  v_split jsonb := '{}'::jsonb;
  v_total_weight numeric := 0;
  v_period_end date := (date_trunc('month', p_period_start) + interval '1 month' - interval '1 day')::date;
  r record;
  v_user_id uuid;
  v_weight numeric;
  v_name text;
  v_email text;
  v_subcat_id uuid;
BEGIN
  SELECT type, COALESCE(revenue_split, '{}'::jsonb) INTO v_acc_type, v_split
  FROM public.accounts
  WHERE id = p_account_id;

  IF v_acc_type IS DISTINCT FROM 'casa' THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(f.forecasted_amount), 0) INTO v_total_expenses
  FROM public.account_period_forecasts f
  JOIN public.categories c ON c.id = f.category_id
  WHERE f.account_id = p_account_id
    AND f.period_start = p_period_start
    AND c.type = 'despesa';

  SELECT id INTO v_revenue_cat_id
  FROM public.categories
  WHERE account_id = p_account_id AND type = 'receita' AND parent_id IS NULL
  LIMIT 1;

  IF v_revenue_cat_id IS NULL THEN
    INSERT INTO public.categories(account_id, name, type, color)
    VALUES (p_account_id, 'Receita', 'receita', '#10b981')
    RETURNING id INTO v_revenue_cat_id;
  END IF;

  DELETE FROM public.account_period_forecasts f
  USING public.categories c
  WHERE f.account_id = p_account_id
    AND f.period_start = p_period_start
    AND c.id = f.category_id
    AND c.type = 'receita'
    AND c.parent_id = v_revenue_cat_id;

  IF v_total_expenses = 0 THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM((e.value)::numeric), 0) INTO v_total_weight
  FROM jsonb_each_text(v_split) AS e(key, value);

  IF v_total_weight = 0 THEN
    RETURN;
  END IF;

  FOR r IN SELECT key, value FROM jsonb_each(v_split) LOOP
    v_user_id := r.key::uuid;
    v_weight := (r.value)::numeric;

    SELECT p.name, p.email INTO v_name, v_email
    FROM public.profiles p
    WHERE p.id = v_user_id;

    SELECT id INTO v_subcat_id
    FROM public.categories
    WHERE account_id = p_account_id
      AND type = 'receita'
      AND parent_id = v_revenue_cat_id
      AND (
        (v_email IS NOT NULL AND v_email <> '' AND name ILIKE '%' || v_email || '%')
        OR (v_name IS NOT NULL AND v_name <> '' AND name ILIKE v_name || '%')
      )
    LIMIT 1;

    IF v_subcat_id IS NULL THEN
      INSERT INTO public.categories(account_id, name, type, color, parent_id)
      VALUES (
        p_account_id,
        COALESCE(NULLIF(v_name, ''), 'Sem nome') || CASE WHEN v_email IS NOT NULL AND v_email <> '' THEN ' (' || v_email || ')' ELSE '' END,
        'receita',
        '#10b981',
        v_revenue_cat_id
      )
      RETURNING id INTO v_subcat_id;
    END IF;

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
$$;