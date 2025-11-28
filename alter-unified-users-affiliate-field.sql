-- Alterar unified_users para usar affiliate_id ao invés de referrer_code
ALTER TABLE public.unified_users DROP COLUMN IF EXISTS referrer_code;
ALTER TABLE public.unified_users ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Atualizar índice
DROP INDEX IF EXISTS idx_unified_users_referrer_code;
CREATE INDEX IF NOT EXISTS idx_unified_users_affiliate_id ON public.unified_users(affiliate_id);

-- Atualizar RLS policy para usar affiliate_id
DROP POLICY IF EXISTS "Affiliates can view their unified user data" ON public.unified_users;

CREATE POLICY "Affiliates can view their unified user data"
  ON public.unified_users
  FOR SELECT
  USING (
    affiliate_id = auth.uid()
  );

-- Atualizar policy de pagamentos também
DROP POLICY IF EXISTS "Affiliates can view their unified payments" ON public.unified_payments;

CREATE POLICY "Affiliates can view their unified payments"
  ON public.unified_payments
  FOR SELECT
  USING (
    affiliate_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.unified_users
      WHERE unified_users.id = unified_payments.unified_user_id
      AND unified_users.affiliate_id = auth.uid()
    )
  );
