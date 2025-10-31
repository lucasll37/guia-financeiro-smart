-- Drop existing triggers to recreate with new messages
DROP TRIGGER IF EXISTS notify_investment_invited_user ON public.investment_members;
DROP TRIGGER IF EXISTS notify_account_shared_user ON public.account_members;
DROP TRIGGER IF EXISTS notify_owner_on_member_leave ON public.investment_members;
DROP TRIGGER IF EXISTS notify_account_owner_on_member_leave ON public.account_members;

-- 1. COMPARTILHAMENTO DE INVESTIMENTO (atualizar mensagem)
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
  IF NEW.status = 'accepted' THEN
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

CREATE TRIGGER notify_investment_invited_user
  AFTER INSERT OR UPDATE OF status ON public.investment_members
  FOR EACH ROW
  EXECUTE FUNCTION public.tr_notify_investment_invited_user();

-- 2. COMPARTILHAMENTO DE CONTA (atualizar mensagem)
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
  IF NEW.status = 'accepted' THEN
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

CREATE TRIGGER notify_account_shared_user
  AFTER INSERT OR UPDATE OF status ON public.account_members
  FOR EACH ROW
  EXECUTE FUNCTION public.tr_notify_account_shared_user();

-- 3. REMOÇÃO DE INVESTIMENTO PELO DONO (nova)
CREATE OR REPLACE FUNCTION public.tr_notify_removed_from_investment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_investment_name text;
  v_owner_id uuid;
  v_remover_name text;
  v_remover_email text;
BEGIN
  -- Buscar owner do investimento
  SELECT ia.name, ia.owner_id 
  INTO v_investment_name, v_owner_id
  FROM public.investment_assets ia 
  WHERE ia.id = OLD.investment_id;

  -- Se o próprio usuário está saindo, não notificar (outro trigger cuida disso)
  IF OLD.user_id = auth.uid() THEN
    RETURN OLD;
  END IF;

  -- Buscar dados de quem removeu (deve ser o owner)
  SELECT p.name, p.email 
  INTO v_remover_name, v_remover_email
  FROM public.profiles p
  WHERE p.id = v_owner_id;

  -- Notificar o usuário removido
  PERFORM public.create_notification(
    OLD.user_id,
    'system',
    format('O acesso ao investimento "%s" foi revogado por %s (%s)', 
      v_investment_name,
      COALESCE(v_remover_name, 'Sem nome'),
      COALESCE(v_remover_email, 'sem email')
    ),
    jsonb_build_object(
      'investment_id', OLD.investment_id,
      'investment_name', v_investment_name,
      'removed_by', v_owner_id
    )
  );

  RETURN OLD;
END;
$$;

CREATE TRIGGER notify_removed_from_investment
  BEFORE DELETE ON public.investment_members
  FOR EACH ROW
  EXECUTE FUNCTION public.tr_notify_removed_from_investment();

-- 4. REMOÇÃO DE CONTA PELO DONO (nova)
CREATE OR REPLACE FUNCTION public.tr_notify_removed_from_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_name text;
  v_owner_id uuid;
  v_remover_name text;
  v_remover_email text;
BEGIN
  -- Buscar owner da conta
  SELECT a.name, a.owner_id 
  INTO v_account_name, v_owner_id
  FROM public.accounts a 
  WHERE a.id = OLD.account_id;

  -- Se o próprio usuário está saindo, não notificar (outro trigger cuida disso)
  IF OLD.user_id = auth.uid() THEN
    RETURN OLD;
  END IF;

  -- Buscar dados de quem removeu (deve ser o owner)
  SELECT p.name, p.email 
  INTO v_remover_name, v_remover_email
  FROM public.profiles p
  WHERE p.id = v_owner_id;

  -- Notificar o usuário removido
  PERFORM public.create_notification(
    OLD.user_id,
    'system',
    format('O acesso à conta "%s" foi revogado por %s (%s)', 
      v_account_name,
      COALESCE(v_remover_name, 'Sem nome'),
      COALESCE(v_remover_email, 'sem email')
    ),
    jsonb_build_object(
      'account_id', OLD.account_id,
      'account_name', v_account_name,
      'removed_by', v_owner_id
    )
  );

  RETURN OLD;
END;
$$;

CREATE TRIGGER notify_removed_from_account
  BEFORE DELETE ON public.account_members
  FOR EACH ROW
  EXECUTE FUNCTION public.tr_notify_removed_from_account();

