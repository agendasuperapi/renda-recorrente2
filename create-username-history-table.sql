-- Create username_history table
CREATE TABLE public.username_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  username text NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.username_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own username history"
  ON public.username_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own username history"
  ON public.username_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all username history"
  ON public.username_history
  FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Index for faster queries
CREATE INDEX idx_username_history_user_id ON public.username_history(user_id);
CREATE INDEX idx_username_history_changed_at ON public.username_history(user_id, changed_at DESC);
