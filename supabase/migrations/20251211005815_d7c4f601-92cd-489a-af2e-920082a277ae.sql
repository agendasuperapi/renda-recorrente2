-- Add API fields to products table for external plan synchronization
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS api_url TEXT,
ADD COLUMN IF NOT EXISTS api_key TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.products.api_url IS 'URL da API externa para importar planos do produto';
COMMENT ON COLUMN public.products.api_key IS 'Chave de autenticação da API externa';