-- Função que anonimiza dados quando usuário é excluído diretamente do auth.users
CREATE OR REPLACE FUNCTION public.handle_user_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_subscription RECORD;
  v_deleted_username TEXT;
BEGIN
  -- Buscar dados do perfil para auditoria
  SELECT name, email INTO v_profile
  FROM public.profiles
  WHERE id = OLD.id;
  
  -- Buscar status da subscription
  SELECT id, status, cancel_at_period_end INTO v_subscription
  FROM public.subscriptions
  WHERE user_id = OLD.id
    AND status IN ('active', 'trialing')
  LIMIT 1;
  
  -- Registrar na tabela de auditoria (deleted_users)
  INSERT INTO public.deleted_users (
    user_id,
    name,
    email,
    deletion_reason,
    metadata
  ) VALUES (
    OLD.id,
    COALESCE(v_profile.name, 'Usuário'),
    COALESCE(v_profile.email, OLD.email, 'email@desconhecido.com'),
    'Excluído diretamente pelo painel Supabase',
    jsonb_build_object(
      'deleted_at_timestamp', now(),
      'deleted_by_admin', true,
      'had_subscription', v_subscription.id IS NOT NULL,
      'subscription_was_cancelled', COALESCE(v_subscription.cancel_at_period_end, false)
    )
  );
  
  -- Gerar username anônimo único
  v_deleted_username := 'deleted_' || substr(OLD.id::text, 1, 8) || '_' || 
                        extract(epoch from now())::bigint;
  
  -- Anonimizar dados do perfil
  UPDATE public.profiles
  SET 
    name = '##EXCLUÍDO##',
    username = v_deleted_username,
    email = NULL,
    phone = NULL,
    cpf = NULL,
    birth_date = NULL,
    gender = NULL,
    cep = NULL,
    street = NULL,
    number = NULL,
    complement = NULL,
    neighborhood = NULL,
    city = NULL,
    state = NULL,
    instagram = NULL,
    facebook = NULL,
    tiktok = NULL,
    youtube = NULL,
    twitter = NULL,
    linkedin = NULL,
    pix_key = NULL,
    pix_type = NULL,
    avatar_url = NULL,
    deleted_at = now(),
    deleted_reason = 'Excluído diretamente pelo painel Supabase'
  WHERE id = OLD.id;
  
  -- Marcar unified_users como deletado
  UPDATE public.unified_users
  SET deleted_at = now()
  WHERE external_user_id = OLD.id;
  
  RAISE NOTICE 'Usuário % anonimizado via trigger de exclusão', OLD.id;
  
  RETURN OLD;
END;
$$;

-- Trigger BEFORE DELETE em auth.users
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_deletion();