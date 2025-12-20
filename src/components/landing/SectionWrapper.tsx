import { ReactNode } from "react";
import { InactiveSectionBadge } from "./InactiveSectionBadge";

interface SectionWrapperProps {
  sectionKey: string;
  sectionName: string;
  isActive: boolean;
  isAdmin: boolean;
  onToggle: (sectionKey: string, isActive: boolean) => void;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

export const SectionWrapper = ({
  sectionKey,
  sectionName,
  isActive,
  isAdmin,
  onToggle,
  children,
  className = "",
  style,
  id,
}: SectionWrapperProps) => {
  // Se não for admin e a seção está inativa, não renderiza
  if (!isAdmin && !isActive) {
    return null;
  }

  return (
    <section
      id={id || sectionKey}
      className={`relative ${className} ${!isActive ? 'ring-2 ring-destructive/50 ring-offset-2 ring-offset-background' : ''}`}
      style={style}
    >
      {isAdmin && (
        <InactiveSectionBadge
          sectionName={sectionName}
          isActive={isActive}
          onToggle={() => onToggle(sectionKey, !isActive)}
        />
      )}
      {/* Overlay para seções inativas */}
      {isAdmin && !isActive && (
        <div className="absolute inset-0 bg-destructive/5 pointer-events-none z-10" />
      )}
      {children}
    </section>
  );
};
