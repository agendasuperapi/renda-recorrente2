-- Função para popular automaticamente a tabela sub_affiliates
-- quando um usuário é adicionado com affiliate_id em unified_users
CREATE OR REPLACE FUNCTION public.populate_sub_affiliates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_parent_profile_id UUID;
BEGIN
  -- Só processa se o affiliate_id não for nulo
  IF NEW.affiliate_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Buscar o profile_id do afiliado pai pelo affiliate_code
  SELECT id INTO v_parent_profile_id
  FROM public.profiles
  WHERE id = NEW.affiliate_id
  LIMIT 1;
  
  -- Se não encontrou o pai, não faz nada
  IF v_parent_profile_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Inserir na tabela sub_affiliates (com UPSERT para evitar duplicatas)
  INSERT INTO public.sub_affiliates (
    parent_affiliate_id,
    sub_affiliate_id,
    level,
    created_at
  ) VALUES (
    v_parent_profile_id,
    NEW.external_user_id,
    1, -- Nível 1 por padrão (pode ser calculado depois se necessário)
    NEW.created_at
  )
  ON CONFLICT (parent_affiliate_id, sub_affiliate_id) 
  DO NOTHING;
  
  RAISE NOTICE 'Sub-afiliado adicionado: Pai %, Sub-afiliado %', 
    v_parent_profile_id, NEW.external_user_id;
  
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
INSERT INTO public.sub_affiliates (
  parent_affiliate_id,
  sub_affiliate_id,
  level,
  created_at
)
SELECT DISTINCT
  uu.affiliate_id as parent_affiliate_id,
  uu.external_user_id as sub_affiliate_id,
  1 as level,
  uu.created_at
FROM public.unified_users uu
WHERE uu.affiliate_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM public.sub_affiliates sa 
    WHERE sa.parent_affiliate_id = uu.affiliate_id 
      AND sa.sub_affiliate_id = uu.external_user_id
  );

-- Comentário explicativo
COMMENT ON FUNCTION public.populate_sub_affiliates() IS 
'Trigger function que popula automaticamente a tabela sub_affiliates quando um novo usuário é adicionado em unified_users com affiliate_id';
