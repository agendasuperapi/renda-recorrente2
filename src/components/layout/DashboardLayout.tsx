import { useState, useEffect } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "./Sidebar";
import { User } from "@supabase/supabase-js";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";

export const DashboardLayout = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [hasActivePlan, setHasActivePlan] = useState<boolean | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  const checkUserRole = async (userId: string): Promise<boolean> => {
    // Tentar ler do cache primeiro
    const cachedRole = localStorage.getItem(`user_role_${userId}`);
    if (cachedRole !== null) {
      const isAdminCached = cachedRole === 'super_admin';
      setIsAdmin(isAdminCached);
    }

    // Verificar no servidor (sempre, para garantir segurança)
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Error checking role:", error);
        setIsAdmin(false);
        localStorage.removeItem(`user_role_${userId}`);
        return false;
      } else {
        const role = data?.role || 'afiliado';
        const adminStatus = role === "super_admin";
        setIsAdmin(adminStatus);
        localStorage.setItem(`user_role_${userId}`, role);
        return adminStatus;
      }
    } catch (error) {
      console.error("Error:", error);
      setIsAdmin(false);
      localStorage.removeItem(`user_role_${userId}`);
      return false;
    }
  };

  const checkSubscription = async (userId: string, adminStatus: boolean) => {
    // Se for admin, sempre tem acesso
    if (adminStatus) {
      setHasActivePlan(true);
      return;
    }

    // Não verificar subscription em rotas admin
    const isAdminRoute = window.location.pathname.startsWith('/admin');
    if (isAdminRoute) {
      setHasActivePlan(true);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id, status")
        .eq("user_id", userId)
        .in("status", ["active", "trialing"])
        .limit(1)
        .maybeSingle();

      const hasActive = !error && !!data;
      setHasActivePlan(hasActive);

      // Se não tiver plano ativo e não estiver já na página /plan, redirecionar
      if (!hasActive && window.location.pathname !== "/plan") {
        navigate("/plan");
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
      setHasActivePlan(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!mounted) return;
      
      if (!session) {
        navigate("/auth");
        return;
      }
      
      setUser(session.user);
      const adminStatus = await checkUserRole(session.user.id);
      
      if (!mounted) return;
      
      await checkSubscription(session.user.id, adminStatus);
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (event === "SIGNED_OUT") {
        // Limpar cache ao fazer logout
        if (user?.id) {
          localStorage.removeItem(`user_role_${user.id}`);
        }
        navigate("/auth");
      } else if (session) {
        setUser(session.user);
        const adminStatus = await checkUserRole(session.user.id);
        
        if (!mounted) return;
        
        await checkSubscription(session.user.id, adminStatus);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Timeout de segurança para evitar loading infinito
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingTimeout(true);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);
  
  const isLoading = (!user || isAdmin === null || hasActivePlan === null) && !loadingTimeout;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar user={user} isAdmin={isAdmin ?? false} open={sidebarOpen} onOpenChange={setSidebarOpen} isLoading={isLoading} />
      <main className={`flex-1 overflow-y-auto ${isMobile ? 'p-4 pt-20' : 'p-8'}`}>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
};
