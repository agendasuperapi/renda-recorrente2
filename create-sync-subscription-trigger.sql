-- Trigger para sincronizar dados de subscription do APP Renda recorrente na tabela unified_users
-- Este trigger é acionado quando uma subscription é criada ou atualizada

CREATE OR REPLACE FUNCTION public.sync_subscription_to_unified_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product_id UUID;
BEGIN
  -- Buscar o product_id do APP Renda recorrente
  SELECT id INTO v_product_id
  FROM public.products
  WHERE nome = 'APP Renda recorrente'
  LIMIT 1;
  
  IF v_product_id IS NULL THEN
    RAISE NOTICE 'Produto APP Renda recorrente não encontrado';
    RETURN NEW;
  END IF;
  
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
