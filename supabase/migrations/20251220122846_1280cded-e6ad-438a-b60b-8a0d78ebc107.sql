-- Recriar view com email e avatar do afiliado
DROP VIEW IF EXISTS view_admin_commission_processing;

CREATE OR REPLACE VIEW view_admin_commission_processing AS
SELECT 
    up.id,
    up.external_payment_id,
    up.unified_user_id,
    up.product_id,
    p.nome AS product_name,
    p.icone_light AS product_icon_light,
    p.icone_dark AS product_icon_dark,
    up.plan_id,
    pl.name AS plan_name,
    up.affiliate_id,
    aff.name AS affiliate_name,
    aff.email AS affiliate_email,
    aff.avatar_url AS affiliate_avatar,
    up.amount,
    up.currency,
    up.billing_reason,
    up.status AS payment_status,
    up.payment_date,
    up.commission_processed,
    up.commission_processed_at,
    up.commission_error,
    up.commissions_generated,
    up.created_at,
    uu.name AS customer_name,
    uu.email AS customer_email,
    up.environment
FROM unified_payments up
LEFT JOIN products p ON p.id = up.product_id
LEFT JOIN plans pl ON pl.id = up.plan_id
LEFT JOIN profiles aff ON aff.id = up.affiliate_id
LEFT JOIN unified_users uu ON uu.id = up.unified_user_id
ORDER BY up.created_at DESC;