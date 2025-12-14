-- Enable pg_net extension for HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to send push notification via edge function
CREATE OR REPLACE FUNCTION public.send_push_notification(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL
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
    'action_url', p_action_url
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

-- Function to send notification to all admins
CREATE OR REPLACE FUNCTION public.send_admin_notification(
  p_title TEXT,
  p_body TEXT,
  p_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL
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
      p_action_url
    );
  END LOOP;
END;
$$;

-- Trigger: Nova Comissão
CREATE OR REPLACE FUNCTION public.notify_new_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_name TEXT;
BEGIN
  SELECT nome INTO v_product_name FROM products WHERE id = NEW.product_id;
  
  PERFORM send_push_notification(
    NEW.affiliate_id,
    'Nova Comissão! 🎉',
    'Você recebeu R$ ' || TO_CHAR(NEW.amount, 'FM999G999D00') || ' de comissão' || 
    CASE WHEN v_product_name IS NOT NULL THEN ' - ' || v_product_name ELSE '' END,
    'new_commission',
    NEW.id,
    'commission',
    '/user/commissions'
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_new_commission ON commissions;
CREATE TRIGGER trigger_notify_new_commission
AFTER INSERT ON commissions
FOR EACH ROW
EXECUTE FUNCTION notify_new_commission();

-- Trigger: Saque Pago
CREATE OR REPLACE FUNCTION public.notify_withdrawal_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'paid' THEN
    PERFORM send_push_notification(
      NEW.user_id,
      'Saque Pago! 💰',
      'Seu saque de R$ ' || TO_CHAR(NEW.amount, 'FM999G999D00') || ' foi pago!',
      'withdrawal_paid',
      NEW.id,
      'withdrawal',
      '/user/commissions?tab=withdrawals'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_withdrawal_paid ON withdrawals;
CREATE TRIGGER trigger_notify_withdrawal_paid
AFTER UPDATE ON withdrawals
FOR EACH ROW
EXECUTE FUNCTION notify_withdrawal_paid();

-- Trigger: Novo Sub-Afiliado
CREATE OR REPLACE FUNCTION public.notify_new_sub_affiliate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub_name TEXT;
BEGIN
  IF NEW.level = 1 THEN
    SELECT name INTO v_sub_name FROM profiles WHERE id = NEW.sub_affiliate_id;
    
    PERFORM send_push_notification(
      NEW.parent_affiliate_id,
      'Novo Sub-Afiliado! 👥',
      COALESCE(v_sub_name, 'Alguém') || ' se cadastrou usando seu link!',
      'new_sub_affiliate',
      NEW.sub_affiliate_id,
      'sub_affiliate',
      '/user/sub-affiliates'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_new_sub_affiliate ON sub_affiliates;
CREATE TRIGGER trigger_notify_new_sub_affiliate
AFTER INSERT ON sub_affiliates
FOR EACH ROW
EXECUTE FUNCTION notify_new_sub_affiliate();

-- Trigger: Nova Mensagem de Suporte (sem is_system_message)
CREATE OR REPLACE FUNCTION public.notify_new_support_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket RECORD;
  v_sender_name TEXT;
BEGIN
  SELECT * INTO v_ticket FROM support_tickets WHERE id = NEW.ticket_id;
  SELECT name INTO v_sender_name FROM profiles WHERE id = NEW.sender_id;
  
  IF NEW.is_admin THEN
    PERFORM send_push_notification(
      v_ticket.user_id,
      'Nova Resposta no Suporte 💬',
      'Você recebeu uma resposta no chamado: ' || v_ticket.subject,
      'new_support_message',
      NEW.ticket_id,
      'support_ticket',
      '/user/support'
    );
  ELSE
    PERFORM send_admin_notification(
      'Nova Mensagem de Suporte 📩',
      COALESCE(v_sender_name, 'Usuário') || ': ' || v_ticket.subject,
      'admin_new_support_message',
      NEW.ticket_id,
      'support_ticket',
      '/admin/support'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_new_support_message ON support_messages;
CREATE TRIGGER trigger_notify_new_support_message
AFTER INSERT ON support_messages
FOR EACH ROW
EXECUTE FUNCTION notify_new_support_message();

-- Trigger: Novo Afiliado
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
    '/admin/affiliates'
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_new_affiliate ON profiles;
CREATE TRIGGER trigger_notify_new_affiliate
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION notify_new_affiliate();

-- Trigger: Novo Pagamento
CREATE OR REPLACE FUNCTION public.notify_new_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_name TEXT;
BEGIN
  SELECT name INTO v_user_name FROM profiles WHERE id = NEW.user_id;
  
  PERFORM send_admin_notification(
    'Novo Pagamento! 💳',
    COALESCE(v_user_name, 'Usuário') || ' - R$ ' || TO_CHAR(NEW.amount, 'FM999G999D00'),
    'new_payment',
    NEW.id,
    'payment',
    '/admin/stripe?tab=payments'
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_new_payment ON payments;
CREATE TRIGGER trigger_notify_new_payment
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION notify_new_payment();

-- Trigger: Novo Saque Solicitado
CREATE OR REPLACE FUNCTION public.notify_new_withdrawal_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_name TEXT;
BEGIN
  SELECT name INTO v_user_name FROM profiles WHERE id = NEW.user_id;
  
  PERFORM send_admin_notification(
    'Novo Saque Solicitado! 📤',
    COALESCE(v_user_name, 'Afiliado') || ' solicitou R$ ' || TO_CHAR(NEW.amount, 'FM999G999D00'),
    'new_withdrawal_request',
    NEW.id,
    'withdrawal',
    '/admin/commissions?tab=withdrawals'
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_new_withdrawal_request ON withdrawals;
CREATE TRIGGER trigger_notify_new_withdrawal_request
AFTER INSERT ON withdrawals
FOR EACH ROW
EXECUTE FUNCTION notify_new_withdrawal_request();

-- Trigger: Nova Versão
CREATE OR REPLACE FUNCTION public.notify_new_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF OLD.deploy_status IS DISTINCT FROM NEW.deploy_status AND NEW.deploy_status = 'success' THEN
    FOR v_user_id IN 
      SELECT id FROM profiles WHERE deleted_at IS NULL
    LOOP
      PERFORM send_push_notification(
        v_user_id,
        'Nova Versão Disponível! 🚀',
        'Versão ' || NEW.version || ' foi publicada. ' || COALESCE(NEW.description, ''),
        'new_version',
        NEW.id,
        'app_version',
        '/user/dashboard'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_new_version ON app_versions;
CREATE TRIGGER trigger_notify_new_version
AFTER UPDATE ON app_versions
FOR EACH ROW
EXECUTE FUNCTION notify_new_version();

-- Trigger: Meta Batida
CREATE OR REPLACE FUNCTION public.check_goal_achieved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_goal RECORD;
  v_current_value NUMERIC;
BEGIN
  FOR v_goal IN 
    SELECT * FROM affiliate_goals
    WHERE affiliate_id = NEW.affiliate_id
      AND is_active = true
      AND period_start <= CURRENT_DATE
      AND period_end >= CURRENT_DATE
  LOOP
    IF v_goal.goal_type = 'value' THEN
      SELECT COALESCE(SUM(amount), 0) INTO v_current_value
      FROM commissions
      WHERE affiliate_id = NEW.affiliate_id
        AND created_at::date >= v_goal.period_start
        AND created_at::date <= v_goal.period_end
        AND (v_goal.product_id IS NULL OR product_id = v_goal.product_id);
        
    ELSIF v_goal.goal_type = 'sales' THEN
      SELECT COUNT(*) INTO v_current_value
      FROM commissions
      WHERE affiliate_id = NEW.affiliate_id
        AND level = 1
        AND created_at::date >= v_goal.period_start
        AND created_at::date <= v_goal.period_end
        AND (v_goal.product_id IS NULL OR product_id = v_goal.product_id);
        
    ELSIF v_goal.goal_type = 'referrals' THEN
      SELECT COUNT(*) INTO v_current_value
      FROM sub_affiliates
      WHERE parent_affiliate_id = NEW.affiliate_id
        AND level = 1
        AND created_at::date >= v_goal.period_start
        AND created_at::date <= v_goal.period_end;
    END IF;
    
    IF v_current_value >= v_goal.target_value THEN
      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE user_id = NEW.affiliate_id
          AND type = 'goal_achieved'
          AND reference_id = v_goal.id
      ) THEN
        PERFORM send_push_notification(
          NEW.affiliate_id,
          'Meta Batida! 🏆',
          'Parabéns! Você atingiu sua meta de ' || 
          CASE v_goal.goal_type
            WHEN 'value' THEN 'R$ ' || TO_CHAR(v_goal.target_value, 'FM999G999D00')
            WHEN 'sales' THEN v_goal.target_value || ' vendas'
            WHEN 'referrals' THEN v_goal.target_value || ' indicações'
          END,
          'goal_achieved',
          v_goal.id,
          'goal',
          '/user/commissions?tab=goals'
        );
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_goal_achieved ON commissions;
CREATE TRIGGER trigger_check_goal_achieved
AFTER INSERT ON commissions
FOR EACH ROW
EXECUTE FUNCTION check_goal_achieved();

-- Cron job para lembrete de dia de saque
SELECT cron.schedule(
  'notify-withdrawal-day',
  '0 9 * * 1-5',
  $$
  SELECT net.http_post(
    url := 'https://adpnzkvzvjbervzrqhhx.supabase.co/functions/v1/send-push-notification',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkcG56a3Z6dmpiZXJ2enJxaGh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MDAzODYsImV4cCI6MjA3OTA3NjM4Nn0.N7gETUDWj95yDCYdZTYWPoMJQcdx_Yjl51jxK-O1vrE"}'::jsonb,
    body := jsonb_build_object(
      'user_ids', (
        SELECT array_agg(p.id)
        FROM profiles p
        WHERE p.withdrawal_day = EXTRACT(DOW FROM CURRENT_DATE)::integer
          AND p.deleted_at IS NULL
          AND EXISTS (
            SELECT 1 FROM commissions c
            WHERE c.affiliate_id = p.id AND c.status = 'available'
          )
      ),
      'title', 'Dia de Saque! 💰',
      'body', 'Hoje é seu dia de saque! Você tem saldo disponível para sacar.',
      'type', 'withdrawal_day',
      'action_url', '/user/commissions?tab=withdrawals'
    )
  );
  $$
);