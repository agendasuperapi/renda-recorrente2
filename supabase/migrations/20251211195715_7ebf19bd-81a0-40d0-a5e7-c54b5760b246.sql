-- View otimizada para status de processamento de comissões no admin
CREATE OR REPLACE VIEW public.view_admin_commission_processing
WITH (security_invoker = true) AS
SELECT 
    up.id,
    up.external_payment_id,
    up.unified_user_id,
    up.product_id,
    p.nome as product_name,
    up.plan_id,
    pl.name as plan_name,
    up.affiliate_id,
    aff.name as affiliate_name,
    up.amount,
    up.currency,
    up.billing_reason,
    up.status as payment_status,
    up.payment_date,
    up.commission_processed,
    up.commission_processed_at,
    up.commission_error,
    up.commissions_generated,
    up.created_at,
    -- Cliente info
    uu.name as customer_name,
    uu.email as customer_email
FROM 
    public.unified_payments up
LEFT JOIN public.products p ON p.id = up.product_id
LEFT JOIN public.plans pl ON pl.id = up.plan_id
LEFT JOIN public.profiles aff ON aff.id = up.affiliate_id
LEFT JOIN public.unified_users uu ON uu.id = up.unified_user_id
ORDER BY 
    up.created_at DESC;

COMMENT ON VIEW public.view_admin_commission_processing IS 'View para monitoramento de processamento de comissões no painel admin';

-- Grants
GRANT SELECT ON public.view_admin_commission_processing TO authenticated;