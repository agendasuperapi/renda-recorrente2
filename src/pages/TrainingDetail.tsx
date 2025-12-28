import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, BookOpen, Clock, Star, CheckCircle, Lock, PlayCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const TrainingDetail = () => {
  const { trainingId } = useParams();
  const navigate = useNavigate();
  const { userId } = useAuth();

  const { data: training, isLoading: trainingLoading } = useQuery({
    queryKey: ["training-detail", trainingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainings")
        .select(`
          *,
          training_categories(id, name),
          training_ratings(rating)
        `)
        .eq("id", trainingId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!trainingId
  });

  const { data: lessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ["training-lessons", trainingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_lessons")
        .select("*")
        .eq("training_id", trainingId)
        .eq("is_active", true)
        .order("order_position");
      if (error) throw error;
      return data;
    },
    enabled: !!trainingId
  });

  const { data: userProgress } = useQuery({
    queryKey: ["user-lesson-progress", trainingId, userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("training_progress")
        .select("lesson_id, is_completed")
        .eq("user_id", userId)
        .eq("training_id", trainingId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!trainingId
  });

  const isLessonCompleted = (lessonId: string) => {
    return userProgress?.some(p => p.lesson_id === lessonId && p.is_completed) || false;
  };

  const isLessonLocked = (index: number) => {
    if (index === 0) return false;
    const prevLesson = lessons?.[index - 1];
    if (!prevLesson) return false;
    return !isLessonCompleted(prevLesson.id);
  };

  const getProgress = () => {
    if (!lessons || lessons.length === 0) return { completed: 0, total: 0, percentage: 0 };
    const completed = lessons.filter(l => isLessonCompleted(l.id)).length;
    return {
      completed,
      total: lessons.length,
      percentage: Math.round((completed / lessons.length) * 100)
    };
  };

  const getAverageRating = (ratings: any[]) => {
    if (!ratings || ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return (sum / ratings.length).toFixed(1);
  };

  const getFirstUncompletedLesson = () => {
    if (!lessons) return null;
    return lessons.find(l => !isLessonCompleted(l.id));
  };

  const progress = getProgress();

  if (trainingLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!training) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Treinamento não encontrado</p>
        <Button variant="link" onClick={() => navigate("/user/training")}>
          Voltar para Treinamentos
        </Button>
      </div>
    );
  }

  const avgRating = getAverageRating(training.training_ratings as any[]);
  const categoryId = (training.training_categories as any)?.id;
  const categoryName = (training.training_categories as any)?.name;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(categoryId ? `/user/training/category/${categoryId}` : "/user/training")} 
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {categoryName ? `Voltar para ${categoryName}` : "Voltar"}
        </Button>
        
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{training.title}</h1>
            {training.description && (
              <p className="text-muted-foreground mb-4">{training.description}</p>
            )}
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                {lessons?.length || 0} {(lessons?.length || 0) === 1 ? 'aula' : 'aulas'}
              </span>
              {training.estimated_duration_minutes > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {training.estimated_duration_minutes} min
                </span>
              )}
              {Number(avgRating) > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {avgRating}
                </span>
              )}
            </div>
          </div>

          {/* Quick Start Button */}
          {progress.percentage < 100 && (
            <Button asChild size="lg">
              <Link to={`/user/training/lesson/${getFirstUncompletedLesson()?.id || lessons?.[0]?.id}`}>
                <PlayCircle className="h-5 w-5 mr-2" />
                {progress.percentage > 0 ? 'Continuar' : 'Iniciar'}
              </Link>
            </Button>
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="bg-card border rounded-lg p-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Seu Progresso</span>
            <span className="text-sm text-muted-foreground">{progress.completed} de {progress.total} aulas ({progress.percentage}%)</span>
          </div>
          <Progress value={progress.percentage} className="h-2" />
          {progress.percentage === 100 && (
            <div className="flex items-center gap-2 mt-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Treinamento concluído!</span>
            </div>
          )}
        </div>
      </div>

      {/* Lessons List */}
      {lessonsLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : lessons?.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhuma aula disponível neste treinamento</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Aulas</h2>
          {lessons?.map((lesson, index) => {
            const completed = isLessonCompleted(lesson.id);
            const locked = isLessonLocked(index);

            return (
              <Card 
                key={lesson.id} 
                className={`transition-all ${locked ? 'opacity-60' : 'hover:shadow-md cursor-pointer'} ${completed ? 'border-green-500/50' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Lesson Number / Status */}
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 ${
                      completed 
                        ? 'bg-green-500 text-white' 
                        : locked 
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-primary/10 text-primary'
                    }`}>
                      {completed ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : locked ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <span className="font-semibold">{index + 1}</span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{lesson.title}</h3>
                        {completed && (
                          <Badge variant="outline" className="text-green-600 border-green-500">
                            Concluída
                          </Badge>
                        )}
                      </div>
                      {lesson.duration_minutes > 0 && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {lesson.duration_minutes} min
                        </p>
                      )}
                    </div>

                    {/* Action */}
                    <div className="flex-shrink-0">
                      {locked ? (
                        <Button variant="ghost" size="sm" disabled>
                          <Lock className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/user/training/lesson/${lesson.id}`}>
                            <PlayCircle className="h-5 w-5" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TrainingDetail;
