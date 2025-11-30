-- Create plan_commission_levels table to store commission percentages per plan and level
CREATE TABLE IF NOT EXISTS public.plan_commission_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 10),
  percentage INTEGER NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(plan_id, level)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_plan_commission_levels_plan_id ON public.plan_commission_levels(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_commission_levels_level ON public.plan_commission_levels(level);
CREATE INDEX IF NOT EXISTS idx_plan_commission_levels_active ON public.plan_commission_levels(is_active);

-- Enable RLS
ALTER TABLE public.plan_commission_levels ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage plan commission levels"
  ON public.plan_commission_levels
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Anyone can view active plan commission levels"
  ON public.plan_commission_levels
  FOR SELECT
  USING (is_active = true);

-- Add trigger for updated_at
CREATE TRIGGER handle_plan_commission_levels_updated_at
  BEFORE UPDATE ON public.plan_commission_levels
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Migrate existing data from commission_levels to plan_commission_levels
-- for all plans of APP Renda recorrente product
INSERT INTO public.plan_commission_levels (plan_id, level, percentage, is_active, description)
SELECT 
  p.id as plan_id,
  cl.level,
  cl.percentage,
  cl.is_active,
  cl.description
FROM public.plans p
CROSS JOIN public.commission_levels cl
WHERE p.product_id = 'bb582482-b006-47b8-b6ea-a6944d8cfdfd'
ON CONFLICT (plan_id, level) DO NOTHING;

COMMENT ON TABLE public.plan_commission_levels IS 'Stores commission percentages per plan and level for multi-level affiliate system';
