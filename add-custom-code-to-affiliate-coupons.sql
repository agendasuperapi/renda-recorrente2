-- Add custom_code and is_active fields to affiliate_coupons table
ALTER TABLE affiliate_coupons 
ADD COLUMN IF NOT EXISTS custom_code text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Create unique index to prevent duplicate custom codes
CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_coupons_custom_code 
ON affiliate_coupons(custom_code) 
WHERE custom_code IS NOT NULL;

-- Add comment to explain the custom_code field
COMMENT ON COLUMN affiliate_coupons.custom_code IS 'Personalized coupon code combining affiliate username and original code (e.g., HERONOLIVERBLACK)';
