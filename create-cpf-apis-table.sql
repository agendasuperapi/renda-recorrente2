-- Create table for CPF API configurations
CREATE TABLE IF NOT EXISTS public.cpf_apis (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  url text NOT NULL,
  api_type text NOT NULL CHECK (api_type IN ('nationalId', 'spbt', 'betQuatro', 'superbet')),
  is_active boolean DEFAULT true,
  priority integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on priority for faster ordering
CREATE INDEX IF NOT EXISTS idx_cpf_apis_priority ON public.cpf_apis(priority);
CREATE INDEX IF NOT EXISTS idx_cpf_apis_active ON public.cpf_apis(is_active);

-- Enable RLS
ALTER TABLE public.cpf_apis ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin users can manage CPF APIs"
  ON public.cpf_apis
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER handle_cpf_apis_updated_at
  BEFORE UPDATE ON public.cpf_apis
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert default APIs
INSERT INTO public.cpf_apis (name, url, api_type, priority) VALUES
('NationalId API', 'https://webapi.draftplaza.com/api_v2/validateCPF', 'nationalId', 1),
('SPBT API', 'https://hzmixuvrnzpypriagecv.supabase.co/functions/v1/consultar_cpf_spbt', 'spbt', 2),
('BetQuatro API', 'https://bet4.bet.br/api/Autofill', 'betQuatro', 3),
('Superbet API', 'https://api.web.production.betler.superbet.bet.br/api/v1/getRegulatorData?clientSourceType=Desktop_new', 'superbet', 4);
