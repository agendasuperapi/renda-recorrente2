-- Create app_versions table for version management
CREATE TABLE IF NOT EXISTS public.app_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  description text,
  changes text[],
  released_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage all versions
CREATE POLICY "Admins can manage all versions"
  ON public.app_versions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Policy: Authenticated users can view versions
CREATE POLICY "Authenticated users can view versions"
  ON public.app_versions
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_app_versions_released_at ON public.app_versions(released_at DESC);
