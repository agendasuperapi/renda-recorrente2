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

  const checkUserRole = async (userId: string) => {
    // Tentar ler do cache primeiro
    const cachedRole = localStorage.getItem(`user_role_${userId}`);
    if (cachedRole !== null) {
      setIsAdmin(cachedRole === 'super_admin');
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
      } else {
        const role = data?.role || 'afiliado';
        const adminStatus = role === "super_admin";
        setIsAdmin(adminStatus);
        localStorage.setItem(`user_role_${userId}`, role);
      }
    } catch (error) {
      console.error("Error:", error);
      setIsAdmin(false);
      localStorage.removeItem(`user_role_${userId}`);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        checkUserRole(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        // Limpar cache ao fazer logout
        if (user?.id) {
          localStorage.removeItem(`user_role_${user.id}`);
        }
        navigate("/auth");
      } else if (session) {
        setUser(session.user);
        checkUserRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const isLoading = !user || isAdmin === null;

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
