-- ==========================================
-- VIEWS PARA OTIMIZAÇÃO DAS TELAS DE ADMIN
-- ==========================================

-- 1. VIEW PARA ADMIN PAYMENTS
-- Consolida dados de pagamentos com joins de plans, profiles, subscriptions e affiliates
CREATE OR REPLACE VIEW public.view_admin_payments AS
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
    -- Plan info
    pl.name AS plan_name,
    pl.price AS plan_price,
    -- User info
    u.name AS user_name,
    u.email AS user_email,
    -- Subscription info
    s.stripe_subscription_id,
    -- Affiliate info
    aff.name AS affiliate_name,
    -- Coupon info
    ac.custom_code AS coupon_custom_code,
    c.code AS coupon_code
FROM 
    public.payments p
LEFT JOIN public.plans pl ON pl.id = p.plan_id
LEFT JOIN public.profiles u ON u.id = p.user_id
LEFT JOIN public.subscriptions s ON s.id = p.subscription_id
LEFT JOIN public.profiles aff ON aff.id = p.affiliate_id
LEFT JOIN public.affiliate_coupons ac ON ac.id = p.affiliate_coupon_id
LEFT JOIN public.coupons c ON c.id = ac.coupon_id
ORDER BY 
    p.payment_date DESC;

COMMENT ON VIEW public.view_admin_payments IS 'View otimizada para listagem de pagamentos no painel admin';

-- 2. VIEW PARA ADMIN USERS
-- Consolida dados de usuários com suas roles
CREATE OR REPLACE VIEW public.view_admin_users AS
SELECT 
    p.id,
    p.name,
    p.username,
    p.email,
    p.phone,
    p.cpf,
    p.birth_date,
    p.gender,
    p.created_at,
    p.updated_at,
    p.street,
    p.number,
    p.complement,
    p.neighborhood,
    p.cep,
    p.city,
    p.state,
    p.pix_key,
    p.pix_type,
    p.instagram,
    p.facebook,
    p.tiktok,
    p.is_blocked,
    p.blocked_message,
    p.blocked_at,
    p.blocked_by,
    p.affiliate_code,
    p.referrer_code,
    p.avatar_url,
    COALESCE(ur.role, 'afiliado'::app_role) AS role
FROM 
    public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
ORDER BY 
    CASE WHEN ur.role = 'super_admin' THEN 0 ELSE 1 END,
    p.created_at DESC;

COMMENT ON VIEW public.view_admin_users IS 'View otimizada para listagem de usuários no painel admin com roles';

-- 3. VIEW PARA ADMIN STRIPE EVENTS
-- Já existe boa estrutura na tabela stripe_events, mas podemos adicionar dados relacionados
CREATE OR REPLACE VIEW public.view_admin_stripe_events AS
SELECT 
    se.id,
    se.event_id,
    se.event_type,
    se.event_data,
    se.processed,
    se.created_at,
    se.email,
    se.environment,
    se.stripe_subscription_id,
    se.reason,
    se.cancellation_details,
    -- User info
    u.name AS user_name,
    u.email AS user_email_profile,
    -- Plan info
    pl.name AS plan_name,
    -- Product info
    pr.nome AS product_name,
    -- Affiliate info
    aff.name AS affiliate_name
FROM 
    public.stripe_events se
LEFT JOIN public.profiles u ON u.id = se.user_id
LEFT JOIN public.plans pl ON pl.id = se.plan_id
LEFT JOIN public.products pr ON pr.id = se.product_id
LEFT JOIN public.profiles aff ON aff.id = se.affiliate_id
ORDER BY 
    se.created_at DESC;

COMMENT ON VIEW public.view_admin_stripe_events IS 'View otimizada para listagem de eventos Stripe no painel admin';

-- ==========================================
-- GRANTS (dar permissão de leitura)
-- ==========================================

-- Permitir que usuários autenticados leiam as views
GRANT SELECT ON public.view_admin_payments TO authenticated;
GRANT SELECT ON public.view_admin_users TO authenticated;
GRANT SELECT ON public.view_admin_stripe_events TO authenticated;

-- Permitir que usuários anônimos leiam as views (caso necessário)
GRANT SELECT ON public.view_admin_payments TO anon;
GRANT SELECT ON public.view_admin_users TO anon;
GRANT SELECT ON public.view_admin_stripe_events TO anon;
