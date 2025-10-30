-- Add constraint to ensure conjugal, mesada, and casa accounts are always shared
ALTER TABLE public.accounts
ADD CONSTRAINT check_shared_account_types 
CHECK (
  (type NOT IN ('conjugal', 'mesada', 'casa')) OR 
  (type IN ('conjugal', 'mesada', 'casa') AND is_shared = true)
);