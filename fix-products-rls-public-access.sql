-- Permitir acesso público à tabela products (especialmente para a descrição na página de autenticação)
-- Esta migração garante que qualquer pessoa (mesmo não autenticada) possa visualizar os produtos

-- Remover a política antiga se existir
DROP POLICY IF EXISTS "Anyone authenticated can view products" ON public.products;

-- Criar nova política que permite acesso público (sem necessidade de autenticação)
CREATE POLICY "Public can view products"
  ON public.products FOR SELECT
  USING (true);

-- Comentário explicativo
COMMENT ON POLICY "Public can view products" ON public.products IS 
'Permite que qualquer pessoa (autenticada ou não) visualize os produtos. Necessário para exibir informações na página de autenticação.';
