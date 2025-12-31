import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, FolderOpen, CheckCircle, ChevronRight, PlayCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
const Training = () => {
  const {
    userId
  } = useAuth();

  // Fetch training page settings
  const {
    data: pageSettings
  } = useQuery({
    queryKey: ["training-page-settings"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("app_settings").select("*").in("key", ["training_page_cover_url", "training_page_banner_url"]);
      if (error) throw error;
      return data;
    }
  });

  // Fetch categories
  const {
    data: categories,
    isLoading: categoriesLoading
  } = useQuery({
    queryKey: ["training-categories"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("training_categories").select("*").eq("is_active", true).order("order_position");
      if (error) throw error;
      return data;
    }
  });

  // Fetch all trainings with stats
  const {
    data: trainings
  } = useQuery({
    queryKey: ["trainings-with-stats"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("trainings").select(`
          id,
          category_id,
          title,
          thumbnail_url,
          training_lessons(id)
        `).eq("is_published", true).eq("is_active", true);
      if (error) throw error;
      return data;
    }
  });

  // Fetch user progress
  const {
    data: userProgress
  } = useQuery({
    queryKey: ["user-all-progress", userId],
    queryFn: async () => {
      if (!userId) return [];
      const {
        data,
        error
      } = await supabase.from("training_progress").select("lesson_id, is_completed, training_id").eq("user_id", userId);
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
      const trainingProgress = userProgress?.filter(p => p.training_id === training.id && p.is_completed).length || 0;
      completedLessons += trainingProgress;
    });
    const percentage = totalLessons > 0 ? Math.round(completedLessons / totalLessons * 100) : 0;
    return {
      totalTrainings,
      totalLessons,
      completedLessons,
      percentage
    };
  };

  // Get trainings for carousel
  const getCategoryTrainings = (categoryId: string) => {
    return trainings?.filter(t => t.category_id === categoryId) || [];
  };

  // Calculate overall progress
  const overallProgress = (() => {
    if (!trainings || trainings.length === 0) return 0;
    let totalLessons = 0;
    let completedLessons = 0;
    trainings.forEach(training => {
      const lessonCount = (training.training_lessons as any[])?.length || 0;
      totalLessons += lessonCount;
      const trainingProgress = userProgress?.filter(p => p.training_id === training.id && p.is_completed).length || 0;
      completedLessons += trainingProgress;
    });
    return totalLessons > 0 ? Math.round(completedLessons / totalLessons * 100) : 0;
  })();

  // Get first category for hero banner
  const firstCategory = categories?.[0];

  // Get page banner/cover from settings
  const pageBannerUrl = pageSettings?.find(s => s.key === "training_page_banner_url")?.value;
  const pageCoverUrl = pageSettings?.find(s => s.key === "training_page_cover_url")?.value;

  // Determine which image to use for the hero
  const heroBackgroundImage = pageBannerUrl ? `url(${pageBannerUrl})` : pageCoverUrl ? `url(${pageCoverUrl})` : firstCategory?.banner_url ? `url(${firstCategory.banner_url})` : firstCategory?.cover_image_url ? `url(${firstCategory.cover_image_url})` : 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.8) 100%)';
  return <div className="space-y-8 -mt-6 -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Hero Banner */}
      {firstCategory && <>
        <div className="relative h-[200px] md:h-[280px] bg-cover bg-center" style={{
          backgroundImage: heroBackgroundImage
        }}>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>
        
        {/* Info Card below banner */}
        <div className="px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
          <Card className="p-6 md:p-8 bg-card/95 backdrop-blur-sm border">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary/20 rounded-full">
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-4xl font-bold text-foreground">Treinamentos</h1>
                <p className="text-muted-foreground">Aprenda tudo sobre o programa de afiliados</p>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="max-w-md">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-foreground/80">Seu progresso geral</span>
                <span className="font-medium text-foreground">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>
          </Card>
        </div>
      </>}

      <div className="px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Categories Grid */}
        {categoriesLoading ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div> : categories?.length === 0 ? <Card className="p-12">
            <div className="text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum treinamento disponível</h3>
              <p className="text-muted-foreground">
                Os treinamentos estarão disponíveis em breve!
              </p>
            </div>
          </Card> : categories?.map(category => {
        const stats = getCategoryStats(category.id);
        const isCompleted = stats.percentage === 100;
        const categoryTrainings = getCategoryTrainings(category.id);
        return <div key={category.id} className="space-y-4">
                {/* Category Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl md:text-2xl font-bold">{category.name}</h2>
                    {isCompleted && <Badge className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completo
                      </Badge>}
                  </div>
                  <Link to={`/user/training/category/${category.id}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                    Ver todos
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>

                {/* Trainings Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {categoryTrainings.map(training => <Link key={training.id} to={`/user/training/${training.id}`} className="group">
                      <Card className="overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] h-full">
                        {/* Thumbnail */}
                        <div className="aspect-video relative bg-muted">
                          {training.thumbnail_url ? <img src={training.thumbnail_url} alt={training.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                              <PlayCircle className="h-10 w-10 text-primary/50" />
                            </div>}
                          {/* Play overlay on hover */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <PlayCircle className="h-12 w-12 text-white" />
                          </div>
                        </div>
                        <CardContent className="p-3">
                          <h3 className="font-medium text-sm line-clamp-2">{training.title}</h3>
                        </CardContent>
                      </Card>
                    </Link>)}
                </div>
              </div>;
      })}
      </div>
    </div>;
};
export default Training;