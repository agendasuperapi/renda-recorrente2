import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Target, TrendingUp, Users, DollarSign, Share2, GraduationCap, UserPlus,
  Megaphone, LayoutDashboard, FileText, Award, Shield, Clock, Zap,
  CheckCircle2, Star, MessageSquare
} from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import logo from "@/assets/logo.png";

const PRODUCT_ID = "bb582482-b006-47b8-b6ea-a6944d8cfdfd";

interface Plan {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  billing_period: string;
  description: string | null;
  features: string[];
}

interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  avatar_url: string | null;
  rating: number;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

const defaultTestimonials: Testimonial[] = [
  {
    id: "1",
    name: "Maria Silva",
    role: "Afiliada há 6 meses",
    content: "Consegui criar uma renda extra excelente! O sistema é muito fácil de usar e o suporte é ótimo.",
    avatar_url: null,
    rating: 5
  },
  {
    id: "2",
    name: "João Santos",
    role: "Afiliado há 1 ano",
    content: "A comissão recorrente mudou minha vida. Todo mês recebo pelas indicações antigas e novas.",
    avatar_url: null,
    rating: 5
  },
  {
    id: "3",
    name: "Ana Costa",
    role: "Afiliada há 3 meses",
    content: "Plataforma profissional e completa. Já indiquei para vários amigos e todos adoraram!",
    avatar_url: null,
    rating: 5
  }
];

