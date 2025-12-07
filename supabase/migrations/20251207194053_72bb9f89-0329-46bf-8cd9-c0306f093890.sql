-- Add attached_references column to support_messages for storing structured reference data
ALTER TABLE support_messages 
ADD COLUMN IF NOT EXISTS attached_references jsonb DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN support_messages.attached_references IS 'Stores attached references (commissions, referrals, sub-affiliates) with type, id, label, and details';