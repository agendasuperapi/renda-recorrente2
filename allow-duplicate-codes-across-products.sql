-- Remove the existing unique constraint on code
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_code_key;

-- Create unique constraint for coupons with no specific product (global coupons)
-- Each code must be unique among global coupons
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_unique_code_global
ON coupons (code)
WHERE product_id IS NULL;

-- Create unique constraint for coupons with specific products
-- Each code must be unique per product
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_unique_code_per_product
ON coupons (code, product_id)
WHERE product_id IS NOT NULL;

-- Add comment explaining the constraints
COMMENT ON INDEX idx_coupons_unique_code_global IS 'Ensures coupon codes are unique among global coupons (product_id IS NULL)';
COMMENT ON INDEX idx_coupons_unique_code_per_product IS 'Ensures coupon codes are unique per product';
