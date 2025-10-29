import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: RequestBody = await req.json();

    if (!email) {
      throw new Error("Email é obrigatório");
    }

    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Buscar usuário
    const { data: { users }, error: userError } = await supabaseClient.auth.admin.listUsers();
    
    if (userError) throw userError;

    const user = users.find(u => u.email === email);
    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    // Buscar nome do usuário
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();

    const userName = profile?.name || email.split('@')[0];

    // Gerar token de confirmação (válido por 1 hora)
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Salvar token na tabela de confirmação (vamos criar essa tabela)
    const { error: insertError } = await supabaseClient
      .from("account_deletion_tokens")
      .insert({
        user_id: user.id,
        token: token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) throw insertError;

    // Construir URL de confirmação
    const confirmUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/confirm-account-deletion?token=${token}`;

    // Enviar email usando Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY não configurada");
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Prospera <noreply@prospera.lucaslima.ai>",
        to: [email],
        subject: "⚠️ Confirmação de Exclusão de Conta - Prospera",
        html: `
          <!DOCTYPE html>
          <html lang="pt-BR">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Confirmação de Exclusão de Conta</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); min-height: 100vh;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0; padding: 40px 20px;">
                <tr>
                  <td align="center">
                    <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden;">
                      
                      <!-- Header com gradiente -->
                      <tr>
                        <td style="padding: 0;">
                          <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 40px 60px; text-align: center;">
                            <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);">
                              <span style="font-size: 40px;">⚠️</span>
                            </div>
                            <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Exclusão de Conta</h1>
                            <p style="margin: 12px 0 0; color: rgba(255,255,255,0.9); font-size: 16px; line-height: 1.5;">Confirme para prosseguir</p>
                          </div>
                        </td>
                      </tr>

                      <!-- Conteúdo principal -->
                      <tr>
                        <td style="padding: 40px;">
                          <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                            Olá, <strong>${userName}</strong>! 👋
                          </p>
                          <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                            Recebemos uma solicitação para excluir permanentemente sua conta no Prospera.
                          </p>

                          <div style="margin: 32px 0; padding: 20px; background: #fee2e2; border-left: 4px solid #dc2626; border-radius: 8px;">
                            <p style="margin: 0 0 8px; color: #991b1b; font-size: 16px; font-weight: 700;">
                              ⚠️ ATENÇÃO: ESTA AÇÃO É IRREVERSÍVEL
                            </p>
                            <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.5;">
                              Ao confirmar, todos os seus dados serão permanentemente excluídos sem possibilidade de recuperação ou backup.
                            </p>
                          </div>

                          <h3 style="color: #374151; font-size: 18px; font-weight: 600; margin: 24px 0 16px;">Os seguintes dados serão excluídos:</h3>
                          <ul style="color: #6b7280; font-size: 15px; line-height: 1.8; margin: 0 0 24px; padding-left: 24px;">
                            <li>Todas as contas e lançamentos financeiros</li>
                            <li>Categorias e subcategorias personalizadas</li>
                            <li>Previsões e orçamentos</li>
                            <li>Investimentos e metas</li>
                            <li>Cartões de crédito cadastrados</li>
                            <li>Configurações e preferências</li>
                            <li>Seu perfil e dados pessoais</li>
                          </ul>

                          <div style="margin: 32px 0; padding: 20px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px;">
                            <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                              ⚠️ <strong>Importante:</strong> Este link expira em 1 hora por questões de segurança.
                            </p>
                          </div>

                          <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
                            Se você tem certeza que deseja excluir sua conta permanentemente, clique no botão abaixo:
                          </p>

                          <!-- Botão de ação -->
                          <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0;">
                            <tr>
                              <td align="center">
                                <a href="${confirmUrl}" 
                                   style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 10px 25px rgba(220, 38, 38, 0.3);">
                                  Confirmar Exclusão de Conta
                                </a>
                              </td>
                            </tr>
                          </table>

                          <p style="margin: 24px 0 8px; color: #6b7280; font-size: 13px; text-align: center;">
                            Ou copie e cole este link no seu navegador:
                          </p>
                          <p style="margin: 0; color: #9ca3af; font-size: 11px; word-break: break-all; text-align: center; background: #f9fafb; padding: 12px; border-radius: 6px;">
                            ${confirmUrl}
                          </p>

                          <div style="margin: 32px 0 0; padding: 20px; background: #f9fafb; border-radius: 8px;">
                            <p style="margin: 0 0 8px; color: #374151; font-size: 15px; font-weight: 600;">
                              Não solicitou esta exclusão?
                            </p>
                            <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                              Se você não solicitou a exclusão da sua conta, ignore este email com segurança. 
                              Sua conta permanecerá ativa e protegida. Este link expirará automaticamente em 1 hora.
                            </p>
                          </div>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="padding: 30px 40px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
                          <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px; text-align: center; line-height: 1.5;">
                            <strong>Prospera</strong> - Gestão Financeira Inteligente
                          </p>
                          <p style="margin: 0 0 8px; color: #667eea; font-size: 12px; text-align: center;">
                            <a href="https://prospera.lucaslima.ai" style="color: #667eea; text-decoration: none;">prospera.lucaslima.ai</a>
                          </p>
                          <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center; line-height: 1.5;">
                            Este é um email automático, por favor não responda.
                          </p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      throw new Error(`Erro ao enviar email: ${error}`);
    }

    console.log("Email de confirmação enviado para:", email);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Email de confirmação enviado com sucesso" 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Erro ao enviar email de exclusão:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
