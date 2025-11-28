import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  User,
  GraduationCap,
  Users,
  Target,
  Calendar,
  Wallet,
  Ticket,
  CreditCard,
  MapPin,
  LogOut,
  Crown,
  Link2,
  Menu,
  Package,
  Building2,
  FileSearch,
  FileText,
  Home,
  Settings,
} from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useQueryClient } from "@tanstack/react-query";
import { APP_VERSION } from "@/config/version";
import logo from "@/assets/logo.png";

interface SidebarProps {
  user: SupabaseUser | null;
  isAdmin: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isLoading?: boolean;
}

const affiliateMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: User, label: "Cadastro Afiliado", path: "/profile" },
  { icon: GraduationCap, label: "Treinamento", path: "/training" },
  { icon: Target, label: "Indicações", path: "/referrals" },
  { icon: Users, label: "Sub Afiliados", path: "/sub-affiliates" },
  { icon: Target, label: "Comissões Diárias", path: "/commissions-daily" },
  { icon: Calendar, label: "Comissões Mensais", path: "/commissions-monthly" },
  { icon: Calendar, label: "Atividades", path: "/activities" },
  { icon: Ticket, label: "Cupons e Links", path: "/coupons" },
  { icon: Wallet, label: "Saques", path: "/withdrawals" },
  { icon: CreditCard, label: "Plano Afiliação", path: "/plan" },
  { icon: MapPin, label: "Empresas Google", path: "/google-business" },
];

const adminMenuItems = [
  { icon: Home, label: "Home Landing Page", path: "/" },
  { icon: LayoutDashboard, label: "Dashboard Admin", path: "/admin/dashboard" },
  { icon: Users, label: "Usuários", path: "/admin/users" },
  { icon: Target, label: "Afiliados", path: "/admin/affiliates" },
  { icon: FileSearch, label: "API de CPF", path: "/admin/cpf-apis" },
  { icon: CreditCard, label: "Pagamentos", path: "/admin/payments" },
  { icon: Calendar, label: "Eventos Stripe", path: "/admin/stripe-events" },
  { icon: Ticket, label: "Cupons", path: "/admin/coupons" },
  { icon: Package, label: "Produtos", path: "/admin/products" },
  { icon: Building2, label: "Banco e Contas", path: "/admin/bank-accounts" },
  { icon: CreditCard, label: "Planos e Preços", path: "/admin/plans" },
  { icon: LayoutDashboard, label: "Landing Page", path: "/admin/landing-page" },
  { icon: FileText, label: "Termos e Privacidade", path: "/admin/legal-documents" },
  { icon: Settings, label: "Configurações", path: "/admin/settings" },
];

