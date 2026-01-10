import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NativePushState {
  isNative: boolean;
  isRegistered: boolean;
  token: string | null;
  isLoading: boolean;
}

export function useNativePushNotifications() {
  const [state, setState] = useState<NativePushState>({
    isNative: false,
    isRegistered: false,
    token: null,
    isLoading: true,
  });
  const { toast } = useToast();

  // Check if running in native Capacitor app
  const isNativePlatform = useCallback(() => {
    return Capacitor.isNativePlatform();
  }, []);

  // Get device type
  const getDeviceType = useCallback((): string => {
    const platform = Capacitor.getPlatform();
    if (platform === 'ios') return 'ios-native';
    if (platform === 'android') return 'android-native';
    return platform;
  }, []);

  // Initialize push notifications
  const initialize = useCallback(async () => {
    console.log('[NativePush] Initializing...');
    
    if (!isNativePlatform()) {
      console.log('[NativePush] Not a native platform, skipping');
      setState(prev => ({ ...prev, isNative: false, isLoading: false }));
      return;
    }

    setState(prev => ({ ...prev, isNative: true }));

    try {
      // Check current permission status
      let permStatus = await PushNotifications.checkPermissions();
      console.log('[NativePush] Permission status:', permStatus.receive);

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
        console.log('[NativePush] Permission after request:', permStatus.receive);
      }

      if (permStatus.receive !== 'granted') {
        console.log('[NativePush] Permission not granted');
        toast({
          title: 'Permissão negada',
          description: 'Vá em Ajustes > Notificações > Renda Recorrente e habilite as notificações.',
          variant: 'destructive',
        });
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Register for push notifications
      await PushNotifications.register();
      console.log('[NativePush] Registered for push notifications');

    } catch (error) {
      console.error('[NativePush] Error initializing:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [isNativePlatform, toast]);

  // Setup listeners
  useEffect(() => {
    if (!isNativePlatform()) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    console.log('[NativePush] Setting up listeners...');

    // Registration success - save token
    const registrationListener = PushNotifications.addListener('registration', async (token: Token) => {
      console.log('[NativePush] Push registration success, token:', token.value.substring(0, 20) + '...');
      
      setState(prev => ({ ...prev, token: token.value, isRegistered: true, isLoading: false }));

      // Save token to database
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('[NativePush] No user logged in, cannot save token');
          return;
        }

        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: user.id,
            endpoint: `apns://${token.value}`,
            p256dh_key: token.value,
            auth_key: 'native-ios',
            device_type: getDeviceType(),
            browser: 'capacitor',
            user_agent: navigator.userAgent,
          }, {
            onConflict: 'endpoint',
          });

        if (error) {
          console.error('[NativePush] Error saving token:', error);
        } else {
          console.log('[NativePush] Token saved to database');
        }
      } catch (err) {
        console.error('[NativePush] Error saving token:', err);
      }
    });

    // Registration error
    const errorListener = PushNotifications.addListener('registrationError', (error) => {
      console.error('[NativePush] Registration error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      toast({
        title: 'Erro ao registrar notificações',
        description: 'Não foi possível registrar para notificações push.',
        variant: 'destructive',
      });
    });

    // Notification received while app is in foreground
    const receivedListener = PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('[NativePush] Push received:', notification);
      toast({
        title: notification.title || 'Notificação',
        description: notification.body || '',
      });
    });

    // Notification action performed (user tapped notification)
    const actionListener = PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('[NativePush] Push action performed:', action);
      // Navigate to appropriate screen if URL is provided
      const url = action.notification.data?.url;
      if (url && typeof url === 'string') {
        window.location.href = url;
      }
    });

    // Initialize
    initialize();

    // Cleanup
    return () => {
      registrationListener.then(l => l.remove());
      errorListener.then(l => l.remove());
      receivedListener.then(l => l.remove());
      actionListener.then(l => l.remove());
    };
  }, [isNativePlatform, initialize, getDeviceType, toast]);

  // Manual registration trigger
  const register = useCallback(async () => {
    if (!isNativePlatform()) return false;
    
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      await initialize();
      return true;
    } catch (error) {
      console.error('[NativePush] Manual registration error:', error);
      return false;
    }
  }, [isNativePlatform, initialize]);

  // Send test notification
  const sendTestNotification = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: user.id,
          title: 'Teste de Notificação Nativa',
          body: 'Se você está vendo isso, as notificações nativas estão funcionando!',
          type: 'test',
          skip_preference_check: true,
        },
      });

      if (error) throw error;

      toast({
        title: 'Notificação enviada',
        description: 'Verifique se a notificação foi recebida.',
      });

      return true;
    } catch (error) {
      console.error('[NativePush] Error sending test:', error);
      toast({
        title: 'Erro ao enviar teste',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  return {
    ...state,
    isNativePlatform: isNativePlatform(),
    register,
    sendTestNotification,
  };
}
