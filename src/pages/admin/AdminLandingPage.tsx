import { useState, useEffect } from "react";
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
import { Pencil, Trash2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

const AdminLandingPage = () => {
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
    order_position: 0
  });

  const [faqForm, setFaqForm] = useState({
    question: "",
    answer: "",
    is_active: true,
    order_position: 0
  });

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
      order_position: 0
    });
    setEditingTestimonial(null);
    setShowTestimonialForm(false);
  };

  const resetFaqForm = () => {
    setFaqForm({
      question: "",
      answer: "",
      is_active: true,
      order_position: 0
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
      const { error } = await (supabase as any)
        .from("landing_testimonials")
        .insert([testimonialForm]);

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
      const { error } = await (supabase as any)
        .from("landing_faqs")
        .insert([faqForm]);

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

  const editTestimonial = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setTestimonialForm({
      name: testimonial.name,
      role: testimonial.role,
      content: testimonial.content,
      avatar_url: testimonial.avatar_url || "",
      rating: testimonial.rating,
      is_active: testimonial.is_active,
      order_position: testimonial.order_position
    });
    setShowTestimonialForm(true);
  };

  const editFaq = (faq: FAQ) => {
    setEditingFaq(faq);
    setFaqForm({
      question: faq.question,
      answer: faq.answer,
      is_active: faq.is_active,
      order_position: faq.order_position
    });
    setShowFaqForm(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuração da Landing Page</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie os depoimentos e perguntas frequentes da sua landing page
        </p>
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
                  <CardDescription>Gerencie os depoimentos de clientes</CardDescription>
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
                        <Label htmlFor="avatar_url">URL do Avatar</Label>
                        <Input
                          id="avatar_url"
                          value={testimonialForm.avatar_url}
                          onChange={(e) => setTestimonialForm({ ...testimonialForm, avatar_url: e.target.value })}
                        />
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
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="order">Ordem</Label>
                        <Input
                          id="order"
                          type="number"
                          value={testimonialForm.order_position}
                          onChange={(e) => setTestimonialForm({ ...testimonialForm, order_position: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="flex items-center space-x-2 pt-8">
                        <Switch
                          id="active"
                          checked={testimonialForm.is_active}
                          onCheckedChange={(checked) => setTestimonialForm({ ...testimonialForm, is_active: checked })}
                        />
                        <Label htmlFor="active">Ativo</Label>
                      </div>
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

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Avaliação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ordem</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testimonials.map((testimonial) => (
                    <TableRow key={testimonial.id}>
                      <TableCell>{testimonial.name}</TableCell>
                      <TableCell>{testimonial.role}</TableCell>
                      <TableCell>{"⭐".repeat(testimonial.rating)}</TableCell>
                      <TableCell>
                        <Badge variant={testimonial.is_active ? "default" : "secondary"}>
                          {testimonial.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>{testimonial.order_position}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => editTestimonial(testimonial)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTestimonial(testimonial.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faqs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Perguntas Frequentes</CardTitle>
                  <CardDescription>Gerencie as FAQs da landing page</CardDescription>
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
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="faq_order">Ordem</Label>
                        <Input
                          id="faq_order"
                          type="number"
                          value={faqForm.order_position}
                          onChange={(e) => setFaqForm({ ...faqForm, order_position: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="flex items-center space-x-2 pt-8">
                        <Switch
                          id="faq_active"
                          checked={faqForm.is_active}
                          onCheckedChange={(checked) => setFaqForm({ ...faqForm, is_active: checked })}
                        />
                        <Label htmlFor="faq_active">Ativo</Label>
                      </div>
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

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pergunta e Resposta</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ordem</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faqs.map((faq) => (
                    <TableRow key={faq.id}>
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
                      <TableCell>{faq.order_position}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => editFaq(faq)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteFaq(faq.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminLandingPage;
