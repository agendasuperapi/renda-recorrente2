-- Adicionar campos product_id e unified_payment_id à tabela commissions
ALTER TABLE public.commissions 
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.commissions 
ADD COLUMN IF NOT EXISTS unified_payment_id UUID REFERENCES public.unified_payments(id) ON DELETE SET NULL;

-- Criar índices para melhorar performance das queries/views
CREATE INDEX IF NOT EXISTS idx_commissions_product_id ON public.commissions(product_id);
CREATE INDEX IF NOT EXISTS idx_commissions_unified_payment_id ON public.commissions(unified_payment_id);

COMMENT ON COLUMN public.commissions.product_id IS 'Referência ao produto relacionado à comissão';
COMMENT ON COLUMN public.commissions.unified_payment_id IS 'Referência ao pagamento unificado que gerou a comissão';
