-- Função para gerar comissões multi-nível a partir de pagamentos unificados
CREATE OR REPLACE FUNCTION public.generate_commission_from_unified_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_commission_percentage INTEGER;
  v_subscription_id UUID;
  v_product_name TEXT;
  v_external_user_id UUID;
  v_affiliate_record RECORD;
  v_level_percentage INTEGER;
  v_commission_amount NUMERIC;
BEGIN
  -- Buscar percentual de comissão do plano
  SELECT commission_percentage INTO v_plan_commission_percentage
  FROM public.plans WHERE id = NEW.plan_id;
  
  -- Se não encontrou plano ou percentual é 0, não gera comissão
  IF v_plan_commission_percentage IS NULL OR v_plan_commission_percentage = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Buscar o external_user_id do usuário unificado
  SELECT external_user_id INTO v_external_user_id
  FROM public.unified_users
  WHERE id = NEW.unified_user_id;
  
  -- Se não tem external_user_id, não gera comissão
  IF v_external_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Buscar o subscription_id se for um pagamento local (APP Renda recorrente)
  SELECT p.subscription_id INTO v_subscription_id
  FROM public.payments p
  WHERE p.id = NEW.external_payment_id;
  
  -- Buscar nome do produto para o log
  SELECT nome INTO v_product_name
  FROM public.products 
  WHERE id = NEW.product_id;
  
  -- Gerar comissões para todos os níveis da hierarquia
  FOR v_affiliate_record IN 
    SELECT 
      sa.parent_affiliate_id,
      sa.level,
      prof.name as affiliate_name
    FROM public.sub_affiliates sa
    JOIN public.profiles prof ON prof.id = sa.parent_affiliate_id
    WHERE sa.sub_affiliate_id = v_external_user_id
    ORDER BY sa.level ASC
  LOOP
    -- Log do plan_id e level para debug
    RAISE NOTICE 'Buscando comissão - Plan ID: %, Level: %', NEW.plan_id, v_affiliate_record.level;
    
    -- Buscar percentual de comissão para o nível e plano específico
    SELECT percentage INTO v_level_percentage
    FROM public.plan_commission_levels
    WHERE plan_id = NEW.plan_id
      AND level = v_affiliate_record.level
      AND is_active = true
    LIMIT 1;
    
    -- Log do resultado da busca
    RAISE NOTICE 'Percentual encontrado: %', v_level_percentage;
    
    -- Se não encontrou percentual para este nível, pula
    IF v_level_percentage IS NULL OR v_level_percentage = 0 THEN
      CONTINUE;
    END IF;
    
    -- Calcular valor da comissão para este nível
    v_commission_amount := (NEW.amount * v_level_percentage) / 100;
    
    -- Inserir comissão para este nível
    INSERT INTO public.commissions (
      affiliate_id,
      subscription_id,
      product_id,
      unified_payment_id,
      unified_user_id,
      amount,
      percentage,
      level,
      commission_type,
      status,
      payment_date,
      reference_month,
      notes
    ) VALUES (
      v_affiliate_record.parent_affiliate_id,
      v_subscription_id,
      NEW.product_id,
      NEW.id,
      NEW.unified_user_id,
      v_commission_amount,
      v_level_percentage,
      v_affiliate_record.level,
      CASE 
        WHEN NEW.billing_reason = 'subscription_create' THEN 'primeira_venda'
        ELSE 'renovacao'
      END,
      'pending',
      NEW.payment_date,
      DATE_TRUNC('month', NEW.payment_date)::DATE,
      'Comissão N' || v_affiliate_record.level || ' - Produto: ' || 
      v_product_name || 
      ' - Invoice: ' || COALESCE(NEW.stripe_invoice_id, 'N/A')
    );
    
    -- Log da comissão gerada
    RAISE NOTICE 'Comissão N% gerada: Afiliado % (%), Valor %', 
      v_affiliate_record.level,
      v_affiliate_record.parent_affiliate_id,
      v_affiliate_record.affiliate_name,
      v_commission_amount;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para gerar comissão automaticamente
DROP TRIGGER IF EXISTS tr_generate_commission_from_unified_payment ON public.unified_payments;

CREATE TRIGGER tr_generate_commission_from_unified_payment
  AFTER INSERT ON public.unified_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_commission_from_unified_payment();

COMMENT ON FUNCTION public.generate_commission_from_unified_payment() IS 
  'Gera comissões automaticamente quando um pagamento unificado é inserido, baseado no referrer_code do usuário';
