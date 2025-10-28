-- Criar função para validar se a categoria é uma subcategoria
CREATE OR REPLACE FUNCTION validate_subcategory()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Adicionar trigger para validar categoria em transactions
DROP TRIGGER IF EXISTS validate_transaction_subcategory ON transactions;
CREATE TRIGGER validate_transaction_subcategory
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_subcategory();

-- Adicionar trigger para validar categoria em account_period_forecasts
DROP TRIGGER IF EXISTS validate_forecast_subcategory ON account_period_forecasts;
CREATE TRIGGER validate_forecast_subcategory
  BEFORE INSERT OR UPDATE ON account_period_forecasts
  FOR EACH ROW
  EXECUTE FUNCTION validate_subcategory();