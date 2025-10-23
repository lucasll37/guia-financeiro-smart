import { supabase } from "@/integrations/supabase/client";

export async function seedCategories(accountId: string) {
  const categories = [
    // RECEITAS
    { name: "Receita", type: "receita" as const, color: "#10b981", parent_id: null },
    { name: "Salário / Adiantamento", type: "receita" as const, color: "#10b981", parent_id: "Receita" },
    { name: "Férias", type: "receita" as const, color: "#10b981", parent_id: "Receita" },
    { name: "13º salário", type: "receita" as const, color: "#10b981", parent_id: "Receita" },
    { name: "Aposentadoria", type: "receita" as const, color: "#10b981", parent_id: "Receita" },
    { name: "Receita extra (aluguel, restituição IR)", type: "receita" as const, color: "#10b981", parent_id: "Receita" },
    { name: "Outras Receitas", type: "receita" as const, color: "#10b981", parent_id: "Receita" },
    
    // DESPESAS
    // Alimentação
    { name: "Alimentação", type: "despesa" as const, color: "#22c55e", parent_id: null },
    { name: "Supermercado", type: "despesa" as const, color: "#22c55e", parent_id: "Alimentação" },
    { name: "Feira / Sacolão", type: "despesa" as const, color: "#22c55e", parent_id: "Alimentação" },
    { name: "Padaria", type: "despesa" as const, color: "#22c55e", parent_id: "Alimentação" },
    { name: "Refeição fora de casa", type: "despesa" as const, color: "#22c55e", parent_id: "Alimentação" },
    { name: "Outros (café, água, sorvetes, etc)", type: "despesa" as const, color: "#22c55e", parent_id: "Alimentação" },
    
    // Moradia
    { name: "Moradia", type: "despesa" as const, color: "#f59e0b", parent_id: null },
    { name: "Prestação /Aluguel de imóvel", type: "despesa" as const, color: "#f59e0b", parent_id: "Moradia" },
    { name: "Condomínio", type: "despesa" as const, color: "#f59e0b", parent_id: "Moradia" },
    { name: "Consumo de água", type: "despesa" as const, color: "#f59e0b", parent_id: "Moradia" },
    { name: "Serviço de limpeza( diarista ou mensalista)", type: "despesa" as const, color: "#f59e0b", parent_id: "Moradia" },
    { name: "Energia Elétrica", type: "despesa" as const, color: "#f59e0b", parent_id: "Moradia" },
    { name: "Gás", type: "despesa" as const, color: "#f59e0b", parent_id: "Moradia" },
    { name: "IPTU", type: "despesa" as const, color: "#f59e0b", parent_id: "Moradia" },
    { name: "Decoração da casa", type: "despesa" as const, color: "#f59e0b", parent_id: "Moradia" },
    { name: "Manutenção / Reforma da casa", type: "despesa" as const, color: "#f59e0b", parent_id: "Moradia" },
    { name: "Celular", type: "despesa" as const, color: "#f59e0b", parent_id: "Moradia" },
    { name: "Telefone fixo", type: "despesa" as const, color: "#f59e0b", parent_id: "Moradia" },
    { name: "Internet / TV a cabo", type: "despesa" as const, color: "#f59e0b", parent_id: "Moradia" },
    
    // Educação
    { name: "Educação", type: "despesa" as const, color: "#8b5cf6", parent_id: null },
    { name: "Matricula Escolar/ Mensalidade", type: "despesa" as const, color: "#8b5cf6", parent_id: "Educação" },
    { name: "Material Escolar", type: "despesa" as const, color: "#8b5cf6", parent_id: "Educação" },
    { name: "Outros cursos", type: "despesa" as const, color: "#8b5cf6", parent_id: "Educação" },
    { name: "Transporte escolar", type: "despesa" as const, color: "#8b5cf6", parent_id: "Educação" },
    
    // Animal de Estimação
    { name: "Animal de Estimação", type: "despesa" as const, color: "#ec4899", parent_id: null },
    { name: "Ração", type: "despesa" as const, color: "#ec4899", parent_id: "Animal de Estimação" },
    { name: "Banho / Tosa", type: "despesa" as const, color: "#ec4899", parent_id: "Animal de Estimação" },
    { name: "Veterinário / medicamento", type: "despesa" as const, color: "#ec4899", parent_id: "Animal de Estimação" },
    { name: "Outros (acessórios, brinquedos, hotel, dog walker)", type: "despesa" as const, color: "#ec4899", parent_id: "Animal de Estimação" },
    
    // Saúde
    { name: "Saúde", type: "despesa" as const, color: "#14b8a6", parent_id: null },
    { name: "Plano de saúde", type: "despesa" as const, color: "#14b8a6", parent_id: "Saúde" },
    { name: "Medicamentos", type: "despesa" as const, color: "#14b8a6", parent_id: "Saúde" },
    { name: "Dentista", type: "despesa" as const, color: "#14b8a6", parent_id: "Saúde" },
    { name: "Terapia / Psicólogo / Acupuntura", type: "despesa" as const, color: "#14b8a6", parent_id: "Saúde" },
    { name: "Médicos/Exames fora do plano de saúde", type: "despesa" as const, color: "#14b8a6", parent_id: "Saúde" },
    { name: "Academia / Tratamento Estético", type: "despesa" as const, color: "#14b8a6", parent_id: "Saúde" },
    
    // Transporte
    { name: "Transporte", type: "despesa" as const, color: "#3b82f6", parent_id: null },
    { name: "Ônibus / Metrô", type: "despesa" as const, color: "#3b82f6", parent_id: "Transporte" },
    { name: "Taxi", type: "despesa" as const, color: "#3b82f6", parent_id: "Transporte" },
    { name: "Combustível", type: "despesa" as const, color: "#3b82f6", parent_id: "Transporte" },
    { name: "Estacionamento", type: "despesa" as const, color: "#3b82f6", parent_id: "Transporte" },
    { name: "Seguro Auto", type: "despesa" as const, color: "#3b82f6", parent_id: "Transporte" },
    { name: "Manutenção / Lavagem / Troca de óleo", type: "despesa" as const, color: "#3b82f6", parent_id: "Transporte" },
    { name: "Licenciamento", type: "despesa" as const, color: "#3b82f6", parent_id: "Transporte" },
    { name: "Pedágio", type: "despesa" as const, color: "#3b82f6", parent_id: "Transporte" },
    { name: "IPVA", type: "despesa" as const, color: "#3b82f6", parent_id: "Transporte" },
    
    // Pessoais
    { name: "Pessoais", type: "despesa" as const, color: "#06b6d4", parent_id: null },
    { name: "Vestuário / Calçados / Acessórios", type: "despesa" as const, color: "#06b6d4", parent_id: "Pessoais" },
    { name: "Cabeleireiro / Manicure / Higiene pessoal", type: "despesa" as const, color: "#06b6d4", parent_id: "Pessoais" },
    { name: "Presentes", type: "despesa" as const, color: "#06b6d4", parent_id: "Pessoais" },
    { name: "Outros", type: "despesa" as const, color: "#06b6d4", parent_id: "Pessoais" },
    
    // Lazer
    { name: "Lazer", type: "despesa" as const, color: "#f43f5e", parent_id: null },
    { name: "Cinema / Teatro / Shows", type: "despesa" as const, color: "#f43f5e", parent_id: "Lazer" },
    { name: "Livros / Revistas / Cd´s", type: "despesa" as const, color: "#f43f5e", parent_id: "Lazer" },
    { name: "Clube / Parques / Casa Noturna", type: "despesa" as const, color: "#f43f5e", parent_id: "Lazer" },
    { name: "Viagens", type: "despesa" as const, color: "#f43f5e", parent_id: "Lazer" },
    { name: "Restaurantes / Bares / Festas", type: "despesa" as const, color: "#f43f5e", parent_id: "Lazer" },
    
    // Serviços Financeiros
    { name: "Serviços Financeiros", type: "despesa" as const, color: "#6366f1", parent_id: null },
    { name: "Empréstimos", type: "despesa" as const, color: "#6366f1", parent_id: "Serviços Financeiros" },
    { name: "Seguros (vida/residencial)", type: "despesa" as const, color: "#6366f1", parent_id: "Serviços Financeiros" },
    { name: "Previdência privada", type: "despesa" as const, color: "#6366f1", parent_id: "Serviços Financeiros" },
    { name: "Juros Cheque Especial", type: "despesa" as const, color: "#6366f1", parent_id: "Serviços Financeiros" },
    { name: "Tarifas bancárias", type: "despesa" as const, color: "#6366f1", parent_id: "Serviços Financeiros" },
    { name: "Financiamento de veículo", type: "despesa" as const, color: "#6366f1", parent_id: "Serviços Financeiros" },
    { name: "Imposto de Renda a Pagar", type: "despesa" as const, color: "#6366f1", parent_id: "Serviços Financeiros" },
  ];

  // Separar categorias principais e subcategorias
  const parentCategories = categories.filter(cat => cat.parent_id === null);
  const childCategories = categories.filter(cat => cat.parent_id !== null);
  
  // Mapa para armazenar IDs das categorias criadas
  const createdCategories = new Map<string, string>();
  
  // Primeiro: criar todas as categorias principais
  for (const cat of parentCategories) {
    const { data, error } = await supabase
      .from("categories")
      .insert({
        account_id: accountId,
        name: cat.name,
        type: cat.type,
        color: cat.color,
        parent_id: null,
      })
      .select()
      .single();

    if (!error && data) {
      createdCategories.set(cat.name, data.id);
    }
  }

  // Segundo: criar todas as subcategorias com parent_id correto
  for (const cat of childCategories) {
    const parentId = createdCategories.get(cat.parent_id!);
    
    if (parentId) {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          account_id: accountId,
          name: cat.name,
          type: cat.type,
          color: cat.color,
          parent_id: parentId,
        })
        .select()
        .single();

      if (!error && data) {
        createdCategories.set(cat.name, data.id);
      }
    }
  }

  return createdCategories.size;
}
