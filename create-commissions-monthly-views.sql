-- ==========================================
-- VIEWS PARA RELATÓRIO DE COMISSÕES MENSAIS
-- ==========================================

-- View para estatísticas mensais (cards de totais)
CREATE OR REPLACE VIEW public.view_commissions_monthly_stats
WITH (security_invoker = true) AS
SELECT 
    c.affiliate_id,
    -- Este mês
    SUM(CASE 
        WHEN DATE_TRUNC('month', c.payment_date AT TIME ZONE 'America/Sao_Paulo') = DATE_TRUNC('month', CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo') 
        THEN c.amount 
        ELSE 0 
    END) as este_mes,
    COUNT(CASE 
        WHEN DATE_TRUNC('month', c.payment_date AT TIME ZONE 'America/Sao_Paulo') = DATE_TRUNC('month', CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo') 
        THEN 1 
    END) as count_mes,
    -- Últimos 3 meses
    SUM(CASE 
        WHEN c.payment_date >= (DATE_TRUNC('month', CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo') - INTERVAL '3 months') 
        THEN c.amount 
        ELSE 0 
    END) as ultimos_3_meses,
    COUNT(CASE 
        WHEN c.payment_date >= (DATE_TRUNC('month', CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo') - INTERVAL '3 months') 
        THEN 1 
    END) as count_3_meses,
    -- Este ano
    SUM(CASE 
        WHEN DATE_TRUNC('year', c.payment_date AT TIME ZONE 'America/Sao_Paulo') = DATE_TRUNC('year', CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo') 
        THEN c.amount 
        ELSE 0 
    END) as este_ano,
    COUNT(CASE 
        WHEN DATE_TRUNC('year', c.payment_date AT TIME ZONE 'America/Sao_Paulo') = DATE_TRUNC('year', CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo') 
        THEN 1 
    END) as count_ano
FROM 
    public.commissions c
WHERE 
    c.unified_payment_id IS NOT NULL
    AND c.payment_date IS NOT NULL
GROUP BY 
    c.affiliate_id;

COMMENT ON VIEW public.view_commissions_monthly_stats IS 'Estatísticas de comissões mensais para cards (este mês, últimos 3 meses, este ano)';

-- View principal de comissões mensais (agrupadas por mês)
CREATE OR REPLACE VIEW public.view_commissions_monthly
WITH (security_invoker = true) AS
SELECT 
    -- Agrupar por mês de referência
    DATE_TRUNC('month', c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date as mes_referencia,
    -- Afiliado
    c.affiliate_id,
    aff.name as affiliate_name,
    -- Produto
    p.id as product_id,
    p.nome as produto,
    -- Plano
    pl.id as plan_id,
    pl.name as plano,
    -- Agregações
    COUNT(*) as quantidade_comissoes,
    SUM(c.amount) as valor_total,
    AVG(c.percentage) as percentual_medio,
    -- Status agregado
    COUNT(CASE WHEN c.status = 'pending' THEN 1 END) as pendentes,
    COUNT(CASE WHEN c.status = 'available' THEN 1 END) as disponiveis,
    COUNT(CASE WHEN c.status = 'withdrawn' THEN 1 END) as sacadas,
    COUNT(CASE WHEN c.status = 'cancelled' THEN 1 END) as canceladas,
    -- Tipo de comissão predominante
    MODE() WITHIN GROUP (ORDER BY c.commission_type) as tipo_predominante
FROM 
    public.commissions c
LEFT JOIN public.products p ON p.id = c.product_id
LEFT JOIN public.unified_payments up ON up.id = c.unified_payment_id
LEFT JOIN public.plans pl ON pl.id = up.plan_id
LEFT JOIN public.profiles aff ON aff.id = c.affiliate_id
WHERE 
    c.unified_payment_id IS NOT NULL
    AND c.payment_date IS NOT NULL
GROUP BY 
    DATE_TRUNC('month', c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date,
    c.affiliate_id,
    aff.name,
    p.id,
    p.nome,
    pl.id,
    pl.name
ORDER BY 
    mes_referencia DESC,
    valor_total DESC;

COMMENT ON VIEW public.view_commissions_monthly IS 'View agregada de comissões mensais agrupadas por mês de referência, produto e plano';

-- ==========================================
-- FUNÇÃO RPC PARA CALCULAR TOTAL MENSAL FILTRADO
-- ==========================================

CREATE OR REPLACE FUNCTION get_commissions_monthly_total(
  p_affiliate_id uuid,
  p_product_id uuid DEFAULT NULL,
  p_plan_id uuid DEFAULT NULL,
  p_mes_inicio date DEFAULT NULL,
  p_mes_fim date DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
BEGIN
  SELECT COALESCE(SUM(valor_total), 0)
  INTO v_total
  FROM view_commissions_monthly
  WHERE affiliate_id = p_affiliate_id
    AND (p_product_id IS NULL OR product_id = p_product_id)
    AND (p_plan_id IS NULL OR plan_id = p_plan_id)
    AND (p_mes_inicio IS NULL OR mes_referencia >= DATE_TRUNC('month', p_mes_inicio::timestamp))
    AND (p_mes_fim IS NULL OR mes_referencia <= DATE_TRUNC('month', p_mes_fim::timestamp));
  
  RETURN v_total;
END;
$$;

COMMENT ON FUNCTION get_commissions_monthly_total IS 'Calcula total de comissões mensais com filtros';

-- ==========================================
-- GRANTS
-- ==========================================

GRANT SELECT ON public.view_commissions_monthly_stats TO authenticated;
GRANT SELECT ON public.view_commissions_monthly_stats TO anon;
GRANT SELECT ON public.view_commissions_monthly TO authenticated;
GRANT SELECT ON public.view_commissions_monthly TO anon;
