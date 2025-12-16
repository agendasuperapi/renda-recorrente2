-- Dropar e recriar view para usar unified_users.affiliate_id como fonte do indicador
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
  referrer.affiliate_code as referrer_code,
  referrer.name as referrer_name,
  COALESCE(pl.name, 'Sem plano') as plan_name,
  COALESCE(pl.billing_period, '-') as plan_period,
  COALESCE(s.status, 'inactive') as plan_status,
  COALESCE((
    SELECT COUNT(*)::integer 
    FROM unified_users uu 
    WHERE uu.affiliate_id = p.id
  ), 0) as referrals_count
FROM profiles p
LEFT JOIN unified_users uu_self ON uu_self.external_user_id = p.id
LEFT JOIN profiles referrer ON referrer.id = uu_self.affiliate_id
LEFT JOIN LATERAL (
  SELECT * 
  FROM subscriptions 
  WHERE user_id = p.id 
  ORDER BY created_at DESC 
  LIMIT 1
) s ON true
LEFT JOIN plans pl ON pl.id = s.plan_id;

-- Garantir acesso
GRANT SELECT ON public.view_admin_affiliates TO authenticated;