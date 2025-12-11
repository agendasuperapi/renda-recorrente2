-- Adicionar campos de rastreamento de processamento de comissão
ALTER TABLE public.unified_payments 
ADD COLUMN IF NOT EXISTS commission_processed BOOLEAN DEFAULT FALSE;

ALTER TABLE public.unified_payments 
ADD COLUMN IF NOT EXISTS commission_processed_at TIMESTAMPTZ;

ALTER TABLE public.unified_payments 
ADD COLUMN IF NOT EXISTS commission_error TEXT;

ALTER TABLE public.unified_payments 
ADD COLUMN IF NOT EXISTS commissions_generated INTEGER DEFAULT 0;

-- Índice para consultas de pagamentos não processados ou com erro
CREATE INDEX IF NOT EXISTS idx_unified_payments_commission_processed 
ON public.unified_payments(commission_processed) 
WHERE commission_processed = FALSE;

CREATE INDEX IF NOT EXISTS idx_unified_payments_commission_error 
ON public.unified_payments(commission_error) 
WHERE commission_error IS NOT NULL;

-- Comentários explicativos
COMMENT ON COLUMN public.unified_payments.commission_processed IS 'Indica se o processamento de comissão foi executado para este pagamento';
COMMENT ON COLUMN public.unified_payments.commission_processed_at IS 'Data/hora em que o processamento de comissão foi executado';
COMMENT ON COLUMN public.unified_payments.commission_error IS 'Mensagem de erro caso o processamento de comissão tenha falhado';
COMMENT ON COLUMN public.unified_payments.commissions_generated IS 'Quantidade de comissões geradas a partir deste pagamento';