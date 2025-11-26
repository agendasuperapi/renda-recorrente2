-- Adicionar campo cancellation_details nas tabelas subscriptions e stripe_events
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS cancellation_details JSONB;

ALTER TABLE public.stripe_events
ADD COLUMN IF NOT EXISTS cancellation_details JSONB;

-- Comentários para documentação
COMMENT ON COLUMN public.subscriptions.cancellation_details IS 'Detalhes completos do cancelamento incluindo reason, comment e feedback extraídos do Stripe';
COMMENT ON COLUMN public.stripe_events.cancellation_details IS 'Detalhes completos do cancelamento incluindo reason, comment e feedback extraídos do evento Stripe';
