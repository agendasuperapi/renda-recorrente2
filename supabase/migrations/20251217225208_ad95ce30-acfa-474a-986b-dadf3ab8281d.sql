
CREATE OR REPLACE FUNCTION public.notify_new_commission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_product_name TEXT;
  v_billing_reason TEXT;
  v_purchase_number INTEGER;
  v_type_text TEXT;
  v_unified_user_id UUID;
  v_product_id UUID;
  v_payment_date TIMESTAMPTZ;
  v_body TEXT;
  v_amount_formatted TEXT;
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
  
  -- Formatar valor no padrão brasileiro (0,00)
  v_amount_formatted := REPLACE(TO_CHAR(NEW.amount, 'FM990D00'), '.', ',');
  
  -- Construir corpo da mensagem com quebras de linha
  v_body := 'Você recebeu R$ ' || v_amount_formatted || ' de comissão';
  
  IF v_type_text IS NOT NULL THEN
    v_body := v_body || chr(10) || v_type_text;
  END IF;
  
  IF v_product_name IS NOT NULL THEN
    v_body := v_body || chr(10) || v_product_name;
  END IF;
  
  PERFORM send_push_notification(
    NEW.affiliate_id,
    'Nova Comissão! 🎉',
    v_body,
    'new_commission',
    NEW.id,
    'commission',
    '/user/commissions'
  );
  
  RETURN NEW;
END;
$function$;