const defaultFaqs: FAQ[] = [
  {
    id: "1",
    question: "Como funciona a comissão recorrente?",
    answer: "Você recebe comissão todos os meses enquanto o cliente mantiver a assinatura ativa. Isso significa que uma única indicação pode gerar renda por meses ou até anos!"
  },
  {
    id: "2",
    question: "Preciso pagar para ser afiliado?",
    answer: "Não! Você pode começar com o plano FREE gratuitamente. Só precisa se cadastrar e começar a divulgar seu link."
  },
  {
    id: "3",
    question: "Como recebo minhas comissões?",
    answer: "As comissões ficam disponíveis para saque quando atingem o valor mínimo. Você pode solicitar o saque através do painel e receber via PIX."
  },
  {
    id: "4",
    question: "Quanto posso ganhar como afiliado?",
    answer: "Seus ganhos dependem do número de indicações e do plano que cada cliente assinar. Com comissão recorrente, quanto mais indicar, mais sua renda mensal cresce."
  },
  {
    id: "5",
    question: "Preciso ter experiência para ser afiliado?",
    answer: "Não! Oferecemos treinamento completo para você aprender a divulgar e maximizar seus resultados, mesmo sem experiência prévia."
  }
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(defaultTestimonials);
  const [faqs, setFaqs] = useState<FAQ[]>(defaultFaqs);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappText, setWhatsappText] = useState("");

  useEffect(() => {
    // Check auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Fetch plans
    fetchPlans();
    // Fetch testimonials
    fetchTestimonials();
    // Fetch FAQs
    fetchFaqs();
    // Fetch product info
    fetchProductInfo();

    return () => subscription.unsubscribe();
  }, []);

  const fetchPlans = async () => {
    const { data } = await supabase
      .from("plans")
      .select("*")
      .eq("product_id", PRODUCT_ID)
      .eq("is_active", true)
      .order("price");

    if (data) {
      setPlans(data.map((plan: any) => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features.map(String) : []
      })));
    }
  };

  const fetchTestimonials = async () => {
    const { data } = await (supabase as any)
      .from("landing_testimonials")
      .select("*")
      .eq("product_id", PRODUCT_ID)
      .eq("is_active", true)
      .order("order_position");

    if (data && data.length > 0) {
      setTestimonials(data as Testimonial[]);
    }
  };

  const fetchFaqs = async () => {
    const { data } = await (supabase as any)
      .from("landing_faqs")
      .select("*")
      .eq("product_id", PRODUCT_ID)
      .eq("is_active", true)
      .order("order_position");

    if (data && data.length > 0) {
      setFaqs(data as FAQ[]);
    }
  };

  const fetchProductInfo = async () => {
    const { data } = await supabase
      .from("products")
      .select("telefone, texto_telefone")
      .eq("id", PRODUCT_ID)
      .single();

    if (data) {
      setWhatsappPhone(data.telefone || "");
      setWhatsappText(data.texto_telefone || "");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const scrollToPlans = () => {
    document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" });
  };

  const getWhatsappUrl = () => {
    if (!whatsappPhone || !whatsappText) return "#";
    const encodedText = encodeURIComponent(whatsappText);
    return `https://api.whatsapp.com/send/?phone=${whatsappPhone}&text=${encodedText}&type=phone_number&app_absent=0`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="APP Renda Recorrente" className="h-8" />
            <span className="font-bold text-lg">Renda Recorrente</span>
          </div>
          
          <div className="flex gap-2">
            {user ? (
              <>
                <Button onClick={() => navigate("/dashboard")} variant="outline">
                  Acessar Painel
                </Button>
                <Button onClick={handleLogout} variant="ghost">
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => navigate("/auth")} variant="outline">
                  Entrar
                </Button>
                <Button onClick={scrollToPlans}>
                  Quero Contratar
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-4" variant="secondary">
            <Star className="w-3 h-3 mr-1" />
            Sistema de Afiliados Premium
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Participe e ganhe dinheiro recomendando nossos aplicativos
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Temos vários produtos para você indicar e criar uma renda recorrente.
          </p>
          <Button size="lg" onClick={scrollToPlans} className="text-lg px-8">
            Começar Agora
            <Target className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Seja um Afiliado */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Seja um Afiliado
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <GraduationCap className="w-12 h-12 text-primary mb-2" />
                <CardTitle>Curso Completo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Disponibilizamos um curso explicando todo o processo de afiliação.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Award className="w-12 h-12 text-primary mb-2" />
                <CardTitle>Certificação</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Após a conclusão do curso você estará apto(a) a começar a divulgação.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Share2 className="w-12 h-12 text-primary mb-2" />
                <CardTitle>Divulgue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Compartilhe nas suas redes sociais com parentes e amigos.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <DollarSign className="w-12 h-12 text-primary mb-2" />
                <CardTitle>Ganhe Comissões</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Todo cliente que contratar através do seu link gera comissão recorrente.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Comissão Recorrente */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            O que é Comissão Recorrente?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Todo mês que o cliente renovar a assinatura você ganhará a comissão.
          </p>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <TrendingUp className="w-16 h-16 text-primary mx-auto mb-4" />
              <p className="text-lg">
                Com a comissão recorrente, todo mês você receberá comissões das indicações antigas 
                somando com as novas que são feitas, assim se você continuar indicando sua comissão 
                mensal só irá <strong>aumentando gradativamente</strong>.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Como Funciona */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Como funciona o programa de afiliados?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mb-4">
                  1
                </div>
                <UserPlus className="w-12 h-12 text-primary mb-2" />
                <CardTitle>Inscrição e Treinamento</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Faça sua inscrição para tornar-se um Afiliado, complete o curso para 
                  conhecer o processo e as ferramentas disponíveis.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mb-4">
                  2
                </div>
                <Megaphone className="w-12 h-12 text-primary mb-2" />
                <CardTitle>Divulgação dos Produtos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Divulgue os produtos através do seu link de afiliado com amigos, familiares 
                  e nas redes sociais como WhatsApp, Instagram, Facebook, TikTok, YouTube, etc.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mb-4">
                  3
                </div>
                <DollarSign className="w-12 h-12 text-primary mb-2" />
                <CardTitle>Comissionamento por Vendas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Ganhe comissões de todas as assinaturas que foram feitas através do 
                  seu link de afiliado. Pagamento garantido e transparente.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Painel de Afiliado */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Painel de Afiliado
          </h2>
          <p className="text-xl text-center text-muted-foreground mb-12">
            Acompanhe suas indicações e seus ganhos de forma prática e rápida.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <LayoutDashboard className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Painel Exclusivo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Dashboard completo com todas as informações importantes.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Target className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Metas de Ganhos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Acompanhe suas metas e conquistas em tempo real.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Share2 className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Link de Compartilhamento</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Seu link exclusivo pronto para compartilhar.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Award className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Cupons de Descontos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Crie cupons e ofereça dias grátis para seus indicados.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Sistema Seguro</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">100% seguro e inteligente para sua proteção.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <FileText className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Relatórios Completos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Relatórios detalhados de indicações e comissões.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Vantagens */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Vantagens de trabalhar com nosso sistema
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <TrendingUp className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Comissão Recorrente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Ganhe todos os meses com suas indicações.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <GraduationCap className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Treinamento Completo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Material completo para você começar do zero.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <DollarSign className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Baixo Custo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Investimento acessível para começar.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Comece GRÁTIS</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Opção de começar sem custos no plano FREE.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Clock className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Autonomia de Trabalho</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Trabalhe no seu tempo e do seu jeito.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CheckCircle2 className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Fácil de Usar</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Interface intuitiva e amigável.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Funcionalidades
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  "Dashboard completo",
                  "Treinamento integrado",
                  "Relatórios de indicações",
                  "Relatórios de comissões",
                  "Cadastro de cupons",
                  "Solicitação de saques"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <p className="text-center text-muted-foreground mt-6 italic">
                O sistema está em constante atualização, então em breve teremos novas funcionalidades.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            O que dizem nossos afiliados
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.slice(0, 3).map((testimonial) => (
              <Card key={testimonial.id}>
                <CardHeader>
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar>
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {testimonial.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground italic">"{testimonial.content}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Escolha seu Plano
          </h2>
          <p className="text-xl text-center text-muted-foreground mb-12">
            Comece gratuitamente ou escolha um plano que se adapte às suas necessidades
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan, index) => (
              <Card key={plan.id} className={index === 1 ? "border-primary shadow-lg" : ""}>
                {index === 1 && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Mais Popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    {plan.original_price && plan.original_price > plan.price && (
                      <span className="text-muted-foreground line-through text-sm mr-2">
                        R$ {plan.original_price.toFixed(2)}
                      </span>
                    )}
                    <span className="text-4xl font-bold">
                      R$ {plan.price.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">/{plan.billing_period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant={index === 1 ? "default" : "outline"}
                    onClick={() => user ? scrollToPlans() : navigate("/auth")}
                  >
                    {user ? "Assinar Agora" : "Começar Agora"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* WhatsApp */}
      {whatsappPhone && whatsappText && (
        <section className="py-16 px-4 bg-muted/50">
          <div className="container mx-auto max-w-4xl text-center">
            <MessageSquare className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Precisa de um atendimento humanizado?
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Fale conosco no WhatsApp
            </p>
            <Button
              size="lg"
              className="bg-[#25D366] hover:bg-[#20BA5A] text-white"
              onClick={() => window.open(getWhatsappUrl(), "_blank")}
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              Falar no WhatsApp
            </Button>
          </div>
        </section>
      )}

      {/* FAQs */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Perguntas Frequentes
          </h2>
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

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <img src={logo} alt="Logo" className="h-8 mb-4" />
              <p className="text-sm text-muted-foreground">
                Sistema completo para gerenciar seu programa de afiliados.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Produto</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Funcionalidades</li>
                <li>Preços</li>
                <li>Treinamento</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Suporte</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Central de Ajuda</li>
                <li>WhatsApp</li>
                <li>FAQ</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Termos de Uso</li>
                <li>Privacidade</li>
                <li>Cookies</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 APP Renda Recorrente. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
