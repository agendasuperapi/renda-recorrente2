-- Trigger para sincronizar dados de subscription do APP Renda recorrente na tabela unified_users
-- Este trigger é acionado quando uma subscription é criada ou atualizada
-- ID do produto APP Renda recorrente: bb582482-b006-47b8-b6ea-a6944d8cfdfd

CREATE OR REPLACE FUNCTION public.sync_subscription_to_unified_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product_id UUID := 'bb582482-b006-47b8-b6ea-a6944d8cfdfd'; -- APP Renda recorrente
BEGIN
  -- Atualizar unified_users com dados da subscription
  UPDATE public.unified_users
  SET 
    environment = NEW.environment,
    plan_id = NEW.plan_id,
    cancel_at_period_end = NEW.cancel_at_period_end,
    trial_end = NEW.trial_end,
    status = NEW.status,
    current_period_start = NEW.current_period_start,
    current_period_end = NEW.current_period_end,
    updated_at = now()
  WHERE external_user_id = NEW.user_id
    AND product_id = v_product_id;
  
  RAISE NOTICE 'Subscription sincronizada para unified_users: User %, Status %', 
    NEW.user_id, NEW.status;
  
  RETURN NEW;
END;
$$;

-- Criar o trigger para INSERT e UPDATE em subscriptions
DROP TRIGGER IF EXISTS tr_sync_subscription_to_unified ON public.subscriptions;

CREATE TRIGGER tr_sync_subscription_to_unified
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_subscription_to_unified_users();

COMMENT ON FUNCTION public.sync_subscription_to_unified_users() IS 
  'Sincroniza automaticamente dados de subscriptions do APP Renda recorrente na tabela unified_users';
