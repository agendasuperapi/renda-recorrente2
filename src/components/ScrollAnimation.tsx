import React from "react";
import { cn } from "@/lib/utils";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

interface ScrollAnimationProps {
  children: React.ReactNode;
  className?: string;
  animation?: "fade-up" | "fade-left" | "fade-right" | "scale" | "blur";
  delay?: number;
  threshold?: number;
}

export const ScrollAnimation: React.FC<ScrollAnimationProps> = ({
  children,
  className,
  animation = "fade-up",
  delay = 0,
  threshold = 0.1,
}) => {
  const { ref, isVisible } = useScrollAnimation({ threshold });

  const getAnimationClasses = () => {
    switch (animation) {
      case "fade-up":
        return isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-8";
      case "fade-left":
        return isVisible
          ? "opacity-100 translate-x-0"
          : "opacity-0 translate-x-8";
      case "fade-right":
        return isVisible
          ? "opacity-100 translate-x-0"
          : "opacity-0 -translate-x-8";
      case "scale":
        return isVisible
          ? "opacity-100 scale-100"
          : "opacity-0 scale-95";
      case "blur":
        return isVisible
          ? "opacity-100 blur-0"
          : "opacity-0 blur-sm";
      default:
        return isVisible ? "opacity-100" : "opacity-0";
    }
  };

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-500 ease-out",
        getAnimationClasses(),
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};
