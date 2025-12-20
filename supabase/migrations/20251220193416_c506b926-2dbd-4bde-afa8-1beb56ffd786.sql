-- Create function to remove accents from text
CREATE OR REPLACE FUNCTION public.remove_accents(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT translate(
    lower(p_text),
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiioooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
  );
$$;

-- Create function to generate a friendly username
CREATE OR REPLACE FUNCTION public.generate_friendly_username(p_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_name text;
  v_base_username text;
  v_candidate text;
  v_suffix text;
  v_attempts int := 0;
  v_max_attempts int := 10;
BEGIN
  -- Extract first name and remove accents
  v_first_name := remove_accents(split_part(COALESCE(p_name, 'user'), ' ', 1));
  
  -- Remove any non-alphanumeric characters
  v_base_username := regexp_replace(v_first_name, '[^a-z0-9]', '', 'gi');
  
  -- If empty, use 'user' as fallback
  IF v_base_username = '' OR v_base_username IS NULL THEN
    v_base_username := 'user';
  END IF;
  
  -- Try with 2 digits first (10 attempts)
  FOR v_attempts IN 1..v_max_attempts LOOP
    v_suffix := lpad((floor(random() * 100))::text, 2, '0');
    v_candidate := v_base_username || v_suffix;
    
    -- Check if username is available
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE LOWER(username) = LOWER(v_candidate)) THEN
      RETURN v_candidate;
    END IF;
  END LOOP;
  
  -- Try with 3 digits (10 attempts)
  FOR v_attempts IN 1..v_max_attempts LOOP
    v_suffix := lpad((floor(random() * 1000))::text, 3, '0');
    v_candidate := v_base_username || v_suffix;
    
    -- Check if username is available
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE LOWER(username) = LOWER(v_candidate)) THEN
      RETURN v_candidate;
    END IF;
  END LOOP;
  
  -- Fallback: use UUID fragment (very unlikely to reach here)
  RETURN v_base_username || '_' || substr(gen_random_uuid()::text, 1, 6);
END;
$$;

-- Update handle_new_user to use the new friendly username generator
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_environment text;
  v_is_test_email boolean;
  v_name text;
  v_username text;
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
  
  -- Get the name
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  
  -- Generate friendly username
  v_username := generate_friendly_username(v_name);
  
  -- Inserir profile com environment
  INSERT INTO public.profiles (id, name, username, affiliate_code, email, environment)
  VALUES (
    NEW.id,
    v_name,
    v_username,
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