import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
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
} from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  { icon: LayoutDashboard, label: "Dashboard Admin", path: "/admin/dashboard" },
  { icon: Users, label: "Usuários", path: "/admin/users" },
  { icon: FileSearch, label: "API de CPF", path: "/admin/cpf-apis" },
  { icon: Calendar, label: "Eventos Stripe", path: "/admin/stripe-events" },
  { icon: Ticket, label: "Cupons", path: "/admin/coupons" },
  { icon: Package, label: "Produtos", path: "/admin/products" },
  { icon: Building2, label: "Banco e Contas", path: "/admin/bank-accounts" },
  { icon: CreditCard, label: "Planos e Preços", path: "/admin/plans" },
];

export const Sidebar = ({ user, isAdmin, open, onOpenChange, isLoading = false }: SidebarProps) => {
  const location = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [showAdminMenu, setShowAdminMenu] = useState(true);

  const handleLogout = async () => {
    // Limpar cache de role ao fazer logout
    if (user?.id) {
      localStorage.removeItem(`user_role_${user.id}`);
    }
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
  };

  const getInitials = () => {
    const name = user?.user_metadata?.name || user?.email;
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
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center justify-center mb-4">
          <img src={logo} alt="APP Renda Recorrente" className="h-16 w-auto" />
        </div>
        <div className="text-center text-xs text-sidebar-foreground/50">
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
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm",
                isActive
                  ? "bg-primary text-white"
                  : "hover:bg-sidebar-accent text-sidebar-foreground"
              )}
              onMouseEnter={() => handlePrefetch(item.path)}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-2">
        <div className="flex items-center gap-2 px-3 py-2">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-primary text-white">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user.user_metadata?.name || "Usuário"}
            </p>
            <p className="text-xs text-sidebar-foreground/70 truncate">
              {user.email}
            </p>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <p className="text-xs text-primary font-medium">Super Admin</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setShowAdminMenu(!showAdminMenu)}
                  title={showAdminMenu ? "Ver menu de Afiliado" : "Ver menu de Admin"}
                >
                  {showAdminMenu ? <Crown className="w-3 h-3" /> : <User className="w-3 h-3" />}
                </Button>
              </div>
            )}
          </div>
          <ThemeToggle />
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors text-sm w-full"
        >
          <LogOut size={18} />
          Sair
        </button>
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
        <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground">
          <div className="flex flex-col h-full">
            <SidebarContent closeSidebar={() => onOpenChange?.(false)} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="hidden lg:flex w-64 bg-sidebar text-sidebar-foreground flex-col h-screen sticky top-0 flex-shrink-0">
      <SidebarContent />
    </aside>
  );
};
