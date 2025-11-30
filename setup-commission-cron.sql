-- Configurar cron job para processar comissões a cada hora
-- Este script usa pg_cron para agendar a execução da edge function

-- Remover job existente se houver
SELECT cron.unschedule('process-commission-status-hourly');

-- Criar novo job para executar a cada hora
SELECT cron.schedule(
  'process-commission-status-hourly',
  '0 * * * *', -- A cada hora no minuto 0
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
SELECT * FROM cron.job WHERE jobname = 'process-commission-status-hourly';
