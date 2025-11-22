-- Adiciona coluna is_free na tabela plans para identificar planos gratuitos
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS is_free boolean DEFAULT false;

-- Comentário para a coluna
COMMENT ON COLUMN plans.is_free IS 'Indica se o plano é gratuito (true) ou pago (false)';

-- Atualizar planos existentes baseado no preço
UPDATE plans
SET is_free = (price = 0)
WHERE is_free IS NULL;

-- Garantir que is_free não seja NULL
ALTER TABLE plans 
ALTER COLUMN is_free SET NOT NULL;
