import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  avatar_url: string | null;
  rating: number;
  is_active: boolean;
  order_position: number;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  is_active: boolean;
  order_position: number;
}

const SortableTestimonialRow = ({ testimonial, onEdit, onDelete }: { 
  testimonial: Testimonial; 
  onEdit: (t: Testimonial) => void;
  onDelete: (id: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: testimonial.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <button className="cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>
        <TableCell>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={testimonial.avatar_url || undefined} alt={testimonial.name} />
              <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span>{testimonial.name}</span>
          </div>
        </TableCell>
      <TableCell>{testimonial.role}</TableCell>
      <TableCell>{"⭐".repeat(testimonial.rating)}</TableCell>
      <TableCell>
        <Badge variant={testimonial.is_active ? "default" : "secondary"}>
          {testimonial.is_active ? "Ativo" : "Inativo"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(testimonial)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(testimonial.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

const SortableFaqRow = ({ faq, onEdit, onDelete }: { 
  faq: FAQ; 
  onEdit: (f: FAQ) => void;
  onDelete: (id: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: faq.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <button className="cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>
      <TableCell>
        <div className="space-y-2">
          <p className="font-bold">{faq.question}</p>
          <p className="text-sm text-muted-foreground">{faq.answer}</p>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={faq.is_active ? "default" : "secondary"}>
          {faq.is_active ? "Ativo" : "Inativo"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(faq)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(faq.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

const AdminLandingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [showTestimonialForm, setShowTestimonialForm] = useState(false);
  const [showFaqForm, setShowFaqForm] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);

  const [testimonialForm, setTestimonialForm] = useState({
    name: "",
    role: "",
    content: "",
    avatar_url: "",
    rating: 5,
    is_active: true,
  });

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [faqForm, setFaqForm] = useState({
    question: "",
    answer: "",
    is_active: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchTestimonials();
    fetchFaqs();
  }, []);

  const fetchTestimonials = async () => {
    const { data } = await (supabase as any)
      .from("landing_testimonials")
      .select("*")
      .order("order_position");
    if (data) setTestimonials(data as Testimonial[]);
  };

  const fetchFaqs = async () => {
    const { data } = await (supabase as any)
      .from("landing_faqs")
      .select("*")
      .order("order_position");
    if (data) setFaqs(data as FAQ[]);
  };

  const resetTestimonialForm = () => {
    setTestimonialForm({
      name: "",
      role: "",
      content: "",
      avatar_url: "",
      rating: 5,
      is_active: true,
    });
    setEditingTestimonial(null);
    setShowTestimonialForm(false);
  };

  const resetFaqForm = () => {
    setFaqForm({
      question: "",
      answer: "",
      is_active: true,
    });
    setEditingFaq(null);
    setShowFaqForm(false);
  };

  const handleSaveTestimonial = async () => {
    if (!testimonialForm.name || !testimonialForm.role || !testimonialForm.content) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (editingTestimonial) {
      const { error } = await (supabase as any)
        .from("landing_testimonials")
        .update(testimonialForm)
        .eq("id", editingTestimonial.id);

      if (error) {
        toast({
          title: "Erro ao atualizar",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Depoimento atualizado!"
      });
    } else {
      const maxOrder = testimonials.length > 0 
        ? Math.max(...testimonials.map(t => t.order_position))
        : -1;

      const { error } = await (supabase as any)
        .from("landing_testimonials")
        .insert([{ ...testimonialForm, order_position: maxOrder + 1 }]);

      if (error) {
        toast({
          title: "Erro ao criar",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Depoimento criado!"
      });
    }

    resetTestimonialForm();
    fetchTestimonials();
  };

  const handleSaveFaq = async () => {
    if (!faqForm.question || !faqForm.answer) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (editingFaq) {
      const { error } = await (supabase as any)
        .from("landing_faqs")
        .update(faqForm)
        .eq("id", editingFaq.id);

      if (error) {
        toast({
          title: "Erro ao atualizar",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "FAQ atualizada!"
      });
    } else {
      const maxOrder = faqs.length > 0 
        ? Math.max(...faqs.map(f => f.order_position))
        : -1;

      const { error } = await (supabase as any)
        .from("landing_faqs")
        .insert([{ ...faqForm, order_position: maxOrder + 1 }]);

      if (error) {
        toast({
          title: "Erro ao criar",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "FAQ criada!"
      });
    }

    resetFaqForm();
    fetchFaqs();
  };

  const handleDeleteTestimonial = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este depoimento?")) return;

    const { error } = await (supabase as any)
      .from("landing_testimonials")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Depoimento excluído!"
    });
    fetchTestimonials();
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta FAQ?")) return;

    const { error } = await (supabase as any)
      .from("landing_faqs")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "FAQ excluída!"
    });
    fetchFaqs();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma imagem válida",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 2MB",
        variant: "destructive"
      });
      return;
    }

    setUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `testimonials/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setTestimonialForm({ ...testimonialForm, avatar_url: publicUrl });

      toast({
        title: "Sucesso",
        description: "Imagem enviada com sucesso!"
      });
    } catch (error: any) {
      toast({
        title: "Erro ao fazer upload",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const editTestimonial = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setTestimonialForm({
      name: testimonial.name,
      role: testimonial.role,
      content: testimonial.content,
      avatar_url: testimonial.avatar_url || "",
      rating: testimonial.rating,
      is_active: testimonial.is_active,
    });
    setShowTestimonialForm(true);
  };

  const editFaq = (faq: FAQ) => {
    setEditingFaq(faq);
    setFaqForm({
      question: faq.question,
      answer: faq.answer,
      is_active: faq.is_active,
    });
    setShowFaqForm(true);
  };

  const handleDragEndTestimonials = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = testimonials.findIndex((t) => t.id === active.id);
    const newIndex = testimonials.findIndex((t) => t.id === over.id);

    const newTestimonials = arrayMove(testimonials, oldIndex, newIndex);
    setTestimonials(newTestimonials);

    // Update order_position for all items
    const updates = newTestimonials.map((testimonial, index) => 
      (supabase as any)
        .from("landing_testimonials")
        .update({ order_position: index })
        .eq("id", testimonial.id)
    );

    await Promise.all(updates);

    toast({
      title: "Sucesso",
      description: "Ordem atualizada!"
    });
  };

  const handleDragEndFaqs = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = faqs.findIndex((f) => f.id === active.id);
    const newIndex = faqs.findIndex((f) => f.id === over.id);

    const newFaqs = arrayMove(faqs, oldIndex, newIndex);
    setFaqs(newFaqs);

    // Update order_position for all items
    const updates = newFaqs.map((faq, index) => 
      (supabase as any)
        .from("landing_faqs")
        .update({ order_position: index })
        .eq("id", faq.id)
    );

    await Promise.all(updates);

    toast({
      title: "Sucesso",
      description: "Ordem atualizada!"
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuração da Landing Page</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie os depoimentos e perguntas frequentes da sua landing page
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/landing')}
        >
          Ir para Landing Page
        </Button>
      </div>

      <Tabs defaultValue="testimonials" className="w-full">
        <TabsList>
          <TabsTrigger value="testimonials">Depoimentos</TabsTrigger>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
        </TabsList>

        <TabsContent value="testimonials" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Depoimentos</CardTitle>
                  <CardDescription>Gerencie os depoimentos de clientes. Arraste para reordenar.</CardDescription>
                </div>
                <Button
                  onClick={() => setShowTestimonialForm(!showTestimonialForm)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {showTestimonialForm ? "Cancelar" : "Novo Depoimento"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showTestimonialForm && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {editingTestimonial ? "Editar Depoimento" : "Novo Depoimento"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Nome *</Label>
                        <Input
                          id="name"
                          value={testimonialForm.name}
                          onChange={(e) => setTestimonialForm({ ...testimonialForm, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="role">Cargo/Função *</Label>
                        <Input
                          id="role"
                          value={testimonialForm.role}
                          onChange={(e) => setTestimonialForm({ ...testimonialForm, role: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="content">Depoimento *</Label>
                      <Textarea
                        id="content"
                        value={testimonialForm.content}
                        onChange={(e) => setTestimonialForm({ ...testimonialForm, content: e.target.value })}
                        rows={4}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="avatar_upload">Avatar</Label>
                        <Input
                          id="avatar_upload"
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          disabled={uploadingAvatar}
                        />
                        {uploadingAvatar && (
                          <p className="text-sm text-muted-foreground mt-1">Enviando imagem...</p>
                        )}
                        {testimonialForm.avatar_url && !uploadingAvatar && (
                          <div className="mt-2">
                            <img 
                              src={testimonialForm.avatar_url} 
                              alt="Preview" 
                              className="h-16 w-16 rounded-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="rating">Avaliação (1-5)</Label>
                        <Input
                          id="rating"
                          type="number"
                          min="1"
                          max="5"
                          value={testimonialForm.rating}
                          onChange={(e) => setTestimonialForm({ ...testimonialForm, rating: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="active"
                        checked={testimonialForm.is_active}
                        onCheckedChange={(checked) => setTestimonialForm({ ...testimonialForm, is_active: checked })}
                      />
                      <Label htmlFor="active">Ativo</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveTestimonial}>
                        {editingTestimonial ? "Atualizar" : "Criar"}
                      </Button>
                      <Button variant="outline" onClick={resetTestimonialForm}>
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEndTestimonials}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Avaliação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext
                      items={testimonials.map(t => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {testimonials.map((testimonial) => (
                        <SortableTestimonialRow
                          key={testimonial.id}
                          testimonial={testimonial}
                          onEdit={editTestimonial}
                          onDelete={handleDeleteTestimonial}
                        />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faqs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Perguntas Frequentes</CardTitle>
                  <CardDescription>Gerencie as FAQs da landing page. Arraste para reordenar.</CardDescription>
                </div>
                <Button
                  onClick={() => setShowFaqForm(!showFaqForm)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {showFaqForm ? "Cancelar" : "Nova FAQ"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showFaqForm && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {editingFaq ? "Editar FAQ" : "Nova FAQ"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="question">Pergunta *</Label>
                      <Input
                        id="question"
                        value={faqForm.question}
                        onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="answer">Resposta *</Label>
                      <Textarea
                        id="answer"
                        value={faqForm.answer}
                        onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                        rows={4}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="faq_active"
                        checked={faqForm.is_active}
                        onCheckedChange={(checked) => setFaqForm({ ...faqForm, is_active: checked })}
                      />
                      <Label htmlFor="faq_active">Ativo</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveFaq}>
                        {editingFaq ? "Atualizar" : "Criar"}
                      </Button>
                      <Button variant="outline" onClick={resetFaqForm}>
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEndFaqs}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Pergunta e Resposta</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext
                      items={faqs.map(f => f.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {faqs.map((faq) => (
                        <SortableFaqRow
                          key={faq.id}
                          faq={faq}
                          onEdit={editFaq}
                          onDelete={handleDeleteFaq}
                        />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminLandingPage;
