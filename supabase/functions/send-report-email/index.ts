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
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 10px 10px 0 0;
                text-align: center;
              }
              .header h1 {
                margin: 0;
                font-size: 28px;
              }
              .content {
                background: #f8f9fa;
                padding: 30px;
                border-radius: 0 0 10px 10px;
              }
              .report-details {
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .detail-row {
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid #e9ecef;
              }
              .detail-row:last-child {
                border-bottom: none;
              }
              .detail-label {
                font-weight: 600;
                color: #667eea;
              }
              .detail-value {
                color: #495057;
              }
              .info-box {
                background: #e7f3ff;
                border-left: 4px solid #667eea;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .footer {
                text-align: center;
                padding: 20px;
                color: #6c757d;
                font-size: 14px;
              }
              .footer a {
                color: #667eea;
                text-decoration: none;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>📊 Prospera</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Gestão Financeira Inteligente</p>
            </div>
            
            <div class="content">
              <h2 style="color: #333; margin-top: 0;">Olá!</h2>
              
              <p>Seu relatório financeiro foi gerado com sucesso e está disponível para visualização na plataforma.</p>
              
              <div class="report-details">
                <h3 style="margin-top: 0; color: #667eea;">📄 Detalhes do Relatório</h3>
                
                <div class="detail-row">
                  <span class="detail-label">Nome do arquivo:</span>
                  <span class="detail-value">${reportName}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Período:</span>
                  <span class="detail-value">${reportPeriod}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Tipo:</span>
                  <span class="detail-value">${reportType.toUpperCase()}</span>
                </div>
              </div>
              
              <div class="info-box">
                <strong>💡 Como acessar:</strong>
                <p style="margin: 10px 0 0 0;">
                  O relatório está disponível na seção <strong>Relatórios</strong> da sua conta. 
                  Você pode visualizar, baixar ou compartilhar o relatório a qualquer momento.
                </p>
              </div>
              
              <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
                Este relatório contém informações detalhadas sobre suas finanças no período selecionado.
              </p>
            </div>
            
            <div class="footer">
              <p>
                <strong>Prospera</strong> - Gestão Financeira<br>
                <a href="https://prospera.lucaslima.ai">prospera.lucaslima.ai</a>
              </p>
              <p style="color: #adb5bd; font-size: 12px; margin-top: 15px;">
                Este é um email automático, por favor não responda.
              </p>
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
