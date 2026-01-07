import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, FolderOpen, CheckCircle, BookOpen, Crown, Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

const Training = () => {
  const queryClient = useQueryClient();

  // Real-time subscription for training updates
  useEffect(() => {
    const channel = supabase
      .channel('training-page-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'training_categories' }, () => {
        queryClient.invalidateQueries({ queryKey: ["training-categories"] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trainings' }, () => {
        queryClient.invalidateQueries({ queryKey: ["trainings-with-stats"] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'training_lessons' }, () => {
        queryClient.invalidateQueries({ queryKey: ["trainings-with-stats"] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => {
        queryClient.invalidateQueries({ queryKey: ["training-page-settings"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
  const { userId } = useAuth();
  const navigate = useNavigate();

  // Fetch training page settings
  const { data: pageSettings } = useQuery({
    queryKey: ["training-page-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .in("key", [
          "training_page_cover_url",
          "training_page_banner_url",
          "training_page_banner_config",
          "training_page_cover_config",
          "favorites_category_thumbnail_url",
          "favorites_category_cover_url",
          "favorites_category_banner_config"
        ]);
      if (error) throw error;
      return data;
    }
  });

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
          title,
          thumbnail_url,
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

  // Fetch user favorite lessons
  const { data: favoriteLessons } = useQuery({
    queryKey: ["user-favorite-lessons", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("training_lesson_favorites")
        .select(`
          lesson_id,
          training_lessons!inner(
            id,
            title,
            thumbnail_url,
            duration_minutes,
            training_id,
            trainings!inner(id, title, category_id)
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
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

  // Get banner config
  const bannerConfigRaw = pageSettings?.find(s => s.key === "training_page_banner_config")?.value;
  const bannerConfig = bannerConfigRaw ? JSON.parse(bannerConfigRaw) : null;

  // Get favorites category settings
  const favoritesThumbnailUrl = pageSettings?.find(s => s.key === "favorites_category_thumbnail_url")?.value;
  const favoritesCoverUrl = pageSettings?.find(s => s.key === "favorites_category_cover_url")?.value;
  const favoritesBannerConfigRaw = pageSettings?.find(s => s.key === "favorites_category_banner_config")?.value;
  const favoritesBannerConfig = favoritesBannerConfigRaw ? JSON.parse(favoritesBannerConfigRaw) : null;

  // Determine which image to use for the hero
  const heroBackgroundImage = pageBannerUrl
    ? `url(${pageBannerUrl})`
    : pageCoverUrl
    ? `url(${pageCoverUrl})`
    : firstCategory?.banner_url
    ? `url(${firstCategory.banner_url})`
    : firstCategory?.cover_image_url
    ? `url(${firstCategory.cover_image_url})`
    : "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.8) 100%)";

  // Text alignment class
  const getTextAlignClass = () => {
    switch (bannerConfig?.textAlign) {
      case "left":
        return "items-start text-left";
      case "right":
        return "items-end text-right";
      default:
        return "items-center text-center";
    }
  };

  return (
    <div className="-mt-6 md:-mt-8 -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Hero Banner */}
      {firstCategory && (
        <>
          <div
            className="relative w-full bg-cover bg-center aspect-[16/6] sm:aspect-[16/5] lg:aspect-[16/4] xl:aspect-[16/3.5] max-h-[350px]"
            style={{
              backgroundImage: heroBackgroundImage
            }}
          >
            {/* Overlay */}
            {bannerConfig && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: bannerConfig.overlayColor || "#000000",
                  opacity: (bannerConfig.overlayOpacity ?? 40) / 100
                }}
              />
            )}

            {/* Title and Subtitle */}
            {bannerConfig && (bannerConfig.title || bannerConfig.subtitle) && (
              <div className={`absolute inset-0 flex flex-col justify-center px-4 sm:px-8 lg:px-16 ${getTextAlignClass()}`}>
                {bannerConfig.title && (
                  <h1
                    className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-tight"
                    style={{ color: bannerConfig.textColor || "#ffffff" }}
                  >
                    {bannerConfig.title}
                  </h1>
                )}
                {bannerConfig.subtitle && (
                  <p
                    className="mt-1 sm:mt-2 text-sm sm:text-base md:text-lg opacity-90"
                    style={{ color: bannerConfig.textColor || "#ffffff" }}
                  >
                    {bannerConfig.subtitle}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Info Card below banner */}
          <div className="px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-8 lg:-mt-12 relative z-10">
            <Card className="p-6 md:p-8 bg-card/95 backdrop-blur-sm border">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary/20 rounded-full">
                  <GraduationCap className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-4xl font-bold text-foreground flex items-center gap-2">
                    Treinamentos
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                      <Crown className="h-3 w-3" />
                      VIP
                    </span>
                  </h1>
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
        </>
      )}

      <div className="px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        <h3 className="text-lg font-semibold">Categorias de Treinamento</h3>
        
        {/* Categories Grid - Large Cards */}
        {categoriesLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-72 rounded-xl" />
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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Favorites Category Card - Shows when user has favorites */}
            {favoriteLessons && favoriteLessons.length > 0 && (
              <div
                className="block group cursor-pointer"
                onClick={() => navigate("/user/training/favorites")}
              >
                <Card className="overflow-hidden hover:shadow-xl transition-all group-hover:scale-[1.02] ring-2 ring-red-400/50">
                  {/* Cover Image */}
                  <div className="relative aspect-video bg-gradient-to-br from-red-500/20 to-red-500/5 overflow-hidden">
                    {favoritesCoverUrl || favoritesThumbnailUrl ? (
                      <img
                        src={favoritesCoverUrl || favoritesThumbnailUrl}
                        alt="Aulas Favoritas"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500/30 to-red-600/20">
                        <Heart className="h-16 w-16 text-red-500 fill-red-500/50" />
                      </div>
                    )}
                    
                    {/* Overlay from favorites banner config */}
                    {favoritesBannerConfig && (
                      <>
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundColor: favoritesBannerConfig?.overlayColor || "#000000",
                            opacity: (favoritesBannerConfig?.overlayOpacity ?? 40) / 100
                          }}
                        />
                        {(favoritesBannerConfig?.title || favoritesBannerConfig?.subtitle) && (
                          <div className={`absolute inset-0 flex flex-col justify-center px-4 ${
                            favoritesBannerConfig?.textAlign === "left" ? "items-start text-left" :
                            favoritesBannerConfig?.textAlign === "right" ? "items-end text-right" :
                            "items-center text-center"
                          }`}>
                            {favoritesBannerConfig?.title && (
                              <h4
                                className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight"
                                style={{ color: favoritesBannerConfig?.textColor || "#ffffff" }}
                              >
                                {favoritesBannerConfig.title}
                              </h4>
                            )}
                            {favoritesBannerConfig?.subtitle && (
                              <p
                                className="mt-1 text-lg sm:text-xl opacity-90 line-clamp-2"
                                style={{ color: favoritesBannerConfig?.textColor || "#ffffff" }}
                              >
                                {favoritesBannerConfig.subtitle}
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Heart badge */}
                    <div className="absolute top-3 right-3">
                      <Heart className="h-6 w-6 fill-red-500 text-red-500" />
                    </div>
                  </div>
                  
                  <CardContent className="p-5">
                    <div className="mb-3">
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors flex items-center gap-2">
                        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                        Aulas Favoritas
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        Suas aulas favoritas em um só lugar
                      </p>
                    </div>
                    
                    {/* Stats */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="gap-1 border-red-400/50 text-red-500">
                          <Heart className="h-3.5 w-3.5 fill-red-500" />
                          Aulas
                          <span className="font-semibold">{favoriteLessons.length}</span>
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {categories?.map(category => {
              const stats = getCategoryStats(category.id);
              const isCompleted = stats.percentage === 100;
              const categoryBannerConfig =
                ((category as any).banner_text_config ?? (category as any).banner_config) as any;

              return (
                <div
                  key={category.id}
                  className="block group cursor-pointer"
                  onClick={() => {
                    const categoryTrainings = trainings?.filter(t => t.category_id === category.id) || [];
                    if (categoryTrainings.length === 1) {
                      // Navigate directly to the training detail (lessons)
                      navigate(`/user/training/${categoryTrainings[0].id}`);
                    } else {
                      // Navigate to category page to choose a training
                      navigate(`/user/training/category/${category.id}`);
                    }
                  }}
                >
                  <Card className={`overflow-hidden hover:shadow-xl transition-all group-hover:scale-[1.02] ${isCompleted ? 'ring-2 ring-green-500' : ''}`}>
                    {/* Cover Image */}
                    <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
                      {category.cover_image_url ? (
                        <img
                          src={category.cover_image_url}
                          alt={category.name}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FolderOpen className="h-16 w-16 text-primary/40" />
                        </div>
                      )}
                      
                      {/* Overlay do banner (usa banner_text_config ou banner_config) */}
                      {categoryBannerConfig && (
                        <>
                          <div
                            className="absolute inset-0"
                            style={{
                              backgroundColor: categoryBannerConfig?.overlayColor || "#000000",
                              opacity: (categoryBannerConfig?.overlayOpacity ?? 40) / 100
                            }}
                          />
                          {(categoryBannerConfig?.title || categoryBannerConfig?.subtitle) && (
                            <div className={`absolute inset-0 flex flex-col justify-center px-4 ${
                              categoryBannerConfig?.textAlign === "left" ? "items-start text-left" :
                              categoryBannerConfig?.textAlign === "right" ? "items-end text-right" :
                              "items-center text-center"
                            }`}>
                              {categoryBannerConfig?.title && (
                                <h4
                                  className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight"
                                  style={{ color: categoryBannerConfig?.textColor || "#ffffff" }}
                                >
                                  {categoryBannerConfig.title}
                                </h4>
                              )}
                              {categoryBannerConfig?.subtitle && (
                                <p
                                  className="mt-1 text-lg sm:text-xl opacity-90 line-clamp-2"
                                  style={{ color: categoryBannerConfig?.textColor || "#ffffff" }}
                                >
                                  {categoryBannerConfig.subtitle}
                                </p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Completed badge */}
                      {isCompleted && (
                        <Badge className="absolute top-3 right-3 bg-green-500 gap-1 z-10">
                          <CheckCircle className="h-3 w-3" />
                          Completo
                        </Badge>
                      )}
                    </div>
                    
                    <CardContent className="p-5">
                      <div className="mb-3">
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                          {category.name}
                        </h3>
                        {category.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {category.description}
                          </p>
                        )}
                      </div>
                      
                      {/* Stats and Progress */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="gap-1">
                            <BookOpen className="h-3.5 w-3.5" />
                            Treinamentos
                            <span className="font-semibold">{stats.totalTrainings}</span>
                          </Badge>
                        </div>
                        
                        {stats.totalLessons > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Progresso</span>
                              <span>{stats.completedLessons}/{stats.totalLessons} aulas</span>
                            </div>
                            <Progress value={stats.percentage} className="h-1.5" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Training;
