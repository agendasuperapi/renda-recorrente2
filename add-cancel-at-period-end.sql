-- Add cancel_at_period_end field to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

-- Add comment to document the field
COMMENT ON COLUMN public.subscriptions.cancel_at_period_end IS 'Indica se a assinatura será cancelada ao final do período atual (true) ou se já foi cancelada imediatamente (false)';
