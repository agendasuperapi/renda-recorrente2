-- Create function to get available coupons for affiliates
-- This function bypasses RLS using SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_available_coupons_for_affiliates()
RETURNS TABLE (
  id uuid,
  code text,
  name text,
  description text,
  type coupon_type,
  value integer,
  is_active boolean,
  valid_until timestamp with time zone,
  product_id uuid,
  is_primary boolean,
  max_uses integer,
  current_uses integer,
  created_at timestamp with time zone,
  product_nome text,
  product_icone_light text,
  product_icone_dark text,
  product_site_landingpage text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.code,
    c.name,
    c.description,
    c.type,
    c.value,
    c.is_active,
    c.valid_until,
    c.product_id,
    c.is_primary,
    c.max_uses,
    c.current_uses,
    c.created_at,
    p.nome as product_nome,
    p.icone_light as product_icone_light,
    p.icone_dark as product_icone_dark,
    p.site_landingpage as product_site_landingpage
  FROM coupons c
  LEFT JOIN products p ON p.id = c.product_id
  WHERE c.is_visible_to_affiliates = true
    AND c.is_active = true
    AND (c.valid_until IS NULL OR c.valid_until > NOW())
    AND (c.max_uses IS NULL OR c.current_uses < c.max_uses)
  ORDER BY c.is_primary DESC, c.name ASC;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_available_coupons_for_affiliates() TO authenticated;
