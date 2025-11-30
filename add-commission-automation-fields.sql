-- Adicionar campo withdrawal_day na tabela profiles
-- 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS withdrawal_day INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.profiles.withdrawal_day IS 'Dia da semana para saque (1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex)';

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_profiles_withdrawal_day ON public.profiles(withdrawal_day);

-- Inserir configurações para comissões
INSERT INTO public.app_settings (key, value, description)
VALUES 
  ('commission_days_to_available', '7', 'Número de dias após o pagamento para a comissão ficar disponível')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.app_settings (key, value, description)
VALUES 
  ('commission_min_withdrawal', '50.00', 'Valor mínimo em reais para solicitar saque de comissões')
ON CONFLICT (key) DO NOTHING;

-- Função para definir o withdrawal_day automaticamente no cadastro
CREATE OR REPLACE FUNCTION set_withdrawal_day()
RETURNS TRIGGER AS $$
DECLARE
  day_of_week INTEGER;
BEGIN
  -- Pegar o dia da semana do cadastro (0=Domingo, 1=Segunda, ..., 6=Sábado)
  day_of_week := EXTRACT(DOW FROM NEW.created_at);
  
  -- Converter para formato 1-5 (Seg-Sex), Sáb/Dom = Segunda (1)
  IF day_of_week = 0 OR day_of_week = 6 THEN
    -- Domingo ou Sábado = Segunda-feira
    NEW.withdrawal_day := 1;
  ELSE
    -- Outros dias mantém o mesmo número
    NEW.withdrawal_day := day_of_week;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para definir withdrawal_day no INSERT
DROP TRIGGER IF EXISTS set_withdrawal_day_trigger ON public.profiles;
CREATE TRIGGER set_withdrawal_day_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_withdrawal_day();

-- Atualizar perfis existentes que não têm withdrawal_day definido
UPDATE public.profiles
SET withdrawal_day = CASE
  WHEN EXTRACT(DOW FROM created_at) IN (0, 6) THEN 1  -- Sáb/Dom = Segunda
  ELSE EXTRACT(DOW FROM created_at)::INTEGER
END
WHERE withdrawal_day IS NULL;
