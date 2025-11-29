-- Adicionar constraint UNIQUE para evitar duplicatas em sub_affiliates
-- Primeiro, remover possíveis duplicatas existentes
DELETE FROM public.sub_affiliates sa1
WHERE EXISTS (
  SELECT 1 FROM public.sub_affiliates sa2
  WHERE sa1.parent_affiliate_id = sa2.parent_affiliate_id
    AND sa1.sub_affiliate_id = sa2.sub_affiliate_id
    AND sa1.id > sa2.id
);

-- Adicionar constraint UNIQUE
ALTER TABLE public.sub_affiliates 
ADD CONSTRAINT sub_affiliates_parent_sub_unique 
UNIQUE (parent_affiliate_id, sub_affiliate_id);

-- Comentário explicativo
COMMENT ON CONSTRAINT sub_affiliates_parent_sub_unique ON public.sub_affiliates IS 
'Garante que não existem registros duplicados de sub-afiliados para o mesmo pai';
