-- Trigger para sincronizar vendas locais do APP Renda recorrente nas tabelas unificadas
-- Este trigger é acionado quando um pagamento é inserido na tabela payments

CREATE OR REPLACE FUNCTION public.sync_local_payment_to_unified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product_id UUID;
  v_unified_user_id UUID;
  v_user_profile RECORD;
  v_affiliate_id UUID;
BEGIN
  -- Buscar o product_id do APP Renda recorrente
  SELECT id INTO v_product_id
  FROM public.products
  WHERE nome = 'APP Renda recorrente'
  LIMIT 1;
  
  -- Se não encontrou o produto, retornar
  IF v_product_id IS NULL THEN
    RAISE NOTICE 'Produto APP Renda recorrente não encontrado';
    RETURN NEW;
  END IF;
  
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
  
  -- Log do sync
  RAISE NOTICE 'Pagamento local sincronizado: User %, Payment %, Produto %', 
    NEW.user_id, NEW.id, v_product_id;
  
  RETURN NEW;
END;
$$;

-- Criar o trigger
DROP TRIGGER IF EXISTS tr_sync_local_payment_to_unified ON public.payments;

CREATE TRIGGER tr_sync_local_payment_to_unified
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_local_payment_to_unified();

COMMENT ON FUNCTION public.sync_local_payment_to_unified() IS 
  'Sincroniza automaticamente pagamentos locais do APP Renda recorrente nas tabelas unified_users e unified_payments';
