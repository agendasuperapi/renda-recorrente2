-- Atualizar função de notificação de nova comissão para incluir tipo de cliente
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
BEGIN
  -- Buscar nome do produto
  SELECT nome INTO v_product_name FROM products WHERE id = NEW.product_id;
  
  -- Buscar billing_reason e purchase_number do pagamento
  SELECT up.billing_reason, up.purchase_number 
  INTO v_billing_reason, v_purchase_number
  FROM unified_payments up 
  WHERE up.id = NEW.unified_payment_id;
  
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