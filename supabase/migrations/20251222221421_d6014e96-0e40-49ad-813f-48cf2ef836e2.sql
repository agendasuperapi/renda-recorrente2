-- View 1: Estatísticas gerais do dashboard admin
CREATE OR REPLACE VIEW view_admin_dashboard_stats AS
WITH affiliate_counts AS (
  SELECT 
    environment,
    COUNT(*) as total_affiliates,
    COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)) as affiliates_this_month,
    COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') 
      AND created_at < date_trunc('month', CURRENT_DATE)) as affiliates_last_month,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as affiliates_7_days,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '14 days' 
      AND created_at < CURRENT_DATE - INTERVAL '7 days') as affiliates_prev_7_days
  FROM profiles
  WHERE deleted_at IS NULL
  GROUP BY environment
),
subscription_counts AS (
  SELECT 
    environment,
    COUNT(*) FILTER (WHERE status = 'active') as active_subscriptions,
    COUNT(*) FILTER (WHERE status = 'active' AND created_at >= date_trunc('month', CURRENT_DATE)) as subscriptions_this_month,
    COUNT(*) FILTER (WHERE status = 'active' AND created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') 
      AND created_at < date_trunc('month', CURRENT_DATE)) as subscriptions_last_month
  FROM unified_users
  WHERE deleted_at IS NULL
  GROUP BY environment
),
revenue_stats AS (
  SELECT 
    environment,
    COALESCE(SUM(amount), 0) as total_revenue,
    COALESCE(SUM(amount) FILTER (WHERE payment_date >= date_trunc('month', CURRENT_DATE)), 0) as revenue_this_month,
    COALESCE(SUM(amount) FILTER (WHERE payment_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') 
      AND payment_date < date_trunc('month', CURRENT_DATE)), 0) as revenue_last_month,
    COALESCE(SUM(amount) FILTER (WHERE payment_date::date = CURRENT_DATE), 0) as revenue_today,
    COALESCE(SUM(amount) FILTER (WHERE payment_date::date = CURRENT_DATE - INTERVAL '1 day'), 0) as revenue_yesterday,
    COALESCE(SUM(amount) FILTER (WHERE payment_date >= CURRENT_DATE - INTERVAL '7 days'), 0) as revenue_7_days,
    COALESCE(SUM(amount) FILTER (WHERE payment_date >= CURRENT_DATE - INTERVAL '14 days' 
      AND payment_date < CURRENT_DATE - INTERVAL '7 days'), 0) as revenue_prev_7_days,
    COALESCE(SUM(amount) FILTER (WHERE payment_date >= date_trunc('year', CURRENT_DATE)), 0) as revenue_this_year,
    COALESCE(SUM(amount) FILTER (WHERE payment_date >= date_trunc('year', CURRENT_DATE - INTERVAL '1 year') 
      AND payment_date < date_trunc('year', CURRENT_DATE)), 0) as revenue_last_year
  FROM unified_payments
  WHERE status = 'paid'
  GROUP BY environment
),
commission_stats AS (
  SELECT 
    p.environment,
    COALESCE(SUM(c.amount) FILTER (WHERE c.status = 'paid'), 0) as commissions_paid_total,
    COALESCE(SUM(c.amount) FILTER (WHERE c.status = 'paid' AND c.payment_date >= date_trunc('month', CURRENT_DATE)), 0) as commissions_paid_this_month,
    COALESCE(SUM(c.amount) FILTER (WHERE c.status = 'paid' AND c.payment_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') 
      AND c.payment_date < date_trunc('month', CURRENT_DATE)), 0) as commissions_paid_last_month,
    COALESCE(SUM(c.amount) FILTER (WHERE c.status = 'paid' AND c.payment_date::date = CURRENT_DATE), 0) as commissions_paid_today,
    COALESCE(SUM(c.amount) FILTER (WHERE c.status = 'paid' AND c.payment_date::date = CURRENT_DATE - INTERVAL '1 day'), 0) as commissions_paid_yesterday
  FROM commissions c
  JOIN profiles p ON p.id = c.affiliate_id
  GROUP BY p.environment
),
withdrawal_stats AS (
  SELECT 
    w.environment,
    COALESCE(SUM(w.amount) FILTER (WHERE w.status = 'pending'), 0) as pending_withdrawals_amount,
    COUNT(*) FILTER (WHERE w.status = 'pending') as pending_withdrawals_count
  FROM withdrawals w
  GROUP BY w.environment
)
SELECT 
  COALESCE(ac.environment, sc.environment, rs.environment, cs.environment, ws.environment) as environment,
  COALESCE(ac.total_affiliates, 0) as total_affiliates,
  COALESCE(ac.affiliates_this_month, 0) as affiliates_this_month,
  COALESCE(ac.affiliates_last_month, 0) as affiliates_last_month,
  COALESCE(ac.affiliates_7_days, 0) as affiliates_7_days,
  COALESCE(ac.affiliates_prev_7_days, 0) as affiliates_prev_7_days,
  COALESCE(sc.active_subscriptions, 0) as active_subscriptions,
  COALESCE(sc.subscriptions_this_month, 0) as subscriptions_this_month,
  COALESCE(sc.subscriptions_last_month, 0) as subscriptions_last_month,
  COALESCE(rs.total_revenue, 0) as total_revenue,
  COALESCE(rs.revenue_this_month, 0) as revenue_this_month,
  COALESCE(rs.revenue_last_month, 0) as revenue_last_month,
  COALESCE(rs.revenue_today, 0) as revenue_today,
  COALESCE(rs.revenue_yesterday, 0) as revenue_yesterday,
  COALESCE(rs.revenue_7_days, 0) as revenue_7_days,
  COALESCE(rs.revenue_prev_7_days, 0) as revenue_prev_7_days,
  COALESCE(rs.revenue_this_year, 0) as revenue_this_year,
  COALESCE(rs.revenue_last_year, 0) as revenue_last_year,
  COALESCE(cs.commissions_paid_total, 0) as commissions_paid_total,
  COALESCE(cs.commissions_paid_this_month, 0) as commissions_paid_this_month,
  COALESCE(cs.commissions_paid_last_month, 0) as commissions_paid_last_month,
  COALESCE(cs.commissions_paid_today, 0) as commissions_paid_today,
  COALESCE(cs.commissions_paid_yesterday, 0) as commissions_paid_yesterday,
  COALESCE(ws.pending_withdrawals_amount, 0) as pending_withdrawals_amount,
  COALESCE(ws.pending_withdrawals_count, 0) as pending_withdrawals_count
