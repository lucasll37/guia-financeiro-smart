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

    console.log("Simulating email send:", {
      to: email,
      reportName,
      reportPeriod,
      reportType,
    });

    // Simulate email sending
    // In production, you would integrate with Resend or another email service
    // For now, we just log the request and return success

    const emailContent = {
      to: email,
      subject: `Relatório Financeiro - ${reportPeriod}`,
      body: `
        Olá,

        Seu relatório financeiro foi gerado com sucesso!

        Detalhes:
        - Nome do arquivo: ${reportName}
        - Período: ${reportPeriod}
        - Tipo: ${reportType.toUpperCase()}

        Este é um e-mail simulado. Em produção, o relatório seria anexado a este e-mail.

        Atenciosamente,
        Sistema de Gestão Financeira
      `,
    };

    console.log("Email would be sent with content:", emailContent);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email enviado com sucesso (simulado)",
        emailContent,
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
