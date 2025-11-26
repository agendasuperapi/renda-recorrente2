-- Add product_id column to coupons table
ALTER TABLE coupons 
ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id);

-- Add comment to explain the column
COMMENT ON COLUMN coupons.product_id IS 'Product this coupon applies to. If null, applies to all products';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_coupons_product_id ON coupons(product_id);
