import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetPasswordRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: ResetPasswordRequest = await req.json();
    console.log("Reset password request for:", email);

    if (!email) {
      throw new Error("Email é obrigatório");
    }

    // Criar cliente Supabase com service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar se o email existe e está confirmado
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error("Erro ao buscar usuários:", userError);
      throw new Error("Erro ao verificar email");
    }

    const user = userData.users.find(u => u.email === email && u.email_confirmed_at);

    if (!user) {
      // Por segurança, não revelar se o email existe ou não
      console.log("Email não encontrado ou não confirmado:", email);
      return new Response(
        JSON.stringify({ success: true, message: "Se o email existir, você receberá as instruções" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Gerar link de reset usando generateLink
    const redirectUrl = `${Deno.env.get('SUPABASE_URL')?.replace('https://', 'https://').replace('.supabase.co', '')}.lovableproject.com/reset-password`;
    
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectUrl
      }
    });

    if (linkError) {
      console.error("Erro ao gerar link de recuperação:", linkError);
      throw new Error("Erro ao gerar link de recuperação");
    }

    console.log("Link de recuperação gerado para:", email);

    // Enviar email estilizado
    const emailResponse = await resend.emails.send({
      from: "Prospera <noreply@prospera.lucaslima.ai>",
      to: [email],
      subject: "Redefinição de Senha - Controle Financeiro",
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Redefinição de Senha</title>
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
                            <span style="font-size: 40px;">🔐</span>
                          </div>
                          <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Redefinição de Senha</h1>
                          <p style="margin: 12px 0 0; color: rgba(255,255,255,0.9); font-size: 16px; line-height: 1.5;">Recebemos uma solicitação para redefinir sua senha</p>
                        </div>
                      </td>
                    </tr>

                    <!-- Conteúdo principal -->
                    <tr>
                      <td style="padding: 40px;">
                        <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                          Olá! 👋
                        </p>
                        <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                          Você solicitou a redefinição da sua senha. Clique no botão abaixo para criar uma nova senha:
                        </p>

                        <!-- Botão de ação -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0;">
                          <tr>
                            <td align="center">
                              <a href="${linkData.properties.action_link}" 
                                 style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3); transition: transform 0.2s;">
                                Redefinir Senha
                              </a>
                            </td>
                          </tr>
                        </table>

                        <div style="margin: 32px 0; padding: 20px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px;">
                          <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                            ⚠️ <strong>Importante:</strong> Este link expira em 1 hora por questões de segurança.
                          </p>
                        </div>

                        <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                          Se você não solicitou esta redefinição, pode ignorar este email com segurança. Sua senha não será alterada.
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
      `,
    });

    console.log("Email de reset enviado com sucesso:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Email de recuperação enviado com sucesso" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Erro na função send-reset-password-email:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
