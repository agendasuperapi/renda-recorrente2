import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export const BlockedUserDialog = () => {
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let channel: any;

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Initial check
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_blocked, blocked_message")
        .eq("id", user.id)
        .single();

      if (profile?.is_blocked) {
        setIsBlocked(true);
        setBlockedMessage(profile.blocked_message || "Sua conta foi bloqueada pelo administrador.");
      } else {
        setIsBlocked(false);
      }

      // Subscribe to realtime changes
      channel = supabase
        .channel('profile-block-status')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          },
          (payload: any) => {
            if (payload.new.is_blocked) {
              setIsBlocked(true);
              setBlockedMessage(payload.new.blocked_message || "Sua conta foi bloqueada pelo administrador.");
            } else {
              setIsBlocked(false);
            }
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <AlertDialog open={isBlocked}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Conta Bloqueada</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-wrap">
            {blockedMessage}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button onClick={handleLogout}>OK</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
