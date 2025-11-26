-- Add is_primary column to coupons table
ALTER TABLE coupons 
ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN coupons.is_primary IS 'Indicates if this is the primary coupon for a product. Only one primary coupon per product allowed';

-- Create unique partial index to ensure only one primary coupon per product
-- This allows multiple non-primary coupons (is_primary = false or NULL)
-- But only one primary coupon (is_primary = true) per product_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_one_primary_per_product 
ON coupons (product_id) 
WHERE is_primary = true AND product_id IS NOT NULL;

-- Create unique partial index for primary coupon with no specific product (applies to all products)
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_one_primary_global
ON coupons ((is_primary)) 
WHERE is_primary = true AND product_id IS NULL;
