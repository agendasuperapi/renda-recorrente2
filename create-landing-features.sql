-- Create landing_features table
CREATE TABLE IF NOT EXISTS public.landing_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text NOT NULL,
  is_active boolean DEFAULT true,
  order_position integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.landing_features ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage features"
  ON public.landing_features
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Anyone can view active features"
  ON public.landing_features
  FOR SELECT
  USING (is_active = true);

-- Add trigger for updated_at
CREATE TRIGGER handle_landing_features_updated_at
  BEFORE UPDATE ON public.landing_features
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert default features
INSERT INTO public.landing_features (name, icon, is_active, order_position) VALUES
  ('Dashboard completo', 'CheckCircle2', true, 0),
  ('Treinamento integrado', 'CheckCircle2', true, 1),
  ('Relatórios de indicações', 'CheckCircle2', true, 2),
  ('Relatórios de comissões', 'CheckCircle2', true, 3),
  ('Cadastro de cupons', 'CheckCircle2', true, 4),
  ('Solicitação de saques', 'CheckCircle2', true, 5)
ON CONFLICT DO NOTHING;
