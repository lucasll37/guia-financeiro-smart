-- Add owner_id to investment_assets (make account_id optional)
ALTER TABLE public.investment_assets 
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
  ALTER COLUMN account_id DROP NOT NULL;

-- Update existing investments to set owner_id from account owner
UPDATE public.investment_assets ia
SET owner_id = a.owner_id
FROM public.accounts a
WHERE ia.account_id = a.id AND ia.owner_id IS NULL;

-- Make owner_id NOT NULL after setting values
ALTER TABLE public.investment_assets 
  ALTER COLUMN owner_id SET NOT NULL;

-- Create investment_members table (similar to account_members)
CREATE TABLE IF NOT EXISTS public.investment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_id UUID NOT NULL REFERENCES public.investment_assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  role VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(investment_id, user_id)
);

-- Enable RLS on investment_members
ALTER TABLE public.investment_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for investment_members
CREATE POLICY "Investment owners can manage members"
ON public.investment_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.investment_assets 
    WHERE id = investment_members.investment_id 
    AND owner_id = auth.uid()
  )
);

CREATE POLICY "Users can view their investment memberships"
ON public.investment_members
FOR SELECT
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.investment_assets 
    WHERE id = investment_members.investment_id 
    AND owner_id = auth.uid()
  )
);

-- Create helper function to check investment access
CREATE OR REPLACE FUNCTION public.user_has_investment_access(investment_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.investment_assets WHERE id = investment_uuid AND owner_id = user_uuid
    UNION
    SELECT 1 FROM public.investment_members 
    WHERE investment_id = investment_uuid AND user_id = user_uuid AND status = 'accepted'
  );
END;
$$;

-- Drop old RLS policies for investment_assets
DROP POLICY IF EXISTS "Users can manage investments in their accounts" ON public.investment_assets;
DROP POLICY IF EXISTS "Users can view investments of their accounts" ON public.investment_assets;

-- Create new RLS policies for investment_assets
CREATE POLICY "Users can create their own investments"
ON public.investment_assets
FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Investment owners can update their investments"
ON public.investment_assets
FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Investment owners can delete their investments"
ON public.investment_assets
FOR DELETE
USING (owner_id = auth.uid());

CREATE POLICY "Users can view investments they own or have access to"
ON public.investment_assets
FOR SELECT
USING (
  owner_id = auth.uid() OR 
  user_has_investment_access(id, auth.uid())
);

-- Update RLS policies for investment_monthly_returns
DROP POLICY IF EXISTS "Users can manage returns of their investments" ON public.investment_monthly_returns;
DROP POLICY IF EXISTS "Users can view returns of their investments" ON public.investment_monthly_returns;

CREATE POLICY "Users can manage returns of accessible investments"
ON public.investment_monthly_returns
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.investment_assets ia
    WHERE ia.id = investment_monthly_returns.investment_id 
    AND (ia.owner_id = auth.uid() OR user_has_investment_access(ia.id, auth.uid()))
  )
);

CREATE POLICY "Users can view returns of accessible investments"
ON public.investment_monthly_returns
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.investment_assets ia
    WHERE ia.id = investment_monthly_returns.investment_id 
    AND (ia.owner_id = auth.uid() OR user_has_investment_access(ia.id, auth.uid()))
  )
);

-- Add trigger to notify invited users
CREATE OR REPLACE FUNCTION public.tr_notify_investment_invited_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_investment_name text;
BEGIN
  -- Get investment name
  SELECT ia.name INTO v_investment_name 
  FROM public.investment_assets ia 
  WHERE ia.id = NEW.investment_id;

  -- Create notification
  PERFORM public.create_notification(
    NEW.user_id,
    'invite',
    COALESCE(format('Você foi convidado para o investimento "%s"', v_investment_name), 'Você foi convidado para um investimento'),
    jsonb_build_object(
      'investment_id', NEW.investment_id,
      'investment_name', v_investment_name,
      'invite_id', NEW.id,
      'invited_by', NEW.invited_by
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_investment_invited_user
  AFTER INSERT ON public.investment_members
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.tr_notify_investment_invited_user();

-- Add trigger to notify inviter on response
CREATE OR REPLACE FUNCTION public.tr_notify_investment_inviter_on_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_investment_name text;
BEGIN
  -- Only act when status changes
  IF (NEW.status IS DISTINCT FROM OLD.status) THEN
    SELECT ia.name INTO v_investment_name 
    FROM public.investment_assets ia 
    WHERE ia.id = NEW.investment_id;

    PERFORM public.create_notification(
      NEW.invited_by,
      'invite',
      CASE WHEN NEW.status = 'accepted' THEN
        COALESCE(format('Seu convite para "%s" foi aceito', v_investment_name), 'Seu convite foi aceito')
      ELSE
        COALESCE(format('Seu convite para "%s" foi recusado', v_investment_name), 'Seu convite foi recusado')
      END,
      jsonb_build_object(
        'investment_id', NEW.investment_id,
        'investment_name', v_investment_name,
        'responded_by', NEW.user_id,
        'status', NEW.status
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_investment_inviter_on_response
  AFTER UPDATE ON public.investment_members
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION public.tr_notify_investment_inviter_on_response();