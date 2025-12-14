-- =============================================
-- SISTEMA DE NOTIFICAÇÕES PUSH
-- =============================================

-- 1. Tabela para armazenar subscriptions de push (dispositivos)
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'desktop',
  browser TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- 2. Tabela para preferências de notificação
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  -- Preferências de usuário
  new_commission BOOLEAN NOT NULL DEFAULT true,
  withdrawal_day BOOLEAN NOT NULL DEFAULT true,
  withdrawal_paid BOOLEAN NOT NULL DEFAULT true,
  new_sub_affiliate BOOLEAN NOT NULL DEFAULT true,
  new_support_message BOOLEAN NOT NULL DEFAULT true,
  goal_achieved BOOLEAN NOT NULL DEFAULT true,
  -- Preferências de admin
  new_affiliate BOOLEAN NOT NULL DEFAULT true,
  new_payment BOOLEAN NOT NULL DEFAULT true,
  new_withdrawal_request BOOLEAN NOT NULL DEFAULT true,
  admin_new_support_message BOOLEAN NOT NULL DEFAULT true,
  new_version BOOLEAN NOT NULL DEFAULT true,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Tabela para histórico/inbox de notificações
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  icon TEXT,
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_user_id_is_read ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para push_subscriptions
CREATE POLICY "Users can view own subscriptions"
ON public.push_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions"
ON public.push_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
ON public.push_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
ON public.push_subscriptions FOR DELETE
USING (auth.uid() = user_id);

-- Políticas RLS para notification_preferences
CREATE POLICY "Users can view own preferences"
ON public.notification_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own preferences"
ON public.notification_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
ON public.notification_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- Políticas RLS para notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Função para criar preferências padrão quando usuário é criado
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger para criar preferências padrão
CREATE TRIGGER create_notification_preferences_on_profile
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_default_notification_preferences();