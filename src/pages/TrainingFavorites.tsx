import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Heart, PlayCircle, FolderOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const TrainingFavorites = () => {
  const navigate = useNavigate();
  const { userId } = useAuth();

  // Fetch favorites category settings
  const { data: categorySettings } = useQuery({
    queryKey: ["favorites-category-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .in("key", [
          "favorites_category_thumbnail_url",
          "favorites_category_banner_url",
          "favorites_category_cover_url",
          "favorites_category_banner_config"
        ]);
      if (error) throw error;
      return data;
    }
  });

  // Fetch user favorite lessons
  const { data: favoriteLessons, isLoading } = useQuery({
    queryKey: ["user-favorite-lessons-page", userId],
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
            banner_config,
            banner_text_config,
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

  // Get banner/cover from settings
  const bannerUrl = categorySettings?.find(s => s.key === "favorites_category_banner_url")?.value;
  const coverUrl = categorySettings?.find(s => s.key === "favorites_category_cover_url")?.value;
  const bannerConfigRaw = categorySettings?.find(s => s.key === "favorites_category_banner_config")?.value;
  const bannerConfig = bannerConfigRaw ? JSON.parse(bannerConfigRaw) : null;

  // Determine which image to use for the hero
  const heroBackgroundImage = bannerUrl
    ? `url(${bannerUrl})`
    : coverUrl
    ? `url(${coverUrl})`
    : "linear-gradient(135deg, hsl(var(--destructive)) 0%, hsl(var(--destructive)/0.8) 100%)";

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
      <div
        className="relative w-full bg-cover bg-center aspect-[16/6] sm:aspect-[16/5] lg:aspect-[16/4] xl:aspect-[16/3.5] max-h-[350px]"
        style={{
          backgroundImage: heroBackgroundImage
        }}
      >
        {/* Overlay */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: bannerConfig?.overlayColor || "#000000",
            opacity: (bannerConfig?.overlayOpacity ?? 40) / 100
          }}
        />

        {/* Title and Subtitle */}
        <div className={`absolute inset-0 flex flex-col justify-center px-4 sm:px-8 lg:px-16 ${getTextAlignClass()}`}>
          {bannerConfig?.title && (
            <h1
              className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-tight"
              style={{ color: bannerConfig?.textColor || "#ffffff" }}
            >
              {bannerConfig.title}
            </h1>
          )}
          {bannerConfig?.subtitle && (
            <p
              className="mt-1 sm:mt-2 text-sm sm:text-base md:text-lg opacity-90"
              style={{ color: bannerConfig?.textColor || "#ffffff" }}
            >
              {bannerConfig.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Info Card below banner */}
      <div className="px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-8 lg:-mt-12 relative z-10">
        <Card className="p-6 md:p-8 bg-card/95 backdrop-blur-sm border">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/user/training")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="p-3 bg-red-500/20 rounded-full">
              <Heart className="h-8 w-8 text-red-500 fill-red-500" />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-foreground">
                Aulas Favoritas
              </h1>
              <p className="text-muted-foreground">
                {favoriteLessons?.length || 0} aula{(favoriteLessons?.length || 0) !== 1 ? 's' : ''} favoritada{(favoriteLessons?.length || 0) !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : !favoriteLessons || favoriteLessons.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma aula favorita</h3>
              <p className="text-muted-foreground mb-4">
                Favorite aulas para acessá-las rapidamente aqui!
              </p>
              <Button onClick={() => navigate("/user/training")}>
                Ver Treinamentos
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {favoriteLessons.map((fav: any) => {
              const lesson = fav.training_lessons;
              const training = lesson?.trainings;
              
              return (
                <Link
                  key={fav.lesson_id}
                  to={`/user/training/lesson/${lesson.id}?from=favorites`}
                  className="block group"
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-all group-hover:scale-[1.02] ring-2 ring-red-400/50">
                    <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
                      {lesson.thumbnail_url ? (
                        <img 
                          src={lesson.thumbnail_url} 
                          alt={lesson.title}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PlayCircle className="h-12 w-12 text-primary/40" />
                        </div>
                      )}
                      
                      {/* Overlay + texto (usa banner_text_config ou banner_config da aula) */}
                      {(() => {
                        const lessonBannerConfig = (lesson as any).banner_text_config ?? (lesson as any).banner_config;
                        return lessonBannerConfig ? (
                          <>
                            <div
                              className="absolute inset-0 z-[5]"
                              style={{
                                backgroundColor: lessonBannerConfig?.overlayColor || "#000000",
                                opacity: (lessonBannerConfig?.overlayOpacity ?? 40) / 100
                              }}
                            />
                            {(lessonBannerConfig?.title || lessonBannerConfig?.subtitle) && (
                              <div
                                className={`absolute inset-0 z-10 flex flex-col justify-center px-4 ${
                                  lessonBannerConfig?.textAlign === "left" ? "items-start text-left" :
                                  lessonBannerConfig?.textAlign === "right" ? "items-end text-right" :
                                  "items-center text-center"
                                }`}
                              >
                                {lessonBannerConfig?.title && (
                                  <h4
                                    className="text-lg sm:text-xl md:text-2xl font-bold leading-tight drop-shadow-lg"
                                    style={{ color: lessonBannerConfig?.textColor || "#ffffff" }}
                                  >
                                    {lessonBannerConfig.title}
                                  </h4>
                                )}
                                {lessonBannerConfig?.subtitle && (
                                  <p
                                    className="mt-1 text-sm sm:text-base opacity-90 line-clamp-2 drop-shadow-lg"
                                    style={{ color: lessonBannerConfig?.textColor || "#ffffff" }}
                                  >
                                    {lessonBannerConfig.subtitle}
                                  </p>
                                )}
                              </div>
                            )}
                          </>
                        ) : null;
                      })()}
                      
                      {/* Favorite badge */}
                      <div className="absolute top-2 right-2 z-20 bg-black/40 rounded-full p-1">
                        <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2">
                        {lesson.title}
                      </h4>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {training?.title}
                        </p>
                        {lesson.duration_minutes && (
                          <span className="text-xs text-muted-foreground">
                            {lesson.duration_minutes} min
                          </span>
                        )}
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

export default TrainingFavorites;
