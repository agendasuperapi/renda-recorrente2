import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GradientEditor } from "@/components/GradientEditor";
import { CookieConsent } from "@/components/CookieConsent";
import {
  Target, TrendingUp, Users, DollarSign, Share2, GraduationCap, UserPlus,
  Megaphone, LayoutDashboard, FileText, Award, Shield, Clock, Zap,
  CheckCircle2, Star, MessageSquare, LucideIcon, Edit, Menu, Link, Check,
  MousePointer2, Trophy, Lock, X
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import laptopImage from "@/assets/laptop-dashboard.png";

const PRODUCT_ID = "bb582482-b006-47b8-b6ea-a6944d8cfdfd";

interface AnnouncementBanner {
  id: string;
  text: string;
  subtitle: string;
  is_active: boolean;
  background_color: string;
  text_color: string;
  button_text: string | null;
  button_url: string | null;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  billing_period: string;
  description: string | null;
  features: string[];
  plan_features?: { feature_id: string }[];
  commission_percentage: number;
  is_free?: boolean;
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
  text_color_light?: string;
  text_color_dark?: string;
  heading_color_light?: string;
  heading_color_dark?: string;
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
  const { toast } = useToast();
  const { theme } = useTheme();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(defaultTestimonials);
  const [faqs, setFaqs] = useState<FAQ[]>(defaultFaqs);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [currentProduct, setCurrentProduct] = useState<AffiliateProduct | null>(null);
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [announcementBanner, setAnnouncementBanner] = useState<AnnouncementBanner | null>(null);
  const [clickCount, setClickCount] = useState(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [validatedCoupon, setValidatedCoupon] = useState<any>(null);
  const [loadingCoupon, setLoadingCoupon] = useState(false);

  // Busca banner de anúncio
  const { data: bannerData } = useQuery({
    queryKey: ['announcementBanner'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('landing_announcement_banner')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as AnnouncementBanner | null;
    },
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (bannerData) {
      setAnnouncementBanner(bannerData);
    }
  }, [bannerData]);

  // Busca imagens do hero com cache
  const { data: heroImages = [] } = useQuery({
    queryKey: ['heroImages'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
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
      const { data, error } = await (supabase as any)
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
    if (!config) return undefined;
    
    if (theme === 'dark') {
      return config.text_color_dark || config.text_color || undefined;
    } else {
      return config.text_color_light || config.text_color || undefined;
    }
  };

  const getHeadingColor = (blockName: string) => {
    const config = gradientConfigs[blockName];
    if (!config) return undefined;
    
    if (theme === 'dark') {
      return config.heading_color_dark || config.heading_color || undefined;
    } else {
      return config.heading_color_light || config.heading_color || undefined;
    }
  };

  // Restore scroll position when coming back from legal pages
  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem('landingScrollPosition');
    if (savedScrollPosition) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScrollPosition));
        sessionStorage.removeItem('landingScrollPosition');
      }, 100);
    }
  }, []);

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
    // Fetch current product
    fetchCurrentProduct();
    // Fetch product info
    fetchProductInfo();

    // Scroll listener para mostrar botão Início e parallax (desabilitado em mobile)
    const handleScroll = () => {
      setShowHomeButton(window.scrollY > 100);
      
      // Parallax effect para a imagem do hero (apenas desktop)
      if (heroImageRef.current && window.innerWidth >= 768) {
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
      .select(`
        *,
        plan_features(feature_id)
      `)
      .eq("product_id", PRODUCT_ID)
      .eq("is_active", true)
      .order("price");

    console.log('[LandingPage] Planos retornados:', data);
    
    if (data) {
      const mappedPlans = data.map((plan: any) => ({
        ...plan,
        // Usar o campo features do JSONB do banco, não o description
        features: Array.isArray(plan.features) ? plan.features : (
          plan.description 
            ? plan.description.split('\n').filter((line: string) => line.trim()) 
            : []
        ),
        plan_features: plan.plan_features || []
      }));
      console.log('[LandingPage] Planos mapeados:', mappedPlans);
      setPlans(mappedPlans);
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
      
      const userIsAdmin = !!data;
      setIsAdmin(userIsAdmin);
      
      // Redirecionar usuário logado (não admin) para dashboard
      if (!userIsAdmin) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error checking admin role:', error);
      setIsAdmin(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast({
        title: "Erro",
        description: "Digite um código de cupom",
        variant: "destructive",
      });
      return;
    }

    setLoadingCoupon(true);
    try {
      // Buscar cupom pelo código ou custom_code
      const { data: couponData, error: couponError } = await supabase
        .from("coupons")
        .select(`
          *,
          created_by
        `)
        .eq("code", couponCode.toUpperCase())
        .eq("product_id", PRODUCT_ID)
        .eq("is_active", true)
        .maybeSingle();

      if (couponError || !couponData) {
        // Tentar buscar pelo custom_code na tabela affiliate_coupons
        const { data: affiliateCouponData, error: affiliateError } = await supabase
          .from("affiliate_coupons")
          .select(`
            *,
            coupon:coupons(*),
            affiliate:profiles(*)
          `)
          .eq("custom_code", couponCode.toUpperCase())
          .eq("product_id", PRODUCT_ID)
          .eq("is_active", true)
          .maybeSingle();

        if (affiliateError || !affiliateCouponData) {
          toast({
            title: "Cupom não encontrado",
            description: "O código digitado não existe ou está inativo",
            variant: "destructive",
          });
          setValidatedCoupon(null);
          return;
        }

        // Cupom de afiliado encontrado
        setValidatedCoupon({
          ...affiliateCouponData.coupon,
          affiliate: affiliateCouponData.affiliate,
        });
        toast({
          title: "Cupom válido!",
          description: "Cupom aplicado com sucesso",
        });
        return;
      }

      // Cupom principal encontrado, buscar dados do afiliado criador
      const { data: affiliateData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", couponData.created_by)
        .maybeSingle();

      setValidatedCoupon({
        ...couponData,
        affiliate: affiliateData,
      });

      toast({
        title: "Cupom válido!",
        description: "Cupom aplicado com sucesso",
      });
    } catch (error) {
      console.error("Error validating coupon:", error);
      toast({
        title: "Erro",
        description: "Erro ao validar cupom",
        variant: "destructive",
      });
    } finally {
      setLoadingCoupon(false);
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

  const fetchCurrentProduct = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, nome, descricao, icone_light, icone_dark")
      .eq("id", PRODUCT_ID)
      .maybeSingle();

    if (data) {
      setCurrentProduct(data as AffiliateProduct);
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
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            {getHeroImage('Logo Header') && (
              <img 
                src={getHeroImage('Logo Header')} 
                alt={heroImages.find(img => img.name === 'Logo Header')?.alt_text || 'APP Renda recorrente'} 
                className="h-8 sm:h-10"
                loading="eager"
              />
            )}
            <span className="font-bold text-base sm:text-lg hidden sm:inline">APP Renda recorrente</span>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
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
                variant={activeSection === "planos" ? "secondary" : "default"} 
                size="sm"
                className="transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              >
                Quero contratar
              </Button>
            </nav>
            
            {/* Desktop Auth Buttons */}
            <div className="hidden lg:flex items-center gap-1">
              {user ? (
                <>
                  {isAdmin && (
                    <>
                      <Button onClick={() => navigate("/admin/landing-page")} variant="outline" size="sm">
                        Painel
                      </Button>
                      <Button onClick={() => navigate("/auth")} variant="outline" size="sm">
                        Configurar Login
                      </Button>
                    </>
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
                </>
              )}
            </div>
            
            <ThemeToggle />
            
            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <nav className="flex flex-col gap-4 mt-8">
                  {showHomeButton && (
                    <Button 
                      onClick={() => {
                        scrollToSection("inicio");
                        setMobileMenuOpen(false);
                      }} 
                      variant={activeSection === "inicio" ? "secondary" : "ghost"} 
                      className="w-full justify-start"
                    >
                      Início
                    </Button>
                  )}
                  <Button 
                    onClick={() => {
                      scrollToSection("como-funciona");
                      setMobileMenuOpen(false);
                    }} 
                    variant={activeSection === "como-funciona" ? "secondary" : "ghost"} 
                    className="w-full justify-start"
                  >
                    Como funciona
                  </Button>
                  <Button 
                    onClick={() => {
                      scrollToSection("vantagens");
                      setMobileMenuOpen(false);
                    }} 
                    variant={activeSection === "vantagens" ? "secondary" : "ghost"} 
                    className="w-full justify-start"
                  >
                    Vantagens
                  </Button>
                  {products.length > 0 && (
                    <Button 
                      onClick={() => {
                        scrollToSection("produtos");
                        setMobileMenuOpen(false);
                      }} 
                      variant={activeSection === "produtos" ? "secondary" : "ghost"} 
                      className="w-full justify-start"
                    >
                      Produtos
                    </Button>
                  )}
                  <Button 
                    onClick={() => {
                      scrollToSection("planos");
                      setMobileMenuOpen(false);
                    }} 
                    variant={activeSection === "planos" ? "secondary" : "ghost"} 
                    className="w-full justify-start"
                  >
                    Quero contratar
                  </Button>
                  
                  <div className="border-t pt-4 mt-4 space-y-2">
                    {user ? (
                      <>
                        {isAdmin && (
                          <Button 
                            onClick={() => {
                              navigate("/admin/landing-page");
                              setMobileMenuOpen(false);
                            }} 
                            variant="outline" 
                            className="w-full"
                          >
                            Painel
                          </Button>
                        )}
                        <Button 
                          onClick={() => {
                            handleLogout();
                            setMobileMenuOpen(false);
                          }} 
                          variant="ghost" 
                          className="w-full"
                        >
                          Sair
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button 
                          onClick={() => {
                            navigate("/auth");
                            setMobileMenuOpen(false);
                          }} 
                          variant="outline" 
                          className="w-full"
                        >
                          Entrar
                        </Button>
                        <Button 
                          onClick={() => {
                            scrollToSection("planos");
                            setMobileMenuOpen(false);
                          }} 
                          className="w-full"
                        >
                          Quero Contratar
                        </Button>
                      </>
                    )}
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Announcement Banner */}
      {announcementBanner && (
        <div 
          className="w-full py-3 px-3 md:px-6 text-center relative overflow-hidden"
          style={{ backgroundColor: announcementBanner.background_color }}
        >
          <div className="container mx-auto flex flex-col md:flex-row items-center justify-center gap-3 md:gap-4">
            <div className="flex-1">
              {announcementBanner.text && (
                <div 
                  className="text-sm md:text-base font-semibold rich-text-banner"
                  dangerouslySetInnerHTML={{ __html: announcementBanner.text }}
                  style={{ color: announcementBanner.text_color }}
                />
              )}
              {announcementBanner.subtitle && (
                <div 
                  className="text-xs md:text-sm mt-1 rich-text-banner"
                  dangerouslySetInnerHTML={{ __html: announcementBanner.subtitle }}
                  style={{ color: announcementBanner.text_color }}
                />
              )}
            </div>
            {announcementBanner.button_text && announcementBanner.button_url && (
              <Button
                size="sm"
                onClick={() => {
                  if (announcementBanner.button_url?.startsWith('#')) {
                    scrollToSection(announcementBanner.button_url.substring(1));
                  } else {
                    window.location.href = announcementBanner.button_url || '';
                  }
                }}
                className="shrink-0"
              >
                {announcementBanner.button_text}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section id="hero" className="py-12 md:py-16 lg:py-20 px-3 md:px-6 relative" style={getGradientStyle('hero')}>
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
        <div className="container mx-auto max-w-6xl px-0">
          <div className="grid md:grid-cols-2 gap-6 md:gap-12 items-center">
            <div className={`w-full px-3 md:px-0 text-center md:text-left transition-all duration-700 ${visibleSections.has('hero') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
              {getHeroImage('Logo Alternativo') && (
                <img 
                  src={getHeroImage('Logo Alternativo')} 
                  alt={heroImages.find(img => img.name === 'Logo Alternativo')?.alt_text || 'Renda Recorrente'} 
                  className="h-12 sm:h-14 md:h-16 mb-4 mx-auto md:mx-0"
                  loading="eager"
                />
              )}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 md:mb-6" style={{ color: getHeadingColor('hero') }}>
                Participe e ganhe dinheiro recomendando nossos aplicativos
              </h1>
              <p className="text-base sm:text-lg md:text-xl mb-6 md:mb-8" style={{ color: getTextColor('hero') }}>
                Temos vários produtos para você indicar e criar uma renda recorrente.
              </p>
              <Button 
                size="lg" 
                onClick={() => scrollToSection("planos")} 
                className="w-full md:w-auto text-base md:text-lg px-6 md:px-8 mb-6 md:mb-8 relative overflow-hidden group hover:shadow-2xl transition-all duration-300 before:absolute before:inset-0 before:bg-primary/20 before:blur-xl before:animate-pulse"
              >
                Começar Agora
                <Target className="ml-2 w-4 h-4 md:w-5 md:h-5 group-hover:rotate-12 transition-transform duration-300" />
              </Button>
              <div className="flex justify-center md:justify-start">
                {getHeroImage('Trust Badges') && (
                  <img 
                    src={getHeroImage('Trust Badges')} 
                    alt={heroImages.find(img => img.name === 'Trust Badges')?.alt_text || 'Selos de segurança'}
                    className="h-10 sm:h-12"
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
                  className="w-full max-w-xs sm:max-w-sm md:max-w-md animate-fade-in"
                  style={{ animationDelay: '400ms' }}
                  loading="eager"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Seja um Afiliado */}
      <section id="seja-afiliado" className="py-12 md:py-16 lg:py-20 px-3 md:px-6 relative" style={getGradientStyle('seja-afiliado')}>
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
        <div className={`container mx-auto max-w-6xl px-0 transition-all duration-700 ${visibleSections.has('seja-afiliado') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 md:mb-12 px-3 md:px-0" style={{ color: getHeadingColor('seja-afiliado') }}>
            Seja um Afiliado
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 px-3 md:px-0">
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
      <section id="comissao-recorrente" className="py-12 md:py-16 lg:py-20 px-3 md:px-6 relative" style={getGradientStyle('comissao-recorrente')}>
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
        <div className={`container mx-auto max-w-4xl px-0 text-center transition-all duration-700 ${visibleSections.has('comissao-recorrente') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 md:mb-6 px-3 md:px-0" style={{ color: getHeadingColor('comissao-recorrente') }}>
            O que é Comissão Recorrente?
          </h2>
          <p className="text-base sm:text-lg md:text-xl mb-6 md:mb-8 px-3 md:px-0" style={{ color: getTextColor('comissao-recorrente') }}>
            Todo mês que o cliente renovar a assinatura você ganhará a comissão.
          </p>
          <Card className="bg-primary/5 border-primary/20 transition-all duration-700 hover:shadow-lg mx-3 md:mx-0">
            <CardContent className="pt-6">
              <TrendingUp className="w-12 h-12 md:w-16 md:h-16 text-primary mx-auto mb-4" />
              <p className="text-base md:text-lg text-foreground">
                Com a comissão recorrente, todo mês você receberá comissões das indicações antigas 
                somando com as novas que são feitas, assim se você continuar indicando sua comissão 
                mensal só irá <strong>aumentando gradativamente</strong>.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Como Funciona */}
      <section id="como-funciona" className="py-12 md:py-16 lg:py-20 px-3 md:px-6 relative" style={getGradientStyle('como-funciona')}>
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
        <div className={`container mx-auto max-w-6xl px-0 transition-all duration-700 ${visibleSections.has('como-funciona') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 md:mb-12 px-3 md:px-0" style={{ color: getHeadingColor('como-funciona') }}>
            Como funciona o programa de afiliados?
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 px-3 md:px-0">
            <Card className={`transition-all duration-700 ${visibleSections.has('como-funciona') ? 'animate-fade-in opacity-100' : 'opacity-0 translate-y-10'}`}>
              <CardHeader>
                <UserPlus className="w-10 h-10 md:w-12 md:h-12 text-primary mb-4" />
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
                <Megaphone className="w-10 h-10 md:w-12 md:h-12 text-primary mb-4" />
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
                <DollarSign className="w-10 h-10 md:w-12 md:h-12 text-primary mb-4" />
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
      <section id="painel-afiliado" className="py-12 md:py-16 lg:py-20 px-3 md:px-6 relative" style={getGradientStyle('painel-afiliado')}>
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
        <div className={`container mx-auto max-w-6xl px-0 transition-all duration-700 ${visibleSections.has('painel-afiliado') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 md:mb-12 px-3 md:px-0" style={{ color: getHeadingColor('painel-afiliado') }}>
            Painel de Afiliado
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-center text-muted-foreground mb-8 md:mb-12 px-3 md:px-0" style={{ color: getTextColor('painel-afiliado') }}>
            Acompanhe suas indicações e seus ganhos de forma prática e rápida.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-3 md:px-0">
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
      <section id="vantagens" className="py-12 md:py-16 lg:py-20 px-3 md:px-6 relative" style={getGradientStyle('vantagens')}>
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
        <div className={`container mx-auto max-w-6xl px-0 transition-all duration-700 ${visibleSections.has('vantagens') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 md:mb-12 px-3 md:px-0" style={{ color: getHeadingColor('vantagens') }}>
            Vantagens de trabalhar com nosso sistema
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-3 md:px-0">
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
      <section id="funcionalidades" className="py-12 md:py-16 lg:py-20 px-3 md:px-6 relative" style={getGradientStyle('funcionalidades')}>
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
        <div className={`container mx-auto max-w-6xl px-0 transition-all duration-700 ${visibleSections.has('funcionalidades') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center px-3 md:px-0">
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
            <div className="order-1 md:order-2 space-y-6 md:space-y-8">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 md:mb-8" style={{ color: getHeadingColor('funcionalidades') }}>
                Funcionalidades
              </h2>
              
              <div className="space-y-3 md:space-y-4">
                {features.map((feature, index) => {
                  const IconComponent = getIconComponent(feature.icon);
                  return (
                    <div 
                      key={feature.id} 
                      className={`flex items-center gap-4 transition-all duration-700 delay-${index * 100}`}
                      style={{ transitionDelay: `${index * 100}ms` }}
                    >
                      <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <IconComponent className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                      </div>
                      <p className="text-base md:text-lg font-medium" style={{ color: getTextColor('funcionalidades') }}>{feature.name}</p>
                    </div>
                  );
                })}
              </div>

              <p className="text-base text-muted-foreground mt-8" style={{ color: getTextColor('funcionalidades') }}>
                O sistema está em constante atualização, então em breve teremos novas funcionalidades.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Layout Responsivo */}
      <section id="layout-responsivo" className="py-12 md:py-16 lg:py-20 px-3 md:px-6 relative" style={getGradientStyle('layout-responsivo')}>
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
        <div className={`container mx-auto max-w-6xl px-0 text-center transition-all duration-700 ${visibleSections.has('layout-responsivo') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 md:mb-6 px-3 md:px-0" style={{ color: getHeadingColor('layout-responsivo') }}>
            Layout Responsivo
          </h2>
          <p className="text-base sm:text-lg md:text-xl mb-8 md:mb-12 px-3 md:px-0" style={{ color: getTextColor('layout-responsivo') }}>
            Acesse o APP Renda recorrente em todos os dispositivos, Notebooks, PCs, celulares e tablets
          </p>
          <div className="flex justify-center px-3 md:px-0">
            {getHeroImage('Responsivo') && (
              <img 
                src={getHeroImage('Responsivo')} 
                alt={heroImages.find(img => img.name === 'Responsivo')?.alt_text || 'APP em diversos dispositivos'} 
                className="w-full max-w-full md:max-w-3xl lg:max-w-4xl object-contain animate-fade-in"
                style={{ animationDelay: '200ms' }}
              />
            )}
          </div>
        </div>
      </section>

      {/* Produtos Disponíveis */}
      {products.length > 0 && (
        <section id="produtos" className="py-12 md:py-16 lg:py-20 px-3 md:px-6 relative" style={getGradientStyle('produtos')}>
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
          <div className="container mx-auto max-w-6xl px-0">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 md:mb-12 px-3 md:px-0" style={{ color: getHeadingColor('produtos') }}>
              Produtos Disponíveis para Afiliação
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-center mb-8 md:mb-12 px-3 md:px-0" style={{ color: getTextColor('produtos') }}>
              Escolha entre nossos produtos e comece a ganhar comissões recorrentes
            </p>
            <div className="grid grid-cols-1 gap-4 md:gap-6 max-w-3xl mx-auto px-3 md:px-0">
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
                      <div className="flex items-center gap-3 md:gap-4">
                        {iconUrl && (
                          <img 
                            src={iconUrl} 
                            alt={product.nome}
                            className="w-12 h-12 md:w-16 md:h-16 object-contain flex-shrink-0"
                          />
                        )}
                        <CardTitle className="text-lg md:text-xl">{product.nome}</CardTitle>
                      </div>
                      <CardDescription className="whitespace-pre-line mt-4">{product.descricao}</CardDescription>
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
      <section id="depoimentos" className="py-12 md:py-16 lg:py-20 px-3 md:px-6 relative" style={getGradientStyle('depoimentos')}>
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
        <div className={`container mx-auto max-w-6xl px-0 transition-all duration-700 ${visibleSections.has('depoimentos') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 md:mb-12 px-3 md:px-0" style={{ color: getHeadingColor('depoimentos') }}>
            O que dizem nossos afiliados
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 px-3 md:px-0">
            {testimonials.slice(0, 3).map((testimonial, index) => (
              <Card key={testimonial.id} className={`transition-all duration-700 delay-${index * 100} ${visibleSections.has('depoimentos') ? 'animate-fade-in opacity-100' : 'opacity-0 translate-y-10'}`}>
                <CardHeader>
                  <div className="flex items-center gap-3 md:gap-4 mb-4">
                    <Avatar className="w-16 h-16 md:w-20 md:h-20">
                      <AvatarImage src={testimonial.avatar_url || undefined} alt={testimonial.name} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xl md:text-2xl">
                        {testimonial.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm md:text-base" style={{ color: getTextColor('depoimentos') }}>{testimonial.name}</p>
                      <p className="text-xs md:text-sm" style={{ color: getTextColor('depoimentos') }}>{testimonial.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="italic text-sm md:text-base" style={{ color: getTextColor('depoimentos') }}>"{testimonial.content}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-12 md:py-16 lg:py-20 px-3 md:px-6 relative" style={getGradientStyle('planos')}>
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
        <div className={`container mx-auto max-w-6xl px-0 transition-all duration-700 ${visibleSections.has('planos') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
          <h2 
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-3 md:mb-4 px-3 md:px-0 cursor-pointer select-none" 
            style={{ color: getHeadingColor('planos') }}
            onClick={() => {
              const newCount = clickCount + 1;
              setClickCount(newCount);
              
              // Resetar contador após 2 segundos sem cliques
              if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current);
              }
              clickTimeoutRef.current = setTimeout(() => {
                setClickCount(0);
              }, 2000);
              
              // Ativar modo desenvolvedor ao clicar 10x
              if (newCount === 10) {
                localStorage.setItem('devMode', 'true');
                setClickCount(0);
                toast({
                  title: "🔧 Modo Desenvolvedor Ativado",
                  description: "Os formulários serão preenchidos automaticamente",
                  duration: 3000,
                });
              }
            }}
          >
            Escolha seu Plano
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-center mb-8 md:mb-12 px-3 md:px-0" style={{ color: getTextColor('planos') }}>
            Comece gratuitamente ou escolha um plano que se adapte às suas necessidades
          </p>
          
          {/* Card de Cupom */}
          <div className="max-w-7xl mx-auto mb-8 px-3 md:px-0">
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="text-center">Possui um cupom?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Digite o código do cupom"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase());
                        setValidatedCoupon(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleApplyCoupon();
                        }
                      }}
                      className="pr-10"
                    />
                    {couponCode && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => {
                          setCouponCode("");
                          setValidatedCoupon(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Button 
                    onClick={handleApplyCoupon}
                    disabled={loadingCoupon || !couponCode.trim()}
                    className="w-full sm:w-auto"
                  >
                    {loadingCoupon ? "Validando..." : "Aplicar cupom"}
                  </Button>
                </div>

                {validatedCoupon && (
                  <div className="border rounded-lg p-4 bg-muted/50 animate-fade-in">
                    {/* Layout Mobile */}
                    <div className="flex flex-col md:hidden items-center gap-4">
                      {validatedCoupon.affiliate && (
                        <div className="flex flex-col items-center gap-3">
                          <Avatar>
                            <AvatarImage src={validatedCoupon.affiliate.avatar_url} />
                            <AvatarFallback>
                              {validatedCoupon.affiliate.name?.charAt(0) || "A"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-center">
                            <p className="font-semibold">{validatedCoupon.affiliate.name}</p>
                            <p className="text-sm text-muted-foreground">
                              @{validatedCoupon.affiliate.username}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex flex-col items-center gap-3 text-center w-full">
                        <Badge variant="outline" className="text-base w-fit">
                          {validatedCoupon.type === "percentage" && `${validatedCoupon.value}% de desconto`}
                          {validatedCoupon.type === "days" && `${validatedCoupon.value} dias grátis`}
                          {validatedCoupon.type === "free_trial" && `${validatedCoupon.value} meses grátis`}
                        </Badge>
                        
                        {validatedCoupon.description && (
                          <p className="text-lg text-muted-foreground">
                            {validatedCoupon.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Layout Desktop/Tablet */}
                    {validatedCoupon.affiliate && (
                      <div className="hidden md:flex items-start gap-4">
                        <Avatar>
                          <AvatarImage src={validatedCoupon.affiliate.avatar_url} />
                          <AvatarFallback>
                            {validatedCoupon.affiliate.name?.charAt(0) || "A"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-3">
                          <div>
                            <p className="font-semibold text-lg">{validatedCoupon.affiliate.name}</p>
                            <p className="text-sm text-muted-foreground">
                              @{validatedCoupon.affiliate.username}
                            </p>
                          </div>
                          
                          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                            <Badge variant="outline" className="text-base w-fit">
                              {validatedCoupon.type === "percentage" && `${validatedCoupon.value}% de desconto`}
                              {validatedCoupon.type === "days" && `${validatedCoupon.value} dias grátis`}
                              {validatedCoupon.type === "free_trial" && `${validatedCoupon.value} meses grátis`}
                            </Badge>
                            
                            {validatedCoupon.description && (
                              <p className="text-lg text-muted-foreground">
                                {validatedCoupon.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-3 md:px-0 max-w-7xl mx-auto">
            {plans.map((plan, index) => {
              const isFree = plan.price === 0;
              const isPro = !isFree;
              
              return (
                <div 
                  key={plan.id} 
                  className={`relative bg-[#2a2a2a] rounded-2xl p-6 md:p-8 shadow-xl transition-all duration-700 hover:scale-105 flex flex-col ${
                    index === 0 ? '' : 'delay-100'
                  } ${visibleSections.has('planos') ? 'animate-fade-in opacity-100' : 'opacity-0 translate-y-10'}`}
                >
                  {/* Badge */}
                  <div className="absolute top-4 right-4 bg-[#22c55e] text-[#1a1a1a] px-3 py-1 rounded-full text-xs font-semibold">
                    {isFree ? 'Para conhecer' : 'Mais lucrativo'}
                  </div>


                  {/* Título */}
                  <h3 className="text-[#22c55e] text-2xl md:text-3xl font-bold text-center mb-6">
                    {plan.name}
                  </h3>

                  {/* Features - flex-grow para ocupar espaço disponível */}
                  <ul className="space-y-1 mb-6 flex-grow">
                    {features.map((feature, i) => {
                      const IconComponent = getIconComponent(feature.icon);
                      const hasPlanFeatures = Array.isArray(plan.plan_features) && plan.plan_features.length > 0;
                      const isIncluded = hasPlanFeatures
                        ? plan.plan_features!.some((pf) => pf.feature_id === feature.id)
                        : false;
                      return (
                        <li
                          key={feature.id}
                          className="flex items-start gap-3 transition-all duration-300 hover:translate-x-2 hover:scale-105 cursor-default"
                        >
                          <IconComponent
                            className={`w-5 h-5 flex-shrink-0 mt-0.5 transition-transform duration-300 ${isIncluded ? "text-[#22c55e]" : "text-red-500"}`}
                          />
                          <span
                            className={`text-sm md:text-base transition-colors duration-300 ${isIncluded ? "text-white" : "text-red-500 line-through"}`}
                          >
                            {feature.name}
                          </span>
                        </li>
                      );
                    })}

                  </ul>
                  
                  <div className={`mb-8 p-4 rounded-lg border transition-all ${
                    !plan.is_free 
                      ? 'bg-gradient-to-r from-primary/40 to-primary/25 border-primary/80 border-2 shadow-2xl shadow-primary/40 ring-2 ring-primary/30' 
                      : 'bg-gradient-to-r from-primary/20 to-primary/10 border-primary/30'
                  }`}>
                    <div className="flex items-center justify-between gap-4">
                      <p className={`text-sm whitespace-nowrap ${!plan.is_free ? 'text-primary-foreground font-semibold' : 'text-white'}`}>
                        Comissão recorrente
                      </p>
                      <p className={`text-2xl font-bold ${!plan.is_free ? 'text-primary-foreground drop-shadow-lg' : 'text-primary'}`}>
                        {plan.commission_percentage}%
                      </p>
                    </div>
                  </div>

                  {/* Container para elementos alinhados - mt-auto garante que fique no final */}
                  <div className="mt-auto">
                    {/* Preço */}
                    <div className="mb-6">
                      {isPro && plan.original_price && plan.original_price > plan.price ? (
                        <div className="text-center mb-2">
                          <span className="text-white text-sm">de </span>
                          <span className="text-white line-through text-sm">
                            R${plan.original_price.toFixed(2)}
                          </span>
                          <span className="text-white text-sm"> por:</span>
                        </div>
                      ) : (
                        <div className="h-6 mb-2"></div>
                      )}
                      <div className="text-center">
                        {plan.is_free ? (
                          <span className="text-[#22c55e] text-5xl md:text-6xl font-bold">
                            FREE
                          </span>
                        ) : (
                          <>
                            <span className="text-[#22c55e] text-4xl md:text-5xl font-bold">
                              R${plan.price.toFixed(2)}
                            </span>
                            <span className="text-white text-lg">/{plan.billing_period === 'monthly' ? 'mensal' : plan.billing_period === 'yearly' ? 'anual' : plan.billing_period}</span>
                          </>
                        )}
                      </div>
                      {isPro && plan.original_price && plan.original_price > plan.price ? (
                        <p className="text-white text-center text-sm mt-2">
                          {(plan.original_price - plan.price).toFixed(2)} de desconto
                        </p>
                      ) : (
                        <div className="h-5 mt-2"></div>
                      )}
                    </div>

                    {/* Botão */}
                    <Button
                      className="w-full bg-[#86efac] hover:bg-[#4ade80] text-gray-900 font-semibold py-6 rounded-lg transition-all duration-300"
                      onClick={() => {
                        console.log('Redirecting to signup funnel for plan:', plan.id);
                        window.location.href = `/signup/${plan.id}`;
                      }}
                    >
                      <MousePointer2 className="w-5 h-5 mr-2" />
                      Selecionar Plano {plan.name}
                    </Button>


                    {/* Teste Grátis */}
                    {(() => {
                      // Debug: verificar conteúdo de features
                      console.log(`[Plan ${plan.name}] Features:`, plan.features);
                      
                      const trialDays = plan.features && Array.isArray(plan.features) 
                        ? plan.features.find((f: string) => {
                            const isTrial = typeof f === 'string' && f.startsWith('trial_days:');
                            if (isTrial) console.log(`[Plan ${plan.name}] Found trial_days:`, f);
                            return isTrial;
                          })?.split(':')[1] 
                        : null;
                      
                      const days = trialDays ? parseInt(trialDays, 10) : 0;
                      console.log(`[Plan ${plan.name}] Trial days parsed:`, days);
                      
                      return days > 0 ? (
                        <p className="text-[#22c55e] text-center text-sm font-medium mt-4">
                          Teste Grátis por {days} {days === 1 ? 'dia' : 'dias'}
                        </p>
                      ) : (
                        <div className="h-5 mt-4"></div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-8 mt-12 px-3 md:px-0">
            <div className="flex flex-col items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <span className="text-foreground text-sm text-center">Compra Segura</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Trophy className="w-6 h-6 text-primary" />
              <span className="text-foreground text-sm text-center">Satisfação Garantida</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Lock className="w-6 h-6 text-primary" />
              <span className="text-foreground text-sm text-center">Privacidade Protegida</span>
            </div>
          </div>
          
          {/* Stripe Security Info */}
          <p className="text-center text-sm text-muted-foreground mt-6 px-3 md:px-0 max-w-3xl mx-auto">
            Seu pagamento será processado pela Stripe, empresa líder mundial em pagamentos online, usada por grandes empresas e oferece máxima segurança e confiabilidade em todas as transações.
          </p>
        </div>
      </section>

      {/* FAQs */}
      <section id="faq" className="py-12 md:py-16 lg:py-20 px-3 md:px-6 relative" style={getGradientStyle('faq')}>
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
        <div className={`container mx-auto max-w-4xl px-0 transition-all duration-700 ${visibleSections.has('faq') ? 'animate-fade-in' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 md:mb-12 px-3 md:px-0" style={{ color: getHeadingColor('faq') }}>
            Perguntas Frequentes
          </h2>
          <Accordion type="single" collapsible className="w-full px-3 md:px-0">
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

      {/* Call to Action Final */}
      <section id="cta-final" className="py-12 md:py-16 lg:py-20 px-3 md:px-6 relative" style={getGradientStyle('cta-final')}>
        {isAdmin && (
          <Button
            onClick={() => setEditingBlock(editingBlock === 'cta-final' ? null : 'cta-final')}
            className="absolute top-4 right-4 z-40"
            size="sm"
            variant="outline"
          >
            <Edit className="w-4 h-4" />
          </Button>
        )}
        <div className="container mx-auto max-w-4xl text-center px-0">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 md:mb-6 px-3 md:px-0" style={{ color: getHeadingColor('cta-final') }}>
            Transforme suas Indicações em Renda Recorrente!
          </h2>
          <p className="text-base sm:text-lg md:text-xl mb-8 md:mb-10 px-3 md:px-0" style={{ color: getTextColor('cta-final') }}>
            Não perca mais tempo sem ganhar! Junte-se ao APP Renda Recorrente e tenha controle total dos seus ganhos mensais.
          </p>
          
          <Button 
            size="lg" 
            onClick={() => scrollToSection("planos")} 
            className="w-full md:w-auto text-base md:text-lg px-8 md:px-12 py-6 md:py-7 mb-8 relative overflow-hidden group hover:shadow-2xl transition-all duration-300"
          >
            Experimente Gratuitamente! →
          </Button>

          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 px-3 md:px-0">
            <div className="flex items-center gap-2 bg-background/10 backdrop-blur-sm px-4 py-2 rounded-full">
              <CheckCircle2 className="w-5 h-5" style={{ color: getTextColor('cta-final') }} />
              <span className="text-sm md:text-base font-medium" style={{ color: getTextColor('cta-final') }}>
                Plano FREE disponível
              </span>
            </div>
            <div className="flex items-center gap-2 bg-background/10 backdrop-blur-sm px-4 py-2 rounded-full">
              <CheckCircle2 className="w-5 h-5" style={{ color: getTextColor('cta-final') }} />
              <span className="text-sm md:text-base font-medium" style={{ color: getTextColor('cta-final') }}>
                Cancele quando quiser
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 md:py-12 px-3 md:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-6 md:mb-8">
            <div>
              {getHeroImage('Logo Alternativo') && (
                <img 
                  src={getHeroImage('Logo Alternativo')} 
                  alt={heroImages.find(img => img.name === 'Logo Alternativo')?.alt_text || 'Logo'} 
                  className="h-6 md:h-8 mb-3 md:mb-4"
                />
              )}
              <p className="text-xs md:text-sm text-muted-foreground">
                Sistema completo para gerenciar seu programa de afiliados.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">Produto</h3>
              <ul className="space-y-2 text-xs md:text-sm text-muted-foreground">
                <li className="cursor-pointer hover:text-foreground transition-colors" onClick={() => scrollToSection("funcionalidades")}>Funcionalidades</li>
                <li className="cursor-pointer hover:text-foreground transition-colors" onClick={() => scrollToSection("planos")}>Preços</li>
                <li className="cursor-pointer hover:text-foreground transition-colors" onClick={() => navigate("/training")}>Treinamento</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">Suporte</h3>
              <ul className="space-y-2 text-xs md:text-sm text-muted-foreground">
                <li className="cursor-pointer hover:text-foreground transition-colors" onClick={() => scrollToSection("faq")}>Central de Ajuda</li>
                <li className="cursor-pointer hover:text-foreground transition-colors" onClick={() => window.open(getWhatsappUrl(), '_blank')}>WhatsApp</li>
                <li className="cursor-pointer hover:text-foreground transition-colors" onClick={() => scrollToSection("faq")}>FAQ</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">Legal</h3>
              <ul className="space-y-2 text-xs md:text-sm text-muted-foreground">
                <li className="cursor-pointer hover:text-foreground transition-colors" onClick={() => {
                  sessionStorage.setItem('landingScrollPosition', window.scrollY.toString());
                  navigate("/terms");
                }}>Termos de Uso</li>
                <li className="cursor-pointer hover:text-foreground transition-colors" onClick={() => {
                  sessionStorage.setItem('landingScrollPosition', window.scrollY.toString());
                  navigate("/privacy");
                }}>Privacidade</li>
                <li className="cursor-pointer hover:text-foreground transition-colors" onClick={() => {
                  sessionStorage.setItem('landingScrollPosition', window.scrollY.toString());
                  navigate("/cookies");
                }}>Cookies</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-6 md:pt-8 text-center text-xs md:text-sm text-muted-foreground">
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
          onPreview={(config) => {
            setGradientConfigs(prev => ({ ...prev, [config.block_name]: config }));
          }}
          onClose={() => setEditingBlock(null)}
        />
      )}

      <CookieConsent />
    </div>
  );
};

export default LandingPage;
