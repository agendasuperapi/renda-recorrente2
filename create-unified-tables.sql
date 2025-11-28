-- Criar tabela de usuários unificados de todos os produtos
CREATE TABLE IF NOT EXISTS public.unified_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  cpf TEXT,
  affiliate_code TEXT,
  referrer_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(external_user_id, product_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_unified_users_external_id ON public.unified_users(external_user_id);
CREATE INDEX IF NOT EXISTS idx_unified_users_product_id ON public.unified_users(product_id);
CREATE INDEX IF NOT EXISTS idx_unified_users_email ON public.unified_users(email);
CREATE INDEX IF NOT EXISTS idx_unified_users_referrer_code ON public.unified_users(referrer_code);
CREATE INDEX IF NOT EXISTS idx_unified_users_affiliate_code ON public.unified_users(affiliate_code);

-- Trigger para atualizar updated_at
CREATE TRIGGER handle_unified_users_updated_at
  BEFORE UPDATE ON public.unified_users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Criar tabela de pagamentos unificados de todos os produtos
CREATE TABLE IF NOT EXISTS public.unified_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_payment_id UUID,
  unified_user_id UUID REFERENCES public.unified_users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  stripe_invoice_id TEXT,
  stripe_subscription_id TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'brl',
  billing_reason TEXT,
  status TEXT NOT NULL DEFAULT 'paid',
  payment_date TIMESTAMPTZ DEFAULT now(),
  affiliate_id UUID,
  affiliate_coupon_id UUID,
  environment TEXT DEFAULT 'production',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(external_payment_id, product_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_unified_payments_unified_user_id ON public.unified_payments(unified_user_id);
CREATE INDEX IF NOT EXISTS idx_unified_payments_product_id ON public.unified_payments(product_id);
CREATE INDEX IF NOT EXISTS idx_unified_payments_external_id ON public.unified_payments(external_payment_id);
CREATE INDEX IF NOT EXISTS idx_unified_payments_stripe_invoice ON public.unified_payments(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_unified_payments_stripe_subscription ON public.unified_payments(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_unified_payments_affiliate_id ON public.unified_payments(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_unified_payments_payment_date ON public.unified_payments(payment_date);

COMMENT ON TABLE public.unified_users IS 'Usuários unificados de todos os produtos para controle de comissões';
COMMENT ON TABLE public.unified_payments IS 'Pagamentos unificados de todos os produtos para geração de comissões';

-- RLS Policies para unified_users
ALTER TABLE public.unified_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all unified users"
  ON public.unified_users
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "System can insert unified users"
  ON public.unified_users
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Affiliates can view their unified user data"
  ON public.unified_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.affiliate_code = unified_users.referrer_code
    )
  );

-- RLS Policies para unified_payments
ALTER TABLE public.unified_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all unified payments"
  ON public.unified_payments
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "System can insert unified payments"
  ON public.unified_payments
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Affiliates can view their unified payments"
  ON public.unified_payments
  FOR SELECT
  USING (
    affiliate_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.unified_users
      WHERE unified_users.id = unified_payments.unified_user_id
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.affiliate_code = unified_users.referrer_code
      )
    )
  );
