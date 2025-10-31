import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestEmailRequest {
  to: string;
  templateKey: string;
  subject: string;
  htmlContent: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, templateKey, subject, htmlContent }: TestEmailRequest = await req.json();

    if (!to || !templateKey || !subject || !htmlContent) {
      throw new Error("Campos obrigatórios: to, templateKey, subject, htmlContent");
    }

    // Dados de exemplo para substituir variáveis
    const exampleData: Record<string, string> = {
      userName: "João Silva",
      confirmationUrl: "https://prospera.lucaslima.ai/auth?confirmed=true",
      resetUrl: "https://prospera.lucaslima.ai/reset-password",
      confirmUrl: "https://prospera.lucaslima.ai/confirm-deletion",
      reportName: "Relatório Mensal Completo",
      reportPeriod: "Janeiro 2025",
      reportType: "PDF",
    };

    // Substituir variáveis no HTML
    let processedHtml = htmlContent;
    Object.entries(exampleData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, "g");
      processedHtml = processedHtml.replace(regex, value);
    });

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
        from: "Prospera! <noreply@prospera.lucaslima.ai>",
        to: [to],
        subject: `[TESTE] ${subject}`,
        html: processedHtml,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      throw new Error(`Erro ao enviar email: ${error}`);
    }

    const emailData = await emailResponse.json();
    console.log("Email de teste enviado para:", to);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Email de teste enviado com sucesso",
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
    console.error("Erro ao enviar email de teste:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
