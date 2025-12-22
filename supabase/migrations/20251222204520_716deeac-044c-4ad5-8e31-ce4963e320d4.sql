-- Drop the old 7-parameter version of send_push_notification
DROP FUNCTION IF EXISTS public.send_push_notification(uuid, text, text, text, uuid, text, text);

-- Drop the old 6-parameter version of send_admin_notification
DROP FUNCTION IF EXISTS public.send_admin_notification(text, text, text, uuid, text, text);

-- Drop the old 7-parameter version of send_admin_notification_with_product_filter
DROP FUNCTION IF EXISTS public.send_admin_notification_with_product_filter(text, text, text, uuid, text, text, uuid);