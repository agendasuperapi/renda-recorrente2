-- View para listar sub-afiliados (usuários indicados pelo afiliado logado)
-- Esta view une unified_users com profiles para mostrar dados completos dos sub-afiliados

CREATE OR REPLACE VIEW public.view_sub_affiliates
WITH (security_invoker = on) AS
SELECT 
  uu.id,
  uu.affiliate_id as parent_affiliate_id,  -- ID do afiliado que indicou (usuário logado)
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
WHERE uu.affiliate_id IS NOT NULL  -- Apenas usuários que têm um afiliado (foram indicados)
ORDER BY uu.created_at DESC;

-- Garantir acesso para usuários autenticados (RLS será aplicado via policies das tabelas base)
GRANT SELECT ON public.view_sub_affiliates TO authenticated;

-- Comentário explicativo
COMMENT ON VIEW public.view_sub_affiliates IS 'View que lista sub-afiliados (usuários indicados) com seus dados, plano, quantidade de indicações e comissões geradas.';
