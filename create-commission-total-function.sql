-- Function to calculate total commissions with filters
CREATE OR REPLACE FUNCTION get_commissions_total(
  p_affiliate_id uuid,
  p_product_id uuid DEFAULT NULL,
  p_plan_id uuid DEFAULT NULL,
  p_cliente text DEFAULT NULL,
  p_status commission_status DEFAULT NULL,
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
BEGIN
  SELECT COALESCE(SUM(valor), 0)
  INTO v_total
  FROM view_commissions_daily
  WHERE affiliate_id = p_affiliate_id
    AND (p_product_id IS NULL OR product_id = p_product_id)
    AND (p_plan_id IS NULL OR plan_id = p_plan_id)
    AND (p_cliente IS NULL OR cliente ILIKE '%' || p_cliente || '%')
    AND (p_status IS NULL OR status = p_status)
    AND (p_data_inicio IS NULL OR data >= (p_data_inicio::timestamp))
    AND (p_data_fim IS NULL OR data <= (p_data_fim::timestamp + interval '23 hours 59 minutes 59 seconds'));
  
  RETURN v_total;
END;
$$;
