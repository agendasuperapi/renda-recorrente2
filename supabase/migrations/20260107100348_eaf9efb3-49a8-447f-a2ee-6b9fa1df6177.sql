-- Add banner_config column to training_categories
ALTER TABLE public.training_categories
ADD COLUMN IF NOT EXISTS banner_config jsonb;

COMMENT ON COLUMN public.training_categories.banner_config IS 'Configuration for banner overlay: title, subtitle, textColor, textAlign, overlayColor, overlayOpacity';

-- Add banner_config column to trainings
ALTER TABLE public.trainings
ADD COLUMN IF NOT EXISTS banner_config jsonb;

COMMENT ON COLUMN public.trainings.banner_config IS 'Configuration for banner overlay: title, subtitle, textColor, textAlign, overlayColor, overlayOpacity';

-- Add banner_config column to training_lessons
ALTER TABLE public.training_lessons
ADD COLUMN IF NOT EXISTS banner_config jsonb;

COMMENT ON COLUMN public.training_lessons.banner_config IS 'Configuration for thumbnail overlay: title, subtitle, textColor, textAlign, overlayColor, overlayOpacity';