import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BackgroundConfig {
  colorStartLight: string;
  colorEndLight: string;
  colorStartDark: string;
  colorEndDark: string;
  intensityStart: number;
  intensityEnd: number;
  gradientStart: number;
  gradientEnd: number;
  applyMobile: boolean;
  applyTablet: boolean;
  applyDesktop: boolean;
}

const defaultConfig: BackgroundConfig = {
  colorStartLight: "#00bf63",
  colorEndLight: "#00bf63",
  colorStartDark: "#00bf63",
  colorEndDark: "#00bf63",
  intensityStart: 5,
  intensityEnd: 15,
  gradientStart: 0,
  gradientEnd: 50,
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
  const [config, setConfig] = useState<BackgroundConfig | null>(null);
  const [deviceType, setDeviceType] = useState<DeviceType>(getDeviceType);
  const [darkMode, setDarkMode] = useState<boolean>(isDarkMode);
  const [loading, setLoading] = useState(true);

  const loadConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', [
          'bg_color_start_light',
          'bg_color_end_light',
          'bg_color_start_dark',
          'bg_color_end_dark',
          'bg_intensity_start',
          'bg_intensity_end',
          'bg_gradient_start',
          'bg_gradient_end',
          'bg_apply_mobile',
          'bg_apply_tablet',
          'bg_apply_desktop'
        ]);

      if (error) {
        console.error('Error loading background config:', error);
        setConfig(null);
        return;
      }

      if (data && data.length > 0) {
        const settings: Record<string, string> = {};
        data.forEach(item => {
          settings[item.key] = item.value;
        });

        // Only set config if we have at least the color settings
        if (settings.bg_color_start_light || settings.bg_color_start_dark) {
          setConfig({
            colorStartLight: settings.bg_color_start_light || defaultConfig.colorStartLight,
            colorEndLight: settings.bg_color_end_light || defaultConfig.colorEndLight,
            colorStartDark: settings.bg_color_start_dark || defaultConfig.colorStartDark,
            colorEndDark: settings.bg_color_end_dark || defaultConfig.colorEndDark,
            intensityStart: parseInt(settings.bg_intensity_start || String(defaultConfig.intensityStart)),
            intensityEnd: parseInt(settings.bg_intensity_end || String(defaultConfig.intensityEnd)),
            gradientStart: parseInt(settings.bg_gradient_start || String(defaultConfig.gradientStart)),
            gradientEnd: parseInt(settings.bg_gradient_end || String(defaultConfig.gradientEnd)),
            applyMobile: settings.bg_apply_mobile !== 'false',
            applyTablet: settings.bg_apply_tablet !== 'false',
            applyDesktop: settings.bg_apply_desktop !== 'false',
          });
        } else {
          setConfig(null);
        }
      } else {
        setConfig(null);
      }
    } catch (error) {
      console.error('Error loading background config:', error);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();

    // Listen for config changes
    const handleConfigChange = () => {
      loadConfig();
    };

    window.addEventListener('background-config-change', handleConfigChange);

    // Handle resize for responsive device detection
    const handleResize = () => {
      setDeviceType(getDeviceType());
    };

    window.addEventListener('resize', handleResize);

    // Observe theme changes
    const observer = new MutationObserver(() => {
      setDarkMode(isDarkMode());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      window.removeEventListener('background-config-change', handleConfigChange);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [loadConfig]);

  // Determine if background should be applied based on device type
  const shouldApply = useCallback(() => {
    if (!config) return false;

    switch (deviceType) {
      case 'mobile':
        return config.applyMobile;
      case 'tablet':
        return config.applyTablet;
      case 'desktop':
        return config.applyDesktop;
      default:
        return false;
    }
  }, [config, deviceType]);

  // Generate the CSS style object
  const getBackgroundStyle = useCallback((): React.CSSProperties | undefined => {
    if (!config || !shouldApply()) return undefined;

    const startAlpha = config.intensityStart / 100;
    const endAlpha = config.intensityEnd / 100;
    
    const colorStart = darkMode ? config.colorStartDark : config.colorStartLight;
    const colorEnd = darkMode ? config.colorEndDark : config.colorEndLight;
    
    const gradient = `linear-gradient(to bottom, ${hexToRgba(colorStart, startAlpha)} ${config.gradientStart}%, ${hexToRgba(colorEnd, endAlpha)} ${config.gradientEnd}%)`;

    return {
      background: gradient,
    };
  }, [config, shouldApply, darkMode]);

  return {
    config,
    loading,
    deviceType,
    darkMode,
    shouldApply: shouldApply(),
    backgroundStyle: getBackgroundStyle(),
  };
}