export const Sidebar = ({ user, isAdmin, open, onOpenChange, isLoading = false }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [showAdminMenu, setShowAdminMenu] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isDarkTheme, setIsDarkTheme] = useState(document.documentElement.classList.contains('dark'));

  // Observar mudanças de tema
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDarkTheme(document.documentElement.classList.contains('dark'));
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Carregar configurações do sidebar
  const { data: sidebarConfig } = useQuery({
    queryKey: ['sidebar-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .in('key', [
          'sidebar_color_start',
          'sidebar_color_end',
          'sidebar_intensity_start',
          'sidebar_intensity_end',
          'sidebar_gradient_start_position',
          'sidebar_text_color',
          'sidebar_text_color_light',
          'sidebar_text_color_dark',
          'sidebar_accent_color',
          'sidebar_logo_url_light',
          'sidebar_logo_url_dark'
        ]);

      if (error) {
        console.error('Error loading sidebar config:', error);
        return null;
      }

      const config: Record<string, string> = {};
      data?.forEach(setting => {
        config[setting.key] = setting.value;
      });
      
      return config;
    },
  });

  // Extrair configurações
  const colorStart = sidebarConfig?.sidebar_color_start || '#00bf63';
  const colorEnd = sidebarConfig?.sidebar_color_end || '#00bf63';
  const intensityStart = parseInt(sidebarConfig?.sidebar_intensity_start || '37');
  const intensityEnd = parseInt(sidebarConfig?.sidebar_intensity_end || '25');
  const gradientStartPos = parseInt(sidebarConfig?.sidebar_gradient_start_position || '0');
  const textColorLight = sidebarConfig?.sidebar_text_color_light || '#000000';
  const textColorDark = sidebarConfig?.sidebar_text_color_dark || '#ffffff';
  const accentColor = sidebarConfig?.sidebar_accent_color || '#00e676';
  const logoUrlLight = sidebarConfig?.sidebar_logo_url_light || logo;
  const logoUrlDark = sidebarConfig?.sidebar_logo_url_dark || logo;

  // Usar tema do estado
  const currentTextColor = isDarkTheme ? textColorDark : textColorLight;
  const currentLogoUrl = isDarkTheme ? logoUrlDark : logoUrlLight;

  // Calcular gradiente com posição de início
  const gradientStyle = {
    background: `linear-gradient(180deg, ${colorStart}${Math.round((intensityStart / 100) * 255).toString(16).padStart(2, '0')} ${gradientStartPos}%, ${colorEnd}${Math.round((intensityEnd / 100) * 255).toString(16).padStart(2, '0')} 100%)`
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url, name')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setAvatarUrl(data.avatar_url);
          setUserName(data.name);
        }
      }
    };
    fetchProfile();

    // Subscription em tempo real para atualizar o avatar quando mudar
    if (user?.id) {
      const channel = supabase
        .channel('profile-avatar-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            console.log('🔄 Profile update received:', payload);
            if (payload.new) {
              const newData = payload.new as any;
              if ('avatar_url' in newData) {
                console.log('✅ Setting new avatar URL:', newData.avatar_url);
                setAvatarUrl(newData.avatar_url);
              }
              if ('name' in newData) {
                console.log('✅ Setting new name:', newData.name);
                setUserName(newData.name);
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Realtime subscription status:', status);
        });

      return () => {
        console.log('🔌 Unsubscribing from profile changes');
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

  const handleLogout = async () => {
    try {
      // Limpar cache de role ao fazer logout
      if (user?.id) {
        localStorage.removeItem(`user_role_${user.id}`);
      }
      
      // Aguardar logout completar
      const { error } = await supabase.auth.signOut();
      
      // Se o erro for "session not found", fazer logout local e continuar
      if (error && error.message !== 'Auth session missing!') {
        if (import.meta.env.DEV) {
          console.error('Erro ao fazer logout:', error);
        }
        toast({
          title: "Erro ao sair",
          description: "Tente novamente mais tarde.",
          variant: "destructive",
        });
        return;
      }
      
      // Se a sessão não existe no servidor, fazer logout local
      if (error?.message === 'Auth session missing!') {
        localStorage.clear();
        queryClient.clear();
      }
      
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
      
      // Redirecionar sempre, mesmo se a sessão não existir
      navigate('/');
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erro inesperado ao fazer logout:', error);
      }
      // Mesmo com erro, tentar limpar dados locais e redirecionar
      localStorage.clear();
      queryClient.clear();
      navigate('/');
    }
  };

  const getInitials = () => {
    const name = userName || user?.user_metadata?.name || user?.email;
    return name?.substring(0, 2).toUpperCase() || "U";
  };
  
  // Prefetch de dados ao hover nos links
  const handlePrefetch = async (path: string) => {
    // Mapeia as rotas para as queryKeys correspondentes
    const prefetchMap: Record<string, string[]> = {
      '/dashboard': ['dashboard-stats'],
      '/admin/users': ['admin-users'],
      '/admin/coupons': ['admin-coupons'],
      '/admin/plans': ['admin-plans'],
      '/admin/products': ['admin-products'],
      
      '/admin/bank-accounts': ['admin-bank-accounts'],
      '/admin/stripe-events': ['admin-stripe-events'],
      '/commissions/daily': ['commissions-daily'],
      '/commissions/monthly': ['commissions-monthly'],
      '/withdrawals': ['withdrawals'],
      '/referrals': ['referrals'],
      '/sub-affiliates': ['sub-affiliates'],
      '/activities': ['activities'],
    };

    const queryKeys = prefetchMap[path];
    if (queryKeys) {
      // Prefetch apenas se não estiver em cache ou estiver stale
      queryKeys.forEach(key => {
        queryClient.prefetchQuery({
          queryKey: [key],
          queryFn: async () => {
            // Esta função será substituída pela query real quando a página carregar
            // O importante é que o prefetch prepare o cache
            return null;
          },
        });
      });
    }
  };
  
  if (!user) return null;

  const menuItems = isAdmin 
    ? (showAdminMenu ? adminMenuItems : affiliateMenuItems)
    : affiliateMenuItems;

  const SidebarContent = ({ closeSidebar }: { closeSidebar?: () => void }) => (
    <>
      <div className="p-6 border-b" style={{ borderColor: `${colorEnd}40` }}>
        <div className="flex items-center justify-center mb-4">
          <img src={currentLogoUrl} alt="APP Renda Recorrente" className="h-16 w-auto" />
        </div>
        <div className="text-center text-xs" style={{ color: `${currentTextColor}80` }}>
          Versão: {APP_VERSION}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm"
              )}
              style={{
                backgroundColor: isActive ? accentColor : 'transparent',
                color: currentTextColor,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = `${accentColor}30`;
                }
                handlePrefetch(item.path);
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t space-y-2" style={{ borderColor: `${colorEnd}40` }}>
        <div className="flex flex-col items-center gap-3 px-3 py-2">
          <Avatar className="w-16 h-16">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={user.user_metadata?.name || "Avatar"} />}
            <AvatarFallback style={{ backgroundColor: accentColor, color: currentTextColor }} className="text-lg">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-center text-center w-full">
            <p className="text-sm font-medium truncate w-full" style={{ color: currentTextColor }}>
              {userName || user.user_metadata?.name || "Usuário"}
            </p>
            <p className="text-xs truncate w-full" style={{ color: `${currentTextColor}70` }}>
              {user.email}
            </p>
            {isAdmin && (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs font-medium" style={{ color: currentTextColor }}>Super Admin</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setShowAdminMenu(!showAdminMenu)}
                  title={showAdminMenu ? "Ver menu de Afiliado" : "Ver menu de Admin"}
                  style={{ color: currentTextColor }}
                >
                  {showAdminMenu ? <Crown className="w-3 h-3" /> : <User className="w-3 h-3" />}
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              closeSidebar?.();
              handleLogout();
            }}
            className="flex-1 flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm"
            style={{ color: currentTextColor }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${accentColor}30`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <LogOut size={18} />
            Sair
          </button>
          <ThemeToggle />
        </div>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-4 left-4 z-50 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0" style={{ ...gradientStyle, color: currentTextColor }}>
          <VisuallyHidden>
            <SheetTitle>Menu de navegação</SheetTitle>
          </VisuallyHidden>
          <div className="flex flex-col h-full">
            <SidebarContent closeSidebar={() => onOpenChange?.(false)} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="hidden lg:flex w-64 flex-col h-screen sticky top-0 flex-shrink-0" style={{ ...gradientStyle, color: currentTextColor }}>
      <SidebarContent />
    </aside>
  );
};
