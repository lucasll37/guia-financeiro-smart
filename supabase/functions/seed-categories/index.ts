import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { accountId, accountType } = await req.json();
    if (!accountId) {
      return new Response(JSON.stringify({ error: 'accountId é obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verifica se o usuário é dono da conta
    const { data: account, error: accErr } = await supabaseClient
      .from('accounts')
      .select('id, owner_id')
      .eq('id', accountId)
      .maybeSingle();

    if (accErr || !account) {
      return new Response(JSON.stringify({ error: 'Conta não encontrada' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (account.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Permissão negada' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const categories: Array<{ name: string; type: 'receita' | 'despesa'; color: string; parent_id: string | null }> = [
      { name: 'Receita', type: 'receita', color: '#10b981', parent_id: null },
      { name: 'Salário  / Adiantamento', type: 'receita', color: '#10b981', parent_id: 'Receita' },
      { name: 'Férias', type: 'receita', color: '#10b981', parent_id: 'Receita' },
      { name: '13º salário', type: 'receita', color: '#10b981', parent_id: 'Receita' },
      { name: 'Aposentadoria', type: 'receita', color: '#10b981', parent_id: 'Receita' },
      { name: 'Receita extra (aluguel, restituição IR)', type: 'receita', color: '#10b981', parent_id: 'Receita' },
      { name: 'Outras Receitas', type: 'receita', color: '#10b981', parent_id: 'Receita' },
      { name: 'Alimentação', type: 'despesa', color: '#22c55e', parent_id: null },
      { name: 'Supermercado', type: 'despesa', color: '#22c55e', parent_id: 'Alimentação' },
      { name: 'Feira  / Sacolão', type: 'despesa', color: '#22c55e', parent_id: 'Alimentação' },
      { name: 'Padaria', type: 'despesa', color: '#22c55e', parent_id: 'Alimentação' },
      { name: 'Refeição fora de casa', type: 'despesa', color: '#22c55e', parent_id: 'Alimentação' },
      { name: 'Outros (café, água, sorvetes, etc)', type: 'despesa', color: '#22c55e', parent_id: 'Alimentação' },
      { name: 'Moradia', type: 'despesa', color: '#f59e0b', parent_id: null },
      { name: 'Prestação /Aluguel de imóvel', type: 'despesa', color: '#f59e0b', parent_id: 'Moradia' },
      { name: 'Condomínio', type: 'despesa', color: '#f59e0b', parent_id: 'Moradia' },
      { name: 'Consumo de água', type: 'despesa', color: '#f59e0b', parent_id: 'Moradia' },
      { name: 'Serviço de limpeza( diarista ou mensalista)', type: 'despesa', color: '#f59e0b', parent_id: 'Moradia' },
      { name: 'Energia Elétrica', type: 'despesa', color: '#f59e0b', parent_id: 'Moradia' },
      { name: 'Gás', type: 'despesa', color: '#f59e0b', parent_id: 'Moradia' },
      { name: 'IPTU', type: 'despesa', color: '#f59e0b', parent_id: 'Moradia' },
      { name: 'Decoração da casa', type: 'despesa', color: '#f59e0b', parent_id: 'Moradia' },
      { name: 'Manutenção / Reforma da casa', type: 'despesa', color: '#f59e0b', parent_id: 'Moradia' },
      { name: 'Celular', type: 'despesa', color: '#f59e0b', parent_id: 'Moradia' },
      { name: 'Telefone fixo', type: 'despesa', color: '#f59e0b', parent_id: 'Moradia' },
      { name: 'Internet / TV a cabo', type: 'despesa', color: '#f59e0b', parent_id: 'Moradia' },
      { name: 'Educação', type: 'despesa', color: '#8b5cf6', parent_id: null },
      { name: 'Matricula Escolar/ Mensalidade', type: 'despesa', color: '#8b5cf6', parent_id: 'Educação' },
      { name: 'Material Escolar', type: 'despesa', color: '#8b5cf6', parent_id: 'Educação' },
      { name: 'Outros cursos', type: 'despesa', color: '#8b5cf6', parent_id: 'Educação' },
      { name: 'Transporte escolar', type: 'despesa', color: '#8b5cf6', parent_id: 'Educação' },
      { name: 'Animal de Estimação', type: 'despesa', color: '#ec4899', parent_id: null },
      { name: 'Ração', type: 'despesa', color: '#ec4899', parent_id: 'Animal de Estimação' },
      { name: 'Banho / Tosa', type: 'despesa', color: '#ec4899', parent_id: 'Animal de Estimação' },
      { name: 'Veterinário / medicamento', type: 'despesa', color: '#ec4899', parent_id: 'Animal de Estimação' },
      { name: 'Outros (acessórios, brinquedos, hotel, dog walker)', type: 'despesa', color: '#ec4899', parent_id: 'Animal de Estimação' },
      { name: 'Saúde', type: 'despesa', color: '#14b8a6', parent_id: null },
      { name: 'Plano de saúde', type: 'despesa', color: '#14b8a6', parent_id: 'Saúde' },
      { name: 'Medicamentos', type: 'despesa', color: '#14b8a6', parent_id: 'Saúde' },
      { name: 'Dentista', type: 'despesa', color: '#14b8a6', parent_id: 'Saúde' },
      { name: 'Terapia / Psicólogo  / Acupuntura', type: 'despesa', color: '#14b8a6', parent_id: 'Saúde' },
      { name: 'Médicos/Exames fora do plano de saúde', type: 'despesa', color: '#14b8a6', parent_id: 'Saúde' },
      { name: 'Academia / Tratamento Estético', type: 'despesa', color: '#14b8a6', parent_id: 'Saúde' },
      { name: 'Transporte', type: 'despesa', color: '#3b82f6', parent_id: null },
      { name: 'Ônibus / Metrô', type: 'despesa', color: '#3b82f6', parent_id: 'Transporte' },
      { name: 'Taxi', type: 'despesa', color: '#3b82f6', parent_id: 'Transporte' },
      { name: 'Combustível', type: 'despesa', color: '#3b82f6', parent_id: 'Transporte' },
      { name: 'Estacionamento', type: 'despesa', color: '#3b82f6', parent_id: 'Transporte' },
      { name: 'Seguro Auto', type: 'despesa', color: '#3b82f6', parent_id: 'Transporte' },
      { name: 'Manutenção / Lavagem / Troca de óleo', type: 'despesa', color: '#3b82f6', parent_id: 'Transporte' },
      { name: 'Licenciamento', type: 'despesa', color: '#3b82f6', parent_id: 'Transporte' },
      { name: 'Pedágio', type: 'despesa', color: '#3b82f6', parent_id: 'Transporte' },
      { name: 'IPVA', type: 'despesa', color: '#3b82f6', parent_id: 'Transporte' },
      { name: 'Pessoais', type: 'despesa', color: '#06b6d4', parent_id: null },
      { name: 'Vestuário / Calçados / Acessórios', type: 'despesa', color: '#06b6d4', parent_id: 'Pessoais' },
      { name: 'Cabeleireiro / Manicure / Higiene pessoal', type: 'despesa', color: '#06b6d4', parent_id: 'Pessoais' },
      { name: 'Presentes', type: 'despesa', color: '#06b6d4', parent_id: 'Pessoais' },
      { name: 'Outros', type: 'despesa', color: '#06b6d4', parent_id: 'Pessoais' },
      { name: 'Lazer', type: 'despesa', color: '#f43f5e', parent_id: null },
      { name: 'Cinema / Teatro / Shows', type: 'despesa', color: '#f43f5e', parent_id: 'Lazer' },
      { name: 'Livros / Revistas / Cd´s', type: 'despesa', color: '#f43f5e', parent_id: 'Lazer' },
      { name: 'Clube / Parques / Casa Noturna', type: 'despesa', color: '#f43f5e', parent_id: 'Lazer' },
      { name: 'Viagens', type: 'despesa', color: '#f43f5e', parent_id: 'Lazer' },
      { name: 'Restaurantes / Bares / Festas', type: 'despesa', color: '#f43f5e', parent_id: 'Lazer' },
      { name: 'Serviços Financeiros', type: 'despesa', color: '#6366f1', parent_id: null },
      { name: 'Empréstimos', type: 'despesa', color: '#6366f1', parent_id: 'Serviços Financeiros' },
      { name: 'Seguros (vida/residencial)', type: 'despesa', color: '#6366f1', parent_id: 'Serviços Financeiros' },
      { name: 'Previdência privada', type: 'despesa', color: '#6366f1', parent_id: 'Serviços Financeiros' },
      { name: 'Juros Cheque Especial', type: 'despesa', color: '#6366f1', parent_id: 'Serviços Financeiros' },
      { name: 'Tarifas bancárias', type: 'despesa', color: '#6366f1', parent_id: 'Serviços Financeiros' },
      { name: 'Financiamento de veículo', type: 'despesa', color: '#6366f1', parent_id: 'Serviços Financeiros' },
      { name: 'Imposto de Renda a Pagar', type: 'despesa', color: '#6366f1', parent_id: 'Serviços Financeiros' },
    ];

    // Para contas tipo casa, filtrar apenas despesas (receitas têm regras especiais)
    const filteredCategories = accountType === 'casa'
      ? categories.filter(c => c.type === 'despesa')
      : categories;

    const buildKey = (name: string, parentId: string | null) => `${name}__${parentId ?? 'root'}`;

    // Busca existentes
    const { data: existing, error: existingError } = await supabaseClient
      .from('categories')
      .select('id, name, parent_id')
      .eq('account_id', accountId);

    if (existingError) {
      throw existingError;
    }

    const byKey = new Map<string, string>();
    if (existing) {
      for (const row of existing) {
        byKey.set(buildKey(row.name as string, (row as any).parent_id as string | null), row.id as string);
      }
    }

    const parentCategories = filteredCategories.filter(c => c.parent_id === null);
    const childCategories = filteredCategories.filter(c => c.parent_id !== null);

    let createdCount = 0;

    // Cria pais
    for (const cat of parentCategories) {
      const key = buildKey(cat.name, null);
      if (!byKey.has(key)) {
        const { data, error } = await supabaseClient
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
        if (error) throw error;
        byKey.set(key, data!.id);
        createdCount++;
      }
    }

    // Cria filhos
    for (const cat of childCategories) {
      const parentKey = buildKey(cat.parent_id as string, null);
      let parentId = byKey.get(parentKey);

      if (!parentId) {
        const parentSpec = parentCategories.find(p => p.name === cat.parent_id);
        if (parentSpec) {
          const pk = buildKey(parentSpec.name, null);
          if (!byKey.has(pk)) {
            const { data: pData, error: pErr } = await supabaseClient
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
            if (pErr) throw pErr;
            byKey.set(pk, pData!.id);
            parentId = pData!.id;
            createdCount++;
          } else {
            parentId = byKey.get(pk)!;
          }
        }
      }

      if (!parentId) continue;

      const childKey = buildKey(cat.name, parentId);
      if (!byKey.has(childKey)) {
        const { data, error } = await supabaseClient
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
        if (error) throw error;
        byKey.set(childKey, data!.id);
        createdCount++;
      }
    }

    return new Response(JSON.stringify({ created: createdCount }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
