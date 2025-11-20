-- Remove product_id from landing_testimonials table
ALTER TABLE public.landing_testimonials 
DROP COLUMN IF EXISTS product_id;

-- Remove product_id from landing_faqs table
ALTER TABLE public.landing_faqs 
DROP COLUMN IF EXISTS product_id;
