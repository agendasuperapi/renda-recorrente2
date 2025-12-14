import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  BellOff, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Trash2, 
  Send,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Apple,
  Chrome
} from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const deviceIcons: Record<string, React.ReactNode> = {
  ios: <Apple className="h-4 w-4" />,
  macos: <Apple className="h-4 w-4" />,
  android: <Smartphone className="h-4 w-4" />,
  tablet: <Tablet className="h-4 w-4" />,
  windows: <Monitor className="h-4 w-4" />,
  linux: <Monitor className="h-4 w-4" />,
  desktop: <Monitor className="h-4 w-4" />,
};

const browserIcons: Record<string, React.ReactNode> = {
  chrome: <Chrome className="h-4 w-4" />,
  safari: <Apple className="h-4 w-4" />,
  firefox: <Monitor className="h-4 w-4" />,
  edge: <Monitor className="h-4 w-4" />,
};

export function NotificationsContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    isSupported,
    permission,
    isSubscribed,
    subscriptions,
    isLoading: pushLoading,
    subscribe,
    unsubscribe,
    removeSubscription,
    sendTestNotification,
  } = usePushNotifications();

  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Load notification preferences
  const { data: preferences, isLoading: prefsLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  // Update preference mutation
  const updatePreference = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notification_preferences')
        .update({ [field]: value })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar preferência',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    await subscribe();
    setIsSubscribing(false);
  };

  const handleUnsubscribe = async () => {
    setIsSubscribing(true);
    await unsubscribe();
    setIsSubscribing(false);
  };

  const handleSendTest = async () => {
    setIsSendingTest(true);
    await sendTestNotification();
    setIsSendingTest(false);
  };

  const handlePreferenceChange = (field: string, value: boolean) => {
    updatePreference.mutate({ field, value });
  };

  const userNotificationTypes = [
    { key: 'new_commission', label: 'Nova Comissão', description: 'Quando você receber uma nova comissão' },
    { key: 'withdrawal_day', label: 'Dia de Saque', description: 'Lembrete no seu dia de saque semanal' },
    { key: 'withdrawal_paid', label: 'Saque Pago', description: 'Quando seu saque for pago' },
    { key: 'new_sub_affiliate', label: 'Novo Sub-Afiliado', description: 'Quando um novo sub-afiliado se cadastrar' },
    { key: 'new_support_message', label: 'Nova Mensagem de Suporte', description: 'Quando receber resposta no suporte' },
    { key: 'goal_achieved', label: 'Meta Batida', description: 'Quando você atingir uma meta' },
  ];

  const adminNotificationTypes = [
    { key: 'new_affiliate', label: 'Novo Afiliado', description: 'Quando um novo afiliado se cadastrar' },
    { key: 'new_payment', label: 'Novo Pagamento', description: 'Quando um novo pagamento for recebido' },
    { key: 'new_withdrawal_request', label: 'Novo Saque Solicitado', description: 'Quando um afiliado solicitar saque' },
    { key: 'admin_new_support_message', label: 'Nova Mensagem de Suporte', description: 'Quando receber nova mensagem de suporte' },
    { key: 'new_version', label: 'Nova Versão', description: 'Quando uma nova versão for publicada' },
  ];

  if (pushLoading || prefsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Push Notifications Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações Push
          </CardTitle>
          <CardDescription>
            Receba notificações em tempo real nos seus dispositivos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSupported ? (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>Seu navegador não suporta notificações push</span>
            </div>
          ) : permission === 'denied' ? (
            <div className="flex items-center gap-2 text-destructive">
              <BellOff className="h-5 w-5" />
              <span>Notificações bloqueadas. Habilite nas configurações do navegador.</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {isSubscribed ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span className="text-primary font-medium">Notificações ativadas</span>
                  </>
                ) : (
                  <>
                    <BellOff className="h-5 w-5 text-muted-foreground" />
                    <span className="text-muted-foreground">Notificações desativadas</span>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                {isSubscribed ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSendTest}
                      disabled={isSendingTest}
                    >
                      {isSendingTest ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Enviar Teste
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleUnsubscribe}
                      disabled={isSubscribing}
                    >
                      {isSubscribing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <BellOff className="h-4 w-4 mr-2" />
                      )}
                      Desativar
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleSubscribe}
                    disabled={isSubscribing}
                  >
                    {isSubscribing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Bell className="h-4 w-4 mr-2" />
                    )}
                    Ativar Notificações
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Registered Devices */}
          {subscriptions.length > 0 && (
            <>
              <Separator className="my-4" />
              <div>
                <h4 className="text-sm font-medium mb-3">Dispositivos Registrados</h4>
                <div className="space-y-2">
                  {subscriptions.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {deviceIcons[sub.device_type] || <Monitor className="h-4 w-4" />}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium capitalize">
                              {sub.device_type === 'ios' ? 'iPhone/iPad' : sub.device_type}
                            </span>
                            {sub.browser && (
                              <Badge variant="secondary" className="text-xs">
                                {sub.browser}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Registrado em {format(new Date(sub.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSubscription(sub.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* User Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Preferências de Notificação</CardTitle>
          <CardDescription>
            Escolha quais notificações você deseja receber
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {userNotificationTypes.map((notif) => {
            const prefKey = notif.key as keyof typeof preferences;
            const prefValue = preferences?.[prefKey];
            const isChecked = typeof prefValue === 'boolean' ? prefValue : true;
            
            return (
              <div key={notif.key} className="flex items-center justify-between">
                <div>
                  <Label htmlFor={notif.key} className="font-medium">
                    {notif.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{notif.description}</p>
                </div>
                <Switch
                  id={notif.key}
                  checked={isChecked}
                  onCheckedChange={(checked) => handlePreferenceChange(notif.key, checked)}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Admin Notification Preferences - only show for admins */}
      {preferences && 'new_affiliate' in preferences && (
        <Card>
          <CardHeader>
            <CardTitle>Notificações de Administrador</CardTitle>
            <CardDescription>
              Notificações específicas para administradores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {adminNotificationTypes.map((notif) => {
              const prefKey = notif.key as keyof typeof preferences;
              const prefValue = preferences?.[prefKey];
              const isChecked = typeof prefValue === 'boolean' ? prefValue : true;
              
              return (
                <div key={notif.key} className="flex items-center justify-between">
                  <div>
                    <Label htmlFor={notif.key} className="font-medium">
                      {notif.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{notif.description}</p>
                  </div>
                  <Switch
                    id={notif.key}
                    checked={isChecked}
                    onCheckedChange={(checked) => handlePreferenceChange(notif.key, checked)}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
