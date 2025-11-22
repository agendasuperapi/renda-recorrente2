-- Corrige a URL do botão no template Black Friday para apontar para a rota correta
UPDATE banner_templates 
SET button_url = '/plan'
WHERE name = 'Black Friday' AND button_url = '/plans';

-- Corrige outros templates que possam estar usando /plans
UPDATE banner_templates 
SET button_url = '/plan'
WHERE button_url = '/plans';
