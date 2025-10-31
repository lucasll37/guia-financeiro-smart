import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReportEmailRequest {
  email: string;
  userName: string;
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
    const { email, userName, reportName, reportPeriod, reportType }: ReportEmailRequest =
      await req.json();

    console.log("Sending report email:", {
      to: email,
      userName,
      reportName,
      reportPeriod,
      reportType,
    });

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY não configurada");
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar template do banco de dados
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("template_name", "report")
      .single();

    if (templateError || !template) {
      console.error("Erro ao buscar template:", templateError);
      throw new Error("Template de email não encontrado");
    }

    // Substituir variáveis no assunto e corpo
    const variables: Record<string, string> = {
      "{reportName}": reportName,
      "{reportPeriod}": reportPeriod,
      "{userName}": userName,
      "{reportType}": reportType.toUpperCase(),
    };

    let emailSubject = template.subject;
    let emailBody = template.body;

    Object.entries(variables).forEach(([key, value]) => {
      emailSubject = emailSubject.replace(new RegExp(key, "g"), value);
      emailBody = emailBody.replace(new RegExp(key, "g"), value);
    });

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Prospera! <noreply@prospera.lucaslima.ai>",
        to: [email],
        subject: emailSubject,
        html: emailBody,
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
