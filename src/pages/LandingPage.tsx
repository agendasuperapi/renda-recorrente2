import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Target, TrendingUp, Users, DollarSign, Share2, GraduationCap, UserPlus,
  Megaphone, LayoutDashboard, FileText, Award, Shield, Clock, Zap,
  CheckCircle2, Star, MessageSquare, LucideIcon
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import laptopImage from "@/assets/laptop-dashboard.png";

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

interface AffiliateProduct {
  id: string;
  nome: string;
  descricao: string | null;
  icone_light: string | null;
  icone_dark: string | null;
  site_landingpage: string | null;
}

interface Feature {
  id: string;
  name: string;
  icon: string;
  is_active: boolean;
}

interface HeroImage {
  id: string;
  name: string;
  light_image_url: string | null;
  dark_image_url: string | null;
  alt_text: string;
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
  const { theme } = useTheme();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(defaultTestimonials);
  const [faqs, setFaqs] = useState<FAQ[]>(defaultFaqs);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappText, setWhatsappText] = useState("");
  const [showHomeButton, setShowHomeButton] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("inicio");
  const [isAdmin, setIsAdmin] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const [parallaxOffset, setParallaxOffset] = useState(0);
  const heroImageRef = useRef<HTMLDivElement>(null);

  // Busca imagens do hero com cache
  const { data: heroImages = [] } = useQuery({
    queryKey: ['heroImages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('landing_hero_images')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as HeroImage[];
    },
    staleTime: 1000 * 60 * 30, // 30 minutos
    gcTime: 1000 * 60 * 60, // 1 hora
  });

  // Helper para pegar imagem por nome
  const getHeroImage = (imageName: string) => {
    const image = heroImages.find(img => img.name === imageName);
    if (!image) return '';
    
    const isDark = theme === 'dark';
    return isDark ? (image.dark_image_url || image.light_image_url || '') : (image.light_image_url || '');
  };

  useEffect(() => {
    // Check auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id);
      } else {
        setIsAdmin(false);
      }
    });

    // Fetch plans
    fetchPlans();
    // Fetch testimonials
    fetchTestimonials();
    // Fetch FAQs
    fetchFaqs();
    // Fetch features
    fetchFeatures();
    // Fetch products
    fetchProducts();
    // Fetch product info
    fetchProductInfo();

    // Scroll listener para mostrar botão Início e parallax
    const handleScroll = () => {
      setShowHomeButton(window.scrollY > 100);
      
      // Parallax effect para a imagem do hero
      if (heroImageRef.current) {
        const rect = heroImageRef.current.getBoundingClientRect();
        const scrolled = window.scrollY;
        const rate = scrolled * 0.3; // Ajuste a velocidade do parallax
        setParallaxOffset(rate);
      }
    };

    window.addEventListener('scroll', handleScroll);

    // Intersection Observer para seções ativas
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id || "inicio");
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Intersection Observer para animações de scroll
    const animationObserverOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    const animationObserverCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.target.id) {
          setVisibleSections(prev => new Set(prev).add(entry.target.id));
        }
      });
    };

    const animationObserver = new IntersectionObserver(animationObserverCallback, animationObserverOptions);

    // Observar todas as seções - usa setTimeout para garantir que elementos condicionais sejam renderizados
    const observeSections = () => {
      const sections = ['hero', 'seja-afiliado', 'comissao-recorrente', 'como-funciona', 'painel-afiliado', 'vantagens', 'funcionalidades', 'layout-responsivo', 'produtos', 'depoimentos', 'planos', 'faq'];
      sections.forEach((sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
          observer.observe(element);
          animationObserver.observe(element);
        }
      });
    };

    // Observa imediatamente e depois de um delay para elementos condicionais
    observeSections();
    const timeoutId = setTimeout(observeSections, 100);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
      animationObserver.disconnect();
      clearTimeout(timeoutId);
    };
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
    const { data } = await supabase
      .from("landing_testimonials")
      .select("*")
      .eq("is_active", true)
      .order("order_position");

    if (data && data.length > 0) {
      setTestimonials(data as Testimonial[]);
    }
  };

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'super_admin')
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
        return;
      }
      
      setIsAdmin(!!data);
    } catch (error) {
      console.error('Error checking admin role:', error);
      setIsAdmin(false);
    }
  };

  const fetchFeatures = async () => {
    const { data } = await (supabase as any)
      .from("landing_features")
      .select("*")
      .eq("is_active", true)
      .order("order_position");

    if (data && data.length > 0) {
      setFeatures(data);
    }
  };

  const fetchFaqs = async () => {
    const { data } = await supabase
      .from("landing_faqs")
      .select("*")
      .eq("is_active", true)
      .order("order_position");

    if (data && data.length > 0) {
      setFaqs(data as FAQ[]);
    }
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, nome, descricao, icone_light, icone_dark, site_landingpage")
      .eq("show_on_landing", true)
      .order("nome");

    if (data) {
      setProducts(data as AffiliateProduct[]);
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

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    } else if (sectionId === "inicio") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const getWhatsappUrl = () => {
    if (!whatsappPhone || !whatsappText) return "#";
    const encodedText = encodeURIComponent(whatsappText);
    return `https://api.whatsapp.com/send/?phone=${whatsappPhone}&text=${encodedText}&type=phone_number&app_absent=0`;
  };

  const getIconComponent = (iconName: string): LucideIcon => {
    return (LucideIcons as any)[iconName] || CheckCircle2;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {getHeroImage('Logo Header') && (
              <img 
                src={getHeroImage('Logo Header')} 
                alt={heroImages.find(img => img.name === 'Logo Header')?.alt_text || 'APP Renda recorrente'} 
                className="h-10"
                loading="eager"
              />
            )}
            <span className="font-bold text-lg hidden sm:inline">APP Renda recorrente</span>
          </div>
          
          <div className="flex items-center gap-1">
            <nav className="hidden md:flex items-center gap-1">
              {showHomeButton && (
                <Button 
                  onClick={() => scrollToSection("inicio")} 
                  variant={activeSection === "inicio" ? "secondary" : "ghost"} 
                  size="sm"
                  className="transition-all duration-300"
                >
                  Início
                </Button>
              )}
              <Button 
                onClick={() => scrollToSection("como-funciona")} 
                variant={activeSection === "como-funciona" ? "secondary" : "ghost"} 
                size="sm"
                className="transition-all duration-300"
              >
                Como funciona
              </Button>
              <Button 
                onClick={() => scrollToSection("vantagens")} 
                variant={activeSection === "vantagens" ? "secondary" : "ghost"} 
                size="sm"
                className="transition-all duration-300"
              >
                Vantagens
              </Button>
              {products.length > 0 && (
                <Button 
                  onClick={() => scrollToSection("produtos")} 
                  variant={activeSection === "produtos" ? "secondary" : "ghost"} 
                  size="sm"
                  className="transition-all duration-300"
                >
                  Produtos
                </Button>
              )}
              <Button 
                onClick={() => scrollToSection("planos")} 
                variant={activeSection === "planos" ? "secondary" : "ghost"} 
                size="sm"
                className="transition-all duration-300"
              >
                Quero contratar
              </Button>
            </nav>
            
            {user ? (
              <>
                {isAdmin && (
                  <Button onClick={() => navigate("/admin/landing-page")} variant="outline" size="sm">
                    Painel
                  </Button>
                )}
                <Button onClick={handleLogout} variant="ghost" size="sm">
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => navigate("/auth")} variant="outline" size="sm">
                  Entrar
                </Button>
                <Button onClick={() => scrollToSection("planos")} size="sm" className="hidden sm:flex">
                  Quero Contratar
                </Button>
              </>
            )}
            
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="hero" className="py-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className={`text-center md:text-left transition-all duration-700 ${visibleSections.has('hero') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
              {getHeroImage('Logo Alternativo') && (
                <img 
                  src={getHeroImage('Logo Alternativo')} 
                  alt={heroImages.find(img => img.name === 'Logo Alternativo')?.alt_text || 'Renda Recorrente'} 
                  className="h-16 mb-4"
                  loading="eager"
                />
              )}
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Participe e ganhe dinheiro recomendando nossos aplicativos
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Temos vários produtos para você indicar e criar uma renda recorrente.
              </p>
              <Button 
                size="lg" 
                onClick={() => scrollToSection("planos")} 
                className="text-lg px-8 mb-8 relative overflow-hidden group hover:shadow-2xl transition-all duration-300 before:absolute before:inset-0 before:bg-primary/20 before:blur-xl before:animate-pulse"
              >
                Começar Agora
                <Target className="ml-2 w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
              </Button>
              <div className="flex justify-center md:justify-start">
                {getHeroImage('Trust Badges') && (
                  <img 
                    src={getHeroImage('Trust Badges')} 
                    alt={heroImages.find(img => img.name === 'Trust Badges')?.alt_text || 'Selos de segurança'}
                    className="h-12"
                    loading="eager"
                  />
                )}
              </div>
            </div>
            <div 
              className="flex justify-center animate-fade-in"
              style={{ animationDelay: '200ms' }}
            >
              {getHeroImage('Hero Person') && (
                <img 
                  src={getHeroImage('Hero Person')} 
                  alt={heroImages.find(img => img.name === 'Hero Person')?.alt_text || 'Afiliado'}
                  className="w-full max-w-md animate-fade-in"
                  style={{ animationDelay: '400ms' }}
                  loading="eager"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Seja um Afiliado */}
      <section id="seja-afiliado" className="py-16 px-4 bg-muted/50">
        <div className={`container mx-auto max-w-6xl transition-all duration-700 ${visibleSections.has('seja-afiliado') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Seja um Afiliado
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className={`transition-all duration-700 ${visibleSections.has('seja-afiliado') ? 'animate-fade-in opacity-100' : 'opacity-0 translate-y-10'}`}>
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

            <Card className={`transition-all duration-700 delay-100 ${visibleSections.has('seja-afiliado') ? 'animate-fade-in opacity-100' : 'opacity-0 translate-y-10'}`}>
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

            <Card className={`transition-all duration-700 delay-200 ${visibleSections.has('seja-afiliado') ? 'animate-fade-in opacity-100' : 'opacity-0 translate-y-10'}`}>
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

            <Card className={`transition-all duration-700 delay-300 ${visibleSections.has('seja-afiliado') ? 'animate-fade-in opacity-100' : 'opacity-0 translate-y-10'}`}>
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
      <section id="comissao-recorrente" className="py-16 px-4">
        <div className={`container mx-auto max-w-4xl text-center transition-all duration-700 ${visibleSections.has('comissao-recorrente') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
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
      <section id="como-funciona" className="py-16 px-4 bg-muted/50">
        <div className={`container mx-auto max-w-6xl transition-all duration-700 ${visibleSections.has('como-funciona') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Como funciona o programa de afiliados?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <UserPlus className="w-12 h-12 text-primary mb-4" />
                <CardTitle className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
                    1
                  </span>
                  Inscrição e Treinamento
                </CardTitle>
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
                <Megaphone className="w-12 h-12 text-primary mb-4" />
                <CardTitle className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
                    2
                  </span>
                  Divulgação dos Produtos
                </CardTitle>
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
                <DollarSign className="w-12 h-12 text-primary mb-4" />
                <CardTitle className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
                    3
                  </span>
                  Comissionamento por Vendas
                </CardTitle>
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
      <section id="painel-afiliado" className="py-16 px-4">
        <div className={`container mx-auto max-w-6xl transition-all duration-700 ${visibleSections.has('painel-afiliado') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
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
      <section id="vantagens" className="py-16 px-4 bg-muted/50">
        <div className={`container mx-auto max-w-6xl transition-all duration-700 ${visibleSections.has('vantagens') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
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
      <section id="funcionalidades" className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className={`grid lg:grid-cols-2 gap-12 items-start transition-all duration-700 ${visibleSections.has('funcionalidades') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
            {/* Imagem do laptop à esquerda */}
            <div className="flex justify-center lg:justify-start">
              {getHeroImage('Funcionalidades') ? (
                <img 
                  src={getHeroImage('Funcionalidades')} 
                  alt={heroImages.find(img => img.name === 'Funcionalidades')?.alt_text || 'Dashboard do sistema'} 
                  className="w-full max-w-2xl object-contain"
                />
              ) : (
                <img 
                  src={laptopImage} 
                  alt="Dashboard do sistema em laptop" 
                  className="w-full max-w-2xl object-contain"
                />
              )}
            </div>
            
            {/* Funcionalidades à direita em coluna única */}
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-8">
                Funcionalidades
              </h2>
              <div className="flex flex-col gap-4">
                {features.map((feature) => {
                  const IconComponent = getIconComponent(feature.icon);
                  return (
                    <div key={feature.id} className="flex items-center gap-3">
                      <IconComponent className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>{feature.name}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-muted-foreground mt-6 italic">
                O sistema está em constante atualização, então em breve teremos novas funcionalidades.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Layout Responsivo */}
      <section id="layout-responsivo" className="py-16 px-4 bg-muted/50">
        <div className={`container mx-auto max-w-6xl text-center transition-all duration-700 ${visibleSections.has('layout-responsivo') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Layout Responsivo
          </h2>
          <p className="text-xl text-muted-foreground mb-12">
            Acesse o APP Renda recorrente em todos os dispositivos, Notebooks, PCs, celulares e tablets
          </p>
          <div className="flex justify-center">
            {getHeroImage('Responsivo') && (
              <img 
                src={getHeroImage('Responsivo')} 
                alt={heroImages.find(img => img.name === 'Responsivo')?.alt_text || 'APP em diversos dispositivos'} 
                className="w-full max-w-4xl object-contain animate-fade-in"
                style={{ animationDelay: '200ms' }}
              />
            )}
          </div>
        </div>
      </section>

      {/* Produtos Disponíveis */}
      {products.length > 0 && (
        <section id="produtos" className="py-16 px-4 bg-muted/50">
          <div className="container mx-auto max-w-6xl transition-all duration-700 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Produtos Disponíveis para Afiliação
            </h2>
            <p className="text-xl text-center text-muted-foreground mb-12">
              Escolha os produtos que deseja divulgar e comece a ganhar comissões
            </p>
            <div className="space-y-6">
              {products.map((product, index) => (
                <Card 
                  key={product.id} 
                  className="hover:shadow-lg transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardHeader>
                    <div className="flex items-center gap-4 mb-4">
                      {product.icone_light && (
                        <img 
                          src={product.icone_light} 
                          alt={product.nome}
                          className="w-16 h-16 object-contain dark:hidden"
                        />
                      )}
                      {product.icone_dark && (
                        <img 
                          src={product.icone_dark} 
                          alt={product.nome}
                          className="w-16 h-16 object-contain hidden dark:block"
                        />
                      )}
                      <CardTitle className="text-xl">{product.nome}</CardTitle>
                    </div>
                    <CardDescription className="text-base whitespace-pre-line">
                      {product.descricao || "Produto disponível para afiliação"}
                    </CardDescription>
                  </CardHeader>
                  {product.site_landingpage && (
                    <CardFooter>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(product.site_landingpage!, "_blank")}
                      >
                        Visitar site {product.nome}
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Depoimentos */}
      <section id="depoimentos" className="py-16 px-4">
        <div className={`container mx-auto max-w-6xl transition-all duration-700 ${visibleSections.has('depoimentos') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            O que dizem nossos afiliados
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.slice(0, 3).map((testimonial) => (
              <Card key={testimonial.id}>
                <CardHeader>
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={testimonial.avatar_url || undefined} alt={testimonial.name} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
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
        <div className={`container mx-auto max-w-6xl transition-all duration-700 ${visibleSections.has('planos') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
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
                    onClick={() => user ? scrollToSection("planos") : navigate("/auth")}
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
      <section id="faq" className="py-16 px-4">
        <div className={`container mx-auto max-w-4xl transition-all duration-700 ${visibleSections.has('faq') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
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
              {getHeroImage('Logo Alternativo') && (
                <img 
                  src={getHeroImage('Logo Alternativo')} 
                  alt={heroImages.find(img => img.name === 'Logo Alternativo')?.alt_text || 'Logo'} 
                  className="h-8 mb-4"
                />
              )}
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
