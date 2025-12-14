-- Update trigger function to use product_commission_levels instead of removed commission_percentage column
CREATE OR REPLACE FUNCTION public.generate_commission_from_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
  v_affiliate_id UUID;
  v_affiliate_plan_type TEXT;
  v_commission_percentage INTEGER;
  v_commission_amount NUMERIC;
  v_referrer_affiliate_code TEXT;
BEGIN
  -- Get product_id from the plan
  SELECT product_id INTO v_product_id
  FROM public.plans 
  WHERE id = NEW.plan_id;
  
  -- If no plan or product found, skip commission
  IF v_product_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get referrer_code from the user who paid
  SELECT referrer_code INTO v_referrer_affiliate_code
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- If no referrer_code, no affiliate to receive commission
  IF v_referrer_affiliate_code IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get the affiliate ID (user who owns the affiliate_code equal to referrer_code)
  SELECT id INTO v_affiliate_id
  FROM public.profiles
  WHERE affiliate_code = v_referrer_affiliate_code;
  
  -- If no affiliate found, skip
  IF v_affiliate_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Determine affiliate's plan type (FREE or PRO) based on their active subscription
  SELECT 
    CASE WHEN p.is_free = true THEN 'FREE' ELSE 'PRO' END
  INTO v_affiliate_plan_type
  FROM public.subscriptions s
  JOIN public.plans p ON s.plan_id = p.id
  WHERE s.user_id = v_affiliate_id 
    AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  -- Default to FREE if no active subscription
  IF v_affiliate_plan_type IS NULL THEN
    v_affiliate_plan_type := 'FREE';
  END IF;
  
  -- Get commission percentage from product_commission_levels
  SELECT percentage INTO v_commission_percentage
  FROM public.product_commission_levels
  WHERE product_id = v_product_id
    AND plan_type = v_affiliate_plan_type
    AND level = 1
    AND is_active = true;
  
  -- If no commission percentage found or is 0, skip
  IF v_commission_percentage IS NULL OR v_commission_percentage = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Calculate commission amount
  v_commission_amount := (NEW.amount * v_commission_percentage) / 100;
  
  -- Insert commission record
  INSERT INTO public.commissions (
    affiliate_id,
    subscription_id,
    product_id,
    amount,
    percentage,
    commission_type,
    status,
    level,
    reference_month,
    notes
  ) VALUES (
    v_affiliate_id,
    NEW.subscription_id,
    v_product_id,
    v_commission_amount,
    v_commission_percentage,
    CASE 
      WHEN NEW.billing_reason = 'subscription_create' THEN 'primeira_venda'
      ELSE 'renovacao'
    END,
    'pending',
    1,
    DATE_TRUNC('month', NEW.payment_date)::DATE,
    'Comissão gerada automaticamente via pagamento #' || NEW.stripe_invoice_id
  );
  
  RAISE NOTICE 'Comissão criada: R$ % para afiliado % (referrer_code: %)', 
    v_commission_amount, v_affiliate_id, v_referrer_affiliate_code;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;