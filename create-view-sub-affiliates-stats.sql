-- Create view for sub-affiliates statistics aggregated by parent affiliate
CREATE OR REPLACE VIEW view_sub_affiliates_stats AS
SELECT 
  sa.parent_affiliate_id,
  COUNT(DISTINCT sa.sub_affiliate_id) as total_sub_affiliates,
  COALESCE(SUM(c.amount), 0) as total_commission
FROM sub_affiliates sa
LEFT JOIN commissions c ON c.affiliate_id = sa.sub_affiliate_id
GROUP BY sa.parent_affiliate_id;

-- Grant access to authenticated users
GRANT SELECT ON view_sub_affiliates_stats TO authenticated;

COMMENT ON VIEW view_sub_affiliates_stats IS 'Aggregated statistics of sub-affiliates per parent affiliate including total count and commissions';
