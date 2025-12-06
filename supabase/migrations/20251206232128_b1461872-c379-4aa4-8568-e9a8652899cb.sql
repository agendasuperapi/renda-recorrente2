-- Criar tabela de metas dos afiliados
CREATE TABLE public.affiliate_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('value', 'sales', 'referrals')),
  target_value NUMERIC NOT NULL CHECK (target_value > 0),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraint: apenas uma meta ativa por tipo/produto/período
  CONSTRAINT unique_goal_per_period UNIQUE(affiliate_id, product_id, goal_type, period_start)
);

-- Habilitar RLS
ALTER TABLE public.affiliate_goals ENABLE ROW LEVEL SECURITY;

-- Policies para afiliados gerenciarem suas próprias metas
CREATE POLICY "Affiliates can view own goals"
ON public.affiliate_goals
FOR SELECT
USING (auth.uid() = affiliate_id);

CREATE POLICY "Affiliates can create own goals"
ON public.affiliate_goals
FOR INSERT
WITH CHECK (auth.uid() = affiliate_id);

CREATE POLICY "Affiliates can update own goals"
ON public.affiliate_goals
FOR UPDATE
USING (auth.uid() = affiliate_id)
WITH CHECK (auth.uid() = affiliate_id);

CREATE POLICY "Affiliates can delete own goals"
ON public.affiliate_goals
FOR DELETE
USING (auth.uid() = affiliate_id);

-- Admins podem ver todas as metas
CREATE POLICY "Admins can view all goals"
ON public.affiliate_goals
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

-- Criar view para calcular progresso das metas
CREATE OR REPLACE VIEW public.view_affiliate_goals_progress AS
SELECT 
  g.id,
  g.affiliate_id,
  g.product_id,
  g.goal_type,
  g.target_value,
  g.period_start,
  g.period_end,
  g.is_active,
  g.created_at,
  g.updated_at,
  p.nome as product_name,
  p.icone_light as product_icon_light,
  p.icone_dark as product_icon_dark,
  -- Calcular valor atual baseado no tipo de meta
  CASE 
    WHEN g.goal_type = 'value' THEN
      COALESCE((
        SELECT SUM(c.amount)
        FROM commissions c
        WHERE c.affiliate_id = g.affiliate_id
          AND (g.product_id IS NULL OR c.product_id = g.product_id)
          AND (c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date >= g.period_start
          AND (c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date <= g.period_end
      ), 0)
    WHEN g.goal_type = 'sales' THEN
      COALESCE((
        SELECT COUNT(DISTINCT c.unified_payment_id)
        FROM commissions c
        WHERE c.affiliate_id = g.affiliate_id
          AND (g.product_id IS NULL OR c.product_id = g.product_id)
          AND (c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date >= g.period_start
          AND (c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date <= g.period_end
          AND c.level = 1
      ), 0)
    WHEN g.goal_type = 'referrals' THEN
      COALESCE((
        SELECT COUNT(*)
        FROM unified_users u
        WHERE u.affiliate_id = g.affiliate_id
          AND (g.product_id IS NULL OR u.product_id = g.product_id)
          AND u.created_at::date >= g.period_start
          AND u.created_at::date <= g.period_end
      ), 0)
    ELSE 0
  END as current_value,
  -- Calcular percentual
  CASE 
    WHEN g.target_value > 0 THEN
      ROUND((
        CASE 
          WHEN g.goal_type = 'value' THEN
            COALESCE((
              SELECT SUM(c.amount)
              FROM commissions c
              WHERE c.affiliate_id = g.affiliate_id
                AND (g.product_id IS NULL OR c.product_id = g.product_id)
                AND (c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date >= g.period_start
                AND (c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date <= g.period_end
            ), 0)
          WHEN g.goal_type = 'sales' THEN
            COALESCE((
              SELECT COUNT(DISTINCT c.unified_payment_id)
              FROM commissions c
              WHERE c.affiliate_id = g.affiliate_id
                AND (g.product_id IS NULL OR c.product_id = g.product_id)
                AND (c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date >= g.period_start
                AND (c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date <= g.period_end
                AND c.level = 1
            ), 0)
          WHEN g.goal_type = 'referrals' THEN
            COALESCE((
              SELECT COUNT(*)
              FROM unified_users u
              WHERE u.affiliate_id = g.affiliate_id
                AND (g.product_id IS NULL OR u.product_id = g.product_id)
                AND u.created_at::date >= g.period_start
                AND u.created_at::date <= g.period_end
            ), 0)
          ELSE 0
        END / g.target_value * 100
      )::numeric, 1)
    ELSE 0
  END as progress_percentage,
  -- Status da meta
  CASE
    WHEN g.period_end < CURRENT_DATE AND 
      (CASE 
        WHEN g.goal_type = 'value' THEN
          COALESCE((SELECT SUM(c.amount) FROM commissions c WHERE c.affiliate_id = g.affiliate_id AND (g.product_id IS NULL OR c.product_id = g.product_id) AND (c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date >= g.period_start AND (c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date <= g.period_end), 0)
        WHEN g.goal_type = 'sales' THEN
          COALESCE((SELECT COUNT(DISTINCT c.unified_payment_id) FROM commissions c WHERE c.affiliate_id = g.affiliate_id AND (g.product_id IS NULL OR c.product_id = g.product_id) AND (c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date >= g.period_start AND (c.payment_date AT TIME ZONE 'America/Sao_Paulo')::date <= g.period_end AND c.level = 1), 0)
        WHEN g.goal_type = 'referrals' THEN
          COALESCE((SELECT COUNT(*) FROM unified_users u WHERE u.affiliate_id = g.affiliate_id AND (g.product_id IS NULL OR u.product_id = g.product_id) AND u.created_at::date >= g.period_start AND u.created_at::date <= g.period_end), 0)
        ELSE 0
      END) >= g.target_value THEN 'completed'
    WHEN g.period_end < CURRENT_DATE THEN 'expired'
    WHEN CURRENT_DATE BETWEEN g.period_start AND g.period_end THEN 'active'
    ELSE 'pending'
  END as status,
  -- Dias restantes
  CASE 
    WHEN g.period_end >= CURRENT_DATE THEN (g.period_end - CURRENT_DATE)
    ELSE 0
  END as days_remaining
FROM public.affiliate_goals g
LEFT JOIN public.products p ON p.id = g.product_id;

-- Grants para a view
GRANT SELECT ON public.view_affiliate_goals_progress TO authenticated;
GRANT SELECT ON public.view_affiliate_goals_progress TO anon;

-- Trigger para updated_at
CREATE TRIGGER update_affiliate_goals_updated_at
BEFORE UPDATE ON public.affiliate_goals
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Comentários
COMMENT ON TABLE public.affiliate_goals IS 'Metas definidas pelos afiliados para acompanhamento de performance';
COMMENT ON VIEW public.view_affiliate_goals_progress IS 'View com progresso calculado das metas dos afiliados';