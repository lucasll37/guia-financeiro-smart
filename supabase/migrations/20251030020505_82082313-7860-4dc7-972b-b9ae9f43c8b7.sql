
-- Remove duplicate trigger on investment_members
-- There are two triggers calling the same function on INSERT
DROP TRIGGER IF EXISTS notify_investment_invited_user ON public.investment_members;

-- Remove the update_invite_notification_status trigger from investment_members
-- This trigger doesn't make sense for investments because members are accepted directly
DROP TRIGGER IF EXISTS tr_update_investment_invite_notification ON public.investment_members;

-- Consolidate updated_at functions - keep handle_updated_at and drop update_updated_at_column
-- First, update triggers that use update_updated_at_column to use handle_updated_at instead

-- Update account_period_forecasts trigger
DROP TRIGGER IF EXISTS update_account_period_forecasts_updated_at ON public.account_period_forecasts;
CREATE TRIGGER update_account_period_forecasts_updated_at
  BEFORE UPDATE ON public.account_period_forecasts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Update feedback trigger  
DROP TRIGGER IF EXISTS update_feedback_updated_at ON public.feedback;
CREATE TRIGGER update_feedback_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Update plan_limits trigger
DROP TRIGGER IF EXISTS update_plan_limits_updated_at ON public.plan_limits;
CREATE TRIGGER update_plan_limits_updated_at
  BEFORE UPDATE ON public.plan_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Now drop the duplicate function
DROP FUNCTION IF EXISTS public.update_updated_at_column();
