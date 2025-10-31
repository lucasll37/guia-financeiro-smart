import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const handler = async (req: Request): Promise<Response> => {
  try {
    // Extrair token da URL
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Token Inválido</title>
            <style>
              body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .error { color: #dc2626; }
            </style>
          </head>
          <body>
            <h1 class="error">❌ Token Inválido</h1>
            <p>O link de confirmação é inválido ou está mal formatado.</p>
          </body>
        </html>
        `,
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }

    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Buscar token na tabela
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from("account_deletion_tokens")
      .select("*")
      .eq("token", token)
      .eq("used", false)
      .maybeSingle();

    if (tokenError || !tokenData) {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Token Inválido</title>
            <style>
              body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .error { color: #dc2626; }
            </style>
          </head>
          <body>
            <h1 class="error">❌ Token Inválido ou Expirado</h1>
            <p>Este link de confirmação não é válido, já foi usado ou expirou.</p>
            <p>Por favor, solicite um novo link de exclusão através do aplicativo.</p>
          </body>
        </html>
        `,
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }

    // Verificar se token expirou
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt < new Date()) {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Token Expirado</title>
            <style>
              body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .error { color: #dc2626; }
            </style>
          </head>
          <body>
            <h1 class="error">⏰ Token Expirado</h1>
            <p>Este link de confirmação expirou (válido por 1 hora).</p>
            <p>Por favor, solicite um novo link de exclusão através do aplicativo.</p>
          </body>
        </html>
        `,
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }

    const userId = tokenData.user_id;

    // Registrar log de exclusão de conta ANTES de deletar os dados
    try {
      await supabaseClient
        .from("user_action_logs")
        .insert({
          user_id: userId,
          action: "delete_account",
          entity_type: "auth",
          metadata: {
            confirmed_at: new Date().toISOString(),
          },
        });
    } catch (logError) {
      console.error("Erro ao registrar log de exclusão:", logError);
    }

    // Marcar token como usado
    await supabaseClient
      .from("account_deletion_tokens")
      .update({ used: true })
      .eq("token", token);

    // Deletar todos os dados do usuário
    // A ordem é importante devido às foreign keys

    // 1. Deletar account_deletion_tokens
    await supabaseClient.from("account_deletion_tokens").delete().eq("user_id", userId);

    // 2. Deletar notificações
    await supabaseClient.from("notifications").delete().eq("user_id", userId);

    // 3. Buscar todas as contas do usuário
    const { data: accounts } = await supabaseClient
      .from("accounts")
      .select("id")
      .eq("owner_id", userId);

    if (accounts && accounts.length > 0) {
      const accountIds = accounts.map((a) => a.id);

      // 4. Deletar dados relacionados às contas
      await supabaseClient.from("transactions").delete().in("account_id", accountIds);
      await supabaseClient.from("budgets").delete().in("account_id", accountIds);
      await supabaseClient.from("goals").delete().in("account_id", accountIds);
      await supabaseClient.from("investment_assets").delete().in("account_id", accountIds);
      await supabaseClient.from("account_period_forecasts").delete().in("account_id", accountIds);
      await supabaseClient.from("credit_cards").delete().in("account_id", accountIds);
      await supabaseClient.from("categories").delete().in("account_id", accountIds);
      await supabaseClient.from("account_members").delete().in("account_id", accountIds);
      await supabaseClient.from("audit_logs").delete().in("entity_id", accountIds);
      
      // 5. Deletar contas
      await supabaseClient.from("accounts").delete().in("id", accountIds);
    }

    // 6. Deletar assinatura
    await supabaseClient.from("subscriptions").delete().eq("user_id", userId);

    // 7. Deletar roles
    await supabaseClient.from("user_roles").delete().eq("user_id", userId);

    // 8. Deletar perfil
    await supabaseClient.from("profiles").delete().eq("id", userId);

    // 9. Deletar avatar do storage (se existir)
    try {
      const { data: files } = await supabaseClient.storage
        .from("avatars")
        .list(userId);
      
      if (files && files.length > 0) {
        const filePaths = files.map((f) => `${userId}/${f.name}`);
        await supabaseClient.storage.from("avatars").remove(filePaths);
      }
    } catch (error) {
      console.error("Erro ao deletar avatar:", error);
    }

    // 10. Deletar usuário do auth
    const { error: deleteAuthError } = await supabaseClient.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error("Erro ao deletar usuário do auth:", deleteAuthError);
      throw deleteAuthError;
    }

    console.log("Conta deletada com sucesso:", userId);

    // Retornar página de confirmação
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Conta Excluída</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              max-width: 600px;
              margin: 50px auto;
              padding: 20px;
              text-align: center;
              line-height: 1.6;
            }
            .success {
              color: #059669;
              font-size: 48px;
              margin-bottom: 16px;
            }
            h1 {
              color: #111;
              margin-bottom: 16px;
            }
            p {
              color: #666;
              margin: 12px 0;
            }
            .info-box {
              background-color: #f3f4f6;
              border-radius: 8px;
              padding: 20px;
              margin: 24px 0;
              text-align: left;
            }
          </style>
        </head>
        <body>
          <div class="success">✓</div>
          <h1>Conta Excluída com Sucesso</h1>
          <p>Sua conta e todos os dados associados foram permanentemente excluídos.</p>
          
          <div class="info-box">
            <strong>Dados excluídos:</strong>
            <ul style="margin: 8px 0;">
              <li>Todas as contas e lançamentos</li>
              <li>Categorias e subcategorias</li>
              <li>Previsões e orçamentos</li>
              <li>Investimentos e metas</li>
              <li>Configurações e preferências</li>
              <li>Perfil e dados pessoais</li>
            </ul>
          </div>
          
          <p>Obrigado por ter usado nosso serviço.</p>
          <p style="margin-top: 32px; color: #999; font-size: 14px;">
            Você pode fechar esta janela.
          </p>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  } catch (error: any) {
    console.error("Erro ao confirmar exclusão de conta:", error);
    
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Erro na Exclusão</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1 class="error">❌ Erro ao Excluir Conta</h1>
          <p>Ocorreu um erro ao processar a exclusão da sua conta.</p>
          <p style="color: #666; font-size: 14px;">Erro: ${error.message}</p>
          <p>Por favor, entre em contato com o suporte.</p>
        </body>
      </html>
      `,
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
};

serve(handler);
