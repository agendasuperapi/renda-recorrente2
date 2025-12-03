-- Add social media fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS youtube text,
ADD COLUMN IF NOT EXISTS twitter text,
ADD COLUMN IF NOT EXISTS linkedin text;

-- Add comments to explain the columns
COMMENT ON COLUMN profiles.youtube IS 'YouTube channel URL or username';
COMMENT ON COLUMN profiles.twitter IS 'X (Twitter) username';
COMMENT ON COLUMN profiles.linkedin IS 'LinkedIn profile URL';
