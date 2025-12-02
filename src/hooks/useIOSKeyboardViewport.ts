import { useState, useEffect } from 'react';

export function useIOSKeyboardViewport() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;

    if (!isIOS || !isStandalone || !window.visualViewport) return;

    const viewport = window.visualViewport;
    let initialHeight = viewport.height;

    const handleResize = () => {
      const heightDiff = initialHeight - viewport.height;
      if (heightDiff > 150) {
        setKeyboardHeight(heightDiff);
        setIsKeyboardOpen(true);
        document.documentElement.style.setProperty(
          '--visual-viewport-height', 
          `${viewport.height}px`
        );
      } else {
        setKeyboardHeight(0);
        setIsKeyboardOpen(false);
        document.documentElement.style.removeProperty('--visual-viewport-height');
      }
    };

    const handleScroll = () => {
      // Manter viewport atualizado durante scroll
      document.documentElement.style.setProperty(
        '--visual-viewport-offset-top',
        `${viewport.offsetTop}px`
      );
    };

    viewport.addEventListener('resize', handleResize);
    viewport.addEventListener('scroll', handleScroll);
    
    return () => {
      viewport.removeEventListener('resize', handleResize);
      viewport.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return { keyboardHeight, isKeyboardOpen };
}
