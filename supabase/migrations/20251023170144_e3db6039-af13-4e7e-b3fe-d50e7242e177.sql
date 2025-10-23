-- Fix search_path for validate_split_percentages function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;