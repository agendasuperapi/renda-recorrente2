-- Add affiliate_id and affiliate_coupon_id to subscriptions table
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS affiliate_id uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS affiliate_coupon_id uuid REFERENCES public.affiliate_coupons(id);

-- Add affiliate_id and affiliate_coupon_id to stripe_events table
ALTER TABLE public.stripe_events
ADD COLUMN IF NOT EXISTS affiliate_coupon_id uuid REFERENCES public.affiliate_coupons(id);

-- Add affiliate_id and affiliate_coupon_id to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS affiliate_coupon_id uuid REFERENCES public.affiliate_coupons(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_affiliate_id ON public.subscriptions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_affiliate_coupon_id ON public.subscriptions(affiliate_coupon_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_affiliate_id ON public.stripe_events(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_affiliate_coupon_id ON public.stripe_events(affiliate_coupon_id);
CREATE INDEX IF NOT EXISTS idx_payments_affiliate_id ON public.payments(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_payments_affiliate_coupon_id ON public.payments(affiliate_coupon_id);

-- Add comments to explain the columns
COMMENT ON COLUMN public.subscriptions.affiliate_id IS 'ID do afiliado que gerou a assinatura via cupom';
COMMENT ON COLUMN public.subscriptions.affiliate_coupon_id IS 'ID do registro affiliate_coupons usado na conversão';
COMMENT ON COLUMN public.stripe_events.affiliate_coupon_id IS 'ID do registro affiliate_coupons associado ao evento';
COMMENT ON COLUMN public.payments.affiliate_coupon_id IS 'ID do registro affiliate_coupons associado ao pagamento';
