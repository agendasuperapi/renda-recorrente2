-- Configurar cron job para processar comissões
-- Este script usa pg_cron para agendar a execução da edge function
-- IMPORTANTE: Ajuste o cron schedule de acordo com a configuração em app_settings.commission_check_schedule

-- Remover job existente se houver
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-commission-status-hourly') THEN
    PERFORM cron.unschedule('process-commission-status-hourly');
  END IF;
END $$;

-- Criar novo job
-- Para HOURLY use: '0 * * * *' (a cada hora no minuto 0)
-- Para horário específico use: '0 HH * * *' (ex: '0 0 * * *' para meia-noite, '0 6 * * *' para 6h)
SELECT cron.schedule(
  'process-commission-status-hourly',
  '0 * * * *', -- ⚠️ AJUSTE AQUI conforme app_settings.commission_check_schedule
  $$
  SELECT
    net.http_post(
        url:='https://adpnzkvzvjbervzrqhhx.supabase.co/functions/v1/process-commission-status',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkcG56a3Z6dmpiZXJ2enJxaGh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MDAzODYsImV4cCI6MjA3OTA3NjM4Nn0.N7gETUDWj95yDCYdZTYWPoMJQcdx_Yjl51jxK-O1vrE"}'::jsonb,
        body:=concat('{"triggered_at": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Verificar se o job foi criado
SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'process-commission-status-hourly';
