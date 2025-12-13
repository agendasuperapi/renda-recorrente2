import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { saveToCache, getFromCache, CACHE_KEYS } from "@/lib/offlineCache";

interface BackgroundConfig {
  colorStartLight: string;
  colorEndLight: string;
  colorStartDark: string;
  colorEndDark: string;
  intensityStartLight: number;
  intensityEndLight: number;
  intensityStartDark: number;
  intensityEndDark: number;
  gradientStartLight: number;
  gradientEndLight: number;
  gradientStartDark: number;
  gradientEndDark: number;
  applyMobile: boolean;
  applyTablet: boolean;
  applyDesktop: boolean;
}

const defaultConfig: BackgroundConfig = {
  colorStartLight: "#00bf63",
  colorEndLight: "#00bf63",
  colorStartDark: "#00bf63",
  colorEndDark: "#00bf63",
  intensityStartLight: 5,
  intensityEndLight: 15,
  intensityStartDark: 5,
  intensityEndDark: 15,
  gradientStartLight: 0,
  gradientEndLight: 50,
  gradientStartDark: 0,
  gradientEndDark: 50,
  applyMobile: true,
  applyTablet: true,
  applyDesktop: true,
};

type DeviceType = 'mobile' | 'tablet' | 'desktop';

const getDeviceType = (): DeviceType => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const isDarkMode = (): boolean => {
  return document.documentElement.classList.contains('dark');
};

