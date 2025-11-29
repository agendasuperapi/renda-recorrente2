-- Add RLS policy to allow affiliates to insert their own affiliate coupons
CREATE POLICY "Affiliates can create their own coupon associations"
ON public.affiliate_coupons
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = affiliate_id);

-- Add comment explaining the policy
COMMENT ON POLICY "Affiliates can create their own coupon associations" ON public.affiliate_coupons IS 
'Allows authenticated users to insert affiliate_coupons records only if they are the affiliate (auth.uid() = affiliate_id)';
