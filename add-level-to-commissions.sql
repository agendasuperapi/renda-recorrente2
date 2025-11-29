-- Adicionar coluna level à tabela commissions
ALTER TABLE public.commissions 
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_commissions_level ON public.commissions(level);

COMMENT ON COLUMN public.commissions.level IS 'Nível da comissão na hierarquia de afiliados (1 = direto, 2+ = indireto)';

-- Atualizar comissões existentes para ter level = 1
UPDATE public.commissions 
SET level = 1 
WHERE level IS NULL;
