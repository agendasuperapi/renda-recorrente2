-- Corrigir função de notificação de nova comissão
-- Calcular purchase_number inline em vez de buscar da tabela
CREATE OR REPLACE FUNCTION public.notify_new_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_name TEXT;
  v_billing_reason TEXT;
  v_purchase_number INTEGER;
  v_type_text TEXT;
  v_unified_user_id UUID;
  v_product_id UUID;
  v_payment_date TIMESTAMPTZ;
BEGIN
  -- Buscar nome do produto
  SELECT nome INTO v_product_name FROM products WHERE id = NEW.product_id;
  
  -- Buscar dados do pagamento
  SELECT up.billing_reason, up.unified_user_id, up.product_id, up.payment_date
  INTO v_billing_reason, v_unified_user_id, v_product_id, v_payment_date
  FROM unified_payments up 
  WHERE up.id = NEW.unified_payment_id;
  
  -- Calcular purchase_number para vendas avulsas
  IF v_billing_reason IN ('one_time_purchase', 'venda_avulsa') THEN
    SELECT COUNT(*) INTO v_purchase_number
    FROM unified_payments up2 
    WHERE up2.unified_user_id = v_unified_user_id 
    AND up2.product_id = v_product_id
    AND (up2.billing_reason = 'one_time_purchase' OR up2.billing_reason = 'venda_avulsa')
    AND up2.payment_date <= v_payment_date;
  END IF;
  
  -- Determinar texto do tipo de cliente
  v_type_text := CASE
    WHEN v_billing_reason IN ('subscription_create', 'primeira_venda') THEN '✨ Novo'
    WHEN v_billing_reason IN ('subscription_cycle', 'renovacao') THEN '🔄 Renovação'
    WHEN v_billing_reason IN ('one_time_purchase', 'venda_avulsa') THEN
      CASE
        WHEN v_purchase_number = 1 THEN '✨ 1ª compra'
        WHEN v_purchase_number IS NOT NULL THEN v_purchase_number || 'ª compra'
        ELSE NULL
      END
    ELSE NULL
  END;
  
  PERFORM send_push_notification(
    NEW.affiliate_id,
    'Nova Comissão! 🎉',
    'Você recebeu R$ ' || TO_CHAR(NEW.amount, 'FM999G999D00') || ' de comissão' || 
    CASE WHEN v_type_text IS NOT NULL THEN ' (' || v_type_text || ')' ELSE '' END ||
    CASE WHEN v_product_name IS NOT NULL THEN ' - ' || v_product_name ELSE '' END,
    'new_commission',
    NEW.id,
    'commission',
    '/user/commissions'
  );
  
  RETURN NEW;
END;
$$;