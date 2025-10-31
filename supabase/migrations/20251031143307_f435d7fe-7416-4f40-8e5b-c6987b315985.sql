-- Criar tabela para templates de email
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE, -- welcome, reset_password, account_deletion, report
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  description TEXT,
  variables TEXT[], -- variáveis disponíveis para o template
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas admins podem gerenciar templates
CREATE POLICY "Admins can manage email templates"
  ON public.email_templates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Inserir templates padrão
INSERT INTO public.email_templates (template_key, subject, description, variables, html_content) VALUES
(
  'welcome',
  '🎉 Bem-vindo ao Prospera! Confirme seu email',
  'Email enviado quando um novo usuário se cadastra na plataforma',
  ARRAY['userName', 'confirmationUrl'],
  'Template de boas-vindas padrão'
),
(
  'reset_password',
  'Redefinição de Senha - Controle Financeiro',
  'Email enviado quando o usuário solicita recuperação de senha',
  ARRAY['userName', 'resetUrl'],
  'Template de reset de senha padrão'
),
(
  'account_deletion',
  '⚠️ Confirmação de Exclusão de Conta - Prospera',
  'Email enviado para confirmar exclusão permanente de conta',
  ARRAY['userName', 'confirmUrl'],
  'Template de exclusão de conta padrão'
),
(
  'report',
  '📊 Seu Relatório Financeiro - {reportPeriod}',
  'Email enviado quando um relatório financeiro é gerado',
  ARRAY['userName', 'reportName', 'reportPeriod', 'reportType'],
  'Template de relatório padrão'
);