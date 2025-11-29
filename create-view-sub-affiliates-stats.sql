-- Create view for sub-affiliates statistics aggregated by parent affiliate
CREATE OR REPLACE VIEW view_sub_affiliates_stats AS
SELECT 
  sa.parent_affiliate_id,
  COUNT(DISTINCT sa.sub_affiliate_id) as total_sub_affiliates,
  COALESCE(
    (SELECT SUM(c.amount)
     FROM public.commissions c
     JOIN public.unified_users uu_comm ON uu_comm.id = c.unified_user_id
     WHERE c.affiliate_id = sa.parent_affiliate_id
     AND c.status IN ('pending', 'available', 'paid')
     AND EXISTS (
       SELECT 1 FROM public.sub_affiliates sa2
       WHERE sa2.parent_affiliate_id = sa.parent_affiliate_id
       AND (
         sa2.sub_affiliate_id = uu_comm.external_user_id
         OR EXISTS (
           SELECT 1 FROM public.sub_affiliates sa3
           WHERE sa3.parent_affiliate_id = sa2.sub_affiliate_id
           AND sa3.sub_affiliate_id = uu_comm.external_user_id
         )
       )
     )),
    0
  ) as total_commission
FROM sub_affiliates sa
WHERE sa.level = 1
GROUP BY sa.parent_affiliate_id;

-- Grant access to authenticated users
GRANT SELECT ON view_sub_affiliates_stats TO authenticated;

COMMENT ON VIEW view_sub_affiliates_stats IS 'Aggregated statistics of sub-affiliates per parent affiliate including total count and commissions that the parent earned through their sub-affiliates network';
