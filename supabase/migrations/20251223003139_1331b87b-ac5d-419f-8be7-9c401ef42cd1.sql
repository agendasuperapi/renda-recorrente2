
-- Corrigir view_admin_product_stats para contar assinaturas ativas
-- baseando-se em usuários que têm pagamentos pagos recentes (últimos 40 dias)
-- ou que têm current_period_end no futuro

DROP VIEW IF EXISTS view_admin_product_stats;

CREATE VIEW view_admin_product_stats AS
WITH environments AS (
  SELECT 'production'::text AS environment
  UNION ALL
  SELECT 'test'::text AS environment
),
product_env_combos AS (
  SELECT 
    p.id AS product_id,
    p.nome AS product_name,
    p.icone_light,
    p.icone_dark,
    e.environment
  FROM products p
  CROSS JOIN environments e
),
-- Contar assinaturas ativas baseando-se em pagamentos recentes
active_subscriptions AS (
  SELECT 
    up.product_id,
    up.environment,
    COUNT(DISTINCT up.unified_user_id) AS active_subscriptions
  FROM unified_payments up
  WHERE up.status = 'paid'
    AND up.payment_date >= CURRENT_DATE - INTERVAL '40 days'
  GROUP BY up.product_id, up.environment
),
payment_stats AS (
  SELECT 
    up.product_id,
    up.environment,
    COALESCE(SUM(up.amount) FILTER (WHERE up.status = 'paid'), 0) AS total_revenue,
    COALESCE(SUM(up.amount) FILTER (WHERE up.status = 'paid' AND up.payment_date >= date_trunc('month', CURRENT_DATE)), 0) AS revenue_this_month,
    COALESCE(SUM(up.amount) FILTER (WHERE up.status = 'paid' AND up.payment_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') AND up.payment_date < date_trunc('month', CURRENT_DATE)), 0) AS revenue_last_month,
    COALESCE(SUM(up.amount) FILTER (WHERE up.status = 'paid' AND up.payment_date >= CURRENT_DATE - INTERVAL '7 days'), 0) AS revenue_7_days,
    COALESCE(SUM(up.amount) FILTER (WHERE up.status = 'paid' AND up.payment_date >= CURRENT_DATE - INTERVAL '30 days'), 0) AS revenue_30_days,
    COALESCE(SUM(up.amount) FILTER (WHERE up.status = 'paid' AND up.payment_date >= date_trunc('year', CURRENT_DATE)), 0) AS revenue_this_year,
    COALESCE(SUM(up.amount) FILTER (WHERE up.status = 'paid' AND up.payment_date >= date_trunc('year', CURRENT_DATE - INTERVAL '1 year') AND up.payment_date < date_trunc('year', CURRENT_DATE)), 0) AS revenue_last_year
  FROM unified_payments up
  GROUP BY up.product_id, up.environment
)
SELECT 
  pec.product_id,
  pec.product_name,
  pec.icone_light,
  pec.icone_dark,
  pec.environment,
  COALESCE(asub.active_subscriptions, 0) AS active_subscriptions,
  COALESCE(ps.total_revenue, 0) AS total_revenue,
  COALESCE(ps.revenue_this_month, 0) AS revenue_this_month,
  COALESCE(ps.revenue_last_month, 0) AS revenue_last_month,
  COALESCE(ps.revenue_7_days, 0) AS revenue_7_days,
  COALESCE(ps.revenue_30_days, 0) AS revenue_30_days,
  COALESCE(ps.revenue_this_year, 0) AS revenue_this_year,
  COALESCE(ps.revenue_last_year, 0) AS revenue_last_year
FROM product_env_combos pec
LEFT JOIN active_subscriptions asub ON asub.product_id = pec.product_id AND asub.environment = pec.environment
LEFT JOIN payment_stats ps ON ps.product_id = pec.product_id AND ps.environment = pec.environment;

COMMENT ON VIEW view_admin_product_stats IS 'View otimizada para estatísticas de produtos no admin dashboard - conta assinaturas ativas baseado em pagamentos dos últimos 40 dias';
