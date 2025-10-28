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
const createWelcomeEmailHTML = (confirmationUrl: string, userEmail: string): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo ao Prospera</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; max-width: 600px; margin: 0 auto;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 0; padding: 0;">
                🎉 Bem-vindo ao Prospera!
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #525f7f; font-size: 16px; line-height: 24px; margin: 0 0 16px 0;">
                Olá <strong>${userEmail}</strong>,
              </p>
              
              <p style="color: #525f7f; font-size: 16px; line-height: 24px; margin: 0 0 16px 0;">
                Estamos muito felizes em tê-lo(a) conosco! O Prospera é a sua nova ferramenta de gestão financeira pessoal e familiar.
              </p>

              <p style="color: #525f7f; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
                Para começar a usar todas as funcionalidades, precisamos confirmar seu endereço de email. É rápido e simples:
              </p>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 16px 0 32px 0;">
                    <a href="${confirmationUrl}" style="background-color: #6366f1; border-radius: 8px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: 600; padding: 14px 32px; text-decoration: none; text-align: center;">
                      ✓ Confirmar Email
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #8898aa; font-size: 14px; line-height: 20px; margin: 0 0 8px 0; text-align: center;">
                Ou copie e cole este link no seu navegador:
              </p>
              
              <p style="color: #6366f1; font-size: 12px; line-height: 18px; word-break: break-all; margin: 0 0 32px 0; text-align: center;">
                ${confirmationUrl}
              </p>

              <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 32px 0;">

              <p style="color: #525f7f; font-size: 16px; line-height: 24px; margin: 0 0 16px 0;">
                <strong>O que você pode fazer no Prospera:</strong>
              </p>
              
              <p style="color: #525f7f; font-size: 15px; line-height: 28px; margin: 0 0 4px 0; padding-left: 20px;">
                💰 Gerenciar suas contas financeiras
              </p>
              <p style="color: #525f7f; font-size: 15px; line-height: 28px; margin: 0 0 4px 0; padding-left: 20px;">
                📊 Acompanhar investimentos em tempo real
              </p>
              <p style="color: #525f7f; font-size: 15px; line-height: 28px; margin: 0 0 4px 0; padding-left: 20px;">
                🎯 Definir e alcançar metas financeiras
              </p>
              <p style="color: #525f7f; font-size: 15px; line-height: 28px; margin: 0 0 4px 0; padding-left: 20px;">
                👨‍👩‍👧‍👦 Compartilhar contas com familiares
              </p>
              <p style="color: #525f7f; font-size: 15px; line-height: 28px; margin: 0 0 4px 0; padding-left: 20px;">
                💳 Controlar cartões de crédito
              </p>

              <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 32px 0;">

              <p style="color: #8898aa; font-size: 14px; line-height: 22px; margin: 16px 0;">
                Se você não criou uma conta no Prospera, pode ignorar este email com segurança.
              </p>
              
              <p style="color: #525f7f; font-size: 14px; line-height: 22px; margin: 16px 0;">
                Atenciosamente,<br />
                <strong>Equipe Prospera</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; text-align: center; background-color: #f6f9fc;">
              <p style="color: #8898aa; font-size: 12px; line-height: 16px; margin: 0;">
                © ${new Date().getFullYear()} Prospera. Todos os direitos reservados.
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
    id: string;
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

    // Gerar link de confirmação/magic link usando Supabase Admin
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
      options: {
        redirectTo: `${supabaseUrl}/app/dashboard`
      }
    });

    if (linkError) {
      console.error("Erro ao gerar link de confirmação:", linkError);
      throw linkError;
    }

    const confirmationUrl = linkData.properties.action_link;
    console.log("Confirmation URL generated successfully");

    // Gerar HTML do email
    const html = createWelcomeEmailHTML(confirmationUrl, user.email);

    // Enviar email via Resend
    const emailResponse = await resend.emails.send({
      from: "Prospera <noreply@prospera.lucaslima.ai>",
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
