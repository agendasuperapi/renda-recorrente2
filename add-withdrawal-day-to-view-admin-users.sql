-- Adicionar campo withdrawal_day à view view_admin_users
CREATE OR REPLACE VIEW public.view_admin_users
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
    COALESCE(ur.role, 'afiliado'::app_role) AS role
FROM 
    public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
ORDER BY 
    CASE WHEN ur.role = 'super_admin' THEN 0 ELSE 1 END,
    p.created_at DESC;

COMMENT ON VIEW public.view_admin_users IS 'View otimizada para listagem de usuários no painel admin com roles';
