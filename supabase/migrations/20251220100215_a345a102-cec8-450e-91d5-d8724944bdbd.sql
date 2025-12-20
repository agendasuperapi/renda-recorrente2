-- Adicionar campo environment na tabela withdrawals
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS environment text DEFAULT 'production';

-- Atualizar view_commissions_daily para incluir environment do unified_payments
DROP VIEW IF EXISTS public.view_commissions_daily CASCADE;

CREATE VIEW public.view_commissions_daily
WITH (security_invoker = true) AS
SELECT 
    c.id,
    c.payment_date as data,
    (c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date as data_filtro,
    c.created_at,
    -- Produto
    p.id as product_id,
    p.nome as produto,
    p.icone_light as product_icon_light,
    p.icone_dark as product_icon_dark,
    -- Cliente (do unified_users via unified_payment)
    uu.id as unified_user_id,
    uu.name as cliente,
    uu.email as cliente_email,
    -- Plano
    pl.id as plan_id,
    pl.name as plano,
    -- Afiliado
    c.affiliate_id,
    aff.name as affiliate_name,
    -- Comissão
    c.amount as valor,
    c.percentage as percentual,
    c.status,
    -- Referências
    c.unified_payment_id,
    c.commission_type,
    c.level,
    c.available_date,
    -- Cupom usado
    coup.code as coupon_code,
    coup.name as coupon_name,
    -- Tipo de cliente (novo/renovação/recompra)
    up.billing_reason,
    -- Número da compra para vendas avulsas
    CASE 
        WHEN up.billing_reason IN ('one_time_purchase', 'venda_avulsa') THEN
            (SELECT COUNT(*) FROM public.unified_payments up2 
             WHERE up2.unified_user_id = up.unified_user_id 
             AND up2.product_id = up.product_id
             AND (up2.billing_reason = 'one_time_purchase' OR up2.billing_reason = 'venda_avulsa')
             AND up2.payment_date <= up.payment_date)
        ELSE NULL
    END as purchase_number,
    -- Environment
    COALESCE(up.environment, 'production') as environment
FROM 
    public.commissions c
LEFT JOIN public.products p ON p.id = c.product_id
LEFT JOIN public.unified_payments up ON up.id = c.unified_payment_id
LEFT JOIN public.unified_users uu ON uu.id = up.unified_user_id
LEFT JOIN public.plans pl ON pl.id = up.plan_id
LEFT JOIN public.profiles aff ON aff.id = c.affiliate_id
LEFT JOIN public.affiliate_coupons ac ON ac.id = up.affiliate_coupon_id
LEFT JOIN public.coupons coup ON coup.id = ac.coupon_id
WHERE 
    c.unified_payment_id IS NOT NULL
ORDER BY 
    c.payment_date DESC NULLS LAST,
    c.created_at DESC;

COMMENT ON VIEW public.view_commissions_daily IS 'View otimizada para relatório de comissões diárias com produtos, clientes, planos e ambiente';

GRANT SELECT ON public.view_commissions_daily TO authenticated;
GRANT SELECT ON public.view_commissions_daily TO anon;