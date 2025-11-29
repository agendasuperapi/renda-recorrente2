-- Add RLS policy to allow affiliates to update their own affiliate coupons
CREATE POLICY "Affiliates can update their own coupon associations"
ON public.affiliate_coupons
FOR UPDATE
TO authenticated
USING (auth.uid() = affiliate_id)
WITH CHECK (auth.uid() = affiliate_id);

-- Add comment explaining the policy
COMMENT ON POLICY "Affiliates can update their own coupon associations" ON public.affiliate_coupons IS 
'Allows authenticated users to update affiliate_coupons records only if they are the affiliate (auth.uid() = affiliate_id)';
