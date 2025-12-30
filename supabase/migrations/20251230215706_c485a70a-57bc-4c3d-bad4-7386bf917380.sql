-- Add thumbnail_url to training_lessons
ALTER TABLE public.training_lessons ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add banner_url to training_categories (for hero banner)
ALTER TABLE public.training_categories ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Add banner_url to trainings (for hero banner)  
ALTER TABLE public.trainings ADD COLUMN IF NOT EXISTS banner_url TEXT;