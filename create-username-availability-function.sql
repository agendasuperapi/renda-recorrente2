-- Create function to check username availability
-- This function bypasses RLS using SECURITY DEFINER to check if username exists
CREATE OR REPLACE FUNCTION check_username_availability(
  p_username text,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  -- Check if username exists for any user except the current one
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE LOWER(username) = LOWER(p_username)
      AND id != p_user_id
  ) INTO v_exists;
  
  -- Return true if available (NOT exists), false if taken
  RETURN NOT v_exists;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_username_availability(text, uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION check_username_availability IS 'Checks if a username is available for use, excluding the specified user ID';
