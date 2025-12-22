import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';

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
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
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
  const isMobile = useIsMobile();

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

  const renderNotificationList = (scrollHeight: string = "h-[280px]") => {
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

    // Agrupar notificações por data
    const groupedByDate: Record<string, any[]> = {};
    items.forEach(notification => {
      const dateKey = format(parseISO(notification.created_at), 'yyyy-MM-dd');
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(notification);
    });

    const dateEntries = Object.entries(groupedByDate);

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
        <ScrollArea className={scrollHeight}>
          <div className="p-2 space-y-3">
            {dateEntries.map(([dateKey, dayNotifications]) => (
              <div key={dateKey}>
                {/* Header da data */}
                <div className="flex items-center gap-2 py-1.5 px-1">
                  <div className="flex items-center justify-center w-5 h-5 rounded bg-primary/10">
                    <Calendar className="h-3 w-3 text-primary flex-shrink-0" />
                  </div>
                  <span className="text-[10px] font-semibold text-foreground/70">
                    {format(parseISO(dateKey), "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </span>
                </div>

                {/* Notificações do dia com timeline */}
                <div className="relative pl-5">
                  {/* Linha vertical contínua */}
                  <div className="absolute left-[9px] top-0 bottom-0 w-0.5 bg-primary/40" />

                  <div className="space-y-2">
                    {dayNotifications.map((notification) => (
                      <div key={notification.id} className="relative">
                        {/* Ponto verde */}
                        <div className="absolute left-[-16px] top-1/2 -translate-y-1/2 z-20 w-2 h-2 rounded-full bg-primary border-2 border-background" />

                        <div
                          className={`p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${
                            !notification.is_read ? 'bg-primary/5 ring-1 ring-primary/20' : ''
                          }`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start gap-2">
                            {/* Hora */}
                            <div className="flex-shrink-0 text-[10px] text-muted-foreground w-8 pt-0.5">
                              {format(parseISO(notification.created_at), 'HH:mm')}
                            </div>

                            {/* Ícone */}
                            <div className="flex-shrink-0 mt-0.5">
                              {typeIcons[notification.type] || <Bell className="h-4 w-4 text-muted-foreground" />}
                            </div>

                            {/* Conteúdo */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1">
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-medium truncate ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {notification.title}
                                    {notification.environment === 'test' && (
                                      <span className="text-orange-500 font-semibold"> - Teste</span>
                                    )}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground line-clamp-2">
                                    {notification.body}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {!notification.is_read && (
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteNotification.mutate(notification.id);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </>
    );
  };

  const triggerButton = (
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
  );

  const headerContent = (
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
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          {triggerButton}
        </DrawerTrigger>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="border-b pb-3">
            <div className="flex items-center justify-between pr-8">
              <DrawerTitle>Notificações</DrawerTitle>
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
          </DrawerHeader>
          {renderNotificationList("h-[calc(85vh-120px)]")}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {triggerButton}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="right">
        {headerContent}
        {renderNotificationList()}
      </PopoverContent>
    </Popover>
  );
}
