import { useEffect } from 'react';

/**
 * Hook para gerenciar a cor da barra de status no iOS PWA
 * Força a cor #10b981 sempre, independente do estado de autenticação
 */
export const useStatusBarColor = () => {
  useEffect(() => {
    // Função para atualizar a meta tag theme-color
    const updateThemeColor = (color: string) => {
      // Remover meta tags theme-color existentes
      const existingMetaTags = document.querySelectorAll('meta[name="theme-color"]');
      existingMetaTags.forEach(meta => meta.remove());

      // Criar novas meta tags para light e dark mode
      const lightMeta = document.createElement('meta');
      lightMeta.name = 'theme-color';
      lightMeta.setAttribute('media', '(prefers-color-scheme: light)');
      lightMeta.content = color;
      document.head.appendChild(lightMeta);

      const darkMeta = document.createElement('meta');
      darkMeta.name = 'theme-color';
      darkMeta.setAttribute('media', '(prefers-color-scheme: dark)');
      darkMeta.content = color;
      document.head.appendChild(darkMeta);

      // Para iOS PWA, também atualizar o background do html
      if (window.matchMedia('(display-mode: standalone)').matches || 
          (window.navigator as any).standalone === true) {
        document.documentElement.style.backgroundColor = color;
      }
    };

    // Definir cor inicial
    updateThemeColor('#10b981');

    // Observar mudanças na DOM para garantir que a cor seja mantida
    const observer = new MutationObserver(() => {
      const themeColorTags = document.querySelectorAll('meta[name="theme-color"]');
      let needsUpdate = false;

      themeColorTags.forEach(meta => {
        const content = meta.getAttribute('content');
        if (content && content !== '#10b981') {
          needsUpdate = true;
        }
      });

      if (needsUpdate || themeColorTags.length === 0) {
        updateThemeColor('#10b981');
      }
    });

    // Observar mudanças no head
    observer.observe(document.head, {
      childList: true,
      attributes: true,
      attributeFilter: ['content']
    });

    // Também verificar periodicamente (fallback)
    const interval = setInterval(() => {
      updateThemeColor('#10b981');
    }, 1000);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);
};

