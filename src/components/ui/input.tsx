import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onTouchStart, onClick, ...props }, ref) => {
    const handleIOSFocus = (target: HTMLInputElement) => {
      // Técnica combinada para iOS PWA - força o teclado a aparecer
      requestAnimationFrame(() => {
        target.blur();
        requestAnimationFrame(() => {
          target.focus();
          // Fallback: se ainda não funcionou, tenta novamente
          setTimeout(() => {
            if (document.activeElement !== target) {
              target.focus();
            }
          }, 100);
        });
      });
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLInputElement>) => {
      handleIOSFocus(e.currentTarget);
      onTouchStart?.(e);
    };

    const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
      handleIOSFocus(e.currentTarget);
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
