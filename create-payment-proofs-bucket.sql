-- Criar bucket para comprovantes de pagamento
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies para o bucket payment-proofs
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs');

CREATE POLICY "Admins can upload payment proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment-proofs' 
  AND has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins can update payment proofs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'payment-proofs'
  AND has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins can delete payment proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'payment-proofs'
  AND has_role(auth.uid(), 'super_admin'::app_role)
);

-- Adicionar coluna para armazenar o URL do comprovante
ALTER TABLE public.withdrawals 
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT NULL;

COMMENT ON COLUMN public.withdrawals.payment_proof_url IS 'URL do comprovante de pagamento PIX';
