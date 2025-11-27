-- Create pending_checkouts table to track checkout sessions
CREATE TABLE IF NOT EXISTS public.pending_checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  checkout_url text NOT NULL,
  stripe_session_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '24 hours'),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pending_checkouts_user_status ON public.pending_checkouts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_pending_checkouts_expires ON public.pending_checkouts(expires_at);

-- Enable RLS
ALTER TABLE public.pending_checkouts ENABLE ROW LEVEL SECURITY;

-- Users can view their own pending checkouts
CREATE POLICY "Users can view own pending checkouts"
  ON public.pending_checkouts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own checkouts
CREATE POLICY "Users can create own pending checkouts"
  ON public.pending_checkouts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own checkouts
CREATE POLICY "Users can update own pending checkouts"
  ON public.pending_checkouts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can manage all checkouts
CREATE POLICY "Admins can manage all pending checkouts"
  ON public.pending_checkouts
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER handle_pending_checkouts_updated_at
  BEFORE UPDATE ON public.pending_checkouts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to automatically expire old checkouts
CREATE OR REPLACE FUNCTION expire_old_checkouts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.pending_checkouts
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();
END;
$$;
