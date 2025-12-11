-- Corrigir trigger populate_sub_affiliates para só criar relacionamentos 
-- para o produto principal (APP Renda recorrente) onde external_user_id = profile.id
-- Para produtos externos, external_user_id é um ID externo, não um profile ID

CREATE OR REPLACE FUNCTION public.populate_sub_affiliates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_main_product_id UUID := 'bb582482-b006-47b8-b6ea-a6944d8cfdfd'; -- APP Renda recorrente
  v_parent_profile_id UUID;
  v_current_ancestor_id UUID;
  v_level INTEGER;
  v_max_levels INTEGER;
BEGIN
  -- Só processa se o affiliate_id não for nulo
  IF NEW.affiliate_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- IMPORTANTE: Só cria relacionamentos sub_affiliates para o produto principal
  -- Produtos externos têm external_user_id que não existe na tabela profiles
  IF NEW.product_id != v_main_product_id THEN
    RAISE NOTICE 'Produto externo % - não criando sub_affiliates (external_user_id não é um profile)', NEW.product_id;
    RETURN NEW;
  END IF;
  
  -- Evitar que alguém seja sub-afiliado de si mesmo
  IF NEW.affiliate_id = NEW.external_user_id THEN
    RAISE NOTICE 'Usuário não pode ser sub-afiliado de si mesmo: %', NEW.external_user_id;
    RETURN NEW;
  END IF;
  
  -- Verificar se o external_user_id existe como profile (para produtos locais)
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.external_user_id) THEN
    RAISE NOTICE 'external_user_id % não existe em profiles - não criando sub_affiliates', NEW.external_user_id;
    RETURN NEW;
  END IF;
  
  -- Buscar o profile_id do afiliado pai
  SELECT id INTO v_parent_profile_id
  FROM public.profiles
  WHERE id = NEW.affiliate_id
  LIMIT 1;
  
  -- Se não encontrou o pai, não faz nada
  IF v_parent_profile_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Buscar o número máximo de níveis permitidos
  SELECT COALESCE(value::integer, 3) INTO v_max_levels
  FROM public.app_settings
  WHERE key = 'max_affiliate_levels';
  
  -- Inserir relacionamento direto (nível 1 com o pai imediato)
  INSERT INTO public.sub_affiliates (
    parent_affiliate_id,
    sub_affiliate_id,
    level,
    created_at
  ) VALUES (
    v_parent_profile_id,
    NEW.external_user_id,
    1,
    NEW.created_at
  )
  ON CONFLICT (parent_affiliate_id, sub_affiliate_id) 
  DO NOTHING;
  
  -- Inserir relacionamentos com ancestrais superiores na hierarquia
  v_current_ancestor_id := v_parent_profile_id;
  v_level := 2;
  
  WHILE v_level <= v_max_levels LOOP
    -- Buscar o próximo ancestral na hierarquia
    SELECT sa.parent_affiliate_id INTO v_current_ancestor_id
    FROM public.sub_affiliates sa
    WHERE sa.sub_affiliate_id = v_current_ancestor_id
      AND sa.level = 1
    LIMIT 1;
    
    -- Se não encontrou mais ancestrais, para o loop
    EXIT WHEN v_current_ancestor_id IS NULL;
    
    -- Evitar que alguém seja sub-afiliado de si mesmo
    IF v_current_ancestor_id = NEW.external_user_id THEN
      EXIT;
    END IF;
    
    -- Inserir relacionamento com o ancestral
    INSERT INTO public.sub_affiliates (
      parent_affiliate_id,
      sub_affiliate_id,
      level,
      created_at
    ) VALUES (
      v_current_ancestor_id,
      NEW.external_user_id,
      v_level,
      NEW.created_at
    )
    ON CONFLICT (parent_affiliate_id, sub_affiliate_id) 
    DO NOTHING;
    
    v_level := v_level + 1;
  END LOOP;
  
  RAISE NOTICE 'Sub-afiliado adicionado com hierarquia: %', NEW.external_user_id;
  
  RETURN NEW;
END;
$function$;

-- Atualizar comentário
COMMENT ON FUNCTION public.populate_sub_affiliates() IS 
'Trigger function que popula automaticamente a tabela sub_affiliates quando um novo usuário é adicionado em unified_users com affiliate_id. Só funciona para o produto principal (APP Renda recorrente) onde external_user_id = profile.id';