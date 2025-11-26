-- Remove redundant cancellation fields from stripe_events table
-- (keeping only cancellation_details which contains all the information)
ALTER TABLE public.stripe_events 
DROP COLUMN IF EXISTS cancellation_reason,
DROP COLUMN IF EXISTS cancellation_comment;

-- Remove redundant cancellation fields from subscriptions table
-- (keeping only cancellation_details which contains all the information)
ALTER TABLE public.subscriptions 
DROP COLUMN IF EXISTS cancellation_reason,
DROP COLUMN IF EXISTS cancellation_comment;

-- Add comments to document the remaining field
COMMENT ON COLUMN public.stripe_events.cancellation_details IS 'JSON object containing cancellation reason, comment, and feedback';
COMMENT ON COLUMN public.subscriptions.cancellation_details IS 'JSON object containing cancellation reason, comment, and feedback';
