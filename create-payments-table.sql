-- Create payments table to track all payment history
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  stripe_invoice_id TEXT UNIQUE NOT NULL,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'brl',
  billing_reason TEXT, -- subscription_create, subscription_cycle, subscription_update, etc.
  status TEXT NOT NULL DEFAULT 'paid',
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  environment TEXT DEFAULT 'test',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON public.payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_invoice_id ON public.payments(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date DESC);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payments
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments"
  ON public.payments FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "System can insert payments"
  ON public.payments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage all payments"
  ON public.payments FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create trigger function to automatically generate commission from payment
CREATE OR REPLACE FUNCTION public.generate_commission_from_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_commission_percentage INTEGER;
  v_affiliate_id UUID;
  v_commission_amount NUMERIC;
  v_referrer_affiliate_code TEXT;
BEGIN
  -- Buscar percentual de comissão do plano
  SELECT commission_percentage INTO v_plan_commission_percentage
  FROM public.plans 
  WHERE id = NEW.plan_id;
  
  -- Se não encontrou plano ou percentual é 0, não criar comissão
  IF v_plan_commission_percentage IS NULL OR v_plan_commission_percentage = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Buscar o código de referência (referrer_code) do usuário que pagou
  SELECT referrer_code INTO v_referrer_affiliate_code
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Se não tem referrer_code, não há afiliado para receber comissão
  IF v_referrer_affiliate_code IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Buscar o ID do afiliado (usuário que possui o affiliate_code igual ao referrer_code)
  SELECT id INTO v_affiliate_id
  FROM public.profiles
  WHERE affiliate_code = v_referrer_affiliate_code;
  
  -- Se encontrou afiliado, criar comissão
  IF v_affiliate_id IS NOT NULL THEN
    v_commission_amount := (NEW.amount * v_plan_commission_percentage) / 100;
    
    INSERT INTO public.commissions (
      affiliate_id,
      subscription_id,
      amount,
      percentage,
      commission_type,
      status,
      reference_month,
      notes
    ) VALUES (
      v_affiliate_id,
      NEW.subscription_id,
      v_commission_amount,
      v_plan_commission_percentage,
      CASE 
        WHEN NEW.billing_reason = 'subscription_create' THEN 'primeira_venda'
        ELSE 'renovacao'
      END,
      'pending',
      DATE_TRUNC('month', NEW.payment_date)::DATE,
      'Comissão gerada automaticamente via pagamento #' || NEW.stripe_invoice_id
    );
    
    RAISE NOTICE 'Comissão criada: R$ % para afiliado % (referrer_code: %)', 
      v_commission_amount, v_affiliate_id, v_referrer_affiliate_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run after payment insert
CREATE TRIGGER tr_generate_commission_after_payment
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_commission_from_payment();

-- Add trigger for updated_at
CREATE TRIGGER handle_payments_updated_at 
  BEFORE UPDATE ON public.payments
  FOR EACH ROW 
  EXECUTE PROCEDURE public.handle_updated_at();
