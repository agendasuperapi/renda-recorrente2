-- Create a security definer function to validate coupons
-- This prevents exposing all coupons via direct table queries
-- Searches both coupons.code and affiliate_coupons.custom_code
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_coupon_code text,
  p_product_id uuid
)
RETURNS TABLE (
  coupon_id uuid,
  code text,
  name text,
  description text,
  type public.coupon_type,
  value integer,
  is_active boolean,
  valid_until timestamp with time zone,
  product_id uuid,
  affiliate_coupon_id uuid,
  affiliate_id uuid,
  affiliate_name text,
  affiliate_email text,
  affiliate_phone text,
  custom_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First, try to find in coupons table by code
  RETURN QUERY
  SELECT 
    c.id as coupon_id,
    c.code,
    c.name,
    c.description,
    c.type,
    c.value,
    c.is_active,
    c.valid_until,
    c.product_id,
    NULL::uuid as affiliate_coupon_id,
    prof.id as affiliate_id,
    prof.name as affiliate_name,
    prof.email as affiliate_email,
    prof.phone as affiliate_phone,
    NULL::text as custom_code
  FROM public.coupons c
  LEFT JOIN public.profiles prof ON c.created_by = prof.id
  WHERE 
    c.code = UPPER(p_coupon_code)
    AND c.product_id = p_product_id
    AND c.is_active = true
    AND (c.valid_until IS NULL OR c.valid_until > NOW())
    AND (c.max_uses IS NULL OR c.current_uses < c.max_uses)
  LIMIT 1;

  -- If no result, try to find in affiliate_coupons by custom_code
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      c.id as coupon_id,
      c.code,
      c.name,
      c.description,
      c.type,
      c.value,
      c.is_active,
      c.valid_until,
      c.product_id,
      ac.id as affiliate_coupon_id,
      prof.id as affiliate_id,
      prof.name as affiliate_name,
      prof.email as affiliate_email,
      prof.phone as affiliate_phone,
      ac.custom_code
    FROM public.affiliate_coupons ac
    INNER JOIN public.coupons c ON ac.coupon_id = c.id
    INNER JOIN public.profiles prof ON ac.affiliate_id = prof.id
    WHERE 
      ac.custom_code = UPPER(p_coupon_code)
      AND ac.product_id = p_product_id
      AND ac.is_active = true
      AND c.is_active = true
      AND (c.valid_until IS NULL OR c.valid_until > NOW())
      AND (c.max_uses IS NULL OR c.current_uses < c.max_uses)
    LIMIT 1;
  END IF;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, uuid) TO anon;

-- Add comment
COMMENT ON FUNCTION public.validate_coupon IS 'Validates a coupon code for a specific product. Searches both coupons.code and affiliate_coupons.custom_code. Returns coupon details if valid, empty result if not. Security definer to prevent exposing all coupons via RLS bypass.';
