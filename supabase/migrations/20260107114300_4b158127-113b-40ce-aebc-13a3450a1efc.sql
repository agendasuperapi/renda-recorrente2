-- Add banner_text_config column for storing banner text overlay settings
-- This is separate from banner_config which is used for cover/thumbnail

ALTER TABLE public.training_categories 
ADD COLUMN IF NOT EXISTS banner_text_config jsonb;

ALTER TABLE public.trainings 
ADD COLUMN IF NOT EXISTS banner_text_config jsonb;

COMMENT ON COLUMN public.training_categories.banner_text_config IS 'JSON config for banner text overlay (title, subtitle, colors, alignment)';
COMMENT ON COLUMN public.trainings.banner_text_config IS 'JSON config for banner text overlay (title, subtitle, colors, alignment)';