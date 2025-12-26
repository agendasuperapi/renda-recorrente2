import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, BookOpen, Clock, Star, Users, CheckCircle, Lock, PlayCircle } from "lucide-react";
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
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="grid gap-4">
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/user/training")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
        {category.description && (
          <p className="text-muted-foreground mb-4">{category.description}</p>
        )}
        
        {/* Progress Bar */}
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progresso na Categoria</span>
            <span className="text-sm text-muted-foreground">{categoryProgress}%</span>
          </div>
          <Progress value={categoryProgress} className="h-2" />
          {categoryProgress === 100 && (
            <div className="flex items-center gap-2 mt-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Categoria concluída!</span>
            </div>
          )}
        </div>
      </div>

      {/* Trainings List */}
      {trainingsLoading ? (
        <div className="grid gap-4">
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
        <div className="grid gap-4">
          {trainings?.map((training, index) => {
            const lessonCount = (training.training_lessons as any[])?.length || 0;
            const progress = getTrainingProgress(training.id, lessonCount);
            const avgRating = getAverageRating(training.training_ratings as any[]);
            const locked = isTrainingLocked(index);
            const isCompleted = progress.percentage === 100;

            return (
              <Card 
                key={training.id} 
                className={`hover:shadow-lg transition-all ${locked ? 'opacity-60' : ''} ${isCompleted ? 'border-green-500/50' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Order Number / Status */}
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0 ${
                      isCompleted 
                        ? 'bg-green-500 text-white' 
                        : locked 
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-primary text-primary-foreground'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : locked ? (
                        <Lock className="h-5 w-5" />
                      ) : (
                        <span className="text-lg font-bold">{index + 1}</span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg truncate">{training.title}</h3>
                        {isCompleted && (
                          <Badge className="bg-green-500">Concluído</Badge>
                        )}
                        {locked && (
                          <Badge variant="secondary">Bloqueado</Badge>
                        )}
                      </div>
                      {training.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {training.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          {lessonCount} {lessonCount === 1 ? 'aula' : 'aulas'}
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
                      {/* Progress bar for in-progress training */}
                      {!locked && progress.percentage > 0 && progress.percentage < 100 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span>{progress.completed} de {lessonCount} aulas</span>
                            <span>{progress.percentage}%</span>
                          </div>
                          <Progress value={progress.percentage} className="h-1.5" />
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    <div className="flex-shrink-0">
                      {locked ? (
                        <Button variant="outline" disabled>
                          <Lock className="h-4 w-4 mr-2" />
                          Bloqueado
                        </Button>
                      ) : (
                        <Button asChild>
                          <Link to={`/user/training/${training.id}`}>
                            <PlayCircle className="h-4 w-4 mr-2" />
                            {progress.percentage > 0 ? 'Continuar' : 'Iniciar'}
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

export default TrainingCategory;
