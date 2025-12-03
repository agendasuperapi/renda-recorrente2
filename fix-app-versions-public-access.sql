-- Fix app_versions RLS to allow public access for version checking

-- Drop the existing policy that only allows authenticated users
DROP POLICY IF EXISTS "Authenticated users can view versions" ON public.app_versions;

-- Create a new policy that allows anyone (including anonymous users) to view versions
CREATE POLICY "Anyone can view versions"
  ON public.app_versions
  FOR SELECT
  USING (true);
