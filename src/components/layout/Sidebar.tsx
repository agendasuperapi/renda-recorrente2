import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
} from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface SidebarProps {
  user: SupabaseUser;
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
  { icon: CreditCard, label: "Planos e Preços", path: "/admin/plans" },
  { icon: Target, label: "Segmentos", path: "/admin/segments" },
  { icon: Calendar, label: "Eventos Stripe", path: "/admin/stripe-events" },
  { icon: Ticket, label: "Cupons", path: "/admin/coupons" },
];

export const Sidebar = ({ user }: SidebarProps) => {
  const location = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
  };

  const getInitials = () => {
    const name = user.user_metadata?.name || user.email;
    return name?.substring(0, 2).toUpperCase() || "U";
  };

  const isAdmin = false; // TODO: Check role from database
  const menuItems = isAdmin ? adminMenuItems : affiliateMenuItems;

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3 mb-4">
          <Link2 className="w-8 h-8 text-primary" />
          <div>
            <h2 className="font-bold text-primary">APP Renda</h2>
            <p className="text-xs text-sidebar-foreground/70">recorrente</p>
          </div>
        </div>
        <div className="text-xs text-sidebar-foreground/50">
          Versão: 4.1.70
          <br />
          {user.email}
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
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-2">
        <div className="flex items-center gap-3 px-3 py-2">
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
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors text-sm w-full"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
};
