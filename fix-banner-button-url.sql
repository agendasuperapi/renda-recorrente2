-- Corrige a URL do botão no template Black Friday para rolar até a seção de planos
UPDATE banner_templates 
SET button_url = '#planos'
WHERE name = 'Black Friday';

-- Corrige outros templates que possam estar usando /plans ou /plan
UPDATE banner_templates 
SET button_url = '#planos'
WHERE button_url IN ('/plans', '/plan');
