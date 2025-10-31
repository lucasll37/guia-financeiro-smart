-- Ajustar notificação de mudança de plano para distinguir promoção de rebaixamento

CREATE OR REPLACE FUNCTION public.tr_notify_plan_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_name text;
  v_old_plan_hierarchy integer;
  v_new_plan_hierarchy integer;
  v_is_upgrade boolean;
BEGIN
  -- Só notifica se o plano mudou e não foi o próprio usuário
  IF (NEW.plan IS DISTINCT FROM OLD.plan) AND (NEW.user_id != auth.uid()) THEN
    -- Definir hierarquia dos planos (maior = melhor)
    v_old_plan_hierarchy := CASE 
      WHEN OLD.plan = 'free' THEN 1
      WHEN OLD.plan = 'plus' THEN 2
      WHEN OLD.plan = 'pro' THEN 3
      ELSE 0
    END;
    
    v_new_plan_hierarchy := CASE 
      WHEN NEW.plan = 'free' THEN 1
      WHEN NEW.plan = 'plus' THEN 2
      WHEN NEW.plan = 'pro' THEN 3
      ELSE 0
    END;
    
    -- Determinar se é upgrade ou downgrade
    v_is_upgrade := v_new_plan_hierarchy > v_old_plan_hierarchy;
    
    v_plan_name := CASE 
      WHEN NEW.plan = 'free' THEN 'Free'
      WHEN NEW.plan = 'plus' THEN 'Plus'
      WHEN NEW.plan = 'pro' THEN 'Pro'
      ELSE UPPER(NEW.plan::text)
    END;

    PERFORM public.create_notification(
      NEW.user_id,
      'system',
      format('Sua conta foi %s a %s pelo administrador', 
        CASE WHEN v_is_upgrade THEN 'promovida' ELSE 'rebaixada' END,
        v_plan_name
      ),
      jsonb_build_object(
        'old_plan', OLD.plan,
        'new_plan', NEW.plan,
        'is_upgrade', v_is_upgrade
      )
    );
  END IF;

  RETURN NEW;
END;
$$;