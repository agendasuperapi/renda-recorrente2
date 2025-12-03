import { useLayoutEffect, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Cor fallback padrão
const DEFAULT_COLOR = '#10b981';

// Executar IMEDIATAMENTE quando o módulo é importado (antes de qualquer render)
if (typeof document !== 'undefined') {
  document.documentElement.style.setProperty('--status-bar-bg', DEFAULT_COLOR);
}

interface ModeConfig {
  isGradient: boolean;
  colorStart: string;
  colorEnd: string;
  intensityStart: number;
  intensityEnd: number;
  direction: string;
}

interface StatusBarConfig {
  light: ModeConfig;
  dark: ModeConfig;
}

const defaultModeConfig: ModeConfig = {
  isGradient: false,
  colorStart: DEFAULT_COLOR,
  colorEnd: '#059669',
  intensityStart: 100,
  intensityEnd: 100,
  direction: 'to bottom',
};

const defaultConfig: StatusBarConfig = {
  light: { ...defaultModeConfig },
  dark: { ...defaultModeConfig, colorStart: '#065f46', colorEnd: '#064e3b' },
};

/**
 * Hook para gerenciar a cor da barra de status no iOS PWA
 * Busca cores do banco de dados e aplica baseado no tema atual
 * Suporta cores sólidas e gradientes
 */
export const useStatusBarColor = () => {
  const [config, setConfig] = useState<StatusBarConfig>(defaultConfig);

  // Detectar se está no modo escuro
  const getIsDarkMode = (): boolean => {
    // Verificar APENAS a classe 'dark' no documentElement (next-themes)
    // NÃO usar fallback para preferência do sistema
    // O next-themes já gerencia a classe baseado na escolha do usuário
    return document.documentElement.classList.contains('dark');
  };

  // Converter hex para RGB
  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Gerar background CSS (cor sólida ou gradiente) usando RGBA para compatibilidade
  const generateBackground = (modeConfig: ModeConfig): string => {
    if (!modeConfig.isGradient) {
      return modeConfig.colorStart;
    }
    
    const startRgb = hexToRgb(modeConfig.colorStart);
    const endRgb = hexToRgb(modeConfig.colorEnd);
    
    if (!startRgb || !endRgb) {
      return modeConfig.colorStart; // Fallback para cor sólida
    }
    
    const startAlpha = modeConfig.intensityStart / 100;
    const endAlpha = modeConfig.intensityEnd / 100;
    
    const startColor = `rgba(${startRgb.r}, ${startRgb.g}, ${startRgb.b}, ${startAlpha})`;
    const endColor = `rgba(${endRgb.r}, ${endRgb.g}, ${endRgb.b}, ${endAlpha})`;
    
    return `linear-gradient(${modeConfig.direction}, ${startColor}, ${endColor})`;
  };

  // Carregar configuração do banco de dados
  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .like('key', 'status_bar_%');

      if (error) {
        console.error('Erro ao carregar cores da barra de status:', error);
        return;
      }

      const newConfig: StatusBarConfig = JSON.parse(JSON.stringify(defaultConfig));

      data?.forEach((setting) => {
        const key = setting.key;
        const value = setting.value;
        
        // Parse light mode settings
        if (key === 'status_bar_light_is_gradient') newConfig.light.isGradient = value === 'true';
        if (key === 'status_bar_light_color_start') newConfig.light.colorStart = value;
        if (key === 'status_bar_light_color_end') newConfig.light.colorEnd = value;
        if (key === 'status_bar_light_intensity_start') newConfig.light.intensityStart = parseInt(value) || 100;
        if (key === 'status_bar_light_intensity_end') newConfig.light.intensityEnd = parseInt(value) || 100;
        if (key === 'status_bar_light_direction') newConfig.light.direction = value;
        
        // Parse dark mode settings
        if (key === 'status_bar_dark_is_gradient') newConfig.dark.isGradient = value === 'true';
        if (key === 'status_bar_dark_color_start') newConfig.dark.colorStart = value;
        if (key === 'status_bar_dark_color_end') newConfig.dark.colorEnd = value;
        if (key === 'status_bar_dark_intensity_start') newConfig.dark.intensityStart = parseInt(value) || 100;
        if (key === 'status_bar_dark_intensity_end') newConfig.dark.intensityEnd = parseInt(value) || 100;
        if (key === 'status_bar_dark_direction') newConfig.dark.direction = value;
        
        // Legacy support - convert old format
        if (key === 'status_bar_color_light' && !newConfig.light.colorStart) {
          newConfig.light.colorStart = value;
        }
        if (key === 'status_bar_color_dark' && !newConfig.dark.colorStart) {
          newConfig.dark.colorStart = value;
        }
      });

      setConfig(newConfig);
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  // Função para atualizar a meta tag theme-color e variável CSS
  const updateThemeColor = (configLight: ModeConfig, configDark: ModeConfig) => {
    const isDark = getIsDarkMode();
    const modeConfig = isDark ? configDark : configLight;
    
    const background = generateBackground(modeConfig);
    const themeColor = modeConfig.colorStart; // Meta tag usa cor inicial (não suporta gradiente)

    // Remover TODAS as meta tags theme-color existentes
    const existingMetaTags = document.querySelectorAll('meta[name="theme-color"]');
    existingMetaTags.forEach(meta => meta.remove());

    // Criar APENAS UMA meta tag sem media query
    const themeMeta = document.createElement('meta');
    themeMeta.name = 'theme-color';
    themeMeta.content = themeColor;
    document.head.appendChild(themeMeta);

    // Atualizar a variável CSS que controla o background (suporta gradiente)
    document.documentElement.style.setProperty('--status-bar-bg', background);
  };

  // Carregar configuração inicial
  useEffect(() => {
    loadConfig();

    // Ouvir evento de configuração alterada
    const handleConfigChanged = () => {
      loadConfig();
    };

    window.addEventListener('status-bar-config-changed', handleConfigChanged);

    return () => {
      window.removeEventListener('status-bar-config-changed', handleConfigChanged);
    };
  }, []);

  // Aplicar cores quando a configuração mudar
  useLayoutEffect(() => {
    updateThemeColor(config.light, config.dark);

    // Observar mudanças no tema (classe 'dark' no documentElement)
    const observer = new MutationObserver(() => {
      updateThemeColor(config.light, config.dark);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Verificar periodicamente para manter consistência
    const interval = setInterval(() => {
      updateThemeColor(config.light, config.dark);
    }, 500);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, [config.light, config.dark]);
};
