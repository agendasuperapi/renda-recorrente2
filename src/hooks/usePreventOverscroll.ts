import { useEffect, useRef } from 'react';

const isIOSDevice = () => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

export const usePreventOverscroll = (enabled: boolean = true) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !isIOSDevice()) return;

    const container = containerRef.current;
    if (!container) return;

    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;

      const { scrollTop, scrollHeight, clientHeight } = container;
      
      // Só prevenir se há conteúdo scrollável
      const hasScrollableContent = scrollHeight > clientHeight;
      if (!hasScrollableContent) return;
      
      const isAtTop = scrollTop <= 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

      // Prevenir overscroll no topo (puxando para baixo) - apenas se realmente no topo
      if (isAtTop && !isAtBottom && deltaY > 0) {
        e.preventDefault();
        return;
      }

      // Prevenir overscroll no final (puxando para cima) - apenas se realmente no final
      if (isAtBottom && !isAtTop && deltaY < 0) {
        e.preventDefault();
        return;
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, [enabled]);

  return containerRef;
};
