-- ===========================================
-- SISTEMA DE TREINAMENTOS - TABELAS E RLS
-- ===========================================

-- Tabela de Categorias de Treinamento
CREATE TABLE public.training_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'BookOpen',
  cover_image_url TEXT,
  order_position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Treinamentos
CREATE TABLE public.trainings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.training_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  introduction_video_url TEXT,
  order_position INTEGER DEFAULT 0,
  estimated_duration_minutes INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Aulas/Lições
CREATE TABLE public.training_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL DEFAULT 'video', -- 'video', 'text', 'mixed'
  video_url TEXT,
  content_html TEXT,
  order_position INTEGER DEFAULT 0,
  duration_minutes INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Progresso do Usuário
CREATE TABLE public.training_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.training_lessons(id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT false,
  watch_time_seconds INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Tabela de Comentários
CREATE TABLE public.training_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.training_lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  parent_comment_id UUID REFERENCES public.training_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Avaliações
CREATE TABLE public.training_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(training_id, user_id)
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.training_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_ratings ENABLE ROW LEVEL SECURITY;

-- =====================
-- RLS - training_categories
-- =====================
CREATE POLICY "Anyone can view active categories"
ON public.training_categories FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage all categories"
ON public.training_categories FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- =====================
-- RLS - trainings
-- =====================
CREATE POLICY "Anyone can view published trainings"
ON public.trainings FOR SELECT
USING (is_active = true AND is_published = true);

CREATE POLICY "Admins can manage all trainings"
ON public.trainings FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- =====================
-- RLS - training_lessons
-- =====================
CREATE POLICY "Anyone can view active lessons of published trainings"
ON public.training_lessons FOR SELECT
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 FROM public.trainings t 
    WHERE t.id = training_id 
    AND t.is_published = true 
    AND t.is_active = true
  )
);

CREATE POLICY "Admins can manage all lessons"
ON public.training_lessons FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- =====================
-- RLS - training_progress
-- =====================
CREATE POLICY "Users can view own progress"
ON public.training_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own progress"
ON public.training_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
ON public.training_progress FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress"
ON public.training_progress FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- =====================
-- RLS - training_comments
-- =====================
CREATE POLICY "Users can view approved comments"
ON public.training_comments FOR SELECT
USING (is_approved = true);

CREATE POLICY "Users can view own comments"
ON public.training_comments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own comments"
ON public.training_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own unapproved comments"
ON public.training_comments FOR UPDATE
USING (auth.uid() = user_id AND is_approved = false);

CREATE POLICY "Users can delete own unapproved comments"
ON public.training_comments FOR DELETE
USING (auth.uid() = user_id AND is_approved = false);

CREATE POLICY "Admins can manage all comments"
ON public.training_comments FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- =====================
-- RLS - training_ratings
-- =====================
CREATE POLICY "Anyone can view ratings"
ON public.training_ratings FOR SELECT
USING (true);

CREATE POLICY "Users can create own rating"
ON public.training_ratings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rating"
ON public.training_ratings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all ratings"
ON public.training_ratings FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- =====================
-- Triggers para updated_at
-- =====================
CREATE TRIGGER update_training_categories_updated_at
  BEFORE UPDATE ON public.training_categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_trainings_updated_at
  BEFORE UPDATE ON public.trainings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_training_lessons_updated_at
  BEFORE UPDATE ON public.training_lessons
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_training_progress_updated_at
  BEFORE UPDATE ON public.training_progress
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_training_comments_updated_at
  BEFORE UPDATE ON public.training_comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_training_ratings_updated_at
  BEFORE UPDATE ON public.training_ratings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================
-- Índices para performance
-- =====================
CREATE INDEX idx_trainings_category_id ON public.trainings(category_id);
CREATE INDEX idx_training_lessons_training_id ON public.training_lessons(training_id);
CREATE INDEX idx_training_progress_user_id ON public.training_progress(user_id);
CREATE INDEX idx_training_progress_lesson_id ON public.training_progress(lesson_id);
CREATE INDEX idx_training_comments_lesson_id ON public.training_comments(lesson_id);
CREATE INDEX idx_training_comments_user_id ON public.training_comments(user_id);
CREATE INDEX idx_training_ratings_training_id ON public.training_ratings(training_id);

-- =====================
-- View para estatísticas de treinamento
-- =====================
CREATE OR REPLACE VIEW public.view_training_stats AS
SELECT 
  t.id as training_id,
  t.title,
  t.category_id,
  tc.name as category_name,
  COUNT(DISTINCT tl.id) as total_lessons,
  COALESCE(AVG(tr.rating), 0) as average_rating,
  COUNT(DISTINCT tr.id) as total_ratings,
  COUNT(DISTINCT tp.user_id) as total_students
FROM public.trainings t
LEFT JOIN public.training_categories tc ON tc.id = t.category_id
LEFT JOIN public.training_lessons tl ON tl.training_id = t.id AND tl.is_active = true
LEFT JOIN public.training_ratings tr ON tr.training_id = t.id
LEFT JOIN public.training_progress tp ON tp.training_id = t.id
GROUP BY t.id, t.title, t.category_id, tc.name;