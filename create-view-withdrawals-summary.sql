-- ==========================================
-- VIEW PARA SUMÁRIO DE SAQUES (WITHDRAWALS)
-- ==========================================

-- View para estatísticas de comissões por afiliado
CREATE OR REPLACE VIEW public.view_withdrawals_summary
WITH (security_invoker = true) AS
SELECT 
    c.affiliate_id,
    -- Disponível para saque
    COALESCE(SUM(CASE WHEN c.status = 'available' THEN c.amount ELSE 0 END), 0) as available,
    -- Em análise (pendente)
    COALESCE(SUM(CASE WHEN c.status = 'pending' THEN c.amount ELSE 0 END), 0) as pending,
    -- Solicitado mas não pago
    COALESCE(SUM(CASE WHEN c.status = 'requested' THEN c.amount ELSE 0 END), 0) as requested,
    -- Total sacado (withdrawn)
    COALESCE(SUM(CASE WHEN c.status = 'withdrawn' THEN c.amount ELSE 0 END), 0) as withdrawn,
    -- Total de comissões canceladas
    COALESCE(SUM(CASE WHEN c.status = 'cancelled' THEN c.amount ELSE 0 END), 0) as cancelled
FROM 
    public.commissions c
GROUP BY 
    c.affiliate_id;

COMMENT ON VIEW public.view_withdrawals_summary IS 'Sumário de comissões por afiliado agrupadas por status para tela de saques';

-- ==========================================
-- GRANTS
-- ==========================================

GRANT SELECT ON public.view_withdrawals_summary TO authenticated;
GRANT SELECT ON public.view_withdrawals_summary TO anon;
