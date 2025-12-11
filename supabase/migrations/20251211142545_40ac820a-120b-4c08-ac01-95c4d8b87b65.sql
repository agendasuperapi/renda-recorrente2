-- Dropar todas as views dependentes
DROP VIEW IF EXISTS public.view_sub_affiliates CASCADE;
DROP VIEW IF EXISTS public.view_sub_affiliates_stats CASCADE;
DROP VIEW IF EXISTS public.view_referrals_stats CASCADE;
DROP VIEW IF EXISTS public.view_admin_affiliates CASCADE;
DROP VIEW IF EXISTS public.view_affiliate_goals_progress CASCADE;
DROP VIEW IF EXISTS public.view_referrals CASCADE;
DROP VIEW IF EXISTS public.view_commissions_daily CASCADE;
DROP VIEW IF EXISTS public.view_commissions_monthly CASCADE;
DROP VIEW IF EXISTS public.view_affiliate_dashboard_stats CASCADE;

-- Alterar tipos de coluna
ALTER TABLE public.unified_users 
ALTER COLUMN external_user_id TYPE text;

ALTER TABLE public.unified_payments 
ALTER COLUMN external_payment_id TYPE text;

-- Recriar view_affiliate_dashboard_stats
CREATE OR REPLACE VIEW public.view_affiliate_dashboard_stats AS
SELECT id AS affiliate_id,
    COALESCE(( SELECT sum(c.amount) AS sum
           FROM commissions c
          WHERE ((c.affiliate_id = p.id) AND (c.unified_payment_id IS NOT NULL) AND (((c.payment_date AT TIME ZONE 'America/Sao_Paulo'::text))::date = ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'::text))::date))), (0)::numeric) AS comissao_hoje,
    COALESCE(( SELECT sum(c.amount) AS sum
           FROM commissions c
          WHERE ((c.affiliate_id = p.id) AND (c.unified_payment_id IS NOT NULL) AND (((c.payment_date AT TIME ZONE 'America/Sao_Paulo'::text))::date >= ((((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'::text))::date - '6 days'::interval))::date))), (0)::numeric) AS comissao_7_dias,
    COALESCE(( SELECT sum(c.amount) AS sum
           FROM commissions c
          WHERE ((c.affiliate_id = p.id) AND (c.unified_payment_id IS NOT NULL) AND (EXTRACT(year FROM (c.payment_date AT TIME ZONE 'America/Sao_Paulo'::text)) = EXTRACT(year FROM (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'::text))) AND (EXTRACT(month FROM (c.payment_date AT TIME ZONE 'America/Sao_Paulo'::text)) = EXTRACT(month FROM (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'::text))))), (0)::numeric) AS comissao_mes,
    COALESCE(( SELECT sum(c.amount) AS sum
           FROM commissions c
          WHERE ((c.affiliate_id = p.id) AND (c.status = 'available'::commission_status))), (0)::numeric) AS comissao_disponivel,
    COALESCE(( SELECT sum(c.amount) AS sum
           FROM commissions c
          WHERE ((c.affiliate_id = p.id) AND (c.status = 'pending'::commission_status))), (0)::numeric) AS comissao_pendente,
    COALESCE(( SELECT (count(*))::integer AS count
           FROM unified_users uu
          WHERE (uu.affiliate_id = p.id)), 0) AS total_indicacoes,
    COALESCE(( SELECT (count(DISTINCT sa.sub_affiliate_id))::integer AS count
           FROM sub_affiliates sa
          WHERE ((sa.parent_affiliate_id = p.id) AND (sa.level = 1))), 0) AS total_sub_afiliados,
    COALESCE(( SELECT sum(w.amount) AS sum
           FROM withdrawals w
          WHERE ((w.affiliate_id = p.id) AND (w.status = 'paid'::withdrawal_status))), (0)::numeric) AS total_sacado
   FROM profiles p;

-- Recriar view_commissions_monthly
CREATE OR REPLACE VIEW public.view_commissions_monthly AS
SELECT ((date_trunc('month'::text, (((c.payment_date AT TIME ZONE 'America/Sao_Paulo'::text))::date)::timestamp with time zone) + '15 days'::interval))::date AS mes_referencia,
    c.affiliate_id,
    aff.name AS affiliate_name,
    p.id AS product_id,
    p.nome AS produto,
    pl.id AS plan_id,
    pl.name AS plano,
    count(*) AS quantidade_comissoes,
    sum(c.amount) AS valor_total,
    avg(c.percentage) AS percentual_medio,
    count(CASE WHEN (c.status = 'pending'::commission_status) THEN 1 ELSE NULL::integer END) AS pendentes,
    count(CASE WHEN (c.status = 'available'::commission_status) THEN 1 ELSE NULL::integer END) AS disponiveis,
    count(CASE WHEN (c.status = 'withdrawn'::commission_status) THEN 1 ELSE NULL::integer END) AS sacadas,
    count(CASE WHEN (c.status = 'cancelled'::commission_status) THEN 1 ELSE NULL::integer END) AS canceladas,
    mode() WITHIN GROUP (ORDER BY c.commission_type) AS tipo_predominante
   FROM ((((commissions c
     LEFT JOIN products p ON ((p.id = c.product_id)))
     LEFT JOIN unified_payments up ON ((up.id = c.unified_payment_id)))
     LEFT JOIN plans pl ON ((pl.id = up.plan_id)))
     LEFT JOIN profiles aff ON ((aff.id = c.affiliate_id)))
  WHERE ((c.unified_payment_id IS NOT NULL) AND (c.payment_date IS NOT NULL))
  GROUP BY (((date_trunc('month'::text, (((c.payment_date AT TIME ZONE 'America/Sao_Paulo'::text))::date)::timestamp with time zone) + '15 days'::interval))::date), c.affiliate_id, aff.name, p.id, p.nome, pl.id, pl.name
  ORDER BY (((date_trunc('month'::text, (((c.payment_date AT TIME ZONE 'America/Sao_Paulo'::text))::date)::timestamp with time zone) + '15 days'::interval))::date) DESC, (sum(c.amount)) DESC;

-- Recriar view_commissions_daily (com casting para comparação text = uuid)
CREATE OR REPLACE VIEW public.view_commissions_daily AS
SELECT c.id,
    c.payment_date AS data,
    ((c.payment_date AT TIME ZONE 'America/Sao_Paulo'::text))::date AS data_filtro,
    c.created_at,
    p.id AS product_id,
    p.nome AS produto,
    p.icone_light AS product_icon_light,
    p.icone_dark AS product_icon_dark,
    uu.id AS unified_user_id,
    uu.name AS cliente,
    uu.email AS cliente_email,
    pl.id AS plan_id,
    pl.name AS plano,
    c.affiliate_id,
    aff.name AS affiliate_name,
    c.amount AS valor,
    c.percentage AS percentual,
    c.status,
    c.unified_payment_id,
    c.commission_type,
    COALESCE(( SELECT sa.level
           FROM sub_affiliates sa
          WHERE ((sa.sub_affiliate_id::text = uu.external_user_id) AND (sa.parent_affiliate_id = c.affiliate_id))
         LIMIT 1), 1) AS level,
    c.available_date
   FROM (((((commissions c
     LEFT JOIN unified_payments up ON ((up.id = c.unified_payment_id)))
     LEFT JOIN products p ON ((p.id = up.product_id)))
     LEFT JOIN unified_users uu ON ((uu.id = up.unified_user_id)))
     LEFT JOIN plans pl ON ((pl.id = up.plan_id)))
     LEFT JOIN profiles aff ON ((aff.id = c.affiliate_id)))
  WHERE (c.unified_payment_id IS NOT NULL)
  ORDER BY c.payment_date DESC NULLS LAST, c.created_at DESC;

-- Recriar view_referrals
CREATE OR REPLACE VIEW public.view_referrals AS
SELECT uu.id,
    uu.created_at,
    uu.name,
    uu.email,
    uu.phone,
    uu.cpf,
    uu.affiliate_code,
    uu.affiliate_id,
    p.nome AS product_name,
    p.id AS product_id,
    pl.name AS plan_name,
    pl.id AS plan_id,
    uu.cancel_at_period_end,
    uu.trial_end,
    uu.status,
    uu.current_period_start,
    uu.current_period_end,
    uu.environment,
    uu.external_user_id,
    COALESCE(ac.custom_code, ac.coupon_code_at_creation) AS coupon_code
   FROM ((((unified_users uu
     LEFT JOIN products p ON ((uu.product_id = p.id)))
     LEFT JOIN plans pl ON ((uu.plan_id = pl.id)))
     LEFT JOIN LATERAL ( SELECT up.affiliate_coupon_id
           FROM unified_payments up
          WHERE ((up.unified_user_id = uu.id) AND (up.billing_reason = 'subscription_create'::text))
          ORDER BY up.created_at
         LIMIT 1) first_payment ON (true))
     LEFT JOIN affiliate_coupons ac ON ((first_payment.affiliate_coupon_id = ac.id)))
  ORDER BY uu.created_at DESC;

-- Recriar view_affiliate_goals_progress
CREATE OR REPLACE VIEW public.view_affiliate_goals_progress AS
SELECT g.id,
    g.affiliate_id,
    g.product_id,
    g.goal_type,
    g.target_value,
    g.period_start,
    g.period_end,
    g.is_active,
    g.created_at,
    g.updated_at,
    p.nome AS product_name,
    p.icone_light AS product_icon_light,
    p.icone_dark AS product_icon_dark,
        CASE
            WHEN (g.goal_type = 'value'::text) THEN COALESCE(( SELECT sum(c.amount) AS sum
               FROM commissions c
              WHERE ((c.affiliate_id = g.affiliate_id) AND ((g.product_id IS NULL) OR (c.product_id = g.product_id)) AND (((c.payment_date AT TIME ZONE 'America/Sao_Paulo'::text))::date >= g.period_start) AND (((c.payment_date AT TIME ZONE 'America/Sao_Paulo'::text))::date <= g.period_end))), (0)::numeric)
            WHEN (g.goal_type = 'sales'::text) THEN (COALESCE(( SELECT count(DISTINCT c.unified_payment_id) AS count
               FROM commissions c
              WHERE ((c.affiliate_id = g.affiliate_id) AND ((g.product_id IS NULL) OR (c.product_id = g.product_id)) AND (((c.payment_date AT TIME ZONE 'America/Sao_Paulo'::text))::date >= g.period_start) AND (((c.payment_date AT TIME ZONE 'America/Sao_Paulo'::text))::date <= g.period_end) AND (c.level = 1))), (0)::bigint))::numeric
            WHEN (g.goal_type = 'referrals'::text) THEN (COALESCE(( SELECT count(*) AS count
               FROM unified_users u
              WHERE ((u.affiliate_id = g.affiliate_id) AND ((g.product_id IS NULL) OR (u.product_id = g.product_id)) AND ((u.created_at)::date >= g.period_start) AND ((u.created_at)::date <= g.period_end))), (0)::bigint))::numeric
            ELSE (0)::numeric
        END AS current_value,
        CASE
            WHEN (g.target_value > (0)::numeric) THEN round(((
            CASE
                WHEN (g.goal_type = 'value'::text) THEN COALESCE(( SELECT sum(c.amount) AS sum
                   FROM commissions c
                  WHERE ((c.affiliate_id = g.affiliate_id) AND ((g.product_id IS NULL) OR (c.product_id = g.product_id)) AND (((c.payment_date AT TIME ZONE 'America/Sao_Paulo'::text))::date >= g.period_start) AND (((c.payment_date AT TIME ZONE 'America/Sao_Paulo'::text))::date <= g.period_end))), (0)::numeric)
                WHEN (g.goal_type = 'sales'::text) THEN (COALESCE(( SELECT count(DISTINCT c.unified_payment_id) AS count
                   FROM commissions c
                  WHERE ((c.affiliate_id = g.affiliate_id) AND ((g.product_id IS NULL) OR (c.product_id = g.product_id)) AND (((c.payment_date AT TIME ZONE 'America/Sao_Paulo'::text))::date >= g.period_start) AND (((c.payment_date AT TIME ZONE 'America/Sao_Paulo'::text))::date <= g.period_end) AND (c.level = 1))), (0)::bigint))::numeric
                WHEN (g.goal_type = 'referrals'::text) THEN (COALESCE(( SELECT count(*) AS count
                   FROM unified_users u
                  WHERE ((u.affiliate_id = g.affiliate_id) AND ((g.product_id IS NULL) OR (u.product_id = g.product_id)) AND ((u.created_at)::date >= g.period_start) AND ((u.created_at)::date <= g.period_end))), (0)::bigint))::numeric
                ELSE (0)::numeric
            END / g.target_value) * (100)::numeric), 1)
            ELSE (0)::numeric
        END AS progress_percentage,
        CASE
            WHEN ((g.period_end < CURRENT_DATE) AND (
            CASE
                WHEN (g.goal_type = 'value'::text) THEN COALESCE(( SELECT sum(c.amount) AS sum
                   FROM commissions c
                  WHERE ((c.affiliate_id = g.affiliate_id) AND ((g.product_id IS NULL) OR (c.product_id = g.product_id)) AND (((c.payment_date AT TIME ZONE 'America/Sao_Paulo'::text))::date >= g.period_start) AND (((c.payment_date AT TIME ZONE 'America/Sao_Paulo'::text))::date <= g.period_end))), (0)::numeric)
                WHEN (g.goal_type = 'sales'::text) THEN (COALESCE(( SELECT count(DISTINCT c.unified_payment_id) AS count
                   FROM commissions c
                  WHERE ((c.affiliate_id = g.affiliate_id) AND ((g.product_id IS NULL) OR (c.product_id = g.product_id)) AND (((c.payment_date AT TIME ZONE 'America/Sao_Paulo'::text))::date >= g.period_start) AND (((c.payment_date AT TIME ZONE 'America/Sao_Paulo'::text))::date <= g.period_end) AND (c.level = 1))), (0)::bigint))::numeric
                WHEN (g.goal_type = 'referrals'::text) THEN (COALESCE(( SELECT count(*) AS count
                   FROM unified_users u
                  WHERE ((u.affiliate_id = g.affiliate_id) AND ((g.product_id IS NULL) OR (u.product_id = g.product_id)) AND ((u.created_at)::date >= g.period_start) AND ((u.created_at)::date <= g.period_end))), (0)::bigint))::numeric
                ELSE (0)::numeric
            END >= g.target_value)) THEN 'completed'::text
            WHEN (g.period_end < CURRENT_DATE) THEN 'expired'::text
            WHEN ((CURRENT_DATE >= g.period_start) AND (CURRENT_DATE <= g.period_end)) THEN 'active'::text
            ELSE 'pending'::text
        END AS status,
        CASE
            WHEN (g.period_end >= CURRENT_DATE) THEN (g.period_end - CURRENT_DATE)
            ELSE 0
        END AS days_remaining
   FROM (affiliate_goals g
     LEFT JOIN products p ON ((p.id = g.product_id)));

-- Recriar view_admin_affiliates
CREATE OR REPLACE VIEW public.view_admin_affiliates AS
SELECT p.id,
    p.name,
    p.email,
    p.username,
    p.avatar_url,
    p.created_at,
    p.is_blocked,
    p.withdrawal_day,
    COALESCE(pl.name, 'Sem plano'::text) AS plan_name,
    COALESCE(pl.billing_period, '-'::text) AS plan_period,
    COALESCE(s.status, 'inactive'::text) AS plan_status,
    COALESCE(( SELECT (count(*))::integer AS count
           FROM unified_users uu
          WHERE (uu.affiliate_id = p.id)), 0) AS referrals_count
   FROM ((profiles p
     LEFT JOIN LATERAL ( SELECT subscriptions.id,
            subscriptions.user_id,
            subscriptions.plan_id,
            subscriptions.stripe_subscription_id,
            subscriptions.status,
            subscriptions.current_period_start,
            subscriptions.current_period_end,
            subscriptions.trial_end,
            subscriptions.cancel_at,
            subscriptions.cancelled_at,
            subscriptions.created_at,
            subscriptions.updated_at,
            subscriptions.payment_method_data,
            subscriptions.environment,
            subscriptions.cancellation_details,
            subscriptions.cancel_at_period_end,
            subscriptions.affiliate_id,
            subscriptions.affiliate_coupon_id
           FROM subscriptions
          WHERE (subscriptions.user_id = p.id)
          ORDER BY subscriptions.created_at DESC
         LIMIT 1) s ON (true))
     LEFT JOIN plans pl ON ((pl.id = s.plan_id)));

-- Recriar view_referrals_stats
CREATE OR REPLACE VIEW public.view_referrals_stats AS
SELECT uu.affiliate_id,
    uu.product_id,
    p.nome AS product_name,
    count(*) AS total_referrals,
    count(*) FILTER (WHERE (uu.status = 'active'::text)) AS active_subscriptions,
        CASE
            WHEN (count(*) > 0) THEN round((((count(*) FILTER (WHERE (uu.status = 'active'::text)))::numeric / (count(*))::numeric) * (100)::numeric))
            ELSE (0)::numeric
        END AS conversion_rate
   FROM (unified_users uu
     LEFT JOIN products p ON ((p.id = uu.product_id)))
  WHERE (uu.affiliate_id IS NOT NULL)
  GROUP BY uu.affiliate_id, uu.product_id, p.nome;

-- Recriar view_sub_affiliates_stats (com casting)
CREATE OR REPLACE VIEW public.view_sub_affiliates_stats AS
SELECT parent_affiliate_id,
    count(DISTINCT sub_affiliate_id) AS total_sub_affiliates,
    COALESCE(( SELECT sum(c.amount) AS sum
           FROM (commissions c
             JOIN unified_users uu_comm ON ((uu_comm.id = c.unified_user_id)))
          WHERE ((c.affiliate_id = sa.parent_affiliate_id) AND (c.status = ANY (ARRAY['pending'::commission_status, 'available'::commission_status, 'paid'::commission_status])) AND (EXISTS ( SELECT 1
                   FROM sub_affiliates sa2
                  WHERE ((sa2.parent_affiliate_id = sa.parent_affiliate_id) AND ((sa2.sub_affiliate_id::text = uu_comm.external_user_id) OR (EXISTS ( SELECT 1
                           FROM sub_affiliates sa3
                          WHERE ((sa3.parent_affiliate_id = sa2.sub_affiliate_id) AND (sa3.sub_affiliate_id::text = uu_comm.external_user_id)))))))))), (0)::numeric) AS total_commission
   FROM sub_affiliates sa
  WHERE (level = 1)
  GROUP BY parent_affiliate_id;

-- Recriar view_sub_affiliates (com casting)
CREATE OR REPLACE VIEW public.view_sub_affiliates AS
SELECT uu.id,
    sa.parent_affiliate_id,
    uu.external_user_id,
    p.name,
    p.username,
    p.email,
    p.avatar_url,
    pl.name AS plan_name,
    pl.id AS plan_id,
    uu.status,
    uu.created_at,
    uu.product_id,
    sa.level,
    COALESCE(( SELECT (count(*))::integer AS count
           FROM unified_users sub
          WHERE (sub.affiliate_id::text = uu.external_user_id)), 0) AS referrals_count,
    COALESCE(( SELECT sum(c.amount) AS sum
           FROM commissions c
          WHERE ((c.affiliate_id::text = uu.external_user_id) AND (c.status = ANY (ARRAY['pending'::commission_status, 'available'::commission_status, 'paid'::commission_status])))), (0)::numeric) AS total_commission,
    COALESCE(( SELECT sum(c.amount) AS sum
           FROM (commissions c
             JOIN unified_users uu_comm ON ((uu_comm.id = c.unified_user_id)))
          WHERE ((c.affiliate_id = sa.parent_affiliate_id) AND (c.status = ANY (ARRAY['pending'::commission_status, 'available'::commission_status, 'paid'::commission_status])) AND ((uu_comm.external_user_id = uu.external_user_id) OR (EXISTS ( SELECT 1
                   FROM sub_affiliates sa2
                  WHERE ((sa2.parent_affiliate_id::text = uu.external_user_id) AND (sa2.sub_affiliate_id::text = uu_comm.external_user_id))))))), (0)::numeric) AS my_commission_from_sub
   FROM (((sub_affiliates sa
     JOIN unified_users uu ON ((uu.external_user_id = sa.sub_affiliate_id::text)))
     LEFT JOIN profiles p ON ((p.id::text = uu.external_user_id)))
     LEFT JOIN plans pl ON ((pl.id = uu.plan_id)))
  ORDER BY uu.created_at DESC;