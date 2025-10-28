-- Recriar função validate_subcategory com search_path definido para evitar vulnerabilidades de segurança
CREATE OR REPLACE FUNCTION validate_subcategory()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifica se a categoria tem um parent_id (é subcategoria)
  IF NOT EXISTS (
    SELECT 1 FROM categories 
    WHERE id = NEW.category_id AND parent_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Apenas subcategorias podem ser usadas. Selecione uma subcategoria, não uma categoria principal.';
  END IF;
  
  RETURN NEW;
END;
$$;