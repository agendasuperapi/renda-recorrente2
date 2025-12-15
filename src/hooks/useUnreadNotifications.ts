import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

// Admin notification types
const adminTypes = ['new_affiliate', 'new_payment', 'new_withdrawal_request', 'new_version', 'admin_new_support_message'];

export function useUnreadNotifications(isAdmin: boolean = false) {
  const queryClient = useQueryClient();

  const { data: unreadCount = 0, isLoading } = useQuery({
    queryKey: ['unread-notifications-count', isAdmin],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      // First get all unread notifications
      const { data, error } = await supabase
        .from('notifications')
        .select('type')
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      if (!data) return 0;

      // Filter by type based on mode
      const filteredNotifications = isAdmin
        ? data.filter(n => adminTypes.includes(n.type))
        : data.filter(n => !adminTypes.includes(n.type));

      return filteredNotifications.length;
    },
    staleTime: 30000, // 30 seconds
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel(`notifications-count-${isAdmin ? 'admin' : 'user'}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['unread-notifications-count', isAdmin] });
            queryClient.invalidateQueries({ queryKey: ['notifications', isAdmin] });
            queryClient.invalidateQueries({ queryKey: ['sidebar-notifications', isAdmin] });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();
  }, [queryClient, isAdmin]);

  return { unreadCount, isLoading };
}
