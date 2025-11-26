-- Adicionar campos de cancelamento na tabela subscriptions
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancellation_comment TEXT;

-- Adicionar campos de cancelamento na tabela stripe_events
ALTER TABLE public.stripe_events
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancellation_comment TEXT;

-- Comentários para documentação
COMMENT ON COLUMN public.subscriptions.cancellation_reason IS 'Motivo selecionado pelo cliente ao cancelar a assinatura (ex: customer, payment_failed, etc)';
COMMENT ON COLUMN public.subscriptions.cancellation_comment IS 'Comentário em texto livre fornecido pelo cliente ao cancelar';
COMMENT ON COLUMN public.stripe_events.cancellation_reason IS 'Motivo do cancelamento extraído do evento Stripe';
COMMENT ON COLUMN public.stripe_events.cancellation_comment IS 'Comentário do cancelamento extraído do evento Stripe';
