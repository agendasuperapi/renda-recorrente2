import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, FolderOpen, BookOpen, CheckCircle, ChevronRight, Clock, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Training = () => {
  const { userId } = useAuth();

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["training-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_categories")
        .select("*")
        .eq("is_active", true)
        .order("order_position");
      if (error) throw error;
      return data;
    }
  });

  // Fetch all trainings with stats
  const { data: trainings } = useQuery({
    queryKey: ["trainings-with-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainings")
        .select(`
          id,
          category_id,
          training_lessons(id)
        `)
        .eq("is_published", true)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    }
  });

  // Fetch user progress
  const { data: userProgress } = useQuery({
    queryKey: ["user-all-progress", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("training_progress")
        .select("lesson_id, is_completed, training_id")
        .eq("user_id", userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId
  });

  // Calculate category stats
  const getCategoryStats = (categoryId: string) => {
    const categoryTrainings = trainings?.filter(t => t.category_id === categoryId) || [];
    const totalTrainings = categoryTrainings.length;
    let totalLessons = 0;
    let completedLessons = 0;

    categoryTrainings.forEach(training => {
      const lessonCount = (training.training_lessons as any[])?.length || 0;
      totalLessons += lessonCount;
      
      const trainingProgress = userProgress?.filter(
        p => p.training_id === training.id && p.is_completed
      ).length || 0;
      completedLessons += trainingProgress;
    });

    const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return { totalTrainings, totalLessons, completedLessons, percentage };
  };

  // Calculate overall progress
  const overallProgress = (() => {
    if (!trainings || trainings.length === 0) return 0;
    let totalLessons = 0;
    let completedLessons = 0;

    trainings.forEach(training => {
      const lessonCount = (training.training_lessons as any[])?.length || 0;
      totalLessons += lessonCount;
      
      const trainingProgress = userProgress?.filter(
        p => p.training_id === training.id && p.is_completed
      ).length || 0;
      completedLessons += trainingProgress;
    });

    return totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Treinamentos</h1>
        <p className="text-muted-foreground">
          Aprenda tudo sobre o programa de afiliados
        </p>
      </div>

      {/* Overall Progress Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary/20 rounded-full">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Seu Progresso Geral</h2>
              <p className="text-sm text-muted-foreground">
                {overallProgress === 100 
                  ? "Parabéns! Você completou todos os treinamentos!" 
                  : "Continue aprendendo para desbloquear todo o conteúdo"}
              </p>
            </div>
            {overallProgress === 100 && (
              <Badge className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completo
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso</span>
              <span className="font-medium">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Categories Grid */}
      {categoriesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : categories?.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum treinamento disponível</h3>
            <p className="text-muted-foreground">
              Os treinamentos estarão disponíveis em breve!
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories?.map((category) => {
            const stats = getCategoryStats(category.id);
            const isCompleted = stats.percentage === 100;
            
            return (
              <Link 
                key={category.id} 
                to={`/user/training/category/${category.id}`}
                className="block"
              >
                <Card className={`h-full hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer ${
                  isCompleted ? 'border-green-500/50 bg-green-500/5' : ''
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          isCompleted ? 'bg-green-500/20' : 'bg-primary/10'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="h-6 w-6 text-green-500" />
                          ) : (
                            <FolderOpen className="h-6 w-6 text-primary" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                          {stats.totalTrainings > 0 && (
                            <p className="text-sm text-muted-foreground">
                              {stats.totalTrainings} {stats.totalTrainings === 1 ? 'treinamento' : 'treinamentos'}
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {category.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {category.description}
                      </p>
                    )}
                    
                    {stats.totalLessons > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {stats.completedLessons} de {stats.totalLessons} aulas
                          </span>
                          <span className={`font-medium ${isCompleted ? 'text-green-500' : ''}`}>
                            {stats.percentage}%
                          </span>
                        </div>
                        <Progress 
                          value={stats.percentage} 
                          className={`h-2 ${isCompleted ? '[&>div]:bg-green-500' : ''}`} 
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Help Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Precisa de Ajuda?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Entre em contato com nosso suporte para tirar dúvidas ou agendar
            uma sessão de treinamento personalizada.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Training;
