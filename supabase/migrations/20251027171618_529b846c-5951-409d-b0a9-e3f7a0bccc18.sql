-- Create credit_cards table
CREATE TABLE public.credit_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  closing_day INTEGER NOT NULL CHECK (closing_day >= 1 AND closing_day <= 31),
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  credit_limit NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

-- Create policies for credit_cards
CREATE POLICY "Users can view credit cards of their accounts"
ON public.credit_cards
FOR SELECT
USING (user_has_account_access(account_id, auth.uid()));

CREATE POLICY "Users can create credit cards in their accounts"
ON public.credit_cards
FOR INSERT
WITH CHECK (user_has_account_access(account_id, auth.uid()));

CREATE POLICY "Users can update credit cards in their accounts"
ON public.credit_cards
FOR UPDATE
USING (user_has_account_access(account_id, auth.uid()));

CREATE POLICY "Users can delete credit cards in their accounts"
ON public.credit_cards
FOR DELETE
USING (user_has_account_access(account_id, auth.uid()));

-- Add credit_card_id and payment_month to transactions
ALTER TABLE public.transactions
ADD COLUMN credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
ADD COLUMN payment_month DATE;

-- Add trigger for updated_at
CREATE TRIGGER update_credit_cards_updated_at
BEFORE UPDATE ON public.credit_cards
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create index for performance
CREATE INDEX idx_transactions_credit_card_id ON public.transactions(credit_card_id);
CREATE INDEX idx_transactions_payment_month ON public.transactions(payment_month);