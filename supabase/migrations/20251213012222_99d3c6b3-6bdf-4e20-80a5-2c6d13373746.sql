-- Adicionar campos de tracking de deploy na tabela app_versions
ALTER TABLE public.app_versions 
ADD COLUMN IF NOT EXISTS deploy_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS deploy_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deploy_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS github_run_id TEXT,
ADD COLUMN IF NOT EXISTS deploy_error TEXT;

-- Criar índice para consultas por status
CREATE INDEX IF NOT EXISTS idx_app_versions_deploy_status ON public.app_versions(deploy_status);

-- Comentários para documentação
COMMENT ON COLUMN public.app_versions.deploy_status IS 'Status do deploy: pending, deploying, success, failed';
COMMENT ON COLUMN public.app_versions.deploy_started_at IS 'Data/hora que o deploy foi iniciado';
COMMENT ON COLUMN public.app_versions.deploy_completed_at IS 'Data/hora que o deploy foi concluído';
COMMENT ON COLUMN public.app_versions.github_run_id IS 'ID do workflow run no GitHub Actions';
COMMENT ON COLUMN public.app_versions.deploy_error IS 'Mensagem de erro se o deploy falhou';