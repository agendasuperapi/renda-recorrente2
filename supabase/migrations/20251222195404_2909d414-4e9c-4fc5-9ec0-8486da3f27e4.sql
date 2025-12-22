-- Update send_push_notification function to include environment parameter
CREATE OR REPLACE FUNCTION public.send_push_notification(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_environment TEXT DEFAULT 'production'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url TEXT;
  v_payload JSONB;
BEGIN
  v_url := 'https://adpnzkvzvjbervzrqhhx.supabase.co/functions/v1/send-push-notification';
  
  v_payload := jsonb_build_object(
    'user_id', p_user_id,
    'title', p_title,
    'body', p_body,
    'type', p_type,
    'reference_id', p_reference_id,
    'reference_type', p_reference_type,
    'action_url', p_action_url,
    'environment', p_environment
  );
  
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkcG56a3Z6dmpiZXJ2enJxaGh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MDAzODYsImV4cCI6MjA3OTA3NjM4Nn0.N7gETUDWj95yDCYdZTYWPoMJQcdx_Yjl51jxK-O1vrE'
    ),
    body := v_payload
  );
END;
$$;

-- Update send_admin_notification function to include environment parameter
CREATE OR REPLACE FUNCTION public.send_admin_notification(
  p_title TEXT,
  p_body TEXT,
  p_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_environment TEXT DEFAULT 'production'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  FOR v_admin_id IN 
    SELECT user_id FROM user_roles WHERE role = 'super_admin'
  LOOP
    PERFORM send_push_notification(
      v_admin_id,
      p_title,
      p_body,
      p_type,
      p_reference_id,
      p_reference_type,
      p_action_url,
      p_environment
    );
  END LOOP;
END;
$$;

-- Update send_admin_notification_with_product_filter to include environment
CREATE OR REPLACE FUNCTION public.send_admin_notification_with_product_filter(
  p_title TEXT,
  p_body TEXT,
  p_type TEXT,
  p_reference_id UUID,
  p_reference_type TEXT,
  p_action_url TEXT,
  p_product_id UUID,
  p_environment TEXT DEFAULT 'production'
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
    SELECT COALESCE(new_payment_all_products, true) INTO v_all_products
    FROM notification_preferences 
    WHERE user_id = v_admin_id;
    
    IF v_all_products IS NULL THEN
      v_all_products := true;
    END IF;
    
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
      p_action_url,
      p_environment
    );
  END LOOP;
END;
$function$;

-- Update notify_new_unified_payment to pass environment
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
BEGIN
  IF NEW.amount <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_user_name FROM unified_users WHERE id = NEW.unified_user_id;
  SELECT nome INTO v_product_name FROM products WHERE id = NEW.product_id;
  
  -- Determine billing reason text
  v_billing_reason := CASE 
    WHEN NEW.billing_reason = 'subscription_create' THEN '🆕 Nova assinatura'
    WHEN NEW.billing_reason = 'subscription_cycle' THEN '🔄 Renovação'
    WHEN NEW.billing_reason = 'one_time_purchase' THEN '💳 Compra única'
    ELSE ''
  END;
  
  PERFORM send_admin_notification_with_product_filter(
    'Novo Pagamento! 💳',
    COALESCE(v_user_name, 'Usuário') || ' ' || v_billing_reason || E'\n' ||
    'R$ ' || REPLACE(TO_CHAR(NEW.amount, 'FM999G999D00'), '.', ',') || E'\n' ||
    COALESCE(v_product_name, ''),
    'new_payment',
    NEW.id,
    'unified_payment',
    '/admin/stripe?tab=payments',
    NEW.product_id,
    COALESCE(NEW.environment, 'production')
  );
  
  RETURN NEW;
END;
$function$;

-- Update notify_new_commission to pass environment from unified_payments
CREATE OR REPLACE FUNCTION public.notify_new_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_name TEXT;
  v_billing_reason TEXT;
  v_environment TEXT := 'production';
BEGIN
  SELECT nome INTO v_product_name FROM products WHERE id = NEW.product_id;
  
  -- Get environment from unified_payment if available
  IF NEW.unified_payment_id IS NOT NULL THEN
    SELECT environment INTO v_environment FROM unified_payments WHERE id = NEW.unified_payment_id;
  END IF;
  
  -- Determine billing reason text based on commission_type
  v_billing_reason := CASE 
    WHEN NEW.commission_type = 'primeira_venda' THEN '🆕 Nova assinatura'
    WHEN NEW.commission_type = 'recorrencia' THEN '🔄 Renovação'
    WHEN NEW.commission_type = 'compra_unica' THEN '💳 Compra única'
    ELSE ''
  END;
  
  PERFORM send_push_notification(
    NEW.affiliate_id,
    'Nova Comissão! 🎉',
    'Você recebeu R$ ' || REPLACE(TO_CHAR(NEW.amount, 'FM999G999D00'), '.', ',') || ' de comissão' || E'\n' ||
    v_billing_reason ||
    CASE WHEN v_product_name IS NOT NULL THEN E'\n' || v_product_name ELSE '' END,
    'new_commission',
    NEW.id,
    'commission',
    '/user/commissions',
    COALESCE(v_environment, 'production')
  );
  
  RETURN NEW;
END;
$$;

-- Update notify_new_affiliate to pass environment
CREATE OR REPLACE FUNCTION public.notify_new_affiliate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM send_admin_notification(
    'Novo Afiliado! 🎯',
    NEW.name || ' se cadastrou na plataforma',
    'new_affiliate',
    NEW.id,
    'profile',
    '/admin/affiliates',
    NEW.environment
  );
  
  RETURN NEW;
END;
$$;