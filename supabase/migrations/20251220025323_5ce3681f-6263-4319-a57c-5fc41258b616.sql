-- Inserir seções faltantes que não estão no banco
INSERT INTO landing_sections (section_key, section_name, is_active, order_position)
VALUES
  ('painel-afiliado', 'Painel de Afiliado', true, 4),
  ('funcionalidades', 'Funcionalidades', true, 6),
  ('layout-responsivo', 'Layout Responsivo', true, 7),
  ('cupons', 'Cupons de Desconto', true, 8)
ON CONFLICT (section_key) DO NOTHING;

-- Atualizar order_position das seções existentes para manter consistência
UPDATE landing_sections SET order_position = 9 WHERE section_key = 'planos';
UPDATE landing_sections SET order_position = 10 WHERE section_key = 'depoimentos';
UPDATE landing_sections SET order_position = 11 WHERE section_key = 'faq';
UPDATE landing_sections SET order_position = 12 WHERE section_key = 'cta';