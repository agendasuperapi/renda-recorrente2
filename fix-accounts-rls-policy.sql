-- Fix accounts table RLS policy to prevent exposure of Stripe API keys
-- The current policy allows any authenticated user to read sensitive credentials

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone authenticated can view accounts" ON public.accounts;

-- Create a restrictive policy - only super_admin can view accounts
-- This protects key_authorization and signing_secret from unauthorized access
CREATE POLICY "Only super_admin can view accounts"
  ON public.accounts
  FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add comment explaining the security rationale
COMMENT ON TABLE public.accounts IS 'Contains Stripe API credentials (key_authorization, signing_secret). Access restricted to super_admin only to prevent credential leakage.';
