-- Criar tabela de logs de ações de usuários
CREATE TABLE IF NOT EXISTS public.user_action_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX idx_user_action_logs_user_id ON public.user_action_logs(user_id);
CREATE INDEX idx_user_action_logs_created_at ON public.user_action_logs(created_at);
CREATE INDEX idx_user_action_logs_action ON public.user_action_logs(action);

-- Enable RLS
ALTER TABLE public.user_action_logs ENABLE ROW LEVEL SECURITY;

-- Política para admins visualizarem todos os logs
CREATE POLICY "Admins can view all action logs"
  ON public.user_action_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Política para sistema inserir logs
CREATE POLICY "System can insert action logs"
  ON public.user_action_logs
  FOR INSERT
  WITH CHECK (true);

-- Função para limpar logs com mais de 7 dias
CREATE OR REPLACE FUNCTION public.cleanup_old_action_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_action_logs
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Função auxiliar para registrar ações
CREATE OR REPLACE FUNCTION public.log_user_action(
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_action_logs (user_id, action, entity_type, entity_id)
  VALUES (p_user_id, p_action, p_entity_type, p_entity_id);
END;
$$;

-- Trigger para logar criação de contas
CREATE OR REPLACE FUNCTION public.tr_log_account_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_user_action(
    NEW.owner_id,
    'create_account',
    'account',
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_account_creation
AFTER INSERT ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_account_creation();

-- Trigger para logar criação de transações
CREATE OR REPLACE FUNCTION public.tr_log_transaction_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_user_action(
    NEW.created_by,
    'create_transaction',
    'transaction',
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_transaction_creation
AFTER INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_transaction_creation();

-- Trigger para logar atualização de transações
CREATE OR REPLACE FUNCTION public.tr_log_transaction_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_user_action(
    NEW.created_by,
    'update_transaction',
    'transaction',
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_transaction_update
AFTER UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_transaction_update();

-- Trigger para logar exclusão de transações
CREATE OR REPLACE FUNCTION public.tr_log_transaction_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_user_action(
    OLD.created_by,
    'delete_transaction',
    'transaction',
    OLD.id
  );
  RETURN OLD;
END;
$$;

CREATE TRIGGER trigger_log_transaction_deletion
BEFORE DELETE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_transaction_deletion();

-- Trigger para logar criação de investimentos
CREATE OR REPLACE FUNCTION public.tr_log_investment_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_user_action(
    NEW.owner_id,
    'create_investment',
    'investment',
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_investment_creation
AFTER INSERT ON public.investment_assets
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_investment_creation();

-- Trigger para logar criação de metas
CREATE OR REPLACE FUNCTION public.tr_log_goal_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_user_action(
    (SELECT owner_id FROM public.accounts WHERE id = NEW.account_id),
    'create_goal',
    'goal',
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_goal_creation
AFTER INSERT ON public.goals
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_goal_creation();

-- Trigger para logar criação de cartões de crédito
CREATE OR REPLACE FUNCTION public.tr_log_credit_card_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_user_action(
    (SELECT owner_id FROM public.accounts WHERE id = NEW.account_id),
    'create_credit_card',
    'credit_card',
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_credit_card_creation
AFTER INSERT ON public.credit_cards
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_credit_card_creation();