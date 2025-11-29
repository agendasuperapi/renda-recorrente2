-- Adicionar coluna unified_user_id à tabela commissions
ALTER TABLE public.commissions 
ADD COLUMN IF NOT EXISTS unified_user_id UUID NULL;

-- Adicionar foreign key para unified_users
ALTER TABLE public.commissions
ADD CONSTRAINT fk_commissions_unified_user_id 
FOREIGN KEY (unified_user_id) 
REFERENCES public.unified_users(id) 
ON DELETE SET NULL;

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_commissions_unified_user_id ON public.commissions(unified_user_id);

COMMENT ON COLUMN public.commissions.unified_user_id IS 'ID do usuário unificado que gerou a comissão';
