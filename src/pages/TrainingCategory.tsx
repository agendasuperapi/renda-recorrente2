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

const TrainingCategory = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { userId } = useAuth();

  const { data: category, isLoading: categoryLoading } = useQuery({
    queryKey: ["training-category", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_categories")
        .select("*")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!categoryId
  });

  const { data: trainings, isLoading: trainingsLoading } = useQuery({
    queryKey: ["trainings-by-category", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainings")
        .select(`
          *,
          training_lessons(id),
          training_ratings(rating)
        `)
        .eq("category_id", categoryId)
        .eq("is_published", true)
        .eq("is_active", true)
        .order("order_position");
      if (error) throw error;
      return data;
    },
    enabled: !!categoryId
  });

  const { data: userProgress } = useQuery({
    queryKey: ["user-training-progress", categoryId, userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("training_progress")
        .select("lesson_id, is_completed, training_id")
        .eq("user_id", userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!categoryId
  });

  const getTrainingProgress = (trainingId: string, lessonCount: number) => {
    if (!userProgress || lessonCount === 0) return { completed: 0, percentage: 0 };
    const completedLessons = userProgress.filter(
      p => p.training_id === trainingId && p.is_completed
    ).length;
    return {
      completed: completedLessons,
      percentage: Math.round((completedLessons / lessonCount) * 100)
    };
  };

  const getAverageRating = (ratings: any[]) => {
    if (!ratings || ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return (sum / ratings.length).toFixed(1);
  };

  const isTrainingLocked = (index: number) => {
    if (index === 0) return false;
    const prevTraining = trainings?.[index - 1];
    if (!prevTraining) return false;
    const lessonCount = (prevTraining.training_lessons as any[])?.length || 0;
    const progress = getTrainingProgress(prevTraining.id, lessonCount);
    return progress.percentage < 100;
  };

  // Calculate overall category progress
  const categoryProgress = (() => {
    if (!trainings || trainings.length === 0) return 0;
    let totalLessons = 0;
    let completedLessons = 0;
    trainings.forEach(t => {
      const lessonCount = (t.training_lessons as any[])?.length || 0;
      totalLessons += lessonCount;
      const progress = getTrainingProgress(t.id, lessonCount);
      completedLessons += progress.completed;
    });
    return totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  })();

  if (categoryLoading) {
    return (
      <div className="space-y-6 -mt-6 -mx-4 sm:-mx-6 lg:-mx-8">
        <Skeleton className="h-[300px] w-full" />
        <div className="px-4 sm:px-6 lg:px-8 space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Categoria não encontrada</p>
        <Button variant="link" onClick={() => navigate("/user/training")}>
          Voltar para Treinamentos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 -mt-6 md:-mt-8 -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Hero Banner */}
      <div className="relative">
        {/* Back Button */}
        <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/user/training")} 
            className="bg-background/20 backdrop-blur-sm hover:bg-background/40"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Ver todos os módulos
          </Button>
        </div>

        <div 
          className="relative w-full bg-cover bg-center aspect-[16/6] sm:aspect-[16/5] lg:aspect-[16/4] xl:aspect-[16/3.5] max-h-[350px]"
          style={{
            backgroundImage: category.banner_url 
              ? `url(${category.banner_url})` 
              : category.cover_image_url 
                ? `url(${category.cover_image_url})`
                : 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.8) 100%)'
          }}
        >
          {/* Overlay from banner_text_config */}
          {category.banner_text_config && (
            <>
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: (category.banner_text_config as any)?.overlayColor || "#000000",
                  opacity: ((category.banner_text_config as any)?.overlayOpacity ?? 0) / 100
                }}
              />
              {((category.banner_text_config as any)?.title || (category.banner_text_config as any)?.subtitle) && (
                <div className={`absolute inset-0 flex flex-col justify-center px-6 md:px-12 ${
                  (category.banner_text_config as any)?.textAlign === "left" ? "items-start text-left" :
                  (category.banner_text_config as any)?.textAlign === "right" ? "items-end text-right" :
                  "items-center text-center"
                }`}>
                  {(category.banner_text_config as any)?.title && (
                    <h2
                      className="text-xl sm:text-2xl md:text-4xl font-bold leading-tight drop-shadow-lg"
                      style={{ color: (category.banner_text_config as any)?.textColor || "#ffffff" }}
                    >
                      {(category.banner_text_config as any).title}
                    </h2>
                  )}
                  {(category.banner_text_config as any)?.subtitle && (
                    <p
                      className="mt-2 text-sm sm:text-base md:text-lg opacity-90 max-w-2xl drop-shadow-md"
                      style={{ color: (category.banner_text_config as any)?.textColor || "#ffffff" }}
                    >
                      {(category.banner_text_config as any).subtitle}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Info Card below banner */}
        <div className="px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-8 lg:-mt-12 relative z-10">
          <Card className="bg-card/95 backdrop-blur-sm border shadow-lg">
            <CardContent className="p-6 md:p-8">
              <h1 className="text-2xl md:text-4xl font-bold mb-2">{category.name}</h1>
              {category.description && (
                <p className="text-muted-foreground max-w-2xl mb-4">{category.description}</p>
              )}
              
              {/* Progress Bar */}
              <div className="max-w-md">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progresso na Categoria</span>
                  <span className="font-medium">{categoryProgress}%</span>
                </div>
                <Progress value={categoryProgress} className="h-2" />
                {categoryProgress === 100 && (
                  <div className="flex items-center gap-2 mt-2 text-green-500">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Categoria concluída!</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 space-y-6">
        <h2 className="text-xl font-bold">Aulas</h2>

        {/* Trainings List */}
        {trainingsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : trainings?.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum treinamento disponível nesta categoria</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trainings?.map((training, index) => {
              const lessonCount = (training.training_lessons as any[])?.length || 0;
              const progress = getTrainingProgress(training.id, lessonCount);
              const avgRating = getAverageRating(training.training_ratings as any[]);
              const locked = isTrainingLocked(index);
              const isCompleted = progress.percentage === 100;

              return (
                <Link
                  key={training.id}
                  to={locked ? '#' : `/user/training/${training.id}`}
                  className={`block group ${locked ? 'cursor-not-allowed' : ''}`}
                  onClick={(e) => locked && e.preventDefault()}
                >
                  <Card 
                    className={`overflow-hidden transition-all ${locked ? 'opacity-60' : 'hover:shadow-xl group-hover:scale-[1.02]'} ${isCompleted ? 'ring-2 ring-green-500' : ''}`}
                  >
                    {/* Large Thumbnail */}
                    <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
                      {training.thumbnail_url ? (
                        <img 
                          src={training.thumbnail_url} 
                          alt={training.title}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PlayCircle className="h-16 w-16 text-primary/40" />
                        </div>
                      )}
                      
                      {/* Overlay from banner_text_config */}
                      {training.banner_text_config && (
                        <>
                          <div
                            className="absolute inset-0 z-[5]"
                            style={{
                              backgroundColor: (training.banner_text_config as any)?.overlayColor || "#000000",
                              opacity: ((training.banner_text_config as any)?.overlayOpacity ?? 0) / 100
                            }}
                          />
                          {((training.banner_text_config as any)?.title || (training.banner_text_config as any)?.subtitle) && (
                            <div
                              className={`absolute inset-0 z-10 flex flex-col justify-center px-4 ${
                                (training.banner_text_config as any)?.textAlign === "left" ? "items-start text-left" :
                                (training.banner_text_config as any)?.textAlign === "right" ? "items-end text-right" :
                                "items-center text-center"
                              }`}
                            >
                              {(training.banner_text_config as any)?.title && (
                                <h4
                                  className="text-sm sm:text-base md:text-lg font-bold leading-tight drop-shadow-md"
                                  style={{ color: (training.banner_text_config as any)?.textColor || "#ffffff" }}
                                >
                                  {(training.banner_text_config as any).title}
                                </h4>
                              )}
                              {(training.banner_text_config as any)?.subtitle && (
                                <p
                                  className="mt-1 text-xs sm:text-sm opacity-90 line-clamp-2 drop-shadow-md"
                                  style={{ color: (training.banner_text_config as any)?.textColor || "#ffffff" }}
                                >
                                  {(training.banner_text_config as any).subtitle}
                                </p>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {/* Status overlay */}
                      {(locked || isCompleted) && (
                        <>
                          <div
                            className={`absolute inset-0 z-[6] ${isCompleted ? 'bg-green-500/10' : 'bg-black/25'}`}
                          />
                          <div className="absolute top-3 left-3 z-20">
                            {isCompleted ? (
                              <CheckCircle className="h-8 w-8 text-green-500" />
                            ) : (
                              <Lock className="h-7 w-7 text-white" />
                            )}
                          </div>
                        </>
                      )}

                      {/* Completed badge */}
                      {isCompleted && (
                        <Badge className="absolute top-3 right-3 bg-green-500 gap-1 z-10">
                          <CheckCircle className="h-3 w-3" />
                          Concluído
                        </Badge>
                      )}

                      {/* Locked badge */}
                      {locked && (
                        <Badge variant="secondary" className="absolute top-3 right-3 z-10">
                          Bloqueado
                        </Badge>
                      )}
                    </div>

                    <CardContent className="p-5">
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-2">
                        {training.title}
                      </h3>
                      
                      {training.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                          {training.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-3">
                        <Badge variant="outline" className="gap-1">
                          <BookOpen className="h-3.5 w-3.5" />
                          Aulas
                          <span className="font-semibold">{lessonCount}</span>
                        </Badge>
                        
                        {training.estimated_duration_minutes > 0 && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {training.estimated_duration_minutes} min
                          </span>
                        )}
                        
                        {Number(avgRating) > 0 && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            {avgRating}
                          </span>
                        )}
                      </div>

                      {/* Progress bar for in-progress training */}
                      {!locked && progress.percentage > 0 && progress.percentage < 100 && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>{progress.completed} de {lessonCount} aulas</span>
                            <span>{progress.percentage}%</span>
                          </div>
                          <Progress value={progress.percentage} className="h-1.5" />
                        </div>
                      )}
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

export default TrainingCategory;