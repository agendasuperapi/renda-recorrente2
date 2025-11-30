-- Script para atualizar withdrawal_day de afiliados existentes que não têm o campo preenchido
-- Baseado no dia da semana em que o afiliado foi cadastrado

UPDATE profiles
SET withdrawal_day = CASE
  -- Domingo (0) ou Sábado (6) = Segunda-feira (1)
  WHEN EXTRACT(DOW FROM created_at) IN (0, 6) THEN 1
  -- Outros dias mantém o mesmo número (1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex)
  ELSE EXTRACT(DOW FROM created_at)::integer
END
WHERE withdrawal_day IS NULL;

-- Comentário explicativo
COMMENT ON COLUMN profiles.withdrawal_day IS 'Dia da semana para saque: 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta. Definido automaticamente no cadastro baseado no dia da semana.';
