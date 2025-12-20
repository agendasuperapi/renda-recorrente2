-- View para estatísticas de comissões por ambiente
CREATE OR REPLACE VIEW public.view_admin_commissions_stats AS
SELECT 
  p.environment,
  COUNT(*) as total_count,
  COALESCE(SUM(c.amount), 0) as total_amount,
  COUNT(*) FILTER (WHERE c.status = 'pending') as pending_count,
  COALESCE(SUM(c.amount) FILTER (WHERE c.status = 'pending'), 0) as pending_amount,
  COUNT(*) FILTER (WHERE c.status = 'available') as available_count,
  COALESCE(SUM(c.amount) FILTER (WHERE c.status = 'available'), 0) as available_amount,
  COUNT(*) FILTER (WHERE c.status = 'withdrawn') as withdrawn_count,
  COALESCE(SUM(c.amount) FILTER (WHERE c.status = 'withdrawn'), 0) as withdrawn_amount,
  COUNT(*) FILTER (WHERE c.status = 'cancelled') as cancelled_count,
  COALESCE(SUM(c.amount) FILTER (WHERE c.status = 'cancelled'), 0) as cancelled_amount,
  COUNT(*) FILTER (WHERE c.status = 'requested') as requested_count,
  COALESCE(SUM(c.amount) FILTER (WHERE c.status = 'requested'), 0) as requested_amount
FROM public.commissions c
INNER JOIN public.profiles p ON p.id = c.affiliate_id
GROUP BY p.environment;