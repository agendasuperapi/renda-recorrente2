-- Função para gerar comissão a partir de pagamentos unificados
CREATE OR REPLACE FUNCTION public.generate_commission_from_unified_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_commission_percentage INTEGER;
  v_affiliate_id UUID;
  v_commission_amount NUMERIC;
BEGIN
  -- Buscar percentual de comissão do plano
  SELECT commission_percentage INTO v_plan_commission_percentage
  FROM public.plans WHERE id = NEW.plan_id;
  
  -- Se não encontrou plano ou percentual é 0, não gera comissão
  IF v_plan_commission_percentage IS NULL OR v_plan_commission_percentage = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Buscar o affiliate_id do usuário unificado
  SELECT affiliate_id INTO v_affiliate_id
  FROM public.unified_users
  WHERE id = NEW.unified_user_id;
  
  -- Se não tem affiliate_id, não gera comissão
  IF v_affiliate_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Se encontrou afiliado, criar comissão
  IF v_affiliate_id IS NOT NULL THEN
    v_commission_amount := (NEW.amount * v_plan_commission_percentage) / 100;
    
    INSERT INTO public.commissions (
      affiliate_id,
      subscription_id,
      amount,
      percentage,
      commission_type,
      status,
      reference_month,
      notes
    ) VALUES (
      v_affiliate_id,
      NULL, -- subscription_id é NULL pois pode ser de outro banco
      v_commission_amount,
      v_plan_commission_percentage,
      CASE 
        WHEN NEW.billing_reason = 'subscription_create' THEN 'primeira_venda'
        ELSE 'renovacao'
      END,
      'pending',
      DATE_TRUNC('month', NEW.payment_date)::DATE,
      'Comissão gerada de pagamento unificado - Produto: ' || 
      (SELECT nome FROM public.products WHERE id = NEW.product_id) || 
      ' - Invoice: ' || COALESCE(NEW.stripe_invoice_id, 'N/A')
    );
    
    -- Log da comissão gerada
    RAISE NOTICE 'Comissão gerada: Afiliado %, Valor %, Produto %', 
      v_affiliate_id, v_commission_amount, NEW.product_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para gerar comissão automaticamente
DROP TRIGGER IF EXISTS tr_generate_commission_from_unified_payment ON public.unified_payments;

CREATE TRIGGER tr_generate_commission_from_unified_payment
  AFTER INSERT ON public.unified_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_commission_from_unified_payment();

COMMENT ON FUNCTION public.generate_commission_from_unified_payment() IS 
  'Gera comissões automaticamente quando um pagamento unificado é inserido, baseado no referrer_code do usuário';
