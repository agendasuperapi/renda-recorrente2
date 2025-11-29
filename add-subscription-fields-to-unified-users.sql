-- Adicionar campos de subscription na tabela unified_users
-- Esses campos permitem rastrear o status da assinatura de cada usuário unificado

ALTER TABLE public.unified_users
ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'production',
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- Índices para melhor performance nas queries
CREATE INDEX IF NOT EXISTS idx_unified_users_status ON public.unified_users(status);
CREATE INDEX IF NOT EXISTS idx_unified_users_plan_id ON public.unified_users(plan_id);
CREATE INDEX IF NOT EXISTS idx_unified_users_environment ON public.unified_users(environment);
CREATE INDEX IF NOT EXISTS idx_unified_users_current_period_end ON public.unified_users(current_period_end);

-- Comentários para documentação
COMMENT ON COLUMN public.unified_users.environment IS 'Ambiente do sistema: test ou production';
COMMENT ON COLUMN public.unified_users.plan_id IS 'Plano atual do usuário';
COMMENT ON COLUMN public.unified_users.cancel_at_period_end IS 'Se a assinatura será cancelada no fim do período';
COMMENT ON COLUMN public.unified_users.trial_end IS 'Data de término do período trial';
COMMENT ON COLUMN public.unified_users.status IS 'Status da assinatura: active, canceled, past_due, trialing, incomplete, etc';
COMMENT ON COLUMN public.unified_users.current_period_start IS 'Início do período atual da assinatura';
COMMENT ON COLUMN public.unified_users.current_period_end IS 'Fim do período atual da assinatura';
