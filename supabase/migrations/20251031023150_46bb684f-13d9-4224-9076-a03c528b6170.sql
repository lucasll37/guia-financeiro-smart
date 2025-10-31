-- Triggers para logar ações de contas
DROP TRIGGER IF EXISTS log_account_update ON public.accounts;
CREATE OR REPLACE FUNCTION public.tr_log_account_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_user_action(
    NEW.owner_id,
    'update_account',
    'account',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_account_update
AFTER UPDATE ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_account_update();

DROP TRIGGER IF EXISTS log_account_deletion ON public.accounts;
CREATE OR REPLACE FUNCTION public.tr_log_account_deletion()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_user_action(
    OLD.owner_id,
    'delete_account',
    'account',
    OLD.id
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_account_deletion
AFTER UPDATE OF deleted_at ON public.accounts
FOR EACH ROW
WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
EXECUTE FUNCTION public.tr_log_account_deletion();

-- Triggers para logar ações de membros de contas
DROP TRIGGER IF EXISTS log_account_member_creation ON public.account_members;
CREATE OR REPLACE FUNCTION public.tr_log_account_member_creation()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_user_action(
    NEW.invited_by,
    'share_account',
    'account_member',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_account_member_creation
AFTER INSERT ON public.account_members
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_account_member_creation();

DROP TRIGGER IF EXISTS log_account_member_update ON public.account_members;
CREATE OR REPLACE FUNCTION public.tr_log_account_member_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_user_action(
    NEW.user_id,
    'update_account_share',
    'account_member',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_account_member_update
AFTER UPDATE ON public.account_members
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_account_member_update();

DROP TRIGGER IF EXISTS log_account_member_deletion ON public.account_members;
CREATE OR REPLACE FUNCTION public.tr_log_account_member_deletion()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_user_action(
    OLD.user_id,
    'remove_account_share',
    'account_member',
    OLD.id
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_account_member_deletion
AFTER DELETE ON public.account_members
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_account_member_deletion();

-- Triggers para logar ações de previsões
DROP TRIGGER IF EXISTS log_forecast_creation ON public.account_period_forecasts;
CREATE OR REPLACE FUNCTION public.tr_log_forecast_creation()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_user_action(
    (SELECT owner_id FROM public.accounts WHERE id = NEW.account_id),
    'create_forecast',
    'forecast',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_forecast_creation
AFTER INSERT ON public.account_period_forecasts
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_forecast_creation();

DROP TRIGGER IF EXISTS log_forecast_update ON public.account_period_forecasts;
CREATE OR REPLACE FUNCTION public.tr_log_forecast_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_user_action(
    (SELECT owner_id FROM public.accounts WHERE id = NEW.account_id),
    'update_forecast',
    'forecast',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_forecast_update
AFTER UPDATE ON public.account_period_forecasts
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_forecast_update();

DROP TRIGGER IF EXISTS log_forecast_deletion ON public.account_period_forecasts;
CREATE OR REPLACE FUNCTION public.tr_log_forecast_deletion()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_user_action(
    (SELECT owner_id FROM public.accounts WHERE id = OLD.account_id),
    'delete_forecast',
    'forecast',
    OLD.id
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_forecast_deletion
AFTER DELETE ON public.account_period_forecasts
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_forecast_deletion();

-- Triggers para logar ações de investimentos
DROP TRIGGER IF EXISTS log_investment_update ON public.investment_assets;
CREATE OR REPLACE FUNCTION public.tr_log_investment_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_user_action(
    NEW.owner_id,
    'update_investment',
    'investment',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_investment_update
AFTER UPDATE ON public.investment_assets
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_investment_update();

DROP TRIGGER IF EXISTS log_investment_deletion ON public.investment_assets;
CREATE OR REPLACE FUNCTION public.tr_log_investment_deletion()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_user_action(
    OLD.owner_id,
    'delete_investment',
    'investment',
    OLD.id
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_investment_deletion
AFTER DELETE ON public.investment_assets
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_investment_deletion();

-- Triggers para logar ações de membros de investimentos
DROP TRIGGER IF EXISTS log_investment_member_creation ON public.investment_members;
CREATE OR REPLACE FUNCTION public.tr_log_investment_member_creation()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_user_action(
    NEW.invited_by,
    'share_investment',
    'investment_member',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_investment_member_creation
AFTER INSERT ON public.investment_members
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_investment_member_creation();

DROP TRIGGER IF EXISTS log_investment_member_update ON public.investment_members;
CREATE OR REPLACE FUNCTION public.tr_log_investment_member_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_user_action(
    NEW.user_id,
    'update_investment_share',
    'investment_member',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_investment_member_update
AFTER UPDATE ON public.investment_members
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_investment_member_update();

DROP TRIGGER IF EXISTS log_investment_member_deletion ON public.investment_members;
CREATE OR REPLACE FUNCTION public.tr_log_investment_member_deletion()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_user_action(
    OLD.user_id,
    'remove_investment_share',
    'investment_member',
    OLD.id
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_investment_member_deletion
AFTER DELETE ON public.investment_members
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_investment_member_deletion();

-- Triggers para logar ações de metas
DROP TRIGGER IF EXISTS log_goal_update ON public.goals;
CREATE OR REPLACE FUNCTION public.tr_log_goal_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_user_action(
    NEW.user_id,
    'update_goal',
    'goal',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_goal_update
AFTER UPDATE ON public.goals
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_goal_update();

DROP TRIGGER IF EXISTS log_goal_deletion ON public.goals;
CREATE OR REPLACE FUNCTION public.tr_log_goal_deletion()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_user_action(
    OLD.user_id,
    'delete_goal',
    'goal',
    OLD.id
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_goal_deletion
AFTER DELETE ON public.goals
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_goal_deletion();

-- Triggers para logar ações de cartões de crédito
DROP TRIGGER IF EXISTS log_credit_card_update ON public.credit_cards;
CREATE OR REPLACE FUNCTION public.tr_log_credit_card_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_user_action(
    (SELECT owner_id FROM public.accounts WHERE id = NEW.account_id),
    'update_credit_card',
    'credit_card',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_credit_card_update
AFTER UPDATE ON public.credit_cards
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_credit_card_update();

DROP TRIGGER IF EXISTS log_credit_card_deletion ON public.credit_cards;
CREATE OR REPLACE FUNCTION public.tr_log_credit_card_deletion()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_user_action(
    (SELECT owner_id FROM public.accounts WHERE id = OLD.account_id),
    'delete_credit_card',
    'credit_card',
    OLD.id
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_credit_card_deletion
AFTER DELETE ON public.credit_cards
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_credit_card_deletion();

-- Triggers para logar ações de retornos mensais de investimentos
DROP TRIGGER IF EXISTS log_monthly_return_creation ON public.investment_monthly_returns;
CREATE OR REPLACE FUNCTION public.tr_log_monthly_return_creation()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_user_action(
    (SELECT owner_id FROM public.investment_assets WHERE id = NEW.investment_id),
    'create_monthly_return',
    'monthly_return',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_monthly_return_creation
AFTER INSERT ON public.investment_monthly_returns
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_monthly_return_creation();

DROP TRIGGER IF EXISTS log_monthly_return_update ON public.investment_monthly_returns;
CREATE OR REPLACE FUNCTION public.tr_log_monthly_return_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_user_action(
    (SELECT owner_id FROM public.investment_assets WHERE id = NEW.investment_id),
    'update_monthly_return',
    'monthly_return',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_monthly_return_update
AFTER UPDATE ON public.investment_monthly_returns
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_monthly_return_update();

DROP TRIGGER IF EXISTS log_monthly_return_deletion ON public.investment_monthly_returns;
CREATE OR REPLACE FUNCTION public.tr_log_monthly_return_deletion()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_user_action(
    (SELECT owner_id FROM public.investment_assets WHERE id = OLD.investment_id),
    'delete_monthly_return',
    'monthly_return',
    OLD.id
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_monthly_return_deletion
AFTER DELETE ON public.investment_monthly_returns
FOR EACH ROW
EXECUTE FUNCTION public.tr_log_monthly_return_deletion();