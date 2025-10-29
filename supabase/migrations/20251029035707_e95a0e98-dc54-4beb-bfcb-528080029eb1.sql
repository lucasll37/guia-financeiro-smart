-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Criar agendamento para limpeza automática de logs (executa diariamente às 2h da manhã)
SELECT cron.schedule(
  'cleanup-old-action-logs',
  '0 2 * * *', -- Todo dia às 2h da manhã
  $$
  SELECT public.cleanup_old_action_logs();
  $$
);

-- Comentário explicativo
COMMENT ON FUNCTION public.cleanup_old_action_logs() IS 'Função que limpa logs antigos baseado na configuração de retenção definida pelo admin';