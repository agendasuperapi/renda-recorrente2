-- Criar tabela de configuração de comissões por nível
CREATE TABLE IF NOT EXISTS public.commission_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level INTEGER NOT NULL UNIQUE CHECK (level >= 1 AND level <= 10),
  percentage INTEGER NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Comentário
COMMENT ON TABLE public.commission_levels IS 'Configuração de percentuais de comissão por nível de sub-afiliados';

-- Trigger para updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.commission_levels
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Políticas RLS
ALTER TABLE public.commission_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage commission levels"
  ON public.commission_levels
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Anyone can view active commission levels"
  ON public.commission_levels
  FOR SELECT
  USING (is_active = true);

-- Inserir níveis padrão
INSERT INTO public.commission_levels (level, percentage, description) VALUES
  (1, 10, 'Nível 1 - Indicações diretas'),
  (2, 5, 'Nível 2 - Sub-afiliados de nível 1'),
  (3, 2, 'Nível 3 - Sub-afiliados de nível 2')
ON CONFLICT (level) DO NOTHING;

-- Adicionar configuração de limite máximo de níveis
INSERT INTO public.app_settings (key, value, description) VALUES
  ('max_affiliate_levels', '3', 'Número máximo de níveis permitidos na hierarquia de afiliados')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;
