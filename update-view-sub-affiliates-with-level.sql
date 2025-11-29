-- Atualizar view para incluir o campo level da tabela sub_affiliates
-- Agora filtra corretamente o level baseado no parent_affiliate_id
CREATE OR REPLACE VIEW public.view_sub_affiliates
WITH (security_invoker = on) AS
SELECT 
  uu.id,
  sa.parent_affiliate_id,
  uu.external_user_id,
  p.name,
  p.username,
  p.email,
  p.avatar_url,
  pl.name as plan_name,
  pl.id as plan_id,
  uu.status,
  uu.created_at,
  uu.product_id,
  sa.level,
  -- Contar quantas indicações este sub-afiliado fez
  COALESCE(
    (SELECT COUNT(*)::integer 
     FROM public.unified_users sub 
     WHERE sub.affiliate_id = uu.external_user_id), 
    0
  ) as referrals_count,
  -- Somar comissões que o AFILIADO PAI ganhou através deste sub-afiliado e sua rede
  COALESCE(
    (SELECT SUM(c.amount)
     FROM public.commissions c
     JOIN public.unified_users uu_comm ON uu_comm.id = c.unified_user_id
     WHERE c.affiliate_id = sa.parent_affiliate_id
     AND c.status IN ('pending', 'available', 'paid')
     AND (
       uu_comm.external_user_id = uu.external_user_id
       OR EXISTS (
         SELECT 1 FROM public.sub_affiliates sa2
         WHERE sa2.parent_affiliate_id = uu.external_user_id
         AND sa2.sub_affiliate_id = uu_comm.external_user_id
       )
     )),
    0
  ) as my_commission_from_sub
FROM public.sub_affiliates sa
JOIN public.unified_users uu ON uu.external_user_id = sa.sub_affiliate_id
LEFT JOIN public.profiles p ON p.id = uu.external_user_id
LEFT JOIN public.plans pl ON pl.id = uu.plan_id
ORDER BY uu.created_at DESC;


-- Garantir acesso para usuários autenticados
GRANT SELECT ON public.view_sub_affiliates TO authenticated;

-- Comentário explicativo
COMMENT ON VIEW public.view_sub_affiliates IS 'View que lista sub-afiliados com seus dados, plano, nível, quantidade de indicações e comissões que o afiliado PAI ganhou através deste sub-afiliado e sua rede.';
