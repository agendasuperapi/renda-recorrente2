import React from "react";
import { TableRow } from "@/components/ui/table";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { cn } from "@/lib/utils";

interface AnimatedTableRowProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export const AnimatedTableRow: React.FC<AnimatedTableRowProps> = ({
  children,
  className,
  delay = 0,
}) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.05 });

  return (
    <TableRow
      ref={ref as React.RefObject<HTMLTableRowElement>}
      className={cn(
        "transition-all duration-500 ease-out",
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4",
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </TableRow>
  );
};
