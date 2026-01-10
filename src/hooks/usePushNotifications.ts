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

export interface IOSDiagnostics {
  isIOS: boolean;
  iosVersion: number | null;
  isPWA: boolean;
  isCompatible: boolean;
  incompatibilityReason: string | null;
  serviceWorkerStatus: 'supported' | 'not-supported' | 'registered' | 'not-registered';
  pushManagerStatus: 'supported' | 'not-supported';
  notificationPermission: NotificationPermission | 'not-supported';
}

// Detect iOS and version
function getIOSVersion(): number | null {
  const ua = navigator.userAgent;
  const match = ua.match(/OS (\d+)_(\d+)/);
  if (match) {
    return parseFloat(`${match[1]}.${match[2]}`);
  }
  return null;
}

// Check if running inside Capacitor native app
function isCapacitorNative(): boolean {
  // Capacitor injects a global object when running as native app
  const win = window as Window & { Capacitor?: { isNative?: boolean; isNativePlatform?: () => boolean } };
  if (win.Capacitor?.isNativePlatform) {
    return win.Capacitor.isNativePlatform();
  }
  if (win.Capacitor?.isNative) {
    return true;
  }
  return false;
}

// Check if running as PWA (standalone mode)
function isPWAMode(): boolean {
  // If running as Capacitor native app, it's effectively "installed"
  if (isCapacitorNative()) {
    return true;
  }
  // Check display-mode media query
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  // Check iOS specific standalone property
  if ((navigator as Navigator & { standalone?: boolean }).standalone === true) {
    return true;
  }
  return false;
}

