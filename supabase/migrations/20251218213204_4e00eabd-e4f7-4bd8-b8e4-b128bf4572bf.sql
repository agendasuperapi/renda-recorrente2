-- 1. Adicionar coluna de preferência de produtos
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS new_payment_all_products boolean DEFAULT true;

COMMENT ON COLUMN notification_preferences.new_payment_all_products IS 
'true = Receber notificações de todos os produtos, false = Apenas APP Renda Recorrente';

-- 2. Criar função helper para enviar notificação de admin com filtro de produto
CREATE OR REPLACE FUNCTION public.send_admin_notification_with_product_filter(
  p_title TEXT,
  p_body TEXT,
  p_type TEXT,
  p_reference_id UUID,
  p_reference_type TEXT,
  p_action_url TEXT,
  p_product_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_id UUID;
  v_renda_product_id UUID := 'bb582482-b006-47b8-b6ea-a6944d8cfdfd';
  v_all_products BOOLEAN;
BEGIN
  FOR v_admin_id IN 
    SELECT user_id FROM user_roles WHERE role = 'super_admin'
  LOOP
    -- Verificar preferência de produtos do admin
    SELECT COALESCE(new_payment_all_products, true) INTO v_all_products
    FROM notification_preferences 
    WHERE user_id = v_admin_id;
    
    -- Se não encontrou preferência, considerar como true (receber todos)
    IF v_all_products IS NULL THEN
      v_all_products := true;
    END IF;
    
    -- Se preferência é só Renda Recorrente e não é esse produto, pular
    IF v_all_products = false AND p_product_id != v_renda_product_id THEN
      CONTINUE;
    END IF;
    
    PERFORM send_push_notification(
      v_admin_id,
      p_title,
      p_body,
      p_type,
      p_reference_id,
      p_reference_type,
      p_action_url
    );
  END LOOP;
END;
$function$;

-- 3. Criar nova função de notificação para unified_payments (CENTRALIZADA)
CREATE OR REPLACE FUNCTION public.notify_new_unified_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_name TEXT;
  v_product_name TEXT;
BEGIN
  -- Não notificar pagamentos de trial (amount <= 0)
  IF NEW.amount <= 0 THEN
    RETURN NEW;
  END IF;

  -- Buscar nome do usuário unificado
  SELECT name INTO v_user_name FROM unified_users WHERE id = NEW.unified_user_id;
  
  -- Buscar nome do produto
  SELECT nome INTO v_product_name FROM products WHERE id = NEW.product_id;
  
  -- Enviar notificação para admins (respeitando preferência de produtos)
  PERFORM send_admin_notification_with_product_filter(
    'Novo Pagamento! 💳',
    COALESCE(v_user_name, 'Usuário') || ' - R$ ' || TO_CHAR(NEW.amount, 'FM999G999D00') || 
    CASE WHEN v_product_name IS NOT NULL THEN ' - ' || v_product_name ELSE '' END,
    'new_payment',
    NEW.id,
    'unified_payment',
    '/admin/stripe?tab=payments',
    NEW.product_id
  );
  
  RETURN NEW;
END;
$function$;

-- 4. Criar trigger na unified_payments
DROP TRIGGER IF EXISTS trigger_notify_new_unified_payment ON unified_payments;
CREATE TRIGGER trigger_notify_new_unified_payment
AFTER INSERT ON unified_payments
FOR EACH ROW EXECUTE FUNCTION notify_new_unified_payment();

-- 5. Remover trigger antigo da tabela payments para evitar duplicação
DROP TRIGGER IF EXISTS trigger_notify_new_payment ON payments;

-- 6. Remover função antiga (opcional, mas mantendo limpeza)
DROP FUNCTION IF EXISTS notify_new_payment();