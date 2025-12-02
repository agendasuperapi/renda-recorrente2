import { LayoutDashboard, LineChart, Coins, Menu, DollarSign, Wallet } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  onMenuClick: () => void;
  isAdmin?: boolean;
}

export const BottomNav = ({ onMenuClick, isAdmin = false }: BottomNavProps) => {
  const location = useLocation();

  const affiliateNavItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      path: "/dashboard",
    },
    {
      icon: LineChart,
      label: "Desempenho",
      path: "/performance",
    },
    {
      icon: Coins,
      label: "Comissões",
      path: "/commissions-daily",
    },
  ];

  const adminNavItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      path: "/admin/dashboard",
    },
    {
      icon: DollarSign,
      label: "Pagamentos",
      path: "/admin/payments",
    },
    {
      icon: Wallet,
      label: "Saques",
      path: "/admin/withdrawals",
    },
  ];

  const navItems = isAdmin ? adminNavItems : affiliateNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t lg:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
        
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors text-muted-foreground"
        >
          <Menu className="h-5 w-5" />
          <span className="text-xs font-medium">Menu</span>
        </button>
      </div>
    </nav>
  );
};
