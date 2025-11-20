import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Star, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  avatar_url: string | null;
  rating: number;
  order_position: number;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  order_position: number;
}

export default function LandingTestimonials() {
  const navigate = useNavigate();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch testimonials
    const { data: testimonialsData } = await supabase
      .from("landing_testimonials")
      .select("*")
      .eq("is_active", true)
      .order("order_position", { ascending: true });

    // Fetch FAQs
    const { data: faqsData } = await supabase
      .from("landing_faqs")
      .select("*")
      .eq("is_active", true)
      .order("order_position", { ascending: true });

    if (testimonialsData) setTestimonials(testimonialsData);
    if (faqsData) setFaqs(faqsData);
    
    setLoading(false);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-5 w-5 ${
              i < rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Nossa Plataforma</h2>
          <Button variant="default" onClick={() => navigate("/auth")}>
            Começar Agora
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 md:py-32 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Transforme seu Negócio com Nossa Plataforma
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
            A solução completa para gerenciar afiliados, comissões e vendas de forma simples e eficiente
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8">
              Começar Gratuitamente
            </Button>
            <Button size="lg" variant="outline" onClick={() => {
              document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' });
            }} className="text-lg px-8">
              Ver Depoimentos
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Recursos Poderosos
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Tudo que você precisa para gerenciar seu programa de afiliados
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Gestão de Afiliados</h3>
                <p className="text-muted-foreground">
                  Gerencie todos os seus afiliados em um só lugar com ferramentas intuitivas
                </p>
              </CardContent>
            </Card>
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Comissões Automatizadas</h3>
                <p className="text-muted-foreground">
                  Sistema automático de cálculo e pagamento de comissões em tempo real
                </p>
              </CardContent>
            </Card>
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Relatórios Detalhados</h3>
                <p className="text-muted-foreground">
                  Acompanhe o desempenho com dashboards e relatórios completos
                </p>
              </CardContent>
            </Card>
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Cupons Personalizados</h3>
                <p className="text-muted-foreground">
                  Crie e gerencie cupons de desconto para seus afiliados
                </p>
              </CardContent>
            </Card>
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Suporte Dedicado</h3>
                <p className="text-muted-foreground">
                  Equipe pronta para ajudar você a ter sucesso na plataforma
                </p>
              </CardContent>
            </Card>
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Integração Fácil</h3>
                <p className="text-muted-foreground">
                  Integre facilmente com suas ferramentas e plataformas favoritas
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      {testimonials.length > 0 && (
        <section id="testimonials" className="py-20 px-4 bg-muted/30">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                O Que Nossos Clientes Dizem
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Histórias reais de sucesso de quem já usa nossa plataforma
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((testimonial) => (
                <Card key={testimonial.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={testimonial.avatar_url || undefined}
                          alt={testimonial.name}
                        />
                        <AvatarFallback>
                          {testimonial.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold">{testimonial.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                    {renderStars(testimonial.rating)}
                    <p className="mt-4 text-muted-foreground">
                      "{testimonial.content}"
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQs Section */}
      {faqs.length > 0 && (
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-3xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                Perguntas Frequentes
              </h2>
              <p className="text-xl text-muted-foreground">
                Tire suas dúvidas sobre a plataforma
              </p>
            </div>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={faq.id} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-24 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Pronto para Começar?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Junte-se a centenas de empresas que já transformaram seus programas de afiliados
          </p>
          <Button size="lg" variant="secondary" onClick={() => navigate("/auth")} className="text-lg px-8">
            Criar Conta Gratuita
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t bg-muted/30">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg mb-4">Sobre</h3>
              <p className="text-muted-foreground">
                A plataforma completa para gerenciar seu programa de afiliados com eficiência e transparência.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Links Rápidos</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Button variant="link" className="p-0 h-auto" onClick={() => navigate("/terms")}>Termos de Serviço</Button></li>
                <li><Button variant="link" className="p-0 h-auto" onClick={() => navigate("/privacy")}>Política de Privacidade</Button></li>
                <li><Button variant="link" className="p-0 h-auto" onClick={() => navigate("/auth")}>Login</Button></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Contato</h3>
              <p className="text-muted-foreground">
                Entre em contato conosco para saber mais sobre a plataforma
              </p>
            </div>
          </div>
          <div className="text-center pt-8 border-t text-muted-foreground">
            <p>&copy; 2024 Todos os direitos reservados</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
