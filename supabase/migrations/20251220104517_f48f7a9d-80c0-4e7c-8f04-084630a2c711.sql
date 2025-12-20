-- Adicionar coluna environment em profiles (todos existentes serão 'test' por padrão)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'test';

-- Adicionar coluna environment em user_roles (todos existentes serão 'test' por padrão)
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'test';

-- Criar índices para filtrar por ambiente
CREATE INDEX IF NOT EXISTS idx_profiles_environment ON public.profiles(environment);
CREATE INDEX IF NOT EXISTS idx_user_roles_environment ON public.user_roles(environment);

-- Atualizar a função handle_new_user para definir o environment baseado no email e configuração do sistema
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_environment text;
  v_is_test_email boolean;
BEGIN
  -- Verificar se é email de teste (@testex.com)
  v_is_test_email := NEW.email ILIKE '%@testex.com';
  
  -- Se for email de teste, sempre usar ambiente 'test'
  IF v_is_test_email THEN
    v_environment := 'test';
  ELSE
    -- Buscar ambiente atual do sistema
    SELECT value INTO v_environment
    FROM app_settings
    WHERE key = 'environment_mode';
    
    -- Default para 'production' se não encontrar
    v_environment := COALESCE(v_environment, 'production');
  END IF;
  
  -- Inserir profile com environment
  INSERT INTO public.profiles (id, name, username, affiliate_code, email, environment)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    lower(replace(COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), ' ', '_')) || '_' || substr(NEW.id::text, 1, 6),
    upper(substr(md5(NEW.id::text), 1, 8)),
    NEW.email,
    v_environment
  );
  
  -- Inserir role com environment
  INSERT INTO public.user_roles (user_id, role, environment)
  VALUES (NEW.id, 'afiliado', v_environment);
  
  RETURN NEW;
END;
$$;