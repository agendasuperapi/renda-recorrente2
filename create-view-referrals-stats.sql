-- Create view for referrals statistics aggregated by affiliate and product
CREATE OR REPLACE VIEW view_referrals_stats AS
SELECT 
  uu.affiliate_id,
  uu.product_id,
  p.nome as product_name,
  COUNT(*) as total_referrals,
  COUNT(*) FILTER (WHERE uu.status = 'active') as active_subscriptions,
  CASE 
    WHEN COUNT(*) > 0 THEN 
      ROUND((COUNT(*) FILTER (WHERE uu.status = 'active')::numeric / COUNT(*)::numeric) * 100)
    ELSE 0 
  END as conversion_rate
FROM unified_users uu
LEFT JOIN products p ON p.id = uu.product_id
WHERE uu.affiliate_id IS NOT NULL
GROUP BY uu.affiliate_id, uu.product_id, p.nome;

-- Grant access to authenticated users
GRANT SELECT ON view_referrals_stats TO authenticated;

-- Add RLS policy to allow users to see only their own stats
ALTER VIEW view_referrals_stats SET (security_invoker = on);
