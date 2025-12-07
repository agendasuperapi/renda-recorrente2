import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect } from "react";

export function useUnreadMessages(isAdmin: boolean) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-messages", userId, isAdmin],
    queryFn: async () => {
      if (!userId) return 0;

      if (isAdmin) {
        // Admin: count messages from users that haven't been read
        const { data: tickets } = await supabase
          .from("support_tickets")
          .select("id")
          .neq("status", "closed");

        if (!tickets || tickets.length === 0) return 0;

        const ticketIds = tickets.map(t => t.id);

        const { count, error } = await supabase
          .from("support_messages")
          .select("*", { count: "exact", head: true })
          .in("ticket_id", ticketIds)
          .eq("is_admin", false)
          .is("read_at", null);

        if (error) {
          console.error("Error counting unread messages:", error);
          return 0;
        }

        return count || 0;
      } else {
        // User: count messages from admins that haven't been read
        const { data: tickets } = await supabase
          .from("support_tickets")
          .select("id")
          .eq("user_id", userId)
          .neq("status", "closed");

        if (!tickets || tickets.length === 0) return 0;

        const ticketIds = tickets.map(t => t.id);

        const { count, error } = await supabase
          .from("support_messages")
          .select("*", { count: "exact", head: true })
          .in("ticket_id", ticketIds)
          .eq("is_admin", true)
          .is("read_at", null);

        if (error) {
          console.error("Error counting unread messages:", error);
          return 0;
        }

        return count || 0;
      }
    },
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Cache for 10 seconds
  });

  // Real-time subscription for new messages
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("unread-messages-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_messages",
        },
        () => {
          // Invalidate query when any message changes
          queryClient.invalidateQueries({ queryKey: ["unread-messages", userId, isAdmin] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isAdmin, queryClient]);

  const invalidateUnreadCount = () => {
    queryClient.invalidateQueries({ queryKey: ["unread-messages", userId, isAdmin] });
  };

  return { unreadCount, invalidateUnreadCount };
}
