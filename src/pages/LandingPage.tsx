import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GradientEditor } from "@/components/GradientEditor";
import {
  Target, TrendingUp, Users, DollarSign, Share2, GraduationCap, UserPlus,
  Megaphone, LayoutDashboard, FileText, Award, Shield, Clock, Zap,
  CheckCircle2, Star, MessageSquare, LucideIcon, Edit
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

interface GradientConfig {
  block_name: string;
  color_start: string;
  color_end: string;
  intensity_start: number;
  intensity_end: number;
  gradient_start_position: number;
  text_color?: string;
  heading_color?: string;
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
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [gradientConfigs, setGradientConfigs] = useState<Record<string, GradientConfig>>({});

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

  // Busca configurações de gradiente
  const { data: gradientConfigsData = [] } = useQuery({
    queryKey: ['gradientConfigs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('landing_block_gradients' as any)
        .select('*');
      
      if (error) throw error;
      return data as unknown as GradientConfig[];
    },
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (gradientConfigsData && gradientConfigsData.length > 0) {
      const configs: Record<string, GradientConfig> = {};
      gradientConfigsData.forEach(config => {
        configs[config.block_name] = config;
      });
      setGradientConfigs(configs);
    }
  }, [gradientConfigsData]);

  // Helper para pegar imagem por nome
  const getHeroImage = (imageName: string) => {
    const image = heroImages.find(img => img.name === imageName);
    if (!image) return '';
    
    const isDark = theme === 'dark';
    return isDark ? (image.dark_image_url || image.light_image_url || '') : (image.light_image_url || '');
  };

  // Helper para criar classe de gradiente
  const getGradientClass = (blockName: string) => {
    const config = gradientConfigs[blockName];
    if (!config) return '';
    
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };
    
    const startRgb = hexToRgb(config.color_start);
    const endRgb = hexToRgb(config.color_end);
    
    if (!startRgb || !endRgb) return '';
    
    return `bg-gradient-to-b`;
  };

  const getGradientStyle = (blockName: string) => {
    const config = gradientConfigs[blockName];
    if (!config) return {};
    
    const startAlpha = config.intensity_start / 100;
    const endAlpha = config.intensity_end / 100;
    
    return {
      background: `linear-gradient(to bottom, ${config.color_start}${Math.round(startAlpha * 255).toString(16).padStart(2, '0')} ${config.gradient_start_position}%, ${config.color_end}${Math.round(endAlpha * 255).toString(16).padStart(2, '0')} 100%)`
    };
  };

  const getTextColor = (blockName: string) => {
    const config = gradientConfigs[blockName];
    return config?.text_color || undefined;
  };

  const getHeadingColor = (blockName: string) => {
    const config = gradientConfigs[blockName];
    return config?.heading_color || undefined;
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
      <section id="hero" className="py-20 px-4 relative" style={getGradientStyle('hero')}>
        {isAdmin && (
          <Button
            onClick={() => setEditingBlock(editingBlock === 'hero' ? null : 'hero')}
            className="absolute top-4 right-4 z-40"
            size="sm"
            variant="outline"
          >
            <Edit className="w-4 h-4" />
          </Button>
        )}
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
              <h1 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: getHeadingColor('hero') }}>
                Participe e ganhe dinheiro recomendando nossos aplicativos
              </h1>
              <p className="text-xl mb-8" style={{ color: getTextColor('hero') }}>
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
      <section id="seja-afiliado" className="py-16 px-4 relative" style={getGradientStyle('seja-afiliado')}>
        {isAdmin && (
          <Button
            onClick={() => setEditingBlock(editingBlock === 'seja-afiliado' ? null : 'seja-afiliado')}
            className="absolute top-4 right-4 z-40"
            size="sm"
            variant="outline"
          >
            <Edit className="w-4 h-4" />
          </Button>
        )}
        <div className={`container mx-auto max-w-7xl transition-all duration-700 ${visibleSections.has('seja-afiliado') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12" style={{ color: getHeadingColor('seja-afiliado') }}>
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
      <section id="comissao-recorrente" className="py-16 px-4 relative" style={getGradientStyle('comissao-recorrente')}>
        {isAdmin && (
          <Button
            onClick={() => setEditingBlock(editingBlock === 'comissao-recorrente' ? null : 'comissao-recorrente')}
            className="absolute top-4 right-4 z-40"
            size="sm"
            variant="outline"
          >
            <Edit className="w-4 h-4" />
          </Button>
        )}
        <div className={`container mx-auto max-w-4xl text-center transition-all duration-700 ${visibleSections.has('comissao-recorrente') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: getHeadingColor('comissao-recorrente') }}>
            O que é Comissão Recorrente?
          </h2>
          <p className="text-xl mb-8" style={{ color: getTextColor('comissao-recorrente') }}>
            Todo mês que o cliente renovar a assinatura você ganhará a comissão.
          </p>
          <Card className="bg-primary/5 border-primary/20 transition-all duration-700 hover:shadow-lg">
            <CardContent className="pt-6">
              <TrendingUp className="w-16 h-16 text-primary mx-auto mb-4" />
              <p className="text-lg" style={{ color: getTextColor('comissao-recorrente') }}>
                Com a comissão recorrente, todo mês você receberá comissões das indicações antigas 
                somando com as novas que são feitas, assim se você continuar indicando sua comissão 
                mensal só irá <strong>aumentando gradativamente</strong>.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Como Funciona */}
      <section id="como-funciona" className="py-16 px-4 relative" style={getGradientStyle('como-funciona')}>
        {isAdmin && (
          <Button
            onClick={() => setEditingBlock(editingBlock === 'como-funciona' ? null : 'como-funciona')}
            className="absolute top-4 right-4 z-40"
            size="sm"
            variant="outline"
          >
            <Edit className="w-4 h-4" />
          </Button>
        )}
        <div className={`container mx-auto max-w-7xl transition-all duration-700 ${visibleSections.has('como-funciona') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12" style={{ color: getHeadingColor('como-funciona') }}>
            Como funciona o programa de afiliados?
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className={`transition-all duration-700 ${visibleSections.has('como-funciona') ? 'animate-fade-in opacity-100' : 'opacity-0 translate-y-10'}`}>
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
                <p className="text-muted-foreground" style={{ color: getTextColor('como-funciona') }}>
                  Faça sua inscrição para tornar-se um Afiliado, complete o curso para 
                  conhecer o processo e as ferramentas disponíveis.
                </p>
              </CardContent>
            </Card>

            <Card className={`transition-all duration-700 delay-100 ${visibleSections.has('como-funciona') ? 'animate-fade-in opacity-100' : 'opacity-0 translate-y-10'}`}>
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
                <p className="text-muted-foreground" style={{ color: getTextColor('como-funciona') }}>
                  Divulgue os produtos através do seu link de afiliado com amigos, familiares 
                  e nas redes sociais como WhatsApp, Instagram, Facebook, TikTok, YouTube, etc.
                </p>
              </CardContent>
            </Card>

            <Card className={`transition-all duration-700 delay-200 ${visibleSections.has('como-funciona') ? 'animate-fade-in opacity-100' : 'opacity-0 translate-y-10'}`}>
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
                <p className="text-muted-foreground" style={{ color: getTextColor('como-funciona') }}>
                  Ganhe comissões de todas as assinaturas que foram feitas através do 
                  seu link de afiliado. Pagamento garantido e transparente.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Painel de Afiliado */}
      <section id="painel-afiliado" className="py-16 px-4 relative" style={getGradientStyle('painel-afiliado')}>
        {isAdmin && (
          <Button
            onClick={() => setEditingBlock(editingBlock === 'painel-afiliado' ? null : 'painel-afiliado')}
            className="absolute top-4 right-4 z-40"
            size="sm"
            variant="outline"
          >
            <Edit className="w-4 h-4" />
          </Button>
        )}
        <div className={`container mx-auto max-w-7xl transition-all duration-700 ${visibleSections.has('painel-afiliado') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12" style={{ color: getHeadingColor('painel-afiliado') }}>
            Painel de Afiliado
          </h2>
          <p className="text-xl text-center text-muted-foreground mb-12" style={{ color: getTextColor('painel-afiliado') }}>
            Acompanhe suas indicações e seus ganhos de forma prática e rápida.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className={`transition-all duration-700 ${visibleSections.has('painel-afiliado') ? 'animate-fade-in opacity-100' : 'opacity-0 translate-y-10'}`}>
              <CardHeader>
                <LayoutDashboard className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Painel Exclusivo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Dashboard completo com todas as informações importantes.</p>
              </CardContent>
            </Card>

            <Card className={`transition-all duration-700 delay-100 ${visibleSections.has('painel-afiliado') ? 'animate-fade-in opacity-100' : 'opacity-0 translate-y-10'}`}>
              <CardHeader>
                <Target className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Metas de Ganhos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Acompanhe suas metas e conquistas em tempo real.</p>
              </CardContent>
            </Card>

            <Card className={`transition-all duration-700 delay-200 ${visibleSections.has('painel-afiliado') ? 'animate-fade-in opacity-100' : 'opacity-0 translate-y-10'}`}>
              <CardHeader>
                <Share2 className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Link de Compartilhamento</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Seu link exclusivo pronto para compartilhar.</p>
              </CardContent>
            </Card>

            <Card className={`transition-all duration-700 delay-300 ${visibleSections.has('painel-afiliado') ? 'animate-fade-in opacity-100' : 'opacity-0 translate-y-10'}`}>
              <CardHeader>
                <Award className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Cupons de Descontos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Crie cupons e ofereça dias grátis para seus indicados.</p>
              </CardContent>
            </Card>

            <Card className={`transition-all duration-700 delay-[400ms] ${visibleSections.has('painel-afiliado') ? 'animate-fade-in opacity-100' : 'opacity-0 translate-y-10'}`}>
              <CardHeader>
                <Shield className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Sistema Seguro</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">100% seguro e inteligente para sua proteção.</p>
              </CardContent>
            </Card>

            <Card className={`transition-all duration-700 delay-[500ms] ${visibleSections.has('painel-afiliado') ? 'animate-fade-in opacity-100' : 'opacity-0 translate-y-10'}`}>
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
      <section id="vantagens" className="py-16 px-4 relative" style={getGradientStyle('vantagens')}>
        {isAdmin && (
          <Button
            onClick={() => setEditingBlock(editingBlock === 'vantagens' ? null : 'vantagens')}
            className="absolute top-4 right-4 z-40"
            size="sm"
            variant="outline"
          >
            <Edit className="w-4 h-4" />
          </Button>
        )}
        <div className={`container mx-auto max-w-7xl transition-all duration-700 ${visibleSections.has('vantagens') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12" style={{ color: getHeadingColor('vantagens') }}>
            Vantagens de trabalhar com nosso sistema
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className={`transition-all duration-700 ${visibleSections.has('vantagens') ? 'animate-fade-in opacity-100' : 'opacity-0 translate-y-10'}`}>
              <CardHeader>
                <TrendingUp className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Comissão Recorrente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Ganhe todos os meses com suas indicações.</p>
              </CardContent>
            </Card>

            <Card className={`transition-all duration-700 delay-100 ${visibleSections.has('vantagens') ? 'animate-fade-in opacity-100' : 'opacity-0 translate-y-10'}`}>
              <CardHeader>
                <GraduationCap className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Treinamento Completo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Material completo para você começar do zero.</p>
              </CardContent>
            </Card>

            <Card className={`transition-all duration-700 delay-200 ${visibleSections.has('vantagens') ? 'animate-fade-in opacity-100' : 'opacity-0 translate-y-10'}`}>
              <CardHeader>
                <DollarSign className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Baixo Custo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Investimento acessível para começar.</p>
              </CardContent>
            </Card>

            <Card className={`transition-all duration-700 delay-300 ${visibleSections.has('vantagens') ? 'animate-fade-in opacity-100' : 'opacity-0 translate-y-10'}`}>
              <CardHeader>
                <Zap className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Comece GRÁTIS</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Opção de começar sem custos no plano FREE.</p>
              </CardContent>
            </Card>

            <Card className={`transition-all duration-700 delay-[400ms] ${visibleSections.has('vantagens') ? 'animate-fade-in opacity-100' : 'opacity-0 translate-y-10'}`}>
              <CardHeader>
                <Clock className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Autonomia de Trabalho</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Trabalhe no seu tempo e do seu jeito.</p>
              </CardContent>
            </Card>

            <Card className={`transition-all duration-700 delay-[500ms] ${visibleSections.has('vantagens') ? 'animate-fade-in opacity-100' : 'opacity-0 translate-y-10'}`}>
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
      <section id="funcionalidades" className="py-16 px-4 relative" style={getGradientStyle('funcionalidades')}>
        {isAdmin && (
          <Button
            onClick={() => setEditingBlock(editingBlock === 'funcionalidades' ? null : 'funcionalidades')}
            className="absolute top-4 right-4 z-40"
            size="sm"
            variant="outline"
          >
            <Edit className="w-4 h-4" />
          </Button>
        )}
        <div className={`container mx-auto max-w-7xl transition-all duration-700 ${visibleSections.has('funcionalidades') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Imagem do Dashboard */}
            <div className="order-2 md:order-1">
              {getHeroImage('Funcionalidades') && (
                <img 
                  src={getHeroImage('Funcionalidades')} 
                  alt="Dashboard do Sistema"
                  className="w-full h-auto"
                />
              )}
            </div>

            {/* Lista de Funcionalidades */}
            <div className="order-1 md:order-2 space-y-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-8" style={{ color: getHeadingColor('funcionalidades') }}>
                Funcionalidades
              </h2>
              
              <div className="space-y-4">
                {features.map((feature, index) => {
                  const IconComponent = getIconComponent(feature.icon);
                  return (
                    <div 
                      key={feature.id} 
                      className={`flex items-center gap-4 transition-all duration-700 delay-${index * 100}`}
                      style={{ transitionDelay: `${index * 100}ms` }}
                    >
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <IconComponent className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-lg font-medium" style={{ color: getTextColor('funcionalidades') }}>{feature.name}</p>
                    </div>
                  );
                })}
              </div>

              <p className="text-sm text-muted-foreground mt-8" style={{ color: getTextColor('funcionalidades') }}>
                O sistema está em constante atualização, então em breve teremos novas funcionalidades.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Layout Responsivo */}
      <section id="layout-responsivo" className="py-16 px-4 relative" style={getGradientStyle('layout-responsivo')}>
        {isAdmin && (
          <Button
            onClick={() => setEditingBlock(editingBlock === 'layout-responsivo' ? null : 'layout-responsivo')}
            className="absolute top-4 right-4 z-40"
            size="sm"
            variant="outline"
          >
            <Edit className="w-4 h-4" />
          </Button>
        )}
        <div className={`container mx-auto max-w-7xl text-center transition-all duration-700 ${visibleSections.has('layout-responsivo') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: getHeadingColor('layout-responsivo') }}>
            Layout Responsivo
          </h2>
          <p className="text-xl mb-12" style={{ color: getTextColor('layout-responsivo') }}>
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
        <section id="produtos" className="py-16 px-4 relative" style={getGradientStyle('produtos')}>
          {isAdmin && (
            <Button
              onClick={() => setEditingBlock(editingBlock === 'produtos' ? null : 'produtos')}
              className="absolute top-4 right-4 z-40"
              size="sm"
              variant="outline"
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
          <div className="container mx-auto max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12" style={{ color: getHeadingColor('produtos') }}>
              Produtos Disponíveis para Afiliação
            </h2>
            <p className="text-xl text-center mb-12" style={{ color: getTextColor('produtos') }}>
              Escolha entre nossos produtos e comece a ganhar comissões recorrentes
            </p>
            <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto">
              {products.map((product, index) => {
                const isDark = theme === 'dark';
                const iconUrl = isDark ? (product.icone_dark || product.icone_light) : (product.icone_light || product.icone_dark);
                
                return (
                  <Card 
                    key={product.id} 
                    className="transition-all duration-300 hover:shadow-lg cursor-pointer"
                    onClick={() => product.site_landingpage && window.open(product.site_landingpage, '_blank')}
                  >
                    <CardHeader>
                      {iconUrl && (
                        <img 
                          src={iconUrl} 
                          alt={product.nome}
                          className="w-16 h-16 mb-4 object-contain"
                        />
                      )}
                      <CardTitle>{product.nome}</CardTitle>
                      <CardDescription className="whitespace-pre-line">{product.descricao}</CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (product.site_landingpage) {
                            window.open(product.site_landingpage, '_blank');
                          }
                        }}
                      >
                        Saiba Mais
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Depoimentos */}
      <section id="depoimentos" className="py-16 px-4 relative" style={getGradientStyle('depoimentos')}>
        {isAdmin && (
          <Button
            onClick={() => setEditingBlock(editingBlock === 'depoimentos' ? null : 'depoimentos')}
            className="absolute top-4 right-4 z-40"
            size="sm"
            variant="outline"
          >
            <Edit className="w-4 h-4" />
          </Button>
        )}
        <div className={`container mx-auto max-w-7xl transition-all duration-700 ${visibleSections.has('depoimentos') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12" style={{ color: getHeadingColor('depoimentos') }}>
            O que dizem nossos afiliados
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.slice(0, 3).map((testimonial, index) => (
              <Card key={testimonial.id} className={`transition-all duration-700 delay-${index * 100} ${visibleSections.has('depoimentos') ? 'animate-fade-in opacity-100' : 'opacity-0 translate-y-10'}`}>
                <CardHeader>
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={testimonial.avatar_url || undefined} alt={testimonial.name} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                        {testimonial.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold" style={{ color: getTextColor('depoimentos') }}>{testimonial.name}</p>
                      <p className="text-sm" style={{ color: getTextColor('depoimentos') }}>{testimonial.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="italic" style={{ color: getTextColor('depoimentos') }}>"{testimonial.content}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-16 px-4 relative" style={getGradientStyle('planos')}>
        {isAdmin && (
          <Button
            onClick={() => setEditingBlock(editingBlock === 'planos' ? null : 'planos')}
            className="absolute top-4 right-4 z-40"
            size="sm"
            variant="outline"
          >
            <Edit className="w-4 h-4" />
          </Button>
        )}
        <div className={`container mx-auto max-w-7xl transition-all duration-700 ${visibleSections.has('planos') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ color: getHeadingColor('planos') }}>
            Escolha seu Plano
          </h2>
          <p className="text-xl text-center mb-12" style={{ color: getTextColor('planos') }}>
            Comece gratuitamente ou escolha um plano que se adapte às suas necessidades
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan, index) => (
              <Card key={plan.id} className={`transition-all duration-700 ${index === 1 ? "border-primary shadow-lg delay-100" : index === 2 ? "delay-200" : ""} ${visibleSections.has('planos') ? 'animate-fade-in opacity-100' : 'opacity-0 translate-y-10'}`}>
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

      {/* FAQs */}
      <section id="faq" className="py-16 px-4 relative" style={getGradientStyle('faq')}>
        {isAdmin && (
          <Button
            onClick={() => setEditingBlock(editingBlock === 'faq' ? null : 'faq')}
            className="absolute top-4 right-4 z-40"
            size="sm"
            variant="outline"
          >
            <Edit className="w-4 h-4" />
          </Button>
        )}
        <div className={`container mx-auto max-w-4xl transition-all duration-700 ${visibleSections.has('faq') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12" style={{ color: getHeadingColor('faq') }}>
            Perguntas Frequentes
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={faq.id} value={`item-${index}`}>
                <AccordionTrigger className="text-left" style={{ color: getTextColor('faq') }}>
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent style={{ color: getTextColor('faq') }}>
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

      {/* Gradient Editor */}
      {isAdmin && editingBlock && (
        <GradientEditor
          blockName={editingBlock}
          config={
            gradientConfigs[editingBlock] || {
              block_name: editingBlock,
              color_start: '#00bf63',
              color_end: '#00bf63',
              intensity_start: 50,
              intensity_end: 80,
              gradient_start_position: 0,
            }
          }
          onSave={(config) => {
            setGradientConfigs(prev => ({ ...prev, [config.block_name]: config }));
            setEditingBlock(null);
          }}
          onClose={() => setEditingBlock(null)}
        />
      )}
    </div>
  );
};

export default LandingPage;
