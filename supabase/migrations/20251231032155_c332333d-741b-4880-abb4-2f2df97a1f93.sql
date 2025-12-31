-- Insert training page cover settings
INSERT INTO app_settings (key, value, description)
VALUES 
  ('training_page_cover_url', '', 'URL da imagem de capa da página principal de treinamentos'),
  ('training_page_banner_url', '', 'URL da imagem de banner da página principal de treinamentos')
ON CONFLICT (key) DO NOTHING;