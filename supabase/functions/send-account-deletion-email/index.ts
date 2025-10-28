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
        from: "onboarding@resend.dev",
        to: [email],
        subject: "⚠️ Confirmação de Exclusão de Conta",
        reply_to: email,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                }
                .container {
                  background-color: #f9fafb;
                  border-radius: 8px;
                  padding: 32px;
                  margin: 20px 0;
                }
                .warning {
                  background-color: #fee;
                  border-left: 4px solid #dc2626;
                  padding: 16px;
                  margin: 24px 0;
                  border-radius: 4px;
                }
                .button {
                  display: inline-block;
                  background-color: #dc2626;
                  color: white;
                  padding: 12px 24px;
                  text-decoration: none;
                  border-radius: 6px;
                  font-weight: 600;
                  margin: 24px 0;
                }
                .footer {
                  color: #6b7280;
                  font-size: 14px;
                  margin-top: 32px;
                  padding-top: 16px;
                  border-top: 1px solid #e5e7eb;
                }
                ul {
                  padding-left: 20px;
                }
                li {
                  margin: 8px 0;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1 style="color: #dc2626;">⚠️ Confirmação de Exclusão de Conta</h1>
                
                <p>Olá,</p>
                
                <p>Recebemos uma solicitação para excluir permanentemente sua conta no Controle Financeiro.</p>
                
                <div class="warning">
                  <strong>⚠️ ATENÇÃO: ESTA AÇÃO É IRREVERSÍVEL</strong>
                  <p style="margin-top: 8px;">
                    Ao confirmar, todos os seus dados serão permanentemente excluídos sem possibilidade de recuperação ou backup.
                  </p>
                </div>
                
                <h3>Os seguintes dados serão excluídos:</h3>
                <ul>
                  <li>Todas as contas e lançamentos financeiros</li>
                  <li>Categorias e subcategorias personalizadas</li>
                  <li>Previsões e orçamentos</li>
                  <li>Investimentos e metas</li>
                  <li>Cartões de crédito cadastrados</li>
                  <li>Configurações e preferências</li>
                  <li>Seu perfil e dados pessoais</li>
                </ul>
                
                <p><strong>Este link é válido por 1 hora.</strong></p>
                
                <p>Se você tem certeza que deseja excluir sua conta permanentemente, clique no botão abaixo:</p>
                
                <a href="${confirmUrl}" class="button" style="color: white;">
                  Confirmar Exclusão de Conta
                </a>
                
                <p style="margin-top: 24px;">
                  Ou copie e cole este link no seu navegador:<br>
                  <code style="background-color: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 12px; word-break: break-all;">
                    ${confirmUrl}
                  </code>
                </p>
                
                <div class="footer">
                  <p>
                    <strong>Não solicitou esta exclusão?</strong><br>
                    Se você não solicitou a exclusão da sua conta, ignore este email. 
                    Sua conta permanecerá ativa e segura. Este link expirará automaticamente em 1 hora.
                  </p>
                </div>
              </div>
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
