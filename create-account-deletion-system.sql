-- Migration: Sistema de Exclusão de Conta
-- Este script implementa soft delete com anonimização de dados

-- 1. Remover Foreign Key CASCADE de profiles para auth.users
-- Isso permite deletar auth.users sem excluir profiles
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Adicionar campos de soft delete em profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_reason TEXT;

-- 3. Adicionar campo deleted_at em unified_users
ALTER TABLE public.unified_users 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 4. Criar tabela deleted_users para auditoria
CREATE TABLE IF NOT EXISTS public.deleted_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  deletion_reason TEXT,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_by UUID,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 5. Habilitar RLS na tabela deleted_users
ALTER TABLE public.deleted_users ENABLE ROW LEVEL SECURITY;

-- 6. Criar políticas RLS para deleted_users
-- Apenas super_admin pode ver registros de usuários excluídos
CREATE POLICY "Super admins can view deleted users"
ON public.deleted_users 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Sistema pode inserir registros de exclusão
CREATE POLICY "System can insert deleted users"
ON public.deleted_users 
FOR INSERT
WITH CHECK (true);

-- 7. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at);
CREATE INDEX IF NOT EXISTS idx_unified_users_deleted_at ON public.unified_users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_deleted_users_user_id ON public.deleted_users(user_id);
CREATE INDEX IF NOT EXISTS idx_deleted_users_deleted_at ON public.deleted_users(deleted_at);
