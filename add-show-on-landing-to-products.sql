-- Add show_on_landing column to products table
ALTER TABLE products 
ADD COLUMN show_on_landing boolean DEFAULT true;

-- Add comment to explain the column
COMMENT ON COLUMN products.show_on_landing IS 'Indica se o produto deve aparecer na landing page de afiliados';
