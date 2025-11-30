-- Criar função para reconfigurar o cron job automaticamente
-- Esta função busca a configuração do banco e reconfigura o job

CREATE OR REPLACE FUNCTION reconfigure_commission_cron()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schedule_config TEXT;
  v_cron_schedule TEXT;
  v_result jsonb;
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
  
  -- Remover job existente se houver
  BEGIN
    PERFORM cron.unschedule('process-commission-status-hourly');
  EXCEPTION WHEN OTHERS THEN
    -- Ignorar erro se o job não existir
    NULL;
  END;
  
  -- Criar novo job com o schedule correto
  PERFORM cron.schedule(
    'process-commission-status-hourly',
    v_cron_schedule,
    $$
    SELECT
      net.http_post(
          url:='https://adpnzkvzvjbervzrqhhx.supabase.co/functions/v1/process-commission-status',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkcG56a3Z6dmpiZXJ2enJxaGh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MDAzODYsImV4cCI6MjA3OTA3NjM4Nn0.N7gETUDWj95yDCYdZTYWPoMJQcdx_Yjl51jxK-O1vrE"}'::jsonb,
          body:=concat('{"triggered_at": "', now(), '"}')::jsonb
      ) as request_id;
    $$
  );
  
  -- Retornar resultado
  v_result := jsonb_build_object(
    'success', true,
    'schedule', v_cron_schedule,
    'config', v_schedule_config
  );
  
  RETURN v_result;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION reconfigure_commission_cron() TO authenticated;
GRANT EXECUTE ON FUNCTION reconfigure_commission_cron() TO service_role;
