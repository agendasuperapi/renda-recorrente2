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
    const checkBlockStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_blocked, blocked_message")
        .eq("id", user.id)
        .single();

      if (profile?.is_blocked) {
        setIsBlocked(true);
        setBlockedMessage(profile.blocked_message || "Sua conta foi bloqueada pelo administrador.");
      }
    };

    checkBlockStatus();

    // Check on every route change
    const interval = setInterval(checkBlockStatus, 5000);

    return () => clearInterval(interval);
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
