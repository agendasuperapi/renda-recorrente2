-- Ajustar políticas RLS da tabela app_settings para permitir gerenciamento de configurações do sidebar
-- Mantém restrição de super_admin para outras configurações

-- Remove política antiga de gerenciamento
DROP POLICY IF EXISTS "Admins can manage all settings" ON public.app_settings;

-- Política para super_admin gerenciar todas as configurações
CREATE POLICY "Admins can manage all settings"
  ON public.app_settings
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Remove policy antiga de sidebar se existir
DROP POLICY IF EXISTS "Authenticated users can manage sidebar settings" ON public.app_settings;

-- Política para permitir usuários autenticados gerenciarem apenas configurações do sidebar
CREATE POLICY "Authenticated users can manage sidebar settings"
  ON public.app_settings
  FOR ALL
  USING (
    auth.role() = 'authenticated'::text 
    AND key LIKE 'sidebar_%'
  )
  WITH CHECK (
    auth.role() = 'authenticated'::text 
    AND key LIKE 'sidebar_%'
  );

-- Comentário explicativo
COMMENT ON POLICY "Authenticated users can manage sidebar settings" ON public.app_settings IS 
'Permite que usuários autenticados gerenciem configurações do sidebar (chaves começando com sidebar_)';
