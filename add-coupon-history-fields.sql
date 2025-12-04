-- Add history fields to affiliate_coupons table
ALTER TABLE affiliate_coupons 
ADD COLUMN IF NOT EXISTS username_at_creation text,
ADD COLUMN IF NOT EXISTS coupon_code_at_creation text,
ADD COLUMN IF NOT EXISTS custom_code_history text;

-- Add comments to explain the fields
COMMENT ON COLUMN affiliate_coupons.username_at_creation IS 'Username do afiliado no momento da criação do cupom personalizado';
COMMENT ON COLUMN affiliate_coupons.coupon_code_at_creation IS 'Código do cupom base no momento da criação';
COMMENT ON COLUMN affiliate_coupons.custom_code_history IS 'Histórico do custom_code quando o cupom é liberado/alterado';
