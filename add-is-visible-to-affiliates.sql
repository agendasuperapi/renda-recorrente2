-- Add is_visible_to_affiliates column to coupons table
ALTER TABLE coupons 
ADD COLUMN IF NOT EXISTS is_visible_to_affiliates boolean DEFAULT true;

-- Add comment to explain the column
COMMENT ON COLUMN coupons.is_visible_to_affiliates IS 'When true, coupon is visible to all affiliates. When false, only visible to super_admin';
