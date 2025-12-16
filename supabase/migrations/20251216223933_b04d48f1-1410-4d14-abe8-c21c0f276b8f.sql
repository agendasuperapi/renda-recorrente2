-- Drop and recreate view_referrals with correct coupon fields
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
    p.nome AS product_name,
    p.icone_light AS product_icon_light,
    p.icone_dark AS product_icon_dark,
    pl.name AS plan_name,
    pl.price AS plan_price,
    pl.billing_period AS plan_billing_period,
    prof.id AS referrer_id,
    prof.name AS referrer_name,
    referred_profile.avatar_url,
    up.id AS first_payment_id,
    -- Show custom_code as the coupon code
    ac.custom_code AS coupon_code,
    -- Flag: if custom_code_history exists, it was edited
    CASE 
        WHEN ac.custom_code_history IS NOT NULL AND ac.custom_code_history != ''
        THEN true 
        ELSE false 
    END AS coupon_was_edited
FROM unified_users uu
LEFT JOIN products p ON p.id = uu.product_id
LEFT JOIN plans pl ON pl.id = uu.plan_id
LEFT JOIN profiles prof ON prof.id = uu.affiliate_id
LEFT JOIN profiles referred_profile ON referred_profile.id = uu.external_user_id
LEFT JOIN LATERAL (
    SELECT up2.id, up2.affiliate_coupon_id
    FROM unified_payments up2
    WHERE up2.unified_user_id = uu.id 
      AND up2.billing_reason = 'subscription_create'
    ORDER BY up2.payment_date
    LIMIT 1
) up ON true
LEFT JOIN affiliate_coupons ac ON ac.id = up.affiliate_coupon_id
WHERE uu.affiliate_id IS NOT NULL 
  AND uu.deleted_at IS NULL;