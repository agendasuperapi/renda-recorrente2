-- Criar VIEW para otimizar listagem de afiliados no admin
-- Esta view consolida dados de profiles, subscriptions, plans e referrals
-- em uma única consulta, melhorando performance significativamente

CREATE OR REPLACE VIEW public.view_admin_affiliates AS
SELECT 
    p.id,
    p.name,
    p.email,
    p.username,
    p.avatar_url,
    p.created_at,
    p.is_blocked,
    COALESCE(pl.name, 'Sem plano') AS plan_name,
    COALESCE(pl.billing_period, '-') AS plan_period,
    COALESCE(s.status, 'inactive') AS plan_status,
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
    ur.user_id IS NULL  -- Exclui super_admins
ORDER BY 
    p.created_at DESC;

-- Comentário explicativo da view
COMMENT ON VIEW public.view_admin_affiliates IS 'View otimizada para listagem de afiliados no painel admin. Combina profiles, subscriptions, plans e contagem de referrals em uma única query, excluindo super_admins.';

-- Garantir acesso para usuários autenticados (RLS será aplicado via policies das tabelas base)
GRANT SELECT ON public.view_admin_affiliates TO authenticated;
