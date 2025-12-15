import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  Loader2,
  DollarSign,
  Users,
  MessageSquare,
  Target,
  CreditCard,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';

const typeIcons: Record<string, React.ReactNode> = {
  new_commission: <DollarSign className="h-4 w-4 text-primary" />,
  withdrawal_paid: <CreditCard className="h-4 w-4 text-green-500" />,
  withdrawal_day: <CreditCard className="h-4 w-4 text-blue-500" />,
  new_sub_affiliate: <Users className="h-4 w-4 text-purple-500" />,
  new_support_message: <MessageSquare className="h-4 w-4 text-orange-500" />,
  goal_achieved: <Target className="h-4 w-4 text-yellow-500" />,
  new_affiliate: <Users className="h-4 w-4 text-primary" />,
  new_payment: <DollarSign className="h-4 w-4 text-green-500" />,
  new_withdrawal_request: <CreditCard className="h-4 w-4 text-orange-500" />,
  new_version: <AlertCircle className="h-4 w-4 text-blue-500" />,
  test: <Bell className="h-4 w-4 text-muted-foreground" />,
};

// Admin notification types
const adminTypes = ['new_affiliate', 'new_payment', 'new_withdrawal_request', 'new_version', 'admin_new_support_message'];

interface SidebarNotificationsPopoverProps {
  currentTextColor: string;
  accentColor: string;
  closeSidebar?: () => void;
  isAdmin?: boolean;
}

export function SidebarNotificationsPopover({ 
  currentTextColor, 
  accentColor,
  closeSidebar,
  isAdmin = false
}: SidebarNotificationsPopoverProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { unreadCount } = useUnreadNotifications(isAdmin);
  const [open, setOpen] = useState(false);

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['sidebar-notifications', isAdmin],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Filter by type based on mode
      return isAdmin
        ? data?.filter(n => adminTypes.includes(n.type)) || []
        : data?.filter(n => !adminTypes.includes(n.type)) || [];
    },
    enabled: open,
  });

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sidebar-notifications', isAdmin] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count', isAdmin] });
      queryClient.invalidateQueries({ queryKey: ['notifications', isAdmin] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (isAdmin) {
        query = query.in('type', adminTypes);
      } else {
        query = query.not('type', 'in', `(${adminTypes.join(',')})`);
      }

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sidebar-notifications', isAdmin] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count', isAdmin] });
      queryClient.invalidateQueries({ queryKey: ['notifications', isAdmin] });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sidebar-notifications', isAdmin] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count', isAdmin] });
      queryClient.invalidateQueries({ queryKey: ['notifications', isAdmin] });
    },
  });

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    
    if (notification.action_url) {
      setOpen(false);
      closeSidebar?.();
      navigate(notification.action_url);
    }
  };

  const renderNotificationList = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    const items = notifications || [];

    if (!items || items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Bell className="h-8 w-8 mb-2 opacity-20" />
          <p className="text-sm">Nenhuma notificação</p>
        </div>
      );
    }

    const unreadInList = items.filter(n => !n.is_read).length;

    return (
      <>
        {unreadInList > 0 && (
          <div className="p-2 border-b">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              {markAllAsRead.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <CheckCheck className="h-3 w-3 mr-1" />
              )}
              Marcar todas como lidas
            </Button>
          </div>
        )}
        <ScrollArea className="h-[280px]">
          <div className="divide-y">
            {items.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                  !notification.is_read ? 'bg-primary/5' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    {typeIcons[notification.type] || <Bell className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {notification.body}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notification.is_read && (
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification.mutate(notification.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(notification.created_at), { 
                        addSuffix: true,
                        locale: ptBR 
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm w-full text-left"
          style={{
            backgroundColor: `${accentColor}15`,
            color: currentTextColor
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = `${accentColor}30`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = `${accentColor}15`;
          }}
        >
          <Bell size={18} />
          <span className="flex-1">Notificações</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-[10px] font-bold rounded-full">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="right">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold text-sm">Notificações</h4>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setOpen(false);
              closeSidebar?.();
              navigate(isAdmin ? '/admin/notifications' : '/user/notifications', { state: { isAdmin } });
            }}
          >
            Ver todas
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>
        
        {renderNotificationList()}
      </PopoverContent>
    </Popover>
  );
}