// Check if device is iOS
function isIOSDevice(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptions, setSubscriptions] = useState<PushSubscriptionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState<IOSDiagnostics | null>(null);
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

  // Run iOS diagnostics
  const runDiagnostics = useCallback(async (): Promise<IOSDiagnostics> => {
    const isIOS = isIOSDevice();
    const iosVersion = isIOS ? getIOSVersion() : null;
    const isPWA = isPWAMode();
    const isNativeApp = isCapacitorNative();
    
    let serviceWorkerStatus: IOSDiagnostics['serviceWorkerStatus'] = 'not-supported';
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      serviceWorkerStatus = reg ? 'registered' : 'not-registered';
    }
    
    const pushManagerStatus: IOSDiagnostics['pushManagerStatus'] = 
      'PushManager' in window ? 'supported' : 'not-supported';
    
    const notificationPermission: IOSDiagnostics['notificationPermission'] = 
      'Notification' in window ? Notification.permission : 'not-supported';
    
    let isCompatible = true;
    let incompatibilityReason: string | null = null;
    
    // Native Capacitor apps on iOS need native push notification plugins
    if (isNativeApp && isIOS) {
      // Check if Push Manager is available in native context
      if (!('PushManager' in window) || !('Notification' in window)) {
        isCompatible = false;
        incompatibilityReason = 'Para notificações push no app nativo iOS, é necessário configurar o plugin @capacitor/push-notifications. Por enquanto, use o app PWA para receber notificações.';
      }
    } else if (isIOS) {
      if (iosVersion && iosVersion < 16.4) {
        isCompatible = false;
        incompatibilityReason = `iOS ${iosVersion} não suporta notificações push. Atualize para iOS 16.4 ou superior.`;
      } else if (!isPWA) {
        isCompatible = false;
        incompatibilityReason = 'No iOS, as notificações push só funcionam quando o app está instalado na Tela de Início (PWA).';
      }
    }
    
    if (!isNativeApp && (!('serviceWorker' in navigator) || !('PushManager' in window))) {
      isCompatible = false;
      incompatibilityReason = 'Seu navegador não suporta notificações push.';
    }
    
    const diag: IOSDiagnostics = {
      isIOS,
      iosVersion,
      isPWA,
      isCompatible,
      incompatibilityReason,
      serviceWorkerStatus,
      pushManagerStatus,
      notificationPermission,
    };
    
    console.log('[Push Diagnostics]', diag, { isNativeApp });
    setDiagnostics(diag);
    return diag;
  }, []);

  // Check actual subscription state
  const checkSubscriptionState = useCallback(async (userId: string) => {
    // Check browser permission
    const browserPermission = Notification.permission;
    setPermission(browserPermission);

    // Check if there's an active browser subscription
    const browserSub = await getBrowserSubscription();
    
    // Load subscriptions from DB
    const { data: dbSubs } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, device_type, browser, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    setSubscriptions(dbSubs || []);

    // If permission is denied and we have a browser subscription in DB, remove only that one
    if (browserPermission === 'denied' && browserSub && dbSubs) {
      const matchingSub = dbSubs.find(sub => sub.endpoint === browserSub.endpoint);
      if (matchingSub) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('id', matchingSub.id);
        // Update local state
        setSubscriptions(prev => prev.filter(s => s.id !== matchingSub.id));
      }
      setIsSubscribed(false);
      return;
    }

    // If permission not granted (default or denied), just mark as not subscribed for this browser
    // but DON'T delete other device subscriptions
    if (browserPermission !== 'granted') {
      setIsSubscribed(false);
      return;
    }

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
      
      // Run diagnostics
      await runDiagnostics();
      
      setIsLoading(false);
    };
    
    checkSupport();
  }, [runDiagnostics]);

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
    console.log('[Push Subscribe] Starting subscription process...');
    
    // Run diagnostics first
    const diag = await runDiagnostics();
    console.log('[Push Subscribe] Diagnostics:', diag);
    
    if (!diag.isCompatible) {
      toast({
        title: 'Não compatível',
        description: diag.incompatibilityReason || 'Seu dispositivo não suporta notificações push.',
        variant: 'destructive',
      });
      return false;
    }

    if (!isSupported) {
      toast({
        title: 'Não suportado',
        description: 'Seu navegador não suporta notificações push.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      // Step 1: Request notification permission
      console.log('[Push Subscribe] Step 1: Requesting permission...');
      const result = await Notification.requestPermission();
      console.log('[Push Subscribe] Permission result:', result);
      setPermission(result);

      if (result !== 'granted') {
        const isIOS = isIOSDevice();
        toast({
          title: 'Permissão negada',
          description: isIOS 
            ? 'Vá em Ajustes > Notificações > Renda Recorrente e habilite as notificações.'
            : 'Você precisa permitir notificações nas configurações do navegador.',
          variant: 'destructive',
        });
        return false;
      }

      // Step 2: Register service worker if not already registered
      console.log('[Push Subscribe] Step 2: Checking service worker...');
      let registration = await navigator.serviceWorker.getRegistration();
      console.log('[Push Subscribe] Existing registration:', !!registration);
      
      if (!registration) {
        console.log('[Push Subscribe] Registering new service worker...');
        try {
          registration = await navigator.serviceWorker.register('/sw.js');
          console.log('[Push Subscribe] Service worker registered:', registration.scope);
        } catch (swError) {
          console.error('[Push Subscribe] Service worker registration failed:', swError);
          toast({
            title: 'Erro no Service Worker',
            description: `Falha ao registrar: ${swError instanceof Error ? swError.message : 'Erro desconhecido'}`,
            variant: 'destructive',
          });
          return false;
        }
      }
      
      console.log('[Push Subscribe] Waiting for service worker to be ready...');
      await navigator.serviceWorker.ready;
      console.log('[Push Subscribe] Service worker ready');

      // Step 3: Get VAPID public key
      console.log('[Push Subscribe] Step 3: Fetching VAPID key...');
      let vapidPublicKey: string;
      try {
        vapidPublicKey = await getVapidPublicKey();
        console.log('[Push Subscribe] VAPID key obtained (length):', vapidPublicKey.length);
      } catch (vapidError) {
        console.error('[Push Subscribe] VAPID key fetch failed:', vapidError);
        toast({
          title: 'Erro ao obter chave',
          description: `Falha ao obter chave VAPID: ${vapidError instanceof Error ? vapidError.message : 'Erro desconhecido'}`,
          variant: 'destructive',
        });
        return false;
      }

      // Step 4: Subscribe to push
      console.log('[Push Subscribe] Step 4: Creating push subscription...');
      let subscription: PushSubscription;
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
        });
        console.log('[Push Subscribe] Push subscription created:', subscription.endpoint.substring(0, 50) + '...');
      } catch (pushError) {
        console.error('[Push Subscribe] Push subscription failed:', pushError);
        const errorMessage = pushError instanceof Error ? pushError.message : 'Erro desconhecido';
        
        // Specific error messages for common issues
        let description = errorMessage;
        if (errorMessage.includes('denied')) {
          description = 'Permissão de notificação negada. Verifique as configurações do dispositivo.';
        } else if (errorMessage.includes('network')) {
          description = 'Erro de rede. Verifique sua conexão com a internet.';
        }
        
        toast({
          title: 'Erro na inscrição',
          description,
          variant: 'destructive',
        });
        return false;
      }

      // Step 5: Get user
      console.log('[Push Subscribe] Step 5: Getting user...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Erro',
          description: 'Você precisa estar logado para ativar notificações.',
          variant: 'destructive',
        });
        return false;
      }
      console.log('[Push Subscribe] User ID:', user.id);

      // Step 6: Save subscription to database
      console.log('[Push Subscribe] Step 6: Saving subscription to database...');
      const subscriptionJson = subscription.toJSON();
      const p256dhKey = subscriptionJson.keys?.p256dh || '';
      const authKey = subscriptionJson.keys?.auth || '';
      
      console.log('[Push Subscribe] Subscription keys present:', { p256dh: !!p256dhKey, auth: !!authKey });

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

      if (error) {
        console.error('[Push Subscribe] Database save failed:', error);
        throw error;
      }

      console.log('[Push Subscribe] SUCCESS - Subscription saved to database');
      setIsSubscribed(true);
      await loadSubscriptions();

      toast({
        title: 'Notificações ativadas',
        description: 'Você receberá notificações neste dispositivo.',
      });

      return true;
    } catch (error) {
      console.error('[Push Subscribe] Unexpected error:', error);
      toast({
        title: 'Erro ao ativar notificações',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return false;
    }
  }, [isSupported, toast, loadSubscriptions, runDiagnostics]);

  // Unsubscribe from push (only unsubscribes from browser, does NOT delete from DB)
  // To delete from DB, user must click "Excluir" button which calls removeSubscription
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

      // Only unsubscribe from browser - do NOT delete from DB
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      // Just mark as not subscribed for this browser, but keep DB records
      setIsSubscribed(false);

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
    diagnostics,
    subscribe,
    unsubscribe,
    removeSubscription,
    sendTestNotification,
    refreshSubscriptions: loadSubscriptions,
    runDiagnostics,
  };
}
