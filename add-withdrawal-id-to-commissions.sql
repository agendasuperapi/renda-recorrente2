-- Adicionar novo status 'requested' ao enum commission_status
ALTER TYPE commission_status ADD VALUE IF NOT EXISTS 'requested';

-- Adicionar coluna withdrawal_id à tabela commissions
ALTER TABLE public.commissions 
ADD COLUMN IF NOT EXISTS withdrawal_id UUID NULL;

-- Adicionar foreign key para withdrawals
ALTER TABLE public.commissions
ADD CONSTRAINT fk_commissions_withdrawal_id 
FOREIGN KEY (withdrawal_id) 
REFERENCES public.withdrawals(id) 
ON DELETE SET NULL;

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_commissions_withdrawal_id ON public.commissions(withdrawal_id);

COMMENT ON COLUMN public.commissions.withdrawal_id IS 'ID do saque ao qual esta comissão está vinculada';
