import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, User, GraduationCap, Users, Target, Wallet, Ticket, CreditCard, MapPin, LogOut, Crown, Link2, Package, Building2, Home, Settings, ChevronDown, PlusSquare, Coins, Zap, Star, TrendingUp, Banknote, LineChart, UserPlus, UserCog, RefreshCw, Check, X, Camera, Loader2, Headphones, Activity, ShieldCheck, FlaskConical } from "lucide-react";
import { EnvironmentToggle } from "./EnvironmentToggle";
import { useEnvironmentOptional } from "@/contexts/EnvironmentContext";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useQueryClient } from "@tanstack/react-query";
import { useDeployedVersion } from "@/hooks/useDeployedVersion";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/logo.png";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AvatarCropDialog, AvatarSizes } from "@/components/AvatarCropDialog";
import { generateAvatarPaths, getAvatarOriginalUrl } from "@/lib/avatarUtils";
import { toast as sonnerToast } from "sonner";
import { SidebarNotificationsPopover } from "./SidebarNotificationsPopover";
import { SystemErrorsAlert } from "./SystemErrorsAlert";
interface SidebarProps {
  user: SupabaseUser | null;
  isAdmin: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isLoading?: boolean;
  initialized?: boolean;
}

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
  isPro?: boolean;
}

const affiliateMenuItems: MenuItem[] = [{
  icon: LayoutDashboard,
  label: "Dashboard",
  path: "/user/dashboard"
}, {
  icon: LineChart,
  label: "Desempenho",
  path: "/user/performance"
}, {
  icon: Coins,
  label: "Comissões",
  path: "/user/commissions"
}, {
  icon: UserPlus,
  label: "Meus Indicados",
  path: "/user/referrals"
}, {
  icon: Ticket,
  label: "Meus Cupons",
  path: "/user/coupons"
}, {
  icon: GraduationCap,
  label: "Treinamentos",
  path: "/user/training"
}, {
  icon: Users,
  label: "Sub Afiliados",
  path: "/user/sub-affiliates",
  isPro: true
}];
const settingsMenuItems = [{
  icon: User,
  label: "Meu Perfil",
  path: "/user/settings/personal"
}, {
  icon: Crown,
  label: "Plano",
  path: "/user/settings/plan"
}];
const adminMenuItems = [{
  icon: LayoutDashboard,
  label: "Dashboard Admin",
  path: "/admin/dashboard"
}, {
  icon: Target,
  label: "Afiliados",
  path: "/admin/affiliates"
}, {
  icon: Coins,
  label: "Comissões",
  path: "/admin/commissions"
}, {
  icon: GraduationCap,
  label: "Treinamentos",
  path: "/admin/training"
}, {
  icon: CreditCard,
  label: "Stripe",
  path: "/admin/stripe"
}];
export const Sidebar = ({
  user,
  isAdmin,
  open,
  onOpenChange,
  isLoading = false,
  initialized = false
}: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [showAdminMenu, setShowAdminMenu] = useState(() => {
    const saved = localStorage.getItem('sidebar_admin_view');
    return saved ? JSON.parse(saved) : true;
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEnvironment, setUserEnvironment] = useState<string>("production");
  const [userPlan, setUserPlan] = useState<{
    is_free: boolean;
    plan_name: string | null;
  } | null>(null);
  const [userSubscription, setUserSubscription] = useState<{
    current_period_start: string;
    current_period_end: string;
    status: string;
    commission_percentage: number;
    cancel_at_period_end: boolean | null;
  } | null>(null);
  const [isDarkTheme, setIsDarkTheme] = useState(document.documentElement.classList.contains('dark'));
  const [sidebarTimeout, setSidebarTimeout] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showAvatarCropDialog, setShowAvatarCropDialog] = useState(false);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const [avatarImageSrc, setAvatarImageSrc] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { checkVersion, ...versionInfo } = useVersionCheck();
  const { formattedVersion } = useDeployedVersion();
  const { unreadCount } = useUnreadMessages(isAdmin && showAdminMenu);
  const environmentContext = useEnvironmentOptional();

  // Salvar preferência de menu no localStorage e notificar BottomNav
  useEffect(() => {
    localStorage.setItem('sidebar_admin_view', JSON.stringify(showAdminMenu));
    // Disparar evento customizado para sincronizar BottomNav na mesma aba
    window.dispatchEvent(new Event('sidebar-mode-change'));
  }, [showAdminMenu]);

  // Observar mudanças de tema
  useEffect(() => {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.attributeName === 'class') {
          setIsDarkTheme(document.documentElement.classList.contains('dark'));
        }
      });
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    return () => observer.disconnect();
  }, []);

  // Determinar se está no modo admin baseado na rota
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Carregar configurações do sidebar com cache (diferenciando admin e user)
  const {
    data: sidebarConfig
  } = useQuery({
    queryKey: ['sidebar-config', isAdminRoute],
    queryFn: async () => {
      try {
        // Definir prefixo baseado no modo
        const prefix = isAdminRoute ? 'admin_sidebar_' : 'sidebar_';
        const keys = isAdminRoute 
          ? ['admin_sidebar_color_start', 'admin_sidebar_color_end', 'admin_sidebar_intensity_start', 'admin_sidebar_intensity_end', 'admin_sidebar_gradient_start_position', 'admin_sidebar_text_color', 'admin_sidebar_text_color_light', 'admin_sidebar_text_color_dark', 'admin_sidebar_accent_color', 'admin_sidebar_logo_url_light', 'admin_sidebar_logo_url_dark']
          : ['sidebar_color_start', 'sidebar_color_end', 'sidebar_intensity_start', 'sidebar_intensity_end', 'sidebar_gradient_start_position', 'sidebar_text_color', 'sidebar_text_color_light', 'sidebar_text_color_dark', 'sidebar_accent_color', 'sidebar_logo_url_light', 'sidebar_logo_url_dark'];
        
        const {
          data,
          error
        } = await supabase.from('app_settings').select('*').in('key', keys);
        if (error) {
          console.error('Error loading sidebar config:', error);
          const cacheKey = isAdminRoute ? 'offline_cache_app_admin_sidebar_config' : 'offline_cache_app_sidebar_config';
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            try {
              return JSON.parse(cached).data;
            } catch {
              return null;
            }
          }
          return null;
        }
        const config: Record<string, string> = {};
        data?.forEach(setting => {
          // Normalizar as chaves removendo o prefixo admin_ se presente
          const normalizedKey = setting.key.replace('admin_', '');
          config[normalizedKey] = setting.value;
        });
        // Salvar no cache
        try {
          const cacheKey = isAdminRoute ? 'offline_cache_app_admin_sidebar_config' : 'offline_cache_app_sidebar_config';
          localStorage.setItem(cacheKey, JSON.stringify({ data: config, timestamp: Date.now() }));
        } catch (e) {
          console.warn('Erro ao salvar sidebar config no cache:', e);
        }
        return config;
      } catch (error) {
        console.error('Error loading sidebar config:', error);
        const cacheKey = isAdminRoute ? 'offline_cache_app_admin_sidebar_config' : 'offline_cache_app_sidebar_config';
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            return JSON.parse(cached).data;
          } catch {
            return null;
          }
        }
        return null;
      }
    }
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
    background: `linear-gradient(180deg, ${colorStart}${Math.round(intensityStart / 100 * 255).toString(16).padStart(2, '0')} ${gradientStartPos}%, ${colorEnd}${Math.round(intensityEnd / 100 * 255).toString(16).padStart(2, '0')} 100%)`
  };
  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        const {
          data
        } = await supabase.from('profiles').select('avatar_url, name, environment').eq('id', user.id).single();
        if (data) {
          setAvatarUrl(data.avatar_url);
          setUserName(data.name);
          if (data.environment) {
            setUserEnvironment(data.environment);
          }
        }

        // Buscar plano do usuário através de subscriptions
        const {
          data: subscription,
          error: subscriptionError
        } = await supabase.from('subscriptions').select('plan_id, current_period_start, current_period_end, status, cancel_at_period_end, plans(name, is_free)').eq('user_id', user.id).in('status', ['active', 'trialing', 'past_due']).order('created_at', {
          ascending: false
        }).limit(1).maybeSingle();
        
        console.log('📋 Subscription query result:', { subscription, error: subscriptionError });
        
        if (subscription && subscription.plans) {
          const planData = subscription.plans as any;
          console.log('📋 Plan data:', planData);
          setUserPlan({
            is_free: planData.is_free === true,
            plan_name: planData.name || null
          });
          setUserSubscription({
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            status: subscription.status,
            commission_percentage: 0,
            cancel_at_period_end: subscription.cancel_at_period_end
          });
        } else {
          // Usuário sem plano ativo = FREE
          console.log('📋 No active subscription found, setting FREE');
          setUserPlan({
            is_free: true,
            plan_name: null
          });
          setUserSubscription(null);
        }
      }
    };
    fetchProfile();

    // Subscription em tempo real para atualizar o avatar quando mudar
    if (user?.id) {
      const channel = supabase.channel('profile-avatar-changes').on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`
      }, payload => {
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
      }).subscribe(status => {
        console.log('📡 Realtime subscription status:', status);
      });
      return () => {
        console.log('🔌 Unsubscribing from profile changes');
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

  // Avatar handling functions
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      sonnerToast.error("Por favor, selecione uma imagem válida");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarImageSrc(reader.result as string);
      setShowAvatarCropDialog(true);
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCroppedAvatar = async (images: AvatarSizes) => {
    if (!user?.id) return;
    
    setUploadingAvatar(true);
    try {
      const paths = generateAvatarPaths(user.id);
      
      // Upload both versions in parallel
      const [thumbUpload, originalUpload] = await Promise.all([
        supabase.storage
          .from("avatars")
          .upload(paths.thumb, images.thumb, {
            contentType: "image/jpeg",
            upsert: true,
          }),
        supabase.storage
          .from("avatars")
          .upload(paths.original, images.original, {
            contentType: "image/jpeg",
            upsert: true,
          }),
      ]);
      
      if (thumbUpload.error) throw thumbUpload.error;
      if (originalUpload.error) throw originalUpload.error;
      
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(paths.original);
      
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", user.id);
      
      if (updateError) throw updateError;
      
      setAvatarUrl(urlData.publicUrl);
      
      // Dispatch custom event to sync avatar across components
      window.dispatchEvent(new CustomEvent('avatar-updated', { 
        detail: { avatarUrl: urlData.publicUrl } 
      }));
      
      sonnerToast.success("Foto atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar avatar:", error);
      sonnerToast.error("Erro ao atualizar foto");
    } finally {
      setUploadingAvatar(false);
      setShowAvatarCropDialog(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Limpar cache de role ao fazer logout
      if (user?.id) {
        localStorage.removeItem(`user_role_${user.id}`);
      }

      // Aguardar logout completar
      const {
        error
      } = await supabase.auth.signOut();

      // Se o erro for "session not found", fazer logout local e continuar
      if (error && error.message !== 'Auth session missing!') {
        if (import.meta.env.DEV) {
          console.error('Erro ao fazer logout:', error);
        }
        toast({
          title: "Erro ao sair",
          description: "Tente novamente mais tarde.",
          variant: "destructive"
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
        description: "Até logo!"
      });

      // Redirecionar sempre, mesmo se a sessão não existir
      if (isMobile) {
        window.location.href = '/';
      } else {
        navigate('/');
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erro inesperado ao fazer logout:', error);
      }
      // Mesmo com erro, tentar limpar dados locais e redirecionar
      localStorage.clear();
      queryClient.clear();
      if (isMobile) {
        window.location.href = '/';
      } else {
        navigate('/');
      }
    }
  };
  const getInitials = () => {
    const name = userName || user?.user_metadata?.name || user?.email;
    return name?.substring(0, 2).toUpperCase() || "U";
  };
  const menuItems = isAdmin ? showAdminMenu ? adminMenuItems : affiliateMenuItems : affiliateMenuItems;

  // Timeout de 15 segundos específico para o sidebar
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!user) {
        setSidebarTimeout(true);
      }
    }, 15000);
    return () => clearTimeout(timer);
  }, [user]);

  // Resetar timeout quando user carregar
  useEffect(() => {
    if (user) {
      setSidebarTimeout(false);
    }
  }, [user]);

  // Componente de loading ou erro para o sidebar
  const SidebarLoadingContent = () => {
    // Mostrar erro apenas se passou muito tempo (15s) E ainda não tem user
    if (sidebarTimeout && !user) {
      return <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="mb-4 text-sm opacity-80">Erro ao carregar o menu</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="border-current hover:bg-white/10">
            Recarregar página
          </Button>
        </div>;
    }

    // Mostra skeletons enquanto não tem user (ainda carregando)
    return <>
        <div className="p-6 border-b" style={{
        borderColor: `${colorEnd}40`
      }}>
          <div className="flex items-center justify-center mb-4">
            <Skeleton className="h-16 w-32" />
          </div>
          <div className="text-center">
            <Skeleton className="h-3 w-20 mx-auto" />
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
        </nav>
        <div className="p-4 border-t space-y-2" style={{
        borderColor: `${colorEnd}40`
      }}>
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="w-full space-y-2">
              <Skeleton className="h-4 w-32 mx-auto" />
              <Skeleton className="h-3 w-40 mx-auto" />
            </div>
          </div>
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </>;
  };
  const SidebarContent = ({
    closeSidebar
  }: {
    closeSidebar?: () => void;
  }) => <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-3 border-b" style={{
      borderColor: `${colorEnd}40`
    }}>
        <div className="flex items-center justify-center mb-2">
          {showAdminMenu ? (
            <div className="flex items-center gap-2 h-12">
              <ShieldCheck className="h-7 w-7" style={{ color: isDarkTheme ? textColorDark : textColorLight }} />
              <span className="text-xl font-bold" style={{ color: isDarkTheme ? textColorDark : textColorLight }}>Admin</span>
            </div>
          ) : (
            <img src={currentLogoUrl} alt="APP Renda Recorrente" className="h-12 w-auto" />
          )}
        </div>
        
        {/* Version Info */}
        <div className="mt-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className="flex items-center justify-center gap-2 text-xs opacity-50 cursor-pointer hover:opacity-100 transition-opacity"
                  onClick={() => checkVersion()}
                >
                  {formattedVersion && <span>{formattedVersion}</span>}
                  {versionInfo.isChecking ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : versionInfo.hasUpdate ? (
                    <X className="h-3.5 w-3.5 text-red-500" />
                  ) : (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  )}
                  {versionInfo.hasUpdate && (
                    <Badge 
                      variant="default" 
                      className="text-[10px] px-1 py-0 h-4 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.reload();
                      }}
                    >
                      <RefreshCw className="h-2.5 w-2.5 mr-0.5" />
                      Atualizar
                    </Badge>
                  )}
                </div>
              </TooltipTrigger>
              {versionInfo.hasUpdate ? (
                <TooltipContent>
                  {versionInfo.newVersion ? (
                    <>
                      <p>Nova versão disponível: v{versionInfo.newVersion}</p>
                      <p className="text-xs">Clique para atualizar</p>
                    </>
                  ) : (
                    <>
                      <p>Nenhuma versão registrada no banco</p>
                      <p className="text-xs">Registre a versão atual em Admin → Versões</p>
                    </>
                  )}
                </TooltipContent>
              ) : (
                <TooltipContent>
                  <p>Versão atualizada</p>
                  <p className="text-xs">Clique para verificar atualizações</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* System Errors Alert - Only for admins in admin mode */}
        {isAdmin && showAdminMenu && (
          <div className="mt-3 flex justify-center">
            <SystemErrorsAlert />
          </div>
        )}
        
        {/* Environment Toggle - Only for admins in admin mode */}
        {isAdmin && showAdminMenu && (
          <div className="mt-3">
            <EnvironmentToggle 
              currentTextColor={currentTextColor}
              accentColor={accentColor}
            />
          </div>
        )}
        
        {/* Test Environment Banner - Visible in user menu mode when in test environment */}
        {(!isAdmin || !showAdminMenu) && userEnvironment === "test" && (
          <div className="mt-3 mx-2 p-2 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Ambiente de Teste
            </span>
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
      {/* Admin menu shows all adminMenuItems, affiliate menu shows first 4 */}
      {menuItems.slice(0, isAdmin && showAdminMenu ? menuItems.length : 4).map(item => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "?") || (item.path !== "/" && location.pathname.startsWith(item.path));
        const isSupport = item.path === "/user/support" || item.path === "/admin/support";
        return <Link key={item.path} to={item.path} onClick={() => closeSidebar?.()} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm")} style={{
          backgroundColor: isActive ? accentColor : `${accentColor}15`,
          color: currentTextColor
        }} onMouseEnter={e => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = `${accentColor}30`;
          }
        }} onMouseLeave={e => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = `${accentColor}15`;
          }
        }}>
              <Icon size={18} />
              <span className="flex-1">{item.label}</span>
              {isSupport && unreadCount > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-[10px] font-bold rounded-full">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
              {item.isPro && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                  <Crown className="h-2.5 w-2.5" />
                  PRO
                </span>
              )}
            </Link>;
      })}

        {(!isAdmin || !showAdminMenu) && menuItems.slice(4).map(item => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "?") || (item.path !== "/" && location.pathname.startsWith(item.path));
        const isSupport = item.path === "/user/support" || item.path === "/admin/support";
        return <Link key={item.path} to={item.path} onClick={() => closeSidebar?.()} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm")} style={{
          backgroundColor: isActive ? accentColor : `${accentColor}15`,
          color: currentTextColor
        }} onMouseEnter={e => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = `${accentColor}30`;
          }
        }} onMouseLeave={e => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = `${accentColor}15`;
          }
        }}>
              <Icon size={18} />
              <span className="flex-1">{item.label}</span>
              {isSupport && unreadCount > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-[10px] font-bold rounded-full">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
              {item.isPro && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                  <Crown className="h-2.5 w-2.5" />
                  PRO
                </span>
              )}
            </Link>;
      })}

        {(!isAdmin || !showAdminMenu) && <>
            <Link 
              to="/user/settings" 
              onClick={() => closeSidebar?.()} 
              className={cn("flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm w-full")} 
              style={{
                backgroundColor: location.pathname.startsWith("/user/settings") ? accentColor : `${accentColor}15`,
                color: currentTextColor
              }} 
              onMouseEnter={e => {
                if (!location.pathname.startsWith("/user/settings")) {
                  e.currentTarget.style.backgroundColor = `${accentColor}30`;
                }
              }} 
              onMouseLeave={e => {
                if (!location.pathname.startsWith("/user/settings")) {
                  e.currentTarget.style.backgroundColor = `${accentColor}15`;
                }
              }}
            >
              <Settings size={18} />
              <span>Configurações</span>
            </Link>
            <Link 
              to="/user/support" 
              onClick={() => closeSidebar?.()} 
              className={cn("flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm w-full")} 
              style={{
                backgroundColor: location.pathname === "/user/support" ? accentColor : `${accentColor}15`,
                color: currentTextColor
              }} 
              onMouseEnter={e => {
                if (location.pathname !== "/user/support") {
                  e.currentTarget.style.backgroundColor = `${accentColor}30`;
                }
              }} 
              onMouseLeave={e => {
                if (location.pathname !== "/user/support") {
                  e.currentTarget.style.backgroundColor = `${accentColor}15`;
                }
              }}
            >
              <Headphones size={18} />
              <span className="flex-1">Suporte</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-[10px] font-bold rounded-full">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </Link>
            <SidebarNotificationsPopover 
              currentTextColor={currentTextColor}
              accentColor={accentColor}
              closeSidebar={closeSidebar}
              isAdmin={false}
            />
          </>}

        {isAdmin && showAdminMenu && <>
            <Link 
              to="/admin/cadastros" 
              onClick={() => closeSidebar?.()} 
              className={cn("flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm w-full")} 
              style={{
                backgroundColor: location.pathname === "/admin/cadastros" ? accentColor : `${accentColor}15`,
                color: currentTextColor
              }} 
              onMouseEnter={e => {
                if (location.pathname !== "/admin/cadastros") {
                  e.currentTarget.style.backgroundColor = `${accentColor}30`;
                }
              }} 
              onMouseLeave={e => {
                if (location.pathname !== "/admin/cadastros") {
                  e.currentTarget.style.backgroundColor = `${accentColor}15`;
                }
              }}
            >
              <PlusSquare size={18} />
              <span>Cadastros</span>
            </Link>

            <Link
              to="/admin/settings" 
              onClick={() => closeSidebar?.()} 
              className={cn("flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm w-full")} 
              style={{
                backgroundColor: location.pathname === "/admin/settings" ? accentColor : `${accentColor}15`,
                color: currentTextColor
              }} 
              onMouseEnter={e => {
                if (location.pathname !== "/admin/settings") {
                  e.currentTarget.style.backgroundColor = `${accentColor}30`;
                }
              }} 
              onMouseLeave={e => {
                if (location.pathname !== "/admin/settings") {
                  e.currentTarget.style.backgroundColor = `${accentColor}15`;
                }
              }}
            >
              <Settings size={18} />
              <span>Configurações</span>
            </Link>
            <Link 
              to="/admin/support" 
              onClick={() => closeSidebar?.()} 
              className={cn("flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm w-full")} 
              style={{
                backgroundColor: location.pathname === "/admin/support" ? accentColor : `${accentColor}15`,
                color: currentTextColor
              }} 
              onMouseEnter={e => {
                if (location.pathname !== "/admin/support") {
                  e.currentTarget.style.backgroundColor = `${accentColor}30`;
                }
              }} 
              onMouseLeave={e => {
                if (location.pathname !== "/admin/support") {
                  e.currentTarget.style.backgroundColor = `${accentColor}15`;
                }
              }}
            >
              <Headphones size={18} />
              <span className="flex-1">Suporte</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-[10px] font-bold rounded-full">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </Link>
            <SidebarNotificationsPopover
              currentTextColor={currentTextColor}
              accentColor={accentColor}
              closeSidebar={closeSidebar}
              isAdmin={true}
            />
          </>}
      </nav>

      <div className="p-4 border-t space-y-2" style={{
      borderColor: `${colorEnd}40`
    }}>
        <div className="flex flex-col items-center gap-1 pb-2">
          {/* Card com Avatar e Badge */}
          {userPlan && <div 
              onClick={() => setProfileDialogOpen(true)}
              className="flex items-center gap-3 px-2 py-2 rounded-xl w-full shadow-lg border mx-2 cursor-pointer transition-transform hover:scale-[1.02] bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600"
            >
              <Avatar className="w-12 h-12 flex-shrink-0">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={user.user_metadata?.name || "Avatar"} />}
                <AvatarFallback style={{
              backgroundColor: accentColor,
              color: currentTextColor
            }} className="text-sm">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-300">
                  {userPlan.is_free ? <>
                      <Zap className="w-4 h-4" />
                      <span>PLANO FREE</span>
                    </> : <>
                      <Crown className="w-4 h-4 text-amber-500" />
                      <span>PLANO PRO</span>
                    </>}
                </div>
                <p className="text-xs truncate text-slate-600 dark:text-slate-400">
                  {user.email}
                </p>
              </div>
            </div>}
          
          {/* Dialog/Drawer de Detalhes do Perfil */}
          {isMobile ? (
            <Drawer open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
              <DrawerContent className="max-h-[90vh]">
                <DrawerHeader className="border-b relative">
                  <DrawerTitle className="text-center">Meu Perfil</DrawerTitle>
                  <DrawerClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    <X className="h-5 w-5" />
                    <span className="sr-only">Fechar</span>
                  </DrawerClose>
                </DrawerHeader>
                
                <div className="overflow-y-auto px-4 pb-8 pt-4">
                  <div className="flex flex-col items-center gap-6">
                    {/* Avatar Grande - Clicável para ampliar */}
                    <div className="relative">
                      <div 
                        className="cursor-pointer"
                        onClick={() => avatarUrl && setShowAvatarPreview(true)}
                      >
                        <Avatar className="!w-[180px] !h-[180px] transition-opacity hover:opacity-90">
                          {avatarUrl && <AvatarImage src={avatarUrl} alt={userName || "Avatar"} />}
                          <AvatarFallback className="!text-5xl bg-primary text-primary-foreground">
                            {getInitials()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <button
                        type="button"
                        className="absolute bottom-2 right-2 p-2.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
                        onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                      >
                        {uploadingAvatar ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Camera className="h-5 w-5" />
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarSelect}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {avatarUrl ? "Clique na foto para ampliar" : "Clique no ícone para adicionar foto"}
                    </p>
                    
                    {/* Card de Plano em Destaque */}
                    {userPlan && (
                      <div className="w-full p-3 rounded-xl border text-center space-y-1 shadow-lg bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                        <div className="flex items-center justify-center gap-1.5 text-base font-bold text-slate-700 dark:text-slate-300">
                          {userPlan.is_free ? <Zap className="w-4 h-4" /> : <Crown className="w-4 h-4 text-amber-500" />}
                          <span>{userPlan.is_free ? "PLANO FREE" : "PLANO PRO"}</span>
                        </div>
                        {!userPlan.is_free && userPlan.plan_name && (
                          <p className="text-slate-600 dark:text-slate-400 text-xs">{userPlan.plan_name}</p>
                        )}
                      </div>
                    )}
                    
                    {/* Informações */}
                    <div className="w-full space-y-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Nome Completo</p>
                        <p className="text-sm font-medium">{userName || user.user_metadata?.name || "Não informado"}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm font-medium break-all">{user.email}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Plano</p>
                        <p className="text-sm font-medium">
                          {userPlan?.plan_name || (userPlan?.is_free ? "FREE" : "Pro")}
                        </p>
                      </div>
                      
                      {userSubscription ? (
                        <>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Período</p>
                            <p className="text-sm font-medium">
                              {format(new Date(userSubscription.current_period_start), "dd/MM/yyyy", { locale: ptBR })} - {format(new Date(userSubscription.current_period_end), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Situação</p>
                            <div className="flex items-center gap-2">
                              <div className={`px-2 py-1 rounded text-xs font-semibold ${
                                userSubscription.cancel_at_period_end 
                                  ? "bg-destructive text-destructive-foreground" 
                                  : userSubscription.status === "active" 
                                  ? "bg-green-500 text-white" 
                                  : "bg-secondary text-secondary-foreground"
                              }`}>
                                {userSubscription.cancel_at_period_end ? "Cancelamento solicitado" : userSubscription.status === "active" ? "Ativo" : userSubscription.status === "trialing" ? "Em teste" : userSubscription.status === "past_due" ? "Pagamento pendente" : userSubscription.status}
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Comissão</p>
                            <p className="text-lg font-semibold text-primary">{userSubscription.commission_percentage}%</p>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Validade</p>
                          <p className="text-sm font-medium">Ilimitado</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Meu Perfil</DialogTitle>
                </DialogHeader>
                
                <div className="flex flex-col items-center gap-6 py-4">
                  {/* Avatar Grande - Clicável para ampliar */}
                  <div className="relative">
                    <div 
                      className="cursor-pointer"
                      onClick={() => avatarUrl && setShowAvatarPreview(true)}
                    >
                      <Avatar className="!w-[180px] !h-[180px] transition-opacity hover:opacity-90">
                        {avatarUrl && <AvatarImage src={avatarUrl} alt={userName || "Avatar"} />}
                        <AvatarFallback className="!text-5xl bg-primary text-primary-foreground">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <button
                      type="button"
                      className="absolute bottom-2 right-2 p-2.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
                      onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                    >
                      {uploadingAvatar ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Camera className="h-5 w-5" />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarSelect}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {avatarUrl ? "Clique na foto para ampliar" : "Clique no ícone para adicionar foto"}
                  </p>
                  
                  {/* Card de Plano em Destaque */}
                  {userPlan && (
                    <div className="w-full p-3 rounded-xl border text-center space-y-1 shadow-lg bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                      <div className="flex items-center justify-center gap-1.5 text-base font-bold text-slate-700 dark:text-slate-300">
                        {userPlan.is_free ? <Zap className="w-4 h-4" /> : <Crown className="w-4 h-4 text-amber-500" />}
                        <span>{userPlan.is_free ? "PLANO FREE" : "PLANO PRO"}</span>
                      </div>
                      {!userPlan.is_free && userPlan.plan_name && (
                        <p className="text-slate-600 dark:text-slate-400 text-xs">{userPlan.plan_name}</p>
                      )}
                    </div>
                  )}
                  
                  {/* Informações */}
                  <div className="w-full space-y-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Nome Completo</p>
                      <p className="text-sm font-medium">{userName || user.user_metadata?.name || "Não informado"}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium break-all">{user.email}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Plano</p>
                      <p className="text-sm font-medium">
                        {userPlan?.plan_name || (userPlan?.is_free ? "FREE" : "Pro")}
                      </p>
                    </div>
                    
                    {userSubscription ? (
                      <>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Período</p>
                          <p className="text-sm font-medium">
                            {format(new Date(userSubscription.current_period_start), "dd/MM/yyyy", { locale: ptBR })} - {format(new Date(userSubscription.current_period_end), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Situação</p>
                          <div className="flex items-center gap-2">
                            <div className={`px-2 py-1 rounded text-xs font-semibold ${
                              userSubscription.cancel_at_period_end 
                                ? "bg-destructive text-destructive-foreground" 
                                : userSubscription.status === "active" 
                                ? "bg-green-500 text-white" 
                                : "bg-secondary text-secondary-foreground"
                            }`}>
                              {userSubscription.cancel_at_period_end ? "Cancelamento solicitado" : userSubscription.status === "active" ? "Ativo" : userSubscription.status === "trialing" ? "Em teste" : userSubscription.status === "past_due" ? "Pagamento pendente" : userSubscription.status}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Validade</p>
                        <p className="text-sm font-medium">Ilimitado</p>
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Avatar Crop Dialog */}
          <AvatarCropDialog
            open={showAvatarCropDialog}
            onOpenChange={setShowAvatarCropDialog}
            imageSrc={avatarImageSrc}
            onCropComplete={handleCroppedAvatar}
          />
          
          <div className="flex flex-col items-center text-center w-full gap-1 px-3">
            
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => {
          closeSidebar?.();
          handleLogout();
        }} className="flex-1 flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm" style={{
          color: currentTextColor
        }} onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = `${accentColor}30`;
        }} onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}>
            <LogOut size={18} />
            Sair
          </button>
          
          {isAdmin && <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => {
          const newAdminMenuState = !showAdminMenu;
          
          // Salvar a página atual antes de trocar
          const currentPath = location.pathname;
          if (showAdminMenu) {
            // Saindo do admin, salvar última página admin
            sessionStorage.setItem('lastAdminPage', currentPath);
            // Recuperar última página user ou ir para dashboard
            const lastUserPage = sessionStorage.getItem('lastUserPage') || '/user/dashboard';
            setShowAdminMenu(newAdminMenuState);
            navigate(lastUserPage);
          } else {
            // Saindo do user, salvar última página user
            sessionStorage.setItem('lastUserPage', currentPath);
            // Recuperar última página admin ou ir para dashboard
            const lastAdminPage = sessionStorage.getItem('lastAdminPage') || '/admin/dashboard';
            setShowAdminMenu(newAdminMenuState);
            navigate(lastAdminPage);
          }
          closeSidebar?.();
        }} title={showAdminMenu ? "Ver menu de Afiliado" : "Ver menu de Admin"} style={{
          color: currentTextColor
        }}>
              {showAdminMenu ? <Crown className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </Button>}
          
          <ThemeToggle />
        </div>
      </div>
    </div>;

  // Sheet do menu mobile (controlado pela BottomNav) e sidebar fixo para desktop
  return <>
      {/* Avatar Preview Dialog */}
      <Dialog open={showAvatarPreview} onOpenChange={setShowAvatarPreview}>
        <DialogContent className="max-w-2xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Foto do perfil</DialogTitle>
          </DialogHeader>
          {avatarUrl && (
            <img 
              src={getAvatarOriginalUrl(avatarUrl) || avatarUrl} 
              alt={userName || "Avatar"} 
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
      
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-64 p-0 bg-background" style={{
        backgroundImage: gradientStyle.background,
        color: currentTextColor
      }}>
          <VisuallyHidden>
            <SheetTitle>Menu de navegação</SheetTitle>
          </VisuallyHidden>
          <div className="flex flex-col h-full">
            {user ? <SidebarContent closeSidebar={() => onOpenChange?.(false)} /> : <SidebarLoadingContent />}
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Sidebar fixo para desktop - visível apenas em telas >= 1024px */}
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 w-64 flex-col z-40" style={{
      ...gradientStyle,
      color: currentTextColor
    }}>
        {user ? <SidebarContent /> : <SidebarLoadingContent />}
      </aside>
    </>;
};