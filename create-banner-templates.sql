-- Cria tabela de templates de banners
CREATE TABLE IF NOT EXISTS banner_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  text text NOT NULL,
  subtitle text DEFAULT '',
  background_color text DEFAULT '#10b981',
  text_color text DEFAULT '#ffffff',
  button_text text,
  button_url text,
  preview_image_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS policies
ALTER TABLE banner_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage banner templates"
  ON banner_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

CREATE POLICY "Anyone can view active templates"
  ON banner_templates
  FOR SELECT
  USING (is_active = true);

-- Insere templates padrão
INSERT INTO banner_templates (name, description, text, subtitle, background_color, text_color, button_text, button_url) VALUES
(
  'Black Friday',
  'Template para promoções de Black Friday',
  '<p>⚡ <strong>BLACK FRIDAY</strong> ⚡ Plano Anual com <span style="color: rgb(239, 68, 68);">50% de Desconto</span></p>',
  '<p>🔥 Oferta por tempo limitado! <strong>Economize mais</strong> organizando suas finanças.</p>',
  '#000000',
  '#ffffff',
  'Aproveitar Oferta',
  '/plans'
),
(
  'Lançamento de Produto',
  'Template para anunciar novos produtos',
  '<p>🚀 <strong>NOVIDADE!</strong> Conheça nosso <span class="ql-size-large">novo produto</span></p>',
  '<p>✨ Revolucione sua forma de trabalhar com nossa mais nova solução</p>',
  '#8b5cf6',
  '#ffffff',
  'Saiba Mais',
  '/products'
),
(
  'Desconto Progressivo',
  'Template para descontos por tempo limitado',
  '<p><span class="ql-size-large"><strong>DESCONTO PROGRESSIVO</strong></span> 🎯</p>',
  '<p>Quanto <strong>mais rápido</strong> você decidir, <span style="color: rgb(34, 197, 94);">maior o desconto</span>! ⏰</p>',
  '#10b981',
  '#ffffff',
  'Ver Descontos',
  '/plans'
),
(
  'Frete Grátis',
  'Template para promoção de frete grátis',
  '<p>📦 <strong>FRETE GRÁTIS</strong> em <span style="color: rgb(251, 191, 36);">TODAS</span> as compras acima de R$ 100</p>',
  '<p>💰 Economize ainda mais nas suas compras!</p>',
  '#3b82f6',
  '#ffffff',
  'Comprar Agora',
  '/shop'
),
(
  'Webinar Gratuito',
  'Template para divulgar webinars e eventos',
  '<p>🎓 <strong>WEBINAR GRATUITO</strong> - Aprenda as melhores estratégias</p>',
  '<p>📅 <em>Inscreva-se agora</em> e garanta sua vaga! Vagas limitadas.</p>',
  '#f59e0b',
  '#ffffff',
  'Inscrever-se Grátis',
  '/webinar'
),
(
  'Teste Grátis',
  'Template para oferta de teste gratuito',
  '<p><span class="ql-size-large">🎁 <strong>7 DIAS GRÁTIS</strong></span></p>',
  '<p>Experimente <em>sem compromisso</em> e veja os resultados! 🚀</p>',
  '#ec4899',
  '#ffffff',
  'Começar Teste',
  '/trial'
);
