-- Add blocking fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS blocked_message TEXT,
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES profiles(id);

-- Create index for faster blocked user lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_blocked ON profiles(is_blocked);

-- Add RLS policy for admins to update blocking status
CREATE POLICY "Admins can update blocking status"
ON profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));
