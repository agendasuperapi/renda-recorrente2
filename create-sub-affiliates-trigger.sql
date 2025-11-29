-- Função para popular automaticamente a tabela sub_affiliates
-- quando um usuário é adicionado com affiliate_id em unified_users
CREATE OR REPLACE FUNCTION public.populate_sub_affiliates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_parent_profile_id UUID;
  v_current_ancestor_id UUID;
  v_level INTEGER;
  v_max_levels INTEGER;
BEGIN
  -- Só processa se o affiliate_id não for nulo
  IF NEW.affiliate_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Evitar que alguém seja sub-afiliado de si mesmo
  IF NEW.affiliate_id = NEW.external_user_id THEN
    RAISE NOTICE 'Usuário não pode ser sub-afiliado de si mesmo: %', NEW.external_user_id;
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

-- Criar trigger em unified_users para popular sub_affiliates
DROP TRIGGER IF EXISTS populate_sub_affiliates_trigger ON public.unified_users;

CREATE TRIGGER populate_sub_affiliates_trigger
  AFTER INSERT OR UPDATE ON public.unified_users
  FOR EACH ROW
  WHEN (NEW.affiliate_id IS NOT NULL)
  EXECUTE FUNCTION public.populate_sub_affiliates();

-- Popular dados históricos (usuários que já existem em unified_users mas não em sub_affiliates)
-- Esta query será executada uma única vez para popular os dados existentes
-- O trigger cuidará dos novos registros automaticamente
DO $$
DECLARE
  v_user RECORD;
  v_max_levels INTEGER;
BEGIN
  -- Buscar o número máximo de níveis permitidos
  SELECT COALESCE(value::integer, 3) INTO v_max_levels
  FROM public.app_settings
  WHERE key = 'max_affiliate_levels';
  
  -- Para cada usuário em unified_users que tem affiliate_id
  FOR v_user IN 
    SELECT DISTINCT
      uu.affiliate_id,
      uu.external_user_id,
      uu.created_at
    FROM public.unified_users uu
    WHERE uu.affiliate_id IS NOT NULL
      AND uu.affiliate_id != uu.external_user_id
    ORDER BY uu.created_at ASC
  LOOP
    -- Executar a mesma lógica do trigger para popular a hierarquia
    DECLARE
      v_current_ancestor_id UUID;
      v_level INTEGER;
    BEGIN
      -- Inserir relacionamento direto (nível 1)
      INSERT INTO public.sub_affiliates (
        parent_affiliate_id,
        sub_affiliate_id,
        level,
        created_at
      ) VALUES (
        v_user.affiliate_id,
        v_user.external_user_id,
        1,
        v_user.created_at
      )
      ON CONFLICT (parent_affiliate_id, sub_affiliate_id) DO NOTHING;
      
      -- Inserir relacionamentos com ancestrais superiores
      v_current_ancestor_id := v_user.affiliate_id;
      v_level := 2;
      
      WHILE v_level <= v_max_levels LOOP
        SELECT sa.parent_affiliate_id INTO v_current_ancestor_id
        FROM public.sub_affiliates sa
        WHERE sa.sub_affiliate_id = v_current_ancestor_id
          AND sa.level = 1
        LIMIT 1;
        
        EXIT WHEN v_current_ancestor_id IS NULL;
        EXIT WHEN v_current_ancestor_id = v_user.external_user_id;
        
        INSERT INTO public.sub_affiliates (
          parent_affiliate_id,
          sub_affiliate_id,
          level,
          created_at
        ) VALUES (
          v_current_ancestor_id,
          v_user.external_user_id,
          v_level,
          v_user.created_at
        )
        ON CONFLICT (parent_affiliate_id, sub_affiliate_id) DO NOTHING;
        
        v_level := v_level + 1;
      END LOOP;
    END;
  END LOOP;
END $$;

-- Comentário explicativo
COMMENT ON FUNCTION public.populate_sub_affiliates() IS 
'Trigger function que popula automaticamente a tabela sub_affiliates quando um novo usuário é adicionado em unified_users com affiliate_id';
