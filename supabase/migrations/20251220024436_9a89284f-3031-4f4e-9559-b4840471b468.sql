-- Create landing_sections table to manage section visibility
CREATE TABLE IF NOT EXISTS public.landing_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL UNIQUE,
  section_name text NOT NULL,
  is_active boolean DEFAULT true,
  order_position integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.landing_sections ENABLE ROW LEVEL SECURITY;

-- Anyone can view sections (but app will filter based on is_active for non-admins)
CREATE POLICY "Anyone can view landing sections"
  ON public.landing_sections
  FOR SELECT
  USING (true);

-- Only admins can manage sections
CREATE POLICY "Admins can manage landing sections"
  ON public.landing_sections
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER handle_landing_sections_updated_at
  BEFORE UPDATE ON public.landing_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert default sections
INSERT INTO public.landing_sections (section_key, section_name, is_active, order_position) VALUES
  ('announcement-banner', 'Banner de Anúncio', true, 0),
  ('hero', 'Hero (Início)', true, 1),
  ('seja-afiliado', 'Seja um Afiliado', true, 2),
  ('comissao-recorrente', 'Comissão Recorrente', true, 3),
  ('como-funciona', 'Como Funciona', true, 4),
  ('vantagens', 'Vantagens', true, 5),
  ('produtos', 'Produtos', true, 6),
  ('planos', 'Planos', true, 7),
  ('depoimentos', 'Depoimentos', true, 8),
  ('faq', 'Perguntas Frequentes', true, 9),
  ('cta', 'CTA Final', true, 10)
ON CONFLICT (section_key) DO NOTHING;