FROM affiliate_counts ac
FULL OUTER JOIN subscription_counts sc ON sc.environment = ac.environment
FULL OUTER JOIN revenue_stats rs ON rs.environment = COALESCE(ac.environment, sc.environment)
FULL OUTER JOIN commission_stats cs ON cs.environment = COALESCE(ac.environment, sc.environment, rs.environment)
FULL OUTER JOIN withdrawal_stats ws ON ws.environment = COALESCE(ac.environment, sc.environment, rs.environment, cs.environment);

-- View 2: Receitas diárias por produto (para gráficos)
CREATE OR REPLACE VIEW view_admin_revenue_daily AS
SELECT 
  DATE(up.payment_date AT TIME ZONE 'America/Sao_Paulo') as day,
  up.product_id,
  p.nome as product_name,
  up.environment,
  COALESCE(SUM(up.amount), 0) as revenue,
  COUNT(*) as payment_count
FROM unified_payments up
LEFT JOIN products p ON p.id = up.product_id
WHERE up.status = 'paid' 
  AND up.payment_date >= CURRENT_DATE - INTERVAL '60 days'
GROUP BY DATE(up.payment_date AT TIME ZONE 'America/Sao_Paulo'), up.product_id, p.nome, up.environment
ORDER BY day DESC;

-- View 3: Novos afiliados diários (para gráficos)
CREATE OR REPLACE VIEW view_admin_affiliates_daily AS
SELECT 
  DATE(created_at AT TIME ZONE 'America/Sao_Paulo') as day,
  environment,
  COUNT(*) as new_affiliates
FROM profiles
WHERE created_at >= CURRENT_DATE - INTERVAL '60 days'
  AND deleted_at IS NULL
GROUP BY DATE(created_at AT TIME ZONE 'America/Sao_Paulo'), environment
ORDER BY day DESC;

-- View 4: Estatísticas por produto
CREATE OR REPLACE VIEW view_admin_product_stats AS
SELECT 
  p.id as product_id,
  p.nome as product_name,
  p.icone_light,
  p.icone_dark,
  COALESCE(uu.environment, 'production') as environment,
  COUNT(DISTINCT uu.id) FILTER (WHERE uu.status = 'active') as active_subscriptions,
  COALESCE(SUM(up.amount) FILTER (WHERE up.status = 'paid'), 0) as total_revenue,
  COALESCE(SUM(up.amount) FILTER (WHERE up.status = 'paid' 
    AND up.payment_date >= date_trunc('month', CURRENT_DATE)), 0) as revenue_this_month,
  COALESCE(SUM(up.amount) FILTER (WHERE up.status = 'paid' 
    AND up.payment_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
    AND up.payment_date < date_trunc('month', CURRENT_DATE)), 0) as revenue_last_month,
  COALESCE(SUM(up.amount) FILTER (WHERE up.status = 'paid' 
    AND up.payment_date >= CURRENT_DATE - INTERVAL '7 days'), 0) as revenue_7_days,
  COALESCE(SUM(up.amount) FILTER (WHERE up.status = 'paid' 
    AND up.payment_date >= CURRENT_DATE - INTERVAL '30 days'), 0) as revenue_30_days,
  COALESCE(SUM(up.amount) FILTER (WHERE up.status = 'paid' 
    AND up.payment_date >= date_trunc('year', CURRENT_DATE)), 0) as revenue_this_year,
  COALESCE(SUM(up.amount) FILTER (WHERE up.status = 'paid' 
    AND up.payment_date >= date_trunc('year', CURRENT_DATE - INTERVAL '1 year')
    AND up.payment_date < date_trunc('year', CURRENT_DATE)), 0) as revenue_last_year
FROM products p
LEFT JOIN unified_users uu ON uu.product_id = p.id AND uu.deleted_at IS NULL
LEFT JOIN unified_payments up ON up.product_id = p.id AND up.environment = uu.environment
GROUP BY p.id, p.nome, p.icone_light, p.icone_dark, uu.environment;

-- Permissões
GRANT SELECT ON view_admin_dashboard_stats TO authenticated;
GRANT SELECT ON view_admin_revenue_daily TO authenticated;
GRANT SELECT ON view_admin_affiliates_daily TO authenticated;
GRANT SELECT ON view_admin_product_stats TO authenticated;