-- 5. SAÍDA DE INVESTIMENTO POR ESCOLHA PRÓPRIA (atualizar mensagem)
CREATE OR REPLACE FUNCTION public.tr_notify_owner_on_member_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_investment_name text;
  v_owner_id uuid;
  v_leaving_user_name text;
  v_leaving_user_email text;
BEGIN
  -- Só notifica se o próprio usuário está saindo
  IF OLD.user_id != auth.uid() THEN
    RETURN OLD;
  END IF;

  SELECT ia.name, ia.owner_id 
  INTO v_investment_name, v_owner_id
  FROM public.investment_assets ia 
  WHERE ia.id = OLD.investment_id;

  SELECT p.name, p.email 
  INTO v_leaving_user_name, v_leaving_user_email
  FROM public.profiles p
  WHERE p.id = OLD.user_id;

  PERFORM public.create_notification(
    v_owner_id,
    'system',
    format('O usuário %s (%s) saiu do investimento "%s" compartilhado', 
      COALESCE(v_leaving_user_name, 'Sem nome'),
      COALESCE(v_leaving_user_email, 'sem email'),
      v_investment_name
    ),
    jsonb_build_object(
      'investment_id', OLD.investment_id,
      'investment_name', v_investment_name,
      'user_id', OLD.user_id,
      'user_name', v_leaving_user_name,
      'user_email', v_leaving_user_email
    )
  );

  RETURN OLD;
END;
$$;

CREATE TRIGGER notify_owner_on_member_leave
  BEFORE DELETE ON public.investment_members
  FOR EACH ROW
  EXECUTE FUNCTION public.tr_notify_owner_on_member_leave();

-- 6. SAÍDA DE CONTA POR ESCOLHA PRÓPRIA (atualizar mensagem)
CREATE OR REPLACE FUNCTION public.tr_notify_account_owner_on_member_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_name text;
  v_owner_id uuid;
  v_leaving_user_name text;
  v_leaving_user_email text;
BEGIN
  -- Só notifica se o próprio usuário está saindo
  IF OLD.user_id != auth.uid() THEN
    RETURN OLD;
  END IF;

  SELECT a.name, a.owner_id 
  INTO v_account_name, v_owner_id
  FROM public.accounts a 
  WHERE a.id = OLD.account_id;

  SELECT p.name, p.email 
  INTO v_leaving_user_name, v_leaving_user_email
  FROM public.profiles p
  WHERE p.id = OLD.user_id;

  PERFORM public.create_notification(
    v_owner_id,
    'system',
    format('O usuário %s (%s) saiu da conta "%s" compartilhada', 
      COALESCE(v_leaving_user_name, 'Sem nome'),
      COALESCE(v_leaving_user_email, 'sem email'),
      v_account_name
    ),
    jsonb_build_object(
      'account_id', OLD.account_id,
      'account_name', v_account_name,
      'user_id', OLD.user_id,
      'user_name', v_leaving_user_name,
      'user_email', v_leaving_user_email
    )
  );

  RETURN OLD;
END;
$$;

CREATE TRIGGER notify_account_owner_on_member_leave
  BEFORE DELETE ON public.account_members
  FOR EACH ROW
  EXECUTE FUNCTION public.tr_notify_account_owner_on_member_leave();

-- 7. MUDANÇA DE PLANO PELO ADMIN (nova)
CREATE OR REPLACE FUNCTION public.tr_notify_plan_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_name text;
BEGIN
  -- Só notifica se o plano mudou e não foi o próprio usuário
  IF (NEW.plan IS DISTINCT FROM OLD.plan) AND (NEW.user_id != auth.uid()) THEN
    v_plan_name := CASE 
      WHEN NEW.plan = 'free' THEN 'Free'
      WHEN NEW.plan = 'plus' THEN 'Plus'
      WHEN NEW.plan = 'pro' THEN 'Pro'
      ELSE UPPER(NEW.plan::text)
    END;

    PERFORM public.create_notification(
      NEW.user_id,
      'system',
      format('Sua conta foi promovida a %s pelo administrador', v_plan_name),
      jsonb_build_object(
        'old_plan', OLD.plan,
        'new_plan', NEW.plan
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_plan_change
  AFTER UPDATE OF plan ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.tr_notify_plan_change();