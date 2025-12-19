import { useEnvironment, EnvironmentFilter } from '@/contexts/EnvironmentContext';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EnvironmentToggleProps {
  currentTextColor?: string;
  accentColor?: string;
}

export function EnvironmentToggle({ currentTextColor, accentColor }: EnvironmentToggleProps) {
  const { environment, setEnvironment } = useEnvironment();

  const options: { value: EnvironmentFilter; label: string; icon: React.ElementType; color: string }[] = [
    { value: 'production', label: 'Produção', icon: CheckCircle2, color: '#10b981' },
    { value: 'test', label: 'Teste', icon: AlertCircle, color: '#f59e0b' },
  ];

  return (
    <div className="flex flex-col gap-1.5 w-full px-1">
      <span 
        className="text-[10px] uppercase tracking-wider font-semibold opacity-60 px-2 text-center block"
        style={{ color: currentTextColor }}
      >
        Ambiente
      </span>
      <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: `${accentColor || '#10b981'}15` }}>
        <TooltipProvider delayDuration={300}>
          {options.map((option) => {
            const Icon = option.icon;
            const isActive = environment === option.value;
            
            return (
              <Tooltip key={option.value}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setEnvironment(option.value)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all",
                      isActive 
                        ? "shadow-sm" 
                        : "opacity-60 hover:opacity-100"
                    )}
                    style={{
                      backgroundColor: isActive ? option.color : 'transparent',
                      color: isActive ? '#ffffff' : currentTextColor,
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{option.label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {option.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
    </div>
  );
}
