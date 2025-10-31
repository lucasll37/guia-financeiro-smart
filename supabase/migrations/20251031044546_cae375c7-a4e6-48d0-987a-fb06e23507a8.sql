-- Corrigir triggers para evitar notificações duplicadas

-- 1. COMPARTILHAMENTO DE CONTA (prevenir duplicatas)
CREATE OR REPLACE FUNCTION public.tr_notify_account_shared_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_name text;
  v_inviter_name text;
  v_inviter_email text;
  v_role_text text;
BEGIN
  -- Para INSERT: notificar se status é 'accepted'
  -- Para UPDATE: notificar apenas se status MUDOU para 'accepted'
  IF (TG_OP = 'INSERT' AND NEW.status = 'accepted') OR
     (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'accepted' AND NEW.status = 'accepted') THEN
    
    SELECT a.name INTO v_account_name 
    FROM public.accounts a 
    WHERE a.id = NEW.account_id;

    SELECT p.name, p.email INTO v_inviter_name, v_inviter_email
    FROM public.profiles p
    WHERE p.id = NEW.invited_by;

    v_role_text := CASE 
      WHEN NEW.role = 'editor' THEN 'Editor'
      ELSE 'Visualizador'
    END;

    PERFORM public.create_notification(
      NEW.user_id,
      'system',
      format('A conta "%s" foi compartilhada contigo (%s) por %s (%s)', 
        v_account_name, 
        v_role_text,
        COALESCE(v_inviter_name, 'Sem nome'),
        COALESCE(v_inviter_email, 'sem email')
      ),
      jsonb_build_object(
        'account_id', NEW.account_id,
        'account_name', v_account_name,
        'invited_by', NEW.invited_by,
        'role', NEW.role
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 2. COMPARTILHAMENTO DE INVESTIMENTO (prevenir duplicatas)
CREATE OR REPLACE FUNCTION public.tr_notify_investment_invited_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_investment_name text;
  v_inviter_name text;
  v_inviter_email text;
  v_role_text text;
BEGIN
  -- Para INSERT: notificar se status é 'accepted'
  -- Para UPDATE: notificar apenas se status MUDOU para 'accepted'
  IF (TG_OP = 'INSERT' AND NEW.status = 'accepted') OR
     (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'accepted' AND NEW.status = 'accepted') THEN
    
    SELECT ia.name INTO v_investment_name 
    FROM public.investment_assets ia 
    WHERE ia.id = NEW.investment_id;

    SELECT p.name, p.email INTO v_inviter_name, v_inviter_email
    FROM public.profiles p
    WHERE p.id = NEW.invited_by;

    v_role_text := CASE 
      WHEN NEW.role = 'editor' THEN 'Editor'
      ELSE 'Visualizador'
    END;

    PERFORM public.create_notification(
      NEW.user_id,
      'system',
      format('O investimento "%s" foi compartilhado contigo (%s) por %s (%s)', 
        v_investment_name, 
        v_role_text,
        COALESCE(v_inviter_name, 'Sem nome'),
        COALESCE(v_inviter_email, 'sem email')
      ),
      jsonb_build_object(
        'investment_id', NEW.investment_id,
        'investment_name', v_investment_name,
        'invited_by', NEW.invited_by,
        'role', NEW.role
      )
    );
  END IF;

  RETURN NEW;
END;
$$;