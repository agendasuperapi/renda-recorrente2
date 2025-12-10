-- Drop and recreate the view_referrals to include coupon information
DROP VIEW IF EXISTS view_referrals;

CREATE VIEW view_referrals AS
SELECT 
    uu.id,
    uu.created_at,
    uu.name,
    uu.email,
    uu.phone,
    uu.cpf,
    uu.affiliate_code,
    uu.affiliate_id,
    p.nome AS product_name,
    p.id AS product_id,
    pl.name AS plan_name,
    pl.id AS plan_id,
    uu.cancel_at_period_end,
    uu.trial_end,
    uu.status,
    uu.current_period_start,
    uu.current_period_end,
    uu.environment,
    uu.external_user_id,
    -- Get coupon code from first payment
    COALESCE(ac.custom_code, ac.coupon_code_at_creation) AS coupon_code
FROM unified_users uu
LEFT JOIN products p ON uu.product_id = p.id
LEFT JOIN plans pl ON uu.plan_id = pl.id
LEFT JOIN LATERAL (
    SELECT up.affiliate_coupon_id
    FROM unified_payments up
    WHERE up.unified_user_id = uu.id
      AND up.billing_reason = 'subscription_create'
    ORDER BY up.created_at ASC
    LIMIT 1
) first_payment ON true
LEFT JOIN affiliate_coupons ac ON first_payment.affiliate_coupon_id = ac.id
ORDER BY uu.created_at DESC;