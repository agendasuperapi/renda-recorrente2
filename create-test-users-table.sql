-- Criar tabela para gerenciar contador de usuários de teste
CREATE TABLE IF NOT EXISTS public.test_users_counter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  last_number integer NOT NULL DEFAULT 26,
  updated_at timestamp with time zone DEFAULT now()
);

-- Inserir registro inicial se não existir
INSERT INTO public.test_users_counter (last_number)
SELECT 26
WHERE NOT EXISTS (SELECT 1 FROM public.test_users_counter);

-- Habilitar RLS
ALTER TABLE public.test_users_counter ENABLE ROW LEVEL SECURITY;

-- Permitir leitura para usuários autenticados
CREATE POLICY "Anyone can read test counter"
  ON public.test_users_counter
  FOR SELECT
  TO public
  USING (true);

-- Permitir atualização para usuários autenticados
CREATE POLICY "Anyone can update test counter"
  ON public.test_users_counter
  FOR UPDATE
  TO public
  USING (true);

-- Função para incrementar e retornar o próximo número
CREATE OR REPLACE FUNCTION public.get_next_test_number()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_num integer;
BEGIN
  UPDATE public.test_users_counter
  SET last_number = last_number + 1,
      updated_at = now()
  WHERE id = (SELECT id FROM public.test_users_counter LIMIT 1)
  RETURNING last_number INTO next_num;
  
  RETURN next_num;
END;
$$;
