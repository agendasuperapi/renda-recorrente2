import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// VAPID public key comes from Supabase (to avoid mismatch between frontend and backend secrets)
let cachedVapidPublicKey: string | null = null;

async function getVapidPublicKey(): Promise<string> {
  if (cachedVapidPublicKey) return cachedVapidPublicKey;

  const { data, error } = await supabase.functions.invoke('get-vapid-public-key');
  if (error) throw error;

  const publicKey = (data as { publicKey?: string } | null)?.publicKey;
  if (!publicKey) throw new Error('VAPID public key não configurada');

  cachedVapidPublicKey = publicKey;
  return publicKey;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface PushSubscriptionData {
  id: string;
  endpoint: string;
  device_type: string;
  browser: string | null;
  created_at: string;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptions, setSubscriptions] = useState<PushSubscriptionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Detect device type
  const getDeviceType = (): string => {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) {
      if (/Mobile/.test(ua)) return 'android';
      return 'tablet';
    }
    if (/Macintosh/.test(ua)) return 'macos';
    if (/Windows/.test(ua)) return 'windows';
    if (/Linux/.test(ua)) return 'linux';
    return 'desktop';
  };

  // Detect browser
  const getBrowser = (): string => {
    const ua = navigator.userAgent;
    if (/Edg/.test(ua)) return 'edge';
    if (/Chrome/.test(ua)) return 'chrome';
    if (/Firefox/.test(ua)) return 'firefox';
    if (/Safari/.test(ua)) return 'safari';
    if (/Opera|OPR/.test(ua)) return 'opera';
    return 'unknown';
  };

  // Get current browser subscription
  const getBrowserSubscription = useCallback(async (): Promise<PushSubscription | null> => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return null;
      return await registration.pushManager.getSubscription();
    } catch {
      return null;
    }
  }, []);

  // Check actual subscription state
  const checkSubscriptionState = useCallback(async (userId: string) => {
    // Check browser permission
    const browserPermission = Notification.permission;
    setPermission(browserPermission);

    if (browserPermission !== 'granted') {
      // No permission - clean up orphan records in DB
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId);
      setSubscriptions([]);
      setIsSubscribed(false);
      return;
    }

    // Check if there's an active browser subscription
    const browserSub = await getBrowserSubscription();
    
    // Load subscriptions from DB
    const { data: dbSubs } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, device_type, browser, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    setSubscriptions(dbSubs || []);

    // Check if current browser subscription matches one in DB
    if (browserSub && dbSubs && dbSubs.length > 0) {
      const hasMatchingSub = dbSubs.some(sub => sub.endpoint === browserSub.endpoint);
      setIsSubscribed(hasMatchingSub);
    } else if (browserSub && (!dbSubs || dbSubs.length === 0)) {
      // Browser has subscription but DB doesn't - not truly subscribed
      setIsSubscribed(false);
    } else {
      setIsSubscribed(false);
    }
  }, [getBrowserSubscription]);

  // Check if push is supported
  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'serviceWorker' in navigator && 
                       'PushManager' in window && 
                       'Notification' in window;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
      }
      
      setIsLoading(false);
    };
    
    checkSupport();
  }, []);

  // Load user's subscriptions and validate state
  const loadSubscriptions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await checkSubscriptionState(user.id);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    }
  }, [checkSubscriptionState]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  // Request permission and subscribe
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: 'Não suportado',
        description: 'Seu navegador não suporta notificações push.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      // Request notification permission
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        toast({
          title: 'Permissão negada',
          description: 'Você precisa permitir notificações nas configurações do navegador.',
          variant: 'destructive',
        });
        return false;
      }

      // Register service worker if not already registered
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
      }

      // Subscribe to push
      const vapidPublicKey = await getVapidPublicKey();

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Erro',
          description: 'Você precisa estar logado para ativar notificações.',
          variant: 'destructive',
        });
        return false;
      }

      // Extract keys from subscription
      const subscriptionJson = subscription.toJSON();
      const p256dhKey = subscriptionJson.keys?.p256dh || '';
      const authKey = subscriptionJson.keys?.auth || '';

      // Save subscription to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh_key: p256dhKey,
          auth_key: authKey,
          device_type: getDeviceType(),
          browser: getBrowser(),
          user_agent: navigator.userAgent,
        }, {
          onConflict: 'endpoint',
        });

      if (error) throw error;

      setIsSubscribed(true);
      await loadSubscriptions();

      toast({
        title: 'Notificações ativadas',
        description: 'Você receberá notificações neste dispositivo.',
      });

      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast({
        title: 'Erro ao ativar notificações',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return false;
    }
  }, [isSupported, toast, loadSubscriptions]);

  // Unsubscribe from push
  const unsubscribe = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Erro',
          description: 'Você precisa estar logado.',
          variant: 'destructive',
        });
        return false;
      }

      // Try to unsubscribe from browser
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      // Always delete all DB records for this user (regardless of browser state)
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      setIsSubscribed(false);
      setSubscriptions([]);

      toast({
        title: 'Notificações desativadas',
        description: 'Você não receberá mais notificações neste dispositivo.',
      });

      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast({
        title: 'Erro ao desativar notificações',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // Remove a specific subscription
  const removeSubscription = useCallback(async (subscriptionId: string) => {
    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('id', subscriptionId);

      if (error) throw error;

      await loadSubscriptions();

      toast({
        title: 'Dispositivo removido',
        description: 'O dispositivo não receberá mais notificações.',
      });

      return true;
    } catch (error) {
      console.error('Error removing subscription:', error);
      toast({
        title: 'Erro ao remover dispositivo',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, loadSubscriptions]);

  // Send test notification
  const sendTestNotification = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: user.id,
          title: 'Teste de Notificação',
          body: 'Se você está vendo isso, as notificações estão funcionando!',
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
      console.error('Error sending test notification:', error);
      toast({
        title: 'Erro ao enviar teste',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  return {
    isSupported,
    permission,
    isSubscribed,
    subscriptions,
    isLoading,
    subscribe,
    unsubscribe,
    removeSubscription,
    sendTestNotification,
    refreshSubscriptions: loadSubscriptions,
  };
}
