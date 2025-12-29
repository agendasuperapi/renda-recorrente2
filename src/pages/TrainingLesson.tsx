import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle, Lock, PlayCircle, MessageSquare, Star, Send, Clock, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Video Player Component
const VideoPlayer = ({ url }: { url: string }) => {
  const getEmbedUrl = (url: string) => {
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\s]+)/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    // Direct video URL
    return url;
  };

  const embedUrl = getEmbedUrl(url);
  const isDirectVideo = !embedUrl.includes('youtube') && !embedUrl.includes('vimeo');

  if (isDirectVideo) {
    return (
      <video 
        src={embedUrl} 
        controls 
        className="w-full aspect-video rounded-lg bg-black"
      />
    );
  }

  return (
    <iframe
      src={embedUrl}
      className="w-full aspect-video rounded-lg"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
};

// Rating Stars Component
const RatingStars = ({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-6 w-6 cursor-pointer transition-colors ${
            (hover || value) >= star
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-muted-foreground'
          } ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
        />
      ))}
    </div>
  );
};

const TrainingLesson = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [showRatingForm, setShowRatingForm] = useState(false);

  // Fetch current lesson first (to discover training_id)
  const { data: lesson, isLoading: lessonLoading } = useQuery({
    queryKey: ["training-lesson", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_lessons")
        .select("*")
        .eq("id", lessonId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!lessonId,
  });

  const trainingId = lesson?.training_id as string | undefined;

  // Fetch training details
  const { data: training, isLoading: trainingLoading } = useQuery({
    queryKey: ["training-detail", trainingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainings")
        .select("*, training_categories(id, name)")
        .eq("id", trainingId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!trainingId,
  });

  // Fetch lessons
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

  // Fetch user progress
  const { data: userProgress } = useQuery({
    queryKey: ["user-lesson-progress", trainingId, userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("training_progress")
        .select("*")
        .eq("user_id", userId)
        .eq("training_id", trainingId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!trainingId
  });

  // Fetch user rating
  const { data: userRating } = useQuery({
    queryKey: ["user-training-rating", trainingId, userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("training_ratings")
        .select("*")
        .eq("user_id", userId)
        .eq("training_id", trainingId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!trainingId
  });

  // Get current lesson
  const currentLessonIndex = lessons?.findIndex(l => l.id === lessonId) ?? 0;
  const currentLesson = (lessonId ? lessons?.find(l => l.id === lessonId) : undefined) ?? lesson;
  const prevLesson = lessons?.[currentLessonIndex - 1];
  const nextLesson = lessons?.[currentLessonIndex + 1];

  // Check if lesson is completed
  const isLessonCompleted = (lessonId: string) => {
    return userProgress?.some(p => p.lesson_id === lessonId && p.is_completed);
  };

  // Check if lesson is accessible
  const isLessonAccessible = (index: number) => {
    if (index === 0) return true;
    const prevLessonId = lessons?.[index - 1]?.id;
    return prevLessonId ? isLessonCompleted(prevLessonId) : false;
  };

  // Calculate progress
  const totalLessons = lessons?.length || 0;
  const completedLessons = userProgress?.filter(p => p.is_completed).length || 0;
  const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const isTrainingComplete = progressPercentage === 100;

  // Complete lesson mutation
  const completeLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      if (!userId) throw new Error("Not authenticated");
      if (!trainingId) throw new Error("Missing training");

      const { error } = await supabase
        .from("training_progress")
        .upsert(
          {
            user_id: userId,
            lesson_id: lessonId,
            training_id: trainingId,
            is_completed: true,
            completed_at: new Date().toISOString(),
          },
          { onConflict: "user_id,lesson_id" }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-lesson-progress", trainingId] });
      queryClient.invalidateQueries({ queryKey: ["user-training-progress"] });
      toast.success("Aula concluída!");

      // Check if this was the last lesson
      if (currentLessonIndex === (lessons?.length || 0) - 1) {
        setShowRatingForm(true);
      } else if (nextLesson) {
        navigate(`/user/training/lesson/${nextLesson.id}`);
      }
    },
    onError: (error: any) => {
      toast.error("Erro ao marcar aula como concluída: " + error.message);
    }
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!userId || !currentLesson?.id) throw new Error("Missing data");
      
      const { error } = await supabase
        .from("training_comments")
        .insert({
          lesson_id: currentLesson.id,
          user_id: userId,
          content,
          is_approved: false
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["lesson-comments"] });
      toast.success("Comentário enviado! Aguardando aprovação.");
    },
    onError: (error: any) => {
      toast.error("Erro ao enviar comentário: " + error.message);
    }
  });

  // Fetch comments
  const { data: comments } = useQuery({
    queryKey: ["lesson-comments", currentLesson?.id],
    queryFn: async () => {
      if (!currentLesson?.id) return [];
      const { data, error } = await supabase
        .from("training_comments")
        .select("*, profiles:user_id(name, avatar_url)")
        .eq("lesson_id", currentLesson.id)
        .or(`is_approved.eq.true,user_id.eq.${userId}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentLesson?.id
  });

  // Submit rating mutation
  const submitRatingMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !trainingId) throw new Error("Missing data");
      
      const { error } = await supabase
        .from("training_ratings")
        .upsert({
          training_id: trainingId,
          user_id: userId,
          rating,
          review: review || null
        }, { onConflict: 'training_id,user_id' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-training-rating"] });
      toast.success("Avaliação enviada!");
      setShowRatingForm(false);
      navigate("/user/training");
    },
    onError: (error: any) => {
      toast.error("Erro ao enviar avaliação: " + error.message);
    }
  });

  // Set rating from existing if any
  useEffect(() => {
    if (userRating) {
      setRating(userRating.rating);
      setReview(userRating.review || "");
    }
  }, [userRating]);


  if (lessonLoading || trainingLoading || lessonsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!training || !currentLesson) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Treinamento não encontrado</p>
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
        <Button variant="ghost" size="sm" onClick={() => navigate(`/user/training/category/${(training.training_categories as any)?.id}`)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para {(training.training_categories as any)?.name}
        </Button>
        <h1 className="text-2xl font-bold mb-2">{training.title}</h1>
        
        {/* Progress */}
        <div className="flex items-center gap-4 mb-4">
          <Progress value={progressPercentage} className="flex-1 h-2" />
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {completedLessons}/{totalLessons} aulas
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Lesson Content - Hidden when training is complete */}
          {!isTrainingComplete && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <Badge variant="outline" className="mb-2">
                      Aula {currentLessonIndex + 1} de {totalLessons}
                    </Badge>
                    <CardTitle>{currentLesson.title}</CardTitle>
                  </div>
                  {isLessonCompleted(currentLesson.id) && (
                    <Badge className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Concluída
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Video */}
                {(currentLesson.content_type === 'video' || currentLesson.content_type === 'mixed') && currentLesson.video_url && (
                  <VideoPlayer url={currentLesson.video_url} />
                )}

                {/* Text Content */}
                {(currentLesson.content_type === 'text' || currentLesson.content_type === 'mixed') && currentLesson.content_html && (
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: currentLesson.content_html }}
                  />
                )}

                {/* Description */}
                {currentLesson.description && (
                  <p className="text-muted-foreground">{currentLesson.description}</p>
                )}

                {/* Complete Button */}
                {!isLessonCompleted(currentLesson.id) && (
                  <Button 
                    onClick={() => completeLessonMutation.mutate(currentLesson.id)}
                    disabled={completeLessonMutation.isPending}
                    className="w-full"
                    size="lg"
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    {completeLessonMutation.isPending ? "Salvando..." : "Marcar como Concluída"}
                  </Button>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    disabled={!prevLesson}
                    onClick={() => prevLesson && navigate(`/user/training/lesson/${prevLesson.id}`)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Anterior
                  </Button>
                  <Button
                    disabled={!nextLesson || !isLessonCompleted(currentLesson.id)}
                    onClick={() => nextLesson && navigate(`/user/training/lesson/${nextLesson.id}`)}
                  >
                    Próxima
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments Section - Hidden when training is complete */}
          {!isTrainingComplete && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comentários
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Comment */}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Escreva um comentário..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={2}
                  />
                  <Button 
                    onClick={() => addCommentMutation.mutate(newComment)}
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                {/* Comments List */}
                {comments?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Seja o primeiro a comentar!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {comments?.map((comment) => (
                      <div key={comment.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {(comment.profiles as any)?.name || "Usuário"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(comment.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                            {!comment.is_approved && comment.user_id === userId && (
                              <Badge variant="secondary" className="text-xs">Pendente</Badge>
                            )}
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Rating Form (shown when training is complete) */}
          {(showRatingForm || isTrainingComplete) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  {userRating ? "Sua Avaliação" : "Avalie este Treinamento"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm">Sua nota:</span>
                  <RatingStars value={rating} onChange={setRating} />
                </div>
                <Textarea
                  placeholder="Deixe um comentário sobre o treinamento (opcional)..."
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  rows={3}
                />
                <Button 
                  onClick={() => submitRatingMutation.mutate()}
                  disabled={rating === 0 || submitRatingMutation.isPending}
                >
                  {submitRatingMutation.isPending ? "Enviando..." : userRating ? "Atualizar Avaliação" : "Enviar Avaliação"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Lessons List */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Conteúdo do Treinamento</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {lessons?.map((lesson, index) => {
                  const isCompleted = isLessonCompleted(lesson.id);
                  const isAccessible = isLessonAccessible(index);
                  const isCurrent = lesson.id === currentLesson?.id && !showRatingForm;

                  return (
                    <button
                      key={lesson.id}
                      onClick={() => {
                        if (isAccessible) {
                          setShowRatingForm(false);
                          navigate(`/user/training/lesson/${lesson.id}`);
                        }
                      }}
                      disabled={!isAccessible}
                      className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                        isCurrent ? 'bg-primary/10' : 'hover:bg-muted/50'
                      } ${!isAccessible ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 text-sm font-medium ${
                        isCompleted 
                          ? 'bg-green-500 text-white' 
                          : isCurrent 
                            ? 'bg-primary text-primary-foreground'
                            : !isAccessible
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-muted'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : !isAccessible ? (
                          <Lock className="h-3 w-3" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${isCurrent ? 'font-medium' : ''}`}>
                          {lesson.title}
                        </p>
                        {lesson.duration_minutes > 0 && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {lesson.duration_minutes} min
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* Conclusão/Avaliação Card */}
                <button
                  onClick={() => {
                    if (isTrainingComplete) {
                      setShowRatingForm(true);
                    }
                  }}
                  disabled={!isTrainingComplete}
                  className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                    showRatingForm ? 'bg-primary/10' : 'hover:bg-muted/50'
                  } ${!isTrainingComplete ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 text-sm font-medium ${
                    userRating 
                      ? 'bg-green-500 text-white' 
                      : showRatingForm 
                        ? 'bg-primary text-primary-foreground'
                        : !isTrainingComplete
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-muted'
                  }`}>
                    {userRating ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : !isTrainingComplete ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      <Star className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${showRatingForm ? 'font-medium' : ''}`}>
                      Conclusão
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Avalie o treinamento
                    </p>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TrainingLesson;
