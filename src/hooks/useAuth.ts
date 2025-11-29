import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAuth = () => {
  const queryClient = useQueryClient();

  const { data: session, isLoading } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (event === "SIGNED_OUT") {
          queryClient.clear();
        } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          queryClient.setQueryData(["auth-session"], newSession);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [queryClient]);

  return {
    session,
    userId: session?.user?.id || null,
    isLoading,
    isAuthenticated: !!session,
  };
};
