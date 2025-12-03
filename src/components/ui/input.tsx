import * as React from "react";

import { cn } from "@/lib/utils";

const isIOSDevice = (): boolean => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent) || 
         (userAgent.includes('mac') && 'ontouchend' in document);
};

const isStandalonePWA = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
};

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onTouchStart, onClick, ...props }, ref) => {
    const handleIOSPWAFocus = (target: HTMLInputElement) => {
      if (!isIOSDevice() || !isStandalonePWA()) return;
      
      const tempInput = document.createElement('input');
      tempInput.style.position = 'absolute';
      tempInput.style.top = `${target.getBoundingClientRect().top}px`;
      tempInput.style.left = '0';
      tempInput.style.height = '0';
      tempInput.style.width = '0';
      tempInput.style.opacity = '0';
      tempInput.style.fontSize = '16px';
      
      document.body.appendChild(tempInput);
      tempInput.focus();
      
      setTimeout(() => {
        target.focus();
        if (document.body.contains(tempInput)) {
          document.body.removeChild(tempInput);
        }
      }, 50);
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLInputElement>) => {
      handleIOSPWAFocus(e.currentTarget);
      onTouchStart?.(e);
    };

    const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
      handleIOSPWAFocus(e.currentTarget);
      onClick?.(e);
    };

    return (
      <input
        type={type}
        onTouchStart={handleTouchStart}
        onClick={handleClick}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
