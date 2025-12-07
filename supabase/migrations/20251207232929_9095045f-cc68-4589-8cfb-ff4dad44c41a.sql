-- Adicionar campos extras à tabela activities
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_activities_category ON public.activities(category);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_user_category ON public.activities(user_id, category);

-- Criar view otimizada para admin visualizar atividades
CREATE OR REPLACE VIEW public.view_user_activities AS
SELECT 
  a.id,
  a.user_id,
  a.activity_type,
  a.description,
  a.category,
  a.metadata,
  a.ip_address,
  a.user_agent,
  a.created_at,
  p.name as user_name,
  p.email as user_email,
  p.username,
  p.avatar_url
FROM public.activities a
JOIN public.profiles p ON p.id = a.user_id
ORDER BY a.created_at DESC;

-- RLS para a view (admins podem ver tudo, usuários veem apenas próprias)
DROP POLICY IF EXISTS "Admins can view all user activities" ON public.activities;
CREATE POLICY "Admins can view all user activities" 
ON public.activities 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger para logar mudanças de status de saque automaticamente
CREATE OR REPLACE FUNCTION public.log_withdrawal_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.activities (user_id, activity_type, description, category, metadata)
    VALUES (
      NEW.user_id,
      'withdrawal_status_' || NEW.status,
      CASE NEW.status::text
        WHEN 'approved' THEN 'Saque aprovado pelo administrador'
        WHEN 'rejected' THEN 'Saque rejeitado pelo administrador'
        WHEN 'paid' THEN 'Saque pago'
        WHEN 'pending' THEN 'Saque solicitado'
        ELSE 'Status do saque alterado para ' || NEW.status
      END,
      'financial',
      jsonb_build_object(
        'withdrawal_id', NEW.id, 
        'amount', NEW.amount, 
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para withdrawals (se não existir)
DROP TRIGGER IF EXISTS log_withdrawal_status ON public.withdrawals;
CREATE TRIGGER log_withdrawal_status
AFTER UPDATE ON public.withdrawals
FOR EACH ROW
EXECUTE FUNCTION public.log_withdrawal_status_change();

-- Trigger para logar mudanças de status de subscription automaticamente
CREATE OR REPLACE FUNCTION public.log_subscription_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log quando subscription é criada
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activities (user_id, activity_type, description, category, metadata)
    VALUES (
      NEW.user_id,
      'subscription_created',
      'Assinatura criada',
      'subscription',
      jsonb_build_object(
        'subscription_id', NEW.id,
        'plan_id', NEW.plan_id,
        'status', NEW.status
      )
    );
  -- Log quando status muda
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.activities (user_id, activity_type, description, category, metadata)
    VALUES (
      NEW.user_id,
      'subscription_status_' || NEW.status,
      CASE NEW.status
        WHEN 'active' THEN 'Assinatura ativada'
        WHEN 'canceled' THEN 'Assinatura cancelada'
        WHEN 'past_due' THEN 'Assinatura com pagamento atrasado'
        WHEN 'trialing' THEN 'Período de teste iniciado'
        ELSE 'Status da assinatura alterado para ' || NEW.status
      END,
      'subscription',
      jsonb_build_object(
        'subscription_id', NEW.id,
        'plan_id', NEW.plan_id,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  -- Log quando cancel_at_period_end muda
  ELSIF TG_OP = 'UPDATE' AND OLD.cancel_at_period_end IS DISTINCT FROM NEW.cancel_at_period_end THEN
    INSERT INTO public.activities (user_id, activity_type, description, category, metadata)
    VALUES (
      NEW.user_id,
      CASE WHEN NEW.cancel_at_period_end THEN 'cancellation_requested' ELSE 'cancellation_reverted' END,
      CASE WHEN NEW.cancel_at_period_end THEN 'Cancelamento de assinatura solicitado' ELSE 'Cancelamento de assinatura desfeito' END,
      'subscription',
      jsonb_build_object(
        'subscription_id', NEW.id,
        'plan_id', NEW.plan_id,
        'cancel_at_period_end', NEW.cancel_at_period_end
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para subscriptions
DROP TRIGGER IF EXISTS log_subscription_status ON public.subscriptions;
CREATE TRIGGER log_subscription_status
AFTER INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.log_subscription_status_change();