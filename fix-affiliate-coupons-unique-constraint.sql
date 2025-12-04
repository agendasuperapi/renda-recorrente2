-- Remove a constraint UNIQUE original que não considera soft delete
ALTER TABLE public.affiliate_coupons 
DROP CONSTRAINT IF EXISTS affiliate_coupons_affiliate_id_coupon_id_key;

-- Cria nova constraint parcial que só considera registros ativos
-- Isso permite múltiplos registros "deletados" mas apenas um ativo
CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_coupons_unique_active 
ON public.affiliate_coupons (affiliate_id, coupon_id) 
WHERE deleted_at IS NULL;

-- Comentário explicativo
COMMENT ON INDEX idx_affiliate_coupons_unique_active IS 
'Garante que cada afiliado tenha apenas um cupom ativo por coupon_id. Registros soft-deleted (deleted_at NOT NULL) não são considerados.';
