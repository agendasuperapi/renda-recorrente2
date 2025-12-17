import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Settings,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { ScrollAnimation } from '@/components/ScrollAnimation';
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

const typeLabels: Record<string, string> = {
  new_commission: 'Comissão',
  withdrawal_paid: 'Saque Pago',
  withdrawal_day: 'Dia de Saque',
  new_sub_affiliate: 'Sub-Afiliado',
  new_support_message: 'Suporte',
  goal_achieved: 'Meta Atingida',
  new_affiliate: 'Novo Afiliado',
  new_payment: 'Pagamento',
  new_withdrawal_request: 'Solicitação Saque',
  new_version: 'Nova Versão',
  admin_new_support_message: 'Suporte (Admin)',
  test: 'Teste',
};

// Admin notification types
const adminTypes = ['new_affiliate', 'new_payment', 'new_withdrawal_request', 'new_version', 'admin_new_support_message'];
const userTypes = ['new_commission', 'withdrawal_paid', 'withdrawal_day', 'new_sub_affiliate', 'new_support_message', 'goal_achieved', 'test'];

export default function Notifications() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Detect if user is in admin mode based on route OR location state
  const isAdminMode = location.pathname.startsWith('/admin') || location.state?.isAdmin === true;
  const availableTypes = isAdminMode ? adminTypes : userTypes;

  // Fetch total count for pagination
  const { data: totalCount } = useQuery({
    queryKey: ['notifications-count', isAdminMode, statusFilter, typeFilter],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      let query = supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Filter by admin/user types
      if (isAdminMode) {
        query = query.in('type', adminTypes);
      } else {
        query = query.not('type', 'in', `(${adminTypes.join(',')})`);
      }

      // Apply status filter
      if (statusFilter === 'unread') {
        query = query.eq('is_read', false);
      } else if (statusFilter === 'read') {
        query = query.eq('is_read', true);
      }

      // Apply type filter
      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: notifications, isLoading, isFetching } = useQuery({
    queryKey: ['notifications', isAdminMode, page, itemsPerPage, statusFilter, typeFilter],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      // Filter by admin/user types
      if (isAdminMode) {
        query = query.in('type', adminTypes);
      } else {
        query = query.not('type', 'in', `(${adminTypes.join(',')})`);
      }

      // Apply status filter
      if (statusFilter === 'unread') {
        query = query.eq('is_read', false);
      } else if (statusFilter === 'read') {
        query = query.eq('is_read', true);
      }

      // Apply type filter
      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    placeholderData: (previousData) => previousData,
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
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-notifications'] });
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
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-notifications'] });
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
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-notifications'] });
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

  // Reset page when filters change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as 'all' | 'unread' | 'read');
    setPage(1);
  };

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value);
    setPage(1);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setPage(1);
  };

  const totalPages = Math.ceil((totalCount || 0) / itemsPerPage);
  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  const isInitialLoading = isLoading && !notifications;

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
            {totalCount} notificação{totalCount !== 1 ? 'ões' : ''}
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border bg-card">
        <Filter className="h-4 w-4 text-muted-foreground" />
        
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="unread">Não lidas</SelectItem>
            <SelectItem value="read">Lidas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                Todos os tipos
              </span>
            </SelectItem>
            {availableTypes.map(type => (
              <SelectItem key={type} value={type}>
                <span className="flex items-center gap-2">
                  {typeIcons[type] || <Bell className="h-4 w-4 text-muted-foreground" />}
                  {typeLabels[type] || type}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-muted-foreground">Por página:</span>
          <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isInitialLoading || isFetching ? (
        <div className="flex items-center justify-center py-12 rounded-lg border bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <NotificationsList 
          notifications={notifications || []}
          onNotificationClick={handleNotificationClick}
          onDelete={(id) => deleteNotification.mutate(id)}
          typeIcons={typeIcons}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
          <div className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
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

  // Agrupar notificações por data
  const groupedByDate: Record<string, any[]> = {};
  notifications.forEach(notification => {
    const dateKey = format(parseISO(notification.created_at), 'yyyy-MM-dd');
    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = [];
    }
    groupedByDate[dateKey].push(notification);
  });

  const dateEntries = Object.entries(groupedByDate);

  return (
    <div className="space-y-4">
      {dateEntries.map(([dateKey, dayNotifications]) => (
        <div key={dateKey}>
          {/* Header da data */}
          <div className="flex items-center gap-2.5 py-3 px-1">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
              <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
            </div>
            <span className="text-sm font-semibold text-foreground/80">
              {format(parseISO(dateKey), "EEEE, d 'de' MMMM 'de' yyyy", {
                locale: ptBR
              })}
            </span>
          </div>

          {/* Notificações do dia com timeline */}
          <div className="relative pl-7">
            {/* Linha vertical contínua */}
            <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-primary/40" />

            <div className="space-y-3">
              {dayNotifications.map((notification, idx) => (
                <ScrollAnimation key={notification.id} animation="fade-up" delay={Math.min(idx * 50, 200)} threshold={0.05}>
                  <div className="relative">
                    {/* Ponto verde - centralizado verticalmente com o card */}
                    <div className="absolute left-[-22px] top-1/2 -translate-y-1/2 z-20 w-3 h-3 rounded-full bg-primary border-2 border-background" />

                    <Card 
                      className={`transition-all duration-300 hover:scale-[1.01] hover:shadow-md cursor-pointer ${
                        !notification.is_read ? 'ring-2 ring-primary/20 bg-primary/5' : ''
                      }`}
                      onClick={() => onNotificationClick(notification)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Hora */}
                          <div className="flex-shrink-0 text-xs text-muted-foreground w-12 pt-0.5">
                            {format(parseISO(notification.created_at), 'HH:mm')}
                          </div>

                          {/* Ícone do tipo */}
                          <div className="flex-shrink-0 mt-0.5">
                            {typeIcons[notification.type] || <Bell className="h-5 w-5 text-muted-foreground" />}
                          </div>

                          {/* Conteúdo */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className={`font-medium truncate ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
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
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollAnimation>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}