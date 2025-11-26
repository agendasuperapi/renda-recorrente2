-- Add foreign key constraints to payments table
-- This allows PostgREST to perform joins automatically

ALTER TABLE public.payments
  ADD CONSTRAINT payments_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_plan_id_fkey 
  FOREIGN KEY (plan_id) 
  REFERENCES public.plans(id) 
  ON DELETE SET NULL;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_subscription_id_fkey 
  FOREIGN KEY (subscription_id) 
  REFERENCES public.subscriptions(id) 
  ON DELETE SET NULL;
