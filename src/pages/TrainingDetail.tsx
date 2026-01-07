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
          training_categories(id, name, banner_url, cover_image_url),
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
      <div className="space-y-6 -mt-6 -mx-4 sm:-mx-6 lg:-mx-8">
        <Skeleton className="h-[250px] w-full" />
        <div className="px-4 sm:px-6 lg:px-8 space-y-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
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
  const categoryBanner = (training.training_categories as any)?.banner_url || (training.training_categories as any)?.cover_image_url;

  // Use training banner, or fallback to category banner
  const bannerImage = training.banner_url || training.thumbnail_url || categoryBanner;

  return (
    <div className="space-y-6 -mt-6 md:-mt-8 -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Hero Banner */}
      <div className="relative">
        {/* Back Button */}
        <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(categoryId ? `/user/training/category/${categoryId}` : "/user/training")} 
            className="bg-background/20 backdrop-blur-sm hover:bg-background/40"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {categoryName ? `Voltar para ${categoryName}` : "Voltar"}
          </Button>
        </div>

        <div 
          className="relative w-full bg-cover bg-center aspect-[16/6] sm:aspect-[16/5] lg:aspect-[16/4] xl:aspect-[16/3.5] max-h-[350px]"
          style={{
            backgroundImage: bannerImage 
              ? `url(${bannerImage})` 
              : 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.8) 100%)'
          }}
        />
        
        {/* Info Card below banner */}
        <div className="px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
          <Card className="bg-card/95 backdrop-blur-sm border shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl md:text-4xl font-bold mb-2">{training.title}</h1>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
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
                  
                  {/* Progress Bar */}
                  <div className="max-w-md">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Seu Progresso</span>
                      <span className="font-medium">{progress.completed} de {progress.total} aulas ({progress.percentage}%)</span>
                    </div>
                    <Progress value={progress.percentage} className="h-2" />
                    {progress.percentage === 100 && (
                      <div className="flex items-center gap-2 mt-2 text-green-500">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Treinamento concluído!</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Start Button */}
                {progress.percentage < 100 && (
                  <Button asChild size="lg" className="md:self-start">
                    <Link to={`/user/training/lesson/${getFirstUncompletedLesson()?.id || lessons?.[0]?.id}`}>
                      <PlayCircle className="h-5 w-5 mr-2" />
                      {progress.percentage > 0 ? 'Continuar' : 'Iniciar'}
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 space-y-6">
        {training.description && (
          <p className="text-muted-foreground">{training.description}</p>
        )}

        <h2 className="text-xl font-bold">Aulas</h2>

        {/* Lessons List */}
        {lessonsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : lessons?.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma aula disponível neste treinamento</p>
          </div>
        ) : (
          <div className="space-y-6">
            {lessons?.map((lesson, index) => {
              const completed = isLessonCompleted(lesson.id);
              const locked = isLessonLocked(index);

              return (
                <Link
                  key={lesson.id}
                  to={locked ? '#' : `/user/training/lesson/${lesson.id}`}
                  className={locked ? 'cursor-not-allowed' : ''}
                  onClick={(e) => locked && e.preventDefault()}
                >
                  <Card 
                    className={`overflow-hidden transition-all ${locked ? 'opacity-60' : 'hover:shadow-md'} ${completed ? 'border-green-500/50' : ''}`}
                  >
                    <CardContent className="p-0">
                      <div className="flex items-stretch">
                        {/* Thumbnail */}
                        <div className="w-32 md:w-44 flex-shrink-0 relative">
                          {lesson.thumbnail_url ? (
                            <img 
                              src={lesson.thumbnail_url} 
                              alt={lesson.title}
                              className="w-full h-full object-cover min-h-[90px]"
                            />
                          ) : (
                            <div className="w-full h-full min-h-[90px] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                              <PlayCircle className="h-10 w-10 text-primary/50" />
                            </div>
                          )}
                          {/* Overlay for status */}
                          {(locked || completed) && (
                            <div className={`absolute inset-0 flex items-center justify-center ${completed ? 'bg-green-500/20' : 'bg-black/50'}`}>
                              {completed ? (
                                <CheckCircle className="h-6 w-6 text-green-500" />
                              ) : (
                                <Lock className="h-5 w-5 text-white" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-4 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{lesson.title}</h3>
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
                          
                          {!locked && (
                            <PlayCircle className="h-6 w-6 text-primary flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainingDetail;