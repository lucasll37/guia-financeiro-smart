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

    // Buscar a primeira conta do sistema (seed/template)
    const { data: firstAccount, error: accountError } = await supabaseClient
      .from('accounts')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (accountError) {
      console.error("Erro ao buscar primeira conta:", accountError);
      return new Response(JSON.stringify({ error: 'Erro ao buscar conta seed' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (!firstAccount) {
      console.error("Nenhuma conta seed encontrada no sistema");
      return new Response(JSON.stringify({ error: 'Nenhuma conta seed encontrada' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Buscar categorias seed da primeira conta
    const { data: seedCategories, error: seedError } = await supabaseClient
      .from('categories')
      .select('id, name, type, color, parent_id')
      .eq('account_id', firstAccount.id);

    if (seedError) {
      console.error("Erro ao buscar categorias seed:", seedError);
      return new Response(JSON.stringify({ error: 'Erro ao buscar categorias seed' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (!seedCategories || seedCategories.length === 0) {
      console.log("Nenhuma categoria seed encontrada");
      return new Response(JSON.stringify({ created: 0 }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      });
    }

    // Para contas tipo casa, filtrar apenas despesas (receitas têm regras especiais)
    const categories = accountType === 'casa'
      ? seedCategories.filter(c => c.type === 'despesa')
      : seedCategories;

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

    const parentCategories = categories.filter(c => c.parent_id === null);
    const childCategories = categories.filter(c => c.parent_id !== null);

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

    // Cria filhos - agora precisa mapear parent_id do seed para o novo parent_id
    for (const cat of childCategories) {
      // Buscar o parent na lista de seed categories para pegar o nome
      const seedParent = seedCategories.find(s => s.id === cat.parent_id);
      if (!seedParent) continue;

      const parentKey = buildKey(seedParent.name, null);
      let parentId = byKey.get(parentKey);

      if (!parentId) {
        const parentSpec = parentCategories.find(p => p.name === seedParent.name);
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
