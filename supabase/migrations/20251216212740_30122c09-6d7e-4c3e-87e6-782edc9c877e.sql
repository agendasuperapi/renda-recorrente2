-- Adicionar coluna avatar_url na tabela unified_users
ALTER TABLE public.unified_users
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.unified_users.avatar_url IS 'URL do avatar do usuário';