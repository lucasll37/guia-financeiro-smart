-- Create trigger to notify user when invited to an investment
CREATE TRIGGER tr_notify_investment_invited_user_trigger
  AFTER INSERT ON public.investment_members
  FOR EACH ROW
  EXECUTE FUNCTION public.tr_notify_investment_invited_user();

-- Create trigger to notify inviter when user responds to investment invitation
CREATE TRIGGER tr_notify_investment_inviter_on_response_trigger
  AFTER UPDATE ON public.investment_members
  FOR EACH ROW
  EXECUTE FUNCTION public.tr_notify_investment_inviter_on_response();