-- Adicionar índice na coluna avatar_url para melhorar performance
CREATE INDEX IF NOT EXISTS idx_unified_users_avatar_url ON public.unified_users(avatar_url);