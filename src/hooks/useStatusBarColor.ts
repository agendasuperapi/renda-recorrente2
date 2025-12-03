import { useLayoutEffect } from 'react';

// Executar IMEDIATAMENTE quando o módulo é importado (antes de qualquer render)
if (typeof document !== 'undefined') {
  document.documentElement.style.backgroundColor = '#10b981';
}

/**
 * Hook para gerenciar a cor da barra de status no iOS PWA
 * Força a cor #10b981 sempre, independente do estado de autenticação
 */
export const useStatusBarColor = () => {
  useLayoutEffect(() => {
    const color = '#10b981';
    
    // Função para atualizar a meta tag theme-color
    const updateThemeColor = () => {
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

      // Sempre atualizar o background do html para garantir consistência
      document.documentElement.style.backgroundColor = color;
    };

    // Definir cor IMEDIATAMENTE (sem esperar o useEffect completar)
    updateThemeColor();
    
    // Também forçar atualização síncrona do background
    document.documentElement.style.backgroundColor = color;

    // Observar mudanças na DOM para garantir que a cor seja mantida
    const observer = new MutationObserver(() => {
      const themeColorTags = document.querySelectorAll('meta[name="theme-color"]');
      let needsUpdate = false;

      themeColorTags.forEach(meta => {
        const content = meta.getAttribute('content');
        if (content && content !== color) {
          needsUpdate = true;
        }
      });

      if (needsUpdate || themeColorTags.length === 0) {
        updateThemeColor();
      }
    });

    // Observar mudanças no head
    observer.observe(document.head, {
      childList: true,
      attributes: true,
      attributeFilter: ['content']
    });

    // Verificar mais frequentemente (200ms) para transições mais suaves
    const interval = setInterval(() => {
      updateThemeColor();
    }, 200);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);
};

