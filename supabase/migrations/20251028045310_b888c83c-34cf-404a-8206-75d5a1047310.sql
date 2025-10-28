-- Adicionar novos campos de controle à tabela plan_limits
ALTER TABLE public.plan_limits 
ADD COLUMN can_edit_categories boolean NOT NULL DEFAULT true,
ADD COLUMN can_generate_reports boolean NOT NULL DEFAULT true;

-- Remover o plano 'plus' da tabela plan_limits
DELETE FROM public.plan_limits WHERE plan = 'plus';

-- Atualizar os limites dos planos existentes
UPDATE public.plan_limits 
SET can_edit_categories = false, can_generate_reports = false
WHERE plan = 'free';

UPDATE public.plan_limits 
SET can_edit_categories = true, can_generate_reports = true
WHERE plan = 'pro';