-- Remove the old generate_commission_from_payment function and trigger
-- Commissions will now be generated only from unified_payments via generate_commission_from_unified_payment

-- Drop the trigger first
DROP TRIGGER IF EXISTS tr_generate_commission_after_payment ON public.payments;

-- Drop the function
DROP FUNCTION IF EXISTS public.generate_commission_from_payment();

-- Add comment explaining the new flow
COMMENT ON FUNCTION public.generate_commission_from_unified_payment() IS 
  'Gera comissões automaticamente quando um pagamento unificado é inserido. Todos os pagamentos (locais e externos) passam pela tabela unified_payments antes de gerar comissões.';