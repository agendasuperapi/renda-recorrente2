import { ReactNode, useState, useEffect, startTransition } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "./Sidebar";
import { User } from "@supabase/supabase-js";
import { useIsMobile } from "@/hooks/use-mobile";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      } else if (session) {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Detecta mudanças de rota e adiciona transição suave
  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => {
      startTransition(() => {
        setIsNavigating(false);
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar user={user} open={sidebarOpen} onOpenChange={setSidebarOpen} />
      <main className={`flex-1 overflow-y-auto transition-opacity duration-100 ${isNavigating ? 'opacity-95' : 'opacity-100'} ${isMobile ? 'p-4 pt-20' : 'p-8'}`}>
        {children}
      </main>
    </div>
  );
};
