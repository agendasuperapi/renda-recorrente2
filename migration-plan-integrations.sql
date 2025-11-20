-- Create plan_integrations table to support multiple Stripe integrations per plan
CREATE TABLE IF NOT EXISTS public.plan_integrations (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  stripe_product_id text NOT NULL,
  stripe_price_id text NOT NULL,
  environment_type text NOT NULL CHECK (environment_type IN ('test', 'production')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Each plan can only have one integration per environment type
  UNIQUE(plan_id, environment_type)
);

-- Create index for better query performance
CREATE INDEX idx_plan_integrations_plan_id ON public.plan_integrations(plan_id);
CREATE INDEX idx_plan_integrations_account_id ON public.plan_integrations(account_id);

-- Add trigger for updated_at
CREATE TRIGGER handle_plan_integrations_updated_at
  BEFORE UPDATE ON public.plan_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Migrate existing data from plans table to plan_integrations
-- We'll assume existing integrations are for production environment
INSERT INTO public.plan_integrations (plan_id, account_id, stripe_product_id, stripe_price_id, environment_type)
SELECT 
  id as plan_id,
  account_id,
  stripe_product_id,
  stripe_price_id,
  'production' as environment_type
FROM public.plans
WHERE stripe_product_id IS NOT NULL 
  AND stripe_price_id IS NOT NULL 
  AND account_id IS NOT NULL;

-- Add RLS policies
ALTER TABLE public.plan_integrations ENABLE ROW LEVEL SECURITY;

-- Admins can manage all integrations
CREATE POLICY "Admins can manage plan integrations"
  ON public.plan_integrations
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Anyone can view active integrations
CREATE POLICY "Anyone can view plan integrations"
  ON public.plan_integrations
  FOR SELECT
  USING (is_active = true);

-- Remove old columns from plans table (after data migration)
ALTER TABLE public.plans 
  DROP COLUMN IF EXISTS stripe_product_id,
  DROP COLUMN IF EXISTS stripe_price_id,
  DROP COLUMN IF EXISTS account_id;

-- Add comment
COMMENT ON TABLE public.plan_integrations IS 'Stores Stripe integrations for plans, supporting both test and production environments';
