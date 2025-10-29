import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReportEmailRequest {
  email: string;
  reportName: string;
  reportPeriod: string;
  reportType: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, reportName, reportPeriod, reportType }: ReportEmailRequest =
      await req.json();

    console.log("Sending report email:", {
      to: email,
      reportName,
      reportPeriod,
      reportType,
    });

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
        subject: `📊 Seu Relatório Financeiro - ${reportPeriod}`,
        html: `
          <!DOCTYPE html>
          <html lang="pt-BR">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Relatório Financeiro</title>
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
                              <span style="font-size: 40px;">📊</span>
                            </div>
                            <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Relatório Financeiro</h1>
                            <p style="margin: 12px 0 0; color: rgba(255,255,255,0.9); font-size: 16px; line-height: 1.5;">Seu relatório está pronto</p>
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
                            Seu relatório financeiro foi gerado com sucesso e está disponível para visualização na plataforma.
                          </p>

                          <!-- Detalhes do relatório -->
                          <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin: 24px 0;">
                            <h3 style="margin: 0 0 20px; color: #667eea; font-size: 18px; font-weight: 600;">📄 Detalhes do Relatório</h3>
                            
                            <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">
                              <div style="color: #667eea; font-weight: 600; font-size: 14px; margin-bottom: 4px;">Nome do arquivo:</div>
                              <div style="color: #374151; font-size: 15px;">${reportName}</div>
                            </div>
                            
                            <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">
                              <div style="color: #667eea; font-weight: 600; font-size: 14px; margin-bottom: 4px;">Período:</div>
                              <div style="color: #374151; font-size: 15px;">${reportPeriod}</div>
                            </div>
                            
                            <div>
                              <div style="color: #667eea; font-weight: 600; font-size: 14px; margin-bottom: 4px;">Tipo:</div>
                              <div style="color: #374151; font-size: 15px;">${reportType.toUpperCase()}</div>
                            </div>
                          </div>

                          <div style="margin: 32px 0; padding: 20px; background: #eff6ff; border-left: 4px solid #667eea; border-radius: 8px;">
                            <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.5;">
                              💡 <strong>Como acessar:</strong><br>
                              O relatório está disponível na seção <strong>Relatórios</strong> da sua conta. 
                              Você pode visualizar, baixar ou compartilhar o relatório a qualquer momento.
                            </p>
                          </div>

                          <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                            Este relatório contém informações detalhadas sobre suas finanças no período selecionado.
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
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      throw new Error(`Erro ao enviar email: ${error}`);
    }

    const emailData = await emailResponse.json();
    console.log("Email sent successfully:", emailData);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email enviado com sucesso",
        emailId: emailData.id,
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
    console.error("Error in send-report-email function:", error);
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
