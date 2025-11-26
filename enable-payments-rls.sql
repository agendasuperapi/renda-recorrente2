-- Enable Row Level Security on payments table
-- This migration fixes the critical security issue where the payments table
-- had RLS disabled, potentially exposing all payment records.

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own payments
CREATE POLICY "Users can view own payments"
  ON public.payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can view all payments
CREATE POLICY "Admins can view all payments"
  ON public.payments
  FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Policy: System can insert payments (for webhook processing)
CREATE POLICY "System can insert payments"
  ON public.payments
  FOR INSERT
  WITH CHECK (true);

-- Policy: Admins can manage all payments
CREATE POLICY "Admins can manage all payments"
  ON public.payments
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add trigger for updated_at (if not already present)
DROP TRIGGER IF EXISTS handle_payments_updated_at ON public.payments;
CREATE TRIGGER handle_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON public.payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_invoice_id ON public.payments(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date);

-- Add comment
COMMENT ON TABLE public.payments IS 'Stores payment history for user subscriptions with RLS enabled to protect sensitive financial data';
