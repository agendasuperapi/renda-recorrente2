-- ==========================================
-- VIEW PARA COMISSÕES DIÁRIAS
-- ==========================================

-- View principal de comissões diárias
CREATE OR REPLACE VIEW public.view_commissions_daily
WITH (security_invoker = true) AS
SELECT 
    c.id,
    c.payment_date as data,
    c.created_at,
    -- Produto
    p.id as product_id,
    p.nome as produto,
    -- Cliente (do unified_users via unified_payment)
    uu.id as unified_user_id,
    uu.name as cliente,
    uu.email as cliente_email,
    -- Plano
    pl.id as plan_id,
    pl.name as plano,
    -- Comissão
    c.percentage as percentual,
    c.amount as valor,
    c.status,
    -- Afiliado
    c.affiliate_id,
    aff.name as affiliate_name,
    -- Referências
    c.unified_payment_id,
    c.commission_type
FROM 
    public.commissions c
LEFT JOIN public.products p ON p.id = c.product_id
LEFT JOIN public.unified_payments up ON up.id = c.unified_payment_id
LEFT JOIN public.unified_users uu ON uu.id = up.unified_user_id
LEFT JOIN public.plans pl ON pl.id = up.plan_id
LEFT JOIN public.profiles aff ON aff.id = c.affiliate_id
WHERE 
    c.unified_payment_id IS NOT NULL -- Apenas comissões de pagamentos unificados
ORDER BY 
    c.payment_date DESC NULLS LAST,
    c.created_at DESC;

COMMENT ON VIEW public.view_commissions_daily IS 'View otimizada para relatório de comissões diárias com produtos, clientes e planos';

-- View para estatísticas de comissões (cards)
CREATE OR REPLACE VIEW public.view_commissions_stats
WITH (security_invoker = true) AS
SELECT 
    c.affiliate_id,
    -- Hoje
    SUM(CASE WHEN DATE(c.payment_date) = CURRENT_DATE THEN c.amount ELSE 0 END) as hoje,
    COUNT(CASE WHEN DATE(c.payment_date) = CURRENT_DATE THEN 1 END) as count_hoje,
    -- Últimos 7 dias
    SUM(CASE WHEN c.payment_date >= CURRENT_DATE - INTERVAL '7 days' THEN c.amount ELSE 0 END) as ultimos_7_dias,
    COUNT(CASE WHEN c.payment_date >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as count_7_dias,
    -- Este mês
    SUM(CASE WHEN DATE_TRUNC('month', c.payment_date) = DATE_TRUNC('month', CURRENT_DATE) THEN c.amount ELSE 0 END) as este_mes,
    COUNT(CASE WHEN DATE_TRUNC('month', c.payment_date) = DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as count_mes
FROM 
    public.commissions c
WHERE 
    c.unified_payment_id IS NOT NULL
    AND c.payment_date IS NOT NULL
GROUP BY 
    c.affiliate_id;

COMMENT ON VIEW public.view_commissions_stats IS 'Estatísticas de comissões para cards (hoje, últimos 7 dias, este mês)';

-- ==========================================
-- GRANTS
-- ==========================================

GRANT SELECT ON public.view_commissions_daily TO authenticated;
GRANT SELECT ON public.view_commissions_daily TO anon;
GRANT SELECT ON public.view_commissions_stats TO authenticated;
GRANT SELECT ON public.view_commissions_stats TO anon;
