import { LayoutDashboard, LineChart, Coins, Menu, DollarSign, Wallet } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { EnvironmentIndicator } from "./EnvironmentIndicator";

interface BottomNavProps {
  onMenuClick: () => void;
  isAdmin?: boolean;
}

export const BottomNav = ({ onMenuClick, isAdmin = false }: BottomNavProps) => {
  const location = useLocation();
  
  // Sincronizar com o estado do Sidebar (localStorage)
  const [showAdminMenu, setShowAdminMenu] = useState(() => {
    const saved = localStorage.getItem('sidebar_admin_view');
    return saved ? JSON.parse(saved) : true;
  });

  // Escutar mudanças no localStorage (quando o Sidebar altera o modo)
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('sidebar_admin_view');
      setShowAdminMenu(saved ? JSON.parse(saved) : true);
    };

    // Listener para mudanças de storage de outras abas
    window.addEventListener('storage', handleStorageChange);
    
    // Custom event para mudanças na mesma aba
    window.addEventListener('sidebar-mode-change', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sidebar-mode-change', handleStorageChange);
    };
  }, []);

  const affiliateNavItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      path: "/user/dashboard",
    },
    {
      icon: LineChart,
      label: "Desempenho",
      path: "/user/performance",
    },
    {
      icon: Coins,
      label: "Comissões",
      path: "/user/commissions",
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

  // Mostrar menu admin apenas se for admin E estiver no modo admin
  const navItems = isAdmin && showAdminMenu ? adminNavItems : affiliateNavItems;

  return (
    <>
      {/* Environment indicator banner for admin mode */}
      {isAdmin && showAdminMenu && (
        <div className="fixed bottom-16 left-0 right-0 z-40 flex justify-center lg:hidden pb-[env(safe-area-inset-bottom)]">
          <EnvironmentIndicator className="shadow-lg" />
        </div>
      )}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t lg:hidden"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
        }}
      >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "?");
          
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
    </>
  );
};
