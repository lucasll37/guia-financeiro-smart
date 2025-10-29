-- Add ON DELETE CASCADE to parent_id foreign key in categories table
-- First, we need to drop the existing foreign key constraint if it exists
ALTER TABLE public.categories 
DROP CONSTRAINT IF EXISTS categories_parent_id_fkey;

-- Now add the foreign key with CASCADE
ALTER TABLE public.categories 
ADD CONSTRAINT categories_parent_id_fkey 
FOREIGN KEY (parent_id) 
REFERENCES public.categories(id) 
ON DELETE CASCADE;