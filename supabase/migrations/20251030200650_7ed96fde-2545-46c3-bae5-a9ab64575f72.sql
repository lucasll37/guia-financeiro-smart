-- Atualizar função para incluir categorias de despesas em contas tipo casa
CREATE OR REPLACE FUNCTION public.seed_regular_account_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receita_id uuid;
  v_alimentacao_id uuid;
  v_moradia_id uuid;
  v_educacao_id uuid;
  v_animal_id uuid;
  v_saude_id uuid;
  v_transporte_id uuid;
  v_pessoais_id uuid;
  v_lazer_id uuid;
  v_financeiros_id uuid;
BEGIN
  -- Processar contas tipo pessoal, conjugal, mesada E casa
  IF NEW.type NOT IN ('pessoal', 'conjugal', 'mesada', 'casa') THEN
    RETURN NEW;
  END IF;
  
  -- Para contas tipo casa, só criar categorias de despesas (Receita é criada por outro trigger)
  -- Para outros tipos, criar também Receita
  IF NEW.type != 'casa' THEN
    -- RECEITA (apenas para contas não-casa)
    INSERT INTO categories (account_id, name, type, color, parent_id)
    VALUES (NEW.id, 'Receita', 'receita', '#10b981', NULL)
    RETURNING id INTO v_receita_id;
    
    INSERT INTO categories (account_id, name, type, color, parent_id)
    VALUES 
      (NEW.id, 'Salário  / Adiantamento', 'receita', '#10b981', v_receita_id),
      (NEW.id, 'Férias', 'receita', '#10b981', v_receita_id),
      (NEW.id, '13º salário', 'receita', '#10b981', v_receita_id),
      (NEW.id, 'Aposentadoria', 'receita', '#10b981', v_receita_id),
      (NEW.id, 'Receita extra (aluguel, restituição IR)', 'receita', '#10b981', v_receita_id),
      (NEW.id, 'Outras Receitas', 'receita', '#10b981', v_receita_id);
  END IF;
  
  -- ALIMENTAÇÃO
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES (NEW.id, 'Alimentação', 'despesa', '#22c55e', NULL)
  RETURNING id INTO v_alimentacao_id;
  
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES 
    (NEW.id, 'Supermercado', 'despesa', '#22c55e', v_alimentacao_id),
    (NEW.id, 'Feira  / Sacolão', 'despesa', '#22c55e', v_alimentacao_id),
    (NEW.id, 'Padaria', 'despesa', '#22c55e', v_alimentacao_id),
    (NEW.id, 'Refeição fora de casa', 'despesa', '#22c55e', v_alimentacao_id),
    (NEW.id, 'Outros (café, água, sorvetes, etc)', 'despesa', '#22c55e', v_alimentacao_id);
  
  -- MORADIA
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES (NEW.id, 'Moradia', 'despesa', '#f59e0b', NULL)
  RETURNING id INTO v_moradia_id;
  
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES 
    (NEW.id, 'Prestação /Aluguel de imóvel', 'despesa', '#f59e0b', v_moradia_id),
    (NEW.id, 'Condomínio', 'despesa', '#f59e0b', v_moradia_id),
    (NEW.id, 'Consumo de água', 'despesa', '#f59e0b', v_moradia_id),
    (NEW.id, 'Serviço de limpeza( diarista ou mensalista)', 'despesa', '#f59e0b', v_moradia_id),
    (NEW.id, 'Energia Elétrica', 'despesa', '#f59e0b', v_moradia_id),
    (NEW.id, 'Gás', 'despesa', '#f59e0b', v_moradia_id),
    (NEW.id, 'IPTU', 'despesa', '#f59e0b', v_moradia_id),
    (NEW.id, 'Decoração da casa', 'despesa', '#f59e0b', v_moradia_id),
    (NEW.id, 'Manutenção / Reforma da casa', 'despesa', '#f59e0b', v_moradia_id),
    (NEW.id, 'Celular', 'despesa', '#f59e0b', v_moradia_id),
    (NEW.id, 'Telefone fixo', 'despesa', '#f59e0b', v_moradia_id),
    (NEW.id, 'Internet / TV a cabo', 'despesa', '#f59e0b', v_moradia_id);
  
  -- EDUCAÇÃO
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES (NEW.id, 'Educação', 'despesa', '#8b5cf6', NULL)
  RETURNING id INTO v_educacao_id;
  
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES 
    (NEW.id, 'Matricula Escolar/ Mensalidade', 'despesa', '#8b5cf6', v_educacao_id),
    (NEW.id, 'Material Escolar', 'despesa', '#8b5cf6', v_educacao_id),
    (NEW.id, 'Outros cursos', 'despesa', '#8b5cf6', v_educacao_id),
    (NEW.id, 'Transporte escolar', 'despesa', '#8b5cf6', v_educacao_id);
  
  -- ANIMAL DE ESTIMAÇÃO
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES (NEW.id, 'Animal de Estimação', 'despesa', '#ec4899', NULL)
  RETURNING id INTO v_animal_id;
  
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES 
    (NEW.id, 'Ração', 'despesa', '#ec4899', v_animal_id),
    (NEW.id, 'Banho / Tosa', 'despesa', '#ec4899', v_animal_id),
    (NEW.id, 'Veterinário / medicamento', 'despesa', '#ec4899', v_animal_id),
    (NEW.id, 'Outros (acessórios, brinquedos, hotel, dog walker)', 'despesa', '#ec4899', v_animal_id);
  
  -- SAÚDE
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES (NEW.id, 'Saúde', 'despesa', '#14b8a6', NULL)
  RETURNING id INTO v_saude_id;
  
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES 
    (NEW.id, 'Plano de saúde', 'despesa', '#14b8a6', v_saude_id),
    (NEW.id, 'Medicamentos', 'despesa', '#14b8a6', v_saude_id),
    (NEW.id, 'Dentista', 'despesa', '#14b8a6', v_saude_id),
    (NEW.id, 'Terapia / Psicólogo  / Acupuntura', 'despesa', '#14b8a6', v_saude_id),
    (NEW.id, 'Médicos/Exames fora do plano de saúde', 'despesa', '#14b8a6', v_saude_id),
    (NEW.id, 'Academia / Tratamento Estético', 'despesa', '#14b8a6', v_saude_id);
  
  -- TRANSPORTE
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES (NEW.id, 'Transporte', 'despesa', '#3b82f6', NULL)
  RETURNING id INTO v_transporte_id;
  
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES 
    (NEW.id, 'Ônibus / Metrô', 'despesa', '#3b82f6', v_transporte_id),
    (NEW.id, 'Taxi', 'despesa', '#3b82f6', v_transporte_id),
    (NEW.id, 'Combustível', 'despesa', '#3b82f6', v_transporte_id),
    (NEW.id, 'Estacionamento', 'despesa', '#3b82f6', v_transporte_id),
    (NEW.id, 'Seguro Auto', 'despesa', '#3b82f6', v_transporte_id),
    (NEW.id, 'Manutenção / Lavagem / Troca de óleo', 'despesa', '#3b82f6', v_transporte_id),
    (NEW.id, 'Licenciamento', 'despesa', '#3b82f6', v_transporte_id),
    (NEW.id, 'Pedágio', 'despesa', '#3b82f6', v_transporte_id),
    (NEW.id, 'IPVA', 'despesa', '#3b82f6', v_transporte_id);
  
  -- PESSOAIS
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES (NEW.id, 'Pessoais', 'despesa', '#06b6d4', NULL)
  RETURNING id INTO v_pessoais_id;
  
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES 
    (NEW.id, 'Vestuário / Calçados / Acessórios', 'despesa', '#06b6d4', v_pessoais_id),
    (NEW.id, 'Cabeleireiro / Manicure / Higiene pessoal', 'despesa', '#06b6d4', v_pessoais_id),
    (NEW.id, 'Presentes', 'despesa', '#06b6d4', v_pessoais_id),
    (NEW.id, 'Outros', 'despesa', '#06b6d4', v_pessoais_id);
  
  -- LAZER
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES (NEW.id, 'Lazer', 'despesa', '#f43f5e', NULL)
  RETURNING id INTO v_lazer_id;
  
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES 
    (NEW.id, 'Cinema / Teatro / Shows', 'despesa', '#f43f5e', v_lazer_id),
    (NEW.id, 'Livros / Revistas / Cd´s', 'despesa', '#f43f5e', v_lazer_id),
    (NEW.id, 'Clube / Parques / Casa Noturna', 'despesa', '#f43f5e', v_lazer_id),
    (NEW.id, 'Viagens', 'despesa', '#f43f5e', v_lazer_id),
    (NEW.id, 'Restaurantes / Bares / Festas', 'despesa', '#f43f5e', v_lazer_id);
  
  -- SERVIÇOS FINANCEIROS
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES (NEW.id, 'Serviços Financeiros', 'despesa', '#6366f1', NULL)
  RETURNING id INTO v_financeiros_id;
  
  INSERT INTO categories (account_id, name, type, color, parent_id)
  VALUES 
    (NEW.id, 'Empréstimos', 'despesa', '#6366f1', v_financeiros_id),
    (NEW.id, 'Seguros (vida/residencial)', 'despesa', '#6366f1', v_financeiros_id),
    (NEW.id, 'Previdência privada', 'despesa', '#6366f1', v_financeiros_id),
    (NEW.id, 'Juros Cheque Especial', 'despesa', '#6366f1', v_financeiros_id),
    (NEW.id, 'Tarifas bancárias', 'despesa', '#6366f1', v_financeiros_id),
    (NEW.id, 'Financiamento de veículo', 'despesa', '#6366f1', v_financeiros_id),
    (NEW.id, 'Imposto de Renda a Pagar', 'despesa', '#6366f1', v_financeiros_id);
  
  RETURN NEW;
END;
$$;