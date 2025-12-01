-- View consolidada para dashboard do afiliado
CREATE OR REPLACE VIEW public.view_affiliate_dashboard_stats
WITH (security_invoker = on) AS
SELECT 
    p.id as affiliate_id,
    
    -- Comissão do dia (fuso São Paulo)
    COALESCE(
        (SELECT SUM(c.amount)
         FROM public.commissions c
         WHERE c.affiliate_id = p.id
         AND c.unified_payment_id IS NOT NULL
         AND (c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date = 
             (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date),
        0
    ) as comissao_hoje,
    
    -- Comissão últimos 7 dias
    COALESCE(
        (SELECT SUM(c.amount)
         FROM public.commissions c
         WHERE c.affiliate_id = p.id
         AND c.unified_payment_id IS NOT NULL
         AND (c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date >= 
             ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date - INTERVAL '6 days')::date),
        0
    ) as comissao_7_dias,
    
    -- Comissão do mês
    COALESCE(
        (SELECT SUM(c.amount)
         FROM public.commissions c
         WHERE c.affiliate_id = p.id
         AND c.unified_payment_id IS NOT NULL
         AND EXTRACT(YEAR FROM (c.payment_date AT TIME ZONE 'America/Sao_Paulo')) = 
             EXTRACT(YEAR FROM (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'))
         AND EXTRACT(MONTH FROM (c.payment_date AT TIME ZONE 'America/Sao_Paulo')) = 
             EXTRACT(MONTH FROM (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'))),
        0
    ) as comissao_mes,
    
    -- Comissão disponível para saque
    COALESCE(
        (SELECT SUM(c.amount)
         FROM public.commissions c
         WHERE c.affiliate_id = p.id
         AND c.status = 'available'),
        0
    ) as comissao_disponivel,
    
    -- Comissão pendente
    COALESCE(
        (SELECT SUM(c.amount)
         FROM public.commissions c
         WHERE c.affiliate_id = p.id
         AND c.status = 'pending'),
        0
    ) as comissao_pendente,
    
    -- Total de indicações
    COALESCE(
        (SELECT COUNT(*)::integer
         FROM public.unified_users uu
         WHERE uu.affiliate_id = p.id),
        0
    ) as total_indicacoes,
    
    -- Total de sub-afiliados (apenas nível 1 direto)
    COALESCE(
        (SELECT COUNT(DISTINCT sa.sub_affiliate_id)::integer
         FROM public.sub_affiliates sa
         WHERE sa.parent_affiliate_id = p.id
         AND sa.level = 1),
        0
    ) as total_sub_afiliados,
    
    -- Total já sacado (withdrawals pagos)
    COALESCE(
        (SELECT SUM(w.amount)
         FROM public.withdrawals w
         WHERE w.affiliate_id = p.id
         AND w.status = 'paid'),
        0
    ) as total_sacado

FROM public.profiles p;

-- Grant para usuários autenticados
GRANT SELECT ON public.view_affiliate_dashboard_stats TO authenticated;
GRANT SELECT ON public.view_affiliate_dashboard_stats TO anon;

-- Comentário explicativo
COMMENT ON VIEW public.view_affiliate_dashboard_stats IS 
'View consolidada com todas as estatísticas necessárias para o dashboard do afiliado';
