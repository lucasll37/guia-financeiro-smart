-- Cleanup duplicate notification triggers that caused duplicate notifications
-- Keep the canonical triggers created earlier (trg_notify_*) with proper WHEN clauses

-- Accounts
DROP TRIGGER IF EXISTS tr_after_insert_account_members_notify ON public.account_members;
DROP TRIGGER IF EXISTS tr_after_update_account_members_notify ON public.account_members;

-- Investments
DROP TRIGGER IF EXISTS tr_after_insert_investment_members_notify ON public.investment_members;
DROP TRIGGER IF EXISTS tr_after_update_investment_members_notify ON public.investment_members;