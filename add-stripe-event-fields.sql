-- Adicionar campo email à tabela stripe_events
ALTER TABLE public.stripe_events
ADD COLUMN IF NOT EXISTS email text;

-- Adicionar campo payment_method_data à tabela subscriptions
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS payment_method_data jsonb;

-- Criar índice para melhor performance na busca por email
CREATE INDEX IF NOT EXISTS idx_stripe_events_email ON public.stripe_events(email);

-- Comentários para documentação
COMMENT ON COLUMN public.stripe_events.email IS 'Email do cliente extraído do evento Stripe (de metadata, billing_details ou customer)';
COMMENT ON COLUMN public.subscriptions.payment_method_data IS 'Dados do método de pagamento capturados do evento payment_method.attached';
