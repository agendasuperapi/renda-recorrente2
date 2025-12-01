import { useState, useEffect, useRef } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "./Sidebar";
import { User } from "@supabase/supabase-js";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { BlockedUserDialog } from "@/components/BlockedUserDialog";
import { UserProvider } from "@/contexts/UserContext";
import { useQueryClient } from "@tanstack/react-query";

export const DashboardLayout = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [hasActivePlan, setHasActivePlan] = useState<boolean | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const initRef = useRef(false);

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
        .maybeSingle();

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

    // Se já inicializou, não fazer nada
    if (initRef.current) return;

    const initializeUser = async (sessionUser: User) => {
      if (!mounted || initRef.current) return;

      setUser(sessionUser);
      const adminStatus = await checkUserRole(sessionUser.id);

      if (!mounted) return;

      await checkSubscription(sessionUser.id, adminStatus);
      
      // Marcar como inicializado
      initRef.current = true;
      setInitialized(true);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;

      if (!session) {
        navigate("/auth");
        return;
      }

      initializeUser(session.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT") {
        // Limpar cache ao fazer logout
        if (user?.id) {
          localStorage.removeItem(`user_role_${user.id}`);
        }
        queryClient.clear();
        initRef.current = false;
        setInitialized(false);
        navigate("/auth");
        return;
      }

      // Apenas atualizar user se já inicializou
      if (session?.user && initRef.current) {
        setUser(session.user);
      } else if (session?.user && !initRef.current) {
        initializeUser(session.user);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Timeout de segurança para evitar loading infinito (aumentado para 10s)
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingTimeout(true);
    }, 10000);
    
    return () => clearTimeout(timer);
  }, []);
  
  const isLoading = !initialized && !loadingTimeout;

  return (
    <>
      <BlockedUserDialog />
      <UserProvider value={{ userId: user?.id || null }}>
        <div className="flex h-screen bg-background overflow-hidden">
          <Sidebar user={user} isAdmin={isAdmin ?? false} open={sidebarOpen} onOpenChange={setSidebarOpen} isLoading={isLoading} initialized={initialized} />
          <main className={`flex-1 min-h-0 overflow-hidden flex flex-col ${isMobile ? 'p-4 pt-20' : 'p-8'}`}>
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
      </UserProvider>
    </>
  );
};
