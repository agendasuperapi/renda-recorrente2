-- Atualizar função para buscar dados de deleted_users quando profile não existe
CREATE OR REPLACE FUNCTION public.sync_local_payment_to_unified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product_id UUID := 'bb582482-b006-47b8-b6ea-a6944d8cfdfd'; -- APP Renda recorrente
  v_unified_user_id UUID;
  v_user_name TEXT;
  v_user_email TEXT;
  v_user_phone TEXT;
  v_user_cpf TEXT;
  v_user_affiliate_code TEXT;
  v_affiliate_id UUID;
  -- Variáveis individuais para subscription
  v_sub_plan_id UUID;
  v_sub_status TEXT;
  v_sub_environment TEXT;
  v_sub_cancel_at_period_end BOOLEAN;
  v_sub_trial_end TIMESTAMPTZ;
  v_sub_current_period_start TIMESTAMPTZ;
  v_sub_current_period_end TIMESTAMPTZ;
BEGIN
  -- Buscar informações do usuário do profile
  SELECT 
    p.name,
    p.email,
    p.phone,
    p.cpf,
    p.affiliate_code
  INTO v_user_name, v_user_email, v_user_phone, v_user_cpf, v_user_affiliate_code
  FROM public.profiles p
  WHERE p.id = NEW.user_id;
  
  -- Se não encontrou email no profile (usuário excluído), buscar em deleted_users
  IF v_user_email IS NULL THEN
    SELECT 
      du.name,
      du.email
    INTO v_user_name, v_user_email
    FROM public.deleted_users du
    WHERE du.user_id = NEW.user_id
    ORDER BY du.deleted_at DESC
    LIMIT 1;
  END IF;
  
  -- Se ainda não tem email, usar um placeholder para não violar constraint
  IF v_user_email IS NULL THEN
    v_user_email := 'deleted_' || NEW.user_id || '@deleted.local';
    v_user_name := COALESCE(v_user_name, '##EXCLUÍDO##');
  END IF;
  
  -- Se o usuário tem affiliate_id no payment, usar ele
  -- Senão, buscar pelo affiliate_code na tabela profiles
  v_affiliate_id := NEW.affiliate_id;
  
  IF v_affiliate_id IS NULL AND v_user_affiliate_code IS NOT NULL THEN
    SELECT id INTO v_affiliate_id
    FROM public.profiles
    WHERE affiliate_code = v_user_affiliate_code
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
    v_user_name,
    v_user_email,
    v_user_phone,
    v_user_cpf,
    v_user_affiliate_code,
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
    name = COALESCE(NULLIF(EXCLUDED.name, '##EXCLUÍDO##'), unified_users.name),
    email = COALESCE(NULLIF(EXCLUDED.email, 'deleted_' || NEW.user_id || '@deleted.local'), unified_users.email),
    phone = COALESCE(EXCLUDED.phone, unified_users.phone),
    cpf = COALESCE(EXCLUDED.cpf, unified_users.cpf),
    affiliate_code = COALESCE(EXCLUDED.affiliate_code, unified_users.affiliate_code),
    affiliate_id = COALESCE(EXCLUDED.affiliate_id, unified_users.affiliate_id),
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
    NEW.id,
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
  
  RETURN NEW;
END;
$$;

-- Corrigir o registro específico que está com erro
-- Inserir manualmente o unified_user com dados do deleted_users
INSERT INTO public.unified_users (
  external_user_id,
  product_id,
  name,
  email,
  environment,
  plan_id,
  status,
  created_at,
  updated_at
) VALUES (
  '92133a76-00aa-4217-a6a1-a6661526f917',
  'bb582482-b006-47b8-b6ea-a6944d8cfdfd',
  'Heron teste 35',
  'heronteste35@testex.com',
  'test',
  'ac9a1765-47ea-4ffe-9d22-0a49720b3884',
  'canceled',
  now(),
  now()
)
ON CONFLICT (external_user_id, product_id)
DO UPDATE SET
  name = 'Heron teste 35',
  email = 'heronteste35@testex.com',
  updated_at = now();

-- Inserir o unified_payment
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
  environment,
  created_at
) 
SELECT 
  '91db70bf-56ac-4883-8030-368fc4cecc55',
  u.id,
  'bb582482-b006-47b8-b6ea-a6944d8cfdfd',
  'ac9a1765-47ea-4ffe-9d22-0a49720b3884',
  'in_1SibbsCpvrjOSJAvWvpByL83',
  'sub_1SXjEpCpvrjOSJAvpxNopFk2',
  478.8,
  'brl',
  'subscription_update',
  'paid',
  '2025-12-26 14:03:16+00',
  'test',
  now()
FROM public.unified_users u
WHERE u.external_user_id = '92133a76-00aa-4217-a6a1-a6661526f917'
  AND u.product_id = 'bb582482-b006-47b8-b6ea-a6944d8cfdfd'
ON CONFLICT (external_payment_id, product_id)
DO NOTHING;

-- Atualizar o status de sync do payment original
UPDATE public.payments
SET 
  sync_status = 'synced',
  sync_response = 'Sincronizado manualmente - usuário excluído',
  synced_at = now()
WHERE stripe_invoice_id = 'in_1SibbsCpvrjOSJAvWvpByL83';