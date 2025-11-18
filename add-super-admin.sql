-- Add super_admin role to paulo.marciofc@hotmail.com
-- Run this SQL in Supabase SQL Editor

DO $$
DECLARE
  user_uuid uuid;
BEGIN
  -- Get user ID from email
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = 'paulo.marciofc@hotmail.com';
  
  -- If user exists
  IF user_uuid IS NOT NULL THEN
    -- Remove existing roles to avoid duplicates
    DELETE FROM public.user_roles WHERE user_id = user_uuid;
    
    -- Add super_admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_uuid, 'super_admin');
    
    RAISE NOTICE 'Super admin role added for user %', user_uuid;
  ELSE
    RAISE NOTICE 'User not found. Please sign up first.';
  END IF;
END $$;
