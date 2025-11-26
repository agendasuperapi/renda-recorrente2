-- Step 1: Add product_id column to affiliate_coupons
ALTER TABLE affiliate_coupons 
ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id);

-- Step 2: Populate product_id from existing coupons
UPDATE affiliate_coupons ac
SET product_id = c.product_id
FROM coupons c
WHERE ac.coupon_id = c.id
AND ac.product_id IS NULL;

-- Step 3: Remove the old unique constraint on custom_code
DROP INDEX IF EXISTS idx_affiliate_coupons_custom_code;

-- Step 4: Create new composite unique constraint
-- This allows the same custom_code for different products, but prevents duplicates within the same product
CREATE UNIQUE INDEX idx_affiliate_coupons_custom_code_product 
ON affiliate_coupons (affiliate_id, custom_code, product_id)
WHERE custom_code IS NOT NULL AND product_id IS NOT NULL;
