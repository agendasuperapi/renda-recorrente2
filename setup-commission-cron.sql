-- Configurar cron job para processar comissões
-- Este script busca a configuração do banco e cria o cron job automaticamente
-- Execute este script sempre que mudar a configuração em Admin Settings

DO $OUTER$ 
DECLARE
  v_schedule_config TEXT;
  v_cron_schedule TEXT;
BEGIN
  -- Buscar configuração do banco
  SELECT value INTO v_schedule_config
  FROM app_settings
  WHERE key = 'commission_check_schedule';
  
  -- Se não encontrou, usar padrão (hourly)
  IF v_schedule_config IS NULL THEN
    v_schedule_config := 'hourly';
  END IF;
  
  -- Converter para formato cron
  IF v_schedule_config = 'hourly' THEN
    v_cron_schedule := '0 * * * *'; -- A cada hora
  ELSE
    -- Extrair hora e minuto (formato HH:MM)
    v_cron_schedule := SPLIT_PART(v_schedule_config, ':', 2) || ' ' || 
                       SPLIT_PART(v_schedule_config, ':', 1) || ' * * *';
  END IF;
  
  RAISE NOTICE 'Configuração encontrada: % | Cron: %', v_schedule_config, v_cron_schedule;
  
  -- Remover job existente se houver
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-commission-status-hourly') THEN
    PERFORM cron.unschedule('process-commission-status-hourly');
    RAISE NOTICE 'Job antigo removido';
  END IF;
  
  -- Criar novo job com o schedule correto
  PERFORM cron.schedule(
    'process-commission-status-hourly',
    v_cron_schedule,
    $INNER$
    SELECT
      net.http_post(
          url:='https://adpnzkvzvjbervzrqhhx.supabase.co/functions/v1/process-commission-status',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkcG56a3Z6dmpiZXJ2enJxaGh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MDAzODYsImV4cCI6MjA3OTA3NjM4Nn0.N7gETUDWj95yDCYdZTYWPoMJQcdx_Yjl51jxK-O1vrE"}'::jsonb,
          body:=concat('{"triggered_at": "', now(), '"}')::jsonb
      ) as request_id;
    $INNER$
  );
  
  RAISE NOTICE '✅ Cron job criado com sucesso!';
END $OUTER$;

-- Verificar o job criado
SELECT 
  jobname, 
  schedule,
  CASE 
    WHEN schedule = '0 * * * *' THEN 'A cada hora'
    WHEN schedule LIKE '0 0 * * *' THEN 'Meia-noite (00:00)'
    WHEN schedule LIKE '0 6 * * *' THEN 'Às 6h da manhã'
    ELSE 'Horário: ' || schedule
  END as descricao
FROM cron.job 
WHERE jobname = 'process-commission-status-hourly';
