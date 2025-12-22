-- Add environment field to notifications table
ALTER TABLE public.notifications 
ADD COLUMN environment TEXT DEFAULT 'production';

-- Add comment explaining the field
COMMENT ON COLUMN public.notifications.environment IS 'Environment where the notification was created (test or production)';