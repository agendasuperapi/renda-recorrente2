-- Add sync tracking fields to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'pending'::text,
ADD COLUMN IF NOT EXISTS sync_response text,
ADD COLUMN IF NOT EXISTS synced_at timestamp with time zone;

-- Add index for sync_status for efficient querying
CREATE INDEX IF NOT EXISTS idx_payments_sync_status ON public.payments(sync_status);

-- Update the sync_local_payment_to_unified function to update these fields
CREATE OR REPLACE FUNCTION public.sync_local_payment_to_unified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_product_id UUID := 'bb582482-b006-47b8-b6ea-a6944d8cfdfd'; -- APP Renda recorrente
  v_unified_user_id UUID;
  v_user_profile RECORD;
  v_affiliate_id UUID;
  v_sub_plan_id UUID;
  v_sub_status TEXT;
  v_sub_environment TEXT;
  v_sub_cancel_at_period_end BOOLEAN;
  v_sub_trial_end TIMESTAMPTZ;
  v_sub_current_period_start TIMESTAMPTZ;
  v_sub_current_period_end TIMESTAMPTZ;
  v_error_message TEXT;
BEGIN
  -- Buscar informações do usuário
  SELECT 
    p.id,
    p.name,
    p.email,
    p.phone,
    p.cpf,
    p.affiliate_code
  INTO v_user_profile
  FROM public.profiles p
  WHERE p.id = NEW.user_id;
  
  -- Se o usuário tem affiliate_id no payment, usar ele
  -- Senão, buscar pelo affiliate_code na tabela profiles
  v_affiliate_id := NEW.affiliate_id;
  
  IF v_affiliate_id IS NULL AND v_user_profile.affiliate_code IS NOT NULL THEN
    SELECT id INTO v_affiliate_id
    FROM public.profiles
    WHERE affiliate_code = v_user_profile.affiliate_code
    LIMIT 1;
  END IF;
  
  -- Buscar dados da subscription se existir
  IF NEW.subscription_id IS NOT NULL THEN
    SELECT 
      s.plan_id,
      s.status,
      s.environment,
      s.cancel_at_period_end,
      s.trial_end,
      s.current_period_start,
      s.current_period_end
    INTO 
      v_sub_plan_id,
      v_sub_status,
      v_sub_environment,
      v_sub_cancel_at_period_end,
      v_sub_trial_end,
      v_sub_current_period_start,
      v_sub_current_period_end
    FROM public.subscriptions s
    WHERE s.id = NEW.subscription_id;
  END IF;
  
  -- Inserir ou atualizar unified_users
  INSERT INTO public.unified_users (
    external_user_id,
    product_id,
    name,
    email,
    phone,
    cpf,
    affiliate_code,
    affiliate_id,
    environment,
    plan_id,
    cancel_at_period_end,
    trial_end,
    status,
    current_period_start,
    current_period_end,
    created_at,
    updated_at
  ) VALUES (
    NEW.user_id,
    v_product_id,
    v_user_profile.name,
    v_user_profile.email,
    v_user_profile.phone,
    v_user_profile.cpf,
    v_user_profile.affiliate_code,
    v_affiliate_id,
    COALESCE(v_sub_environment, NEW.environment, 'production'),
    COALESCE(v_sub_plan_id, NEW.plan_id),
    COALESCE(v_sub_cancel_at_period_end, false),
    v_sub_trial_end,
    COALESCE(v_sub_status, 'active'),
    v_sub_current_period_start,
    v_sub_current_period_end,
    now(),
    now()
  )
  ON CONFLICT (external_user_id, product_id)
  DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    cpf = EXCLUDED.cpf,
    affiliate_code = EXCLUDED.affiliate_code,
    affiliate_id = EXCLUDED.affiliate_id,
    environment = COALESCE(EXCLUDED.environment, unified_users.environment),
    plan_id = COALESCE(EXCLUDED.plan_id, unified_users.plan_id),
    cancel_at_period_end = COALESCE(EXCLUDED.cancel_at_period_end, unified_users.cancel_at_period_end),
    trial_end = COALESCE(EXCLUDED.trial_end, unified_users.trial_end),
    status = COALESCE(EXCLUDED.status, unified_users.status),
    current_period_start = COALESCE(EXCLUDED.current_period_start, unified_users.current_period_start),
    current_period_end = COALESCE(EXCLUDED.current_period_end, unified_users.current_period_end),
    updated_at = now()
  RETURNING id INTO v_unified_user_id;
  
  -- Inserir em unified_payments
  INSERT INTO public.unified_payments (
    external_payment_id,
    unified_user_id,
    product_id,
    plan_id,
    stripe_invoice_id,
    stripe_subscription_id,
    amount,
    currency,
    billing_reason,
    status,
    payment_date,
    affiliate_id,
    affiliate_coupon_id,
    environment,
    metadata,
    created_at
  ) VALUES (
    NEW.id::text,
    v_unified_user_id,
    v_product_id,
    NEW.plan_id,
    NEW.stripe_invoice_id,
    NEW.stripe_subscription_id,
    NEW.amount,
    NEW.currency,
    NEW.billing_reason,
    NEW.status,
    NEW.payment_date,
    v_affiliate_id,
    NEW.affiliate_coupon_id,
    NEW.environment,
    NEW.metadata,
    now()
  )
  ON CONFLICT (external_payment_id, product_id)
  DO NOTHING;
  
  -- Atualizar status de sincronização no payment
  UPDATE public.payments
  SET 
    sync_status = 'synced',
    sync_response = 'Sincronizado com sucesso para unified_payments',
    synced_at = now()
  WHERE id = NEW.id;
  
  RAISE NOTICE 'Pagamento local sincronizado: User %, Payment %, Produto %', 
    NEW.user_id, NEW.id, v_product_id;
  
  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
  
  -- Atualizar status de erro no payment
  UPDATE public.payments
  SET 
    sync_status = 'error',
    sync_response = v_error_message,
    synced_at = now()
  WHERE id = NEW.id;
  
  RAISE WARNING 'Erro ao sincronizar pagamento %: %', NEW.id, v_error_message;
  
  RETURN NEW;
END;
$function$;

COMMENT ON COLUMN public.payments.sync_status IS 'Status da sincronização com unified_payments: pending, synced, error';
COMMENT ON COLUMN public.payments.sync_response IS 'Mensagem de resposta da sincronização';
COMMENT ON COLUMN public.payments.synced_at IS 'Data/hora da última tentativa de sincronização';