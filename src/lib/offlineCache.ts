// Utilitário de cache offline para localStorage

const CACHE_PREFIX = 'offline_cache_';

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

// Salvar dados no cache
export const saveToCache = <T>(key: string, data: T): void => {
  try {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cacheItem));
  } catch (error) {
    console.warn('Erro ao salvar no cache:', error);
  }
};

// Recuperar dados do cache
export const getFromCache = <T>(key: string): T | null => {
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!cached) return null;
    
    const cacheItem: CacheItem<T> = JSON.parse(cached);
    return cacheItem.data;
  } catch (error) {
    console.warn('Erro ao ler do cache:', error);
    return null;
  }
};

// Verificar se está online
export const isOnline = (): boolean => {
  return navigator.onLine;
};

// Chaves de cache padronizadas
export const CACHE_KEYS = {
  // Landing Page
  LANDING_PLANS: 'landing_plans',
  LANDING_TESTIMONIALS: 'landing_testimonials',
  LANDING_FAQS: 'landing_faqs',
  LANDING_FEATURES: 'landing_features',
  LANDING_PRODUCTS: 'landing_products',
  LANDING_HERO_IMAGES: 'landing_hero_images',
  LANDING_GRADIENT_CONFIGS: 'landing_gradient_configs',
  LANDING_SIDEBAR_CONFIG: 'landing_sidebar_config',
  LANDING_BANNER: 'landing_banner',
  LANDING_PRODUCT_INFO: 'landing_product_info',
  LANDING_CURRENT_PRODUCT: 'landing_current_product',
  
  // Auth
  AUTH_GRADIENT_CONFIGS: 'auth_gradient_configs',
  AUTH_PRODUCT_DESCRIPTION: 'auth_product_description',
  
  // App interno
  APP_BG_CONFIG: 'app_bg_config',
  APP_SIDEBAR_CONFIG: 'app_sidebar_config',
  APP_STATUS_BAR_CONFIG: 'app_status_bar_config',
} as const;
