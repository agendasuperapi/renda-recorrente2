-- Add parent_id column for comment replies
ALTER TABLE public.training_comments
ADD COLUMN parent_id uuid REFERENCES public.training_comments(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_training_comments_parent_id
ON public.training_comments(parent_id);