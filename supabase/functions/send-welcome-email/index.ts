import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Cliente admin do Supabase
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Template de email elegante em HTML
const createWelcomeEmailHTML = (confirmationUrl: string, userName: string): string => {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bem-vindo ao Prospera</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden;">
                
                <!-- Header com gradiente -->
                <tr>
                  <td style="padding: 0;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 60px; text-align: center;">
                      <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);">
                        <span style="font-size: 40px;">🎉</span>
                      </div>
                      <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Bem-vindo ao Prospera!</h1>
                      <p style="margin: 12px 0 0; color: rgba(255,255,255,0.9); font-size: 16px; line-height: 1.5;">Sua jornada financeira começa agora</p>
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
                      Estamos muito felizes em tê-lo(a) conosco! O Prospera é a sua nova ferramenta de gestão financeira pessoal e familiar.
                    </p>
                    <p style="margin: 0 0 32px; color: #374151; font-size: 16px; line-height: 1.6;">
                      Para começar a usar todas as funcionalidades, precisamos confirmar seu endereço de email. É rápido e simples:
                    </p>

                    <!-- Botão de ação -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0;">
                      <tr>
                        <td align="center">
                          <a href="${confirmationUrl}" 
                             style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);">
                            ✓ Confirmar Email
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 24px 0 8px; color: #6b7280; font-size: 13px; text-align: center;">
                      Ou copie e cole este link no seu navegador:
                    </p>
                    <p style="margin: 0 0 32px; color: #9ca3af; font-size: 11px; word-break: break-all; text-align: center; background: #f9fafb; padding: 12px; border-radius: 6px;">
                      ${confirmationUrl}
                    </p>

                    <div style="border-top: 1px solid #e5e7eb; margin: 32px 0; padding-top: 32px;">
                      <h3 style="margin: 0 0 20px; color: #374151; font-size: 18px; font-weight: 600;">O que você pode fazer no Prospera:</h3>
                      
                      <div style="margin-bottom: 12px; padding-left: 16px;">
                        <span style="color: #667eea; font-size: 20px; margin-right: 8px;">💰</span>
                        <span style="color: #6b7280; font-size: 15px;">Gerenciar suas contas financeiras</span>
                      </div>
                      <div style="margin-bottom: 12px; padding-left: 16px;">
                        <span style="color: #667eea; font-size: 20px; margin-right: 8px;">📊</span>
                        <span style="color: #6b7280; font-size: 15px;">Acompanhar investimentos em tempo real</span>
                      </div>
                      <div style="margin-bottom: 12px; padding-left: 16px;">
                        <span style="color: #667eea; font-size: 20px; margin-right: 8px;">🎯</span>
                        <span style="color: #6b7280; font-size: 15px;">Definir e alcançar metas financeiras</span>
                      </div>
                      <div style="margin-bottom: 12px; padding-left: 16px;">
                        <span style="color: #667eea; font-size: 20px; margin-right: 8px;">👨‍👩‍👧‍👦</span>
                        <span style="color: #6b7280; font-size: 15px;">Compartilhar contas com familiares</span>
                      </div>
                      <div style="margin-bottom: 12px; padding-left: 16px;">
                        <span style="color: #667eea; font-size: 20px; margin-right: 8px;">💳</span>
                        <span style="color: #6b7280; font-size: 15px;">Controlar cartões de crédito</span>
                      </div>
                    </div>

                    <div style="margin: 32px 0 0; padding: 20px; background: #f9fafb; border-radius: 8px;">
                      <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                        Se você não criou uma conta no Prospera, pode ignorar este email com segurança.
                      </p>
                    </div>

                    <p style="margin: 24px 0 0; color: #374151; font-size: 14px; line-height: 1.6;">
                      Atenciosamente,<br>
                      <strong>Equipe Prospera</strong>
                    </p>
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
  `;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailPayload {
  user: {
    id?: string;
    email: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: EmailPayload = await req.json();
    console.log("Received payload:", JSON.stringify(payload, null, 2));

    const { user } = payload;
    
    if (!user || !user.email) {
      throw new Error("User email is required");
    }

    // Se não tiver ID, buscar pelo email
    let userId = user.id;
    if (!userId) {
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
      if (userError) {
        console.error("Erro ao buscar usuários:", userError);
        throw userError;
      }
      
      const foundUser = userData.users.find(u => u.email === user.email);
      if (!foundUser) {
        throw new Error("User not found");
      }
      userId = foundUser.id;
      console.log("User ID found:", userId);
    }

    // Buscar nome do usuário
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("name")
      .eq("id", userId)
      .single();

    const userName = profile?.name || user.email.split('@')[0];

    // Gerar link de confirmação/magic link usando Supabase Admin
    // Nota: magiclink faz login automático, então redirecionamos para página de confirmação
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
      options: {
        redirectTo: 'https://prospera.lucaslima.ai/auth?confirmed=true'
      }
    });

    if (linkError) {
      console.error("Erro ao gerar link de confirmação:", linkError);
      throw linkError;
    }

    const confirmationUrl = linkData.properties.action_link;
    console.log("Confirmation URL generated successfully");

    // Gerar HTML do email
    const html = createWelcomeEmailHTML(confirmationUrl, userName);

    // Enviar email via Resend
    const emailResponse = await resend.emails.send({
      from: "Prospera! <noreply@prospera.lucaslima.ai>",
      to: [user.email],
      subject: "🎉 Bem-vindo ao Prospera! Confirme seu email",
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
