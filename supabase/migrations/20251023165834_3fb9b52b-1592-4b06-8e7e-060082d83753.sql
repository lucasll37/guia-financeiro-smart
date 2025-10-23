-- Enums
CREATE TYPE public.account_type AS ENUM ('pessoal', 'casa', 'empresa', 'conjugal', 'outro');
CREATE TYPE public.account_member_role AS ENUM ('owner', 'editor', 'viewer');
CREATE TYPE public.member_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE public.category_type AS ENUM ('despesa', 'receita');
CREATE TYPE public.investment_type AS ENUM ('renda_fixa', 'fundo', 'acao', 'outro');
CREATE TYPE public.notification_type AS ENUM ('invite', 'transaction', 'goal', 'budget_alert', 'system');
CREATE TYPE public.audit_action AS ENUM ('create', 'update', 'delete');

-- Accounts table
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type account_type NOT NULL DEFAULT 'pessoal',
  currency TEXT NOT NULL DEFAULT 'BRL',
  is_shared BOOLEAN NOT NULL DEFAULT false,
  default_split JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AccountMembers table
CREATE TABLE public.account_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role account_member_role NOT NULL DEFAULT 'viewer',
  invited_by UUID NOT NULL REFERENCES public.profiles(id),
  status member_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(account_id, user_id)
);

-- Categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  type category_type NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  split_override JSONB,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Budgets table
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  amount_planned DECIMAL(15,2) NOT NULL CHECK (amount_planned > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(account_id, category_id, period)
);

-- Goals table
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount DECIMAL(15,2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  deadline DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Investment Assets table
CREATE TABLE public.investment_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type investment_type NOT NULL,
  monthly_rate DECIMAL(10,4) NOT NULL DEFAULT 0,
  fees DECIMAL(10,4) NOT NULL DEFAULT 0,
  balance DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Audit Logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  entity TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action audit_action NOT NULL,
  diff JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_accounts_owner ON public.accounts(owner_id);
CREATE INDEX idx_account_members_account ON public.account_members(account_id);
CREATE INDEX idx_account_members_user ON public.account_members(user_id);
CREATE INDEX idx_categories_account ON public.categories(account_id);
CREATE INDEX idx_transactions_account ON public.transactions(account_id);
CREATE INDEX idx_transactions_date ON public.transactions(date DESC);
CREATE INDEX idx_budgets_account_period ON public.budgets(account_id, period);
CREATE INDEX idx_goals_account ON public.goals(account_id);
CREATE INDEX idx_investments_account ON public.investment_assets(account_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity, entity_id);

-- Trigger for updated_at
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON public.investment_assets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Validation function for split percentages
CREATE OR REPLACE FUNCTION validate_split_percentages()
RETURNS TRIGGER AS $$
DECLARE
  total_percent NUMERIC;
BEGIN
  IF jsonb_array_length(NEW.default_split) > 0 THEN
    SELECT SUM((value->>'percent')::numeric)
    INTO total_percent
    FROM jsonb_array_elements(NEW.default_split);
    
    IF total_percent != 100 THEN
      RAISE EXCEPTION 'A soma dos percentuais deve ser igual a 100%%';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_account_split BEFORE INSERT OR UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION validate_split_percentages();

-- Function to check if user has access to account
CREATE OR REPLACE FUNCTION user_has_account_access(account_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.accounts WHERE id = account_uuid AND owner_id = user_uuid
    UNION
    SELECT 1 FROM public.account_members 
    WHERE account_id = account_uuid AND user_id = user_uuid AND status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for accounts
CREATE POLICY "Users can view their own accounts or accounts they are members of"
  ON public.accounts FOR SELECT
  USING (owner_id = auth.uid() OR user_has_account_access(id, auth.uid()));

CREATE POLICY "Users can create their own accounts"
  ON public.accounts FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Account owners can update their accounts"
  ON public.accounts FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Account owners can delete their accounts"
  ON public.accounts FOR DELETE
  USING (owner_id = auth.uid());

-- RLS Policies for account_members
CREATE POLICY "Users can view memberships of their accounts"
  ON public.account_members FOR SELECT
  USING (user_has_account_access(account_id, auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Account owners can manage members"
  ON public.account_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.accounts WHERE id = account_id AND owner_id = auth.uid()
  ));

-- RLS Policies for categories
CREATE POLICY "Users can view categories of their accounts"
  ON public.categories FOR SELECT
  USING (user_has_account_access(account_id, auth.uid()));

CREATE POLICY "Users can create categories in their accounts"
  ON public.categories FOR INSERT
  WITH CHECK (user_has_account_access(account_id, auth.uid()));

CREATE POLICY "Users can update categories in their accounts"
  ON public.categories FOR UPDATE
  USING (user_has_account_access(account_id, auth.uid()));

CREATE POLICY "Users can delete categories in their accounts"
  ON public.categories FOR DELETE
  USING (user_has_account_access(account_id, auth.uid()));

-- RLS Policies for transactions
CREATE POLICY "Users can view transactions of their accounts"
  ON public.transactions FOR SELECT
  USING (user_has_account_access(account_id, auth.uid()));

CREATE POLICY "Users can create transactions in their accounts"
  ON public.transactions FOR INSERT
  WITH CHECK (user_has_account_access(account_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Users can update transactions they created"
  ON public.transactions FOR UPDATE
  USING (created_by = auth.uid() AND user_has_account_access(account_id, auth.uid()));

CREATE POLICY "Users can delete transactions they created"
  ON public.transactions FOR DELETE
  USING (created_by = auth.uid());

-- RLS Policies for budgets
CREATE POLICY "Users can view budgets of their accounts"
  ON public.budgets FOR SELECT
  USING (user_has_account_access(account_id, auth.uid()));

CREATE POLICY "Users can manage budgets in their accounts"
  ON public.budgets FOR ALL
  USING (user_has_account_access(account_id, auth.uid()));

-- RLS Policies for goals
CREATE POLICY "Users can view goals of their accounts"
  ON public.goals FOR SELECT
  USING (user_has_account_access(account_id, auth.uid()));

CREATE POLICY "Users can manage goals in their accounts"
  ON public.goals FOR ALL
  USING (user_has_account_access(account_id, auth.uid()));

-- RLS Policies for investment_assets
CREATE POLICY "Users can view investments of their accounts"
  ON public.investment_assets FOR SELECT
  USING (user_has_account_access(account_id, auth.uid()));

CREATE POLICY "Users can manage investments in their accounts"
  ON public.investment_assets FOR ALL
  USING (user_has_account_access(account_id, auth.uid()));

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for audit_logs
CREATE POLICY "Users can view audit logs for their accounts"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts 
      WHERE id = entity_id::uuid AND user_has_account_access(id, auth.uid())
    )
  );