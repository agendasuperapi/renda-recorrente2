-- Add has_seen_welcome_dashboard column to profiles table
ALTER TABLE profiles 
ADD COLUMN has_seen_welcome_dashboard BOOLEAN DEFAULT false;

-- Update existing users to true (they've already used the system)
UPDATE profiles 
SET has_seen_welcome_dashboard = true 
WHERE created_at < NOW() - INTERVAL '1 hour';
