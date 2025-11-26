-- Add environment field to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN environment TEXT CHECK (environment IN ('test', 'production')) DEFAULT 'test';

-- Add environment field to stripe_events table  
ALTER TABLE stripe_events
ADD COLUMN environment TEXT CHECK (environment IN ('test', 'production')) DEFAULT 'test';

-- Add comment to document the fields
COMMENT ON COLUMN subscriptions.environment IS 'Indica se a subscription foi criada no ambiente de teste ou produção do Stripe';
COMMENT ON COLUMN stripe_events.environment IS 'Indica se o evento foi recebido do ambiente de teste ou produção do Stripe';
