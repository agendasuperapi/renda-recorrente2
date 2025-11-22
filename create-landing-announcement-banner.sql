-- Create landing_announcement_banner table for managing promotional banners
CREATE TABLE IF NOT EXISTS landing_announcement_banner (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  background_color TEXT DEFAULT '#10b981',
  text_color TEXT DEFAULT '#ffffff',
  button_text TEXT,
  button_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE landing_announcement_banner ENABLE ROW LEVEL SECURITY;

-- Policy to allow public to read active banners
CREATE POLICY "Allow public to read active banners"
  ON landing_announcement_banner
  FOR SELECT
  USING (is_active = true);

-- Policy to allow authenticated users to read all banners
CREATE POLICY "Allow authenticated users to read all banners"
  ON landing_announcement_banner
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy to allow authenticated users to insert banners
CREATE POLICY "Allow authenticated users to insert banners"
  ON landing_announcement_banner
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy to allow authenticated users to update banners
CREATE POLICY "Allow authenticated users to update banners"
  ON landing_announcement_banner
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy to allow authenticated users to delete banners
CREATE POLICY "Allow authenticated users to delete banners"
  ON landing_announcement_banner
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert default banner
INSERT INTO landing_announcement_banner (text, background_color, text_color, button_text, button_url, is_active)
VALUES (
  '⚡ BLACK ZEN ⚡  Plano Anual com 50% Desconto  APROVEITAR AGORA! 🔥',
  '#10b981',
  '#ffffff',
  'APROVEITAR AGORA!',
  '#planos',
  true
);
