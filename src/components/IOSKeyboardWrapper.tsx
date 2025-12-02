import React, { useEffect } from 'react';
import { useIOSKeyboardViewport } from '@/hooks/useIOSKeyboardViewport';

interface IOSKeyboardWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function IOSKeyboardWrapper({ children, className = '' }: IOSKeyboardWrapperProps) {
  const { isKeyboardOpen } = useIOSKeyboardViewport();

  useEffect(() => {
    if (isKeyboardOpen) {
      document.body.classList.add('keyboard-open');
      
      // Scroll input focado para visão
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA') {
        setTimeout(() => {
          activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    } else {
      document.body.classList.remove('keyboard-open');
    }

    return () => {
      document.body.classList.remove('keyboard-open');
    };
  }, [isKeyboardOpen]);

  return (
    <div className={`ios-keyboard-wrapper ${className}`}>
      <div className="ios-keyboard-content">
        {children}
      </div>
    </div>
  );
}
