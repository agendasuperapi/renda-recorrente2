-- Corrigir view_referrals para buscar avatar do usuário indicado, não do afiliado
DROP VIEW IF EXISTS view_referrals;

CREATE VIEW view_referrals AS
SELECT 
  uu.id,
  uu.external_user_id,
  uu.product_id,
  uu.name,
  uu.email,
  uu.phone,
  uu.cpf,
  uu.affiliate_code,
  uu.affiliate_id,
  uu.environment,
  uu.plan_id,
  uu.cancel_at_period_end,
  uu.trial_end,
  uu.status,
  uu.current_period_start,
  uu.current_period_end,
  uu.created_at,
  uu.updated_at,
  p.nome as product_name,
  p.icone_light as product_icon_light,
  p.icone_dark as product_icon_dark,
  pl.name as plan_name,
  pl.price as plan_price,
  pl.billing_period as plan_billing_period,
  prof.id as referrer_id,
  prof.name as referrer_name,
  -- Avatar do usuário indicado (external_user_id), não do afiliado
  referred_profile.avatar_url as avatar_url,
  up.id as first_payment_id,
  ac.custom_code as coupon_code
FROM public.unified_users uu
LEFT JOIN public.products p ON p.id = uu.product_id
LEFT JOIN public.plans pl ON pl.id = uu.plan_id
LEFT JOIN public.profiles prof ON prof.id = uu.affiliate_id
-- Join com profiles usando external_user_id para pegar o avatar do indicado
LEFT JOIN public.profiles referred_profile ON referred_profile.id = uu.external_user_id
LEFT JOIN LATERAL (
  SELECT up2.id, up2.affiliate_coupon_id
  FROM public.unified_payments up2
  WHERE up2.unified_user_id = uu.id
    AND up2.billing_reason = 'subscription_create'
  ORDER BY up2.payment_date ASC
  LIMIT 1
) up ON true
LEFT JOIN public.affiliate_coupons ac ON ac.id = up.affiliate_coupon_id
WHERE uu.affiliate_id IS NOT NULL
  AND uu.deleted_at IS NULL;