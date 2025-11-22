-- Permitir acesso público à tabela plan_features para visualização
-- Necessário para que a landing page mostre corretamente quais features estão incluídas em cada plano

-- Criar política que permite acesso público de leitura
CREATE POLICY "Anyone can view plan features"
  ON public.plan_features FOR SELECT
  USING (true);

-- Comentário explicativo
COMMENT ON POLICY "Anyone can view plan features" ON public.plan_features IS 
'Permite que qualquer pessoa (autenticada ou não) visualize as features associadas aos planos. Necessário para exibir corretamente as funcionalidades na landing page.';
