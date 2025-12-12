-- Remove unused commission_percentage column from plans table
-- Commission percentage is now determined by product_commission_levels table
-- using the combination of product_id + plan_type (FREE/PRO) + level

-- Remove the column from plans table
ALTER TABLE public.plans DROP COLUMN IF EXISTS commission_percentage;

-- Update the generate_commission_from_unified_payment function to remove the unused variable
CREATE OR REPLACE FUNCTION public.generate_commission_from_unified_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_subscription_id UUID;
  v_product_name TEXT;
  v_external_user_id TEXT;
  v_affiliate_record RECORD;
  v_level_percentage INTEGER;
  v_commission_amount NUMERIC;
  v_affiliate_plan_type TEXT;
  v_affiliate_is_free BOOLEAN;
  v_commission_generated BOOLEAN := FALSE;
  v_commissions_count INTEGER := 0;
  v_error_message TEXT;
BEGIN
  -- Buscar o external_user_id do usuário unificado
  SELECT external_user_id INTO v_external_user_id
  FROM public.unified_users
  WHERE id = NEW.unified_user_id;
  
  -- Buscar o subscription_id se for um pagamento local (APP Renda recorrente)
  SELECT p.subscription_id INTO v_subscription_id
  FROM public.payments p
  WHERE p.id::text = NEW.external_payment_id;
  
  -- Buscar nome do produto para o log
  SELECT nome INTO v_product_name
  FROM public.products 
  WHERE id = NEW.product_id;
  
  -- Gerar comissões para todos os níveis da hierarquia (se existir)
  IF v_external_user_id IS NOT NULL THEN
    FOR v_affiliate_record IN 
      SELECT 
        sa.parent_affiliate_id,
        sa.level,
        prof.name as affiliate_name
      FROM public.sub_affiliates sa
      JOIN public.profiles prof ON prof.id = sa.parent_affiliate_id
      WHERE sa.sub_affiliate_id::text = v_external_user_id
      ORDER BY sa.level ASC
    LOOP
      -- Verificar se o afiliado é FREE ou PRO
      SELECT p.is_free INTO v_affiliate_is_free
      FROM public.subscriptions s
      JOIN public.plans p ON p.id = s.plan_id
      WHERE s.user_id = v_affiliate_record.parent_affiliate_id
        AND s.status IN ('active', 'trialing')
      ORDER BY s.created_at DESC
      LIMIT 1;
      
      -- Se não tem plano ativo, considerar como FREE
      IF v_affiliate_is_free IS NULL THEN
        v_affiliate_is_free := TRUE;
      END IF;
      
      -- Definir o tipo de plano
      v_affiliate_plan_type := CASE WHEN v_affiliate_is_free = true THEN 'FREE' ELSE 'PRO' END;
      
      -- Log do tipo do afiliado
      RAISE NOTICE 'Afiliado %, Tipo: %, Level: %', 
        v_affiliate_record.parent_affiliate_id, v_affiliate_plan_type, v_affiliate_record.level;
      
      -- Buscar percentual de comissão na tabela product_commission_levels
      SELECT percentage INTO v_level_percentage
      FROM public.product_commission_levels
      WHERE product_id = NEW.product_id
        AND plan_type = v_affiliate_plan_type
        AND level = v_affiliate_record.level
        AND is_active = true
      LIMIT 1;
      
      -- Log do resultado da busca
      RAISE NOTICE 'Percentual encontrado: % (Produto: %, Tipo: %, Level: %)', 
        v_level_percentage, NEW.product_id, v_affiliate_plan_type, v_affiliate_record.level;
      
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
          WHEN NEW.billing_reason = 'one_time_purchase' THEN 'venda_avulsa'
          ELSE 'renovacao'
        END,
        'pending',
        NEW.payment_date,
        DATE_TRUNC('month', NEW.payment_date)::DATE,
        'Comissão N' || v_affiliate_record.level || ' (' || v_affiliate_plan_type || ') - Produto: ' || 
        COALESCE(v_product_name, 'N/A') || 
        ' - Invoice: ' || COALESCE(NEW.stripe_invoice_id, 'N/A')
      );
      
      v_commission_generated := TRUE;
      v_commissions_count := v_commissions_count + 1;
      
      -- Log da comissão gerada
      RAISE NOTICE 'Comissão N% gerada: Afiliado % (%), Tipo %, Valor %', 
        v_affiliate_record.level,
        v_affiliate_record.parent_affiliate_id,
        v_affiliate_record.affiliate_name,
        v_affiliate_plan_type,
        v_commission_amount;
    END LOOP;
  END IF;
  
  -- FALLBACK: Se não encontrou hierarquia em sub_affiliates MAS o pagamento tem affiliate_id,
  -- gerar comissão de nível 1 diretamente para o afiliado
  IF NOT v_commission_generated AND NEW.affiliate_id IS NOT NULL THEN
    RAISE NOTICE 'Nenhuma hierarquia encontrada, usando affiliate_id direto: %', NEW.affiliate_id;
    
    -- Verificar se o afiliado é FREE ou PRO
    SELECT p.is_free INTO v_affiliate_is_free
    FROM public.subscriptions s
    JOIN public.plans p ON p.id = s.plan_id
    WHERE s.user_id = NEW.affiliate_id
      AND s.status IN ('active', 'trialing')
    ORDER BY s.created_at DESC
    LIMIT 1;
    
    -- Se não tem plano ativo, considerar como FREE
    IF v_affiliate_is_free IS NULL THEN
      v_affiliate_is_free := TRUE;
    END IF;
    
    -- Definir o tipo de plano
    v_affiliate_plan_type := CASE WHEN v_affiliate_is_free = true THEN 'FREE' ELSE 'PRO' END;
    
    RAISE NOTICE 'Tipo do afiliado para comissão direta: %', v_affiliate_plan_type;
    
    -- Buscar percentual de comissão nível 1 da tabela
    SELECT percentage INTO v_level_percentage
    FROM public.product_commission_levels
    WHERE product_id = NEW.product_id
      AND plan_type = v_affiliate_plan_type
      AND level = 1
      AND is_active = true
    LIMIT 1;
    
    RAISE NOTICE 'Percentual nível 1 encontrado: %', v_level_percentage;
    
    -- Se encontrou percentual, gerar comissão
    IF v_level_percentage IS NOT NULL AND v_level_percentage > 0 THEN
      v_commission_amount := (NEW.amount * v_level_percentage) / 100;
      
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
        NEW.affiliate_id,
        v_subscription_id,
        NEW.product_id,
        NEW.id,
        NEW.unified_user_id,
        v_commission_amount,
        v_level_percentage,
        1,
        CASE 
          WHEN NEW.billing_reason = 'subscription_create' THEN 'primeira_venda'
          WHEN NEW.billing_reason = 'one_time_purchase' THEN 'venda_avulsa'
          ELSE 'renovacao'
        END,
        'pending',
        NEW.payment_date,
        DATE_TRUNC('month', NEW.payment_date)::DATE,
        'Comissão N1 (' || v_affiliate_plan_type || ') (direto) - Produto: ' || 
        COALESCE(v_product_name, 'N/A') || 
        ' - Invoice: ' || COALESCE(NEW.stripe_invoice_id, 'N/A')
      );
      
      v_commissions_count := v_commissions_count + 1;
      
      RAISE NOTICE 'Comissão N1 (direta) gerada para afiliado %: R$ %', NEW.affiliate_id, v_commission_amount;
    ELSE
      RAISE NOTICE 'Nenhum percentual de comissão encontrado para produto % tipo % nível 1', NEW.product_id, v_affiliate_plan_type;
    END IF;
  END IF;
  
  -- Atualizar campos de rastreamento com sucesso
  UPDATE public.unified_payments
  SET 
    commission_processed = TRUE,
    commission_processed_at = now(),
    commissions_generated = v_commissions_count,
    commission_error = NULL
  WHERE id = NEW.id;
  
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  -- Capturar erro e salvar no campo commission_error
  GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
  
  UPDATE public.unified_payments
  SET 
    commission_processed = FALSE,
    commission_processed_at = now(),
    commissions_generated = v_commissions_count,
    commission_error = v_error_message
  WHERE id = NEW.id;
  
  RAISE WARNING 'Erro ao processar comissão para pagamento %: %', NEW.id, v_error_message;
  
  RETURN NEW;
END;
$function$;