export function useBgConfig() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  const [config, setConfig] = useState<BackgroundConfig | null>(null);
  const [previewConfig, setPreviewConfig] = useState<BackgroundConfig | null>(null);
  const [deviceType, setDeviceType] = useState<DeviceType>(getDeviceType);
  const [darkMode, setDarkMode] = useState<boolean>(isDarkMode);
  const [loading, setLoading] = useState(true);

  const getKeyPrefix = useCallback(() => isAdminRoute ? 'admin_bg_' : 'bg_', [isAdminRoute]);
  const getCacheKey = useCallback(() => isAdminRoute ? 'app_admin_bg_config' : CACHE_KEYS.APP_BG_CONFIG, [isAdminRoute]);

  const loadConfig = useCallback(async () => {
    const prefix = getKeyPrefix();
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', [
          `${prefix}color_start_light`,
          `${prefix}color_end_light`,
          `${prefix}color_start_dark`,
          `${prefix}color_end_dark`,
          `${prefix}intensity_start_light`,
          `${prefix}intensity_end_light`,
          `${prefix}intensity_start_dark`,
          `${prefix}intensity_end_dark`,
          `${prefix}gradient_start_light`,
          `${prefix}gradient_end_light`,
          `${prefix}gradient_start_dark`,
          `${prefix}gradient_end_dark`,
          `${prefix}apply_mobile`,
          `${prefix}apply_tablet`,
          `${prefix}apply_desktop`
        ]);

      if (error) {
        console.error('Error loading background config:', error);
        const cachedConfig = getFromCache<BackgroundConfig>(getCacheKey());
        if (cachedConfig) {
          setConfig(cachedConfig);
        } else {
          setConfig(null);
        }
        return;
      }

      if (data && data.length > 0) {
        const settings: Record<string, string> = {};
        data.forEach(item => {
          settings[item.key] = item.value;
        });

        if (settings[`${prefix}color_start_light`] || settings[`${prefix}color_start_dark`]) {
          const newConfig: BackgroundConfig = {
            colorStartLight: settings[`${prefix}color_start_light`] || defaultConfig.colorStartLight,
            colorEndLight: settings[`${prefix}color_end_light`] || defaultConfig.colorEndLight,
            colorStartDark: settings[`${prefix}color_start_dark`] || defaultConfig.colorStartDark,
            colorEndDark: settings[`${prefix}color_end_dark`] || defaultConfig.colorEndDark,
            intensityStartLight: parseInt(settings[`${prefix}intensity_start_light`] || String(defaultConfig.intensityStartLight)),
            intensityEndLight: parseInt(settings[`${prefix}intensity_end_light`] || String(defaultConfig.intensityEndLight)),
            intensityStartDark: parseInt(settings[`${prefix}intensity_start_dark`] || String(defaultConfig.intensityStartDark)),
            intensityEndDark: parseInt(settings[`${prefix}intensity_end_dark`] || String(defaultConfig.intensityEndDark)),
            gradientStartLight: parseInt(settings[`${prefix}gradient_start_light`] || String(defaultConfig.gradientStartLight)),
            gradientEndLight: parseInt(settings[`${prefix}gradient_end_light`] || String(defaultConfig.gradientEndLight)),
            gradientStartDark: parseInt(settings[`${prefix}gradient_start_dark`] || String(defaultConfig.gradientStartDark)),
            gradientEndDark: parseInt(settings[`${prefix}gradient_end_dark`] || String(defaultConfig.gradientEndDark)),
            applyMobile: settings[`${prefix}apply_mobile`] !== 'false',
            applyTablet: settings[`${prefix}apply_tablet`] !== 'false',
            applyDesktop: settings[`${prefix}apply_desktop`] !== 'false',
          };
          setConfig(newConfig);
          saveToCache(getCacheKey(), newConfig);
        } else {
          setConfig(null);
        }
      } else {
        const cachedConfig = getFromCache<BackgroundConfig>(getCacheKey());
        if (cachedConfig) {
          setConfig(cachedConfig);
        } else {
          setConfig(null);
        }
      }
    } catch (error) {
      console.error('Error loading background config:', error);
      const cachedConfig = getFromCache<BackgroundConfig>(getCacheKey());
      if (cachedConfig) {
        setConfig(cachedConfig);
      } else {
        setConfig(null);
      }
    } finally {
      setLoading(false);
    }
  }, [getKeyPrefix, getCacheKey]);

  useEffect(() => {
    loadConfig();

    const handleConfigChange = () => {
      setPreviewConfig(null);
      loadConfig();
    };

    const handlePreview = (event: CustomEvent<{ config: BackgroundConfig; isAdmin: boolean }>) => {
      if (isAdminRoute && event.detail.isAdmin) {
        setPreviewConfig(event.detail.config);
      }
    };

    window.addEventListener('background-config-change', handleConfigChange);
    window.addEventListener('background-config-preview', handlePreview as EventListener);

    const handleResize = () => {
      setDeviceType(getDeviceType());
    };

    window.addEventListener('resize', handleResize);

    const observer = new MutationObserver(() => {
      setDarkMode(isDarkMode());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      window.removeEventListener('background-config-change', handleConfigChange);
      window.removeEventListener('background-config-preview', handlePreview as EventListener);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [loadConfig, isAdminRoute]);

  // Use previewConfig if available, otherwise use saved config
  const activeConfig = previewConfig || config;

  const shouldApply = useCallback(() => {
    if (!activeConfig) return false;

    switch (deviceType) {
      case 'mobile':
        return activeConfig.applyMobile;
      case 'tablet':
        return activeConfig.applyTablet;
      case 'desktop':
        return activeConfig.applyDesktop;
      default:
        return false;
    }
  }, [activeConfig, deviceType]);

  const getBackgroundStyle = useCallback((): React.CSSProperties | undefined => {
    if (!activeConfig || !shouldApply()) return undefined;

    const startAlpha = darkMode ? activeConfig.intensityStartDark / 100 : activeConfig.intensityStartLight / 100;
    const endAlpha = darkMode ? activeConfig.intensityEndDark / 100 : activeConfig.intensityEndLight / 100;
    
    const colorStart = darkMode ? activeConfig.colorStartDark : activeConfig.colorStartLight;
    const colorEnd = darkMode ? activeConfig.colorEndDark : activeConfig.colorEndLight;
    
    const gradientStart = darkMode ? activeConfig.gradientStartDark : activeConfig.gradientStartLight;
    const gradientEnd = darkMode ? activeConfig.gradientEndDark : activeConfig.gradientEndLight;
    
    const gradient = `linear-gradient(to bottom, ${hexToRgba(colorStart, startAlpha)} ${gradientStart}vh, ${hexToRgba(colorEnd, endAlpha)} ${gradientEnd}vh)`;

    return {
      background: `${gradient}, ${hexToRgba(colorEnd, endAlpha)}`,
      backgroundAttachment: 'fixed' as const,
      backgroundRepeat: 'no-repeat' as const,
    };
  }, [activeConfig, shouldApply, darkMode]);

  return {
    config,
    loading,
    deviceType,
    darkMode,
    shouldApply: shouldApply(),
    backgroundStyle: getBackgroundStyle(),
  };
}
