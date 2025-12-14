-- Add unique constraint on endpoint column for push_subscriptions
ALTER TABLE public.push_subscriptions 
ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);