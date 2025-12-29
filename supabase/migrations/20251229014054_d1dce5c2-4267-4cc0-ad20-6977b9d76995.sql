-- Ensure PostgREST can embed profiles on training_comments.user_id
ALTER TABLE public.training_comments
ADD CONSTRAINT training_comments_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_training_comments_user_id
ON public.training_comments(user_id);