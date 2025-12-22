-- Add receive_test_notifications column to notification_preferences
ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS receive_test_notifications BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.notification_preferences.receive_test_notifications IS 
'Se true, o admin recebe notificações de ambiente de teste. Notificações de produção sempre são recebidas.';