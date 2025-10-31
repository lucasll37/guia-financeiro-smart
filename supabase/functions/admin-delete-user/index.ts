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
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: userRole, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !userRole) {
      return new Response(JSON.stringify({ error: 'Permissão negada. Apenas administradores podem deletar usuários.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get userId from request
    const { userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'ID do usuário é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prevent admin from deleting themselves
    if (userId === user.id) {
      return new Response(JSON.stringify({ error: 'Você não pode deletar sua própria conta' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Admin ${user.email} iniciando deleção do usuário ${userId}`);

    // Delete user data in correct order (respecting foreign keys)
    
    // 1. Delete notifications
    const { error: notificationsError } = await supabaseClient
      .from('notifications')
      .delete()
      .eq('user_id', userId);
    if (notificationsError) console.error('Error deleting notifications:', notificationsError);

    // 2. Delete feedback
    await supabaseClient
      .from('feedback')
      .delete()
      .eq('user_id', userId);

    // 3. Delete coupons created by user
    await supabaseClient
      .from('coupons')
      .delete()
      .eq('created_by', userId);

    // 4. Delete user's goals (by user_id, not account_id)
    await supabaseClient
      .from('goals')
      .delete()
      .eq('user_id', userId);

    // 5. Delete casa_revenue_splits
    await supabaseClient
      .from('casa_revenue_splits')
      .delete()
      .eq('user_id', userId);

    // 6. Delete account_members where user was invited by this user
    await supabaseClient
      .from('account_members')
      .delete()
      .eq('invited_by', userId);

    // 7. Delete account_members where this user is a member
    await supabaseClient
      .from('account_members')
      .delete()
      .eq('user_id', userId);

    // 8. Delete investment_members where user was invited by this user
    await supabaseClient
      .from('investment_members')
      .delete()
      .eq('invited_by', userId);

    // 9. Delete investment_members where this user is a member
    await supabaseClient
      .from('investment_members')
      .delete()
      .eq('user_id', userId);

    // 10. Get user's accounts to delete related data
    const { data: userAccounts } = await supabaseClient
      .from('accounts')
      .select('id')
      .eq('owner_id', userId);

    if (userAccounts && userAccounts.length > 0) {
      const accountIds = userAccounts.map(acc => acc.id);

      // Delete transactions
      await supabaseClient
        .from('transactions')
        .delete()
        .in('account_id', accountIds);

      // Delete budgets
      await supabaseClient
        .from('budgets')
        .delete()
        .in('account_id', accountIds);

      // Delete forecasts
      await supabaseClient
        .from('account_period_forecasts')
        .delete()
        .in('account_id', accountIds);

      // Delete credit cards
      await supabaseClient
        .from('credit_cards')
        .delete()
        .in('account_id', accountIds);

      // Delete categories
      await supabaseClient
        .from('categories')
        .delete()
        .in('account_id', accountIds);

      // Delete audit logs
      await supabaseClient
        .from('audit_logs')
        .delete()
        .in('entity_id', accountIds);
    }

    // 11. Delete accounts
    await supabaseClient
      .from('accounts')
      .delete()
      .eq('owner_id', userId);

    // 12. Get user's investments to delete related data
    const { data: userInvestments } = await supabaseClient
      .from('investment_assets')
      .select('id')
      .eq('owner_id', userId);

    if (userInvestments && userInvestments.length > 0) {
      const investmentIds = userInvestments.map(inv => inv.id);

      // Delete investment monthly returns
      await supabaseClient
        .from('investment_monthly_returns')
        .delete()
        .in('investment_id', investmentIds);
    }

    // 13. Delete investments
    await supabaseClient
      .from('investment_assets')
      .delete()
      .eq('owner_id', userId);

    // 14. Delete subscriptions
    await supabaseClient
      .from('subscriptions')
      .delete()
      .eq('user_id', userId);

    // 15. Delete user roles
    await supabaseClient
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    // 16. Delete user action logs
    await supabaseClient
      .from('user_action_logs')
      .delete()
      .eq('user_id', userId);

    // 17. Delete account deletion tokens
    await supabaseClient
      .from('account_deletion_tokens')
      .delete()
      .eq('user_id', userId);

    // 18. Delete profile
    await supabaseClient
      .from('profiles')
      .delete()
      .eq('id', userId);

    // 19. Delete from storage (avatar)
    const { data: storageFiles } = await supabaseClient
      .storage
      .from('avatars')
      .list(userId);

    if (storageFiles && storageFiles.length > 0) {
      const filePaths = storageFiles.map(file => `${userId}/${file.name}`);
      await supabaseClient
        .storage
        .from('avatars')
        .remove(filePaths);
    }

    // 20. Finally, delete user from auth
    const { error: deleteAuthError } = await supabaseClient.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error('Error deleting user from auth:', deleteAuthError);
      throw deleteAuthError;
    }

    console.log(`Usuário ${userId} deletado com sucesso por admin ${user.email}`);

    return new Response(
      JSON.stringify({ message: 'Usuário deletado com sucesso' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in admin-delete-user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao deletar usuário';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
