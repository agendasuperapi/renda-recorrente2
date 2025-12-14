-- Drop and recreate view with sync status fields
DROP VIEW IF EXISTS public.view_admin_payments;

CREATE VIEW public.view_admin_payments AS
SELECT 
    p.id,
    p.stripe_invoice_id,
    p.amount,
    p.billing_reason,
    p.status,
    p.payment_date,
    p.environment,
    p.currency,
    p.created_at,
    p.sync_status,
    p.sync_response,
    p.synced_at,
    pl.name AS plan_name,
    pl.price AS plan_price,
    u.name AS user_name,
    u.email AS user_email,
    s.stripe_subscription_id,
    aff.name AS affiliate_name,
    ac.custom_code AS coupon_custom_code,
    c.code AS coupon_code
FROM payments p
LEFT JOIN plans pl ON pl.id = p.plan_id
LEFT JOIN profiles u ON u.id = p.user_id
LEFT JOIN subscriptions s ON s.id = p.subscription_id
LEFT JOIN profiles aff ON aff.id = p.affiliate_id
LEFT JOIN affiliate_coupons ac ON ac.id = p.affiliate_coupon_id
LEFT JOIN coupons c ON c.id = ac.coupon_id
ORDER BY p.payment_date DESC;