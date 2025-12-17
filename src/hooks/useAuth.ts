import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

export const useAuth = () => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        // Update session state for all relevant events
        if (event === "SIGNED_OUT") {
          setSession(null);
          queryClient.clear();
        } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
          setSession(newSession);
          queryClient.setQueryData(["auth-session"], newSession);
        } else if (event === "USER_UPDATED") {
          setSession(newSession);
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
