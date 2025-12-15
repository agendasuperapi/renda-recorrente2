import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Loader2,
  DollarSign,
  Users,
  MessageSquare,
  Target,
  CreditCard,
  AlertCircle,
  Settings
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { NotificationsContent } from '@/components/settings/NotificationsContent';

const typeIcons: Record<string, React.ReactNode> = {
  new_commission: <DollarSign className="h-5 w-5 text-primary" />,
  withdrawal_paid: <CreditCard className="h-5 w-5 text-green-500" />,
  withdrawal_day: <CreditCard className="h-5 w-5 text-blue-500" />,
  new_sub_affiliate: <Users className="h-5 w-5 text-purple-500" />,
  new_support_message: <MessageSquare className="h-5 w-5 text-orange-500" />,
  goal_achieved: <Target className="h-5 w-5 text-yellow-500" />,
  new_affiliate: <Users className="h-5 w-5 text-primary" />,
  new_payment: <DollarSign className="h-5 w-5 text-green-500" />,
  new_withdrawal_request: <CreditCard className="h-5 w-5 text-orange-500" />,
  new_version: <AlertCircle className="h-5 w-5 text-blue-500" />,
  admin_new_support_message: <MessageSquare className="h-5 w-5 text-orange-500" />,
  test: <Bell className="h-5 w-5 text-muted-foreground" />,
};

// Admin notification types
const adminTypes = ['new_affiliate', 'new_payment', 'new_withdrawal_request', 'new_version', 'admin_new_support_message'];

export default function Notifications() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Detect if user is in admin mode based on route OR location state
  const isAdminMode = location.pathname.startsWith('/admin') || location.state?.isAdmin === true;

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', isAdminMode],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Filter by type based on mode
      return isAdminMode
        ? data?.filter(n => adminTypes.includes(n.type)) || []
        : data?.filter(n => !adminTypes.includes(n.type)) || [];
    },
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
      queryClient.invalidateQueries({ queryKey: ['notifications', isAdminMode] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count', isAdminMode] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-notifications', isAdminMode] });
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

      if (isAdminMode) {
        query = query.in('type', adminTypes);
      } else {
        query = query.not('type', 'in', `(${adminTypes.join(',')})`);
      }

      const { error } = await query;
      if (error) throw error;
    },
    onMutate: () => setIsMarkingAll(true),
    onSettled: () => setIsMarkingAll(false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', isAdminMode] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count', isAdminMode] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-notifications', isAdminMode] });
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
      queryClient.invalidateQueries({ queryKey: ['notifications', isAdminMode] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count', isAdminMode] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-notifications', isAdminMode] });
    },
  });

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  // Notifications already filtered by queryFn
  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const SettingsButton = (
    <Button variant="outline" size="icon">
      <Settings className="h-4 w-4" />
    </Button>
  );

  const SettingsContentWrapper = (
    <ScrollArea className="h-[calc(100vh-120px)] pr-4">
      <NotificationsContent />
    </ScrollArea>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notificações {isAdminMode ? '(Admin)' : ''}
          </h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 
              ? `Você tem ${unreadCount} notificação${unreadCount > 1 ? 'ões' : ''} não lida${unreadCount > 1 ? 's' : ''}`
              : 'Nenhuma notificação não lida'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllAsRead.mutate()}
              disabled={isMarkingAll}
            >
              {isMarkingAll ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCheck className="h-4 w-4 mr-2" />
              )}
              Marcar todas como lidas
            </Button>
          )}
          
          {isMobile ? (
            <Drawer open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DrawerTrigger asChild>
                {SettingsButton}
              </DrawerTrigger>
              <DrawerContent className="max-h-[90vh]">
                <DrawerHeader>
                  <DrawerTitle>Configurações de Notificações</DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-6">
                  {SettingsContentWrapper}
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                {SettingsButton}
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Configurações de Notificações</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  {SettingsContentWrapper}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>

      <NotificationsList 
        notifications={notifications || []}
        onNotificationClick={handleNotificationClick}
        onDelete={(id) => deleteNotification.mutate(id)}
        typeIcons={typeIcons}
      />
    </div>
  );
}

interface NotificationsListProps {
  notifications: any[];
  onNotificationClick: (notification: any) => void;
  onDelete: (id: string) => void;
  typeIcons: Record<string, React.ReactNode>;
}

function NotificationsList({ notifications, onNotificationClick, onDelete, typeIcons }: NotificationsListProps) {
  if (!notifications || notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground rounded-lg border bg-card">
        <Bell className="h-12 w-12 mb-4 opacity-20" />
        <p>Nenhuma notificação</p>
      </div>
    );
  }

  return (
    <div className="divide-y rounded-lg border bg-card">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
            !notification.is_read ? 'bg-primary/5' : ''
          }`}
          onClick={() => onNotificationClick(notification)}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              {typeIcons[notification.type] || <Bell className="h-5 w-5 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`font-medium ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {notification.title}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {notification.body}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!notification.is_read && (
                    <Badge variant="default" className="h-2 w-2 p-0 rounded-full" />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(notification.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
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
  );
}
