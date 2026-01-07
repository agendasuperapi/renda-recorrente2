import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FolderOpen, BookOpen, Video, MessageSquare, Check, X, Eye, GripVertical, ChevronRight, Clock, Users, Star, FileText, ArrowRight, ChevronDown, ChevronUp, Image, ImagePlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RichTextEditor } from "@/components/training/RichTextEditor";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { ImageEditorDialog } from "@/components/admin/ImageEditorDialog";
import { cn } from "@/lib/utils";

// Categories Tab Component
const CategoriesTab = ({ onViewTrainings }: { onViewTrainings: (categoryId: string) => void }) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "BookOpen",
    cover_image_url: "",
    banner_url: "",
    banner_config: null as any,
    banner_text_config: null as any,
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
    setFormData({ name: "", description: "", icon: "BookOpen", cover_image_url: "", banner_url: "", banner_config: null, banner_text_config: null, is_active: true });
    setEditingCategory(null);
  };

  const openEdit = (category: any) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      icon: category.icon || "BookOpen",
      cover_image_url: category.cover_image_url || "",
      banner_url: category.banner_url || "",
      banner_config: category.banner_config || null,
      banner_text_config: category.banner_text_config || null,
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
              <ImageUpload
                label="Imagem de Capa"
                value={formData.cover_image_url}
                onChange={(url) => setFormData({ ...formData, cover_image_url: url })}
                folder="categories/covers"
                hint="Imagem do card (recomendado: 400x225px)"
                editorValue={{
                  imageUrl: formData.cover_image_url,
                  title: formData.banner_config?.title || "",
                  subtitle: formData.banner_config?.subtitle || "",
                  textColor: formData.banner_config?.textColor || "#ffffff",
                  textAlign: formData.banner_config?.textAlign || "center",
                  overlayColor: formData.banner_config?.overlayColor || "#000000",
                  overlayOpacity: formData.banner_config?.overlayOpacity ?? 40,
                }}
                onEditorChange={(value) => setFormData({
                  ...formData,
                  cover_image_url: value.imageUrl,
                  banner_config: {
                    title: value.title,
                    subtitle: value.subtitle,
                    textColor: value.textColor,
                    textAlign: value.textAlign,
                    overlayColor: value.overlayColor,
                    overlayOpacity: value.overlayOpacity,
                  }
                })}
              />
              <ImageUpload
                label="Banner"
                value={formData.banner_url}
                onChange={(url) => setFormData({ ...formData, banner_url: url })}
                folder="categories/banners"
                aspectRatio="aspect-[3/1]"
                hint="Banner para o topo da página (recomendado: 1200x400px)"
                showEditor={true}
                editorValue={{
                  imageUrl: formData.banner_url,
                  title: formData.banner_text_config?.title || "",
                  subtitle: formData.banner_text_config?.subtitle || "",
                  textColor: formData.banner_text_config?.textColor || "#ffffff",
                  textAlign: formData.banner_text_config?.textAlign || "center",
                  overlayColor: formData.banner_text_config?.overlayColor || "#000000",
                  overlayOpacity: formData.banner_text_config?.overlayOpacity ?? 40,
                }}
                onEditorChange={(value) => setFormData({
                  ...formData,
                  banner_url: value.imageUrl,
                  banner_text_config: {
                    title: value.title,
                    subtitle: value.subtitle,
                    textColor: value.textColor,
                    textAlign: value.textAlign,
                    overlayColor: value.overlayColor,
                    overlayOpacity: value.overlayOpacity,
                  }
                })}
              />
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories?.map((category) => (
            <Card key={category.id} className={`overflow-hidden hover:shadow-lg transition-all group ${!category.is_active ? 'border-destructive/50 opacity-60' : ''}`}>
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
                    <FolderOpen className="h-12 w-12 text-primary/40" />
                  </div>
                )}
                
                {/* Overlay from banner_config - igual ao usuário */}
                {category.banner_config && (
                  <>
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundColor: (category.banner_config as any)?.overlayColor || "#000000",
                        opacity: ((category.banner_config as any)?.overlayOpacity ?? 40) / 100
                      }}
                    />
                    {((category.banner_config as any)?.title || (category.banner_config as any)?.subtitle) && (
                      <div className={`absolute inset-0 flex flex-col justify-center px-4 ${
                        (category.banner_config as any)?.textAlign === "left" ? "items-start text-left" :
                        (category.banner_config as any)?.textAlign === "right" ? "items-end text-right" :
                        "items-center text-center"
                      }`}>
                        {(category.banner_config as any)?.title && (
                          <h4
                            className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight"
                            style={{ color: (category.banner_config as any)?.textColor || "#ffffff" }}
                          >
                            {(category.banner_config as any).title}
                          </h4>
                        )}
                        {(category.banner_config as any)?.subtitle && (
                          <p
                            className="mt-1 text-lg sm:text-xl opacity-90 line-clamp-2"
                            style={{ color: (category.banner_config as any)?.textColor || "#ffffff" }}
                          >
                            {(category.banner_config as any).subtitle}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
                
                {!category.is_active && (
                  <Badge variant="destructive" className="absolute top-2 right-2 z-10">Inativa</Badge>
                )}
                {category.banner_url && (
                  <Badge variant="secondary" className="absolute top-2 left-2 gap-1 z-10">
                    <Image className="h-3 w-3" />
                    Banner
                  </Badge>
                )}
              </div>
              <CardContent className="p-4">
                <div className="mb-3">
                  <h3 className="font-semibold text-lg">{category.name}</h3>
                  {category.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {category.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onViewTrainings(category.id)}
                    className="gap-1"
                  >
                    <BookOpen className="h-4 w-4" />
                    Treinamentos
                    {trainingCounts?.[category.id] ? (
                      <Badge variant="secondary" className="ml-1">{trainingCounts[category.id]}</Badge>
                    ) : null}
                  </Button>
                  <div className="flex items-center gap-1">
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
    thumbnail_url: "",
    banner_url: "",
    banner_config: null as any,
    banner_text_config: null as any,
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
      thumbnail_url: "",
      banner_url: "",
      banner_config: null,
      banner_text_config: null,
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
      thumbnail_url: training.thumbnail_url || "",
      banner_url: training.banner_url || "",
      banner_config: training.banner_config || null,
      banner_text_config: training.banner_text_config || null,
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
              <ImageUpload
                label="Miniatura"
                value={formData.thumbnail_url}
                onChange={(url) => setFormData({ ...formData, thumbnail_url: url })}
                folder="trainings/thumbnails"
                hint="Imagem do card (recomendado: 400x225px)"
                editorValue={{
                  imageUrl: formData.thumbnail_url,
                  title: formData.banner_config?.title || "",
                  subtitle: formData.banner_config?.subtitle || "",
                  textColor: formData.banner_config?.textColor || "#ffffff",
                  textAlign: formData.banner_config?.textAlign || "center",
                  overlayColor: formData.banner_config?.overlayColor || "#000000",
                  overlayOpacity: formData.banner_config?.overlayOpacity ?? 40,
                }}
                onEditorChange={(value) => setFormData({
                  ...formData,
                  thumbnail_url: value.imageUrl,
                  banner_config: {
                    title: value.title,
                    subtitle: value.subtitle,
                    textColor: value.textColor,
                    textAlign: value.textAlign,
                    overlayColor: value.overlayColor,
                    overlayOpacity: value.overlayOpacity,
                  }
                })}
              />
              <ImageUpload
                label="Banner"
                value={formData.banner_url}
                onChange={(url) => setFormData({ ...formData, banner_url: url })}
                folder="trainings/banners"
                aspectRatio="aspect-[3/1]"
                hint="Banner da página (recomendado: 1200x400px)"
                showEditor={true}
                editorValue={{
                  imageUrl: formData.banner_url,
                  title: formData.banner_text_config?.title || "",
                  subtitle: formData.banner_text_config?.subtitle || "",
                  textColor: formData.banner_text_config?.textColor || "#ffffff",
                  textAlign: formData.banner_text_config?.textAlign || "center",
                  overlayColor: formData.banner_text_config?.overlayColor || "#000000",
                  overlayOpacity: formData.banner_text_config?.overlayOpacity ?? 40,
                }}
                onEditorChange={(value) => setFormData({
                  ...formData,
                  banner_url: value.imageUrl,
                  banner_text_config: {
                    title: value.title,
                    subtitle: value.subtitle,
                    textColor: value.textColor,
                    textAlign: value.textAlign,
                    overlayColor: value.overlayColor,
                    overlayOpacity: value.overlayOpacity,
                  }
                })}
              />
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trainings?.map((training) => (
            <Card key={training.id} className={`overflow-hidden hover:shadow-lg transition-all group ${!training.is_active ? 'opacity-60' : ''}`}>
              {/* Thumbnail */}
              <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
                {training.thumbnail_url ? (
                  <img 
                    src={training.thumbnail_url} 
                    alt={training.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-primary/40" />
                  </div>
                )}
                
                {/* Overlay from banner_config - igual ao usuário */}
                {training.banner_config && (
                  <>
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundColor: (training.banner_config as any)?.overlayColor || "#000000",
                        opacity: ((training.banner_config as any)?.overlayOpacity ?? 40) / 100
                      }}
                    />
                    {((training.banner_config as any)?.title || (training.banner_config as any)?.subtitle) && (
                      <div className={`absolute inset-0 flex flex-col justify-center px-4 ${
                        (training.banner_config as any)?.textAlign === "left" ? "items-start text-left" :
                        (training.banner_config as any)?.textAlign === "right" ? "items-end text-right" :
                        "items-center text-center"
                      }`}>
                        {(training.banner_config as any)?.title && (
                          <h4
                            className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight"
                            style={{ color: (training.banner_config as any)?.textColor || "#ffffff" }}
                          >
                            {(training.banner_config as any).title}
                          </h4>
                        )}
                        {(training.banner_config as any)?.subtitle && (
                          <p
                            className="mt-1 text-lg sm:text-xl opacity-90 line-clamp-2"
                            style={{ color: (training.banner_config as any)?.textColor || "#ffffff" }}
                          >
                            {(training.banner_config as any).subtitle}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
                
                <div className="absolute top-2 right-2 flex gap-1 z-10">
                  {training.is_published ? (
                    <Badge className="bg-green-500">Publicado</Badge>
                  ) : (
                    <Badge variant="secondary">Rascunho</Badge>
                  )}
                </div>
                {training.banner_url && (
                  <Badge variant="secondary" className="absolute top-2 left-2 gap-1 z-10">
                    <Image className="h-3 w-3" />
                    Banner
                  </Badge>
                )}
              </div>
              <CardContent className="p-4">
                <div className="mb-3">
                  <h3 className="font-semibold text-lg line-clamp-1">{training.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span>{(training.training_categories as any)?.name}</span>
                    {training.estimated_duration_minutes > 0 && (
                      <>
                        <span>•</span>
                        <span>{training.estimated_duration_minutes} min</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onViewLessons(training.id)}
                    className="gap-1"
                  >
                    <Video className="h-4 w-4" />
                    Aulas
                    {lessonCounts?.[training.id] ? (
                      <Badge variant="secondary" className="ml-1">{lessonCounts[training.id]}</Badge>
                    ) : null}
                  </Button>
                  <div className="flex items-center gap-1">
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
    thumbnail_url: "",
    banner_config: null as any,
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
      thumbnail_url: "",
      banner_config: null,
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
      thumbnail_url: lesson.thumbnail_url || "",
      banner_config: lesson.banner_config || null,
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
              <ImageUpload
                label="Miniatura"
                value={formData.thumbnail_url}
                onChange={(url) => setFormData({ ...formData, thumbnail_url: url })}
                folder="lessons/thumbnails"
                hint="Imagem do card da aula (recomendado: 400x225px)"
                editorValue={{
                  imageUrl: formData.thumbnail_url,
                  title: formData.banner_config?.title || "",
                  subtitle: formData.banner_config?.subtitle || "",
                  textColor: formData.banner_config?.textColor || "#ffffff",
                  textAlign: formData.banner_config?.textAlign || "center",
                  overlayColor: formData.banner_config?.overlayColor || "#000000",
                  overlayOpacity: formData.banner_config?.overlayOpacity ?? 40,
                }}
                onEditorChange={(value) => setFormData({
                  ...formData,
                  thumbnail_url: value.imageUrl,
                  banner_config: {
                    title: value.title,
                    subtitle: value.subtitle,
                    textColor: value.textColor,
                    textAlign: value.textAlign,
                    overlayColor: value.overlayColor,
                    overlayOpacity: value.overlayOpacity,
                  }
                })}
              />
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lessons?.map((lesson, index) => (
            <Card key={lesson.id} className={`overflow-hidden hover:shadow-lg transition-all group ${!lesson.is_active ? 'opacity-60' : ''}`}>
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
                    <Video className="h-12 w-12 text-primary/40" />
                  </div>
                )}
                {/* Banner config overlay */}
                {lesson.banner_config && (
                  <>
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundColor: (lesson.banner_config as any)?.overlayColor || "#000000",
                        opacity: ((lesson.banner_config as any)?.overlayOpacity ?? 40) / 100
                      }}
                    />
                    {((lesson.banner_config as any)?.title || (lesson.banner_config as any)?.subtitle) && (
                      <div className={`absolute inset-0 flex flex-col justify-center px-4 ${
                        (lesson.banner_config as any)?.textAlign === "left" ? "items-start text-left" :
                        (lesson.banner_config as any)?.textAlign === "right" ? "items-end text-right" :
                        "items-center text-center"
                      }`}>
                        {(lesson.banner_config as any)?.title && (
                          <h4
                            className="text-lg sm:text-xl md:text-2xl font-bold leading-tight line-clamp-2"
                            style={{ color: (lesson.banner_config as any)?.textColor || "#ffffff" }}
                          >
                            {(lesson.banner_config as any).title}
                          </h4>
                        )}
                        {(lesson.banner_config as any)?.subtitle && (
                          <p
                            className="mt-1 text-sm sm:text-base opacity-90 line-clamp-1"
                            style={{ color: (lesson.banner_config as any)?.textColor || "#ffffff" }}
                          >
                            {(lesson.banner_config as any).subtitle}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
                <div className="absolute top-2 left-2 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {index + 1}
                </div>
                <Badge variant="outline" className="absolute top-2 right-2 bg-background/80 text-xs">
                  {lesson.content_type === "video" ? "Vídeo" : lesson.content_type === "text" ? "Texto" : "Misto"}
                </Badge>
                {!lesson.is_active && (
                  <Badge variant="secondary" className="absolute bottom-2 right-2">Inativa</Badge>
                )}
              </div>
              <CardContent className="p-4">
                <div className="mb-3">
                  <h3 className="font-semibold line-clamp-1">{lesson.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span className="line-clamp-1">{(lesson.trainings as any)?.title}</span>
                    {lesson.duration_minutes > 0 && (
                      <>
                        <span>•</span>
                        <span>{lesson.duration_minutes} min</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1">
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
  const navigate = useNavigate();
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

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

  // Separate main comments (no parent) and replies
  const mainComments = comments?.filter(c => !c.parent_id) || [];
  const repliesByParent = comments?.reduce((acc: Record<string, any[]>, c) => {
    if (c.parent_id) {
      if (!acc[c.parent_id]) acc[c.parent_id] = [];
      acc[c.parent_id].push(c);
    }
    return acc;
  }, {}) || {};

  const pendingComments = mainComments.filter(c => !c.is_approved);
  const approvedComments = mainComments.filter(c => c.is_approved);

  // Group comments by Training > Lesson
  const groupCommentsByTrainingAndLesson = (commentsList: any[]) => {
    const grouped: Record<string, { trainingTitle: string; lessons: Record<string, { lessonTitle: string; lessonId: string; comments: any[] }> }> = {};
    
    commentsList.forEach(comment => {
      const trainingTitle = (comment.training_lessons as any)?.trainings?.title || "Sem Treinamento";
      const lessonTitle = (comment.training_lessons as any)?.title || "Sem Aula";
      const lessonId = comment.lesson_id;
      
      if (!grouped[trainingTitle]) {
        grouped[trainingTitle] = { trainingTitle, lessons: {} };
      }
      if (!grouped[trainingTitle].lessons[lessonId]) {
        grouped[trainingTitle].lessons[lessonId] = { lessonTitle, lessonId, comments: [] };
      }
      grouped[trainingTitle].lessons[lessonId].comments.push(comment);
    });
    
    return grouped;
  };

  const groupedPending = groupCommentsByTrainingAndLesson(pendingComments);
  const groupedApproved = groupCommentsByTrainingAndLesson(approvedComments);

  const toggleExpand = (commentId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

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

  const CommentItem = ({ comment, showActions = false }: { comment: any; showActions?: boolean }) => {
    const replies = repliesByParent[comment.id] || [];
    const isExpanded = expandedComments.has(comment.id);
    
    return (
      <div className="p-3 bg-muted/30 rounded-lg space-y-2">
        {/* Main Comment */}
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={(comment.profiles as any)?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {((comment.profiles as any)?.name || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm mb-1">
              <span className="font-medium">{(comment.profiles as any)?.name || "Usuário"}</span>
              <span className="text-muted-foreground text-xs">
                {format(new Date(comment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
            <p className="text-sm">{comment.content}</p>
            
            {/* Toggle replies button */}
            {replies.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs mt-2 text-muted-foreground hover:text-foreground"
                onClick={() => toggleExpand(comment.id)}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Ocultar {replies.length} resposta{replies.length > 1 ? 's' : ''}
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Ver {replies.length} resposta{replies.length > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            )}
          </div>
          
          {/* Actions */}
          {showActions && (
            <div className="flex items-center gap-2 flex-shrink-0">
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

        {/* Replies */}
        {isExpanded && replies.length > 0 && (
          <div className="ml-10 space-y-2 pt-2 border-l-2 border-primary/20 pl-4">
            {replies.map((reply: any) => (
              <div key={reply.id} className="flex gap-3 p-2 bg-background/50 rounded-lg">
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarImage src={(reply.profiles as any)?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {((reply.profiles as any)?.name || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm mb-1">
                    <span className="font-medium text-sm">{(reply.profiles as any)?.name || "Usuário"}</span>
                    <span className="text-muted-foreground text-xs">
                      {format(new Date(reply.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm">{reply.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const GroupedComments = ({ grouped, showActions = false }: { grouped: Record<string, { trainingTitle: string; lessons: Record<string, { lessonTitle: string; lessonId: string; comments: any[] }> }>; showActions?: boolean }) => (
    <div className="space-y-6">
      {Object.entries(grouped).map(([trainingKey, training]) => (
        <Card key={trainingKey} className="overflow-hidden">
          {/* Training Header */}
          <CardHeader className="py-3 bg-primary/10">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              {training.trainingTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {Object.entries(training.lessons).map(([lessonKey, lesson]) => (
              <div key={lessonKey} className="border-b last:border-b-0">
                {/* Lesson Header */}
                <div className="flex items-center justify-between px-4 py-2 bg-muted/50">
                  <div className="flex items-center gap-2 text-sm">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{lesson.lessonTitle}</span>
                    <Badge variant="secondary" className="text-xs">
                      {lesson.comments.length} comentário{lesson.comments.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => navigate(`/user/training/lesson/${lesson.lessonId}`)}
                  >
                    <ArrowRight className="h-3 w-3 mr-1" />
                    Ir para aula
                  </Button>
                </div>
                {/* Comments */}
                <div className="p-3 space-y-2">
                  {lesson.comments.map((comment) => (
                    <CommentItem key={comment.id} comment={comment} showActions={showActions} />
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
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
          <GroupedComments grouped={groupedPending} showActions />
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Comentários Aprovados</h3>
        {approvedComments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            Nenhum comentário aprovado ainda
          </div>
        ) : (
          <GroupedComments grouped={groupedApproved} />
        )}
      </div>
    </div>
  );
};

// Banner Preview Component with Text Overlay and Device Sizes
import { Smartphone, Tablet, Monitor } from "lucide-react";

type DevicePreview = "mobile" | "tablet" | "desktop";

const deviceDimensions = {
  mobile: { width: 375, height: 200, label: "Celular", icon: Smartphone },
  tablet: { width: 768, height: 280, label: "Tablet", icon: Tablet },
  desktop: { width: 1200, height: 350, label: "Computador", icon: Monitor },
};

interface BannerPreviewProps {
  imageUrl: string;
  title?: string;
  subtitle?: string;
  textColor?: string;
  textAlign?: "left" | "center" | "right";
  overlayColor?: string;
  overlayOpacity?: number;
  label: string;
}

const BannerPreview = ({
  imageUrl,
  title,
  subtitle,
  textColor = "#ffffff",
  textAlign = "center",
  overlayColor = "#000000",
  overlayOpacity = 40,
  label,
}: BannerPreviewProps) => {
  const [activeDevice, setActiveDevice] = useState<DevicePreview>("desktop");

  const getTextAlignClass = () => {
    switch (textAlign) {
      case "left":
        return "items-start text-left";
      case "right":
        return "items-end text-right";
      default:
        return "items-center text-center";
    }
  };

  const getPreviewStyle = () => {
    const device = deviceDimensions[activeDevice];
    return {
      width: "100%",
      maxWidth: device.width,
      aspectRatio: `${device.width} / ${device.height}`,
    };
  };

  const getTextSize = () => {
    switch (activeDevice) {
      case "mobile":
        return { title: "text-lg", subtitle: "text-sm" };
      case "tablet":
        return { title: "text-2xl", subtitle: "text-base" };
      default:
        return { title: "text-3xl", subtitle: "text-lg" };
    }
  };

  const textSize = getTextSize();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex gap-1">
          {(Object.entries(deviceDimensions) as [DevicePreview, typeof deviceDimensions.mobile][]).map(([key, device]) => {
            const Icon = device.icon;
            return (
              <Button
                key={key}
                type="button"
                variant={activeDevice === key ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveDevice(key)}
                className="h-8 px-2"
              >
                <Icon className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{device.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {deviceDimensions[activeDevice].label} ({deviceDimensions[activeDevice].width}x{deviceDimensions[activeDevice].height}px)
      </p>

      <div className="flex justify-center bg-muted/30 p-4 rounded-lg border">
        <div
          className="relative overflow-hidden rounded-lg shadow-lg transition-all duration-300"
          style={getPreviewStyle()}
        >
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt={label}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Overlay */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: overlayColor,
                  opacity: overlayOpacity / 100,
                }}
              />
              {/* Text Content */}
              {(title || subtitle) && (
                <div
                  className={cn(
                    "absolute inset-0 flex flex-col justify-center p-4 sm:p-6",
                    getTextAlignClass()
                  )}
                >
                  {title && (
                    <h2
                      className={cn("font-bold leading-tight", textSize.title)}
                      style={{ color: textColor }}
                    >
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p
                      className={cn("mt-1 opacity-90", textSize.subtitle)}
                      style={{ color: textColor }}
                    >
                      {subtitle}
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 bg-muted flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma imagem definida</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Training Page Settings Tab
const SettingsTab = () => {
  const queryClient = useQueryClient();
  const [bannerData, setBannerData] = useState({
    imageUrl: "",
    title: "",
    subtitle: "",
    textColor: "#ffffff",
    textAlign: "center" as "left" | "center" | "right",
    overlayColor: "#000000",
    overlayOpacity: 40,
  });
  const [coverData, setCoverData] = useState({
    imageUrl: "",
    title: "",
    subtitle: "",
    textColor: "#ffffff",
    textAlign: "center" as "left" | "center" | "right",
    overlayColor: "#000000",
    overlayOpacity: 40,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [bannerEditorOpen, setBannerEditorOpen] = useState(false);
  const [coverEditorOpen, setCoverEditorOpen] = useState(false);

  // Fetch current settings
  const { data: settings } = useQuery({
    queryKey: ["training-page-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .in("key", [
          "training_page_cover_url",
          "training_page_banner_url",
          "training_page_banner_config",
          "training_page_cover_config"
        ]);
      if (error) throw error;
      return data;
    }
  });

  React.useEffect(() => {
    if (settings) {
      const coverUrl = settings.find(s => s.key === "training_page_cover_url");
      const bannerUrl = settings.find(s => s.key === "training_page_banner_url");
      const bannerConfig = settings.find(s => s.key === "training_page_banner_config");
      const coverConfig = settings.find(s => s.key === "training_page_cover_config");

      const parsedBannerConfig = bannerConfig?.value ? JSON.parse(bannerConfig.value) : {};
      const parsedCoverConfig = coverConfig?.value ? JSON.parse(coverConfig.value) : {};

      setBannerData({
        imageUrl: bannerUrl?.value || "",
        title: parsedBannerConfig.title || "",
        subtitle: parsedBannerConfig.subtitle || "",
        textColor: parsedBannerConfig.textColor || "#ffffff",
        textAlign: parsedBannerConfig.textAlign || "center",
        overlayColor: parsedBannerConfig.overlayColor || "#000000",
        overlayOpacity: parsedBannerConfig.overlayOpacity ?? 40,
      });
      setCoverData({
        imageUrl: coverUrl?.value || "",
        title: parsedCoverConfig.title || "",
        subtitle: parsedCoverConfig.subtitle || "",
        textColor: parsedCoverConfig.textColor || "#ffffff",
        textAlign: parsedCoverConfig.textAlign || "center",
        overlayColor: parsedCoverConfig.overlayColor || "#000000",
        overlayOpacity: parsedCoverConfig.overlayOpacity ?? 40,
      });
      setIsLoading(false);
    }
  }, [settings]);

  const saveConfig = async (key: string, config: object) => {
    const { error } = await supabase
      .from("app_settings")
      .upsert({ 
        key, 
        value: JSON.stringify(config), 
        updated_at: new Date().toISOString() 
      }, { onConflict: "key" });
    if (error) {
      toast.error("Erro ao salvar configuração: " + error.message);
    }
  };

  const saveUrl = async (key: string, url: string) => {
    const { error } = await supabase
      .from("app_settings")
      .upsert({ 
        key, 
        value: url, 
        updated_at: new Date().toISOString() 
      }, { onConflict: "key" });
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    }
  };

  const handleBannerSave = async (data: typeof bannerData) => {
    setBannerData(data);
    await saveUrl("training_page_banner_url", data.imageUrl);
    await saveConfig("training_page_banner_config", {
      title: data.title,
      subtitle: data.subtitle,
      textColor: data.textColor,
      textAlign: data.textAlign,
      overlayColor: data.overlayColor,
      overlayOpacity: data.overlayOpacity,
    });
    queryClient.invalidateQueries({ queryKey: ["training-page-settings"] });
    toast.success("Banner salvo com sucesso!");
  };

  const handleCoverSave = async (data: typeof coverData) => {
    setCoverData(data);
    await saveUrl("training_page_cover_url", data.imageUrl);
    await saveConfig("training_page_cover_config", {
      title: data.title,
      subtitle: data.subtitle,
      textColor: data.textColor,
      textAlign: data.textAlign,
      overlayColor: data.overlayColor,
      overlayOpacity: data.overlayOpacity,
    });
    queryClient.invalidateQueries({ queryKey: ["training-page-settings"] });
    toast.success("Capa salva com sucesso!");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-48 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Configurações da Página Principal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <p className="text-sm text-muted-foreground">
          Configure as imagens que aparecem no topo da página de treinamentos (/user/training).
          Clique em "Editar" para alterar a imagem, textos, cores e sobreposição.
        </p>

        {/* Banner Principal - Full Width Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Banner Principal</h3>
              <p className="text-xs text-muted-foreground">Proporção 16:9 - Exibido no topo da página</p>
            </div>
            <Button onClick={() => setBannerEditorOpen(true)} variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-2" />
              Editar Banner
            </Button>
          </div>
          <BannerPreview
            imageUrl={bannerData.imageUrl}
            title={bannerData.title}
            subtitle={bannerData.subtitle}
            textColor={bannerData.textColor}
            textAlign={bannerData.textAlign}
            overlayColor={bannerData.overlayColor}
            overlayOpacity={bannerData.overlayOpacity}
            label="Preview do Banner"
          />
        </div>

        <Separator />

        {/* Capa Alternativa - Full Width Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Capa Alternativa</h3>
              <p className="text-xs text-muted-foreground">Proporção 4:3 - Usada como fallback</p>
            </div>
            <Button onClick={() => setCoverEditorOpen(true)} variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-2" />
              Editar Capa
            </Button>
          </div>
          <BannerPreview
            imageUrl={coverData.imageUrl}
            title={coverData.title}
            subtitle={coverData.subtitle}
            textColor={coverData.textColor}
            textAlign={coverData.textAlign}
            overlayColor={coverData.overlayColor}
            overlayOpacity={coverData.overlayOpacity}
            label="Preview da Capa"
          />
        </div>

        {/* Banner Editor Dialog */}
        <ImageEditorDialog
          open={bannerEditorOpen}
          onOpenChange={setBannerEditorOpen}
          value={bannerData}
          onSave={handleBannerSave}
          title="Editar Banner Principal"
          bucket="training-images"
          folder="training-page"
        />

        {/* Cover Editor Dialog */}
        <ImageEditorDialog
          open={coverEditorOpen}
          onOpenChange={setCoverEditorOpen}
          value={coverData}
          onSave={handleCoverSave}
          title="Editar Capa Alternativa"
          bucket="training-images"
          folder="training-page"
        />
      </CardContent>
    </Card>
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="comments">Comentários</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
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

        <TabsContent value="settings" className="mt-6">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminTraining;
