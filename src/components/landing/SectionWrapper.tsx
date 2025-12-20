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
      className={`relative ${className} ${!isActive ? 'ring-4 ring-destructive ring-offset-2 ring-offset-background' : ''}`}
      style={style}
    >
      {isAdmin && (
        <InactiveSectionBadge
          sectionName={sectionName}
          isActive={isActive}
          onToggle={() => onToggle(sectionKey, !isActive)}
        />
      )}
      {/* X vermelho de canto a canto para seções inativas */}
      {isAdmin && !isActive && (
        <svg 
          className="absolute inset-0 w-full h-full z-10 pointer-events-none"
          preserveAspectRatio="none"
        >
          <line x1="0" y1="0" x2="100%" y2="100%" stroke="hsl(var(--destructive))" strokeWidth="3" />
          <line x1="100%" y1="0" x2="0" y2="100%" stroke="hsl(var(--destructive))" strokeWidth="3" />
        </svg>
      )}
      {children}
    </section>
  );
};
