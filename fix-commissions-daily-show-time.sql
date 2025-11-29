-- ==========================================
-- CORRIGIR VIEW PARA MOSTRAR HORA DO CADASTRO
-- ==========================================

-- Dropar a view existente primeiro
DROP VIEW IF EXISTS public.view_commissions_daily CASCADE;

-- Recriar a view mantendo a hora do cadastro (timestamp completo)
CREATE VIEW public.view_commissions_daily
WITH (security_invoker = true) AS
SELECT 
    c.id,
    -- Manter timestamp completo com hora no timezone de São Paulo
    (c.payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') as data,
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
    c.affiliate_id,
    c.amount as valor,
    c.percentage as percentual,
    c.status,
    -- Informações adicionais
    c.available_date,
    c.payment_date as payment_date_original
FROM public.commissions c
LEFT JOIN public.unified_payments up ON up.id = c.unified_payment_id
LEFT JOIN public.products p ON p.id = up.product_id
LEFT JOIN public.unified_users uu ON uu.id = up.unified_user_id
LEFT JOIN public.plans pl ON pl.id = up.plan_id
LEFT JOIN public.profiles aff ON aff.id = c.affiliate_id
WHERE 
    c.unified_payment_id IS NOT NULL -- Apenas comissões de pagamentos unificados
ORDER BY 
    c.payment_date DESC NULLS LAST,
    c.created_at DESC;

COMMENT ON VIEW public.view_commissions_daily IS 'View otimizada para relatório de comissões diárias com timestamp completo no timezone de São Paulo';

-- Recriar grants
GRANT SELECT ON public.view_commissions_daily TO authenticated;
GRANT SELECT ON public.view_commissions_daily TO anon;

-- ==========================================
-- ATUALIZAR VIEW DE ESTATÍSTICAS
-- ==========================================

-- Recriar view de stats (ela depende da view_commissions_daily)
DROP VIEW IF EXISTS public.view_commissions_stats;

CREATE VIEW public.view_commissions_stats
WITH (security_invoker = true) AS
SELECT 
    c.affiliate_id,
    -- Hoje (no fuso horário de São Paulo)
    SUM(CASE WHEN (c.payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date THEN c.amount ELSE 0 END) as hoje,
    COUNT(CASE WHEN (c.payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date THEN 1 END) as count_hoje,
    -- Últimos 7 dias
    SUM(CASE WHEN (c.payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date >= ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date - INTERVAL '6 days')::date THEN c.amount ELSE 0 END) as ultimos_7_dias,
    COUNT(CASE WHEN (c.payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date >= ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date - INTERVAL '6 days')::date THEN 1 END) as count_7_dias,
    -- Este mês
    SUM(CASE WHEN EXTRACT(YEAR FROM (c.payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')) = EXTRACT(YEAR FROM (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'))
                AND EXTRACT(MONTH FROM (c.payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')) = EXTRACT(MONTH FROM (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'))
            THEN c.amount ELSE 0 END) as este_mes,
    COUNT(CASE WHEN EXTRACT(YEAR FROM (c.payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')) = EXTRACT(YEAR FROM (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'))
                AND EXTRACT(MONTH FROM (c.payment_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')) = EXTRACT(MONTH FROM (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'))
            THEN 1 END) as count_mes
FROM public.commissions c
WHERE c.unified_payment_id IS NOT NULL
GROUP BY 
    c.affiliate_id;

COMMENT ON VIEW public.view_commissions_stats IS 'Estatísticas de comissões para cards (hoje, últimos 7 dias, este mês)';

GRANT SELECT ON public.view_commissions_stats TO authenticated;
GRANT SELECT ON public.view_commissions_stats TO anon;
