import { supabase } from "@/integrations/supabase/client";

export async function seedCategories(accountId: string) {
  const categories = [
    // Despesas
    { name: "Alimentação", type: "despesa" as const, color: "#ef4444", parent_id: null },
    { name: "Restaurantes", type: "despesa" as const, color: "#f87171", parent_id: "Alimentação" },
    { name: "Supermercado", type: "despesa" as const, color: "#dc2626", parent_id: "Alimentação" },
    
    { name: "Moradia", type: "despesa" as const, color: "#f59e0b", parent_id: null },
    { name: "Aluguel", type: "despesa" as const, color: "#fb923c", parent_id: "Moradia" },
    { name: "Condomínio", type: "despesa" as const, color: "#f97316", parent_id: "Moradia" },
    { name: "Manutenção", type: "despesa" as const, color: "#ea580c", parent_id: "Moradia" },
    
    { name: "Transporte", type: "despesa" as const, color: "#3b82f6", parent_id: null },
    { name: "Combustível", type: "despesa" as const, color: "#60a5fa", parent_id: "Transporte" },
    { name: "Transporte Público", type: "despesa" as const, color: "#2563eb", parent_id: "Transporte" },
    { name: "Manutenção Veículo", type: "despesa" as const, color: "#1d4ed8", parent_id: "Transporte" },
    
    { name: "Saúde", type: "despesa" as const, color: "#10b981", parent_id: null },
    { name: "Medicamentos", type: "despesa" as const, color: "#34d399", parent_id: "Saúde" },
    { name: "Consultas", type: "despesa" as const, color: "#059669", parent_id: "Saúde" },
    { name: "Plano de Saúde", type: "despesa" as const, color: "#047857", parent_id: "Saúde" },
    
    { name: "Educação", type: "despesa" as const, color: "#8b5cf6", parent_id: null },
    { name: "Lazer", type: "despesa" as const, color: "#ec4899", parent_id: null },
    { name: "Vestuário", type: "despesa" as const, color: "#06b6d4", parent_id: null },
    
    // Receitas
    { name: "Salário", type: "receita" as const, color: "#22c55e", parent_id: null },
    { name: "Freelance", type: "receita" as const, color: "#84cc16", parent_id: null },
    { name: "Investimentos", type: "receita" as const, color: "#14b8a6", parent_id: null },
    { name: "Dividendos", type: "receita" as const, color: "#10b981", parent_id: "Investimentos" },
    { name: "Juros", type: "receita" as const, color: "#059669", parent_id: "Investimentos" },
    { name: "Outros", type: "receita" as const, color: "#6366f1", parent_id: null },
  ];

  // First pass: create all categories without parent_id
  const createdCategories = new Map<string, string>();
  
  for (const cat of categories) {
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

  // Second pass: update parent relationships
  for (const cat of categories) {
    if (cat.parent_id) {
      const categoryId = createdCategories.get(cat.name);
      const parentId = createdCategories.get(cat.parent_id);

      if (categoryId && parentId) {
        await supabase
          .from("categories")
          .update({ parent_id: parentId })
          .eq("id", categoryId);
      }
    }
  }

  return createdCategories.size;
}
