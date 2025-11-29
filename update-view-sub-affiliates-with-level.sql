-- Atualizar view para incluir o campo level da tabela sub_affiliates
CREATE OR REPLACE VIEW public.view_sub_affiliates
WITH (security_invoker = on) AS
SELECT 
  uu.id,
  uu.affiliate_id as parent_affiliate_id,
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
  -- Buscar o level da tabela sub_affiliates
  COALESCE(sa.level, 1) as level,
  -- Contar quantas indicações este sub-afiliado fez
  COALESCE(
    (SELECT COUNT(*)::integer 
     FROM public.unified_users sub 
     WHERE sub.affiliate_id = uu.external_user_id), 
    0
  ) as referrals_count,
  -- Somar comissões geradas por este sub-afiliado
  COALESCE(
    (SELECT SUM(amount) 
     FROM public.commissions c 
     WHERE c.affiliate_id = uu.external_user_id 
     AND c.status IN ('pending', 'available', 'paid')), 
    0
  ) as total_commission
FROM public.unified_users uu
LEFT JOIN public.profiles p ON p.id = uu.external_user_id
LEFT JOIN public.plans pl ON pl.id = uu.plan_id
LEFT JOIN public.sub_affiliates sa ON sa.sub_affiliate_id = uu.external_user_id
WHERE uu.affiliate_id IS NOT NULL
ORDER BY uu.created_at DESC;

-- Garantir acesso para usuários autenticados
GRANT SELECT ON public.view_sub_affiliates TO authenticated;

-- Comentário explicativo
COMMENT ON VIEW public.view_sub_affiliates IS 'View que lista sub-afiliados com seus dados, plano, nível, quantidade de indicações e comissões geradas.';
