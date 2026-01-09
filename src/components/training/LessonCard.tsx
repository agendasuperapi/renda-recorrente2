import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Lock, PlayCircle, Heart } from "lucide-react";

interface LessonCardProps {
  lesson: {
    id: string;
    title: string;
    thumbnail_url?: string | null;
    duration_minutes?: number | null;
    banner_config?: any;
    banner_text_config?: any;
  };
  trainingTitle?: string;
  lessonNumber?: number;
  isCompleted?: boolean;
  isLocked?: boolean;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
  isFavoriteLoading?: boolean;
  linkTo: string;
  showFavoriteButton?: boolean;
  showCompletedBadge?: boolean;
  showLessonNumber?: boolean;
  ringColorClass?: string;
}

const LessonCard = ({
  lesson,
  trainingTitle,
  lessonNumber,
  isCompleted = false,
  isLocked = false,
  isFavorited = false,
  onToggleFavorite,
  isFavoriteLoading = false,
  linkTo,
  showFavoriteButton = true,
  showCompletedBadge = true,
  showLessonNumber = true,
  ringColorClass,
}: LessonCardProps) => {
  // Get banner config (prefer banner_text_config, fallback to banner_config)
  const bannerConfig = lesson.banner_text_config ?? lesson.banner_config;

  // Determine ring color based on state
  const getRingClass = () => {
    if (ringColorClass) return ringColorClass;
    if (isCompleted) return "ring-2 ring-green-500";
    if (isFavorited) return "ring-2 ring-amber-400";
    return "";
  };

  return (
    <div className="relative">
      <Link
        to={isLocked ? '#' : linkTo}
        className={`block group ${isLocked ? 'cursor-not-allowed' : ''}`}
        onClick={(e) => isLocked && e.preventDefault()}
      >
        <Card 
          className={`overflow-hidden transition-all ${isLocked ? 'opacity-60' : 'hover:shadow-xl group-hover:scale-[1.02]'} ${getRingClass()}`}
        >
          {/* Thumbnail */}
          <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
            {lesson.thumbnail_url ? (
              <img 
                src={lesson.thumbnail_url} 
                alt={lesson.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <PlayCircle className="h-16 w-16 text-primary/40" />
              </div>
            )}
            
            {/* Overlay from banner_config */}
            {bannerConfig && (
              <>
                <div
                  className="absolute inset-0 z-[5]"
                  style={{
                    backgroundColor: bannerConfig?.overlayColor || "#000000",
                    opacity: (bannerConfig?.overlayOpacity ?? 40) / 100
                  }}
                />
                {(bannerConfig?.title || bannerConfig?.subtitle) && (
                  <div className={`absolute inset-0 z-10 flex flex-col justify-center px-4 ${
                    bannerConfig?.textAlign === "left" ? "items-start text-left" :
                    bannerConfig?.textAlign === "right" ? "items-end text-right" :
                    "items-center text-center"
                  }`}>
                    {bannerConfig?.title && (
                      <h4
                        className="text-lg sm:text-xl md:text-2xl font-bold leading-tight drop-shadow-lg"
                        style={{ color: bannerConfig?.textColor || "#ffffff" }}
                      >
                        {bannerConfig.title}
                      </h4>
                    )}
                    {bannerConfig?.subtitle && (
                      <p
                        className="mt-1 text-sm sm:text-base opacity-90 line-clamp-2 drop-shadow-lg"
                        style={{ color: bannerConfig?.textColor || "#ffffff" }}
                      >
                        {bannerConfig.subtitle}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
            
            {/* Status overlay - only for locked */}
            {isLocked && (
              <div className={`absolute inset-0 z-20 flex items-center justify-center ${
                bannerConfig ? 'bg-black/20' : 'bg-black/50'
              }`}>
                <Lock className="h-10 w-10 text-white" />
              </div>
            )}

            {/* Play button overlay on hover */}
            {!isLocked && !isCompleted && !bannerConfig && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <PlayCircle className="h-16 w-16 text-white" />
              </div>
            )}
          </div>

          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-2">
                {lesson.title}
              </h3>
              {showCompletedBadge && isCompleted && (
                <Badge className="bg-green-500 flex-shrink-0">
                  Concluída
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
              {lesson.duration_minutes && lesson.duration_minutes > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {lesson.duration_minutes} min
                </span>
              )}
              {showLessonNumber && lessonNumber !== undefined && (
                <span className="flex items-center gap-1">
                  Aula {lessonNumber}
                </span>
              )}
              {trainingTitle && (
                <span className="flex items-center gap-1 line-clamp-1">
                  {trainingTitle}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
      
      {/* Favorite Button */}
      {showFavoriteButton && onToggleFavorite && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavorite();
          }}
          disabled={isFavoriteLoading}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
        >
          <Heart className={`h-5 w-5 transition-colors ${isFavorited ? 'fill-red-500 text-red-500' : 'text-white hover:text-red-400'}`} />
        </button>
      )}
      
      {/* Static Favorite Badge (when no toggle) */}
      {!showFavoriteButton && isFavorited && (
        <div className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/50">
          <Heart className="h-5 w-5 fill-red-500 text-red-500" />
        </div>
      )}
    </div>
  );
};

export default LessonCard;
