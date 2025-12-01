-- ==========================================
-- VIEW PARA ESTATÍSTICAS DE SAQUES
-- ==========================================

CREATE OR REPLACE VIEW public.view_withdrawals_stats
WITH (security_invoker = true) AS
SELECT 
    -- Total de saques pendentes
    COALESCE(SUM(CASE WHEN w.status = 'pending' THEN w.amount ELSE 0 END), 0) as total_pending,
    -- Total de saques aprovados
    COALESCE(SUM(CASE WHEN w.status = 'approved' THEN w.amount ELSE 0 END), 0) as total_approved,
    -- Total de saques pagos
    COALESCE(SUM(CASE WHEN w.status = 'paid' THEN w.amount ELSE 0 END), 0) as total_paid,
    -- Contagem de saques rejeitados
    COALESCE(COUNT(CASE WHEN w.status = 'rejected' THEN 1 END), 0) as total_rejected_count,
    -- Total de comissões aguardando liberação (pending ou com available_date futuro)
    COALESCE(
        (SELECT SUM(c.amount) 
         FROM public.commissions c 
         WHERE c.status = 'pending' 
         AND (c.available_date IS NULL OR c.available_date > NOW())),
        0
    ) as total_awaiting_release
FROM 
    public.withdrawals w;

COMMENT ON VIEW public.view_withdrawals_stats IS 'Estatísticas agregadas de saques e comissões aguardando liberação';

-- ==========================================
-- GRANTS
-- ==========================================

GRANT SELECT ON public.view_withdrawals_stats TO authenticated;
GRANT SELECT ON public.view_withdrawals_stats TO anon;
