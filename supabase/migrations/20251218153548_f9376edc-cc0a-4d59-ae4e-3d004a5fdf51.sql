-- Remove foreign key constraint de plan_id na tabela unified_payments
-- Isso permite sincronizar pagamentos de servidores externos sem exigir que os planos existam localmente
ALTER TABLE public.unified_payments 
DROP CONSTRAINT IF EXISTS unified_payments_plan_id_fkey;

-- Remove foreign key constraint de plan_id na tabela unified_users (se existir)
ALTER TABLE public.unified_users 
DROP CONSTRAINT IF EXISTS unified_users_plan_id_fkey;

-- Adicionar comentários explicativos
COMMENT ON COLUMN public.unified_payments.plan_id IS 'ID do plano no servidor de origem - sem foreign key para permitir sincronização de servidores externos';
COMMENT ON COLUMN public.unified_users.plan_id IS 'ID do plano no servidor de origem - sem foreign key para permitir sincronização de servidores externos';