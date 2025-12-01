-- View para estatísticas de desempenho agregadas por dia
CREATE OR REPLACE VIEW public.view_performance_daily
WITH (security_invoker = on) AS
SELECT 
    c.affiliate_id,
    (c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date as date,
    
    -- Total de comissões
    SUM(c.amount) as total_commission,
    
    -- Quantidade de vendas (pagamentos únicos)
    COUNT(DISTINCT c.unified_payment_id) as sales_count,
    
    -- Produto
    c.product_id,
    p.nome as product_name
    
FROM public.commissions c
LEFT JOIN public.products p ON p.id = c.product_id
WHERE c.unified_payment_id IS NOT NULL
GROUP BY c.affiliate_id, (c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date, c.product_id, p.nome;

-- View para estatísticas de desempenho agregadas por mês
CREATE OR REPLACE VIEW public.view_performance_monthly
WITH (security_invoker = on) AS
SELECT 
    c.affiliate_id,
    DATE_TRUNC('month', c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date as month,
    
    -- Total de comissões
    SUM(c.amount) as total_commission,
    
    -- Quantidade de vendas (pagamentos únicos)
    COUNT(DISTINCT c.unified_payment_id) as sales_count,
    
    -- Produto
    c.product_id,
    p.nome as product_name
    
FROM public.commissions c
LEFT JOIN public.products p ON p.id = c.product_id
WHERE c.unified_payment_id IS NOT NULL
GROUP BY c.affiliate_id, DATE_TRUNC('month', c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date, c.product_id, p.nome;

-- View para estatísticas por produto (independente de período)
CREATE OR REPLACE VIEW public.view_performance_by_product
WITH (security_invoker = on) AS
SELECT 
    c.affiliate_id,
    c.product_id,
    p.nome as product_name,
    p.icone_light as product_icon_light,
    p.icone_dark as product_icon_dark,
    
    -- Total de comissões
    SUM(c.amount) as total_commission,
    
    -- Quantidade de vendas
    COUNT(DISTINCT c.unified_payment_id) as sales_count,
    
    -- Data do primeiro e último pagamento
    MIN(c.payment_date) as first_payment_date,
    MAX(c.payment_date) as last_payment_date
    
FROM public.commissions c
LEFT JOIN public.products p ON p.id = c.product_id
WHERE c.unified_payment_id IS NOT NULL
GROUP BY c.affiliate_id, c.product_id, p.nome, p.icone_light, p.icone_dark;

-- Grants
GRANT SELECT ON public.view_performance_daily TO authenticated;
GRANT SELECT ON public.view_performance_daily TO anon;

GRANT SELECT ON public.view_performance_monthly TO authenticated;
GRANT SELECT ON public.view_performance_monthly TO anon;

GRANT SELECT ON public.view_performance_by_product TO authenticated;
GRANT SELECT ON public.view_performance_by_product TO anon;

-- Comentários
COMMENT ON VIEW public.view_performance_daily IS 'Estatísticas de desempenho agregadas por dia';
COMMENT ON VIEW public.view_performance_monthly IS 'Estatísticas de desempenho agregadas por mês';
COMMENT ON VIEW public.view_performance_by_product IS 'Estatísticas de desempenho por produto';
