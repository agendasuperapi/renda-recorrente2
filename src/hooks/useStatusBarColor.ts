import { useLayoutEffect, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Cor fallback padrão
const DEFAULT_COLOR = '#10b981';

// Executar IMEDIATAMENTE quando o módulo é importado (antes de qualquer render)
if (typeof document !== 'undefined') {
  document.documentElement.style.backgroundColor = DEFAULT_COLOR;
}

interface StatusBarConfig {
  colorLight: string;
  colorDark: string;
}

/**
 * Hook para gerenciar a cor da barra de status no iOS PWA
 * Busca cores do banco de dados e aplica baseado no tema atual
 */
export const useStatusBarColor = () => {
  const [config, setConfig] = useState<StatusBarConfig>({
    colorLight: DEFAULT_COLOR,
    colorDark: DEFAULT_COLOR,
  });

  // Detectar se está no modo escuro
  const getIsDarkMode = (): boolean => {
    // Primeiro verifica se há classe 'dark' no documentElement (next-themes)
    if (document.documentElement.classList.contains('dark')) {
      return true;
    }
    // Senão, usa a preferência do sistema
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  // Carregar configuração do banco de dados
  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['status_bar_color_light', 'status_bar_color_dark']);

      if (error) {
        console.error('Erro ao carregar cores da barra de status:', error);
        return;
      }

      const newConfig: StatusBarConfig = {
        colorLight: DEFAULT_COLOR,
        colorDark: DEFAULT_COLOR,
      };

      data?.forEach((setting) => {
        if (setting.key === 'status_bar_color_light') {
          newConfig.colorLight = setting.value;
        } else if (setting.key === 'status_bar_color_dark') {
          newConfig.colorDark = setting.value;
        }
      });

      setConfig(newConfig);
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  // Função para atualizar a meta tag theme-color
  const updateThemeColor = (colorLight: string, colorDark: string) => {
    const isDark = getIsDarkMode();
    const color = isDark ? colorDark : colorLight;

    // Remover meta tags theme-color existentes
    const existingMetaTags = document.querySelectorAll('meta[name="theme-color"]');
    existingMetaTags.forEach(meta => meta.remove());

    // Criar novas meta tags para light e dark mode
    const lightMeta = document.createElement('meta');
    lightMeta.name = 'theme-color';
    lightMeta.setAttribute('media', '(prefers-color-scheme: light)');
    lightMeta.content = colorLight;
    document.head.appendChild(lightMeta);

    const darkMeta = document.createElement('meta');
    darkMeta.name = 'theme-color';
    darkMeta.setAttribute('media', '(prefers-color-scheme: dark)');
    darkMeta.content = colorDark;
    document.head.appendChild(darkMeta);

    // Atualizar o background do html
    document.documentElement.style.backgroundColor = color;
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
    updateThemeColor(config.colorLight, config.colorDark);

    // Observar mudanças no tema (classe 'dark' no documentElement)
    const observer = new MutationObserver(() => {
      updateThemeColor(config.colorLight, config.colorDark);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Observar mudanças na preferência do sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      updateThemeColor(config.colorLight, config.colorDark);
    };
    
    mediaQuery.addEventListener('change', handleMediaChange);

    // Verificar periodicamente para manter consistência
    const interval = setInterval(() => {
      updateThemeColor(config.colorLight, config.colorDark);
    }, 500);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleMediaChange);
      clearInterval(interval);
    };
  }, [config.colorLight, config.colorDark]);
};
