-- Adiciona suporte para múltiplos comprovantes de pagamento
-- Muda payment_proof_url de TEXT para JSONB para armazenar array de URLs

-- Primeiro, converte os dados existentes para o novo formato
UPDATE withdrawals 
SET payment_proof_url = jsonb_build_array(payment_proof_url)::text
WHERE payment_proof_url IS NOT NULL AND payment_proof_url != '';

-- Altera o tipo da coluna para JSONB
ALTER TABLE withdrawals 
ALTER COLUMN payment_proof_url TYPE jsonb 
USING CASE 
  WHEN payment_proof_url IS NULL OR payment_proof_url = '' THEN '[]'::jsonb
  ELSE payment_proof_url::jsonb
END;

-- Define o valor padrão como array vazio
ALTER TABLE withdrawals 
ALTER COLUMN payment_proof_url SET DEFAULT '[]'::jsonb;

-- Comentário explicando a estrutura
COMMENT ON COLUMN withdrawals.payment_proof_url IS 'Array JSON de URLs dos comprovantes de pagamento PIX';
