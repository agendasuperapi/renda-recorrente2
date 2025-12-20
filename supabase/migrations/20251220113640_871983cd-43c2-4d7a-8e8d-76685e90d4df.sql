-- Dropar e recriar view para usar environment da tabela profiles (mais preciso)
DROP VIEW IF EXISTS public.view_admin_affiliates;

CREATE VIEW public.view_admin_affiliates
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.name,
  p.email,
  p.username,
  p.avatar_url,
  p.created_at,
  p.is_blocked,
  p.withdrawal_day,
  p.environment,
  COALESCE(pl.name, 'Sem plano') as plan_name,
  COALESCE(pl.billing_period, '-') as plan_period,
  COALESCE(s.status, 'inactive') as plan_status,
  COALESCE((
    SELECT COUNT(*)::integer 
    FROM unified_users uu 
    WHERE uu.affiliate_id = p.id
  ), 0) as referrals_count
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'super_admin'
LEFT JOIN LATERAL (
  SELECT * 
  FROM subscriptions 
  WHERE user_id = p.id 
  ORDER BY created_at DESC 
  LIMIT 1
) s ON true
LEFT JOIN plans pl ON pl.id = s.plan_id
WHERE ur.user_id IS NULL;  -- Exclui super_admins

-- Garantir acesso
GRANT SELECT ON public.view_admin_affiliates TO authenticated;

COMMENT ON VIEW public.view_admin_affiliates IS 'View otimizada para listagem de afiliados no painel admin. Usa environment do profiles para filtro mais preciso.';