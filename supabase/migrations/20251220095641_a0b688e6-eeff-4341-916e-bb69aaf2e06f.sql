-- Primeiro, remover a view antiga
DROP VIEW IF EXISTS public.view_admin_affiliates;

-- Criar nova VIEW com o campo environment
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
    p.referrer_code,
    (SELECT name FROM public.profiles WHERE affiliate_code = p.referrer_code LIMIT 1) AS referrer_name,
    COALESCE(pl.name, 'Sem plano') AS plan_name,
    COALESCE(pl.billing_period, '-') AS plan_period,
    COALESCE(s.status, 'inactive') AS plan_status,
    COALESCE(s.environment, 'production') AS environment,
    COALESCE(ref_count.total, 0)::integer AS referrals_count
FROM 
    public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'super_admin'
LEFT JOIN public.subscriptions s ON s.user_id = p.id AND s.status IN ('active', 'trialing')
LEFT JOIN public.plans pl ON pl.id = s.plan_id
LEFT JOIN (
    SELECT referrer_id, COUNT(*)::integer AS total
    FROM public.referrals
    GROUP BY referrer_id
) ref_count ON ref_count.referrer_id = p.id
WHERE 
    ur.user_id IS NULL
ORDER BY 
    p.created_at DESC;

COMMENT ON VIEW public.view_admin_affiliates IS 'View otimizada para listagem de afiliados no painel admin. Inclui campo environment para filtrar produção/teste.';

GRANT SELECT ON public.view_admin_affiliates TO authenticated;