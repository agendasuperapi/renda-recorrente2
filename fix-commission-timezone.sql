-- ==========================================
-- CORRIGIR TIMEZONE NA VIEW DE COMISSÕES
-- ==========================================

-- Atualizar view para usar timezone de São Paulo na coluna data
CREATE OR REPLACE VIEW public.view_commissions_daily
WITH (security_invoker = true) AS
SELECT 
    c.id,
    -- Converter payment_date para timezone de São Paulo e extrair apenas a data
    (c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date as data,
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

COMMENT ON VIEW public.view_commissions_daily IS 'View otimizada para relatório de comissões diárias com timezone de São Paulo';

-- ==========================================
-- ATUALIZAR FUNÇÃO RPC PARA USAR DATA CORRETAMENTE
-- ==========================================

CREATE OR REPLACE FUNCTION get_commissions_total(
  p_affiliate_id uuid,
  p_product_id uuid DEFAULT NULL,
  p_plan_id uuid DEFAULT NULL,
  p_cliente text DEFAULT NULL,
  p_status commission_status DEFAULT NULL,
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
BEGIN
  SELECT COALESCE(SUM(c.amount), 0)
  INTO v_total
  FROM commissions c
  LEFT JOIN products p ON p.id = c.product_id
  LEFT JOIN unified_payments up ON up.id = c.unified_payment_id
  LEFT JOIN unified_users uu ON uu.id = up.unified_user_id
  LEFT JOIN plans pl ON pl.id = up.plan_id
  WHERE c.affiliate_id = p_affiliate_id
    AND c.unified_payment_id IS NOT NULL
    AND (p_product_id IS NULL OR c.product_id = p_product_id)
    AND (p_plan_id IS NULL OR up.plan_id = p_plan_id)
    AND (p_cliente IS NULL OR uu.name ILIKE '%' || p_cliente || '%')
    AND (p_status IS NULL OR c.status = p_status)
    AND (p_data_inicio IS NULL OR (c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date >= p_data_inicio)
    AND (p_data_fim IS NULL OR (c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date <= p_data_fim);
  
  RETURN v_total;
END;
$$;

COMMENT ON FUNCTION get_commissions_total IS 'Calcula total de comissões com filtros usando timezone de São Paulo';
