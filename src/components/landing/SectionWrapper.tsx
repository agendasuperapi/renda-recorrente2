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
      className={`relative ${className} ${!isActive ? 'ring-4 ring-destructive ring-offset-4 ring-offset-background' : ''}`}
      style={style}
    >
      {isAdmin && (
        <InactiveSectionBadge
          sectionName={sectionName}
          isActive={isActive}
          onToggle={() => onToggle(sectionKey, !isActive)}
        />
      )}
      {/* Overlay forte para seções inativas - grayscale + linhas diagonais */}
      {isAdmin && !isActive && (
        <>
          {/* Camada de grayscale */}
          <div className="absolute inset-0 z-10 pointer-events-none mix-blend-saturation bg-gray-500" />
          {/* Camada de opacidade */}
          <div className="absolute inset-0 z-10 pointer-events-none bg-background/60" />
          {/* Padrão de linhas diagonais */}
          <div 
            className="absolute inset-0 z-10 pointer-events-none opacity-30"
            style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                transparent,
                transparent 10px,
                hsl(var(--destructive)) 10px,
                hsl(var(--destructive)) 12px
              )`
            }}
          />
        </>
      )}
      <div className={isAdmin && !isActive ? 'grayscale' : ''}>
        {children}
      </div>
    </section>
  );
};
