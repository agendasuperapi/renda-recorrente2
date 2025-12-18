import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  Chrome,
  Info,
  AlertTriangle,
  Package
} from 'lucide-react';
import { usePushNotifications, IOSDiagnostics } from '@/hooks/usePushNotifications';
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

function DiagnosticsCard({ diagnostics }: { diagnostics: IOSDiagnostics }) {
  return (
    <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
      <div className="font-medium flex items-center gap-2">
        <Info className="h-4 w-4" />
        Diagnóstico do Dispositivo
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>iOS:</div>
        <div>{diagnostics.isIOS ? `Sim (${diagnostics.iosVersion || 'versão desconhecida'})` : 'Não'}</div>
        
        <div>PWA (Tela de Início):</div>
        <div className={diagnostics.isIOS && !diagnostics.isPWA ? 'text-destructive font-medium' : ''}>
          {diagnostics.isPWA ? 'Sim' : 'Não'}
        </div>
        
        <div>Service Worker:</div>
        <div>{diagnostics.serviceWorkerStatus === 'registered' ? 'Registrado' : 
              diagnostics.serviceWorkerStatus === 'not-registered' ? 'Não registrado' : 'Não suportado'}</div>
        
        <div>Push Manager:</div>
        <div>{diagnostics.pushManagerStatus === 'supported' ? 'Suportado' : 'Não suportado'}</div>
        
        <div>Permissão:</div>
        <div>{diagnostics.notificationPermission === 'granted' ? 'Concedida' :
              diagnostics.notificationPermission === 'denied' ? 'Negada' :
              diagnostics.notificationPermission === 'default' ? 'Não solicitada' : 'Não suportada'}</div>
        
        <div>Compatível:</div>
        <div className={diagnostics.isCompatible ? 'text-primary font-medium' : 'text-destructive font-medium'}>
          {diagnostics.isCompatible ? 'Sim' : 'Não'}
        </div>
      </div>
      
      {diagnostics.incompatibilityReason && (
        <Alert variant="destructive" className="mt-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{diagnostics.incompatibilityReason}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export function NotificationsContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();
  
  // Detectar se está no modo admin baseado na rota
  const isAdminMode = location.pathname.startsWith('/admin');
  
  const {
    isSupported,
    permission,
    isSubscribed,
    subscriptions,
    isLoading: pushLoading,
    diagnostics,
    subscribe,
    unsubscribe,
    removeSubscription,
    sendTestNotification,
    runDiagnostics,
  } = usePushNotifications();

  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

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
    const success = await subscribe();
    setIsSubscribing(false);
    
    // Show diagnostics if subscription failed
    if (!success) {
      setShowDiagnostics(true);
      await runDiagnostics();
    }
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

  const handleShowDiagnostics = async () => {
    setShowDiagnostics(true);
    await runDiagnostics();
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

  // Show iOS PWA warning if on iOS but not in PWA mode
  const showIOSWarning = diagnostics?.isIOS && !diagnostics?.isPWA;
  const showIOSVersionWarning = diagnostics?.isIOS && diagnostics?.iosVersion && diagnostics.iosVersion < 16.4;

  return (
    <div className="space-y-6">
      {/* iOS Warnings */}
      {showIOSVersionWarning && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>iOS Incompatível</AlertTitle>
          <AlertDescription>
            Seu iOS ({diagnostics?.iosVersion}) não suporta notificações push. 
            Atualize para iOS 16.4 ou superior para receber notificações.
          </AlertDescription>
        </Alert>
      )}
      
      {showIOSWarning && !showIOSVersionWarning && (
        <Alert>
          <Apple className="h-4 w-4" />
          <AlertTitle>Instale o App na Tela de Início</AlertTitle>
          <AlertDescription>
            No iOS, as notificações push só funcionam quando o app está instalado na Tela de Início.
            <br />
            <strong>Como instalar:</strong> Toque em Compartilhar (ícone de seta) &gt; "Adicionar à Tela de Início"
          </AlertDescription>
        </Alert>
      )}

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
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-destructive">
                <BellOff className="h-5 w-5" />
                <span>Notificações bloqueadas.</span>
              </div>
              {diagnostics?.isIOS ? (
                <p className="text-sm text-muted-foreground">
                  Vá em <strong>Ajustes &gt; Notificações &gt; Renda Recorrente</strong> e habilite as notificações.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Habilite nas configurações do navegador.
                </p>
              )}
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
              <div className="flex flex-wrap gap-2">
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
                  <>
                    <Button
                      onClick={handleSubscribe}
                      disabled={isSubscribing || (diagnostics?.isIOS && !diagnostics?.isCompatible)}
                    >
                      {isSubscribing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Bell className="h-4 w-4 mr-2" />
                      )}
                      Ativar Notificações
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShowDiagnostics}
                    >
                      <Info className="h-4 w-4 mr-2" />
                      Diagnóstico
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Diagnostics Panel */}
          {showDiagnostics && diagnostics && (
            <DiagnosticsCard diagnostics={diagnostics} />
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

      {/* User Notification Preferences - only show when NOT in admin mode */}
      {!isAdminMode && (
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
      )}

      {/* Admin Notification Preferences - only show when in admin mode */}
      {isAdminMode && (
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

            {/* Product filter preference for payments */}
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <Label htmlFor="new_payment_all_products" className="font-medium">
                    Pagamentos de Todos os Produtos
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {(preferences as any)?.new_payment_all_products !== false
                      ? 'Recebendo notificações de pagamentos de todos os produtos'
                      : 'Recebendo apenas notificações do APP Renda Recorrente'}
                  </p>
                </div>
              </div>
              <Switch
                id="new_payment_all_products"
                checked={(preferences as any)?.new_payment_all_products !== false}
                onCheckedChange={(checked) => handlePreferenceChange('new_payment_all_products', checked)}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
