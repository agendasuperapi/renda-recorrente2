import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, LayoutTemplate } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  nome: string;
  descricao: string | null;
  logo_light: string | null;
}

interface Testimonial {
  id: string;
  product_id: string;
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
  product_id: string;
  question: string;
  answer: string;
  is_active: boolean;
  order_position: number;
}

const AdminLandingPage = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [showDialog, setShowDialog] = useState(false);
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
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("nome");
    if (data) setProducts(data);
  };

  const fetchTestimonials = async (productId: string) => {
    const { data } = await (supabase as any)
      .from("landing_testimonials")
      .select("*")
      .eq("product_id", productId)
      .order("order_position");
    if (data) setTestimonials(data as Testimonial[]);
  };

  const fetchFaqs = async (productId: string) => {
    const { data } = await (supabase as any)
      .from("landing_faqs")
      .select("*")
      .eq("product_id", productId)
      .order("order_position");
    if (data) setFaqs(data as FAQ[]);
  };

  const openProductConfig = (product: Product) => {
    setSelectedProduct(product);
    setShowDialog(true);
    fetchTestimonials(product.id);
    fetchFaqs(product.id);
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
    if (!selectedProduct) return;

    const data = {
      ...testimonialForm,
      product_id: selectedProduct.id
    };

    const { error } = editingTestimonial
      ? await (supabase as any).from("landing_testimonials").update(data).eq("id", editingTestimonial.id)
      : await (supabase as any).from("landing_testimonials").insert(data);

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Sucesso",
        description: `Depoimento ${editingTestimonial ? "atualizado" : "criado"} com sucesso!`
      });
      fetchTestimonials(selectedProduct.id);
      resetTestimonialForm();
    }
  };

  const handleSaveFaq = async () => {
    if (!selectedProduct) return;

    const data = {
      ...faqForm,
      product_id: selectedProduct.id
    };

    const { error } = editingFaq
      ? await (supabase as any).from("landing_faqs").update(data).eq("id", editingFaq.id)
      : await (supabase as any).from("landing_faqs").insert([data]);

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Sucesso",
        description: `FAQ ${editingFaq ? "atualizada" : "criada"} com sucesso!`
      });
      fetchFaqs(selectedProduct.id);
      resetFaqForm();
    }
  };

  const handleDeleteTestimonial = async (id: string) => {
    const { error } = await (supabase as any).from("landing_testimonials").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Depoimento excluído!" });
      if (selectedProduct) fetchTestimonials(selectedProduct.id);
    }
  };

  const handleDeleteFaq = async (id: string) => {
    const { error } = await (supabase as any).from("landing_faqs").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "FAQ excluída!" });
      if (selectedProduct) fetchFaqs(selectedProduct.id);
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
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <LayoutTemplate className="w-8 h-8" />
        <h1 className="text-3xl font-bold">Landing Page</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <Card key={product.id} className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>{product.nome}</CardTitle>
              <CardDescription>{product.descricao || "Sem descrição"}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => openProductConfig(product)} className="w-full">
                Configurar Landing Page
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Landing Page - {selectedProduct?.nome}</DialogTitle>
            <DialogDescription>
              Gerencie depoimentos e perguntas frequentes para este produto
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="testimonials" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="testimonials">Depoimentos</TabsTrigger>
              <TabsTrigger value="faqs">Perguntas e Respostas</TabsTrigger>
            </TabsList>

            <TabsContent value="testimonials" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Depoimentos</h3>
                <Button onClick={() => setShowTestimonialForm(true)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Depoimento
                </Button>
              </div>

              {showTestimonialForm && (
                <Card>
                  <CardHeader>
                    <CardTitle>{editingTestimonial ? "Editar" : "Novo"} Depoimento</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Nome</Label>
                        <Input
                          value={testimonialForm.name}
                          onChange={(e) => setTestimonialForm({ ...testimonialForm, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Cargo/Função</Label>
                        <Input
                          value={testimonialForm.role}
                          onChange={(e) => setTestimonialForm({ ...testimonialForm, role: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Conteúdo</Label>
                      <Textarea
                        value={testimonialForm.content}
                        onChange={(e) => setTestimonialForm({ ...testimonialForm, content: e.target.value })}
                        rows={4}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Avatar URL (opcional)</Label>
                        <Input
                          value={testimonialForm.avatar_url}
                          onChange={(e) => setTestimonialForm({ ...testimonialForm, avatar_url: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Avaliação (1-5)</Label>
                        <Input
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
                        <Label>Ordem de Exibição</Label>
                        <Input
                          type="number"
                          value={testimonialForm.order_position}
                          onChange={(e) => setTestimonialForm({ ...testimonialForm, order_position: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={testimonialForm.is_active}
                          onCheckedChange={(checked) => setTestimonialForm({ ...testimonialForm, is_active: checked })}
                        />
                        <Label>Ativo</Label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveTestimonial}>Salvar</Button>
                      <Button onClick={resetTestimonialForm} variant="outline">Cancelar</Button>
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
                    <TableHead>Ordem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testimonials.map((testimonial) => (
                    <TableRow key={testimonial.id}>
                      <TableCell>{testimonial.name}</TableCell>
                      <TableCell>{testimonial.role}</TableCell>
                      <TableCell>⭐ {testimonial.rating}</TableCell>
                      <TableCell>{testimonial.order_position}</TableCell>
                      <TableCell>
                        <Badge variant={testimonial.is_active ? "default" : "secondary"}>
                          {testimonial.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => editTestimonial(testimonial)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteTestimonial(testimonial.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="faqs" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Perguntas e Respostas</h3>
                <Button onClick={() => setShowFaqForm(true)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar FAQ
                </Button>
              </div>

              {showFaqForm && (
                <Card>
                  <CardHeader>
                    <CardTitle>{editingFaq ? "Editar" : "Nova"} Pergunta</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Pergunta</Label>
                      <Input
                        value={faqForm.question}
                        onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Resposta</Label>
                      <Textarea
                        value={faqForm.answer}
                        onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                        rows={4}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Ordem de Exibição</Label>
                        <Input
                          type="number"
                          value={faqForm.order_position}
                          onChange={(e) => setFaqForm({ ...faqForm, order_position: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={faqForm.is_active}
                          onCheckedChange={(checked) => setFaqForm({ ...faqForm, is_active: checked })}
                        />
                        <Label>Ativo</Label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveFaq}>Salvar</Button>
                      <Button onClick={resetFaqForm} variant="outline">Cancelar</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pergunta</TableHead>
                    <TableHead>Ordem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faqs.map((faq) => (
                    <TableRow key={faq.id}>
                      <TableCell>{faq.question}</TableCell>
                      <TableCell>{faq.order_position}</TableCell>
                      <TableCell>
                        <Badge variant={faq.is_active ? "default" : "secondary"}>
                          {faq.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => editFaq(faq)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteFaq(faq.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLandingPage;
