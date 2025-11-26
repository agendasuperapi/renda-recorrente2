-- Add stripe_subscription_id column to stripe_events table
ALTER TABLE stripe_events ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Update existing records to extract subscription_id from event_data
UPDATE stripe_events
SET stripe_subscription_id = event_data->'data'->'object'->>'subscription'
WHERE event_data->'data'->'object'->>'subscription' IS NOT NULL;

-- Also check for subscription in the root of the data object
UPDATE stripe_events
SET stripe_subscription_id = event_data->'data'->'object'->>'id'
WHERE stripe_subscription_id IS NULL
  AND event_data->'data'->'object'->>'object' = 'subscription';

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_stripe_events_stripe_subscription_id 
ON stripe_events(stripe_subscription_id);
