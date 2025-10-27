-- Create coupons table for promotional codes
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Admins can manage coupons (for now, everyone can - will be restricted later)
CREATE POLICY "Anyone can view coupons"
  ON public.coupons FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create coupons"
  ON public.coupons FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update coupons"
  ON public.coupons FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete coupons"
  ON public.coupons FOR DELETE
  USING (true);

-- Create index for better performance
CREATE INDEX idx_coupons_code ON public.coupons(code);
CREATE INDEX idx_coupons_valid_until ON public.coupons(valid_until);
CREATE INDEX idx_coupons_active ON public.coupons(active);