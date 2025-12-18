
-- Atualizar função de notificação de pagamento para formato igual à de comissão
CREATE OR REPLACE FUNCTION public.notify_new_unified_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_name TEXT;
  v_product_name TEXT;
  v_billing_reason TEXT;
  v_purchase_number INTEGER;
  v_type_text TEXT;
  v_body TEXT;
  v_amount_formatted TEXT;
BEGIN
  -- Não notificar pagamentos de trial (amount <= 0)
  IF NEW.amount <= 0 THEN
    RETURN NEW;
  END IF;

  -- Buscar nome do usuário unificado
  SELECT name INTO v_user_name FROM unified_users WHERE id = NEW.unified_user_id;
  
  -- Buscar nome do produto
  SELECT nome INTO v_product_name FROM products WHERE id = NEW.product_id;
  
  -- Billing reason já está no NEW
  v_billing_reason := NEW.billing_reason;
  
  -- Calcular purchase_number para vendas avulsas
  IF v_billing_reason IN ('one_time_purchase', 'venda_avulsa') THEN
    SELECT COUNT(*) INTO v_purchase_number
    FROM unified_payments up2 
    WHERE up2.unified_user_id = NEW.unified_user_id 
    AND up2.product_id = NEW.product_id
    AND (up2.billing_reason = 'one_time_purchase' OR up2.billing_reason = 'venda_avulsa')
    AND up2.payment_date <= NEW.payment_date;
  END IF;
  
  -- Determinar texto do tipo de cliente (igual à comissão)
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
  
  -- Construir corpo da mensagem com quebras de linha (igual à comissão)
  v_body := COALESCE(v_user_name, 'Usuário');
  
  IF v_type_text IS NOT NULL THEN
    v_body := v_body || ' ' || v_type_text;
  END IF;
  
  v_body := v_body || chr(10) || 'R$ ' || v_amount_formatted;
  
  IF v_product_name IS NOT NULL THEN
    v_body := v_body || chr(10) || v_product_name;
  END IF;
  
  -- Enviar notificação para admins (respeitando preferência de produtos)
  PERFORM send_admin_notification_with_product_filter(
    'Novo Pagamento! 💳',
    v_body,
    'new_payment',
    NEW.id,
    'unified_payment',
    '/admin/stripe?tab=payments',
    NEW.product_id
  );
  
  RETURN NEW;
END;
$function$;
