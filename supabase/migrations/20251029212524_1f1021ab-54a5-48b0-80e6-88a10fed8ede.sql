-- Create triggers for account and investment invite notifications

-- Accounts: invite created
DROP TRIGGER IF EXISTS tr_after_insert_account_members_notify ON public.account_members;
CREATE TRIGGER tr_after_insert_account_members_notify
AFTER INSERT ON public.account_members
FOR EACH ROW
EXECUTE FUNCTION public.tr_notify_invited_user();

-- Accounts: invite responded (accepted/declined)
DROP TRIGGER IF EXISTS tr_after_update_account_members_notify ON public.account_members;
CREATE TRIGGER tr_after_update_account_members_notify
AFTER UPDATE ON public.account_members
FOR EACH ROW
EXECUTE FUNCTION public.tr_notify_inviter_on_response();

-- Investments: invite created
DROP TRIGGER IF EXISTS tr_after_insert_investment_members_notify ON public.investment_members;
CREATE TRIGGER tr_after_insert_investment_members_notify
AFTER INSERT ON public.investment_members
FOR EACH ROW
EXECUTE FUNCTION public.tr_notify_investment_invited_user();

-- Investments: invite responded (accepted/declined)
DROP TRIGGER IF EXISTS tr_after_update_investment_members_notify ON public.investment_members;
CREATE TRIGGER tr_after_update_investment_members_notify
AFTER UPDATE ON public.investment_members
FOR EACH ROW
EXECUTE FUNCTION public.tr_notify_investment_inviter_on_response();