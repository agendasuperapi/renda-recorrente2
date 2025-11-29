-- View para exibir dados unificados de indicações
-- Combina dados de unified_users com produtos e planos

CREATE OR REPLACE VIEW public.view_referrals AS
SELECT 
  uu.id,
  uu.created_at,
  uu.name,
  uu.email,
  uu.phone,
  uu.cpf,
  uu.affiliate_code,
  uu.affiliate_id,
  p.nome as product_name,
  p.id as product_id,
  pl.name as plan_name,
  pl.id as plan_id,
  uu.cancel_at_period_end,
  uu.trial_end,
  uu.status,
  uu.current_period_start,
  uu.current_period_end,
  uu.environment,
  uu.external_user_id
FROM public.unified_users uu
LEFT JOIN public.products p ON uu.product_id = p.id
LEFT JOIN public.plans pl ON uu.plan_id = pl.id
ORDER BY uu.created_at DESC;

-- Grant access to authenticated users
GRANT SELECT ON public.view_referrals TO authenticated;
GRANT SELECT ON public.view_referrals TO anon;

-- Add RLS policies
ALTER VIEW public.view_referrals SET (security_invoker = true);

COMMENT ON VIEW public.view_referrals IS 'View unificada para exibir indicações com dados de produtos e planos';
