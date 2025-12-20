-- Dropar e recriar view view_admin_users para incluir environment do profiles
DROP VIEW IF EXISTS public.view_admin_users;

CREATE VIEW public.view_admin_users
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.name,
  p.username,
  p.email,
  p.phone,
  p.cpf,
  p.birth_date,
  p.gender,
  p.created_at,
  p.updated_at,
  p.street,
  p.number,
  p.complement,
  p.neighborhood,
  p.cep,
  p.city,
  p.state,
  p.pix_key,
  p.pix_type,
  p.instagram,
  p.facebook,
  p.tiktok,
  p.is_blocked,
  p.blocked_message,
  p.blocked_at,
  p.blocked_by,
  p.affiliate_code,
  p.referrer_code,
  p.avatar_url,
  p.withdrawal_day,
  p.environment,
  COALESCE(ur.role::text, 'afiliado') as role
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id;

-- Garantir acesso
GRANT SELECT ON public.view_admin_users TO authenticated;

COMMENT ON VIEW public.view_admin_users IS 'View otimizada para gestão de usuários no painel admin. Inclui environment do profiles.';