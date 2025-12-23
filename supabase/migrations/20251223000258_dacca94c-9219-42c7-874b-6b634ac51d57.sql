-- Recriar a view para mostrar todos os produtos em cada ambiente
DROP VIEW IF EXISTS view_admin_product_stats;

CREATE VIEW view_admin_product_stats AS
WITH environments AS (
  SELECT 'production' AS environment
  UNION ALL
  SELECT 'test' AS environment
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
)
SELECT 
  pec.product_id,
  pec.product_name,
  pec.icone_light,
  pec.icone_dark,
  pec.environment,
  COALESCE(COUNT(DISTINCT uu.id) FILTER (WHERE uu.status = 'active'), 0)::bigint AS active_subscriptions,
  COALESCE(SUM(up.amount) FILTER (WHERE up.status = 'paid'), 0) AS total_revenue,
  COALESCE(SUM(up.amount) FILTER (WHERE up.status = 'paid' AND up.payment_date >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS revenue_this_month,
  COALESCE(SUM(up.amount) FILTER (WHERE up.status = 'paid' AND up.payment_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AND up.payment_date < DATE_TRUNC('month', CURRENT_DATE)), 0) AS revenue_last_month,
  COALESCE(SUM(up.amount) FILTER (WHERE up.status = 'paid' AND up.payment_date >= CURRENT_DATE - INTERVAL '7 days'), 0) AS revenue_7_days,
  COALESCE(SUM(up.amount) FILTER (WHERE up.status = 'paid' AND up.payment_date >= CURRENT_DATE - INTERVAL '30 days'), 0) AS revenue_30_days,
  COALESCE(SUM(up.amount) FILTER (WHERE up.status = 'paid' AND up.payment_date >= DATE_TRUNC('year', CURRENT_DATE)), 0) AS revenue_this_year,
  COALESCE(SUM(up.amount) FILTER (WHERE up.status = 'paid' AND up.payment_date >= DATE_TRUNC('year', CURRENT_DATE - INTERVAL '1 year') AND up.payment_date < DATE_TRUNC('year', CURRENT_DATE)), 0) AS revenue_last_year
FROM product_env_combos pec
LEFT JOIN unified_users uu 
  ON uu.product_id = pec.product_id 
  AND uu.environment = pec.environment 
  AND uu.deleted_at IS NULL
LEFT JOIN unified_payments up 
  ON up.product_id = pec.product_id 
  AND up.environment = pec.environment
GROUP BY pec.product_id, pec.product_name, pec.icone_light, pec.icone_dark, pec.environment;