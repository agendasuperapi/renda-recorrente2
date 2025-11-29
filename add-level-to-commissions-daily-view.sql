-- Adicionar nível (level) à view de comissões diárias
-- Para mostrar se a comissão é de N1, N2, N3, etc.

DROP VIEW IF EXISTS public.view_commissions_daily CASCADE;

CREATE VIEW public.view_commissions_daily
WITH (security_invoker = true) AS
SELECT 
    c.id,
    -- Timestamp completo para exibição
    c.payment_date as data,
    -- Data apenas para filtros (convertida para São Paulo)
    (c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date as data_filtro,
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
    aff.name as affiliate_name,
    c.amount as valor,
    c.percentage as percentual,
    c.status,
    c.unified_payment_id,
    c.commission_type,
    -- Nível: buscar da tabela sub_affiliates
    -- Se o cliente (uu.external_user_id) está em sub_affiliates como sub_affiliate_id
    -- e o afiliado (c.affiliate_id) está como parent_affiliate_id, retornar o level
    COALESCE(
        (SELECT sa.level 
         FROM public.sub_affiliates sa 
         WHERE sa.sub_affiliate_id = uu.external_user_id 
         AND sa.parent_affiliate_id = c.affiliate_id
         LIMIT 1),
        1  -- Se não encontrou, é nível 1 (direto)
    ) as level,
    -- Informações adicionais
    c.available_date
FROM public.commissions c
LEFT JOIN public.unified_payments up ON up.id = c.unified_payment_id
LEFT JOIN public.products p ON p.id = up.product_id
LEFT JOIN public.unified_users uu ON uu.id = up.unified_user_id
LEFT JOIN public.plans pl ON pl.id = up.plan_id
LEFT JOIN public.profiles aff ON aff.id = c.affiliate_id
WHERE 
    c.unified_payment_id IS NOT NULL
ORDER BY 
    c.payment_date DESC NULLS LAST,
    c.created_at DESC;

COMMENT ON VIEW public.view_commissions_daily IS 'View de comissões diárias com nível (N1, N2, N3) do afiliado';

-- Recriar grants
GRANT SELECT ON public.view_commissions_daily TO authenticated;
GRANT SELECT ON public.view_commissions_daily TO anon;

-- ==========================================
-- ATUALIZAR VIEW DE ESTATÍSTICAS
-- ==========================================

DROP VIEW IF EXISTS public.view_commissions_stats;

CREATE VIEW public.view_commissions_stats
WITH (security_invoker = true) AS
SELECT 
    c.affiliate_id,
    -- Hoje
    SUM(CASE WHEN (c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date THEN c.amount ELSE 0 END) as hoje,
    COUNT(CASE WHEN (c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date THEN 1 END) as count_hoje,
    -- Últimos 7 dias
    SUM(CASE WHEN (c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date >= ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date - INTERVAL '6 days')::date THEN c.amount ELSE 0 END) as ultimos_7_dias,
    COUNT(CASE WHEN (c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date >= ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date - INTERVAL '6 days')::date THEN 1 END) as count_7_dias,
    -- Este mês
    SUM(CASE WHEN EXTRACT(YEAR FROM (c.payment_date AT TIME ZONE 'America/Sao_Paulo')) = EXTRACT(YEAR FROM (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'))
                AND EXTRACT(MONTH FROM (c.payment_date AT TIME ZONE 'America/Sao_Paulo')) = EXTRACT(MONTH FROM (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'))
            THEN c.amount ELSE 0 END) as este_mes,
    COUNT(CASE WHEN EXTRACT(YEAR FROM (c.payment_date AT TIME ZONE 'America/Sao_Paulo')) = EXTRACT(YEAR FROM (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'))
                AND EXTRACT(MONTH FROM (c.payment_date AT TIME ZONE 'America/Sao_Paulo')) = EXTRACT(MONTH FROM (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'))
            THEN 1 END) as count_mes
FROM public.commissions c
WHERE c.unified_payment_id IS NOT NULL
GROUP BY 
    c.affiliate_id;

COMMENT ON VIEW public.view_commissions_stats IS 'Estatísticas de comissões para cards (hoje, últimos 7 dias, este mês)';

GRANT SELECT ON public.view_commissions_stats TO authenticated;
GRANT SELECT ON public.view_commissions_stats TO anon;
