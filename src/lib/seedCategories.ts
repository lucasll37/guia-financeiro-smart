import { supabase } from "@/integrations/supabase/client";

export async function seedCategories(accountId: string, accountType?: string) {
  console.log("seedCategories chamado para account_id:", accountId, "tipo:", accountType);
  
  // Buscar a primeira conta do sistema (seed/template)
  const { data: firstAccount, error: accountError } = await supabase
    .from('accounts')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (accountError) {
    console.error("Erro ao buscar primeira conta:", accountError);
    throw accountError;
  }

  if (!firstAccount) {
    console.error("Nenhuma conta seed encontrada no sistema");
    return 0;
  }

  // Buscar categorias seed da primeira conta
  const { data: seedCategories, error: seedError } = await supabase
    .from('categories')
    .select('id, name, type, color, parent_id')
    .eq('account_id', firstAccount.id);

  if (seedError) {
    console.error("Erro ao buscar categorias seed:", seedError);
    throw seedError;
  }

  if (!seedCategories || seedCategories.length === 0) {
    console.log("Nenhuma categoria seed encontrada");
    return 0;
  }

  // Filtrar por tipo se for conta casa (apenas despesas)
  const categories = accountType === 'casa' 
    ? seedCategories.filter(c => c.type === 'despesa')
    : seedCategories;

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

  // Garantir filhos - agora precisa mapear parent_id do seed para o novo parent_id
  for (const cat of childCategories) {
    // Buscar o parent na lista de seed categories para pegar o nome
    const seedParent = seedCategories.find(s => s.id === cat.parent_id);
    if (!seedParent) continue;

    const parentKey = buildKey(seedParent.name, null);
    let parentId = byKey.get(parentKey);

    if (!parentId) {
      // Fallback: tenta criar o pai agora caso não exista
      const parentSpec = parentCategories.find(p => p.name === seedParent.name);
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
            createdCount++;
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
