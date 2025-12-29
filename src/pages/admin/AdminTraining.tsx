import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FolderOpen, BookOpen, Video, MessageSquare, Check, X, Eye, GripVertical, ChevronRight, Clock, Users, Star, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RichTextEditor } from "@/components/training/RichTextEditor";

// Categories Tab Component
const CategoriesTab = ({ onViewTrainings }: { onViewTrainings: (categoryId: string) => void }) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "BookOpen",
    is_active: true
  });

  const { data: categories, isLoading } = useQuery({
    queryKey: ["training-categories-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_categories")
        .select("*")
        .order("order_position", { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  // Count trainings per category
  const { data: trainingCounts } = useQuery({
    queryKey: ["training-counts-by-category"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainings")
        .select("category_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach(t => {
        counts[t.category_id] = (counts[t.category_id] || 0) + 1;
      });
      return counts;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingCategory) {
        const { error } = await supabase
          .from("training_categories")
          .update(data)
          .eq("id", editingCategory.id);
        if (error) throw error;
      } else {
        const maxOrder = categories?.length || 0;
        const { error } = await supabase
          .from("training_categories")
          .insert({ ...data, order_position: maxOrder });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-categories-admin"] });
      toast.success(editingCategory ? "Categoria atualizada!" : "Categoria criada!");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Erro: " + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("training_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-categories-admin"] });
      toast.success("Categoria excluída!");
    },
    onError: (error: any) => {
      toast.error("Erro: " + error.message);
    }
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", icon: "BookOpen", is_active: true });
    setEditingCategory(null);
  };

  const openEdit = (category: any) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      icon: category.icon || "BookOpen",
      is_active: category.is_active
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Categorias de Treinamento</h3>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Marketing Digital"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição da categoria..."
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Ativa</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button onClick={() => saveMutation.mutate(formData)} disabled={!formData.name || saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : categories?.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma categoria cadastrada
        </div>
      ) : (
        <div className="grid gap-3">
          {categories?.map((category) => (
            <Card key={category.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FolderOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{category.name}</span>
                      {!category.is_active && (
                        <Badge variant="secondary">Inativa</Badge>
                      )}
                    </div>
                    {category.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onViewTrainings(category.id)}
                    className="gap-1"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span className="hidden sm:inline">Treinamentos</span>
                    {trainingCounts?.[category.id] ? (
                      <Badge variant="secondary" className="ml-1">{trainingCounts[category.id]}</Badge>
                    ) : null}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(category)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      if (confirm("Excluir esta categoria? Todos os treinamentos serão removidos.")) {
                        deleteMutation.mutate(category.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Trainings Tab Component
const TrainingsTab = ({ filterCategoryId, onViewLessons }: { filterCategoryId: string; onViewLessons: (trainingId: string) => void }) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>(filterCategoryId);
  const [formData, setFormData] = useState({
    category_id: "",
    title: "",
    description: "",
    introduction_video_url: "",
    estimated_duration_minutes: 0,
    is_active: true,
    is_published: false
  });

  // Sync with external filter
  useState(() => {
    if (filterCategoryId) {
      setSelectedCategory(filterCategoryId);
    }
  });

  const { data: categories } = useQuery({
    queryKey: ["training-categories-admin"],
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

  const { data: trainings, isLoading } = useQuery({
    queryKey: ["trainings-admin", selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from("trainings")
        .select("*, training_categories(name)")
        .order("order_position");
      
      if (selectedCategory) {
        query = query.eq("category_id", selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  // Count lessons per training
  const { data: lessonCounts } = useQuery({
    queryKey: ["lesson-counts-by-training"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_lessons")
        .select("training_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach(l => {
        counts[l.training_id] = (counts[l.training_id] || 0) + 1;
      });
      return counts;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingTraining) {
        const { error } = await supabase
          .from("trainings")
          .update(data)
          .eq("id", editingTraining.id);
        if (error) throw error;
      } else {
        const maxOrder = trainings?.filter(t => t.category_id === data.category_id).length || 0;
        const { error } = await supabase
          .from("trainings")
          .insert({ ...data, order_position: maxOrder });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainings-admin"] });
      toast.success(editingTraining ? "Treinamento atualizado!" : "Treinamento criado!");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Erro: " + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("trainings")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainings-admin"] });
      toast.success("Treinamento excluído!");
    }
  });

  const resetForm = () => {
    setFormData({
      category_id: selectedCategory || "",
      title: "",
      description: "",
      introduction_video_url: "",
      estimated_duration_minutes: 0,
      is_active: true,
      is_published: false
    });
    setEditingTraining(null);
  };

  const openEdit = (training: any) => {
    setEditingTraining(training);
    setFormData({
      category_id: training.category_id,
      title: training.title,
      description: training.description || "",
      introduction_video_url: training.introduction_video_url || "",
      estimated_duration_minutes: training.estimated_duration_minutes || 0,
      is_active: training.is_active,
      is_published: training.is_published
    });
    setDialogOpen(true);
  };

  // Update selected category when filterCategoryId changes
  React.useEffect(() => {
    if (filterCategoryId) {
      setSelectedCategory(filterCategoryId);
    }
  }, [filterCategoryId]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Treinamentos</h3>
          <Select value={selectedCategory || "all"} onValueChange={(v) => setSelectedCategory(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Filtrar por categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Treinamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTraining ? "Editar Treinamento" : "Novo Treinamento"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Introdução ao Marketing"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição do treinamento..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>URL do Vídeo de Introdução (opcional)</Label>
                <Input
                  value={formData.introduction_video_url}
                  onChange={(e) => setFormData({ ...formData, introduction_video_url: e.target.value })}
                  placeholder="https://youtube.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label>Duração Estimada (minutos)</Label>
                <Input
                  type="number"
                  value={formData.estimated_duration_minutes}
                  onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Ativo</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Publicado</Label>
                <Switch
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button 
                onClick={() => saveMutation.mutate(formData)} 
                disabled={!formData.title || !formData.category_id || saveMutation.isPending}
              >
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : trainings?.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {selectedCategory ? "Nenhum treinamento nesta categoria" : "Nenhum treinamento cadastrado"}
        </div>
      ) : (
        <div className="grid gap-3">
          {trainings?.map((training) => (
            <Card key={training.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{training.title}</span>
                        {training.is_published ? (
                          <Badge className="bg-green-500">Publicado</Badge>
                        ) : (
                          <Badge variant="secondary">Rascunho</Badge>
                        )}
                        {!training.is_active && (
                          <Badge variant="outline">Inativo</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{(training.training_categories as any)?.name}</span>
                        {training.estimated_duration_minutes > 0 && (
                          <>
                            <span>•</span>
                            <span>{training.estimated_duration_minutes} min</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onViewLessons(training.id)}
                      className="gap-1"
                    >
                      <Video className="h-4 w-4" />
                      <span className="hidden sm:inline">Aulas</span>
                      {lessonCounts?.[training.id] ? (
                        <Badge variant="secondary" className="ml-1">{lessonCounts[training.id]}</Badge>
                      ) : null}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(training)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        if (confirm("Excluir este treinamento? Todas as aulas serão removidas.")) {
                          deleteMutation.mutate(training.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Lessons Tab Component
const LessonsTab = ({ filterTrainingId }: { filterTrainingId: string }) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [selectedTraining, setSelectedTraining] = useState<string>(filterTrainingId);
  const [formData, setFormData] = useState({
    training_id: "",
    title: "",
    description: "",
    content_type: "video",
    video_url: "",
    content_html: "",
    duration_minutes: 0,
    is_active: true
  });

  // Update selected training when filterTrainingId changes
  React.useEffect(() => {
    if (filterTrainingId) {
      setSelectedTraining(filterTrainingId);
    }
  }, [filterTrainingId]);

  const { data: trainings } = useQuery({
    queryKey: ["trainings-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainings")
        .select("*, training_categories(name)")
        .order("order_position");
      if (error) throw error;
      return data;
    }
  });

  const { data: lessons, isLoading } = useQuery({
    queryKey: ["training-lessons-admin", selectedTraining],
    queryFn: async () => {
      let query = supabase
        .from("training_lessons")
        .select("*, trainings(title)")
        .order("order_position");
      
      if (selectedTraining) {
        query = query.eq("training_id", selectedTraining);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingLesson) {
        const { error } = await supabase
          .from("training_lessons")
          .update(data)
          .eq("id", editingLesson.id);
        if (error) throw error;
      } else {
        const lessonsCount = lessons?.filter(l => l.training_id === data.training_id).length || 0;
        const { error } = await supabase
          .from("training_lessons")
          .insert({ ...data, order_position: lessonsCount });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-lessons-admin"] });
      toast.success(editingLesson ? "Aula atualizada!" : "Aula criada!");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Erro: " + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("training_lessons")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-lessons-admin"] });
      toast.success("Aula excluída!");
    }
  });

  const resetForm = () => {
    setFormData({
      training_id: selectedTraining || "",
      title: "",
      description: "",
      content_type: "video",
      video_url: "",
      content_html: "",
      duration_minutes: 0,
      is_active: true
    });
    setEditingLesson(null);
  };

  const openEdit = (lesson: any) => {
    setEditingLesson(lesson);
    setFormData({
      training_id: lesson.training_id,
      title: lesson.title,
      description: lesson.description || "",
      content_type: lesson.content_type,
      video_url: lesson.video_url || "",
      content_html: lesson.content_html || "",
      duration_minutes: lesson.duration_minutes || 0,
      is_active: lesson.is_active
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Aulas</h3>
          <Select value={selectedTraining || "all"} onValueChange={(v) => setSelectedTraining(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Filtrar por treinamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {trainings?.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova Aula
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLesson ? "Editar Aula" : "Nova Aula"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Treinamento</Label>
                <Select value={formData.training_id} onValueChange={(v) => setFormData({ ...formData, training_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {trainings?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Título da Aula</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Aula 1 - Introdução"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição breve da aula..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Conteúdo</Label>
                <Select value={formData.content_type} onValueChange={(v) => setFormData({ ...formData, content_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Vídeo</SelectItem>
                    <SelectItem value="text">Texto</SelectItem>
                    <SelectItem value="mixed">Misto (Vídeo + Texto)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(formData.content_type === "video" || formData.content_type === "mixed") && (
                <div className="space-y-2">
                  <Label>URL do Vídeo</Label>
                  <Input
                    value={formData.video_url}
                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                    placeholder="https://youtube.com/... ou https://vimeo.com/..."
                  />
                  <p className="text-xs text-muted-foreground">Suporta YouTube, Vimeo ou URL direta de vídeo</p>
                </div>
              )}
              {(formData.content_type === "text" || formData.content_type === "mixed") && (
                <div className="space-y-2">
                  <Label>Conteúdo</Label>
                  <RichTextEditor
                    value={formData.content_html}
                    onChange={(value) => setFormData({ ...formData, content_html: value })}
                    placeholder="Digite o conteúdo da aula aqui..."
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Duração (minutos)</Label>
                <Input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Ativa</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button 
                onClick={() => saveMutation.mutate(formData)} 
                disabled={!formData.title || !formData.training_id || saveMutation.isPending}
              >
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : lessons?.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {selectedTraining ? "Nenhuma aula neste treinamento" : "Nenhuma aula cadastrada"}
        </div>
      ) : (
        <div className="grid gap-3">
          {lessons?.map((lesson, index) => (
            <Card key={lesson.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="p-2 bg-muted rounded-lg">
                      <Video className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{lesson.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {lesson.content_type === "video" ? "Vídeo" : lesson.content_type === "text" ? "Texto" : "Misto"}
                        </Badge>
                        {!lesson.is_active && (
                          <Badge variant="secondary">Inativa</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{(lesson.trainings as any)?.title}</span>
                        {lesson.duration_minutes > 0 && (
                          <>
                            <span>•</span>
                            <span>{lesson.duration_minutes} min</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(lesson)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        if (confirm("Excluir esta aula?")) {
                          deleteMutation.mutate(lesson.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Comments Tab Component
const CommentsTab = () => {
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useQuery({
    queryKey: ["training-comments-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_comments")
        .select("*, training_lessons(title, trainings(title)), profiles:user_id(name, avatar_url)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const pendingComments = comments?.filter(c => !c.is_approved) || [];
  const approvedComments = comments?.filter(c => c.is_approved) || [];

  const approveMutation = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      if (approve) {
        const { error } = await supabase
          .from("training_comments")
          .update({ is_approved: true, approved_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("training_comments")
          .delete()
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: (_, { approve }) => {
      queryClient.invalidateQueries({ queryKey: ["training-comments-admin"] });
      toast.success(approve ? "Comentário aprovado!" : "Comentário rejeitado!");
    }
  });

  const CommentCard = ({ comment, showActions = false }: { comment: any; showActions?: boolean }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span className="font-medium text-foreground">{(comment.profiles as any)?.name || "Usuário"}</span>
              <span>•</span>
              <span>{format(new Date(comment.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
            </div>
            <p className="text-sm mb-2">{comment.content}</p>
            <div className="text-xs text-muted-foreground">
              <span>{(comment.training_lessons as any)?.trainings?.title}</span>
              <ChevronRight className="inline h-3 w-3 mx-1" />
              <span>{(comment.training_lessons as any)?.title}</span>
            </div>
          </div>
          {showActions && (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-green-600"
                onClick={() => approveMutation.mutate({ id: comment.id, approve: true })}
                disabled={approveMutation.isPending}
              >
                <Check className="h-4 w-4 mr-1" />
                Aprovar
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-destructive"
                onClick={() => approveMutation.mutate({ id: comment.id, approve: false })}
                disabled={approveMutation.isPending}
              >
                <X className="h-4 w-4 mr-1" />
                Rejeitar
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Pendentes de Aprovação
          {pendingComments.length > 0 && (
            <Badge variant="destructive">{pendingComments.length}</Badge>
          )}
        </h3>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : pendingComments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            Nenhum comentário pendente
          </div>
        ) : (
          <div className="grid gap-3">
            {pendingComments.map((comment) => (
              <CommentCard key={comment.id} comment={comment} showActions />
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Comentários Aprovados</h3>
        {approvedComments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            Nenhum comentário aprovado ainda
          </div>
        ) : (
          <div className="grid gap-3">
            {approvedComments.slice(0, 10).map((comment) => (
              <CommentCard key={comment.id} comment={comment} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Main Admin Training Page
const AdminTraining = () => {
  const [activeTab, setActiveTab] = useState("categories");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterTrainingId, setFilterTrainingId] = useState("");

  const handleViewTrainings = (categoryId: string) => {
    setFilterCategoryId(categoryId);
    setActiveTab("trainings");
  };

  const handleViewLessons = (trainingId: string) => {
    setFilterTrainingId(trainingId);
    setActiveTab("lessons");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Treinamentos</h1>
        <p className="text-muted-foreground">
          Gerencie categorias, treinamentos e aulas da plataforma
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="comments">Comentários</TabsTrigger>
        </TabsList>
        
        <TabsContent value="categories" className="mt-6">
          <CategoriesTab onViewTrainings={handleViewTrainings} />
        </TabsContent>
        
        <TabsContent value="trainings" className="mt-6">
          <TrainingsTab filterCategoryId={filterCategoryId} onViewLessons={handleViewLessons} />
        </TabsContent>
        
        <TabsContent value="lessons" className="mt-6">
          <LessonsTab filterTrainingId={filterTrainingId} />
        </TabsContent>
        
        <TabsContent value="comments" className="mt-6">
          <CommentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminTraining;
