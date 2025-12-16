-- Atualizar view para mostrar o custom_code do cupom usado na indicação
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
  first_payment.custom_code as referrer_code,
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
  SELECT ac.custom_code
  FROM unified_payments up
  LEFT JOIN affiliate_coupons ac ON ac.id = up.affiliate_coupon_id
  WHERE up.unified_user_id = uu_self.id
  ORDER BY up.created_at ASC
  LIMIT 1
) first_payment ON true
LEFT JOIN LATERAL (
  SELECT * 
  FROM subscriptions 
  WHERE user_id = p.id 
  ORDER BY created_at DESC 
  LIMIT 1
) s ON true
LEFT JOIN plans pl ON pl.id = s.plan_id;

GRANT SELECT ON public.view_admin_affiliates TO authenticated;