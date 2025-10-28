import { supabase } from "@/integrations/supabase/client";

export async function seedCategories(accountId: string) {
  console.log("seedCategories chamado para account_id:", accountId);
  
  const categories = [
    // RECEITAS - PRIMEIRA CATEGORIA
    { name: "Receita", type: "receita" as const, color: "#10b981", parent_id: null },
    { name: "Salário  / Adiantamento", type: "receita" as const, color: "#10b981", parent_id: "Receita" },
    { name: "Férias", type: "receita" as const, color: "#10b981", parent_id: "Receita" },
    { name: "13º salário", type: "receita" as const, color: "#10b981", parent_id: "Receita" },
    { name: "Aposentadoria", type: "receita" as const, color: "#10b981", parent_id: "Receita" },
    { name: "Receita extra (aluguel, restituição IR)", type: "receita" as const, color: "#10b981", parent_id: "Receita" },
    { name: "Outras Receitas", type: "receita" as const, color: "#10b981", parent_id: "Receita" },
    
    // DESPESAS
    // Alimentação
    { name: "Alimentação", type: "despesa" as const, color: "#22c55e", parent_id: null },
    { name: "Supermercado", type: "despesa" as const, color: "#22c55e", parent_id: "Alimentação" },
    { name: "Feira  / Sacolão", type: "despesa" as const, color: "#22c55e", parent_id: "Alimentação" },
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
    { name: "Terapia / Psicólogo  / Acupuntura", type: "despesa" as const, color: "#14b8a6", parent_id: "Saúde" },
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

  // Construir mapa de existentes e garantir criação idempotente
  const buildKey = (name: string, parentId: string | null) =>
    `${name}__${parentId ?? 'root'}`;

  const { data: existing, error: existingError } = await supabase
    .from('categories')
    .select('id, name, parent_id')
    .eq('account_id', accountId);

  if (existingError) {
    console.error("Erro ao buscar categorias existentes:", existingError);
    throw existingError;
  }

  console.log(`Encontradas ${existing?.length || 0} categorias existentes`);

  const byKey = new Map<string, string>();
  if (existing) {
    for (const row of existing) {
      byKey.set(buildKey(row.name as string, (row as any).parent_id as string | null), row.id as string);
    }
  }

  const parentCategories = categories.filter(c => c.parent_id === null);
  const childCategories = categories.filter(c => c.parent_id !== null);

  let createdCount = 0;

  // Garantir pais
  for (const cat of parentCategories) {
    const key = buildKey(cat.name, null);
    if (!byKey.has(key)) {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          account_id: accountId,
          name: cat.name,
          type: cat.type,
          color: cat.color,
          parent_id: null,
        })
        .select('id')
        .single();
      if (!error && data) {
        byKey.set(key, data.id);
        createdCount++;
      } else {
        console.error('Erro criando categoria pai', cat.name, error);
      }
    }
  }

  // Garantir filhos
  for (const cat of childCategories) {
    const parentKey = buildKey(cat.parent_id as string, null);
    let parentId = byKey.get(parentKey);

    if (!parentId) {
      // Fallback: tenta criar o pai agora caso não exista
      const parentSpec = parentCategories.find(p => p.name === cat.parent_id);
      if (parentSpec) {
        const parentSpecKey = buildKey(parentSpec.name, null);
        if (!byKey.has(parentSpecKey)) {
          const { data: pData, error: pErr } = await supabase
            .from('categories')
            .insert({
              account_id: accountId,
              name: parentSpec.name,
              type: parentSpec.type,
              color: parentSpec.color,
              parent_id: null,
            })
            .select('id')
            .single();
          if (!pErr && pData) {
            byKey.set(parentSpecKey, pData.id);
            parentId = pData.id;
          } else {
            console.error('Erro criando pai no fallback', parentSpec.name, pErr);
            continue;
          }
        } else {
          parentId = byKey.get(parentSpecKey)!;
        }
      }
    }

    if (!parentId) continue;

    const childKey = buildKey(cat.name, parentId);
    if (!byKey.has(childKey)) {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          account_id: accountId,
          name: cat.name,
          type: cat.type,
          color: cat.color,
          parent_id: parentId,
        })
        .select('id')
        .single();
      if (!error && data) {
        byKey.set(childKey, data.id);
        createdCount++;
      } else {
        console.error('Erro criando subcategoria', cat.name, error);
      }
    }
  }

  console.log(`Seed de categorias concluído. Total de categorias criadas: ${createdCount}`);
  return createdCount;
}
