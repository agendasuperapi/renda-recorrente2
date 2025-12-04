-- Add deleted_at column to affiliate_coupons for soft delete
ALTER TABLE public.affiliate_coupons
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_affiliate_coupons_deleted_at 
ON public.affiliate_coupons(deleted_at) 
WHERE deleted_at IS NULL;

-- Comment for documentation
COMMENT ON COLUMN public.affiliate_coupons.deleted_at IS 'Timestamp when the coupon was soft-deleted (e.g., due to username change). NULL means active.';
